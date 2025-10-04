const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  amountInCompanyCurrency: {
    type: Number,
    required: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  expenseDate: {
    type: Date,
    required: true
  },
  receipt: {
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
    size: Number
  },
  ocrData: {
    extractedText: String,
    confidence: Number,
    extractedAmount: Number,
    extractedDate: Date,
    extractedMerchant: String,
    extractedCategory: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalSequence: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sequence: Number,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    approvedAt: Date,
    rejectedAt: Date
  }],
  finalApproval: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date,
    finalComments: String
  },
  tags: [String],
  isUrgent: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
    size: Number
  }]
}, {
  timestamps: true
});

// Index for efficient queries
expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ company: 1, status: 1 });
expenseSchema.index({ currentApprover: 1, status: 1 });
expenseSchema.index({ expenseDate: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
