import db from './server/src/config/db.js';
await db.initDatabase();
const cases = await db.query('SELECT id, case_number, title FROM cases');
console.log('Cases:');
console.table(cases.rows);

const assignments = await db.query('SELECT case_id, user_id, assigned_role FROM case_assignments');
console.log('Assignments:');
console.table(assignments.rows);
process.exit(0);
