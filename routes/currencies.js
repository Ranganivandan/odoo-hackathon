const express = require('express');
const currencyService = require('../utils/currency');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all countries and their currencies
router.get('/countries', auth, async (req, res) => {
  try {
    const countries = await currencyService.getCountriesAndCurrencies();
    
    res.json({
      success: true,
      data: { countries }
    });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch countries and currencies',
      error: error.message
    });
  }
});

// Get all active currencies
router.get('/active', auth, async (req, res) => {
  try {
    const currencies = await currencyService.getAllActiveCurrencies();
    
    res.json({
      success: true,
      data: { currencies }
    });
  } catch (error) {
    console.error('Get active currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active currencies',
      error: error.message
    });
  }
});

// Get exchange rates for a base currency
router.get('/rates/:baseCurrency', auth, async (req, res) => {
  try {
    const { baseCurrency } = req.params;
    const rates = await currencyService.getExchangeRates(baseCurrency.toUpperCase());
    
    res.json({
      success: true,
      data: { rates }
    });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates',
      error: error.message
    });
  }
});

// Convert currency
router.post('/convert', auth, async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Amount, fromCurrency, and toCurrency are required'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    const conversion = await currencyService.convertCurrency(
      parseFloat(amount),
      fromCurrency.toUpperCase(),
      toCurrency.toUpperCase()
    );
    
    res.json({
      success: true,
      data: {
        originalAmount: parseFloat(amount),
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        convertedAmount: conversion.amount,
        exchangeRate: conversion.exchangeRate
      }
    });
  } catch (error) {
    console.error('Convert currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency',
      error: error.message
    });
  }
});

// Get currency by code
router.get('/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const currency = await currencyService.getCurrencyByCode(code.toUpperCase());
    
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'Currency not found'
      });
    }
    
    res.json({
      success: true,
      data: { currency }
    });
  } catch (error) {
    console.error('Get currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch currency',
      error: error.message
    });
  }
});

module.exports = router;
