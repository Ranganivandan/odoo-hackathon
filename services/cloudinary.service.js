const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

/**
 * Cloudinary Service
 * Handles file uploads to Cloudinary
 */
class CloudinaryService {
  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️  Cloudinary not configured - file uploads will fail');
      this.isConfigured = false;
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.isConfigured = true;
    console.log('✅ Cloudinary Service initialized');
  }

  /**
   * Upload file to Cloudinary
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>}
   */
  async uploadFile(fileBuffer, options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const defaultOptions = {
        folder: 'expense-receipts',
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
        transformation: [
          { width: 1500, crop: 'limit' }, // Limit max width for cost optimization
          { quality: 'auto:good' },
        ],
      };

      const uploadOptions = { ...defaultOptions, ...options };

      // Upload using stream
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        // Convert buffer to stream and pipe to Cloudinary
        const readableStream = Readable.from(fileBuffer);
        readableStream.pipe(uploadStream);
      });

      console.log('✅ File uploaded to Cloudinary:', result.public_id);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        resourceType: result.resource_type,
      };
    } catch (error) {
      console.error('❌ Cloudinary upload failed:', error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload file from path
   * @param {string} filePath - Local file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>}
   */
  async uploadFromPath(filePath, options = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const defaultOptions = {
        folder: 'expense-receipts',
        resource_type: 'auto',
      };

      const result = await cloudinary.uploader.upload(filePath, {
        ...defaultOptions,
        ...options,
      });

      console.log('✅ File uploaded to Cloudinary:', result.public_id);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        resourceType: result.resource_type,
      };
    } catch (error) {
      console.error('❌ Cloudinary upload failed:', error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>}
   */
  async deleteFile(publicId) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log('✅ File deleted from Cloudinary:', publicId);
      return result;
    } catch (error) {
      console.error('❌ Cloudinary delete failed:', error.message);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get optimized URL for image
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} transformations - Transformation options
   * @returns {string}
   */
  getOptimizedUrl(publicId, transformations = {}) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary not configured');
    }

    const defaultTransformations = {
      width: 800,
      crop: 'limit',
      quality: 'auto:good',
      fetch_format: 'auto',
    };

    return cloudinary.url(publicId, {
      ...defaultTransformations,
      ...transformations,
      secure: true,
    });
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
module.exports = new CloudinaryService();
