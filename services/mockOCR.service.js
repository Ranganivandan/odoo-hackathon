/**
 * Mock OCR Service
 * Provides basic OCR functionality without requiring external API keys
 * Useful for testing and development
 */

class MockOCRService {
  constructor() {
    console.log('✅ Mock OCR Service initialized');
  }

  /**
   * Mock OCR extraction - returns sample data
   * @param {string} imageUrl - Image URL (not used in mock)
   * @returns {Promise<Object>} - Mock OCR result
   */
  async extractReceiptData(imageUrl) {
    console.log('🔍 Mock OCR: Processing image...');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data
    return {
      merchant: 'Sample Store',
      amount: 25.99,
      currency: 'USD',
      date: new Date(),
      category: 'Meals & Entertainment',
      lineItems: [
        {
          description: 'Sample Item 1',
          quantity: 1,
          price: 15.99
        },
        {
          description: 'Sample Item 2',
          quantity: 1,
          price: 10.00
        }
      ],
      taxAmount: 2.60,
      tipAmount: 0,
      confidence: 0.85,
      rawText: `SAMPLE STORE
123 Main Street
City, State 12345

Date: ${new Date().toLocaleDateString()}
Invoice #: INV-001

Item 1                    $15.99
Item 2                    $10.00
Subtotal                  $25.99
Tax (10%)                 $2.60
Total                     $28.59

Thank you for your business!`,
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      },
      usedFallback: false,
      extractedAt: new Date()
    };
  }

  /**
   * Check if service is available
   * @returns {boolean}
   */
  isAvailable() {
    return true;
  }

  /**
   * Get service status
   * @returns {Object}
   */
  getStatus() {
    return {
      available: true,
      type: 'mock',
      features: ['basic_extraction', 'sample_data']
    };
  }
}

// Export singleton instance
module.exports = new MockOCRService();
