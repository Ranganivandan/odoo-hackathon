const express = require("express");
const User = require("../Models/User");
const Expense = require("../Models/Expense");
const { auth, authorizeRoles } = require("../middleware/middleware");
const { sendCredentialsMail } = require("../utils/mailController");
const router = express.Router();

// Create new user (Employee / Manager)
router.post("/create-user", auth, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);
    // console.log(req);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      company: req.user.company,
      manager: null,
    });

    await user.save();
    await sendCredentialsMail(email, name, email, password, role);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users of company
router.get("/users", auth, authorizeRoles("Admin"), async (req, res) => {
  try {
    console.log("hello");

    const users = await User.find({ company: req.user.company });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user (role or manager assignment)
router.put(
  "/update-user/:id",
  auth,
  authorizeRoles("Admin"),
  async (req, res) => {
    try {
      const { role, manager } = req.body;
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role, manager },
        { new: true }
      );
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// View all company expenses
router.get("/all-expenses", auth, authorizeRoles("Admin"), async (req, res) => {
  try {
    const expenses = await Expense.find({ company: req.user.company }).populate(
      "employee"
    );
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
