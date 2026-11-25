import { query } from '../config/db.js';
import { generateEmbedding } from './aiService.js';

/**
 * Performs a semantic vector search across document chunks within a case.
 * @param {string} caseId - The ID of the case to restrict the search to
 * @param {string} queryText - The user's semantic search query
 * @param {number} limit - Max number of results to return
 */
export async function semanticSearch(caseId, queryText, limit = 5) {
  if (!queryText || queryText.trim() === '') {
    return [];
  }

  // 1. Generate the vector embedding for the search query
  const queryEmbedding = await generateEmbedding(queryText);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // 2. Perform Nearest-Neighbor search using pgvector Cosine Distance operator (<=>)
  // Distance is 0 (identical) to 2 (opposite). Similarity = 1 - distance
  const sql = `
    SELECT 
      c.id as chunk_id,
      c.id as id,
      c.text_content,
      c.chunk_index,
      d.id as document_id,
      d.filename as document_name,
      d.filename as filename,
      d.document_type,
      1 - (c.embedding <=> $1) as similarity_score
    FROM document_chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE c.case_id = $2
    ORDER BY c.embedding <=> $1
    LIMIT $3;
  `;

  const res = await query(sql, [vectorStr, caseId, limit]);
  return res.rows;
}

export default {
  semanticSearch
};
