import './config/env.js';
import app from './app.js';
import { initDatabase } from './config/db.js';
import { initStorage } from './storage/s3Client.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('--- Starting NyayVault Cloud Evidence Vault API ---');
    
    // 1. Initialize Database (PostgreSQL or Embedded PGlite fallback)
    await initDatabase();

    // 2. Initialize Object Storage (Amazon S3 / MinIO, with local disk fallback)
    await initStorage();

    // 2.5 Start Background Processing Worker
    const { startWorker } = await import('./workers/documentProcessor.js');
    startWorker();

    // 3. Start Express HTTP Server
    app.listen(PORT, () => {
      console.log(`Backend API Server running securely on http://localhost:${PORT}`);
      console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

startServer();
