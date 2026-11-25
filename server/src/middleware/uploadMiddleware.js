import multer from 'multer';
import { ALLOWED_MIME_TYPES } from '../utils/validator.js';

// 500MB max size for video demo purposes.
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '524288000', 10);

// Use in-memory buffer storage to immediately compute SHA-256 hash before disk/s3 write
const storage = multer.memoryStorage();

export const uploadSingleEvidence = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Derive allowed types from the single source of truth in validator.js
    const normalizedMime = file.mimetype.toLowerCase();
    if (ALLOWED_MIME_TYPES.has(normalizedMime)) {
      cb(null, true);
    } else {
      const error = new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: PDF, Images (JPEG/PNG/TIFF/WebP/GIF), Text, CSV, Word, MP4, MOV, MP3, WAV.`
      );
      error.statusCode = 400;
      cb(error);
    }
  }
}).single('file');

export default {
  uploadSingleEvidence,
};
