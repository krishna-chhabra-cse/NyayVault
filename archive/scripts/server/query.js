import db from './src/config/db.js';
async function run() {
  await db.initDatabase();
  const res = await db.query("SELECT id, filename, is_redacted FROM documents WHERE is_redacted = true OR filename LIKE '%REDACTED%'");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
