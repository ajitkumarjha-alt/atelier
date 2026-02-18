/**
 * Meeting Point AI Service
 * ─────────────────────────
 * RAG pipeline for the Atelier Meeting Point forum.
 * Uses Google Gemini for embeddings + generation, pgvector for similarity search.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../db.js';
import logger from '../utils/logger.js';

// ── Gemini Setup ─────────────────────────────────────────────────────────────
let genAI = null;
let embeddingModel = null;
let chatModel = null;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_DIMENSION = 768; // Gemini embedding-001 dimension

try {
  if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
    chatModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
    logger.info('✅ Meeting Point AI initialized (Gemini embedding + chat)');
  } else {
    logger.warn('⚠️  Meeting Point AI: Gemini API key not configured. AI features disabled.');
  }
} catch (error) {
  logger.error('Meeting Point AI init error:', error.message);
}

export function isAIConfigured() {
  return embeddingModel !== null && chatModel !== null;
}

// ── Embedding Generation ─────────────────────────────────────────────────────
/**
 * Generate a 768-dim embedding vector for given text using Gemini.
 * Falls back to null if AI is not configured.
 */
export async function generateEmbedding(text) {
  if (!embeddingModel) return null;

  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values; // number[]
  } catch (error) {
    logger.error('Embedding generation failed:', error.message);
    return null;
  }
}

/**
 * Format a vector array as a pgvector-compatible string: '[0.1,0.2,...]'
 */
function vectorToString(vec) {
  return `[${vec.join(',')}]`;
}

// ── Semantic Search ──────────────────────────────────────────────────────────
/**
 * Find threads semantically similar to the given query text.
 * Uses cosine distance (<=>) on pgvector column.
 * Returns top `limit` results with a similarity score.
 */
export async function findSimilarThreads(queryText, { limit = 5, excludeThreadId = null } = {}) {
  if (!embeddingModel) {
    // Fallback: PostgreSQL full-text search
    return fallbackTextSearch(queryText, limit);
  }

  try {
    const embedding = await generateEmbedding(queryText);
    if (!embedding) return fallbackTextSearch(queryText, limit);

    const vecStr = vectorToString(embedding);
    let sql = `
      SELECT
        t.id, t.title, t.service_tag, t.status, t.created_at,
        t.view_count, t.reply_count, t.is_pinned,
        u.full_name as author_name, u.user_level as author_level,
        t.is_anonymous,
        1 - (t.embedding <=> $1::vector) AS similarity
      FROM mp_threads t
      JOIN users u ON t.author_id = u.id
      WHERE t.embedding IS NOT NULL
    `;
    const params = [vecStr];

    if (excludeThreadId) {
      sql += ` AND t.id != $${params.length + 1}`;
      params.push(excludeThreadId);
    }

    sql += ` ORDER BY t.embedding <=> $1::vector LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Semantic search failed, falling back to text:', error.message);
    return fallbackTextSearch(queryText, limit);
  }
}

/**
 * Fallback: PostgreSQL trigram / ILIKE search when vector search unavailable.
 */
async function fallbackTextSearch(queryText, limit) {
  try {
    const result = await query(
      `SELECT t.id, t.title, t.service_tag, t.status, t.created_at,
              t.view_count, t.reply_count, t.is_pinned,
              u.full_name as author_name, u.user_level as author_level,
              t.is_anonymous,
              0.5 AS similarity
       FROM mp_threads t
       JOIN users u ON t.author_id = u.id
       WHERE t.title ILIKE $1 OR t.body ILIKE $1
       ORDER BY t.created_at DESC
       LIMIT $2`,
      [`%${queryText}%`, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Fallback text search failed:', error.message);
    return [];
  }
}

// ── Thread Embedding Storage ─────────────────────────────────────────────────
/**
 * Generate and store embedding for a thread (title + body combined).
 */
export async function embedThread(threadId) {
  try {
    const { rows } = await query(
      'SELECT title, body FROM mp_threads WHERE id = $1',
      [threadId]
    );
    if (!rows.length) return;

    const text = `${rows[0].title}\n\n${rows[0].body}`;
    const embedding = await generateEmbedding(text);
    if (!embedding) return;

    await query(
      'UPDATE mp_threads SET embedding = $1::vector WHERE id = $2',
      [vectorToString(embedding), threadId]
    );
    logger.info(`Embedded thread #${threadId}`);
  } catch (error) {
    logger.error(`Failed to embed thread #${threadId}:`, error.message);
  }
}

