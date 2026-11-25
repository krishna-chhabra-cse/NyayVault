import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export const AuditActions = {
  CASE_CREATED: 'CASE_CREATED',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
  DOCUMENT_INTEGRITY_VERIFIED: 'DOCUMENT_INTEGRITY_VERIFIED',
  DOCUMENT_INTEGRITY_FAILED: 'DOCUMENT_INTEGRITY_FAILED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  DOCUMENT_REDACTED: 'DOCUMENT_REDACTED',
  DOCUMENT_SIGNED: 'DOCUMENT_SIGNED',
};

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function canonicalJson(obj) {
  if (obj === null || obj === undefined) return '{}';
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch (e) {
      return JSON.stringify(obj);
    }
  }
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `"${k}":${canonicalJson(obj[k])}`).join(',')}}`;
}

export function computeBlockHash({ previousHash, id, userId, caseId, documentId, action, timestamp, metadata }) {
  const metaStr = canonicalJson(metadata);
  const tsStr = timestamp instanceof Date ? timestamp.toISOString() : String(timestamp || '');
  const payload = `${previousHash}:${id}:${userId || ''}:${caseId || ''}:${documentId || ''}:${action}:${tsStr}:${metaStr}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Records an immutable chain-of-custody audit log entry with SHA-256 Blockchain Hash Chaining.
 */
export async function logAuditEvent({
  userId = null,
  caseId = null,
  documentId = null,
  action,
  ipAddress = '127.0.0.1',
  metadata = {},
}) {
  const id = `aud-${uuidv4()}`;
  const timestamp = new Date().toISOString();

  // Get previous block hash for chain linking.
  // NOTE: There is a potential race condition under high concurrency: two concurrent
  // calls can read the same previousHash before either has inserted, causing a fork
  // in the chain. For production hardening, use a DB advisory lock (pg_advisory_lock)
  // or serialize writes through a queue. For this demo, sequential writes are assumed.
  let previousHash = GENESIS_HASH;
  try {
    const prevRes = await query(
      'SELECT block_hash FROM audit_logs WHERE block_hash IS NOT NULL ORDER BY timestamp DESC, id DESC LIMIT 1'
    );
    if (prevRes.rows.length > 0 && prevRes.rows[0].block_hash) {
      previousHash = prevRes.rows[0].block_hash;
    }
  } catch (err) {
    console.warn('Could not fetch previous audit hash, defaulting to genesis hash:', err.message);
  }

  // Calculate cryptographic block hash
  const blockHash = computeBlockHash({
    previousHash,
    id,
    userId,
    caseId,
    documentId,
    action,
    timestamp,
    metadata,
  });

  const sql = `
    INSERT INTO audit_logs (id, user_id, case_id, document_id, action, timestamp, ip_address, metadata, previous_hash, block_hash)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, user_id, case_id, document_id, action, timestamp, ip_address, metadata, previous_hash, block_hash;
  `;

  const params = [
    id,
    userId,
    caseId,
    documentId,
    action,
    timestamp,
    ipAddress,
    JSON.stringify(metadata),
    previousHash,
    blockHash,
  ];

  try {
    const res = await query(sql, params);
    return res.rows[0];
  } catch (err) {
    console.error('CRITICAL: Failed to write audit log:', err);
    throw err;
  }
}

/**
 * Verifies the full cryptographic hash-chain integrity of the audit ledger.
 */
