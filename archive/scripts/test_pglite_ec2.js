import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

async function main() {
  const dataDir = '/home/ubuntu/data/pglite';
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Testing clean PGlite startup at:', dataDir);

  try {
    const db = new PGlite(dataDir);
    await db.query('SELECT 1 as test');
    console.log('✅ Standard PGlite works!');
    
    const schemaSql = fs.readFileSync('/home/ubuntu/server/src/db/schema.sql', 'utf8');
    await db.exec(schemaSql);
    console.log('✅ schema.sql executed successfully!');

    const res = await db.query('SELECT badge_number, full_name FROM users');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('❌ PGlite Error:', err);
    process.exit(1);
  }
}

main();
