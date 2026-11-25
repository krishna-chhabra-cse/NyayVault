import { PGlite } from '@electric-sql/pglite';
async function main() {
  const db = new PGlite('/home/ubuntu/data/pglite');
  await db.query(`UPDATE documents SET mime_type = 'text/plain'`);
  console.log('Updated db');
  process.exit(0);
}
main();
