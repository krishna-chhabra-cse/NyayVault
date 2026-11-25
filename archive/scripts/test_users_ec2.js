import { PGlite } from '@electric-sql/pglite';

async function main() {
  const db = new PGlite('/home/ubuntu/data/pglite');
  const res = await db.query('SELECT badge_number FROM users');
  console.log(res.rows.length, 'users found');
  console.log(res.rows.map(r => r.badge_number).join(', '));
  process.exit(0);
}
main();