/**
 * Generate and store embedding for a post (for fine-grained search).
 */
export async function embedPost(postId) {
  try {
    const { rows } = await query(
      'SELECT body FROM mp_posts WHERE id = $1',
      [postId]
    );
    if (!rows.length) return;

    const embedding = await generateEmbedding(rows[0].body);
    if (!embedding) return;

    await query(
      'UPDATE mp_posts SET embedding = $1::vector WHERE id = $2',
      [vectorToString(embedding), postId]
    );
  } catch (error) {
    logger.error(`Failed to embed post #${postId}:`, error.message);
  }
}

// ── Document Indexing ────────────────────────────────────────────────────────
/**
 * Chunk and embed an uploaded document's text content.
 * Stores chunks in mp_knowledge_chunks for RAG retrieval.
 */
export async function indexDocumentText(attachmentId, textContent, metadata = {}) {
  if (!embeddingModel || !textContent) return;

  try {
    // Split into ~500-word chunks with 50-word overlap
    const chunks = chunkText(textContent, 500, 50);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      if (!embedding) continue;

      await query(
        `INSERT INTO mp_knowledge_chunks
          (attachment_id, chunk_index, chunk_text, embedding, metadata)
         VALUES ($1, $2, $3, $4::vector, $5)`,
        [attachmentId, i, chunks[i], vectorToString(embedding), JSON.stringify(metadata)]
      );
    }
    logger.info(`Indexed ${chunks.length} chunks for attachment #${attachmentId}`);
  } catch (error) {
    logger.error(`Document indexing failed for attachment #${attachmentId}:`, error.message);
  }
}

function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) chunks.push(chunk);
  }
  return chunks;
}

// ── Knowledge Base Search ────────────────────────────────────────────────────
/**
 * Search the indexed knowledge chunks for relevant content.
 * Returns top matching chunks with source info.
 */
