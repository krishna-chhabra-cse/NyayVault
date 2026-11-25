import express from 'express';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Maintenance endpoints (migrate, seed, user creation, cleanup) are restricted to:
 *  - requests from the EC2 host itself (e.g. `curl localhost:5000/...` over SSH), or
 *  - requests carrying the x-admin-key header matching ADMIN_API_KEY.
 */
function requireAdmin(req, res, next) {
  const remote = req.socket?.remoteAddress || '';
  const isLoopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote);
  const adminKey = process.env.ADMIN_API_KEY;
  const keyOk = adminKey && req.headers['x-admin-key'] === adminKey;
  if (isLoopback || keyOk) return next();
  return res.status(403).json({ error: 'Maintenance endpoint: admin access required.' });
}

// Integrity demo (tamper/restore) requires a logged-in user; everything else requires admin.
router.use((req, res, next) => {
  if (/^\/(tamper|restore)\//.test(req.path)) return authenticateUser(req, res, next);
  return requireAdmin(req, res, next);
});
router.get('/migrate', async (req, res) => {
  try {
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_redacted BOOLEAN DEFAULT FALSE;');
    await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id VARCHAR(64) REFERENCES documents(id);');
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);');
    await query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'INVESTIGATION';");
    res.json({ success: true, message: 'Migration applied!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/user', async (req, res) => {
  try {
    const { id, badge_number, full_name, role, department } = req.body;
    if (!badge_number || !full_name || !role || !department) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const userId = id || `usr-${Date.now()}`;
    await query(
      'INSERT INTO users (id, badge_number, full_name, role, department) VALUES ($1, $2, $3, $4, $5)',
      [userId, badge_number, full_name, role, department]
    );
    res.json({ success: true, message: `User ${badge_number} created successfully!`, userId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/seed-demo', async (req, res) => {
  try {
    const caseId = `case-${Date.now()}`;
    await query(`
      INSERT INTO cases (id, case_number, title, description, status, security_level, created_by, created_at)
      VALUES ($1, 'FIR-2026-9044', 'Cyber Fraud and Data Breach Investigation', 'Investigation into unauthorized access and data exfiltration from primary servers.', 'INVESTIGATION', 'High', 'usr-pol-001', CURRENT_TIMESTAMP)
    `, [caseId]);
    
    // Assign POL-1 and JUD-1
    await query(`
      INSERT INTO case_assignments (case_id, user_id, assigned_role, assigned_at)
      VALUES 
      ($1, 'usr-pol-001', 'LEAD_INVESTIGATOR', CURRENT_TIMESTAMP),
      ($1, 'usr-jud-001', 'PRESIDING_JUDGE', CURRENT_TIMESTAMP)
    `, [caseId]);

    res.json({ success: true, message: 'Demo case seeded successfully!', caseId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/assign', async (req, res) => {
  try {
    const { case_number, badge_number, assigned_role } = req.body;
    
    // Lookup case ID
    const caseRes = await query('SELECT id FROM cases WHERE case_number = $1', [case_number]);
    if (caseRes.rows.length === 0) return res.status(404).json({ error: 'Case not found' });
    const caseId = caseRes.rows[0].id;
    
    // Lookup user ID
    const userRes = await query('SELECT id FROM users WHERE badge_number = $1', [badge_number]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userRes.rows[0].id;
    
    await query(
      'INSERT INTO case_assignments (case_id, user_id, assigned_role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [caseId, userId, assigned_role]
    );
    res.json({ success: true, message: `Assigned user ${badge_number} to case ${case_number} successfully!` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


const backupKey = (docId) => `integrity-demo-backups/${docId}`;
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function readObject(getObjectStream, key) {
  const { stream } = await getObjectStream({ key });
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * POST /api/dev/tamper/:documentId
 * Integrity demo tool: Intentionally modifies 1 byte in storage blob
 * to demonstrate live red TAMPER_DETECTED warning badge in UI.
 */
router.post('/tamper/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const docRes = await query('SELECT * FROM documents WHERE id = $1', [documentId]);
    if (docRes.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    const doc = docRes.rows[0];

    const { getObjectStream, uploadObject, objectExists } = await import('../storage/s3Client.js');
    const originalBuffer = await readObject(getObjectStream, doc.storage_key);

    // Keep a durable copy of the authentic bytes in S3 so restore survives server restarts.
    if (sha256(originalBuffer) === doc.sha256_hash && !(await objectExists({ key: backupKey(doc.id) }))) {
      await uploadObject({ key: backupKey(doc.id), buffer: originalBuffer, contentType: doc.mime_type });
    }

    // Mutate 1 byte
    const tamperedBuffer = Buffer.from(originalBuffer);
    if (tamperedBuffer.length > 0) {
      tamperedBuffer[0] = tamperedBuffer[0] === 65 ? 66 : 65; // flip byte
    }

    await uploadObject({ key: doc.storage_key, buffer: tamperedBuffer, contentType: doc.mime_type });

    res.json({
      success: true,
      documentId: doc.id,
      isTampered: true,
      message: '1 byte altered in storage. Live Cryptographic Check will now flag TAMPER_DETECTED.',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/dev/restore/:documentId
 * Restores the authentic bytes from the S3 backup copy (verified against the stored SHA-256).
 * Never rewrites the stored hash: if no authentic copy exists, the document stays flagged.
 */
router.post('/restore/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const docRes = await query('SELECT * FROM documents WHERE id = $1', [documentId]);
    if (docRes.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    const doc = docRes.rows[0];

    const { getObjectStream, uploadObject, deleteObject, objectExists } = await import('../storage/s3Client.js');

    const current = await readObject(getObjectStream, doc.storage_key);
    if (sha256(current) === doc.sha256_hash) {
      return res.json({ success: true, documentId: doc.id, isTampered: false, message: 'Object already authentic.' });
    }

    if (!(await objectExists({ key: backupKey(doc.id) }))) {
      return res.status(409).json({ error: 'No authentic backup copy found; document remains flagged as tampered.' });
    }
    const backup = await readObject(getObjectStream, backupKey(doc.id));
    if (sha256(backup) !== doc.sha256_hash) {
      return res.status(409).json({ error: 'Backup copy does not match the original SHA-256; refusing to restore.' });
    }

    await uploadObject({ key: doc.storage_key, buffer: backup, contentType: doc.mime_type });
    await deleteObject({ key: backupKey(doc.id) });

    res.json({
      success: true,
      documentId: doc.id,
      isTampered: false,
      message: 'Storage object restored to authentic state. Live Check will now flag VERIFIED_AUTHENTIC.',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/clean-redacted-duplicates', async (req, res) => {
  try {
    const listRes = await query("SELECT id, filename, uploaded_at FROM documents WHERE filename LIKE '%REDACTED%' ORDER BY uploaded_at ASC");
    const docs = listRes.rows;
    const seen = new Map();
    const toDelete = [];

    for (let i = docs.length - 1; i >= 0; i--) {
      const doc = docs[i];
      if (seen.has(doc.filename)) {
        toDelete.push(doc.id);
      } else {
        seen.set(doc.filename, doc.id);
      }
    }

    for (const id of toDelete) {
      await query("DELETE FROM audit_logs WHERE document_id = $1", [id]);
      await query("DELETE FROM document_chunks WHERE document_id = $1", [id]);
      await query("DELETE FROM documents WHERE id = $1", [id]);
    }

    res.json({
      success: true,
      deletedCount: toDelete.length,
      deletedIds: toDelete,
      message: `Cleaned ${toDelete.length} duplicate redacted copies.`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

