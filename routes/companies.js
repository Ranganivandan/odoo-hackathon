const express = require('express');
const Company = require('../models/Company');
const ApprovalRule = require('../models/ApprovalRule');
const { auth, isAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

// Get company details
router.get('/', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: { company }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company details',
      error: error.message
    });
  }
});

// Update company details (Admin only)
router.put('/', auth, isAdmin, validateRequest(schemas.updateCompany), async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.user.company,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: { company }
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
});

// Get expense categories
router.get('/categories', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: { 
        categories: company.settings.expenseCategories.filter(cat => cat.isActive)
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense categories',
      error: error.message
    });
  }
});

// Add expense category (Admin only)
router.post('/categories', auth, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if category already exists
    const existingCategory = company.settings.expenseCategories.find(
      cat => cat.name.toLowerCase() === name.toLowerCase()
    );

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }

    company.settings.expenseCategories.push({
      name,
      description: description || '',
      isActive: true
    });

    await company.save();

    res.status(201).json({
      success: true,
      message: 'Category added successfully',
      data: { 
        categories: company.settings.expenseCategories.filter(cat => cat.isActive)
      }
    });
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add category',
      error: error.message
    });
  }
});

// Update expense category (Admin only)
router.put('/categories/:categoryId', auth, isAdmin, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, isActive } = req.body;

    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const category = company.settings.expenseCategories.id(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await company.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { 
        categories: company.settings.expenseCategories.filter(cat => cat.isActive)
      }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
});

// Delete expense category (Admin only)
router.delete('/categories/:categoryId', auth, isAdmin, async (req, res) => {
  try {
    const { categoryId } = req.params;

    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const category = company.settings.expenseCategories.id(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Soft delete by setting isActive to false
    category.isActive = false;
    await company.save();

    res.json({
      success: true,
      message: 'Category deleted successfully',
      data: { 
        categories: company.settings.expenseCategories.filter(cat => cat.isActive)
      }
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

// Get approval rules
router.get('/approval-rules', auth, isAdmin, async (req, res) => {
  try {
    const rules = await ApprovalRule.find({
      company: req.user.company,
      isActive: true
    }).populate('conditions.specificApprovers conditions.hybrid.specificApprovers conditions.sequential.approver', 'firstName lastName email')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: { rules }
    });
  } catch (error) {
    console.error('Get approval rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval rules',
      error: error.message
    });
  }
});

// Create approval rule
router.post('/approval-rules', auth, isAdmin, validateRequest(schemas.createApprovalRule), async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      company: req.user.company
    };

    const rule = new ApprovalRule(ruleData);
    await rule.save();

    const populatedRule = await ApprovalRule.findById(rule._id)
      .populate('conditions.specificApprovers conditions.hybrid.specificApprovers conditions.sequential.approver', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Approval rule created successfully',
      data: { rule: populatedRule }
    });
  } catch (error) {
    console.error('Create approval rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create approval rule',
      error: error.message
    });
  }
});

// Update approval rule
router.put('/approval-rules/:ruleId', auth, isAdmin, async (req, res) => {
  try {
    const { ruleId } = req.params;

    const rule = await ApprovalRule.findOne({
      _id: ruleId,
      company: req.user.company
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Approval rule not found'
      });
    }

    const updatedRule = await ApprovalRule.findByIdAndUpdate(
      ruleId,
      req.body,
      { new: true, runValidators: true }
    ).populate('conditions.specificApprovers conditions.hybrid.specificApprovers conditions.sequential.approver', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Approval rule updated successfully',
      data: { rule: updatedRule }
    });
  } catch (error) {
    console.error('Update approval rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update approval rule',
      error: error.message
    });
  }
});

// Delete approval rule
router.delete('/approval-rules/:ruleId', auth, isAdmin, async (req, res) => {
  try {
    const { ruleId } = req.params;

    const rule = await ApprovalRule.findOne({
      _id: ruleId,
      company: req.user.company
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Approval rule not found'
      });
    }

    // Soft delete by setting isActive to false
    rule.isActive = false;
    await rule.save();

    res.json({
      success: true,
      message: 'Approval rule deleted successfully'
    });
  } catch (error) {
    console.error('Delete approval rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete approval rule',
      error: error.message
    });
  }
});

// Get approval thresholds
router.get('/approval-thresholds', auth, isAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: { 
        thresholds: company.settings.approvalThresholds
      }
    });
  } catch (error) {
    console.error('Get approval thresholds error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval thresholds',
      error: error.message
    });
  }
});

// Update approval thresholds
router.put('/approval-thresholds', auth, isAdmin, async (req, res) => {
  try {
    const { thresholds } = req.body;

    if (!Array.isArray(thresholds)) {
      return res.status(400).json({
        success: false,
        message: 'Thresholds must be an array'
      });
    }

    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    company.settings.approvalThresholds = thresholds;
    await company.save();

    res.json({
      success: true,
      message: 'Approval thresholds updated successfully',
      data: { 
        thresholds: company.settings.approvalThresholds
      }
    });
  } catch (error) {
    console.error('Update approval thresholds error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update approval thresholds',
      error: error.message
    });
  }
});

module.exports = router;
