import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';

async function main() {
  try {
    const db = new PGlite('/home/ubuntu/data/pglite');
    
    // Hash 'sih2026'
    const password = 'sih2026';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log(`New hash for sih2026: ${hash}`);
    
    // Update all users just to be 100% sure!
    await db.query(`UPDATE users SET password_hash = $1`, [hash]);
    console.log('Updated all users with the correct sih2026 password hash!');
    
    const res = await db.query('SELECT badge_number, password_hash FROM users');
    console.log(res.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
