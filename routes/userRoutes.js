const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../Models/User");
const Company = require("../Models/Company");

const router = express.Router();

// ✅ Signup (create company + admin)
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, companyName, country, currency } =
      req.body;

    let company;

    if (role === "Admin") {
      company = new Company({ name: companyName, country, currency });
      await company.save();
    } else {
      return res
        .status(400)
        .json({ message: "Only Admin can sign up first to create a company" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "Admin",
      company: company._id,
    });

    await user.save();

    company.admin = user._id;
    await company.save();

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Store token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // only HTTPS in prod
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "strict",
    });

    res.status(201).json({ message: "Signup successful", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Signin
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("company");
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Store token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    res.json({ message: "Signin successful", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
