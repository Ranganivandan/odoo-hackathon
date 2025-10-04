const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      // enum: ["Admin", "Manager", "Employee"],
      default: "Employee",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isManagerApprover: { type: Boolean, default: false },
    approvalSequence: { type: Number, default: null },
    approvalsGiven: [
      {
        expenseId: { type: mongoose.Schema.Types.ObjectId, ref: "Expense" },
        status: {
          type: String,
          enum: ["Approved", "Rejected"],
          required: true,
        },
        comment: String,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
