const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  // Initialize Tesseract worker
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      this.worker = await Tesseract.createWorker();
      await this.worker.loadLanguage(process.env.TESSERACT_LANG || 'eng');
      await this.worker.initialize(process.env.TESSERACT_LANG || 'eng');
      this.isInitialized = true;
      console.log('OCR service initialized');
    } catch (error) {
      console.error('Error initializing OCR service:', error);
      throw new Error('Failed to initialize OCR service');
    }
  }

  // Process image and extract text
  async extractText(imagePath) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Preprocess image for better OCR results
      const processedImagePath = await this.preprocessImage(imagePath);
      
      const { data: { text, confidence } } = await this.worker.recognize(processedImagePath);
      
      return {
        text: text.trim(),
        confidence: confidence
      };
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  // Preprocess image for better OCR results
  async preprocessImage(imagePath) {
    try {
      const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.jpg');
      
      await sharp(imagePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .jpeg({ quality: 90 })
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      console.error('Error preprocessing image:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  // Extract structured data from receipt text
  extractReceiptData(text) {
    try {
      const data = {
        extractedText: text,
        extractedAmount: this.extractAmount(text),
        extractedDate: this.extractDate(text),
        extractedMerchant: this.extractMerchant(text),
        extractedCategory: this.extractCategory(text)
      };

      return data;
    } catch (error) {
      console.error('Error extracting receipt data:', error);
      return {
        extractedText: text,
        extractedAmount: null,
        extractedDate: null,
        extractedMerchant: null,
        extractedCategory: null
      };
    }
  }

  // Extract amount from text
  extractAmount(text) {
    const amountRegex = /(?:total|amount|sum|cost|price)[\s:]*\$?[\d,]+\.?\d*/gi;
    const currencyRegex = /\$?[\d,]+\.?\d*/g;
    
    const amountMatches = text.match(amountRegex);
    if (amountMatches) {
      const amounts = amountMatches[0].match(currencyRegex);
      if (amounts && amounts.length > 0) {
        return parseFloat(amounts[amounts.length - 1].replace(/[$,]/g, ''));
      }
    }
    
    // Fallback: look for any currency pattern
    const currencyMatches = text.match(currencyRegex);
    if (currencyMatches) {
      const amounts = currencyMatches.map(match => parseFloat(match.replace(/[$,]/g, '')));
      return Math.max(...amounts);
    }
    
    return null;
  }

  // Extract date from text
  extractDate(text) {
    const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g;
    const matches = text.match(dateRegex);
    
    if (matches) {
      const dateStr = matches[0];
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    return null;
  }

  // Extract merchant name from text
  extractMerchant(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Look for common merchant patterns
    const merchantPatterns = [
      /^[A-Z\s&]+$/,
      /restaurant/i,
      /cafe/i,
      /hotel/i,
      /store/i,
      /shop/i,
      /market/i
    ];
    
    for (const line of lines.slice(0, 5)) { // Check first 5 lines
      const trimmedLine = line.trim();
      if (trimmedLine.length > 3 && trimmedLine.length < 50) {
        for (const pattern of merchantPatterns) {
          if (pattern.test(trimmedLine)) {
            return trimmedLine;
          }
        }
      }
    }
    
    // Fallback: return first non-empty line
    return lines[0] || null;
  }

  // Extract category from text
  extractCategory(text) {
    const categoryKeywords = {
      'Meals & Entertainment': ['restaurant', 'cafe', 'food', 'dining', 'lunch', 'dinner', 'breakfast'],
      'Travel': ['hotel', 'flight', 'taxi', 'uber', 'lyft', 'airline', 'travel'],
      'Transportation': ['gas', 'fuel', 'parking', 'toll', 'metro', 'bus'],
      'Office Supplies': ['office', 'supplies', 'stationery', 'paper', 'pen'],
      'Communication': ['phone', 'internet', 'mobile', 'telecom'],
      'Utilities': ['electric', 'water', 'gas', 'utility', 'power'],
      'Other': []
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return category;
        }
      }
    }
    
    return 'Other';
  }

  // Cleanup worker
  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

module.exports = new OCRService();
