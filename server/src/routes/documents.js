import express from 'express';
import {
  getDocumentById,
  verifyDocumentIntegrity,
  downloadDocument,
  applyRedactionsToDocument,
  listAllDocuments,
  checkDocumentAccess,
  GLOBAL_EVIDENCE_ROLES
} from '../services/documentService.js';
import { getDocumentAuditLogs } from '../services/auditService.js';
import { suggestRedactions } from '../services/aiService.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

/**
 * Middleware: Enforces that non-custodial roles can only access documents belonging to their assigned cases.
 */
const verifyDocAccess = async (req, res, next) => {
  try {
    const hasAccess = await checkDocumentAccess(req.params.documentId, req.user);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden: Access denied. Evidence exhibits are strictly restricted to assigned case dockets.',
        documentId: req.params.documentId
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents
 * Returns evidence documents. If user is Police, Judge, or Lawyer, results are strictly scoped to their assigned cases.
 * If ?scope=global is specified, non-custodians are rejected with 403.
 */
router.get('/', async (req, res, next) => {
  try {
    if (req.query.scope === 'global' && !GLOBAL_EVIDENCE_ROLES.includes(req.user?.role)) {
      return res.status(403).json({
        error: 'Forbidden: Global Evidence Vault is restricted to Court Registrars, Forensic Examiners, and Custodians. Access exhibits through your assigned cases.'
      });
    }

    const documents = await listAllDocuments(req.user);
    res.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:documentId
 * Returns metadata of a specific document (protected by case assignment check).
 */
router.get('/:documentId', verifyDocAccess, async (req, res, next) => {
  try {
    const document = await getDocumentById(req.params.documentId);
    res.json({
      success: true,
      document,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:documentId/verify
 * Live Cryptographic Integrity Check:
 * Reads raw bytes directly from MinIO, computes fresh SHA-256 hash, and compares with PostgreSQL record.
 */
router.get('/:documentId/verify', verifyDocAccess, async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const result = await verifyDocumentIntegrity(req.params.documentId, req.user, ipAddress);

    res.json({
      success: true,
      verification: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:documentId/download
 * Authorized evidence retrieval:
 * Streams file from MinIO object storage, logs chain of custody access.
 */
router.get('/:documentId/download', verifyDocAccess, async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const { stream, filename, contentType, contentLength, sha256Hash } =
      await downloadDocument(req.params.documentId, req.user, ipAddress);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Evidence-SHA256', sha256Hash);

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:documentId/audit-trail
 * Returns chain-of-custody audit logs for this specific document.
 */
router.get('/:documentId/audit-trail', verifyDocAccess, async (req, res, next) => {
  try {
    const logs = await getDocumentAuditLogs(req.params.documentId);
    res.json({
      success: true,
      count: logs.length,
      auditLogs: logs,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/:documentId/redact/suggest
 * Uses AI to suggest PII redactions for the document's extracted text.
 */
router.post('/:documentId/redact/suggest', verifyDocAccess, requireRole(['INVESTIGATING_OFFICER', 'FORENSIC_EXAMINER', 'ADMIN', 'SENIOR_OFFICER', 'REGISTRAR', 'JUDICIAL_OFFICER', 'LAWYER_PROSECUTION', 'LAWYER_DEFENSE']), async (req, res, next) => {
  try {
    const document = await getDocumentById(req.params.documentId);
    if (!document.extracted_text) {
      return res.status(400).json({ error: 'No extracted text available for this document to redact.' });
    }
    const suggestions = await suggestRedactions(document.extracted_text);
    res.json({ success: true, suggestions });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/:documentId/redact/apply
 * Applies approved redactions, creates a new redacted document in MinIO and Postgres, and logs audit events.
 */
router.post('/:documentId/redact/apply', verifyDocAccess, requireRole(['INVESTIGATING_OFFICER', 'FORENSIC_EXAMINER', 'ADMIN', 'SENIOR_OFFICER', 'REGISTRAR', 'JUDICIAL_OFFICER', 'LAWYER_PROSECUTION', 'LAWYER_DEFENSE']), async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const { redactions } = req.body;
    
    if (!Array.isArray(redactions) || redactions.length === 0) {
      return res.status(400).json({ error: 'Redactions array is required.' });
    }

    const newDocument = await applyRedactionsToDocument(req.params.documentId, redactions, req.user, ipAddress);
    
    res.json({ success: true, document: newDocument });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents/:documentId/sign
 * Digitally signs the evidence document exhibit using RSA-2048 / SHA-256 PKI signature.
 */
router.post('/:documentId/sign', verifyDocAccess, async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const { signExhibitDocument } = await import('../services/pkiService.js');
    const signatureMetadata = await signExhibitDocument(req.params.documentId, req.user, ipAddress);

    res.json({
      success: true,
      message: 'Exhibit successfully signed with RSA-2048 PKI Digital Signature.',
      signature: signatureMetadata,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:documentId/pki-certificate
 * Generates official Bharatiya Sakshya Adhiniyam (BSA 2023) Section 63 Electronic Evidence Certificate.
 */
router.get('/:documentId/pki-certificate', verifyDocAccess, async (req, res, next) => {
  try {
    const { generateBsaCertificate } = await import('../services/pkiService.js');
    const certificate = await generateBsaCertificate(req.params.documentId);
    res.json({
      success: true,
      certificate,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
