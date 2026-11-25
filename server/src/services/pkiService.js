import crypto from 'crypto';
import { query } from '../config/db.js';
import { logAuditEvent, AuditActions } from './auditService.js';

// In-memory keypair cache for fast demo signing per user badge.
// NOTE: This cache is NOT persistent across server restarts.
// If the server restarts, previously generated keys are lost and documents signed
// before the restart cannot be re-verified using this cache.
// For production use, keys must be stored securely in a database or HSM.
const keyPairCache = new Map();

/**
 * Gets or generates an RSA-2048 keypair for a user badge.
 */
export function getUserKeyPair(badgeNumber = 'POL-78219') {
  if (keyPairCache.has(badgeNumber)) {
    return keyPairCache.get(badgeNumber);
  }

  // Generate 2048-bit RSA keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const keyFingerprint = crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16);

  const pair = { publicKey, privateKey, keyFingerprint, badgeNumber };
  keyPairCache.set(badgeNumber, pair);
  return pair;
}

/**
 * Signs a document's SHA-256 hash using the officer's private RSA key.
 */
export function signDocumentHash(sha256Hash, privateKeyPem) {
  const sign = crypto.createSign('SHA256');
  sign.update(sha256Hash);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

/**
 * Verifies an RSA-SHA256 signature against the document's SHA-256 hash and public key.
 */
export function verifyDocumentSignature(sha256Hash, signatureBase64, publicKeyPem) {
  const verify = crypto.createVerify('SHA256');
  verify.update(sha256Hash);
  verify.end();
  return verify.verify(publicKeyPem, signatureBase64, 'base64');
}

/**
 * Digitally signs a document exhibit on behalf of an authenticated user.
 */
export async function signExhibitDocument(documentId, user, ipAddress = '127.0.0.1') {
  const docRes = await query('SELECT * FROM documents WHERE id = $1', [documentId]);
  if (docRes.rows.length === 0) {
    throw new Error(`Document not found with ID: ${documentId}`);
  }
  const doc = docRes.rows[0];

  const keyPair = getUserKeyPair(user.badge_number || 'OFFICER-DEFAULT');
  const signature = signDocumentHash(doc.sha256_hash, keyPair.privateKey);
  const signedAt = new Date().toISOString();

  const signatureMetadata = {
    signedBy: user.full_name,
    badgeNumber: user.badge_number,
    role: user.role,
    department: user.department,
    signature,
    publicKey: keyPair.publicKey,
    keyFingerprint: keyPair.keyFingerprint,
    signedAt,
    algorithm: 'RSA-2048 / SHA-256',
  };

  // Merge signature info into document metadata
  const updatedMetadata = {
    ...(doc.metadata || {}),
    pkiSignature: signatureMetadata,
  };

  await query('UPDATE documents SET metadata = $1 WHERE id = $2', [
    JSON.stringify(updatedMetadata),
    documentId,
  ]);

  // Log in Audit Trail
  await logAuditEvent({
    userId: user.id,
    caseId: doc.case_id,
    documentId: doc.id,
    action: AuditActions.DOCUMENT_SIGNED,
    ipAddress,
    metadata: {
      keyFingerprint: keyPair.keyFingerprint,
      algorithm: 'RSA-2048 / SHA-256',
      signaturePreview: signature.substring(0, 24) + '...',
    },
  });

  return signatureMetadata;
}

/**
 * Generates an official BSA Section 63 Electronic Evidence Certificate object.
 */
export async function generateBsaCertificate(documentId) {
  const sql = `
    SELECT 
      d.id as document_id, d.filename, d.file_size, d.mime_type, d.sha256_hash,
      d.uploaded_at, d.metadata, d.storage_key,
      c.case_number, c.title as case_title,
      u.full_name as uploader_name, u.badge_number as uploader_badge, u.role as uploader_role, u.department as uploader_dept
    FROM documents d
    JOIN cases c ON d.case_id = c.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = $1;
  `;

  const res = await query(sql, [documentId]);
  if (res.rows.length === 0) {
    throw new Error(`Document not found: ${documentId}`);
  }
  const item = res.rows[0];
  const pkiSig = item.metadata?.pkiSignature || null;

  const certificateId = `CERT-BSA-63-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const issuedAt = new Date().toISOString();

  return {
    certificateId,
    statute: 'Bharatiya Sakshya Adhiniyam (BSA), 2023 - Section 63',
    legalDeclaration: 'This electronic record was generated in the ordinary course of official duty and stored in a cryptographically secure, immutable digital vault without unauthorized access or corruption.',
    issuedAt,
    caseInfo: {
      caseNumber: item.case_number,
      title: item.case_title,
      jurisdiction: 'District & Sessions Court / High Court of Judicature',
    },
    evidenceExhibit: {
      documentId: item.document_id,
      filename: item.filename,
      fileSize: `${(Number(item.file_size) / 1024).toFixed(2)} KB`,
      sha256Hash: item.sha256_hash,
      storageKey: item.storage_key,
      uploadedAt: item.uploaded_at,
    },
    custodian: {
      name: item.uploader_name || 'Authorized Officer',
      badgeNumber: item.uploader_badge || 'POL-UNKNOWN',
      role: item.uploader_role || 'INVESTIGATING_OFFICER',
      department: item.uploader_dept || 'Law Enforcement',
    },
    pkiSignature: pkiSig || {
      status: 'SYSTEM_SEALED',
      note: 'Digitally Fingerprinted via SHA-256 Evidence Vault Seal.',
      keyFingerprint: crypto.createHash('sha256').update(item.sha256_hash).digest('hex').substring(0, 16),
      algorithm: 'SHA-256 Integrity Hash',
    },
  };
}

export default {
  getUserKeyPair,
  signDocumentHash,
  verifyDocumentSignature,
  signExhibitDocument,
  generateBsaCertificate,
};
