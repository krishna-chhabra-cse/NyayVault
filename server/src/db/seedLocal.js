import { query, initDatabase } from '../config/db.js';

async function seed() {
  console.log('Seeding local database with cloud users and cases...');
  await initDatabase();

  // 1. Run migrations for new columns
  await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_redacted BOOLEAN DEFAULT FALSE;');
  await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id VARCHAR(64) REFERENCES documents(id);');
  await query('ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_category VARCHAR(50) DEFAULT \'GENERAL\';');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);');
  await query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'INVESTIGATION';");

  // 2. Create case_assignments table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS case_assignments (
      id SERIAL PRIMARY KEY,
      case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
      user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
      assigned_role VARCHAR(50),
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(case_id, user_id)
    );
  `);

  // 3. Insert Users
  const users = [
    { id: 'usr-pol-042', badge: 'POL-78219', name: 'Insp. Rajesh Sharma', role: 'INVESTIGATING_OFFICER', dept: 'Special Crime Branch' },
    { id: 'usr-for-108', badge: 'FOR-33104', name: 'Dr. Anita Desai', role: 'FORENSIC_EXAMINER', dept: 'Central Forensic Science Laboratory' },
    { id: 'usr-jud-007', badge: 'JUD-99201', name: 'Hon. Magistrate S. Iyer', role: 'JUDICIAL_OFFICER', dept: 'District & Sessions Court' },
    { id: 'usr-reg-001', badge: 'REG-55001', name: 'Sh. R.K. Mishra', role: 'REGISTRAR', dept: 'Faridabad District Court' },
    { id: 'usr-law-001', badge: 'LAW-11001', name: 'Adv. Priya Kapoor', role: 'LAWYER_PROSECUTION', dept: 'State Prosecution' },
    { id: 'usr-law-002', badge: 'LAW-22001', name: 'Adv. Vikram Singh', role: 'LAWYER_DEFENSE', dept: 'Defense Counsel' },
    { id: 'usr-pol-001', badge: 'POL-1', name: 'Insp. Krishna Chhabra', role: 'INVESTIGATING_OFFICER', dept: 'Cyber Crime Branch' },
    { id: 'usr-jud-001', badge: 'JUD-1', name: 'Hon. Justice Vatsal Singh', role: 'JUDICIAL_OFFICER', dept: 'Faridabad District Court' },
    { id: 'usr-1787866191848', badge: 'ADV-1', name: 'Adv. Vikram Singh', role: 'LAWYER_DEFENSE', dept: 'Faridabad District Court' },
    { id: 'usr-1787866298750', badge: 'ADV-2', name: 'Adv. Priya Kapoor', role: 'LAWYER_PROSECUTION', dept: 'State Prosecutor' },
    { id: 'usr-1787866796708', badge: 'REG-1', name: 'Registrar Amit Kumar', role: 'REGISTRAR', dept: 'Faridabad Court Registry' },
  ];

  const defaultHash = '$2b$10$osOkaD8YSsEe660f4WbXGuxX7i8Lk.u4BooqfX7wzKd5npyOhBjSu'; // nyay2026

  for (const u of users) {
    await query(`
      INSERT INTO users (id, badge_number, password_hash, full_name, role, department)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        badge_number = EXCLUDED.badge_number,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        department = EXCLUDED.department;
    `, [u.id, u.badge, defaultHash, u.name, u.role, u.dept]);
  }

  // 4. Insert Case CASE-1: STATE VS HARDIK
  await query(`
    INSERT INTO cases (id, case_number, title, description, security_level, created_by, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      case_number = EXCLUDED.case_number,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status;
  `, ['case-56fd49f6', 'CASE-1', 'STATE VS HARDIK', 'State vs Hardik cyber extortion & illegal tampering case.', 'RESTRICTED', 'usr-pol-001', 'INVESTIGATION']);

  // 5. Insert Case Assignments for STATE VS HARDIK
  const assignments = [
    { caseId: 'case-56fd49f6', userId: 'usr-jud-001', role: 'PRESIDING_JUDGE' },
    { caseId: 'case-56fd49f6', userId: 'usr-1787866191848', role: 'DEFENSE_COUNSEL' },
    { caseId: 'case-56fd49f6', userId: 'usr-1787866298750', role: 'PROSECUTOR' },
    { caseId: 'case-56fd49f6', userId: 'usr-1787866796708', role: 'COURT_REGISTRAR' },
  ];

  for (const a of assignments) {
    await query(`
      INSERT INTO case_assignments (case_id, user_id, assigned_role)
      VALUES ($1, $2, $3)
      ON CONFLICT (case_id, user_id) DO NOTHING;
    `, [a.caseId, a.userId, a.role]);
  }

  console.log('✅ Local database successfully seeded with POL-1, JUD-1, ADV-1, ADV-2, REG-1 and STATE VS HARDIK!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
