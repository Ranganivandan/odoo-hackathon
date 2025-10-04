const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
dotenv.config();
const app = express();

app.use(cookieParser());

// Middlewares
app.use(cors());
app.use(express.json());

// Import auth middleware
const { auth, authorizeRoles } = require("./middleware/middleware");

// Import routes
const authRoutes = require("./routes/userRoutes");
const ExpenseRoutes = require("./routes/Expense");
const AdminRoutes = require("./routes/Admin");
const ManagerRoutes = require("./routes/Manager");
const EmployeeRoutes = require("./routes/Employee");

// DB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Test Route
app.get("/", (req, res) => {
  res.send("🚀 Expense Management API is running...");
});

// Mount all routes
app.use("/api/auth", authRoutes); // Signup / Signin
app.use("/api/expenses", ExpenseRoutes); // Expense-related routes
app.use("/api/admin", AdminRoutes); // Admin routes (create user, view expenses)
app.use("/api/manager", ManagerRoutes); // Manager routes (approve/reject)
app.use("/api/employee", EmployeeRoutes); // Employee routes (create/view expenses)

// Optional: role test routes
app.get("/api/admin/test", auth, authorizeRoles("Admin"), (req, res) => {
  res.send("Welcome Admin ✅");
});
app.get("/api/manager/test", auth, authorizeRoles("Manager"), (req, res) => {
  res.send("Welcome Manager ✅");
});
app.get("/api/employee/test", auth, authorizeRoles("Employee"), (req, res) => {
  res.send("Welcome Employee ✅");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
