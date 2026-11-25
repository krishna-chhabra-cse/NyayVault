-- Schema for NyayVault: Cloud-Native Digital Evidence Vault
-- Database: PostgreSQL + pgvector (self-managed on AWS EC2)

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users Table (Law Enforcement & Judiciary Personnel)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    badge_number VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '$2b$10$osOkaD8YSsEe660f4WbXGuxX7i8Lk.u4BooqfX7wzKd5npyOhBjSu',
    email VARCHAR(255),
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '$2b$10$osOkaD8YSsEe660f4WbXGuxX7i8Lk.u4BooqfX7wzKd5npyOhBjSu';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Cases Table
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(64) PRIMARY KEY,
    case_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    security_level VARCHAR(50) DEFAULT 'RESTRICTED',
    status VARCHAR(50) DEFAULT 'INVESTIGATION',
    created_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'INVESTIGATION';

-- 3. Documents / Evidence Table
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
    filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    status VARCHAR(50) DEFAULT 'uploaded',
    document_type VARCHAR(100) DEFAULT 'UNKNOWN',
    document_category VARCHAR(50) DEFAULT 'GENERAL',
    classification_confidence NUMERIC(4,3),
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_redacted BOOLEAN DEFAULT FALSE,
    parent_document_id VARCHAR(64) REFERENCES documents(id),
    uploaded_by VARCHAR(64) NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.5 Semantic Search Chunks Table
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    case_id VARCHAR(64) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    text_content TEXT NOT NULL,
    embedding vector(1536)
);

-- 4. Audit Trail / Chain of Custody Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    case_id VARCHAR(64),
    document_id VARCHAR(64),
    action VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    metadata JSONB DEFAULT '{}'::jsonb,
    previous_hash VARCHAR(64) DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    block_hash VARCHAR(64)
);

-- 5. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    complainant_name VARCHAR(200) NOT NULL,
    complainant_father_name VARCHAR(200),
    complainant_contact VARCHAR(100),
    complainant_address TEXT,
    complaint_text TEXT NOT NULL,
    complaint_document_id VARCHAR(64) REFERENCES documents(id) ON DELETE SET NULL,
    fir_document_id VARCHAR(64) REFERENCES documents(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    io_remarks TEXT,
    rejection_reason TEXT,
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_assignments (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    assigned_role VARCHAR(50),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(case_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_badge ON users(badge_number);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_complaints_case_id ON complaints(case_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_user ON case_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON documents(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_document_chunks_case_id ON document_chunks(case_id);

-- Case Assignments for RBAC access control
CREATE TABLE IF NOT EXISTS case_assignments (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    assigned_role VARCHAR(50),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(case_id, user_id)
);

-- Seed Initial System Actors (Judiciary, Police, Forensics, Lawyers, Registrar)
INSERT INTO users (id, badge_number, full_name, role, department)
VALUES 
    ('usr-pol-042', 'POL-78219', 'Insp. Rajesh Sharma', 'INVESTIGATING_OFFICER', 'Special Crime Branch'),
    ('usr-for-108', 'FOR-33104', 'Dr. Anita Desai', 'FORENSIC_EXAMINER', 'Central Forensic Science Laboratory'),
    ('usr-jud-007', 'JUD-99201', 'Hon. Magistrate S. Iyer', 'JUDICIAL_OFFICER', 'District & Sessions Court'),
    ('usr-reg-001', 'REG-55001', 'Sh. R.K. Mishra', 'REGISTRAR', 'Faridabad District Court'),
    ('usr-law-001', 'LAW-11001', 'Adv. Priya Kapoor', 'LAWYER_PROSECUTION', 'State Prosecution'),
    ('usr-law-002', 'LAW-22001', 'Adv. Vikram Singh', 'LAWYER_DEFENSE', 'Defense Counsel'),
    ('usr-pol-001', 'POL-1', 'Insp. Krishna Chhabra', 'INVESTIGATING_OFFICER', 'Cyber Crime Branch'),
    ('usr-jud-001', 'JUD-1', 'Hon. Justice Vatsal Singh', 'JUDICIAL_OFFICER', 'Faridabad District Court'),
    ('usr-1787866191848', 'ADV-1', 'Adv. Vikram Singh', 'LAWYER_DEFENSE', 'Faridabad District Court'),
    ('usr-1787866298750', 'ADV-2', 'Adv. Priya Kapoor', 'LAWYER_PROSECUTION', 'State Prosecutor'),
    ('usr-1787866796708', 'REG-1', 'Registrar Amit Kumar', 'REGISTRAR', 'Faridabad Court Registry')
ON CONFLICT (id) DO NOTHING;


-- Rotate legacy demo password hash to the current demo password (idempotent)
UPDATE users SET password_hash = '$2b$10$osOkaD8YSsEe660f4WbXGuxX7i8Lk.u4BooqfX7wzKd5npyOhBjSu'
WHERE password_hash = '$2b$10$f8VERr328ja8qQly0fuVsuLeCCToaD8.V6wBIhx.QLkfQGWgg.jES';
