const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  exchangeRates: {
    base: {
      type: String,
      default: 'USD'
    },
    rates: {
      type: Map,
      of: Number
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient currency lookups
currencySchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('Currency', currencySchema);
