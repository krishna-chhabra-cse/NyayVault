import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { uploadObject, getObjectStream, deleteObject } from '../storage/s3Client.js';
import { calculateBufferHash, calculateStreamHash } from '../utils/hashUtils.js';
import { validateEvidenceFile, sanitizeFilename } from '../utils/validator.js';
import { logAuditEvent, AuditActions } from './auditService.js';
import { getCaseById } from './caseService.js';

/**
 * Uploads, cryptographically hashes, stores in MinIO, and records a document in PostgreSQL.
 * @param {Object} params
 * @param {string} params.caseId - Target case ID
 * @param {Object} params.file - Multer file object
 * @param {Object} params.user - Authenticated user context
 * @param {string} params.ipAddress - Client IP address
 * @returns {Promise<Object>} Created document record
 */
export async function uploadDocument({ caseId, file, user, ipAddress = '127.0.0.1' }) {
  // 1. Verify case exists and obtain canonical case ID
  const caseItem = await getCaseById(caseId);
  const canonicalCaseId = caseItem.id;

  // 2. Validate file integrity & format
  const validation = validateEvidenceFile(file);
  if (!validation.isValid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  // 3. Generate unique document ID and clean filename
  const documentId = `doc-${uuidv4().substring(0, 10)}`;
  const cleanFilename = sanitizeFilename(file.originalname);
  const storageKey = `cases/${canonicalCaseId}/documents/${documentId}/${cleanFilename}`;

  // 4. Calculate SHA-256 hash immediately on raw uploaded bytes
  const sha256Hash = calculateBufferHash(file.buffer);
  const fileSize = file.size || file.buffer.length;
  const mimeType = file.mimetype || 'application/octet-stream';
  const now = new Date().toISOString();
  const uploaderId = user?.id || 'usr-pol-042';

  // Auto-assign document category based on uploader role
  const ROLE_TO_CATEGORY = {
    'INVESTIGATING_OFFICER': 'INVESTIGATION',
    'FORENSIC_EXAMINER': 'INVESTIGATION',
    'JUDICIAL_OFFICER': 'JUDICIAL',
    'LAWYER_PROSECUTION': 'PROSECUTION',
    'LAWYER_DEFENSE': 'DEFENSE',
    'REGISTRAR': 'REGISTRAR',
  };
  const documentCategory = ROLE_TO_CATEGORY[user?.role] || 'GENERAL';

  // 5. Store file in MinIO Object Storage
  let uploadSuccess = false;
  try {
    await uploadObject({
      key: storageKey,
      buffer: file.buffer,
      contentType: mimeType,
    });
    uploadSuccess = true;
  } catch (storageErr) {
    console.error('Failed to upload file to MinIO:', storageErr);
    const error = new Error(`Object storage error: ${storageErr.message}`);
    error.statusCode = 500;
    throw error;
  }

  // 6. Insert document record into PostgreSQL (with rollback protection)
  try {
    const insertDocSql = `
      INSERT INTO documents (
        id, case_id, filename, storage_key, mime_type, file_size, 
        sha256_hash, status, uploaded_by, uploaded_at, document_category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const docRes = await query(insertDocSql, [
      documentId,
      canonicalCaseId,
      cleanFilename,
      storageKey,
      mimeType,
      fileSize,
      sha256Hash,
      'uploaded',
      uploaderId,
      now,
      documentCategory
    ]);

    const createdDoc = docRes.rows[0];

    // 7. Record Chain of Custody Audit Log
    await logAuditEvent({
      userId: uploaderId,
      caseId: canonicalCaseId,
      documentId,
      action: AuditActions.DOCUMENT_UPLOADED,
      ipAddress,
      metadata: {
        filename: cleanFilename,
        fileSize,
        mimeType,
        sha256Hash,
        storageKey,
      },
    });

    return createdDoc;
  } catch (dbErr) {
    // Rollback: Clean up uploaded object in MinIO to avoid orphaned evidence
    if (uploadSuccess) {
      console.warn(`Database insert failed. Rolling back MinIO object at ${storageKey}...`);
      await deleteObject({ key: storageKey });
    }
    console.error('Failed to create database document record:', dbErr);
    const error = new Error(`Database error: ${dbErr.message}`);
    error.statusCode = 500;
    throw error;
  }
}

/**
 * Retrieves all documents for a case.
 */
export async function getDocumentsByCase(caseId, user = null) {
  // Ensure case exists and obtain canonical case ID
  const caseItem = await getCaseById(caseId);

  let sql = `
    SELECT 
      d.id,
      d.case_id,
      d.filename,
      d.storage_key,
      d.mime_type,
      d.file_size,
      d.sha256_hash,
      d.status,
      d.document_type,
      d.document_category,
      d.classification_confidence,
      d.is_redacted,
      d.parent_document_id,
      d.uploaded_at,
      u.id as uploader_id,
      u.full_name as uploaded_by_name,
      u.badge_number as uploaded_by_badge,
      u.role as uploaded_by_role,
      u.department as uploaded_by_department
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.case_id = $1 AND d.is_redacted = FALSE AND d.filename NOT LIKE 'REDACTED_%'
  `;
  const params = [caseItem.id];
  if (user && user.role === 'INVESTIGATING_OFFICER') {
    sql += ` AND d.document_category = 'INVESTIGATION'`;
  }
  
  sql += ` ORDER BY d.uploaded_at DESC;`;

  const res = await query(sql, params);
  return res.rows;
}

/**
 * Retrieves a single document by ID.
 */
export async function getDocumentById(documentId) {
  const sql = `
    SELECT 
      d.id,
      d.case_id,
      d.filename,
      d.storage_key,
      d.mime_type,
      d.file_size,
      d.sha256_hash,
      d.status,
      d.document_type,
      d.document_category,
      d.classification_confidence,
      d.metadata,
      d.extracted_text,
      d.is_redacted,
      d.parent_document_id,
      d.uploaded_at,
      u.id as uploader_id,
      u.full_name as uploaded_by_name,
      u.badge_number as uploaded_by_badge,
      u.role as uploaded_by_role,
      u.department as uploaded_by_department,
      c.case_number,
      c.title as case_title
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    LEFT JOIN cases c ON d.case_id = c.id
    WHERE d.id = $1;
  `;

  const res = await query(sql, [documentId]);
  if (res.rows.length === 0) {
    const error = new Error(`Document not found with ID: ${documentId}`);
    error.statusCode = 404;
    throw error;
  }
  return res.rows[0];
}

/**
 * Verifies the live cryptographic integrity of a document against MinIO bytes.
 */
export async function verifyDocumentIntegrity(documentId, user, ipAddress = '127.0.0.1') {
  const doc = await getDocumentById(documentId);

  // Read object stream from MinIO
  const { stream } = await getObjectStream({ key: doc.storage_key });

  // Calculate live SHA-256 checksum from storage stream
  const computedHash = await calculateStreamHash(stream);
  const isMatch = computedHash.toLowerCase() === doc.sha256_hash.toLowerCase();

  const auditAction = isMatch
    ? AuditActions.DOCUMENT_INTEGRITY_VERIFIED
    : AuditActions.DOCUMENT_INTEGRITY_FAILED;

  // Log verification event in chain of custody
  await logAuditEvent({
    userId: user?.id || doc.uploader_id,
    caseId: doc.case_id,
    documentId: doc.id,
    action: auditAction,
    ipAddress,
    metadata: {
      filename: doc.filename,
      storedHash: doc.sha256_hash,
      computedHash,
      isTamperFree: isMatch,
    },
  });

  return {
    documentId: doc.id,
    filename: doc.filename,
    isTamperFree: isMatch,
    storedHash: doc.sha256_hash,
    computedHash,
    verifiedAt: new Date().toISOString(),
    status: isMatch ? 'VERIFIED_AUTHENTIC' : 'TAMPER_DETECTED',
  };
}

/**
 * Prepares an authorized document stream for download and records an audit log.
 */
export async function downloadDocument(documentId, user, ipAddress = '127.0.0.1') {
  const doc = await getDocumentById(documentId);

  const { stream, contentType, contentLength } = await getObjectStream({
    key: doc.storage_key,
  });

  // Log download action in chain of custody
  await logAuditEvent({
    userId: user?.id || 'usr-pol-042',
    caseId: doc.case_id,
    documentId: doc.id,
    action: AuditActions.DOCUMENT_DOWNLOADED,
    ipAddress,
    metadata: {
      filename: doc.filename,
      fileSize: doc.file_size,
      sha256Hash: doc.sha256_hash,
    },
  });

  return {
    stream,
    filename: doc.filename,
    contentType: doc.mime_type || contentType || 'application/octet-stream',
    contentLength: doc.file_size || contentLength,
    sha256Hash: doc.sha256_hash,
  };
}

export async function getDocumentsWithText(caseId) {
  await getCaseById(caseId);
  const sql = `
    SELECT 
      d.id, d.filename, d.document_type, d.document_category,
      d.extracted_text, d.uploaded_at,
      u.full_name as uploaded_by_name, u.role as uploaded_by_role
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.case_id = $1 AND d.is_redacted = FALSE AND d.filename NOT LIKE 'REDACTED_%'
    ORDER BY d.uploaded_at ASC;
  `;
  const res = await query(sql, [caseId]);
  return res.rows;
}

export default {
  uploadDocument,
  getDocumentsByCase,
  getDocumentById,
  verifyDocumentIntegrity,
  downloadDocument,
  getDocumentsWithText,
};
export async function applyRedactionsToDocument(documentId, redactions, user, ipAddress = '127.0.0.1') {
  // Fetch original
  const originalDoc = await getDocumentById(documentId);
  if (!originalDoc.extracted_text) throw new Error("No text to redact.");

  // Apply redactions
  let newText = originalDoc.extracted_text;
  for (const red of redactions) {
    if (!red || !red.exact_text) continue;
    // Escape string for regex
    const escaped = red.exact_text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    newText = newText.replace(regex, '[REDACTED]');
  }

  // Create new text file buffer
  const buffer = Buffer.from(newText, 'utf-8');
  
  // Calculate SHA-256 hash using tested utility
  const newHash = calculateBufferHash(buffer);

  // New storage key
  const newId = 'doc-redacted-' + (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36));
  const baseName = (originalDoc.filename || 'document').replace(/\.[^/.]+$/, '');
  const newFilename = `REDACTED_${baseName}.txt`;
  const newStorageKey = `cases/${originalDoc.case_id}/documents/${newId}/${newFilename}`;

  // Upload to MinIO / Local storage
  await uploadObject({ key: newStorageKey, buffer, contentType: 'text/plain' });

  // Verify user exists or fallback to original uploader to satisfy foreign key constraint
  let effectiveUserId = user?.id;
  if (effectiveUserId) {
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [effectiveUserId]);
    if (userCheck.rows.length === 0) {
      effectiveUserId = originalDoc.uploader_id || originalDoc.uploaded_by;
    }
  } else {
    effectiveUserId = originalDoc.uploader_id || originalDoc.uploaded_by;
  }

  // Audit Log: Record redacted copy generation referencing source evidence
  await logAuditEvent({
    userId: effectiveUserId,
    caseId: originalDoc.case_id,
    documentId: documentId,
    action: 'DOCUMENT_REDACTED',
    ipAddress,
    metadata: { 
      action_type: 'redacted_copy_generated',
      source_document_id: documentId,
      source_filename: originalDoc.filename,
      redacted_filename: newFilename,
      storage_key: newStorageKey,
      sha256_hash: newHash,
      file_size: buffer.length,
      redaction_count: redactions.length,
      timestamp: new Date().toISOString()
    }
  });

  // Return transient redacted artifact metadata without inserting a new evidence row
  return {
    id: newId,
    case_id: originalDoc.case_id,
    filename: newFilename,
    storage_key: newStorageKey,
    mime_type: 'text/plain',
    file_size: buffer.length,
    sha256_hash: newHash,
    status: 'VERIFIED_AUTHENTIC',
    document_type: originalDoc.document_type || 'EVIDENCE',
    document_category: originalDoc.document_category || 'INVESTIGATION',
    extracted_text: newText,
    is_redacted: true,
    is_redacted_copy: true,
    parent_document_id: documentId,
    original_filename: originalDoc.filename,
    redaction_count: redactions.length,
    generated_at: new Date().toISOString()
  };
}

export const GLOBAL_EVIDENCE_ROLES = [
  'REGISTRAR', 
  'COURT_REGISTRAR', 
  'FORENSIC_EXAMINER', 
  'FORENSIC', 
  'CUSTODIAN', 
  'ADMIN'
];

/**
 * Validates whether a user is authorized to inspect, download, or verify a document.
 * Global authorities have unrestricted access.
 * Case-restricted roles (Police, Judges, Defense/Prosecution Lawyers) are strictly confined to their assigned case dockets.
 */
export async function checkDocumentAccess(documentId, user) {
  if (!user) return false;
  if (GLOBAL_EVIDENCE_ROLES.includes(user.role)) return true;

  const sql = `
    SELECT 1 FROM documents d
    JOIN cases c ON d.case_id = c.id
    WHERE d.id = $1 AND (
      c.created_by = $2
      OR EXISTS (
        SELECT 1 FROM case_assignments ca 
        WHERE ca.case_id = d.case_id AND ca.user_id = $2
      )
    );
  `;
  const res = await query(sql, [documentId, user.id]);
  return res.rows.length > 0;
}

/**
 * Retrieves evidence documents.
 * For global roles (Registrar, Forensics, Custodian, Admin), returns all documents across the system.
 * For case-restricted roles (Police, Judges, Lawyers), returns ONLY documents belonging to cases they own or are assigned to.
 */
export async function listAllDocuments(user = null) {
  let sql = `
    SELECT 
      d.id,
      d.case_id,
      d.filename,
      d.storage_key,
      d.mime_type,
      d.file_size,
      d.sha256_hash,
      d.status,
      d.document_type,
      d.document_category,
      d.classification_confidence,
      d.is_redacted,
      d.parent_document_id,
      d.uploaded_at,
      u.id as uploader_id,
      u.full_name as uploaded_by_name,
      u.badge_number as uploaded_by_badge,
      u.role as uploaded_by_role,
      u.department as uploaded_by_department,
      c.case_number,
      c.title as case_title
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    LEFT JOIN cases c ON d.case_id = c.id
  `;
  const params = [];
  const conditions = ["d.is_redacted = FALSE AND d.filename NOT LIKE 'REDACTED_%'"];

  // Strict Judicial Boundary: Non-custodians only see documents from cases they own or are assigned to
  if (user && !GLOBAL_EVIDENCE_ROLES.includes(user.role)) {
    params.push(user.id);
    conditions.push(`(c.created_by = $${params.length} OR EXISTS (SELECT 1 FROM case_assignments ca WHERE ca.case_id = d.case_id AND ca.user_id = $${params.length}))`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  sql += ` ORDER BY d.uploaded_at DESC;`;

  const res = await query(sql, params);
  return res.rows;
}

