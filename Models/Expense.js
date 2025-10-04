const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    amount: { type: Number, required: true },
    originalCurrency: { type: String, required: true },
    convertedAmount: { type: Number },
    category: { type: String, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
    receiptOCR: {
      merchantName: String,
      expenseType: String,
      expenseDate: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvalFlow: [
      {
        approver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["Pending", "Approved", "Rejected"],
          default: "Pending",
        },
        comment: String,
        actedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
