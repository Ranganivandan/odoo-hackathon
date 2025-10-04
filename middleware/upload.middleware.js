const multer = require('multer');

/**
 * Multer configuration for handling file uploads
 * Files are stored in memory and then uploaded to Cloudinary
 */

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to accept only images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

/**
 * Middleware to handle single file upload
 */
const uploadSingle = upload.single('receipt');

/**
 * Middleware to handle multiple file uploads
 */
const uploadMultiple = upload.array('receipts', 5); // Max 5 files

/**
 * Error handling middleware for multer
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
    });
  }

  next();
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
};
