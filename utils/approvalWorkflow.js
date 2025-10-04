const ApprovalRule = require('../models/ApprovalRule');
const User = require('../models/User');

class ApprovalWorkflowService {
  // Determine approval sequence for an expense
  async determineApprovalSequence(expense, company) {
    try {
      // Get applicable approval rules
      const rules = await ApprovalRule.find({
        company: company._id,
        isActive: true,
        $or: [
          { 'amountThreshold.minAmount': { $lte: expense.amountInCompanyCurrency } },
          { 'amountThreshold.minAmount': { $exists: false } }
        ],
        $or: [
          { 'amountThreshold.maxAmount': { $gte: expense.amountInCompanyCurrency } },
          { 'amountThreshold.maxAmount': { $exists: false } }
        ],
        $or: [
          { categoryFilter: { $in: [expense.category] } },
          { categoryFilter: { $exists: false } },
          { categoryFilter: { $size: 0 } }
        ]
      }).sort({ priority: -1 }).populate('conditions.specificApprovers conditions.hybrid.specificApprovers conditions.sequential.approver');

      if (rules.length === 0) {
        // Default: manager approval
        return await this.getDefaultApprovalSequence(expense);
      }

      // Use the highest priority rule
      const rule = rules[0];
      return await this.buildApprovalSequence(rule, expense);
    } catch (error) {
      console.error('Error determining approval sequence:', error);
      return await this.getDefaultApprovalSequence(expense);
    }
  }

  // Build approval sequence based on rule type
  async buildApprovalSequence(rule, expense) {
    const sequence = [];

    switch (rule.type) {
      case 'sequential':
        return this.buildSequentialSequence(rule.conditions.sequential, expense);
      
      case 'percentage':
        return this.buildPercentageSequence(rule, expense);
      
      case 'specific_approver':
        return this.buildSpecificApproverSequence(rule.conditions.specificApprovers, expense);
      
      case 'hybrid':
        return this.buildHybridSequence(rule, expense);
      
      default:
        return await this.getDefaultApprovalSequence(expense);
    }
  }

  // Build sequential approval sequence
  buildSequentialSequence(sequentialApprovers, expense) {
    return sequentialApprovers
      .sort((a, b) => a.sequence - b.sequence)
      .map(approver => ({
        approver: approver.approver._id,
        sequence: approver.sequence,
        isRequired: approver.isRequired,
        status: 'pending'
      }));
  }

  // Build percentage-based approval sequence
  buildPercentageSequence(rule, expense) {
    // For percentage rules, we need to get all potential approvers
    // This would typically be all managers in the company
    return [{
      approver: null, // Will be determined dynamically
      sequence: 1,
      isRequired: false,
      status: 'pending',
      ruleType: 'percentage',
      percentage: rule.conditions.percentage
    }];
  }

  // Build specific approver sequence
  buildSpecificApproverSequence(specificApprovers, expense) {
    return specificApprovers.map((approver, index) => ({
      approver: approver._id,
      sequence: index + 1,
      isRequired: true,
      status: 'pending'
    }));
  }

  // Build hybrid approval sequence
  buildHybridSequence(rule, expense) {
    const sequence = [];
    
    // Add specific approvers
    if (rule.conditions.hybrid.specificApprovers.length > 0) {
      rule.conditions.hybrid.specificApprovers.forEach((approver, index) => {
        sequence.push({
          approver: approver._id,
          sequence: index + 1,
          isRequired: true,
          status: 'pending',
          ruleType: 'hybrid_specific'
        });
      });
    }

    // Add percentage rule
    sequence.push({
      approver: null,
      sequence: sequence.length + 1,
      isRequired: false,
      status: 'pending',
      ruleType: 'hybrid_percentage',
      percentage: rule.conditions.hybrid.percentage
    });

    return sequence;
  }

  // Get default approval sequence (manager approval)
  async getDefaultApprovalSequence(expense) {
    const employee = await User.findById(expense.employee).populate('manager');
    
    if (employee.manager && employee.manager.isManagerApprover) {
      return [{
        approver: employee.manager._id,
        sequence: 1,
        isRequired: true,
        status: 'pending'
      }];
    }

    // If no manager or manager is not an approver, find any manager in the company
    const manager = await User.findOne({
      company: expense.company,
      role: 'manager',
      isManagerApprover: true,
      isActive: true
    });

    if (manager) {
      return [{
        approver: manager._id,
        sequence: 1,
        isRequired: true,
        status: 'pending'
      }];
    }

    // Fallback: admin approval
    const admin = await User.findOne({
      company: expense.company,
      role: 'admin',
      isActive: true
    });

    return admin ? [{
      approver: admin._id,
      sequence: 1,
      isRequired: true,
      status: 'pending'
    }] : [];
  }

  // Check if expense can be auto-approved based on rules
  async checkAutoApproval(expense, approval) {
    try {
      const rules = await ApprovalRule.find({
        company: expense.company,
        isActive: true,
        type: { $in: ['specific_approver', 'hybrid'] }
      }).populate('conditions.specificApprovers conditions.hybrid.specificApprovers');

      for (const rule of rules) {
        if (rule.type === 'specific_approver') {
          const specificApprovers = rule.conditions.specificApprovers.map(a => a._id.toString());
          if (specificApprovers.includes(approval.approver.toString())) {
            return true; // Auto-approve if specific approver approved
          }
        } else if (rule.type === 'hybrid') {
          const specificApprovers = rule.conditions.hybrid.specificApprovers.map(a => a._id.toString());
          if (specificApprovers.includes(approval.approver.toString())) {
            return true; // Auto-approve if specific approver approved
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking auto-approval:', error);
      return false;
    }
  }

  // Check if expense meets percentage approval threshold
  async checkPercentageApproval(expense, approvals) {
    try {
      const rules = await ApprovalRule.find({
        company: expense.company,
        isActive: true,
        type: { $in: ['percentage', 'hybrid'] }
      });

      for (const rule of rules) {
        const percentage = rule.type === 'hybrid' 
          ? rule.conditions.hybrid.percentage 
          : rule.conditions.percentage;

        const approvedCount = approvals.filter(a => a.status === 'approved').length;
        const totalCount = approvals.length;
        const approvalPercentage = (approvedCount / totalCount) * 100;

        if (approvalPercentage >= percentage) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking percentage approval:', error);
      return false;
    }
  }

  // Get next approver in sequence
  getNextApprover(approvalSequence) {
    const pendingApprovals = approvalSequence.filter(a => a.status === 'pending');
    return pendingApprovals.length > 0 ? pendingApprovals[0] : null;
  }

  // Check if all required approvals are complete
  areAllRequiredApprovalsComplete(approvalSequence) {
    const requiredApprovals = approvalSequence.filter(a => a.isRequired);
    return requiredApprovals.every(a => a.status !== 'pending');
  }
}

module.exports = new ApprovalWorkflowService();
