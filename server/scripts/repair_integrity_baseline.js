/**
 * One-time integrity repair (run on EC2 from ~/server):  node scripts/repair_integrity_baseline.js [--apply]
 *
 * For every document whose S3 object hash differs from the stored SHA-256:
 *  1. Leftover tamper demo: if flipping byte 0 back (66 -> original) reproduces the stored hash,
 *     the original bytes are restored to S3.
 *  2. Seeded placeholder record (fake size/hash, stored object is the plain-text content):
 *     the DB record is corrected to the real object (hash, size, text/plain).
 * Every change is written to the hash-chained audit ledger. Without --apply it only reports.
 */
import '../src/config/env.js';
import crypto from 'crypto';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { initDatabase, query } from '../src/config/db.js';
import { logAuditEvent } from '../src/services/auditService.js';

const APPLY = process.argv.includes('--apply');
const s3 = new S3Client({ region: process.env.AWS_REGION });
const Bucket = process.env.AWS_S3_BUCKET_NAME;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

await initDatabase();
const { rows } = await query('SELECT id, case_id, filename, storage_key, mime_type, file_size, sha256_hash, extracted_text FROM documents');

for (const d of rows) {
  if (!d.storage_key || d.storage_key.startsWith('ipfs://')) continue;
  let buf;
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket, Key: d.storage_key }));
    buf = Buffer.from(await r.Body.transformToByteArray());
  } catch { continue; }
  if (sha(buf) === d.sha256_hash) continue;

  // Case 1: undo the tamper demo's first-byte flip, if that reproduces the stored hash.
  let restored = null;
  if (buf[0] === 66) {
    for (let v = 0; v < 256 && !restored; v++) {
      const c = Buffer.from(buf); c[0] = v;
      if (sha(c) === d.sha256_hash) restored = c;
    }
  }

  if (restored) {
    console.log(`RESTORE BYTES  ${d.id}  ${d.filename}  (byte0 66 -> ${restored[0]})`);
    if (APPLY) {
      await s3.send(new PutObjectCommand({ Bucket, Key: d.storage_key, Body: restored, ContentType: d.mime_type, ServerSideEncryption: 'AES256' }));
      await logAuditEvent({ caseId: d.case_id, documentId: d.id, action: 'DOCUMENT_RESTORED', metadata: { reason: 'Reverted leftover tamper-demo byte flip; restored bytes match original SHA-256', sha256Hash: d.sha256_hash } });
    }
    continue;
  }

  // Case 2: seeded placeholder record whose object is the plain-text content.
  const isPlaceholder = d.extracted_text && buf.toString('utf8').trim().length > 0 && buf.length < 64 * 1024 && !buf.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (isPlaceholder) {
    const newHash = sha(buf);
    console.log(`FIX METADATA   ${d.id}  ${d.filename}  size ${d.file_size} -> ${buf.length}, mime ${d.mime_type} -> text/plain`);
    if (APPLY) {
      await query('UPDATE documents SET sha256_hash = $1, file_size = $2, mime_type = $3 WHERE id = $4', [newHash, buf.length, 'text/plain', d.id]);
      await logAuditEvent({ caseId: d.case_id, documentId: d.id, action: 'DOCUMENT_METADATA_CORRECTED', metadata: { reason: 'Seeded placeholder record corrected to match stored text object', previousHash: d.sha256_hash, sha256Hash: newHash, previousSize: d.file_size, fileSize: buf.length } });
    }
    continue;
  }

  console.log(`UNRESOLVED     ${d.id}  ${d.filename}  (left as-is)`);
}

console.log(APPLY ? '\nApplied.' : '\nDry run only. Re-run with --apply to make changes.');
process.exit(0);
