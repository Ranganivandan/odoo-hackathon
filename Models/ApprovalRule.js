const mongoose = require('mongoose');

const approvalRuleSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'specific_approver', 'hybrid', 'sequential'],
    required: true
  },
  conditions: {
    // For percentage rule
    percentage: {
      type: Number,
      min: 1,
      max: 100
    },
    // For specific approver rule
    specificApprovers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // For hybrid rule
    hybrid: {
      percentage: {
        type: Number,
        min: 1,
        max: 100
      },
      specificApprovers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    // For sequential rule
    sequential: [{
      approver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      sequence: {
        type: Number,
        required: true
      },
      isRequired: {
        type: Boolean,
        default: true
      }
    }]
  },
  amountThreshold: {
    minAmount: {
      type: Number,
      default: 0
    },
    maxAmount: {
      type: Number,
      default: Number.MAX_SAFE_INTEGER
    }
  },
  categoryFilter: [String], // Apply to specific expense categories
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0 // Higher number = higher priority
  }
}, {
  timestamps: true
});

// Index for efficient rule matching
approvalRuleSchema.index({ company: 1, isActive: 1, priority: -1 });
approvalRuleSchema.index({ 'amountThreshold.minAmount': 1, 'amountThreshold.maxAmount': 1 });

module.exports = mongoose.model('ApprovalRule', approvalRuleSchema);
