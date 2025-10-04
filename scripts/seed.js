const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Company = require('../models/Company');
const Currency = require('../models/Currency');

// Sample data for seeding
const sampleData = {
  companies: [
    {
      name: 'Acme Corporation',
      country: 'United States',
      currency: 'USD',
      currencySymbol: '$',
      address: {
        street: '123 Business St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      },
      contactInfo: {
        phone: '+1-555-0123',
        email: 'info@acme.com',
        website: 'https://acme.com'
      },
      settings: {
        expenseCategories: [
          { name: 'Meals & Entertainment', description: 'Food and entertainment expenses', isActive: true },
          { name: 'Travel', description: 'Travel related expenses', isActive: true },
          { name: 'Transportation', description: 'Transportation costs', isActive: true },
          { name: 'Office Supplies', description: 'Office supplies and materials', isActive: true },
          { name: 'Communication', description: 'Phone, internet, and communication costs', isActive: true },
          { name: 'Utilities', description: 'Electricity, water, gas, etc.', isActive: true },
          { name: 'Other', description: 'Other miscellaneous expenses', isActive: true }
        ],
        approvalThresholds: [
          {
            minAmount: 0,
            maxAmount: 100,
            approvers: [],
            sequence: 1
          },
          {
            minAmount: 100,
            maxAmount: 1000,
            approvers: [],
            sequence: 2
          },
          {
            minAmount: 1000,
            maxAmount: Number.MAX_SAFE_INTEGER,
            approvers: [],
            sequence: 3
          }
        ]
      }
    }
  ],
  users: [
    {
      email: 'admin@acme.com',
      password: 'admin123',
      firstName: 'John',
      lastName: 'Admin',
      role: 'admin',
      isManagerApprover: true
    },
    {
      email: 'manager@acme.com',
      password: 'manager123',
      firstName: 'Jane',
      lastName: 'Manager',
      role: 'manager',
      isManagerApprover: true
    },
    {
      email: 'employee@acme.com',
      password: 'employee123',
      firstName: 'Bob',
      lastName: 'Employee',
      role: 'employee',
      isManagerApprover: false
    }
  ],
  currencies: [
    {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      country: 'United States',
      exchangeRates: {
        base: 'USD',
        rates: new Map([
          ['EUR', 0.85],
          ['GBP', 0.73],
          ['JPY', 110.0],
          ['CAD', 1.25],
          ['AUD', 1.35]
        ]),
        lastUpdated: new Date()
      },
      isActive: true
    },
    {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      country: 'European Union',
      exchangeRates: {
        base: 'EUR',
        rates: new Map([
          ['USD', 1.18],
          ['GBP', 0.86],
          ['JPY', 129.0],
          ['CAD', 1.47],
          ['AUD', 1.59]
        ]),
        lastUpdated: new Date()
      },
      isActive: true
    },
    {
      code: 'GBP',
      name: 'British Pound',
      symbol: '£',
      country: 'United Kingdom',
      exchangeRates: {
        base: 'GBP',
        rates: new Map([
          ['USD', 1.37],
          ['EUR', 1.16],
          ['JPY', 150.0],
          ['CAD', 1.71],
          ['AUD', 1.85]
        ]),
        lastUpdated: new Date()
      },
      isActive: true
    }
  ]
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense_management');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Currency.deleteMany({});
    console.log('Cleared existing data');

    // Create currencies
    const currencies = await Currency.insertMany(sampleData.currencies);
    console.log('Created currencies');

    // Create company
    const company = await Company.create(sampleData.companies[0]);
    console.log('Created company:', company.name);

    // Create users
    const users = [];
    for (const userData of sampleData.users) {
      const user = new User({
        ...userData,
        company: company._id
      });
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      
      await user.save();
      users.push(user);
    }

    // Set manager relationship
    const manager = users.find(u => u.role === 'manager');
    const employee = users.find(u => u.role === 'employee');
    if (manager && employee) {
      employee.manager = manager._id;
      await employee.save();
    }

    console.log('Created users:', users.map(u => `${u.firstName} ${u.lastName} (${u.role})`));

    console.log('Database seeded successfully!');
    console.log('\nSample login credentials:');
    console.log('Admin: admin@acme.com / admin123');
    console.log('Manager: manager@acme.com / manager123');
    console.log('Employee: employee@acme.com / employee123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
