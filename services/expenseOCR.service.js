const geminiOCRService = require('./geminiOCR.service');
const cloudinaryService = require('./cloudinary.service');
const ocrValidatorService = require('./ocrValidator.service');
const mockOCRService = require('./mockOCR.service');
const NodeCache = require('node-cache');

/**
 * Expense OCR Service
 * Main orchestrator for OCR processing pipeline
 */
class ExpenseOCRService {
  constructor() {
    // Cache OCR results for 1 hour
    this.cache = new NodeCache({ 
      stdTTL: parseInt(process.env.OCR_CACHE_TTL) || 3600,
      checkperiod: 600 
    });
    
    console.log('✅ Expense OCR Service initialized');
  }

  /**
   * Process receipt image and extract expense data
   * @param {Buffer} fileBuffer - Receipt image buffer
   * @param {Object} fileInfo - File metadata (originalname, mimetype)
   * @returns {Promise<Object>} - Extracted expense data
   */
  async processReceipt(fileBuffer, fileInfo) {
    try {
      console.log('📄 Processing receipt:', fileInfo.originalname);

      // Step 1: Upload to Cloudinary
      const uploadResult = await this.uploadToCloudinary(fileBuffer, fileInfo);
      console.log('✅ Uploaded to Cloudinary:', uploadResult.url);

      // Step 2: Check cache
      const cacheKey = this.getCacheKey(uploadResult.publicId);
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        console.log('✅ Using cached OCR result');
        return {
          ...cachedResult,
          cloudinaryUrl: uploadResult.url,
          cloudinaryPublicId: uploadResult.publicId,
        };
      }

      // Step 3: Extract data with Gemini OCR
      let ocrResult;
      let usedFallback = false;

      try {
        if (geminiOCRService.isAvailable()) {
          ocrResult = await geminiOCRService.extractReceiptData(uploadResult.url);
        } else if (mockOCRService.isAvailable()) {
          console.log('🔄 Using Mock OCR service for testing...');
          ocrResult = await mockOCRService.extractReceiptData(uploadResult.url);
        } else {
          throw new Error('No OCR service available');
        }
      } catch (geminiError) {
        console.warn('⚠️  Gemini OCR failed, using fallback parser:', geminiError.message);
        console.warn('⚠️  Gemini Error Details:', {
          name: geminiError.name,
          message: geminiError.message,
          stack: geminiError.stack
        });
        
        // Fallback to regex parser - we need to extract text from the image first
        try {
          // Try to get raw text from the image for fallback parsing
          console.log('🔄 Attempting to extract raw text for fallback parsing...');
          const rawText = await this.extractRawTextFromImage(uploadResult.url);
          console.log('📄 Raw text extracted:', rawText.substring(0, 200) + '...');
          ocrResult = ocrValidatorService.parseWithRegex(rawText);
        } catch (fallbackError) {
          console.warn('⚠️  Fallback parsing also failed:', fallbackError.message);
          console.warn('⚠️  Fallback Error Details:', {
            name: fallbackError.name,
            message: fallbackError.message,
            stack: fallbackError.stack
          });
          
          // Create a minimal result
          ocrResult = {
            merchant: 'Unknown',
            amount: 0,
            currency: 'USD',
            date: new Date(),
            category: 'Other',
            confidence: 0.1,
            rawText: '',
          };
        }
        usedFallback = true;
      }

      // Step 4: Validate and sanitize
      const sanitizedResult = ocrValidatorService.sanitize(ocrResult);
      const validation = ocrValidatorService.validate(sanitizedResult);

      // Step 5: Build final result
      const finalResult = {
        ...sanitizedResult,
        cloudinaryUrl: uploadResult.url,
        cloudinaryPublicId: uploadResult.publicId,
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        metadata: {
          usedFallback,
          processedAt: new Date(),
          fileSize: uploadResult.bytes,
          fileFormat: uploadResult.format,
        },
      };

      // Step 6: Cache result
      this.cache.set(cacheKey, finalResult);

      console.log('✅ Receipt processing complete');
      return finalResult;
    } catch (error) {
      console.error('❌ Receipt processing failed:', error.message);
      throw new Error(`Failed to process receipt: ${error.message}`);
    }
  }

  /**
   * Upload file to Cloudinary
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} fileInfo - File metadata
   * @returns {Promise<Object>}
   */
  async uploadToCloudinary(fileBuffer, fileInfo) {
    if (!cloudinaryService.isAvailable()) {
      throw new Error('Cloudinary not configured');
    }

    const options = {
      folder: 'expense-receipts',
      public_id: `receipt_${Date.now()}`,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    };

    return await cloudinaryService.uploadFile(fileBuffer, options);
  }

  /**
   * Auto-fill expense form fields from OCR result
   * @param {Object} ocrResult - OCR extraction result
   * @returns {Object} - Expense form data
   */
  autoFillExpenseFields(ocrResult) {
    return {
      description: ocrResult.merchant || '',
      amount: ocrResult.amount || null,
      currency: ocrResult.currency || 'USD',
      expenseDate: ocrResult.date || new Date(),
      category: ocrResult.category || 'Other',
      receipt: {
        url: ocrResult.cloudinaryUrl,
        publicId: ocrResult.cloudinaryPublicId,
      },
      ocrData: {
        merchant: ocrResult.merchant,
        extractedAmount: ocrResult.amount,
        extractedCurrency: ocrResult.currency,
        extractedDate: ocrResult.date,
        lineItems: ocrResult.lineItems || [],
        taxAmount: ocrResult.taxAmount || 0,
        tipAmount: ocrResult.tipAmount || 0,
        confidence: ocrResult.confidence,
        rawText: ocrResult.rawText,
        validation: ocrResult.validation,
        usedFallback: ocrResult.metadata?.usedFallback || false,
        extractedAt: new Date(),
      },
    };
  }

  /**
   * Process receipt and return auto-filled expense data
   * @param {Buffer} fileBuffer - Receipt image buffer
   * @param {Object} fileInfo - File metadata
   * @returns {Promise<Object>} - Auto-filled expense data
   */
  async processAndAutoFill(fileBuffer, fileInfo) {
    const ocrResult = await this.processReceipt(fileBuffer, fileInfo);
    return this.autoFillExpenseFields(ocrResult);
  }

  /**
   * Extract raw text from image for fallback parsing
   * @param {string} imageUrl - Cloudinary image URL
   * @returns {Promise<string>} - Raw text content
   */
  async extractRawTextFromImage(imageUrl) {
    try {
      console.log('🔍 Extracting raw text from image:', imageUrl);
      
      // Use Gemini to extract just raw text (simpler prompt)
      const model = geminiOCRService.genAI?.getGenerativeModel({ 
        model: geminiOCRService.model || 'gemini-1.5-flash' 
      });
      
      if (!model) {
        throw new Error('Gemini model not available');
      }

      const imageData = await geminiOCRService.downloadImageAsBase64(imageUrl);
      console.log('📄 Image data downloaded, mimeType:', imageData.mimeType);
      
      const result = await model.generateContent([
        'Extract ALL text from this receipt/invoice image. Return only the raw text content, preserving line breaks and structure. Include all numbers, amounts, dates, and text you can see.',
        {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();
      console.log('📄 Raw text extracted length:', text.length);
      return text;
    } catch (error) {
      console.warn('⚠️  Raw text extraction failed:', error.message);
      console.warn('⚠️  Raw text extraction error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return '';
    }
  }

  /**
   * Get cache key for OCR result
   * @param {string} publicId - Cloudinary public ID
   * @returns {string}
   */
  getCacheKey(publicId) {
    return `ocr_${publicId}`;
  }

  /**
   * Clear cache for specific receipt
   * @param {string} publicId - Cloudinary public ID
   */
  clearCache(publicId) {
    const cacheKey = this.getCacheKey(publicId);
    this.cache.del(cacheKey);
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Check if OCR service is available
   * @returns {boolean}
   */
  isAvailable() {
    return (geminiOCRService.isAvailable() || mockOCRService.isAvailable()) && cloudinaryService.isAvailable();
  }

  /**
   * Get service status
   * @returns {Object}
   */
  getStatus() {
    return {
      geminiOCR: geminiOCRService.isAvailable(),
      cloudinary: cloudinaryService.isAvailable(),
      cache: this.getCacheStats(),
    };
  }
}

// Export singleton instance
module.exports = new ExpenseOCRService();
