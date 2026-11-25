import db from './server/src/config/db.js';
await db.initDatabase();

try {
  const caseRes = await db.query("SELECT id FROM cases WHERE case_number = 'CASE NO 1'");
  if (caseRes.rows.length > 0) {
    const caseId = caseRes.rows[0].id;
    console.log('Found CASE NO 1 with ID:', caseId);
    
    await db.query("DELETE FROM audit_logs WHERE case_id = $1", [caseId]);
    await db.query("DELETE FROM document_chunks WHERE case_id = $1", [caseId]);
    await db.query("DELETE FROM documents WHERE case_id = $1", [caseId]);
    await db.query("DELETE FROM complaints WHERE case_id = $1", [caseId]);
    await db.query("DELETE FROM case_assignments WHERE case_id = $1", [caseId]);
    const res = await db.query("DELETE FROM cases WHERE id = $1", [caseId]);
    
    console.log('Deleted rows:', res.rowCount);
  } else {
    console.log('CASE NO 1 not found');
  }
} catch (err) {
  console.error(err);
}
process.exit(0);
