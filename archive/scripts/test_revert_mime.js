import { PGlite } from '@electric-sql/pglite';
async function main() {
  const db = new PGlite('/home/ubuntu/data/pglite');
  await db.query(`UPDATE documents SET mime_type = 'image/png'`);
  console.log('Reverted db to image/png');
  process.exit(0);
}
main();
