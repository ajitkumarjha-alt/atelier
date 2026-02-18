/**
 * Meeting Point Forum Routes
 * ──────────────────────────
 * API endpoints for the Atelier Meeting Point — an AI-augmented
 * engineering forum for MEP professionals.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import meetingPointAI from '../services/meetingPointAI.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── File Upload Config ───────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads/meeting-point');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const mpUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      '.pdf', '.dwg', '.dxf', '.rvt',
      '.xlsx', '.xls', '.csv', '.doc', '.docx',
      '.png', '.jpg', '.jpeg', '.gif', '.webp',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ── Service Tag Enum ─────────────────────────────────────────────────────────
const SERVICE_TAGS = ['Electrical', 'HVAC', 'PHE', 'Fire', 'LV', 'General'];

// ── Database Init ────────────────────────────────────────────────────────────
async function initMeetingPointTables(queryFn) {
  // Enable pgvector
  await queryFn('CREATE EXTENSION IF NOT EXISTS vector').catch(() => {});

  await queryFn(`
    CREATE TABLE IF NOT EXISTS mp_threads (
      id SERIAL PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      service_tag VARCHAR(50) NOT NULL DEFAULT 'General',
      author_id INTEGER NOT NULL REFERENCES users(id),
      is_anonymous BOOLEAN DEFAULT FALSE,
      anonymous_alias VARCHAR(100),
      status VARCHAR(50) DEFAULT 'open',
      is_pinned BOOLEAN DEFAULT FALSE,
      is_trending BOOLEAN DEFAULT FALSE,
      view_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      verified_solution TEXT,
      embedding vector(768),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await queryFn(`
    CREATE TABLE IF NOT EXISTS mp_posts (
      id SERIAL PRIMARY KEY,
      thread_id INTEGER NOT NULL REFERENCES mp_threads(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      is_anonymous BOOLEAN DEFAULT FALSE,
      anonymous_alias VARCHAR(100),
      is_bot_reply BOOLEAN DEFAULT FALSE,
      bot_sources JSONB,
      helpful_count INTEGER DEFAULT 0,
      is_verified BOOLEAN DEFAULT FALSE,
      embedding vector(768),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await queryFn(`
    CREATE TABLE IF NOT EXISTS mp_reactions (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES mp_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      reaction_type VARCHAR(20) NOT NULL DEFAULT 'helpful',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id, reaction_type)
    )
  `);

  await queryFn(`
    CREATE TABLE IF NOT EXISTS mp_attachments (
      id SERIAL PRIMARY KEY,
      thread_id INTEGER REFERENCES mp_threads(id) ON DELETE CASCADE,
      post_id INTEGER REFERENCES mp_posts(id) ON DELETE CASCADE,
      file_name VARCHAR(500) NOT NULL,
      file_url TEXT NOT NULL,
      file_type VARCHAR(100),
      file_size INTEGER,
      is_indexed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await queryFn(`
    CREATE TABLE IF NOT EXISTS mp_knowledge_chunks (
      id SERIAL PRIMARY KEY,
      attachment_id INTEGER REFERENCES mp_attachments(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding vector(768),
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes
  await queryFn('CREATE INDEX IF NOT EXISTS idx_mp_threads_service ON mp_threads(service_tag)').catch(() => {});
  await queryFn('CREATE INDEX IF NOT EXISTS idx_mp_threads_status ON mp_threads(status)').catch(() => {});
  await queryFn('CREATE INDEX IF NOT EXISTS idx_mp_threads_author ON mp_threads(author_id)').catch(() => {});
  await queryFn('CREATE INDEX IF NOT EXISTS idx_mp_posts_thread ON mp_posts(thread_id)').catch(() => {});
  await queryFn('CREATE INDEX IF NOT EXISTS idx_mp_posts_author ON mp_posts(author_id)').catch(() => {});
  await queryFn('CREATE INDEX IF NOT EXISTS idx_mp_attachments_thread ON mp_attachments(thread_id)').catch(() => {});
  await queryFn('CREATE INDEX IF NOT EXISTS idx_mp_knowledge_chunks_attachment ON mp_knowledge_chunks(attachment_id)').catch(() => {});

  // Vector indexes (IVFFlat for approximate NN)
  await queryFn(`
    CREATE INDEX IF NOT EXISTS idx_mp_threads_embedding
    ON mp_threads USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50)
  `).catch(() => {
    // May fail if not enough rows — that's OK, will be created later
  });

  console.log('✓ Meeting Point tables initialized');
}

// ── Router Factory ───────────────────────────────────────────────────────────
const createMeetingPointRouter = ({ query: queryFn, verifyToken, logger }) => {
  const router = express.Router();

  // Auto-init tables
  initMeetingPointTables(queryFn).catch(err =>
    console.error('Meeting Point table init error:', err.message)
  );

  // Helper: generate anonymous alias
  function generateAlias() {
    const adj = ['Senior', 'Expert', 'Lead', 'Principal', 'Chief'];
    const role = ['Engineer', 'Designer', 'Analyst', 'Specialist', 'Consultant'];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${adj[Math.floor(Math.random() * adj.length)]}_${role[Math.floor(Math.random() * role.length)]}_${num}`;
  }

  // ── GET /meeting-point/threads ──────────────────────────────────────────
  // List threads with filters, pagination, bento metadata
  router.get('/meeting-point/threads', verifyToken, async (req, res) => {
    try {
      const {
        service, status, sort = 'recent', page = 1, limit = 20, search,
      } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const params = [];
      let where = 'WHERE 1=1';

      if (service && SERVICE_TAGS.includes(service)) {
        params.push(service);
        where += ` AND t.service_tag = $${params.length}`;
      }
      if (status) {
        params.push(status);
        where += ` AND t.status = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        where += ` AND (t.title ILIKE $${params.length} OR t.body ILIKE $${params.length})`;
      }

      let orderBy = 'ORDER BY t.is_pinned DESC, ';
      switch (sort) {
        case 'trending': orderBy += 't.view_count DESC, t.reply_count DESC'; break;
        case 'unanswered': where += ' AND t.reply_count = 0'; orderBy += 't.created_at DESC'; break;
        case 'resolved': where += " AND t.status = 'resolved'"; orderBy += 't.updated_at DESC'; break;
        default: orderBy += 't.created_at DESC';
      }

      // Count
      const countResult = await queryFn(
        `SELECT COUNT(*) as total FROM mp_threads t ${where}`, params
      );
      const total = parseInt(countResult.rows[0].total);

      // Fetch
      params.push(parseInt(limit));
      params.push(offset);
      const result = await queryFn(
        `SELECT
           t.id, t.title,
           SUBSTRING(t.body, 1, 200) as body_preview,
           t.service_tag, t.status, t.is_pinned, t.is_trending,
           t.view_count, t.reply_count, t.is_anonymous,
           t.verified_solution IS NOT NULL as has_solution,
           t.created_at, t.updated_at,
           CASE WHEN t.is_anonymous THEN t.anonymous_alias ELSE u.full_name END as author_name,
           CASE WHEN t.is_anonymous THEN 'Anonymous' ELSE u.user_level END as author_level,
           u.id as author_id
         FROM mp_threads t
         JOIN users u ON t.author_id = u.id
         ${where}
         ${orderBy}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      res.json({
        threads: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      logger.error('Error listing threads:', error);
      res.status(500).json({ error: 'Failed to fetch threads' });
    }
  });

  // ── GET /meeting-point/threads/:id ──────────────────────────────────────
  router.get('/meeting-point/threads/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;


      const { rows: threads } = await queryFn(
        `SELECT t.*,
           CASE WHEN t.is_anonymous THEN t.anonymous_alias ELSE u.full_name END as author_name,
           CASE WHEN t.is_anonymous THEN 'Anonymous' ELSE u.user_level END as author_level,
           u.email as author_email
         FROM mp_threads t
         JOIN users u ON t.author_id = u.id
         WHERE t.id = $1`,
        [id]
      );
      if (!threads.length) return res.status(404).json({ error: 'Thread not found' });

      // Get posts
      const { rows: posts } = await queryFn(
        `SELECT p.*,
           CASE WHEN p.is_anonymous THEN p.anonymous_alias ELSE u.full_name END as author_name,
           CASE WHEN p.is_anonymous THEN 'Anonymous' ELSE u.user_level END as author_level,
           u.id as author_user_id,
           u.email as author_email
         FROM mp_posts p
         JOIN users u ON p.author_id = u.id
         WHERE p.thread_id = $1
         ORDER BY p.is_verified DESC, p.helpful_count DESC, p.created_at ASC`,
        [id]
      );

      // Get attachments
      const { rows: attachments } = await queryFn(
        `SELECT * FROM mp_attachments WHERE thread_id = $1 ORDER BY created_at`,
        [id]
      );

      // Get similar threads
      const thread = threads[0];
      let similar = [];
      try {
        similar = await meetingPointAI.findSimilarThreads(
          `${thread.title} ${thread.body}`,
          { limit: 3, excludeThreadId: parseInt(id) }
        );
      } catch (e) { /* ignore */ }

      res.json({
        thread: thread,
        posts,
        attachments,
        similarThreads: similar,
      });
    } catch (error) {
      logger.error('Error fetching thread:', error);
      res.status(500).json({ error: 'Failed to fetch thread' });
    }
  });

  // ── POST /meeting-point/threads ─────────────────────────────────────────
  router.post('/meeting-point/threads', verifyToken, mpUpload.array('files', 5), async (req, res) => {
    try {
      const { title, body, service_tag, is_anonymous } = req.body;
      const authorId = req.user.userId;

      if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
      }
      if (service_tag && !SERVICE_TAGS.includes(service_tag)) {
        return res.status(400).json({ error: `Invalid service tag. Must be one of: ${SERVICE_TAGS.join(', ')}` });
      }

      const isAnon = is_anonymous === 'true' || is_anonymous === true;
      let finalBody = body;

      // Sanitize anonymous content via AI
      if (isAnon) {
        finalBody = await meetingPointAI.sanitizeAnonymousContent(body);
      }

      const alias = isAnon ? generateAlias() : null;

      const { rows } = await queryFn(
        `INSERT INTO mp_threads (title, body, service_tag, author_id, is_anonymous, anonymous_alias)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, finalBody, service_tag || 'General', authorId, isAnon, alias]
      );
      const thread = rows[0];

      // Handle file uploads
      if (req.files?.length) {
        for (const file of req.files) {
          await queryFn(
            `INSERT INTO mp_attachments (thread_id, file_name, file_url, file_type, file_size)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              thread.id,
              file.originalname,
              `/uploads/meeting-point/${file.filename}`,
              file.mimetype,
              file.size,
            ]
          );
        }
      }

      // Async: Generate embedding for vector search
      meetingPointAI.embedThread(thread.id).catch(() => {});

      // Async: Schedule AtelierBot check after 5 minutes
      setTimeout(() => {
        meetingPointAI.atelierBotAutoReply(thread.id).catch(() => {});
      }, 5 * 60 * 1000);

      res.status(201).json(thread);
    } catch (error) {
      logger.error('Error creating thread:', error);
      res.status(500).json({ error: 'Failed to create thread' });
    }
  });

  // ── POST /meeting-point/threads/:id/posts ───────────────────────────────
  router.post('/meeting-point/threads/:id/posts', verifyToken, mpUpload.array('files', 5), async (req, res) => {
    try {
      const { id: threadId } = req.params;
      const { body, is_anonymous } = req.body;
      const authorId = req.user.userId;

      if (!body) return res.status(400).json({ error: 'Body is required' });

      const isAnon = is_anonymous === 'true' || is_anonymous === true;
      let finalBody = body;
      if (isAnon) {
        finalBody = await meetingPointAI.sanitizeAnonymousContent(body);
      }
      const alias = isAnon ? generateAlias() : null;

      const { rows } = await queryFn(
        `INSERT INTO mp_posts (thread_id, author_id, body, is_anonymous, anonymous_alias)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [threadId, authorId, finalBody, isAnon, alias]
      );

      // Update reply count
      await queryFn(
        'UPDATE mp_threads SET reply_count = reply_count + 1, updated_at = NOW() WHERE id = $1',
        [threadId]
      );

      // Handle file uploads
      if (req.files?.length) {
        for (const file of req.files) {
          await queryFn(
            `INSERT INTO mp_attachments (post_id, file_name, file_url, file_type, file_size)
             VALUES ($1, $2, $3, $4, $5)`,
            [rows[0].id, file.originalname, `/uploads/meeting-point/${file.filename}`, file.mimetype, file.size]
          );
        }
      }

      // Async: embed the post
      meetingPointAI.embedPost(rows[0].id).catch(() => {});

      res.status(201).json(rows[0]);
    } catch (error) {
      logger.error('Error creating post:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  // ── POST /meeting-point/threads/:id/view ─────────────────────────────
  // Increment view count (called once per page visit)
  router.post('/meeting-point/threads/:id/view', verifyToken, async (req, res) => {
    try {
      await queryFn('UPDATE mp_threads SET view_count = view_count + 1 WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to record view' });
    }
  });

  // ── POST /meeting-point/posts/:id/react ─────────────────────────────────
  // Toggle helpful/correct reaction
  router.post('/meeting-point/posts/:id/react', verifyToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.userId;
      const { reaction_type = 'helpful' } = req.body;

      // Toggle: delete if exists, insert if not
      const { rowCount } = await queryFn(
        'DELETE FROM mp_reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3',
        [postId, userId, reaction_type]
      );

      if (rowCount === 0) {
        await queryFn(
          'INSERT INTO mp_reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)',
          [postId, userId, reaction_type]
        );
        await queryFn(
          'UPDATE mp_posts SET helpful_count = helpful_count + 1 WHERE id = $1',
          [postId]
        );
      } else {
        await queryFn(
          'UPDATE mp_posts SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = $1',
          [postId]
        );
      }

      // Get updated count
      const { rows } = await queryFn(
        'SELECT helpful_count FROM mp_posts WHERE id = $1', [postId]
      );

      res.json({ helpful_count: rows[0]?.helpful_count || 0, toggled: rowCount === 0 });
    } catch (error) {
      logger.error('Error toggling reaction:', error);
      res.status(500).json({ error: 'Failed to toggle reaction' });
    }
  });

  // ── PATCH /meeting-point/posts/:id/verify ───────────────────────────────
  // Mark a post as "Correct" (L1+ or SUPER_ADMIN only)
  router.patch('/meeting-point/posts/:id/verify', verifyToken, async (req, res) => {
    try {
      const level = req.user.userLevel;
      if (!['SUPER_ADMIN', 'L0', 'L1'].includes(level)) {
        return res.status(403).json({ error: 'Only senior engineers (L1+) can verify answers' });
      }

      const { id: postId } = req.params;
      await queryFn(
        'UPDATE mp_posts SET is_verified = NOT is_verified WHERE id = $1',
        [postId]
      );

      const { rows } = await queryFn('SELECT * FROM mp_posts WHERE id = $1', [postId]);
      res.json(rows[0]);
    } catch (error) {
      logger.error('Error verifying post:', error);
      res.status(500).json({ error: 'Failed to verify post' });
    }
  });

  // ── PATCH /meeting-point/threads/:id ────────────────────────────────────
  // Edit own thread (title + body)
  router.patch('/meeting-point/threads/:id', verifyToken, async (req, res) => {
    try {
      const { id: threadId } = req.params;
      const { title, body } = req.body;
      const userId = req.user.userId;

      const { rows: existing } = await queryFn('SELECT * FROM mp_threads WHERE id = $1', [threadId]);
      if (!existing.length) return res.status(404).json({ error: 'Thread not found' });
      if (existing[0].author_id !== userId) {
        return res.status(403).json({ error: 'You can only edit your own threads' });
      }

      const newTitle = (title || existing[0].title).trim();
      const newBody = (body || existing[0].body).trim();

      let finalBody = newBody;
      if (existing[0].is_anonymous) {
        finalBody = await meetingPointAI.sanitizeAnonymousContent(finalBody);
      }

      const { rows } = await queryFn(
        `UPDATE mp_threads SET title = $1, body = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [newTitle, finalBody, threadId]
      );

      // Re-embed async
      meetingPointAI.embedThread(parseInt(threadId)).catch(() => {});

      res.json(rows[0]);
    } catch (error) {
      logger.error('Error editing thread:', error);
      res.status(500).json({ error: 'Failed to edit thread' });
    }
  });

  // ── PATCH /meeting-point/threads/:id/resolve ────────────────────────────
  // Mark thread as resolved + trigger AI summary
  router.patch('/meeting-point/threads/:id/resolve', verifyToken, async (req, res) => {
    try {
      const { id: threadId } = req.params;

      // Trigger AI summary
      const summary = await meetingPointAI.synthesizeThreadSolution(parseInt(threadId));

      const { rows } = await queryFn(
        `UPDATE mp_threads SET status = 'resolved', verified_solution = COALESCE($1, verified_solution), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [summary, threadId]
      );

      res.json(rows[0]);
    } catch (error) {
      logger.error('Error resolving thread:', error);
      res.status(500).json({ error: 'Failed to resolve thread' });
    }
  });

  // ── PATCH /meeting-point/threads/:id/pin ────────────────────────────────
  router.patch('/meeting-point/threads/:id/pin', verifyToken, async (req, res) => {
    try {
      const level = req.user.userLevel;
      if (!['SUPER_ADMIN', 'L0', 'L1'].includes(level)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await queryFn(
        'UPDATE mp_threads SET is_pinned = NOT is_pinned WHERE id = $1',
        [req.params.id]
      );
      const { rows } = await queryFn('SELECT * FROM mp_threads WHERE id = $1', [req.params.id]);
      res.json(rows[0]);
    } catch (error) {
      logger.error('Error pinning thread:', error);
      res.status(500).json({ error: 'Failed to pin thread' });
    }
  });

  // ── GET /meeting-point/suggest ──────────────────────────────────────────
  // Real-time duplicate detection / similar thread suggestions
  router.get('/meeting-point/suggest', verifyToken, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.length < 10) return res.json({ suggestions: [] });

      const suggestions = await meetingPointAI.detectDuplicates(q);
      res.json({ suggestions });
    } catch (error) {
      logger.error('Error fetching suggestions:', error);
      res.json({ suggestions: [] });
    }
  });

  // ── GET /meeting-point/stats ────────────────────────────────────────────
  // Dashboard stats for bento grid
  router.get('/meeting-point/stats', verifyToken, async (req, res) => {
    try {
      const [
        totalResult,
        openResult,
        resolvedResult,
        serviceResult,
        trendingResult,
        topContributors,
      ] = await Promise.all([
        queryFn('SELECT COUNT(*) as count FROM mp_threads'),
        queryFn("SELECT COUNT(*) as count FROM mp_threads WHERE status = 'open'"),
        queryFn("SELECT COUNT(*) as count FROM mp_threads WHERE status = 'resolved'"),
        queryFn(`
          SELECT service_tag, COUNT(*) as count
          FROM mp_threads GROUP BY service_tag ORDER BY count DESC
        `),
        queryFn(`
          SELECT id, title, service_tag, view_count, reply_count
          FROM mp_threads
          WHERE created_at > NOW() - INTERVAL '7 days'
          ORDER BY view_count DESC, reply_count DESC
          LIMIT 5
        `),
        queryFn(`
          SELECT u.id, u.full_name, u.user_level, COUNT(p.id) as post_count,
                 SUM(p.helpful_count) as total_helpful
          FROM users u
          JOIN mp_posts p ON u.id = p.author_id
          WHERE p.is_anonymous = false
          GROUP BY u.id, u.full_name, u.user_level
          ORDER BY total_helpful DESC, post_count DESC
          LIMIT 5
        `),
      ]);

      res.json({
        total_threads: parseInt(totalResult.rows[0].count),
        open_threads: parseInt(openResult.rows[0].count),
        resolved_threads: parseInt(resolvedResult.rows[0].count),
        by_service: serviceResult.rows,
        trending: trendingResult.rows,
        top_contributors: topContributors.rows,
      });
    } catch (error) {
      logger.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // ── GET /meeting-point/search ───────────────────────────────────────────
  // Semantic search across threads + knowledge base
  router.get('/meeting-point/search', verifyToken, async (req, res) => {
    try {
      const { q, limit = 10 } = req.query;
      if (!q) return res.json({ threads: [], knowledge: [] });

      const [threads, knowledge] = await Promise.all([
        meetingPointAI.findSimilarThreads(q, { limit: parseInt(limit) }),
        meetingPointAI.searchKnowledgeBase(q, { limit: 5 }),
      ]);

      res.json({ threads, knowledge });
    } catch (error) {
      logger.error('Error in semantic search:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // ── PATCH /meeting-point/posts/:id ──────────────────────────────────────
  // Edit own post
  router.patch('/meeting-point/posts/:id', verifyToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const { body } = req.body;
      const userId = req.user.userId;

      if (!body || !body.trim()) return res.status(400).json({ error: 'Body is required' });

      const { rows: existing } = await queryFn('SELECT * FROM mp_posts WHERE id = $1', [postId]);
      if (!existing.length) return res.status(404).json({ error: 'Post not found' });
      if (existing[0].author_id !== userId) {
        return res.status(403).json({ error: 'You can only edit your own posts' });
      }

      let finalBody = body.trim();
      if (existing[0].is_anonymous) {
        finalBody = await meetingPointAI.sanitizeAnonymousContent(finalBody);
      }

      const { rows } = await queryFn(
        `UPDATE mp_posts SET body = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [finalBody, postId]
      );

      // Re-embed async
      meetingPointAI.embedPost(parseInt(postId)).catch(() => {});

      res.json(rows[0]);
    } catch (error) {
      logger.error('Error editing post:', error);
      res.status(500).json({ error: 'Failed to edit post' });
    }
  });

  // ── DELETE /meeting-point/posts/:id ─────────────────────────────────────
  // Delete own post (or admin)
  router.delete('/meeting-point/posts/:id', verifyToken, async (req, res) => {
    try {
      const { id: postId } = req.params;
      const userId = req.user.userId;
      const level = req.user.userLevel;

      const { rows: existing } = await queryFn('SELECT * FROM mp_posts WHERE id = $1', [postId]);
      if (!existing.length) return res.status(404).json({ error: 'Post not found' });

      if (existing[0].author_id !== userId && !['SUPER_ADMIN', 'L0', 'L1'].includes(level)) {
        return res.status(403).json({ error: 'You can only delete your own posts' });
      }

      const threadId = existing[0].thread_id;
      await queryFn('DELETE FROM mp_posts WHERE id = $1', [postId]);
      await queryFn(
        'UPDATE mp_threads SET reply_count = GREATEST(reply_count - 1, 0), updated_at = NOW() WHERE id = $1',
        [threadId]
      );

      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // ── DELETE /meeting-point/threads/:id ───────────────────────────────────
  router.delete('/meeting-point/threads/:id', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const level = req.user.userLevel;
      const userId = req.user.userId;

      // Only author or admin can delete
      const { rows } = await queryFn('SELECT author_id FROM mp_threads WHERE id = $1', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Thread not found' });
      if (rows[0].author_id !== userId && !['SUPER_ADMIN', 'L0', 'L1'].includes(level)) {
        return res.status(403).json({ error: 'Not authorized to delete this thread' });
      }

      await queryFn('DELETE FROM mp_threads WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting thread:', error);
      res.status(500).json({ error: 'Failed to delete thread' });
    }
  });

  return router;
};

export default createMeetingPointRouter;
