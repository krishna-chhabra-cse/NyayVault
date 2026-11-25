import db from './server/src/config/db.js';
await db.initDatabase();
try {
  const res = await db.query("SELECT id, filename FROM documents WHERE filename LIKE '%09_Final_Court_Judgment%'");
  if (res.rows.length > 0) {
    const docId = res.rows[0].id;
    console.log('Deleting document:', docId);
    await db.query("DELETE FROM audit_logs WHERE document_id = $1", [docId]);
    await db.query("DELETE FROM document_chunks WHERE document_id = $1", [docId]);
    await db.query("DELETE FROM documents WHERE id = $1", [docId]);
    console.log('Successfully deleted the document from the database.');
  } else {
    console.log('Document not found in database.');
  }
} catch (e) {
  console.error(e);
}
process.exit(0);