export async function verifyAuditChain(caseId = null) {
  let sql = `
    SELECT id, user_id, case_id, document_id, action, timestamp, ip_address, metadata, previous_hash, block_hash
    FROM audit_logs
    WHERE block_hash IS NOT NULL
  `;
  const params = [];
  if (caseId) {
    sql += ` AND case_id = $1`;
    params.push(caseId);
  }
  sql += ` ORDER BY timestamp ASC, id ASC;`;

  const res = await query(sql, params);
  const logs = res.rows;

  if (logs.length === 0) {
    return {
      isIntact: true,
      totalBlocks: 0,
      verifiedAt: new Date().toISOString(),
      merkleRoot: GENESIS_HASH,
      brokenAtId: null,
      message: 'Audit ledger is empty; genesis state active.',
    };
  }

  let isIntact = true;
  let brokenAtId = null;
  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    // For first log or standalone chain verification
    if (i === 0 && log.previous_hash) {
      expectedPrevHash = log.previous_hash;
    }

    // Recompute block hash
    const computedHash = computeBlockHash({
      previousHash: log.previous_hash || expectedPrevHash,
      id: log.id,
      userId: log.user_id,
      caseId: log.case_id,
      documentId: log.document_id,
      action: log.action,
      timestamp: log.timestamp,
      metadata: log.metadata,
    });

    if (log.block_hash && log.block_hash !== computedHash) {
      isIntact = false;
      brokenAtId = log.id;
      break;
    }

    if (i > 0 && log.previous_hash !== expectedPrevHash) {
      isIntact = false;
      brokenAtId = log.id;
      break;
    }

    expectedPrevHash = log.block_hash || computedHash;
  }

  const merkleRoot = logs[logs.length - 1].block_hash || expectedPrevHash;

  return {
    isIntact,
    totalBlocks: logs.length,
    verifiedAt: new Date().toISOString(),
    merkleRoot,
    brokenAtId,
    message: isIntact
      ? `Audit Ledger Hash Chain Intact across ${logs.length} blocks.`
      : `Tampering detected in audit block ${brokenAtId}`,
  };
}

/**
 * Retrieves full audit trail for a case with block hashes.
 */
export async function getCaseAuditLogs(caseId) {
  if (!caseId) return [];
  const idStr = String(caseId).trim();
  const normalizedHyphen = idStr.replace(/_/g, '-');
  const normalizedUnderscore = idStr.replace(/-/g, '_');

  const sql = `
    SELECT 
      a.id,
      a.user_id,
      u.full_name as user_name,
      u.badge_number,
      u.role as user_role,
      u.department,
      a.case_id,
      a.document_id,
      d.filename as document_name,
      a.action,
      a.timestamp,
      a.ip_address,
      a.metadata,
      a.previous_hash,
      a.block_hash
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN documents d ON a.document_id = d.id
    WHERE a.case_id = $1 OR a.case_id = $2 OR a.case_id = $3
    ORDER BY a.timestamp DESC;
  `;

  const res = await query(sql, [idStr, normalizedHyphen, normalizedUnderscore]);
  return res.rows;
}

/**
 * Retrieves audit trail for a specific document.
 */
export async function getDocumentAuditLogs(documentId) {
  const sql = `
    SELECT 
      a.id,
      a.user_id,
      u.full_name as user_name,
      u.badge_number,
      u.role as user_role,
      u.department,
      a.case_id,
      a.document_id,
      a.action,
      a.timestamp,
      a.ip_address,
      a.metadata,
      a.previous_hash,
      a.block_hash
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.document_id = $1
    ORDER BY a.timestamp DESC;
  `;

  const res = await query(sql, [documentId]);
  return res.rows;
}

export async function rechainAuditLogs() {
  try {
    const res = await query('SELECT id, user_id, case_id, document_id, action, timestamp, ip_address, metadata FROM audit_logs ORDER BY timestamp ASC, id ASC');
    let prevHash = GENESIS_HASH;
    for (const log of res.rows) {
      const blockHash = computeBlockHash({
        previousHash: prevHash,
        id: log.id,
        userId: log.user_id,
        caseId: log.case_id,
        documentId: log.document_id,
        action: log.action,
        timestamp: log.timestamp,
        metadata: log.metadata,
      });
      await query('UPDATE audit_logs SET previous_hash = $1, block_hash = $2 WHERE id = $3', [prevHash, blockHash, log.id]);
      prevHash = blockHash;
    }
  } catch (err) {
    console.warn('Could not rechain legacy audit logs:', err.message);
  }
}

export default {
  AuditActions,
  logAuditEvent,
  verifyAuditChain,
  rechainAuditLogs,
  getCaseAuditLogs,
  getDocumentAuditLogs,
};
