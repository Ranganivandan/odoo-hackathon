const express = require("express");
const { auth, authorizeRoles } = require("../middleware/middleware");
const Expense = require("../Models/Expense");

const Expenserouter = express.Router();

// 👨‍💼 Admin-only endpoint
Expenserouter.get(
  "/all-expenses",
  auth,
  authorizeRoles("Admin"),
  async (req, res) => {
    try {
      const expenses = await Expense.find().populate("employee");
      res.json(expenses);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 👨 Manager-only endpoint
Expenserouter.get(
  "/pending-expenses",
  auth,
  authorizeRoles("Manager"),
  async (req, res) => {
    try {
      const expenses = await Expense.find({
        "approvalFlow.approver": req.user._id,
        status: "Pending",
      });
      res.json(expenses);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 👷 Employee-only endpoint
Expenserouter.post(
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
      });

      await expense.save();
      res.status(201).json(expense);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = Expenserouter;
