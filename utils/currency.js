const axios = require('axios');
const Currency = require('../models/Currency');

class CurrencyService {
  constructor() {
    this.exchangeRateAPI = process.env.EXCHANGE_RATE_API || 'https://api.exchangerate-api.com/v4/latest';
    this.restCountriesAPI = process.env.REST_COUNTRIES_API || 'https://restcountries.com/v3.1/all?fields=name,currencies';
  }

  // Get all countries and their currencies
  async getCountriesAndCurrencies() {
    try {
      const response = await axios.get(this.restCountriesAPI, { timeout: 5000 });
      const countries = response.data.map(country => ({
        name: country.name.common,
        currency: country.currencies ? Object.keys(country.currencies)[0] : 'USD',
        currencyName: country.currencies ? Object.values(country.currencies)[0].name : 'US Dollar',
        symbol: country.currencies ? Object.values(country.currencies)[0].symbol : '$'
      }));
      return countries;
    } catch (error) {
      console.error('Error fetching countries and currencies, using fallback data:', error.message);
      // Fallback to common countries
      return this.getFallbackCountries();
    }
  }

  // Fallback country data when API is unavailable
  getFallbackCountries() {
    return [
      { name: 'United States', currency: 'USD', currencyName: 'US Dollar', symbol: '$' },
      { name: 'India', currency: 'INR', currencyName: 'Indian Rupee', symbol: '₹' },
      { name: 'United Kingdom', currency: 'GBP', currencyName: 'British Pound', symbol: '£' },
      { name: 'European Union', currency: 'EUR', currencyName: 'Euro', symbol: '€' },
      { name: 'Canada', currency: 'CAD', currencyName: 'Canadian Dollar', symbol: 'CA$' },
      { name: 'Australia', currency: 'AUD', currencyName: 'Australian Dollar', symbol: 'A$' },
      { name: 'Japan', currency: 'JPY', currencyName: 'Japanese Yen', symbol: '¥' },
      { name: 'China', currency: 'CNY', currencyName: 'Chinese Yuan', symbol: '¥' },
      { name: 'Singapore', currency: 'SGD', currencyName: 'Singapore Dollar', symbol: 'S$' },
      { name: 'Switzerland', currency: 'CHF', currencyName: 'Swiss Franc', symbol: 'CHF' }
    ];
  }

  // Get exchange rates for a base currency
  async getExchangeRates(baseCurrency = 'USD') {
    try {
      const response = await axios.get(`${this.exchangeRateAPI}/${baseCurrency}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      throw new Error('Failed to fetch exchange rates');
    }
  }

  // Convert amount from one currency to another
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return { amount, exchangeRate: 1 };
      }

      // Check if we have recent rates in database
      const currency = await Currency.findOne({ 
        code: fromCurrency,
        'exchangeRates.lastUpdated': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours
      });

      if (currency && currency.exchangeRates.rates.has(toCurrency)) {
        const rate = currency.exchangeRates.rates.get(toCurrency);
        return { 
          amount: amount * rate, 
          exchangeRate: rate 
        };
      }

      // Fetch fresh rates
      const rates = await this.getExchangeRates(fromCurrency);
      const rate = rates.rates[toCurrency];

      if (!rate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      // Update database with fresh rates
      await this.updateCurrencyRates(fromCurrency, rates.rates);

      return { 
        amount: amount * rate, 
        exchangeRate: rate 
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      throw new Error('Failed to convert currency');
    }
  }

  // Update currency rates in database
  async updateCurrencyRates(baseCurrency, rates) {
    try {
      await Currency.findOneAndUpdate(
        { code: baseCurrency },
        {
          $set: {
            'exchangeRates.rates': rates,
            'exchangeRates.lastUpdated': new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error updating currency rates:', error);
    }
  }

  // Get currency by code
  async getCurrencyByCode(code) {
    try {
      return await Currency.findOne({ code: code.toUpperCase(), isActive: true });
    } catch (error) {
      console.error('Error fetching currency:', error);
      throw new Error('Failed to fetch currency');
    }
  }

  // Create or update currency
  async createOrUpdateCurrency(currencyData) {
    try {
      return await Currency.findOneAndUpdate(
        { code: currencyData.code },
        currencyData,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error creating/updating currency:', error);
      throw new Error('Failed to create/update currency');
    }
  }

  // Get all active currencies
  async getAllActiveCurrencies() {
    try {
      return await Currency.find({ isActive: true }).sort({ code: 1 });
    } catch (error) {
      console.error('Error fetching currencies:', error);
      throw new Error('Failed to fetch currencies');
    }
  }
}

module.exports = new CurrencyService();
