import db from './server/src/config/db.js';
await db.initDatabase();
try {
  const res = await db.query("SELECT id, filename FROM documents WHERE filename LIKE '%11_Final_Court_Judgment%'");
  if (res.rows.length > 0) {
    for (const row of res.rows) {
      const docId = row.id;
      console.log('Deleting document:', docId, '(', row.filename, ')');
      await db.query("DELETE FROM audit_logs WHERE document_id = $1", [docId]);
      await db.query("DELETE FROM document_chunks WHERE document_id = $1", [docId]);
      await db.query("DELETE FROM documents WHERE id = $1", [docId]);
    }
    console.log('Successfully deleted the document(s) from the database.');
  } else {
    console.log('Document not found in database.');
  }
} catch (e) {
  console.error(e);
}
process.exit(0);
