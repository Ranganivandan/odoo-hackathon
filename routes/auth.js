const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { validateRequest, schemas } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const currencyService = require('../utils/currency');

const router = express.Router();

// Register/Login endpoint (creates company and admin user on first signup)
router.post('/register', validateRequest(schemas.register), async (req, res) => {
  try {
    const { email, password, firstName, lastName, country } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Get country currency information
    const countries = await currencyService.getCountriesAndCurrencies();
    const countryData = countries.find(c => 
      c.name.toLowerCase().includes(country.toLowerCase()) ||
      country.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!countryData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid country. Please provide a valid country name.'
      });
    }

    // Create company
    const company = new Company({
      name: `${firstName} ${lastName}'s Company`,
      country: countryData.name,
      currency: countryData.currency,
      currencySymbol: countryData.symbol,
      settings: {
        expenseCategories: [
          { name: 'Meals & Entertainment', description: 'Food and entertainment expenses', isActive: true },
          { name: 'Travel', description: 'Travel related expenses', isActive: true },
          { name: 'Transportation', description: 'Transportation costs', isActive: true },
          { name: 'Office Supplies', description: 'Office supplies and materials', isActive: true },
          { name: 'Communication', description: 'Phone, internet, and communication costs', isActive: true },
          { name: 'Utilities', description: 'Electricity, water, gas, etc.', isActive: true },
          { name: 'Other', description: 'Other miscellaneous expenses', isActive: true }
        ]
      }
    });

    await company.save();

    // Create admin user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: 'admin',
      company: company._id,
      isManagerApprover: true
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Company and admin user created successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          company: {
            id: company._id,
            name: company.name,
            country: company.country,
            currency: company.currency,
            currencySymbol: company.currencySymbol
          }
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Login endpoint
router.post('/login', validateRequest(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and populate company
    const user = await User.findOne({ email }).populate('company');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          company: user.company,
          lastLogin: user.lastLogin
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company')
      .populate('manager', 'firstName lastName email');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          company: user.company,
          manager: user.manager,
          isManagerApprover: user.isManagerApprover,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', auth, validateRequest(schemas.updateUser), async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).populate('company').populate('manager', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: error.message
    });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id);
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed',
      error: error.message
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
