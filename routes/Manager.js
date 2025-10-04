const express = require("express");
const Expense = require("../Models/Expense");
const { auth, authorizeRoles } = require("../middleware/middleware");

const router = express.Router();

// Get pending expenses for manager
router.get(
  "/pending-expenses",
  auth,
  authorizeRoles("Manager"),
  async (req, res) => {
    try {
      const expenses = await Expense.find({
        "approvalFlow.approver": req.user._id,
        status: "Pending",
      }).populate("employee");
      res.json(expenses);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Approve expense
router.put(
  "/approve/:id",
  auth,
  authorizeRoles("Manager"),
  async (req, res) => {
    try {
      const expense = await Expense.findById(req.params.id);
      if (!expense)
        return res.status(404).json({ message: "Expense not found" });

      expense.approvalFlow.forEach((flow) => {
        if (flow.approver.toString() === req.user._id.toString()) {
          flow.status = "Approved";
          flow.actedAt = new Date();
        }
      });

      // Check if all approved → mark overall Approved
      if (expense.approvalFlow.every((f) => f.status === "Approved")) {
        expense.status = "Approved";
      }

      await expense.save();
      res.json(expense);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Reject expense
router.put("/reject/:id", auth, authorizeRoles("Manager"), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    expense.approvalFlow.forEach((flow) => {
      if (flow.approver.toString() === req.user._id.toString()) {
        flow.status = "Rejected";
        flow.actedAt = new Date();
      }
    });

    expense.status = "Rejected";
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
