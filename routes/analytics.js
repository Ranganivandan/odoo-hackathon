const express = require('express');
const Expense = require('../models/Expense');
const User = require('../models/User');
const { auth, isManager, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get dashboard analytics based on user role
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { role, _id: userId, company } = req.user;
    const { period = 'current' } = req.query; // 'current', 'all', or 'YYYY-MM'
    
    let startDate, endDate, periodLabel;
    
    if (period === 'all') {
      // All time data
      startDate = new Date('2020-01-01');
      endDate = new Date('2030-12-31');
      periodLabel = 'All Time';
    } else if (period.match(/^\d{4}-\d{2}$/)) {
      // Specific month (YYYY-MM)
      const [year, month] = period.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      periodLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else {
      // Current month (default)
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      periodLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    
    let analytics = {};

    if (role === 'admin') {
      // Admin sees company-wide analytics
      analytics = await getAdminAnalytics(company, startDate, endDate);
    } else if (role === 'manager') {
      // Manager sees team analytics
      analytics = await getManagerAnalytics(userId, company, startDate, endDate);
    } else {
      // Employee sees personal analytics
      analytics = await getEmployeeAnalytics(userId, startDate, endDate);
    }

    res.json({
      success: true,
      data: {
        role,
        period: {
          start: startDate,
          end: endDate,
          month: periodLabel
        },
        ...analytics
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: error.message
    });
  }
});

// Admin Analytics - Company-wide view
async function getAdminAnalytics(companyId, startDate, endDate) {
  // Get all users in company
  const totalUsers = await User.countDocuments({ company: companyId, isActive: true });
  const managers = await User.countDocuments({ company: companyId, role: 'manager', isActive: true });
  const employees = await User.countDocuments({ company: companyId, role: 'employee', isActive: true });

  // Get all expenses for the company
  const allExpenses = await Expense.find({
    company: companyId,
    expenseDate: { $gte: startDate, $lte: endDate }
  }).populate('employee', 'firstName lastName');

  // Expense statistics
  const totalExpenses = allExpenses.length;
  const pendingExpenses = allExpenses.filter(e => e.status === 'pending').length;
  const approvedExpenses = allExpenses.filter(e => e.status === 'approved').length;
  const rejectedExpenses = allExpenses.filter(e => e.status === 'rejected').length;

  // Amount statistics (use amount if amountInCompanyCurrency is not set)
  const totalAmount = allExpenses.reduce((sum, e) => sum + (e.amountInCompanyCurrency || e.amount || 0), 0);
  const approvedAmount = allExpenses.filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + (e.amountInCompanyCurrency || e.amount || 0), 0);
  const pendingAmount = allExpenses.filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + (e.amountInCompanyCurrency || e.amount || 0), 0);

  // Category breakdown
  const categoryBreakdown = {};
  allExpenses.forEach(expense => {
    if (!categoryBreakdown[expense.category]) {
      categoryBreakdown[expense.category] = { count: 0, amount: 0 };
    }
    categoryBreakdown[expense.category].count++;
    categoryBreakdown[expense.category].amount += (expense.amountInCompanyCurrency || expense.amount || 0);
  });

  // Top spenders
  const spenderMap = {};
  allExpenses.forEach(expense => {
    const employeeId = expense.employee._id.toString();
    if (!spenderMap[employeeId]) {
      spenderMap[employeeId] = {
        name: `${expense.employee.firstName} ${expense.employee.lastName}`,
        total: 0,
        count: 0
      };
    }
    spenderMap[employeeId].total += (expense.amountInCompanyCurrency || expense.amount || 0);
    spenderMap[employeeId].count++;
  });

  const topSpenders = Object.values(spenderMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Budget overview
  const usersWithBudget = await User.find({
    company: companyId,
    monthlyBudget: { $gt: 0 },
    isActive: true
  }).select('firstName lastName monthlyBudget budgetCurrency');

  const budgetOverview = await Promise.all(usersWithBudget.map(async (user) => {
    const userExpenses = await Expense.find({
      employee: user._id,
      expenseDate: { $gte: startDate, $lte: endDate }
    });
    const spent = userExpenses.reduce((sum, e) => sum + e.amount, 0);
    const percentage = user.monthlyBudget > 0 ? (spent / user.monthlyBudget) * 100 : 0;

    return {
      name: `${user.firstName} ${user.lastName}`,
      budget: user.monthlyBudget,
      spent,
      percentage: Math.round(percentage * 100) / 100,
      currency: user.budgetCurrency
    };
  }));

  // Users over budget
  const usersOverBudget = budgetOverview.filter(u => u.percentage > 100).length;

  return {
    users: {
      total: totalUsers,
      managers,
      employees
    },
    expenses: {
      total: totalExpenses,
      pending: pendingExpenses,
      approved: approvedExpenses,
      rejected: rejectedExpenses
    },
    amounts: {
      total: totalAmount,
      approved: approvedAmount,
      pending: pendingAmount
    },
    categoryBreakdown,
    topSpenders,
    budgetOverview: {
      usersWithBudget: usersWithBudget.length,
      usersOverBudget,
      details: budgetOverview.sort((a, b) => b.percentage - a.percentage).slice(0, 10)
    }
  };
}

