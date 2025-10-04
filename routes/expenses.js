const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { auth, isEmployee, isManager, isAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const currencyService = require('../utils/currency');
const ocrService = require('../utils/ocr');
const approvalWorkflowService = require('../utils/approvalWorkflow');
const emailService = require('../utils/email');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG) and PDF files are allowed'));
    }
  }
});

// Submit new expense
router.post('/', auth, isEmployee, upload.single('receipt'), validateRequest(schemas.createExpense), async (req, res) => {
  try {
    const { amount, currency, category, description, expenseDate, tags, isUrgent } = req.body;
    const company = req.user.company;

    // Convert currency to company currency
    const conversion = await currencyService.convertCurrency(amount, currency, company.currency);

    // Process OCR if receipt is uploaded
    let ocrData = null;
    if (req.file) {
      try {
        const ocrResult = await ocrService.extractText(req.file.path);
        ocrData = ocrService.extractReceiptData(ocrResult.text);
      } catch (ocrError) {
        console.error('OCR processing failed:', ocrError);
        // Continue without OCR data
      }
    }

    // Create expense
    const expense = new Expense({
      employee: req.user._id,
      company: company._id,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      amountInCompanyCurrency: conversion.amount,
      exchangeRate: conversion.exchangeRate,
      category,
      description,
      expenseDate: new Date(expenseDate),
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      isUrgent: isUrgent === 'true' || isUrgent === true,
      receipt: req.file ? {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size
      } : null,
      ocrData
    });

    // Determine approval sequence
    const approvalSequence = await approvalWorkflowService.determineApprovalSequence(expense, company);
    expense.approvalSequence = approvalSequence;

    // Set current approver
    if (approvalSequence.length > 0) {
      expense.currentApprover = approvalSequence[0].approver;
    }

    await expense.save();

    // Check budget and send alerts if needed
    try {
      await checkBudgetAndSendAlerts(req.user._id);
    } catch (emailError) {
      console.error('Budget alert email error:', emailError);
      // Don't fail the request if email fails
    }

    // Populate expense with user details
    const populatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Expense submitted successfully',
      data: { expense: populatedExpense }
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit expense',
      error: error.message
    });
  }
});

// Get user's expenses (with history)
router.get('/my-expenses', auth, isEmployee, async (req, res) => {
  try {
    const { status, category, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = { employee: req.user._id };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalSequence.approver', 'firstName lastName email')
      .populate('finalApproval.approvedBy', 'firstName lastName email')
      .populate('finalApproval.rejectedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get my expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message
    });
  }
});

// Get expense history for all users (Admin/Manager)
router.get('/history', auth, async (req, res) => {
  try {
    const { status, category, startDate, endDate, employeeId, page = 1, limit = 50 } = req.query;
    const query = { company: req.user.company };

    // Manager can only see their team's expenses
    if (req.user.role === 'manager') {
      const teamMembers = await User.find({
        $or: [
          { manager: req.user._id },
          { _id: req.user._id }
        ],
        company: req.user.company
      }).select('_id');
      
      query.employee = { $in: teamMembers.map(m => m._id) };
    }

    // Filter by employee if specified
    if (employeeId && req.user.role === 'admin') {
      query.employee = employeeId;
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const expensesData = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalSequence.approver', 'firstName lastName email')
      .populate('finalApproval.approvedBy', 'firstName lastName email')
      .populate('finalApproval.rejectedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      success: true,
      data: {
        expenses: expensesData,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get expense history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense history',
      error: error.message
    });
  }
});

// Get pending expenses for approval
router.get('/pending-approval', auth, async (req, res) => {
  try {
    const { employee, category, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = {
      company: req.user.company,
      status: 'pending'
    };

    // If user is manager (not admin), only show expenses assigned to them
    if (req.user.role === 'manager') {
      query.currentApprover = req.user._id;
    }

    if (employee) {
      query.employee = employee;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get all expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message
    });
  }
});

// Get expense by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      company: req.user.company
    })
    .populate('employee', 'firstName lastName email')
    .populate('currentApprover', 'firstName lastName email')
    .populate('approvalSequence.approver', 'firstName lastName email');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee' && expense.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { expense }
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense',
      error: error.message
    });
  }
});

