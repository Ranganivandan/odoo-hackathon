const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  currency: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  currencySymbol: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contactInfo: {
    phone: String,
    email: String,
    website: String
  },
  settings: {
    approvalRules: [{
      name: String,
      type: {
        type: String,
        enum: ['percentage', 'specific_approver', 'hybrid'],
        required: true
      },
      conditions: {
        percentage: Number, // For percentage rule
        specificApprovers: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }], // For specific approver rule
        hybrid: {
          percentage: Number,
          specificApprovers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }]
        } // For hybrid rule
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    expenseCategories: [{
      name: String,
      description: String,
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    approvalThresholds: [{
      minAmount: Number,
      maxAmount: Number,
      approvers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      sequence: Number // Order of approval
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);
