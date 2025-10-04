const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

/**
 * Gemini OCR Service
 * Extracts structured data from receipt images using Google's Gemini API
 */
class GeminiOCRService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.maxRetries = parseInt(process.env.OCR_MAX_RETRIES) || 3;
    this.timeout = parseInt(process.env.OCR_TIMEOUT) || 30000;
    
    if (!this.apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not set - OCR will be disabled');
      this.isConfigured = false;
      return;
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.isConfigured = true;
    console.log('✅ Gemini OCR Service initialized');
  }

  /**
   * Extract receipt data from image URL
   * @param {string} imageUrl - Cloudinary URL or base64 image
   * @returns {Promise<OCRResult>}
   */
  async extractReceiptData(imageUrl) {
    if (!this.isConfigured) {
      throw new Error('Gemini API not configured');
    }

    try {
      console.log('🔍 Starting OCR extraction...');
      
      // Download image as base64
      const imageData = await this.downloadImageAsBase64(imageUrl);
      
      // Call Gemini API with retry logic
      const result = await this.callGeminiWithRetry(imageData);
      
      console.log('✅ OCR extraction successful');
      return result;
    } catch (error) {
      console.error('❌ Gemini OCR extraction failed:', error.message);
      throw error;
    }
  }

  /**
   * Download image from URL and convert to base64
   * @param {string} url - Image URL
   * @returns {Promise<{mimeType: string, data: string}>}
   */
  async downloadImageAsBase64(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.timeout,
      });

      const base64 = Buffer.from(response.data).toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';

      return {
        mimeType,
        data: base64,
      };
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Call Gemini API with retry logic
   * @param {Object} imageData - Base64 image data
   * @returns {Promise<OCRResult>}
   */
  async callGeminiWithRetry(imageData, retryCount = 0) {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      // Structured prompt for JSON output
      const prompt = this.buildStructuredPrompt();

      // Generate content with image
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const parsedData = this.parseGeminiResponse(text);
      
      return parsedData;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`⚠️  Retry ${retryCount + 1}/${this.maxRetries}...`);
        await this.sleep(1000 * (retryCount + 1)); // Exponential backoff
        return this.callGeminiWithRetry(imageData, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Build structured prompt for Gemini
   * @returns {string}
   */
  buildStructuredPrompt() {
    return `You are an expert OCR system for extracting data from receipts and invoices.

Analyze the provided receipt image and extract the following information in STRICT JSON format:

{
  "merchant": "Store or vendor name",
  "amount": 0.00,
  "currency": "USD",
  "date": "YYYY-MM-DD",
  "category": "One of: Transportation, Meals & Entertainment, Accommodation, Office Supplies, Travel, Other",
  "lineItems": [
    {
      "description": "Item name",
      "quantity": 1,
      "price": 0.00
    }
  ],
  "taxAmount": 0.00,
  "tipAmount": 0.00,
  "confidence": 0.95,
  "rawText": "Full text from receipt"
}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no explanations
2. If a field is not found, use null (not empty string)
3. amount must be a number (e.g., 45.99, not "$45.99")
4. currency must be ISO code (USD, EUR, GBP, INR, etc.)
5. date must be YYYY-MM-DD format
6. confidence is 0-1 (how confident you are in the extraction)
7. category must match one of the predefined categories
8. If receipt is unclear, set confidence < 0.7
9. Extract ALL visible text into rawText field
10. lineItems is optional, include if clearly visible

Extract the data now:`;
  }

  /**
   * Parse Gemini response and validate JSON
   * @param {string} text - Response text
   * @returns {OCRResult}
   */
  parseGeminiResponse(text) {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      // Parse JSON
      const data = JSON.parse(cleanText);

      // Validate required fields
      if (!data.merchant && !data.amount) {
        throw new Error('Missing required fields: merchant or amount');
      }

      // Normalize data
      return {
        merchant: data.merchant || 'Unknown Merchant',
        amount: parseFloat(data.amount) || 0,
        currency: data.currency || 'USD',
        date: data.date ? new Date(data.date) : new Date(),
        category: data.category || 'Other',
        lineItems: data.lineItems || [],
        taxAmount: parseFloat(data.taxAmount) || 0,
        tipAmount: parseFloat(data.tipAmount) || 0,
        confidence: parseFloat(data.confidence) || 0.5,
        rawText: data.rawText || '',
        extractedAt: new Date(),
      };
    } catch (error) {
      console.error('❌ Failed to parse Gemini response:', error.message);
      console.log('Raw response:', text);
      throw new Error('Invalid JSON response from Gemini');
    }
  }

  /**
   * Sleep utility for retry backoff
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if service is configured
   * @returns {boolean}
   */
  isAvailable() {
    return this.isConfigured;
  }
}

// Export singleton instance
module.exports = new GeminiOCRService();
