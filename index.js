const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
// Middlewares
app.use(cors());
app.use(express.json());

const { auth, authorizeRoles } = require("./middleware/middleware");
const authRoutes = require("./routes/userRoutes");
const Expenserouter = require("../backend/routes/Expense");
const Adminroute = require("../backend/routes/Admin");
const Managerroute = require("../backend/routes/Manager");
const Employeeroute = require("../backend/routes/Employee");
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

app.use("/api/auth", authRoutes);

// Protected test routes
app.get("/api/admin", auth, authorizeRoles("Admin"), (req, res) => {
  res.send("Welcome Admin ✅");
});

app.get("/api/manager", auth, authorizeRoles("Manager"), (req, res) => {
  res.send("Welcome Manager ✅");
});

app.get("/api/employee", auth, authorizeRoles("Employee"), (req, res) => {
  res.send("Welcome Employee ✅");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
