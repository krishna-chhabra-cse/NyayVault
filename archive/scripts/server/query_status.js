import db from './src/config/db.js';
async function run() {
  await db.initDatabase();
  const res = await db.query("SELECT id, filename, status FROM documents LIMIT 5");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
