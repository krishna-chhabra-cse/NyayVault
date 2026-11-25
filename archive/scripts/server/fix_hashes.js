import db from './src/config/db.js';
import crypto from 'crypto';
import { getObjectStream } from './src/storage/s3Client.js';

async function fixAllHashes() {
  await db.initDatabase();
  const res = await db.query('SELECT id, filename, storage_key, sha256_hash FROM documents');
  
  let fixedCount = 0;
  for (const doc of res.rows) {
    try {
      const { stream } = await getObjectStream({ key: doc.storage_key });
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const currentBuffer = Buffer.concat(chunks);
      const liveHash = crypto.createHash('sha256').update(currentBuffer).digest('hex');
      
      if (liveHash !== doc.sha256_hash) {
        await db.query('UPDATE documents SET sha256_hash =  WHERE id = ', [liveHash, doc.id]);
        console.log('Fixed hash for:', doc.filename);
        fixedCount++;
      }
    } catch (e) {
      console.log('Could not process:', doc.filename, e.message);
    }
  }
  console.log('Total fixed:', fixedCount);
  process.exit(0);
}
fixAllHashes();
