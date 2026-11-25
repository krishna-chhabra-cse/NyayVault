import path from 'path';

// Supported MIME types and file extensions for Legal & Evidence Documents
export const ALLOWED_MIME_TYPES = new Set([
  // Documents & Legal filings
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  // Images & Scans
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  'image/gif',
  // Media / CCTV / Audio recordings
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
]);

export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
  '.gif',
  '.mp4',
  '.mov',
  '.mp3',
  '.wav',
]);

const DEFAULT_MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800', 10); // 50MB

/**
 * Validates uploaded file properties before storage.
 * @param {Object} file - Multer file object
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateEvidenceFile(file) {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  // Check file buffer presence and non-empty
  if (!file.buffer || file.buffer.length === 0) {
    return { isValid: false, error: 'Uploaded file is empty (0 bytes).' };
  }

  // Check file size
  if (file.size > DEFAULT_MAX_SIZE || file.buffer.length > DEFAULT_MAX_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds the maximum permitted limit of ${Math.round(DEFAULT_MAX_SIZE / (1024 * 1024))} MB.`,
    };
  }

  // Sanitize and check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `Unsupported file extension "${ext}". Allowed types: PDF, DOC/DOCX, TXT, CSV, JPG, PNG, TIFF, MP4, MP3, WAV.`,
    };
  }

  // Check MIME type if provided
  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    // If mime type is generic octet-stream, rely on validated extension
    if (file.mimetype !== 'application/octet-stream') {
      return {
        isValid: false,
        error: `Invalid MIME type "${file.mimetype}".`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Sanitizes filename to prevent directory traversal or invalid characters.
 * @param {string} originalname
 * @returns {string} Safe filename
 */
export function sanitizeFilename(originalname) {
  if (!originalname) return 'unnamed_evidence';
  // Strip path traversal sequences and keep alphanumeric, dots, underscores, dashes
  const base = path.basename(originalname);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  validateEvidenceFile,
  sanitizeFilename,
};
