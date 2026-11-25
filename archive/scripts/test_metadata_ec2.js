import { PGlite } from '@electric-sql/pglite';
async function main() {
  const db = new PGlite('/home/ubuntu/data/pglite');
  const res = await db.query('SELECT filename, mime_type, document_type, classification_confidence, metadata, extracted_text FROM documents LIMIT 5');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
main();
