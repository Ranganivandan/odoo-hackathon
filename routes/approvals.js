const express = require('express');
const Expense = require('../models/Expense');
const { auth, isManager, isAdmin } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const approvalWorkflowService = require('../utils/approvalWorkflow');

const router = express.Router();

// Approve or reject expense
router.put('/:id/action', auth, isManager, validateRequest(schemas.approveExpense), async (req, res) => {
  try {
    const { action, comments } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findOne({
      _id: expenseId,
      company: req.user.company,
      status: 'pending',
      currentApprover: req.user._id
    }).populate('approvalSequence.approver', 'firstName lastName email');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or not assigned to you for approval'
      });
    }

    // Find current approver in sequence
    const currentApprovalIndex = expense.approvalSequence.findIndex(
      approval => approval.approver._id.toString() === req.user._id.toString() && approval.status === 'pending'
    );

    if (currentApprovalIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not the current approver for this expense'
      });
    }

    // Update approval status
    const currentApproval = expense.approvalSequence[currentApprovalIndex];
    const statusValue = action === 'approve' ? 'approved' : 'rejected';
    currentApproval.status = statusValue;
    currentApproval.comments = comments;
    
    if (action === 'approve') {
      currentApproval.approvedAt = new Date();
    } else {
      currentApproval.rejectedAt = new Date();
    }

    // Check if this should trigger auto-approval
    const shouldAutoApprove = await approvalWorkflowService.checkAutoApproval(expense, currentApproval);

    if (action === 'reject' || shouldAutoApprove) {
      // Final decision made
      expense.status = action === 'reject' ? 'rejected' : 'approved';
      expense.finalApproval = {
        [action === 'reject' ? 'rejectedBy' : 'approvedBy']: req.user._id,
        [action === 'reject' ? 'rejectedAt' : 'approvedAt']: new Date(),
        finalComments: comments
      };
      expense.currentApprover = null;
    } else {
      // Check if all required approvals are complete
      const allRequiredComplete = approvalWorkflowService.areAllRequiredApprovalsComplete(expense.approvalSequence);
      
      if (allRequiredComplete) {
        // Check percentage approval
        const meetsPercentage = await approvalWorkflowService.checkPercentageApproval(expense, expense.approvalSequence);
        
        if (meetsPercentage) {
          expense.status = 'approved';
          expense.finalApproval = {
            approvedBy: req.user._id,
            approvedAt: new Date(),
            finalComments: comments
          };
          expense.currentApprover = null;
        } else {
          // Move to next approver
          const nextApprover = approvalWorkflowService.getNextApprover(expense.approvalSequence);
          if (nextApprover) {
            expense.currentApprover = nextApprover.approver;
          } else {
            // No more approvers, check if we can approve based on percentage
            const approvedCount = expense.approvalSequence.filter(a => a.status === 'approved').length;
            const totalCount = expense.approvalSequence.length;
            const approvalPercentage = (approvedCount / totalCount) * 100;

            // Default approval threshold of 50% if no rules match
            if (approvalPercentage >= 50) {
              expense.status = 'approved';
              expense.finalApproval = {
                approvedBy: req.user._id,
                approvedAt: new Date(),
                finalComments: comments
              };
            } else {
              expense.status = 'rejected';
              expense.finalApproval = {
                rejectedBy: req.user._id,
                rejectedAt: new Date(),
                finalComments: 'Insufficient approvals'
              };
            }
            expense.currentApprover = null;
          }
        }
      } else {
        // Move to next approver
        const nextApprover = approvalWorkflowService.getNextApprover(expense.approvalSequence);
        if (nextApprover) {
          expense.currentApprover = nextApprover.approver;
        } else {
          // No more approvers, check final approval status
          const approvedCount = expense.approvalSequence.filter(a => a.status === 'approved').length;
          const totalCount = expense.approvalSequence.length;
          const approvalPercentage = (approvedCount / totalCount) * 100;

          if (approvalPercentage >= 50) {
            expense.status = 'approved';
            expense.finalApproval = {
              approvedBy: req.user._id,
              approvedAt: new Date(),
              finalComments: comments
            };
          } else {
            expense.status = 'rejected';
            expense.finalApproval = {
              rejectedBy: req.user._id,
              rejectedAt: new Date(),
              finalComments: 'Insufficient approvals'
            };
          }
          expense.currentApprover = null;
        }
      }
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('approvalSequence.approver', 'firstName lastName email');

    res.json({
      success: true,
      message: `Expense ${action}d successfully`,
      data: { expense: updatedExpense }
    });
  } catch (error) {
    console.error('Approve/reject expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process approval',
      error: error.message
    });
  }
});