// Manager Analytics - Team view
async function getManagerAnalytics(managerId, companyId, startDate, endDate) {
  // Get team members
  const teamMembers = await User.find({
    company: companyId,
    manager: managerId,
    isActive: true
  }).select('firstName lastName monthlyBudget budgetCurrency');

  const teamSize = teamMembers.length;

  // Get team expenses
  const teamMemberIds = teamMembers.map(m => m._id);
  const teamExpenses = await Expense.find({
    employee: { $in: teamMemberIds },
    expenseDate: { $gte: startDate, $lte: endDate }
  }).populate('employee', 'firstName lastName');

  // Pending approvals for this manager
  const pendingApprovals = await Expense.find({
    currentApprover: managerId,
    status: 'pending'
  }).countDocuments();

  // Expense statistics
  const totalExpenses = teamExpenses.length;
  const pendingExpenses = teamExpenses.filter(e => e.status === 'pending').length;
  const approvedExpenses = teamExpenses.filter(e => e.status === 'approved').length;
  const rejectedExpenses = teamExpenses.filter(e => e.status === 'rejected').length;

  // Amount statistics
  const totalAmount = teamExpenses.reduce((sum, e) => sum + (e.amountInCompanyCurrency || e.amount || 0), 0);
  const approvedAmount = teamExpenses.filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + (e.amountInCompanyCurrency || e.amount || 0), 0);

  // Category breakdown
  const categoryBreakdown = {};
  teamExpenses.forEach(expense => {
    if (!categoryBreakdown[expense.category]) {
      categoryBreakdown[expense.category] = { count: 0, amount: 0 };
    }
    categoryBreakdown[expense.category].count++;
    categoryBreakdown[expense.category].amount += (expense.amountInCompanyCurrency || expense.amount || 0);
  });

  // Team member breakdown
  const memberBreakdown = await Promise.all(teamMembers.map(async (member) => {
    const memberExpenses = teamExpenses.filter(e => e.employee._id.toString() === member._id.toString());
    const spent = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
    const percentage = member.monthlyBudget > 0 ? (spent / member.monthlyBudget) * 100 : 0;

    return {
      name: `${member.firstName} ${member.lastName}`,
      expenseCount: memberExpenses.length,
      totalSpent: spent,
      budget: member.monthlyBudget,
      budgetPercentage: Math.round(percentage * 100) / 100,
      currency: member.budgetCurrency
    };
  }));

  return {
    team: {
      size: teamSize,
      members: memberBreakdown.sort((a, b) => b.totalSpent - a.totalSpent)
    },
    pendingApprovals,
    expenses: {
      total: totalExpenses,
      pending: pendingExpenses,
      approved: approvedExpenses,
      rejected: rejectedExpenses
    },
    amounts: {
      total: totalAmount,
      approved: approvedAmount
    },
    categoryBreakdown
  };
}

// Employee Analytics - Personal view
async function getEmployeeAnalytics(userId, startDate, endDate) {
  const user = await User.findById(userId).select('firstName lastName monthlyBudget budgetCurrency budgetAlertThreshold');

  // Get user's expenses
  const expenses = await Expense.find({
    employee: userId,
    expenseDate: { $gte: startDate, $lte: endDate }
  });

  // Expense statistics
  const totalExpenses = expenses.length;
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
  const approvedExpenses = expenses.filter(e => e.status === 'approved').length;
  const rejectedExpenses = expenses.filter(e => e.status === 'rejected').length;

  // Amount statistics
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const approvedAmount = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const pendingAmount = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const rejectedAmount = expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0);

  // Budget calculation
  const budgetUsed = totalAmount;
  const budgetRemaining = user.monthlyBudget - budgetUsed;
  const budgetPercentage = user.monthlyBudget > 0 ? (budgetUsed / user.monthlyBudget) * 100 : 0;

  // Category breakdown
  const categoryBreakdown = {};
  expenses.forEach(expense => {
    if (!categoryBreakdown[expense.category]) {
      categoryBreakdown[expense.category] = { count: 0, amount: 0 };
    }
    categoryBreakdown[expense.category].count++;
    categoryBreakdown[expense.category].amount += expense.amount;
  });

  // Weekly trend (last 4 weeks)
  const weeklyTrend = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekExpenses = expenses.filter(e => {
      const expDate = new Date(e.expenseDate);
      return expDate >= weekStart && expDate <= weekEnd;
    });

    weeklyTrend.push({
      week: `Week ${4 - i}`,
      count: weekExpenses.length,
      amount: weekExpenses.reduce((sum, e) => sum + e.amount, 0)
    });
  }

  return {
    expenses: {
      total: totalExpenses,
      pending: pendingExpenses,
      approved: approvedExpenses,
      rejected: rejectedExpenses
    },
    amounts: {
      total: totalAmount,
      approved: approvedAmount,
      pending: pendingAmount,
      rejected: rejectedAmount,
      currency: user.budgetCurrency
    },
    budget: {
      monthly: user.monthlyBudget,
      used: budgetUsed,
      remaining: budgetRemaining,
      percentage: Math.round(budgetPercentage * 100) / 100,
      currency: user.budgetCurrency,
      alertThreshold: user.budgetAlertThreshold,
      isOverBudget: budgetPercentage > 100,
      isNearLimit: budgetPercentage >= user.budgetAlertThreshold && budgetPercentage < 100
    },
    categoryBreakdown,
    weeklyTrend
  };
}

module.exports = router;
