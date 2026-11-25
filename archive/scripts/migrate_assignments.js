import db from './server/src/config/db.js';
await db.initDatabase();
await db.query(`
  CREATE TABLE IF NOT EXISTS case_assignments (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    assigned_role VARCHAR(50),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(case_id, user_id)
  );
`);
console.log('case_assignments table created.');
process.exit(0);
