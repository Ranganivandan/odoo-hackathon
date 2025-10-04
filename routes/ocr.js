const express = require('express');
const { auth, isEmployee } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload.middleware');
const expenseOCRService = require('../services/expenseOCR.service');

const router = express.Router();

/**
 * Extract receipt data using Gemini OCR + Cloudinary
 * POST /api/ocr/extract-receipt
 * Uploads to Cloudinary, extracts data with Gemini, auto-fills expense fields
 */
router.post('/extract-receipt', auth, isEmployee, uploadSingle, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Receipt image is required'
      });
    }

    // Check if OCR service is available
    if (!expenseOCRService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'OCR service not configured. Please set GEMINI_API_KEY and Cloudinary credentials.',
      });
    }

    // Process receipt and get auto-filled expense data
    const result = await expenseOCRService.processAndAutoFill(
      req.file.buffer,
      {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      }
    );

    res.json({
      success: true,
      message: 'Receipt processed successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ OCR extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process receipt',
      error: error.message,
    });
  }
});

/**
 * Batch process multiple receipts
 * POST /api/ocr/batch-extract
 */
router.post('/batch-extract', auth, isEmployee, uploadMultiple, handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one receipt image is required'
      });
    }

    if (!expenseOCRService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'OCR service not configured',
      });
    }

    const results = [];
    
    // Process all receipts in parallel
    const promises = req.files.map(async (file) => {
      try {
        const result = await expenseOCRService.processAndAutoFill(
          file.buffer,
          {
            originalname: file.originalname,
            mimetype: file.mimetype,
          }
        );
        
        return {
          filename: file.originalname,
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          filename: file.originalname,
          success: false,
          error: error.message,
        };
      }
    });

    const processedResults = await Promise.all(promises);

    res.json({
      success: true,
      message: `Processed ${processedResults.length} receipts`,
      data: { results: processedResults },
    });
  } catch (error) {
    console.error('❌ Batch OCR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process receipts',
      error: error.message,
    });
  }
});

/**
 * Test OCR endpoint (no auth required for debugging)
 * POST /api/ocr/test
 */
router.post('/test', uploadSingle, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Receipt image is required'
      });
    }

    console.log('🧪 Test OCR endpoint called with file:', req.file.originalname);

    // Check if OCR service is available
    if (!expenseOCRService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'OCR service not configured. Please set GEMINI_API_KEY and Cloudinary credentials.',
      });
    }

    // Process receipt and get auto-filled expense data
    const result = await expenseOCRService.processAndAutoFill(
      req.file.buffer,
      {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      }
    );

    res.json({
      success: true,
      message: 'Receipt processed successfully (TEST MODE)',
      data: result,
    });
  } catch (error) {
    console.error('❌ Test OCR extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process receipt',
      error: error.message,
    });
  }
});

/**
 * Get OCR service status
 * GET /api/ocr/status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const status = expenseOCRService.getStatus();
    
    res.json({
      success: true,
      data: {
        ...status,
        supportedFormats: ['JPEG', 'PNG', 'PDF', 'WEBP'],
        maxFileSize: '10MB',
        features: {
          geminiOCR: status.geminiOCR,
          cloudinaryStorage: status.cloudinary,
          caching: true,
          regexFallback: true,
        },
      },
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check OCR service status',
      error: error.message,
    });
  }
});

/**
 * Clear OCR cache for a specific receipt
 * DELETE /api/ocr/cache/:publicId
 */
router.delete('/cache/:publicId', auth, isEmployee, async (req, res) => {
  try {
    expenseOCRService.clearCache(req.params.publicId);
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('❌ Cache clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message,
    });
  }
});

module.exports = router;