// Update expense (Employee only, if not yet approved)
router.put('/:id', auth, isEmployee, upload.single('receipt'), validateRequest(schemas.updateExpense), async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      employee: req.user._id,
      status: 'pending'
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or cannot be modified'
      });
    }

    const updates = {};
    const allowedUpdates = ['amount', 'currency', 'category', 'description', 'expenseDate', 'tags', 'isUrgent'];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle currency conversion if amount or currency changed
    if (updates.amount || updates.currency) {
      const amount = updates.amount || expense.amount;
      const currency = updates.currency || expense.currency;
      const conversion = await currencyService.convertCurrency(amount, currency, req.user.company.currency);
      
      updates.amountInCompanyCurrency = conversion.amount;
      updates.exchangeRate = conversion.exchangeRate;
    }

    // Handle receipt update
    if (req.file) {
      updates.receipt = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size
      };

      // Process OCR for new receipt
      try {
        const ocrResult = await ocrService.extractText(req.file.path);
        updates.ocrData = ocrService.extractReceiptData(ocrResult.text);
      } catch (ocrError) {
        console.error('OCR processing failed:', ocrError);
      }
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName email')
     .populate('currentApprover', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: { expense: updatedExpense }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message
    });
  }
});

// Cancel expense (Employee only, if pending)
router.put('/:id/cancel', auth, isEmployee, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      employee: req.user._id,
      status: 'pending'
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or cannot be cancelled'
      });
    }

    expense.status = 'cancelled';
    await expense.save();

    res.json({
      success: true,
      message: 'Expense cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel expense',
      error: error.message
    });
  }
});

// Get expense statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { company: req.user.company };

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    // If employee, only show their expenses
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    }

    const stats = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: 1 },
          totalAmount: { $sum: '$amountInCompanyCurrency' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amountInCompanyCurrency', 0] }
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amountInCompanyCurrency', 0] }
          }
        }
      }
    ]);

    const categoryStats = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountInCompanyCurrency' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || {
          totalExpenses: 0,
          totalAmount: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          pendingAmount: 0,
          approvedAmount: 0
        },
        categoryBreakdown: categoryStats
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense statistics',
      error: error.message
    });
  }
});

// Helper function to check budget and send alerts
async function checkBudgetAndSendAlerts(userId) {
  try {
    const user = await User.findById(userId);
    if (!user || user.monthlyBudget <= 0) {
      return; // No budget set, skip alerts
    }

    // Get current month expenses
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const expenses = await Expense.find({
      employee: userId,
      expenseDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgetPercentage = (totalSpent / user.monthlyBudget) * 100;
    const remaining = user.monthlyBudget - totalSpent;

    const budgetData = {
      monthlyBudget: user.monthlyBudget,
      used: totalSpent,
      remaining: remaining,
      percentage: budgetPercentage,
      currency: user.budgetCurrency
    };

    // Send alert if threshold reached and not already sent
    // Note: Expenses are ALLOWED even if over budget, but alerts are sent
    if (budgetPercentage >= user.budgetAlertThreshold && !user.budgetAlertSent) {
      if (budgetPercentage >= 100) {
        // Budget exceeded - still allow expense but send alert
        await emailService.sendBudgetExceededEmail(user, budgetData);
        console.log(` Budget exceeded alert sent to ${user.email} (${budgetPercentage.toFixed(1)}% used)`);
      } else {
        // Approaching budget limit
        await emailService.sendBudgetAlertEmail(user, budgetData);
        console.log(` Budget alert sent to ${user.email} (${budgetPercentage.toFixed(1)}% used)`);
      }
      
      // Mark alert as sent
      user.budgetAlertSent = true;
      await user.save();
    }
  } catch (error) {
    console.error('Check budget error:', error);
    throw error;
  }
}

module.exports = router;
