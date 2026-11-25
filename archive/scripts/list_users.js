import db from './server/src/config/db.js';
await db.initDatabase();
const res = await db.query('SELECT badge_number, full_name, role FROM users');
console.table(res.rows);
process.exit(0);