export async function searchKnowledgeBase(queryText, { limit = 5 } = {}) {
  if (!embeddingModel) return [];

  try {
    const embedding = await generateEmbedding(queryText);
    if (!embedding) return [];

    const vecStr = vectorToString(embedding);
    const result = await query(
      `SELECT
         kc.id, kc.chunk_text, kc.metadata,
         a.file_name, a.file_type,
         t.id as thread_id, t.title as thread_title,
         1 - (kc.embedding <=> $1::vector) AS similarity
       FROM mp_knowledge_chunks kc
       LEFT JOIN mp_attachments a ON kc.attachment_id = a.id
       LEFT JOIN mp_threads t ON a.thread_id = t.id
       WHERE kc.embedding IS NOT NULL
       ORDER BY kc.embedding <=> $1::vector
       LIMIT $2`,
      [vecStr, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Knowledge base search failed:', error.message);
    return [];
  }
}

// ── AtelierBot: Auto-Answer ──────────────────────────────────────────────────
/**
 * "Shadow Listener" — called after a configurable delay when a thread
 * has no replies. Checks knowledge base and past verified threads for
 * an answer. Only cites existing documents; never hallucinate.
 */
export async function atelierBotAutoReply(threadId) {
  if (!chatModel) return null;

  try {
    // 1. Get the thread content
    const { rows: threads } = await query(
      'SELECT id, title, body, service_tag FROM mp_threads WHERE id = $1',
      [threadId]
    );
    if (!threads.length) return null;
    const thread = threads[0];

    // 2. Check if there are already replies
    const { rows: replyCheck } = await query(
      'SELECT COUNT(*) as cnt FROM mp_posts WHERE thread_id = $1',
      [threadId]
    );
    if (parseInt(replyCheck[0].cnt) > 0) return null; // Already has replies

    // 3. Search knowledge base
    const kbResults = await searchKnowledgeBase(`${thread.title} ${thread.body}`, { limit: 5 });

    // 4. Search similar past threads with verified solutions
    const similarThreads = await findSimilarThreads(`${thread.title} ${thread.body}`, {
      limit: 3,
      excludeThreadId: threadId,
    });
    const verifiedThreads = similarThreads.filter(t => t.status === 'resolved');

    // 5. If no relevant knowledge found, don't reply (avoid hallucination)
    if (kbResults.length === 0 && verifiedThreads.length === 0) {
      logger.info(`AtelierBot: No relevant knowledge for thread #${threadId}, skipping.`);
      return null;
    }

    // 6. Build context for Gemini
    const contextParts = [];
    if (kbResults.length > 0) {
      contextParts.push('**Relevant Knowledge Base Documents:**');
      kbResults.forEach((kb, i) => {
        const source = kb.file_name || kb.thread_title || 'Unknown source';
        contextParts.push(`[Source ${i + 1}: ${source}]\n${kb.chunk_text}`);
      });
    }
    if (verifiedThreads.length > 0) {
      contextParts.push('\n**Past Verified Discussions:**');
      verifiedThreads.forEach((vt, i) => {
        contextParts.push(`[Thread: "${vt.title}" — ${vt.service_tag}]`);
      });
    }

    const prompt = `You are AtelierBot, an AI assistant for MEP (Mechanical, Electrical, Plumbing) engineers.
A user posted the following question in the "${thread.service_tag}" category:

**Title:** ${thread.title}
**Question:** ${thread.body}

Below is relevant context from verified project documents and past resolved discussions:

${contextParts.join('\n\n')}

RULES:
- ONLY use information from the context above. Do NOT make up facts.
- Cite your sources explicitly (e.g., "According to [Source 1: MSEDCL Circular]...").
- If the context doesn't fully answer the question, say what IS known and suggest the user consult a senior engineer.
- Keep the response professional, concise, and technically accurate.
- Format your response in clear paragraphs with relevant technical details.

Provide a helpful answer:`;

    const result = await chatModel.generateContent(prompt);
    const aiResponse = result.response.text();

    // 7. Post the bot reply
    const { rows: botUser } = await query(
      `SELECT id FROM users WHERE email = 'atelierbot@system' LIMIT 1`
    );

    let botUserId;
    if (botUser.length > 0) {
      botUserId = botUser[0].id;
    } else {
      // Create the bot user if it doesn't exist
      const { rows: newBot } = await query(
        `INSERT INTO users (email, full_name, role, user_level, organization)
         VALUES ('atelierbot@system', 'AtelierBot', 'bot', 'SYSTEM', 'atelier')
         ON CONFLICT (email) DO UPDATE SET full_name = 'AtelierBot'
         RETURNING id`,
      );
      botUserId = newBot[0].id;
    }

    const { rows: post } = await query(
      `INSERT INTO mp_posts (thread_id, author_id, body, is_bot_reply, bot_sources)
       VALUES ($1, $2, $3, true, $4)
       RETURNING *`,
      [
        threadId,
        botUserId,
        aiResponse,
        JSON.stringify({
          knowledge_chunks: kbResults.map(kb => ({
            source: kb.file_name || kb.thread_title,
            similarity: kb.similarity,
          })),
          verified_threads: verifiedThreads.map(vt => ({
            id: vt.id,
            title: vt.title,
          })),
        }),
      ]
    );

    // Update reply count
    await query(
      'UPDATE mp_threads SET reply_count = reply_count + 1 WHERE id = $1',
      [threadId]
    );

    logger.info(`AtelierBot replied to thread #${threadId}`);
    return post[0];
  } catch (error) {
    logger.error(`AtelierBot auto-reply failed for thread #${threadId}:`, error.message);
    return null;
  }
}

// ── Thread Summary / Knowledge Synthesis ─────────────────────────────────────
/**
 * Generate a "Verified Solution" summary for a resolved thread.
 * Called when a thread is marked as resolved.
 */
export async function synthesizeThreadSolution(threadId) {
  if (!chatModel) return null;

  try {
    // Get thread + all posts
    const { rows: threads } = await query(
      'SELECT t.*, u.full_name as author_name FROM mp_threads t JOIN users u ON t.author_id = u.id WHERE t.id = $1',
      [threadId]
    );
    if (!threads.length) return null;

    const { rows: posts } = await query(
      `SELECT p.*, u.full_name as author_name, u.user_level
       FROM mp_posts p
       JOIN users u ON p.author_id = u.id
       WHERE p.thread_id = $1
       ORDER BY p.helpful_count DESC, p.created_at ASC`,
      [threadId]
    );

    const thread = threads[0];
    const conversation = posts.map((p, i) => {
      const badge = p.is_bot_reply ? '🤖 AtelierBot' : `${p.author_name} (${p.user_level})`;
      const helpful = p.helpful_count > 0 ? ` [${p.helpful_count} upvotes]` : '';
      return `${badge}${helpful}:\n${p.body}`;
    }).join('\n\n---\n\n');

    const prompt = `You are AtelierBot. A discussion in "${thread.service_tag}" has been marked as RESOLVED.

**Thread Title:** ${thread.title}
**Original Question:** ${thread.body}

**Discussion (${posts.length} replies):**
${conversation}

Generate a concise "Verified Solution" summary that:
1. States the final engineering conclusion
2. Lists key technical values/parameters agreed upon
3. References any standards or documents cited
4. Keeps it to 3-5 bullet points maximum
5. Is factual — only includes what was discussed

Format as a clean summary with bullet points.`;

    const result = await chatModel.generateContent(prompt);
    const summary = result.response.text();

    // Store the summary on the thread
    await query(
      'UPDATE mp_threads SET verified_solution = $1, status = $2 WHERE id = $3',
      [summary, 'resolved', threadId]
    );

    // Re-embed the thread with the solution included
    await embedThread(threadId);

    return summary;
  } catch (error) {
    logger.error(`Thread synthesis failed for #${threadId}:`, error.message);
    return null;
  }
}

// ── Anonymization ────────────────────────────────────────────────────────────
/**
 * AI-based scrubbing of potential identifiers from anonymous posts.
 * Removes company-specific project codes, room names, etc.
 */
export async function sanitizeAnonymousContent(text) {
  if (!chatModel) return text; // Return as-is if AI unavailable

  try {
    const prompt = `You are a privacy filter. The following text is being posted anonymously on a professional forum.
Remove or replace any of these with generic placeholders:
- Specific company names → "[Company]"  
- Specific project names or codes → "[Project]"
- Person names → "[Person]"
- Specific room numbers or building identifiers → "[Location]"
- Email addresses → "[email]"
- Phone numbers → "[phone]"

IMPORTANT: Keep all technical/engineering content intact. Only mask identifying information.
Return ONLY the sanitized text, nothing else.

Text to sanitize:
${text}`;

    const result = await chatModel.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    logger.error('Anonymization failed, using original text:', error.message);
    return text;
  }
}

// ── Duplicate Detection (real-time as-you-type) ──────────────────────────────
/**
 * Quick similarity check used while user is typing.
 * Returns top 3 most similar existing threads.
 */
export async function detectDuplicates(partialText) {
  if (!partialText || partialText.length < 15) return [];
  return findSimilarThreads(partialText, { limit: 3 });
}

export default {
  isAIConfigured,
  generateEmbedding,
  findSimilarThreads,
  embedThread,
  embedPost,
  indexDocumentText,
  searchKnowledgeBase,
  atelierBotAutoReply,
  synthesizeThreadSolution,
  sanitizeAnonymousContent,
  detectDuplicates,
};
