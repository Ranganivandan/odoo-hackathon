const express = require('express');
const User = require('../models/User');
const { auth, isAdmin, isManager } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const emailService = require('../utils/email');

const router = express.Router();

// Get all users (Admin only)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const query = { company: req.user.company };

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('manager', 'firstName lastName email')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company
    }).populate('manager', 'firstName lastName email').select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Create new user (Admin only)
router.post('/', auth, isAdmin, validateRequest(schemas.createUser), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, manager, isManagerApprover } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Validate manager if provided
    if (manager) {
      const managerUser = await User.findOne({
        _id: manager,
        company: req.user.company,
        role: { $in: ['manager', 'admin'] }
      });

      if (!managerUser) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manager selected'
        });
      }
    }

    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      company: req.user.company,
      manager: manager || null,
      isManagerApprover: isManagerApprover || false
    });

    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('manager', 'firstName lastName email')
      .select('-password');

    // Send welcome email with credentials
    try {
      await emailService.sendWelcomeEmail(populatedUser, password, req.user);
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError.message);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Login credentials have been sent to their email.',
      data: { user: populatedUser }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// Update user (Admin only)
router.put('/:id', auth, isAdmin, validateRequest(schemas.updateUser), async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString() && req.body.role) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    // Validate manager if provided
    if (req.body.manager) {
      const managerUser = await User.findOne({
        _id: req.body.manager,
        company: req.user.company,
        role: { $in: ['manager', 'admin'] }
      });

      if (!managerUser) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manager selected'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('manager', 'firstName lastName email').select('-password');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// Get team members (Manager only)
router.get('/team/members', auth, isManager, async (req, res) => {
  try {
    const teamMembers = await User.find({
      $or: [
        { manager: req.user._id },
        { _id: req.user._id }
      ],
      company: req.user.company,
      isActive: true
    }).populate('manager', 'firstName lastName email').select('-password');

    res.json({
      success: true,
      data: { teamMembers }
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
});

// Get managers for dropdown (Admin only)
router.get('/managers/list', auth, isAdmin, async (req, res) => {
  try {
    const managers = await User.find({
      company: req.user.company,
      role: { $in: ['manager', 'admin'] },
      isActive: true
    }).select('firstName lastName email role');

    res.json({
      success: true,
      data: { managers }
    });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch managers',
      error: error.message
    });
  }
});

// Update user budget (Admin can update any user, users can update their own)
router.put('/:id/budget', auth, async (req, res) => {
  try {
    const { monthlyBudget, budgetCurrency, budgetAlertThreshold } = req.body;

    // Check permissions: Admin can update anyone, users can only update themselves
    if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own budget'
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.monthlyBudget = monthlyBudget !== undefined ? monthlyBudget : user.monthlyBudget;
    user.budgetCurrency = budgetCurrency || user.budgetCurrency;
    user.budgetAlertThreshold = budgetAlertThreshold !== undefined ? budgetAlertThreshold : user.budgetAlertThreshold;
    user.budgetAlertSent = false; // Reset alert flag when budget is updated

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('manager', 'firstName lastName email')
      .select('-password');

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget',
      error: error.message
    });
  }
});

// Get user analytics/statistics
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const Expense = require('../models/Expense');
    
    // Check if user can access this data
    if (req.user.role === 'employee' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get expense statistics
    const expenses = await Expense.find({
      employee: req.params.id,
      expenseDate: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const totalExpenses = expenses.length;
    const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
    const approvedExpenses = expenses.filter(e => e.status === 'approved').length;
    const rejectedExpenses = expenses.filter(e => e.status === 'rejected').length;

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const approvedAmount = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
    const pendingAmount = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

    // Calculate budget usage
    const budgetUsed = totalAmount;
    const budgetRemaining = user.monthlyBudget - budgetUsed;
    const budgetPercentage = user.monthlyBudget > 0 ? (budgetUsed / user.monthlyBudget) * 100 : 0;

    // Category breakdown
    const categoryBreakdown = {};
    expenses.forEach(expense => {
      if (!categoryBreakdown[expense.category]) {
        categoryBreakdown[expense.category] = { count: 0, amount: 0 };
      }
      categoryBreakdown[expense.category].count++;
      categoryBreakdown[expense.category].amount += expense.amount;
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role
        },
        period: {
          start: startOfMonth,
          end: endOfMonth,
          month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
        },
        expenses: {
          total: totalExpenses,
          pending: pendingExpenses,
          approved: approvedExpenses,
          rejected: rejectedExpenses
        },
        amounts: {
          total: totalAmount,
          approved: approvedAmount,
          pending: pendingAmount,
          currency: user.budgetCurrency
        },
        budget: {
          monthly: user.monthlyBudget,
          used: budgetUsed,
          remaining: budgetRemaining,
          percentage: Math.round(budgetPercentage * 100) / 100,
          currency: user.budgetCurrency,
          alertThreshold: user.budgetAlertThreshold
        },
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

module.exports = router;
