/**
 * OCR Validator Service
 * Validates OCR results and provides regex-based fallback parsing
 */
class OCRValidatorService {
  /**
   * Validate OCR result
   * @param {Object} ocrResult - OCR extraction result
   * @returns {Object} - Validation result with errors
   */
  validate(ocrResult) {
    const errors = [];
    const warnings = [];

    // Validate amount
    if (typeof ocrResult.amount !== 'number' || isNaN(ocrResult.amount)) {
      errors.push('Invalid amount: must be a valid number');
    } else if (ocrResult.amount <= 0) {
      warnings.push('Amount is zero or negative');
    } else if (ocrResult.amount > 1000000) {
      warnings.push('Amount seems unusually high');
    }

    // Validate currency
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY'];
    if (!ocrResult.currency || !validCurrencies.includes(ocrResult.currency.toUpperCase())) {
      warnings.push(`Currency "${ocrResult.currency}" may not be valid ISO code`);
    }

    // Validate date
    if (!(ocrResult.date instanceof Date) || isNaN(ocrResult.date.getTime())) {
      errors.push('Invalid date format');
    } else {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      if (ocrResult.date < oneYearAgo) {
        warnings.push('Date is more than 1 year old');
      } else if (ocrResult.date > oneMonthFuture) {
        warnings.push('Date is in the future');
      }
    }

    // Validate merchant
    if (!ocrResult.merchant || ocrResult.merchant.trim().length === 0) {
      warnings.push('Merchant name is empty');
    }

    // Validate confidence
    if (ocrResult.confidence < 0.5) {
      warnings.push('Low confidence score - results may be inaccurate');
    }

    // Validate category
    const validCategories = [
      'Transportation',
      'Meals & Entertainment',
      'Accommodation',
      'Office Supplies',
      'Travel',
      'Other'
    ];
    if (!validCategories.includes(ocrResult.category)) {
      ocrResult.category = 'Other';
      warnings.push('Category not recognized, defaulted to "Other"');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: ocrResult.confidence,
    };
  }

  /**
   * Fallback regex-based parser for raw OCR text
   * Used when Gemini API fails or returns invalid data
   * @param {string} rawText - Raw OCR text
   * @returns {Object} - Parsed data
   */
  parseWithRegex(rawText) {
    console.log('🔄 Using regex fallback parser...');

    const result = {
      merchant: null,
      amount: null,
      currency: 'USD',
      date: null,
      category: 'Other',
      confidence: 0.3, // Low confidence for regex parsing
      rawText: rawText,
    };

    try {
      // Extract amount (various formats)
      const amountPatterns = [
        /total[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /amount[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /\$\s*(\d+[.,]\d{2})/,
        /(\d+[.,]\d{2})\s*(?:USD|EUR|GBP|INR)/i,
        /grand\s+total[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /invoice\s+total[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /net\s+total[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /subtotal[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /balance[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /due[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /amount\s+due[:\s]*\$?\s*(\d+[.,]\d{2})/i,
        /(\d+[.,]\d{2})\s*$/m, // Amount at end of line
        /(\d+[.,]\d{2})\s*(?:total|amount|sum)/i,
      ];

      for (const pattern of amountPatterns) {
        const match = rawText.match(pattern);
        if (match) {
          result.amount = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }

      // Extract currency
      const currencyMatch = rawText.match(/\b(USD|EUR|GBP|INR|CAD|AUD|JPY|CNY)\b/i);
      if (currencyMatch) {
        result.currency = currencyMatch[1].toUpperCase();
      } else if (rawText.includes('$')) {
        result.currency = 'USD';
      } else if (rawText.includes('€')) {
        result.currency = 'EUR';
      } else if (rawText.includes('£')) {
        result.currency = 'GBP';
      } else if (rawText.includes('₹')) {
        result.currency = 'INR';
      }

      // Extract date (various formats)
      const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
      ];

      for (const pattern of datePatterns) {
        const match = rawText.match(pattern);
        if (match) {
          try {
            result.date = new Date(match[0]);
            if (!isNaN(result.date.getTime())) {
              break;
            }
          } catch (e) {
            // Continue to next pattern
          }
        }
      }

      // If no date found, use current date
      if (!result.date) {
        result.date = new Date();
      }

      // Extract merchant (first line or company name patterns)
      const merchantPatterns = [
        /^([A-Z][A-Za-z\s&'-]+)(?:\n|$)/m,
        /([A-Z][A-Za-z\s&'-]{3,30})\s+(?:Inc|LLC|Ltd|Corp|Co\.)/i,
        /^([A-Z][A-Za-z\s&'-]{2,50})/m, // First line starting with capital
        /([A-Z][A-Za-z\s&'-]{3,50})\s+(?:Company|Services|Group|Solutions)/i,
        /^([A-Z][A-Za-z\s&'-]+)\s*$/m, // Single line with capital letters
      ];

      for (const pattern of merchantPatterns) {
        const match = rawText.match(pattern);
        if (match) {
          result.merchant = match[1].trim();
          break;
        }
      }

      // If no merchant found, use first non-empty line
      if (!result.merchant) {
        const lines = rawText.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0) {
          result.merchant = lines[0].trim().substring(0, 50);
        }
      }

      // Guess category based on keywords
      result.category = this.guessCategory(rawText);

      console.log('✅ Regex parsing completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Regex parsing failed:', error.message);
      return {
        merchant: 'Unknown',
        amount: 0,
        currency: 'USD',
        date: new Date(),
        category: 'Other',
        confidence: 0.1,
        rawText: rawText,
      };
    }
  }

  /**
   * Guess expense category from text
   * @param {string} text - Receipt text
   * @returns {string} - Category name
   */
  guessCategory(text) {
    const lowerText = text.toLowerCase();

    const categoryKeywords = {
      'Transportation': ['uber', 'lyft', 'taxi', 'cab', 'metro', 'bus', 'train', 'parking', 'fuel', 'gas station'],
      'Meals & Entertainment': ['restaurant', 'cafe', 'coffee', 'bar', 'food', 'dining', 'lunch', 'dinner', 'breakfast'],
      'Accommodation': ['hotel', 'motel', 'inn', 'resort', 'airbnb', 'lodging', 'accommodation'],
      'Office Supplies': ['staples', 'office depot', 'supplies', 'printer', 'paper', 'pen', 'desk'],
      'Travel': ['airline', 'flight', 'airport', 'travel', 'booking', 'reservation'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return category;
        }
      }
    }

    return 'Other';
  }

  /**
   * Sanitize and normalize OCR result
   * @param {Object} ocrResult - Raw OCR result
   * @returns {Object} - Sanitized result
   */
  sanitize(ocrResult) {
    return {
      merchant: (ocrResult.merchant || 'Unknown').trim().substring(0, 100),
      amount: Math.abs(parseFloat(ocrResult.amount) || 0),
      currency: (ocrResult.currency || 'USD').toUpperCase().substring(0, 3),
      date: ocrResult.date instanceof Date ? ocrResult.date : new Date(),
      category: ocrResult.category || 'Other',
      lineItems: Array.isArray(ocrResult.lineItems) ? ocrResult.lineItems : [],
      taxAmount: Math.abs(parseFloat(ocrResult.taxAmount) || 0),
      tipAmount: Math.abs(parseFloat(ocrResult.tipAmount) || 0),
      confidence: Math.max(0, Math.min(1, parseFloat(ocrResult.confidence) || 0)),
      rawText: (ocrResult.rawText || '').substring(0, 5000),
    };
  }
}

// Export singleton instance
module.exports = new OCRValidatorService();
