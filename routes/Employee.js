const express = require("express");
const Expense = require("../Models/Expense");
const { auth, authorizeRoles } = require("../middleware/middleware");

const router = express.Router();

// Submit expense
router.post(
  "/create-expense",
  auth,
  authorizeRoles("Employee"),
  async (req, res) => {
    try {
      const { amount, category, description, originalCurrency } = req.body;

      const expense = new Expense({
        employee: req.user._id,
        company: req.user.company,
        amount,
        category,
        description,
        originalCurrency,
        approvalFlow: [{ approver: req.user.manager, status: "Pending" }],
      });

      await expense.save();
      res.status(201).json(expense);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Get my expenses
router.get(
  "/my-expenses",
  auth,
  authorizeRoles("Employee"),
  async (req, res) => {
    try {
      const expenses = await Expense.find({ employee: req.user._id });
      res.json(expenses);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
