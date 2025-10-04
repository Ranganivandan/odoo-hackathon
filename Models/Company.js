const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    country: { type: String, required: true },
    currency: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvalRules: {
      percentageRule: { type: Number, default: null },
      specificApprover: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      hybridRule: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