// Get approval history for an expense
router.get('/:id/history', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      company: req.user.company
    }).populate('approvalSequence.approver', 'firstName lastName email')
      .populate('finalApproval.approvedBy finalApproval.rejectedBy', 'firstName lastName email');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee' && expense.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        approvalHistory: expense.approvalSequence,
        finalApproval: expense.finalApproval,
        currentStatus: expense.status
      }
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval history',
      error: error.message
    });
  }
});

// Override approval (Admin only)
router.put('/:id/override', auth, isAdmin, async (req, res) => {
  try {
    const { action, comments } = req.body;
    const expenseId = req.params.id;

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approved" or "rejected"'
      });
    }

    const expense = await Expense.findOne({
      _id: expenseId,
      company: req.user.company
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Update expense status
    expense.status = action;
    expense.finalApproval = {
      [action === 'rejected' ? 'rejectedBy' : 'approvedBy']: req.user._id,
      [action === 'rejected' ? 'rejectedAt' : 'approvedAt']: new Date(),
      finalComments: comments || `Overridden by admin: ${action}`
    };
    expense.currentApprover = null;

    // Mark all pending approvals as overridden
    expense.approvalSequence.forEach(approval => {
      if (approval.status === 'pending') {
        approval.status = 'overridden';
        approval.comments = 'Overridden by admin';
        approval.overriddenAt = new Date();
      }
    });

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('approvalSequence.approver', 'firstName lastName email');

    res.json({
      success: true,
      message: `Expense ${action} by admin override`,
      data: { expense: updatedExpense }
    });
  } catch (error) {
    console.error('Override approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to override approval',
      error: error.message
    });
  }
});

// Get pending approvals count for current user
router.get('/pending/count', auth, isManager, async (req, res) => {
  try {
    const query = {
      company: req.user.company,
      status: 'pending'
    };

    // If user is manager (not admin), only count expenses assigned to them
    if (req.user.role === 'manager') {
      query.currentApprover = req.user._id;
    }

    const count = await Expense.countDocuments(query);

    res.json({
      success: true,
      data: { pendingCount: count }
    });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending count',
      error: error.message
    });
  }
});

// Bulk approve/reject expenses (Manager/Admin)
router.put('/bulk-action', auth, isManager, async (req, res) => {
  try {
    const { expenseIds, action, comments } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense IDs array is required'
      });
    }

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approved" or "rejected"'
      });
    }

    const query = {
      _id: { $in: expenseIds },
      company: req.user.company,
      status: 'pending'
    };

    // If user is manager (not admin), only process expenses assigned to them
    if (req.user.role === 'manager') {
      query.currentApprover = req.user._id;
    }

    const expenses = await Expense.find(query);
    
    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid expenses found for bulk action'
      });
    }

    // Process each expense
    const results = [];
    for (const expense of expenses) {
      try {
        // Find current approver in sequence
        const currentApprovalIndex = expense.approvalSequence.findIndex(
          approval => approval.approver.toString() === req.user._id.toString() && approval.status === 'pending'
        );

        if (currentApprovalIndex !== -1) {
          const currentApproval = expense.approvalSequence[currentApprovalIndex];
          currentApproval.status = action;
          currentApproval.comments = comments;
          
          if (action === 'approved') {
            currentApproval.approvedAt = new Date();
          } else {
            currentApproval.rejectedAt = new Date();
          }

          // For bulk actions, we'll use a simplified approval logic
          if (action === 'rejected') {
            expense.status = 'rejected';
            expense.finalApproval = {
              rejectedBy: req.user._id,
              rejectedAt: new Date(),
              finalComments: comments
            };
            expense.currentApprover = null;
          } else {
            // For approval, check if this is the final required approval
            const allRequiredComplete = approvalWorkflowService.areAllRequiredApprovalsComplete(expense.approvalSequence);
            
            if (allRequiredComplete) {
              expense.status = 'approved';
              expense.finalApproval = {
                approvedBy: req.user._id,
                approvedAt: new Date(),
                finalComments: comments
              };
              expense.currentApprover = null;
            } else {
              // Move to next approver
              const nextApprover = approvalWorkflowService.getNextApprover(expense.approvalSequence);
              if (nextApprover) {
                expense.currentApprover = nextApprover.approver;
              }
            }
          }

          await expense.save();
          results.push({ expenseId: expense._id, status: 'success' });
        } else {
          results.push({ expenseId: expense._id, status: 'skipped', reason: 'Not assigned to current user' });
        }
      } catch (error) {
        results.push({ expenseId: expense._id, status: 'error', error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      data: { results }
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk action',
      error: error.message
    });
  }
});

module.exports = router;
