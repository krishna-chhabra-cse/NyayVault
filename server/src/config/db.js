import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let pool = null;
let pgliteInstance = null;
let isEmbeddedMode = false;

/**
 * Initializes the database connection.
 * Attempts to connect to native PostgreSQL first.
 * If PostgreSQL is unavailable, seamlessly falls back to embedded PGlite
 * so development and tests run immediately with zero friction.
 */
export async function initDatabase() {
  const schemaPath = path.resolve(__dirname, '../db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Try PostgreSQL connection
  // No hardcoded credentials: without DATABASE_URL we go straight to embedded PGlite.
  const connectionString = process.env.DATABASE_URL;

  try {
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    const testPool = new Pool({
      connectionString,
      connectionTimeoutMillis: 2000,
    });

    const client = await testPool.connect();
    console.log('Connected to PostgreSQL database:', connectionString.replace(/:[^:@]+@/, ':****@'));
    
    // Execute schema setup
    await client.query(schemaSql);
    client.release();
    
    pool = testPool;
    isEmbeddedMode = false;
    return;
  } catch (pgError) {
    console.warn(`Native PostgreSQL not reachable (${pgError.message}). Activating embedded PostgreSQL engine (PGlite)...`);
  }

  // Fallback to embedded PGlite engine
  try {
    let dataDir = path.resolve(__dirname, '../../../data/pglite');
    
    // Fix Windows path issues for PGlite by converting to file URI
    let pgliteDataUri = dataDir;
    if (process.platform === 'win32') {
      pgliteDataUri = 'file://' + dataDir.replace(/\\/g, '/');
    }

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const cleanLocks = () => {
      try {
        const pidFile = path.resolve(dataDir, 'postmaster.pid');
        if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
        const lockFile = path.resolve(dataDir, '.s.PGSQL.5432.lock.out');
        if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
      } catch (e) {
        console.warn('Could not remove stale lock files:', e.message);
      }
    };

    cleanLocks();
    
    let hasVector = false;
    try {
      try {
        const { vector } = await import('@electric-sql/pglite/vector');
        pgliteInstance = new PGlite(pgliteDataUri, { extensions: { vector } });
        await pgliteInstance.query('SELECT 1');
        hasVector = true;
      } catch (extErr) {
        console.warn('PGlite vector extension unavailable, using standard PGlite engine:', extErr.message);
        cleanLocks();
        pgliteInstance = new PGlite(pgliteDataUri);
        await pgliteInstance.query('SELECT 1');
      }
    } catch (pglErr) {
      console.warn('PGlite dataDir initialization error, using in-memory PGlite instance:', pglErr.message);
      cleanLocks();
      pgliteInstance = new PGlite();
      await pgliteInstance.query('SELECT 1');
    }

    let executableSchemaSql = schemaSql;
    if (!hasVector) {
      executableSchemaSql = executableSchemaSql
        .replace(/CREATE EXTENSION IF NOT EXISTS vector;/gi, '-- CREATE EXTENSION IF NOT EXISTS vector;')
        .replace(/vector\(1536\)/gi, 'TEXT');
    }
    await pgliteInstance.exec(executableSchemaSql);

    // Auto-apply non-breaking column migrations.
    // WARNING: This is a dev-only pattern. In production, use a dedicated migration
    // tool (e.g., node-pg-migrate, Flyway) and never run DDL statements at app startup.
    await pgliteInstance.exec(`
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_redacted BOOLEAN DEFAULT FALSE;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id VARCHAR(64) REFERENCES documents(id);
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_category VARCHAR(50) DEFAULT 'GENERAL';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'INVESTIGATION';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64) DEFAULT '0000000000000000000000000000000000000000000000000000000000000000';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS block_hash VARCHAR(64);
    `);

    // Auto-rechain existing audit logs for cryptographic consistency
    const { rechainAuditLogs } = await import('../services/auditService.js');
    await rechainAuditLogs();

    isEmbeddedMode = true;
    console.log('Embedded PostgreSQL engine initialized at:', dataDir);
  } catch (embeddedError) {
    console.error('Failed to initialize embedded PostgreSQL engine:', embeddedError);
    throw embeddedError;
  }
}

/**
 * Executes a parameterized SQL query.
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameter values
 * @returns {Promise<{ rows: Array, rowCount: number }>}
 */
export async function query(text, params = []) {
  if (pool && !isEmbeddedMode) {
    const res = await pool.query(text, params);
    return res;
  }

  if (pgliteInstance) {
    // PGlite expects text and params
    const res = await pgliteInstance.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: res.affectedRows ?? (res.rows ? res.rows.length : 0),
    };
  }

  throw new Error('Database is not initialized. Call initDatabase() first.');
}

/**
 * Helper to check DB status
 */
export function getDbStatus() {
  return {
    isInitialized: Boolean(pool || pgliteInstance),
    mode: isEmbeddedMode ? 'Embedded (PGlite)' : 'PostgreSQL (Native)',
  };
}

export default {
  initDatabase,
  query,
  getDbStatus,
};
