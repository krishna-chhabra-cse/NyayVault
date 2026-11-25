import db from './server/src/config/db.js';

async function migrate() {
  await db.initDatabase();
  console.log('Applying database migrations...');
  await db.query("ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_redacted BOOLEAN DEFAULT FALSE;");
  await db.query("ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id VARCHAR(64) REFERENCES documents(id);");
  await db.query("ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_category VARCHAR(50) DEFAULT 'GENERAL';");
  await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);");
  await db.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'INVESTIGATION';");
  
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

  console.log('✅ Migration applied successfully on database!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
