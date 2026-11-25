import db from './server/src/config/db.js';
await db.initDatabase();
const res = await db.query("SELECT id FROM cases WHERE title ILIKE '%Victim Complaint%'");
console.log(res.rows[0].id);
process.exit(0);
