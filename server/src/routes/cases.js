import express from 'express';
import { createCase, listCases, getCaseById, updateCaseStatus, assignCaseActors, getCaseAssignments } from '../services/caseService.js';
import { uploadDocument, getDocumentsByCase, getDocumentsWithText } from '../services/documentService.js';
import { getCaseAuditLogs } from '../services/auditService.js';
import { semanticSearch } from '../services/searchService.js';
import { generateRagResponse, generateCaseSummary, findContradictions } from '../services/aiService.js';
import { uploadSingleEvidence } from '../middleware/uploadMiddleware.js';
import { logAuditEvent } from '../services/auditService.js';
import { requireRole } from '../middleware/roleMiddleware.js';

import { sendEvidenceUploadNotification } from '../services/notificationService.js';

const router = express.Router();

/**
 * GET /api/cases
 * Returns all active investigation cases.
 */
router.get('/', async (req, res, next) => {
  try {
    const cases = await listCases(req.user);
    res.json({
      success: true,
      count: cases.length,
      cases,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases
 * Creates a new case docket. Strictly restricted to Police IO and Court Registrar.
 */
router.post('/', requireRole(['INVESTIGATING_OFFICER', 'REGISTRAR', 'COURT_REGISTRAR', 'ADMIN']), async (req, res, next) => {
  try {
    const { caseNumber, title, description, securityLevel } = req.body;
    const ipAddress = req.ip || req.socket?.remoteAddress;

    const newCase = await createCase({
      caseNumber,
      title,
      description,
      securityLevel,
      createdBy: req.user?.id,
      ipAddress,
    });

    res.status(201).json({
      success: true,
      message: 'Case created successfully',
      case: newCase,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:caseId
 * Returns single case details.
 */
router.get('/:caseId', async (req, res, next) => {
  try {
    const caseItem = await getCaseById(req.params.caseId);
    res.json({
      success: true,
      case: caseItem,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:caseId/documents
 * Lists all documents attached to a case.
 */
router.get('/:caseId/documents', async (req, res, next) => {
  try {
    const documents = await getDocumentsByCase(req.params.caseId, req.user);
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
 * POST /api/cases/:caseId/documents
 * Securely uploads a document, computes SHA-256 hash, stores in MinIO, and creates DB + Audit record.
 */
router.post('/:caseId/documents', requireRole(['INVESTIGATING_OFFICER', 'FORENSIC_EXAMINER', 'JUDICIAL_OFFICER', 'REGISTRAR', 'LAWYER_PROSECUTION', 'LAWYER_DEFENSE']), uploadSingleEvidence, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please attach a file under key "file".',
      });
    }

    const ipAddress = req.ip || req.socket?.remoteAddress;
    const document = await uploadDocument({
      caseId: req.params.caseId,
      file: req.file,
      user: req.user,
      ipAddress,
      isMedical: req.body.isMedical === 'true' || req.body.isMedical === true,
      transcript: typeof req.body.transcript === 'string' ? req.body.transcript.slice(0, 20000) : null,
    });

    // Fire and forget email notification
    getCaseById(req.params.caseId).then(caseDetails => {
      sendEvidenceUploadNotification({
        caseId: req.params.caseId,
        caseNumber: caseDetails.case_number,
        caseTitle: caseDetails.title,
        uploaderName: req.user.full_name,
        uploaderBadge: req.user.badge_number,
        filename: document.filename,
        documentType: document.document_category
      }).catch(e => console.error("Notification trigger failed:", e));
    }).catch(e => console.error("Could not fetch case for notification:", e));

    res.status(201).json({
      success: true,
      message: 'Evidence document uploaded, hashed, and stored successfully.',
      document,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:caseId/audit-trail
 * Retrieves the full chain-of-custody log for a case.
 */
router.get('/:caseId/audit-trail', async (req, res, next) => {
  try {
    const logs = await getCaseAuditLogs(req.params.caseId);
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
 * GET /api/cases/:caseId/search
 * Semantic Vector Search across documents in a case.
 */
router.get('/:caseId/search', async (req, res, next) => {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 5;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required.' });
    }
    
    const results = await semanticSearch(req.params.caseId, query, limit);
    res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:caseId/chat
 * Generates an AI response based on semantic case evidence retrieval (RAG)
 */
router.post('/:caseId/chat', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Retrieve relevant evidence chunks using the semantic search service
    const relevantChunks = await semanticSearch(req.params.caseId, message, 5);

    // 2. Generate RAG response
    const aiResponse = await generateRagResponse(message, relevantChunks);

    // 3. Log the interaction in the audit trail for accountability
    await logAuditEvent({
      userId: req.user.id,
      caseId: req.params.caseId,
      action: 'AI_RAG_ASSISTANT_QUERY',
      metadata: { query: message }
    });

    res.json({
      success: true,
      response: aiResponse,
      sources: relevantChunks.map(c => ({
        id: c.id,
        document_id: c.document_id,
        filename: c.filename,
        text_snippet: c.text_content.substring(0, 100) + '...'
      }))
    });
  } catch (err) {
    next(err);
  }
});


router.post('/:caseId/summary', async (req, res, next) => {
  try {
    const caseDetails = await getCaseById(req.params.caseId);
    const documents = await getDocumentsWithText(req.params.caseId);
    
    if (!documents || documents.length === 0) {
      return res.status(400).json({ error: 'No documents available in this case to summarize.' });
    }

    const summary = await generateCaseSummary(caseDetails.title, caseDetails.case_number, documents);

    await logAuditEvent({
      userId: req.user.id,
      caseId: req.params.caseId,
      action: 'AI_CASE_SUMMARY_GENERATED',
      metadata: { documentCount: documents.length }
    });

    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:caseId/contradictions
 * Finds contradictions among documents using AI.
 */
router.get('/:caseId/contradictions', async (req, res, next) => {
  try {
    const documents = await getDocumentsWithText(req.params.caseId);
    
    if (!documents || documents.length < 2) {
      return res.json({ success: true, contradictions: [] });
    }

    const contradictions = await findContradictions(documents);

    await logAuditEvent({
      userId: req.user.id,
      caseId: req.params.caseId,
      action: 'AI_CONTRADICTION_ANALYSIS_RUN',
      metadata: { documentCount: documents.length, contradictionCount: contradictions.length }
    });

    res.json({ success: true, contradictions });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/cases/:caseId/status
 * Updates the workflow status of a case.
 */
router.patch('/:caseId/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const ipAddress = req.ip || req.socket?.remoteAddress;
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const updatedCase = await updateCaseStatus(req.params.caseId, status, req.user, ipAddress);
    res.json({ success: true, case: updatedCase });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cases/:caseId/assignments
 * Returns all assigned personnel for a case.
 */
router.get('/:caseId/assignments', async (req, res, next) => {
  try {
    const assignments = await getCaseAssignments(req.params.caseId);
    res.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cases/:caseId/assignments
 * Allocates Judicial Officer, Public Prosecutor, and Defense Counsel (Court Registrar authority).
 */
router.post('/:caseId/assignments', async (req, res, next) => {
  try {
    const { judgeId, prosecutorId, defenseId, hearingDate, notes } = req.body;
    const ipAddress = req.ip || req.socket?.remoteAddress;

    const updatedCase = await assignCaseActors({
      caseId: req.params.caseId,
      judgeId,
      prosecutorId,
      defenseId,
      hearingDate,
      notes,
      allocatedBy: req.user?.id,
      ipAddress,
    });

    res.json({
      success: true,
      message: 'Case bench and legal counsels successfully allocated.',
      case: updatedCase,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
