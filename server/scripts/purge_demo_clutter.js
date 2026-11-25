/**
 * Removes clutter from the demo data (run on EC2 from ~/server):
 *   node scripts/purge_demo_clutter.js            -> dry run
 *   node scripts/purge_demo_clutter.js --apply    -> delete
 * Deletes the listed cases/documents from PostgreSQL and S3. Audit-ledger rows are kept
 * (the hash chain must stay intact) and a *_PURGED event is appended for each removal.
 */
import '../src/config/env.js';
import { initDatabase, query } from '../src/config/db.js';
import { initStorage, deleteObject } from '../src/storage/s3Client.js';
import { logAuditEvent } from '../src/services/auditService.js';

const APPLY = process.argv.includes('--apply');
const CASE_TITLES_TO_DELETE = ['tyyy'];
const JUNK_FILENAMES = [
  'bday_song.mp3',
  'DAA_LAB1_DARSHAN_SHAKYA_AI4.docx',
  'Screenshot_2026-09-18_174115.png',
  'Sec_63_BSA_Screenshot_2026-09-18_174115.png.pdf',
  'IMG-20260921-WA0004.jpg',
  'suspect1.jpg',
  'suspect2.jpg',
  'murder_video.mp4',
];

await initDatabase();
await initStorage();

async function purgeDocument(doc, reason) {
  const children = await query('SELECT id, filename, storage_key, case_id FROM documents WHERE parent_document_id = $1', [doc.id]);
  for (const child of children.rows) await purgeDocument(child, `child of ${doc.id}`);
  console.log(`  DOC  ${doc.id}  ${doc.filename}  (${reason})`);
  if (!APPLY) return;
  if (doc.storage_key && !doc.storage_key.startsWith('ipfs://')) {
    await deleteObject({ key: doc.storage_key }).catch(e => console.warn(`    S3 delete failed: ${e.message}`));
  }
  await query('DELETE FROM documents WHERE id = $1', [doc.id]);
  await logAuditEvent({ caseId: doc.case_id, documentId: doc.id, action: 'DOCUMENT_PURGED', metadata: { filename: doc.filename, reason: `Demo data cleanup: ${reason}` } });
}

// 1. Junk documents (any case)
const junk = await query('SELECT id, filename, storage_key, case_id FROM documents WHERE filename = ANY($1) AND parent_document_id IS NULL', [JUNK_FILENAMES]);
console.log(`Junk documents: ${junk.rows.length}`);
for (const d of junk.rows) await purgeDocument(d, 'test upload');

// 2. Whole cases
for (const title of CASE_TITLES_TO_DELETE) {
  const cases = await query('SELECT id, case_number, title FROM cases WHERE case_number = $1 OR title = $1', [title]);
  for (const c of cases.rows) {
    const docs = await query('SELECT id, filename, storage_key, case_id FROM documents WHERE case_id = $1 AND parent_document_id IS NULL', [c.id]);
    console.log(`CASE ${c.id}  "${c.case_number}" / "${c.title}"  with ${docs.rows.length} documents`);
    for (const d of docs.rows) await purgeDocument(d, `case ${c.case_number} removed`);
    if (APPLY) {
      await query('DELETE FROM complaints WHERE case_id = $1', [c.id]);
      await query('DELETE FROM case_assignments WHERE case_id = $1', [c.id]);
      await query('DELETE FROM cases WHERE id = $1', [c.id]);
      await logAuditEvent({ caseId: c.id, action: 'CASE_PURGED', metadata: { caseNumber: c.case_number, title: c.title, reason: 'Demo data cleanup' } });
    }
  }
}

console.log(APPLY ? '\nApplied.' : '\nDry run only. Re-run with --apply to delete.');
process.exit(0);
