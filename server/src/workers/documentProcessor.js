import { query } from '../config/db.js';
import { getObjectStream } from '../storage/s3Client.js';
import { analyzeDocumentIntelligence, generateEmbedding } from '../services/aiService.js';
import { logAuditEvent } from '../services/auditService.js';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
import Tesseract from 'tesseract.js';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

let isPolling = false;

/**
 * Splits text into roughly 1000-character chunks, preserving sentence boundaries where possible.
 */
function chunkText(text, maxLen = 1000) {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxLen) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// pdf-parse (bundled pdf.js 1.10) is not safe to run concurrently: two PDFs parsed at the
// same time intermittently fail with "bad XRef entry". Serialize all PDF parsing.
let pdfLock = Promise.resolve();
function parsePdfSerially(buffer) {
  const run = pdfLock.then(() => pdfParse(buffer));
  pdfLock = run.catch(() => {});
  return run;
}

/**
 * Extracts raw text from a document stream based on its mime type.
 */
async function extractTextFromStream(stream, mimeType) {
  if (mimeType === 'application/pdf') {
    // Read stream into buffer
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Parse PDF
    const data = await parsePdfSerially(buffer);
    return data.text;
  }
  
  if (mimeType.startsWith('image/')) {
    console.log(`[Worker] Detected Image. Booting Tesseract OCR engine...`);
    // Read stream into buffer
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Run Optical Character Recognition (OCR) on the image
    const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
    console.log(`[Worker] Tesseract extracted ${text.length} characters from image.`);
    return text;
  }
  
  if (mimeType.startsWith('text/')) {
    // Read plain text
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    // Drain the stream so the S3 connection is released. Media text comes from the
    // officer-attached transcript (see processDocument); there is no speech-to-text here.
    stream.resume();
    await new Promise(resolve => stream.on('end', resolve).on('error', resolve));
    return null;
  }

  return null; // Not extractable
}

/**
 * Processes a single document: Extract text -> AI Classify -> Embeddings -> Update DB
 */
async function processDocument(doc) {
  try {
    console.log(`[Worker] Starting processing for document: ${doc.id}`);
    
    // 1. Mark as processing
    await query('UPDATE documents SET status = $1 WHERE id = $2', ['processing', doc.id]);

    // 2. Fetch object stream
    const { stream, contentType } = await getObjectStream({ key: doc.storage_key });

    // 3. Extract Text
    console.log(`[Worker] Extracting text for ${doc.id}...`);
    const mime = doc.mime_type || contentType || '';
    let extractedText = await extractTextFromStream(stream, mime);
    if (!extractedText && (mime.startsWith('video/') || mime.startsWith('audio/')) && doc.extracted_text) {
      extractedText = `[Officer-attached transcript / description]
${doc.extracted_text}`;
    }

    let docType = 'UNKNOWN';
    let confidence = 0.0;
    let metadata = {};
    let finalStatus = 'processed';

    // 4. AI Analysis (if text was extractable)
    if (extractedText && extractedText.trim().length > 10) {
      console.log(`[Worker] Text extracted. Running AI classification for ${doc.id}...`);
      const aiResult = await analyzeDocumentIntelligence(extractedText, doc.filename);
      
      docType = aiResult.document_type;
      confidence = aiResult.confidence;
      metadata = aiResult.metadata;
      
      // If AI confidence is low, flag for human review
      if (confidence < 0.6) {
        finalStatus = 'needs_review';
      }

      // 4.5. Semantic Chunking & Embedding Generation
      console.log(`[Worker] Generating vector embeddings for ${doc.id}...`);
      const textChunks = chunkText(extractedText);
      for (let i = 0; i < textChunks.length; i++) {
        const chunkContent = textChunks[i];  // renamed from chunkText to avoid shadowing the chunkText() function
        if (chunkContent.length < 10) continue; // Skip tiny chunks
        
        const embedding = await generateEmbedding(chunkContent);
        
        // Convert embedding array to Postgres vector string: '[0.1, 0.2, ...]'
        const vectorStr = `[${embedding.join(',')}]`;
        
        const chunkId = `chk-${uuidv4().substring(0, 10)}`;
        await query(`
          INSERT INTO document_chunks (id, document_id, case_id, chunk_index, text_content, embedding)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [chunkId, doc.id, doc.case_id, i, chunkContent, vectorStr]);
      }
      console.log(`[Worker] Saved ${textChunks.length} vector chunks for ${doc.id}`);

    } else {
      console.log(`[Worker] No extractable text found for ${doc.id}.`);
      metadata.extraction_note = "No extractable text found.";
    }

    // 5. Update Database Record
    const updateSql = `
      UPDATE documents 
      SET 
        status = $1,
        document_type = $2,
        classification_confidence = $3,
        extracted_text = $4,
        metadata = $5
      WHERE id = $6
    `;
    await query(updateSql, [
      finalStatus,
      docType,
      confidence,
      extractedText || null,
      JSON.stringify(metadata),
      doc.id
    ]);

    // 6. Record Audit Log
    await logAuditEvent({
      userId: 'system-worker',
      caseId: doc.case_id,
      documentId: doc.id,
      action: 'DOCUMENT_PROCESSED',
      metadata: {
        status: finalStatus,
        documentType: docType,
        confidence,
        extractedFieldsCount: Object.keys(metadata).length
      }
    });

    console.log(`[Worker] Successfully processed document: ${doc.id}`);

  } catch (err) {
    console.error(`[Worker] Failed to process document ${doc.id}:`, err);
    
    // Mark as failed
    await query('UPDATE documents SET status = $1 WHERE id = $2', ['failed', doc.id]);
    
    // Audit failure
    await logAuditEvent({
      userId: 'system-worker',
      caseId: doc.case_id,
      documentId: doc.id,
      action: 'DOCUMENT_PROCESSING_FAILED',
      metadata: { error: err.message }
    });
  }
}

/**
 * Polls the database for 'uploaded' documents.
 */
async function pollQueue() {
  if (isPolling) return;
  isPolling = true;

  try {
    // Find documents that need processing (limit to 5 at a time)
    const sql = `SELECT * FROM documents WHERE status = 'uploaded' ORDER BY uploaded_at ASC LIMIT 5;`;
    const res = await query(sql);
    
    for (const doc of res.rows) {
      await processDocument(doc);
    }
  } catch (err) {
    console.error('[Worker] Queue polling error:', err);
  } finally {
    isPolling = false;
  }
}

/**
 * Starts the background worker loop.
 */
export function startWorker() {
  console.log('[Worker] Background processing worker started.');
  // Poll every 5 seconds
  setInterval(pollQueue, 5000);
}

export default {
  startWorker
};
