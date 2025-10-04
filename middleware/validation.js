const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    country: Joi.string().min(2).max(100).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('admin', 'manager', 'employee').required(),
    manager: Joi.string().optional(),
    isManagerApprover: Joi.boolean().default(false)
  }),

  updateUser: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    role: Joi.string().valid('admin', 'manager', 'employee').optional(),
    manager: Joi.string().optional(),
    isManagerApprover: Joi.boolean().optional(),
    isActive: Joi.boolean().optional()
  }),

  createExpense: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().required(),
    category: Joi.string().min(2).max(100).required(),
    description: Joi.string().min(5).max(500).required(),
    expenseDate: Joi.date().max('now').required(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    isUrgent: Joi.boolean().default(false)
  }),

  updateExpense: Joi.object({
    amount: Joi.number().positive().optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    category: Joi.string().min(2).max(100).optional(),
    description: Joi.string().min(5).max(500).optional(),
    expenseDate: Joi.date().max('now').optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    isUrgent: Joi.boolean().optional()
  }),

  approveExpense: Joi.object({
    action: Joi.string().valid('approve', 'reject').required(),
    comments: Joi.string().max(500).optional()
  }),

  createApprovalRule: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    type: Joi.string().valid('percentage', 'specific_approver', 'hybrid', 'sequential').required(),
    conditions: Joi.object().required(),
    amountThreshold: Joi.object({
      minAmount: Joi.number().min(0).optional(),
      maxAmount: Joi.number().min(0).optional()
    }).optional(),
    categoryFilter: Joi.array().items(Joi.string()).optional(),
    priority: Joi.number().integer().min(0).optional()
  }),

  updateCompany: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    address: Joi.object({
      street: Joi.string().max(200).optional(),
      city: Joi.string().max(100).optional(),
      state: Joi.string().max(100).optional(),
      zipCode: Joi.string().max(20).optional(),
      country: Joi.string().max(100).optional()
    }).optional(),
    contactInfo: Joi.object({
      phone: Joi.string().max(20).optional(),
      email: Joi.string().email().optional(),
      website: Joi.string().uri().optional()
    }).optional()
  })
};

module.exports = {
  validateRequest,
  schemas
};
