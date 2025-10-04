const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const auth = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies?.token;
    console.log(token);

    if (!token)
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user; // attach user info to request
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Role-based access
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied: insufficient permissions" });
    }
    next();
  };
};

module.exports = { auth, authorizeRoles };
