/**
 * Sets documents.uploaded_at for the demo case to each document's real-world date (from the
 * generator manifest), so the case timeline reads 14 Oct -> 20 Nov instead of "all today".
 * The hash-chained audit ledger is NOT touched: it keeps the true ingestion times.
 *
 *   node scripts/backdate_demo_case.js <caseId> <manifest.json>
 */
import '../src/config/env.js';
import fs from 'fs';
import { initDatabase, query } from '../src/config/db.js';

const [caseId, manifestPath] = process.argv.slice(2);
if (!caseId || !manifestPath) { console.error('usage: backdate_demo_case.js <caseId> <manifest.json>'); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

await initDatabase();
let n = 0;
for (const m of manifest) {
  const r = await query('UPDATE documents SET uploaded_at = $1 WHERE case_id = $2 AND filename = $3', [m.date, caseId, m.filename]);
  n += r.rowCount;
}
await query("UPDATE cases SET created_at = '2026-10-14T22:35:00+05:30', status = 'TRIAL_SCHEDULED' WHERE id = $1", [caseId]);
await query("UPDATE case_assignments SET assigned_at = '2026-11-20T11:00:00+05:30' WHERE case_id = $1", [caseId]);
console.log(`backdated ${n} documents; case set to TRIAL_SCHEDULED`);
process.exit(0);
