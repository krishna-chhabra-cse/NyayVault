/**
 * One-time migration: copies evidence files that were stored on the EC2 local disk
 * (storage fallback) into the Amazon S3 evidence bucket, verifying SHA-256 on the way.
 *
 * Usage (on EC2, from ~/server):  node scripts/sync_local_to_s3.js
 * Uses the same env vars as the app (AWS_S3_BUCKET_NAME, AWS_REGION, DATABASE_URL).
 */
import '../src/config/env.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { initDatabase, query } from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageRoot = path.resolve(__dirname, '../../storage');
const bucket = process.env.AWS_S3_BUCKET_NAME || 'nyayvault-evidence';
const region = process.env.AWS_REGION || 'ap-south-1';
const legacyDirs = [bucket, 'sih-evidence-vault-2026', 'sih26190-evidence', ''];

const s3 = new S3Client({ region });

function findLocal(key) {
  for (const dir of legacyDirs) {
    const p = path.resolve(storageRoot, dir, key);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function existsInS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

await initDatabase();
const { rows } = await query('SELECT id, storage_key, mime_type, sha256_hash FROM documents');
let copied = 0, skipped = 0, missing = 0, mismatched = 0;

for (const doc of rows) {
  const key = doc.storage_key;
  if (!key || key.startsWith('ipfs://')) { skipped++; continue; }
  if (await existsInS3(key)) { skipped++; continue; }

  const local = findLocal(key);
  if (!local) { console.warn(`MISSING  ${doc.id}  ${key}`); missing++; continue; }

  const buffer = fs.readFileSync(local);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  if (doc.sha256_hash && hash !== doc.sha256_hash) {
    console.warn(`HASH MISMATCH ${doc.id} (uploading anyway; live check will flag it)`);
    mismatched++;
  }

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: doc.mime_type || 'application/octet-stream',
    ServerSideEncryption: 'AES256',
  }));
  console.log(`COPIED   ${doc.id}  ${key}`);
  copied++;
}

console.log(`\nDone. copied=${copied} already-in-s3/skipped=${skipped} missing=${missing} hash-mismatch=${mismatched}`);
process.exit(0);
