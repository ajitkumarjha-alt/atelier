import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { query, transaction, closePool } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { upload, uploadToGCS, deleteFromGCS, isStorageConfigured } from './storage.js';
import { 
  isLLMConfigured, 
  executeNaturalLanguageQuery, 
  suggestVisualization,
  generateProjectStory,
  chatWithDatabase,
  createDesignSheet,
  trackScheduleAndDelivery,
  saveChatMessage,
  getChatHistory
} from './llm.js';
import {
  rateLimiter,
  authRateLimiter,
  requestLogger,
  securityHeaders,
  compressionMiddleware,
  errorHandler,
  notFoundHandler,
  asyncHandler
} from './middleware/index.js';
import logger from './utils/logger.js';
import { performHealthCheck } from './utils/health.js';
import { sendOTPEmail, sendWelcomeEmail } from './utils/emailService.js';
import policyRoutes from './routes/policy.js';
import ElectricalLoadCalculator from './services/electricalLoadService.js';
import createSocietiesRouter from './routes/societies.js';
import createDDSRouter from './routes/dds.js';
import createTasksRouter from './routes/tasks.js';
import createRFCRouter from './routes/rfc.js';
import createStandardsRouter from './routes/standards.js';
import createBuildingDetailsRouter from './routes/building-details.js';
import createMyAssignmentsRouter from './routes/my-assignments.js';

const app = express();
const port = process.env.PORT || 5175;
const API_VERSION = 'v1';

const buildBulkInsert = (rows, columnsPerRow, startIndex = 1) => {
  const placeholders = rows
    .map((_, rowIndex) => {
      const offset = rowIndex * columnsPerRow;
      const rowPlaceholders = Array.from(
        { length: columnsPerRow },
        (_, columnIndex) => `$${startIndex + offset + columnIndex}`
      );
      return `(${rowPlaceholders.join(', ')})`;
    })
    .join(', ');

  return { placeholders, values: rows.flat() };
};

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
// In production, use FIREBASE_ADMIN_SDK environment variable (JSON string)
// In development, use service account file if available
let firebaseAdmin = null;
try {
  let adminConfig;
  
  if (process.env.FIREBASE_ADMIN_SDK) {
    // Production: Parse from environment variable
    adminConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Development: Use service account file
    const fs = await import('fs');
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    adminConfig = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } else {
    logger.warn('⚠️  Firebase Admin SDK not configured. Auth middleware will be disabled.');
  }
  
  if (adminConfig) {
    admin.initializeApp({
      credential: admin.credential.cert(adminConfig),
    });
    firebaseAdmin = admin;
    logger.info('✅ Firebase Admin SDK initialized');
  }
} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK:', error);
}

// ============================================================================
// Middleware Setup
// ============================================================================

// Security headers
app.use(securityHeaders);

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Response compression
app.use(compressionMiddleware);

// Rate limiting (applied globally)
app.use(rateLimiter);

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================================================
// Authentication Middleware
// ============================================================================

/**
 * Verify Firebase ID token and attach user info to request
 * Attached: req.user = { uid, email, userLevel, claims }
 * 
 * Development Mode: If Firebase Admin SDK is not configured, requires x-dev-user-email header
 * to bypass auth verification (only in development, not in production).
 */
const verifyToken = async (req, res, next) => {
  // Skip auth for health check
  if (req.path === '/api/health') {
    return next();
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  // Development mode: allow x-dev-user-email header as bypass (only if Firebase Admin not initialized)
  const devUserEmail = req.headers['x-dev-user-email'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Development bypass: if no auth header but dev email provided and Admin SDK not initialized
    if (devUserEmail && !firebaseAdmin && process.env.NODE_ENV !== 'production') {
      try {
        console.log(`[DEV] Using dev user bypass for email: ${devUserEmail}`);
        
        // Fetch user from database to get user level
        const userResult = await query(
          'SELECT id, email, user_level FROM users WHERE email = $1',
          [devUserEmail]
        );

        if (userResult.rows.length === 0) {
          return res.status(403).json({
            error: 'Forbidden',
            message: `User "${devUserEmail}" not found in database. Contact administrator.`
          });
        }

        const user = userResult.rows[0];

        // Attach user info to request
        req.user = {
          uid: `dev-${user.id}`,
          email: user.email,
          userId: user.id,
          userLevel: user.user_level,
          isAdmin: user.user_level === 'SUPER_ADMIN',
          isL1: user.user_level === 'L1',
          isL2: user.user_level === 'L2',
          isL3: user.user_level === 'L3',
          isL4: user.user_level === 'L4'
        };

        return next();
      } catch (error) {
        console.error('Dev user lookup error:', error.message);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Failed to lookup dev user'
        });
      }
    }
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided. Send Authorization: Bearer <token> or x-dev-user-email header (dev only)'
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    // Verify token with Firebase Admin SDK
    if (!firebaseAdmin) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firebase Admin SDK not initialized. In development, you can use x-dev-user-email header instead of Bearer token.'
      });
    }

    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    
    // Fetch user from database to get user level
    const userResult = await query(
      'SELECT id, email, user_level FROM users WHERE email = $1',
      [decodedToken.email]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User not found in database. Contact administrator.'
      });
    }

    const user = userResult.rows[0];

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      userId: user.id,
      userLevel: user.user_level,
      isAdmin: user.user_level === 'SUPER_ADMIN',
      isL1: user.user_level === 'L1',
      isL2: user.user_level === 'L2',
      isL3: user.user_level === 'L3',
      isL4: user.user_level === 'L4',
      ...decodedToken.custom_claims || {}
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Role-based access control
 * Usage: app.get('/api/admin-only', requireRole('SUPER_ADMIN'), handler)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }

    const userLevel = req.user.userLevel;
    if (!allowedRoles.includes(userLevel)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of: ${allowedRoles.join(', ')}. Your level: ${userLevel}`
      });
    }

    next();
  };
};

/**
 * Check if user is a team member of the project or has higher access
 * Usage: app.get('/api/projects/:projectId/data', verifyToken, checkProjectAccess, handler)
 */
const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user.id;
    const userLevel = req.user.userLevel;

    // SUPER_ADMIN and L1 have access to all projects
    if (userLevel === 'SUPER_ADMIN' || userLevel === 'L1') {
      return next();
    }

    // L2 users have access if they are the assigned lead
    if (userLevel === 'L2') {
      const projectCheck = await query(
        'SELECT assigned_lead_id FROM projects WHERE id = $1',
        [projectId]
      );
      if (projectCheck.rows.length > 0 && projectCheck.rows[0].assigned_lead_id === userId) {
        return next();
      }
    }

    // Check if user is a team member
    const teamCheck = await query(
      'SELECT id FROM project_team WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (teamCheck.rows.length > 0) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this project'
    });
  } catch (error) {
    logger.error('Error checking project access:', error);
    return res.status(500).json({ error: 'Failed to verify project access' });
  }
};

// ============================================================================
// Routes
// ============================================================================

// ============================================================================
// Health Check Endpoints
// ============================================================================

// Simple health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed health check (no auth required)
app.get('/api/health/detailed', asyncHandler(async (req, res) => {
  const healthStatus = await performHealthCheck(firebaseAdmin);
  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
}));

// Readiness probe for Kubernetes/Cloud Run
app.get('/api/ready', asyncHandler(async (req, res) => {
  try {
    await query('SELECT 1');
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
}));

// Liveness probe for Kubernetes/Cloud Run
app.get('/api/alive', (req, res) => {
  res.status(200).json({ alive: true });
});

// ============================================================================
// Policy Management Routes
// ============================================================================
app.use('/api', policyRoutes);

// ============================================================================
// MEP Design Suite Routes
// ============================================================================
const routeDeps = { query, verifyToken, logger };
app.use('/api', createSocietiesRouter(routeDeps));
app.use('/api', createDDSRouter(routeDeps));
app.use('/api', createTasksRouter(routeDeps));
app.use('/api', createRFCRouter(routeDeps));
app.use('/api', createStandardsRouter(routeDeps));
app.use('/api', createBuildingDetailsRouter(routeDeps));
app.use('/api', createMyAssignmentsRouter(routeDeps));

// Cleanup endpoint - TEMPORARY for user cleanup
app.post('/api/admin/cleanup-users', async (req, res) => {
  try {
    // Check current users
    const current = await query('SELECT email, user_level FROM users');
    console.log('Current users:', current.rows);
    
    // Delete all except ajit.kumarjha@lodhagroup.com
    const deleteResult = await query(
      "DELETE FROM users WHERE email != 'ajit.kumarjha@lodhagroup.com' RETURNING email"
    );
    
    // Check remaining users
    const remaining = await query('SELECT email, user_level FROM users');

    res.json({
      deleted: deleteResult.rowCount,
      deletedUsers: deleteResult.rows,
      remaining: remaining.rows
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// File Upload Endpoints
// ============================================================================

// Upload multiple files
app.post('/api/upload', verifyToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!isStorageConfigured()) {
      return res.status(503).json({ 
        error: 'File upload service not configured',
        message: 'Cloud storage is not available'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const folder = req.body.folder || 'general';
    const uploadPromises = req.files.map(file => 
      uploadToGCS(file.buffer, file.originalname, file.mimetype, folder)
    );

    const urls = await Promise.all(uploadPromises);
    
    res.json({ 
      success: true,
      files: urls.map((url, index) => ({
        url,
        originalName: req.files[index].originalname,
        size: req.files[index].size,
        mimetype: req.files[index].mimetype
      }))
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed',
      message: error.message 
    });
  }
});

// Delete file
app.delete('/api/upload', verifyToken, async (req, res) => {
  try {
    if (!isStorageConfigured()) {
      return res.status(503).json({ 
        error: 'File upload service not configured'
      });
    }

    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL is required' });
    }

    await deleteFromGCS(fileUrl);
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ 
      error: 'File deletion failed',
      message: error.message 
    });
  }
});

// Check if storage is configured
app.get('/api/upload/status', (req, res) => {
  res.json({ 
    configured: isStorageConfigured(),
    message: isStorageConfigured() 
      ? 'File upload service is available' 
      : 'File upload service is not configured'
  });
});

// ============================================================================
// End File Upload Endpoints
// ============================================================================

// ============================================================================
// LLM / AI Endpoints
// ============================================================================

// Natural language query endpoint
app.post('/api/llm/query', verifyToken, async (req, res) => {
  try {
    if (!isLLMConfigured()) {
      return res.status(503).json({ 
        error: 'LLM service not configured',
        message: 'Gemini AI is not available'
      });
    }

    const { query: userQuery } = req.body;
    const userLevel = req.user?.userLevel || 'L2';

    if (!userQuery) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await executeNaturalLanguageQuery(userQuery, userLevel);
    
    if (result.success) {
      // Suggest visualization
      const viz = await suggestVisualization(result.data, userQuery);
      
      res.json({
        success: true,
        data: result.data,
        rowCount: result.rowCount,
        query: result.query,
        visualization: viz
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('LLM query error:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      message: error.message 
    });
  }
});

// Chat with database - Enhanced with personalization
app.post('/api/llm/chat', verifyToken, async (req, res) => {
  try {
    if (!isLLMConfigured()) {
      return res.status(503).json({ 
        error: 'LLM service not configured'
      });
    }

    const { message, history, projectId, sessionId } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Save user message
    if (sessionId) {
      await saveChatMessage(userId, projectId, sessionId, 'user', message);
    }

    const result = await chatWithDatabase(message, history || [], userId, projectId);
    
    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }

    // Save assistant response
    if (sessionId) {
      await saveChatMessage(userId, projectId, sessionId, 'assistant', result.answer);
    }
    
    res.json({
      success: true,
      answer: result.answer
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat',
      message: error.message 
    });
  }
});

// Get chat history
app.get('/api/llm/chat-history/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const history = await getChatHistory(userId, sessionId);
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat history',
      message: error.message 
    });
  }
});

// Create design sheet
app.post('/api/llm/design-sheet', verifyToken, async (req, res) => {
  try {
    if (!isLLMConfigured()) {
      return res.status(503).json({ 
        error: 'LLM service not configured'
      });
    }

    const { projectId, requirements, sheetType } = req.body;
    const userId = req.user.id;

    if (!projectId || !requirements) {
      return res.status(400).json({ error: 'Project ID and requirements are required' });
    }

    const result = await createDesignSheet(userId, projectId, requirements, sheetType);
    
    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Design sheet creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create design sheet',
      message: error.message 
    });
  }
});

// Track schedule and delivery
app.get('/api/llm/track-schedule/:projectId?', verifyToken, async (req, res) => {
  try {
    if (!isLLMConfigured()) {
      return res.status(503).json({ 
        error: 'LLM service not configured'
      });
    }

    const { projectId } = req.params;
    const userId = req.user.id;

    const result = await trackScheduleAndDelivery(userId, projectId || null);
    
    if (!result.success) {
      return res.status(403).json({ error: result.error });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Schedule tracking error:', error);
    res.status(500).json({ 
      error: 'Failed to track schedule',
      message: error.message 
    });
  }
});

// Upload user document
app.post('/api/user-documents', verifyToken, upload.single('document'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, documentType, documentName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let fileUrl = '';
    let contentText = '';

    // Upload to storage (GCS or local)
    fileUrl = await uploadToGCS(file);

    // For text files, extract content
    if (file.mimetype.includes('text') || file.mimetype.includes('pdf')) {
      const fs = await import('fs');
      if (file.mimetype.includes('text') && file.path) {
        try {
          contentText = fs.readFileSync(file.path, 'utf-8');
        } catch (err) {
          console.warn('Could not extract text content:', err.message);
        }
      }
    }

    const result = await query(
      `INSERT INTO user_documents 
       (user_id, project_id, document_name, document_type, file_url, file_size, content_text, is_indexed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [userId, projectId || null, documentName || file.originalname, documentType, fileUrl, file.size, contentText, true]
    );

    res.json({
      success: true,
      documentId: result.rows[0].id,
      fileUrl: fileUrl,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      message: error.message 
    });
  }
});

// Get user documents
app.get('/api/user-documents', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.query;

    let queryText = 'SELECT * FROM user_documents WHERE user_id = $1';
    const params = [userId];

    if (projectId) {
      params.push(projectId);
      queryText += ' AND project_id = $2';
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      documents: result.rows
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch documents',
      message: error.message 
    });
  }
});

// Get design sheets
app.get('/api/design-sheets', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.query;

    let queryText = `
      SELECT ds.*, p.name as project_name, u.full_name as created_by_name
      FROM design_sheets ds
      JOIN projects p ON ds.project_id = p.id
      JOIN users u ON ds.created_by_id = u.id
      WHERE ds.created_by_id = $1
    `;
    const params = [userId];

    if (projectId) {
      params.push(projectId);
      queryText += ' AND ds.project_id = $2';
    }

    queryText += ' ORDER BY ds.created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      sheets: result.rows
    });
  } catch (error) {
    console.error('Error fetching design sheets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch design sheets',
      message: error.message 
    });
  }
});

// Generate project story
app.get('/api/llm/project-story/:projectId', verifyToken, async (req, res) => {
  try {
    if (!isLLMConfigured()) {
      return res.status(503).json({ 
        error: 'LLM service not configured'
      });
    }

    const { projectId } = req.params;

    const result = await generateProjectStory(projectId);
    
    res.json(result);
  } catch (error) {
    console.error('Project story error:', error);
    res.status(500).json({ 
      error: 'Failed to generate project story',
      message: error.message 
    });
  }
});

// Check if LLM is configured
app.get('/api/llm/status', (req, res) => {
  res.json({ 
    configured: isLLMConfigured(),
    message: isLLMConfigured() 
      ? 'LLM service is available' 
      : 'LLM service is not configured'
  });
});

// ============================================================================
// End LLM Endpoints
// ============================================================================

// Super Admin Emails - load from environment or use defaults
const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS 
  ? process.env.SUPER_ADMIN_EMAILS.split(',').map(email => email.trim())
  : ['ajit.kumarjha@lodhagroup.com'];

// Initialize database tables on server start
async function initializeDatabase() {
  try {
    // Create users table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        user_level VARCHAR(50) NOT NULL DEFAULT 'L4',
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add user_level column if it doesn't exist (migration for existing tables)
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS user_level VARCHAR(50) NOT NULL DEFAULT 'L4'
    `);
    
    // Add organization column for lodhagroup restriction
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(255) DEFAULT 'lodhagroup'
    `);
    
    // Add is_active column for user activation workflow
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
    `);
    
    console.log('✓ users table initialized');

    // Create projects table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        state VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'Concept',
        lifecycle_stage VARCHAR(50) NOT NULL DEFAULT 'Concept',
        project_category VARCHAR(50),
        completion_percentage INTEGER NOT NULL DEFAULT 0,
        floors_completed INTEGER NOT NULL DEFAULT 0,
        total_floors INTEGER NOT NULL DEFAULT 0,
        mep_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        material_stock_percentage INTEGER NOT NULL DEFAULT 0,
        assigned_lead_id INTEGER REFERENCES users(id),
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        target_completion_date DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '12 months',
        is_archived BOOLEAN DEFAULT FALSE,
        archived_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ projects table initialized');

    // Add project_status, site_status, lead_name columns if they don't exist
    await query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS project_status VARCHAR(50) DEFAULT 'Concept'
    `);
    await query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS site_status VARCHAR(100)
    `);
    await query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS state VARCHAR(100)
    `);
    await query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS lead_name VARCHAR(255)
    `);
    await query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS project_category VARCHAR(50)
    `);
    console.log('✓ projects table migrated (project_status, site_status, lead_name)');

    // Create project standard selections (per-project overrides)
    await query(`
      CREATE TABLE IF NOT EXISTS project_standard_selections (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        standard_key VARCHAR(100) NOT NULL,
        standard_value VARCHAR(255),
        standard_ref_id INTEGER,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, standard_key)
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_project_standard_selections_project_id
      ON project_standard_selections(project_id)
    `);
    console.log('✓ project_standard_selections table initialized');

    // Create buildings table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        building_type VARCHAR(100),
        application_type VARCHAR(100) NOT NULL,
        gf_entrance_lobby DECIMAL(10, 2),
        location_latitude DECIMAL(10, 8),
        location_longitude DECIMAL(11, 8),
        residential_type VARCHAR(100),
        villa_type VARCHAR(100),
        villa_count INTEGER,
        twin_of_building_id INTEGER REFERENCES buildings(id),
        is_twin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add building_type column if it doesn't exist
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS building_type VARCHAR(100)
    `);
    
    // Villa-specific fields
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS gf_entrance_lobby DECIMAL(10, 2)
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS pool_volume DECIMAL(10, 2)
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS has_lift BOOLEAN DEFAULT FALSE
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS lift_name VARCHAR(255)
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS lift_passenger_capacity INTEGER
    `);
    
    // MLCP/Parking-specific fields
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS car_parking_count_per_floor INTEGER
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS car_parking_area DECIMAL(10, 2)
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS two_wheeler_parking_count INTEGER
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS two_wheeler_parking_area DECIMAL(10, 2)
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS ev_parking_percentage DECIMAL(5, 2)
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS shop_count INTEGER
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS shop_area DECIMAL(10, 2)
    `);
    
    // Commercial-specific fields
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS office_count INTEGER
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS office_area DECIMAL(10, 2)
    `);
    await query(`
      ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS common_area DECIMAL(10, 2)
    `);
    
    console.log('✓ buildings table initialized');

    // Create societies table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS societies (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, name)
      )
    `);
    console.log('✓ societies table initialized');

    // Add society_id to buildings table if it doesn't exist
    await query(`
      ALTER TABLE buildings
      ADD COLUMN IF NOT EXISTS society_id INTEGER REFERENCES societies(id) ON DELETE SET NULL
    `);
    console.log('✓ buildings table migrated (society_id added)');

    // Create floors table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS floors (
        id SERIAL PRIMARY KEY,
        building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        floor_number INTEGER NOT NULL,
        floor_name VARCHAR(100),
        floor_height DECIMAL(6, 2),
        typical_lobby_area DECIMAL(10, 2),
        twin_of_floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ floors table initialized');

    // Add twin_of_floor_id column if it doesn't exist (migration)
    try {
      await query(`
        ALTER TABLE floors 
        ADD COLUMN IF NOT EXISTS twin_of_floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL
      `);
      console.log('✓ floors table migrated (twin_of_floor_id added)');
    } catch (err) {
      // Column might already exist, ignore error
      console.log('ℹ floors table migration: column may already exist');
    }

    try {
      await query(`
        ALTER TABLE floors
        ADD COLUMN IF NOT EXISTS floor_height DECIMAL(6, 2)
      `);
      console.log('✓ floors table migrated (floor_height added)');
    } catch (err) {
      console.log('ℹ floors table migration: floor_height column may already exist');
    }

    try {
      await query(`
        ALTER TABLE floors
        ADD COLUMN IF NOT EXISTS typical_lobby_area DECIMAL(10, 2)
      `);
      console.log('✓ floors table migrated (typical_lobby_area added)');
    } catch (err) {
      console.log('ℹ floors table migration: typical_lobby_area column may already exist');
    }


    // Create flats table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS flats (
        id SERIAL PRIMARY KEY,
        floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
        flat_type VARCHAR(100) NOT NULL,
        area_sqft DECIMAL(10, 2),
        number_of_flats INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ flats table initialized');

    // Create project_standards table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS project_standards (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        value VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, value)
      )
    `);
    console.log('✓ project_standards table initialized');
    
    // Create project_standards_documents table for PDF documents
    await query(`
      CREATE TABLE IF NOT EXISTS project_standards_documents (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        file_type VARCHAR(50),
        uploaded_by_id INTEGER REFERENCES users(id),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ project_standards_documents table initialized');
    
    // Seed building types
    const buildingTypes = [
      { category: 'building_type', value: 'Residential', description: 'Residential apartments and towers' },
      { category: 'building_type', value: 'Villa', description: 'Individual villas and bungalows' },
      { category: 'building_type', value: 'MLCP/Parking', description: 'Multi-Level Car Parking' },
      { category: 'building_type', value: 'Commercial', description: 'Commercial office buildings' },
      { category: 'building_type', value: 'Clubhouse', description: 'Club and recreational facilities' },
      { category: 'building_type', value: 'Institute', description: 'Educational institutions' },
      { category: 'building_type', value: 'Shop', description: 'Retail shops and markets' },
      { category: 'building_type', value: 'Hospital', description: 'Healthcare facilities' },
      { category: 'building_type', value: 'Data Center', description: 'Data centers and server facilities' },
      { category: 'building_type', value: 'Industrial', description: 'Industrial and manufacturing facilities' }
    ];
    
    for (const type of buildingTypes) {
      await query(`
        INSERT INTO project_standards (category, value, description, is_active)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (category, value) DO NOTHING
      `, [type.category, type.value, type.description]);
    }

    // Create material_approval_sheets table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS material_approval_sheets (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        mas_ref_no VARCHAR(100) UNIQUE,
        material_name VARCHAR(255) NOT NULL,
        material_category VARCHAR(100),
        manufacturer VARCHAR(255),
        model_specification TEXT,
        quantity DECIMAL(10, 2),
        unit VARCHAR(50),
        submitted_by_vendor VARCHAR(255),
        vendor_email VARCHAR(255),
        attachment_urls JSONB,
        l2_status VARCHAR(50) DEFAULT 'Pending',
        l2_comments TEXT,
        l2_reviewed_by VARCHAR(255),
        l2_reviewed_at TIMESTAMP WITH TIME ZONE,
        l1_status VARCHAR(50) DEFAULT 'Pending',
        l1_comments TEXT,
        l1_reviewed_by VARCHAR(255),
        l1_reviewed_at TIMESTAMP WITH TIME ZONE,
        final_status VARCHAR(50) DEFAULT 'Pending',
        submitted_by_id INTEGER REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ material_approval_sheets table initialized');
    
    // Add MAS columns if they don't exist (migration for existing databases)
    const masColumns = [
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS mas_ref_no VARCHAR(100)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS material_category VARCHAR(100)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS model_specification TEXT',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS unit VARCHAR(50)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS submitted_by_vendor VARCHAR(255)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS vendor_email VARCHAR(255)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS attachment_urls JSONB',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l2_status VARCHAR(50) DEFAULT \'Pending\'',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l2_comments TEXT',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l2_reviewed_by VARCHAR(255)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l2_reviewed_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l1_status VARCHAR(50) DEFAULT \'Pending\'',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l1_comments TEXT',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l1_reviewed_by VARCHAR(255)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l1_reviewed_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS final_status VARCHAR(50) DEFAULT \'Pending\'',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS submitted_by_id INTEGER REFERENCES users(id)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES users(id)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS assigned_by_id INTEGER REFERENCES users(id)',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS due_date DATE',
    ];
    
    for (const alterSql of masColumns) {
      try {
        await query(alterSql);
      } catch (err) {
        // Ignore errors for columns that already exist
      }
    }
    console.log('✓ material_approval_sheets table migrated');

    // Create requests_for_information table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS requests_for_information (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        rfi_ref_no VARCHAR(100) UNIQUE NOT NULL,
        
        -- Part A: Project & Record Information
        project_name VARCHAR(255),
        record_no VARCHAR(100),
        revision VARCHAR(50),
        date_raised DATE,
        
        -- Part B: Disciplines
        disciplines JSONB,
        
        -- Part C: RFI Details
        rfi_subject TEXT,
        rfi_description TEXT,
        attachment_urls JSONB,
        raised_by VARCHAR(255),
        raised_by_email VARCHAR(255),
        
        -- Part D: Project Team Response
        project_team_response JSONB,
        
        -- Part E: Design Team Response  
        design_team_response JSONB,
        
        -- Metadata
        raised_by_id INTEGER REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ requests_for_information table initialized');
    
    // Add RFI columns if they don't exist (migration for existing databases)
    const rfiColumns = [
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS rfi_ref_no VARCHAR(100)',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS project_name VARCHAR(255)',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS record_no VARCHAR(100)',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS revision VARCHAR(50)',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS date_raised DATE',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS disciplines JSONB',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS rfi_subject TEXT',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS rfi_description TEXT',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS attachment_urls JSONB',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS raised_by VARCHAR(255)',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS raised_by_email VARCHAR(255)',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS project_team_response JSONB',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS design_team_response JSONB',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES users(id)',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS assigned_by_id INTEGER REFERENCES users(id)',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS due_date DATE',
      'ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT \'normal\'',
    ];
    
    for (const alterSql of rfiColumns) {
      try {
        await query(alterSql);
      } catch (err) {
        // Ignore errors for columns that already exist
      }
    }
    console.log('✓ requests_for_information table migrated');

    // Drawing Schedule table
    await query(`
      CREATE TABLE IF NOT EXISTS drawing_schedules (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        drawing_ref_no VARCHAR(100) UNIQUE NOT NULL,
        discipline VARCHAR(100),
        drawing_title TEXT NOT NULL,
        drawing_type VARCHAR(100),
        revision VARCHAR(50) DEFAULT 'R0',
        planned_submission_date DATE,
        actual_submission_date DATE,
        status VARCHAR(50) DEFAULT 'Planned',
        priority VARCHAR(50) DEFAULT 'Medium',
        assigned_to VARCHAR(255),
        remarks TEXT,
        attachment_urls JSONB,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ drawing_schedules table initialized');

    // Design Calculations table
    await query(`
      CREATE TABLE IF NOT EXISTS design_calculations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
        floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL,
        calculation_type VARCHAR(200) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        calculated_by VARCHAR(255) NOT NULL,
        verified_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Draft',
        file_url TEXT,
        file_name VARCHAR(500),
        remarks TEXT,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ design_calculations table initialized');

    // Water Demand Calculations table
    await query(`
      CREATE TABLE IF NOT EXISTS water_demand_calculations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        calculation_name VARCHAR(500) NOT NULL,
        selected_buildings JSONB NOT NULL,
        calculation_details JSONB NOT NULL,
        total_water_demand DECIMAL(12, 2),
        status VARCHAR(50) DEFAULT 'Draft',
        calculated_by VARCHAR(255) NOT NULL,
        verified_by VARCHAR(255),
        remarks TEXT,
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ water_demand_calculations table initialized');

    // Project Change Requests table
    await query(`
      CREATE TABLE IF NOT EXISTS project_change_requests (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        change_ref_no VARCHAR(100) UNIQUE NOT NULL,
        change_type VARCHAR(100) NOT NULL,
        change_category VARCHAR(100),
        entity_type VARCHAR(50),
        entity_id INTEGER,
        change_description TEXT NOT NULL,
        justification TEXT,
        impact_assessment TEXT,
        proposed_changes JSONB,
        current_data JSONB,
        requested_by VARCHAR(255) NOT NULL,
        requested_by_email VARCHAR(255),
        l2_status VARCHAR(50) DEFAULT 'Pending',
        l2_reviewed_by VARCHAR(255),
        l2_comments TEXT,
        l2_reviewed_at TIMESTAMP,
        l1_status VARCHAR(50) DEFAULT 'Pending',
        l1_reviewed_by VARCHAR(255),
        l1_comments TEXT,
        l1_reviewed_at TIMESTAMP,
        final_status VARCHAR(50) DEFAULT 'Pending',
        implemented BOOLEAN DEFAULT FALSE,
        implemented_at TIMESTAMP,
        implemented_by VARCHAR(255),
        attachment_urls JSONB,
        priority VARCHAR(50) DEFAULT 'Medium',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ project_change_requests table initialized');

    // DDS table
    await query(`
      CREATE TABLE IF NOT EXISTS dds (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        version INTEGER DEFAULT 1,
        dds_type VARCHAR(20) DEFAULT 'internal',
        status VARCHAR(20) DEFAULT 'draft',
        created_by_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ dds table initialized');

    // DDS Items table
    await query(`
      CREATE TABLE IF NOT EXISTS dds_items (
        id SERIAL PRIMARY KEY,
        dds_id INTEGER NOT NULL REFERENCES dds(id) ON DELETE CASCADE,
        building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
        floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL,
        item_category VARCHAR(100),
        item_name VARCHAR(500) NOT NULL,
        description TEXT,
        discipline VARCHAR(50),
        expected_start_date DATE,
        expected_completion_date DATE,
        architect_input_date DATE,
        structure_input_date DATE,
        architect_input_received BOOLEAN DEFAULT FALSE,
        architect_input_received_date DATE,
        structure_input_received BOOLEAN DEFAULT FALSE,
        structure_input_received_date DATE,
        actual_completion_date DATE,
        status VARCHAR(30) DEFAULT 'pending',
        revision VARCHAR(10) DEFAULT 'R0',
        revision_count INTEGER DEFAULT 0,
        assigned_to_id INTEGER REFERENCES users(id),
        completed_by_id INTEGER REFERENCES users(id),
        sort_order INTEGER DEFAULT 0,
        is_external_area BOOLEAN DEFAULT FALSE,
        external_area_type VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ dds_items table initialized');

    // Tasks table
    await query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        dds_item_id INTEGER REFERENCES dds_items(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        task_type VARCHAR(50) DEFAULT 'drawing',
        assigned_by_id INTEGER NOT NULL REFERENCES users(id),
        assigned_to_id INTEGER NOT NULL REFERENCES users(id),
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        due_date DATE,
        completed_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(30) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'normal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ tasks table initialized');

    // Project team table
    await query(`
      CREATE TABLE IF NOT EXISTS project_team (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(100),
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `);
    console.log('✓ project_team table initialized');

    // Consultants table
    await query(`
      CREATE TABLE IF NOT EXISTS consultants (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        company_name VARCHAR(255),
        phone VARCHAR(50),
        specialty VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ consultants table initialized');

    // Consultant OTP table
    await query(`
      CREATE TABLE IF NOT EXISTS consultant_otp (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ consultant_otp table initialized');

    // Vendors table
    await query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        company_name VARCHAR(255),
        phone VARCHAR(50),
        vendor_type VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ vendors table initialized');

    // Vendor OTP table
    await query(`
      CREATE TABLE IF NOT EXISTS vendor_otp (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ vendor_otp table initialized');

    // Electrical Load Factors table - for L0 configurable factors
    await query(`
      CREATE TABLE IF NOT EXISTS electrical_load_factors (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        sub_category VARCHAR(100),
        description TEXT NOT NULL,
        watt_per_sqm DECIMAL(10, 2),
        mdf DECIMAL(5, 4),
        edf DECIMAL(5, 4),
        fdf DECIMAL(5, 4),
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        updated_by VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, sub_category, description)
      )
    `);
    console.log('✓ electrical_load_factors table initialized');

    // Initialize/update default electrical load factors (upsert to handle schema changes)
    await query(`
        INSERT INTO electrical_load_factors (category, sub_category, description, watt_per_sqm, mdf, edf, fdf, notes) VALUES
        -- Residential Flat Loads (MSEDCL: 75 W/sqm carpet area, MDF=50%, EDF=10%)
        ('RESIDENTIAL', 'FLAT', 'Residential Flat Load', 75.00, 0.5000, 0.1000, 0.0000, 'MSEDCL NSC Circular 35530 - 75 W/sqm, MDF 50%'),
        
        -- Lighting (MSEDCL: 0.3 W/sqft = ~3.23 W/sqm)
        ('LIGHTING', 'LOBBY', 'GF Entrance Lobby', 3.00, 0.6000, 0.6000, 0.2500, 'MSEDCL NSC Circular 35530 - 0.3 W/sqft'),
        ('LIGHTING', 'LOBBY', 'Typical Floor Lobby', 3.00, 0.6000, 0.6000, 0.2500, 'MSEDCL NSC Circular 35530 - 0.3 W/sqft'),
        ('LIGHTING', 'STAIRCASE', 'Staircases & Landings', NULL, 0.6000, 0.6000, 1.0000, 'MSEDCL - full fire load for egress'),
        ('LIGHTING', 'TERRACE', 'Terrace Lighting', 2.00, 0.6000, 0.6000, 0.2500, 'MSEDCL NSC Circular 35530'),
        ('LIGHTING', 'LANDSCAPE', 'Landscape & External Lighting', 2.00, 0.6000, 0.2500, 0.0000, 'MSEDCL NSC Circular 35530'),
        
        -- Lifts (MSEDCL: MDF=0.6, EDF=0.6 for all lifts)
        ('LIFTS', 'PASSENGER', 'Passenger Lift', NULL, 0.6000, 0.6000, 0.0000, 'MSEDCL NSC Circular 35530'),
        ('LIFTS', 'PASSENGER_FIRE', 'Passenger + Fire Lift', NULL, 0.6000, 0.6000, 1.0000, 'MSEDCL NSC Circular 35530'),
        ('LIFTS', 'FIREMEN', 'Firemen Lift', NULL, 0.6000, 0.6000, 1.0000, 'MSEDCL - service/evac lift, runs during normal + fire'),
        
        -- HVAC & Ventilation (MSEDCL: MDF=0.6, EDF=0.6)
        ('HVAC', 'AC', 'Lobby Air Conditioning', NULL, 0.6000, 0.6000, 0.0000, 'MSEDCL NSC Circular 35530'),
        ('HVAC', 'VENTILATION', 'Mechanical Ventilation Fans', NULL, 0.6000, 0.6000, 0.6000, 'MSEDCL NSC Circular 35530 - runs during fire'),
        
        -- Pressurization (fire-only systems, MDF/EDF=0)
        ('PRESSURIZATION', 'STAIRCASE', 'Staircase Pressurization', NULL, 0.0000, 0.0000, 1.0000, 'MSEDCL - fire safety system only'),
        ('PRESSURIZATION', 'LOBBY', 'Fire Lift Lobby Pressurization', NULL, 0.0000, 0.0000, 1.0000, 'MSEDCL - fire safety system only'),
        
        -- PHE (MSEDCL: MDF=0.6, EDF=0.6; Booster FDF=1.0 per MSEDCL)
        ('PHE', 'BOOSTER', 'Booster Pump', NULL, 0.6000, 0.6000, 1.0000, 'MSEDCL NSC Circular 35530 - fire duty'),
        ('PHE', 'SEWAGE', 'Sewage Pump', NULL, 0.6000, 0.6000, 0.0000, 'MSEDCL NSC Circular 35530'),
        ('PHE', 'TRANSFER', 'Domestic Transfer Pump', NULL, 0.6000, 0.6000, 0.2500, 'MSEDCL NSC Circular 35530'),
        
        -- Fire Fighting (MSEDCL: MDF=0.6, EDF=0.6, FDF=0.25 for main pumps)
        ('FIREFIGHTING', 'WET_RISER', 'Wet Riser Pump', NULL, 0.6000, 0.6000, 1.0000, 'MSEDCL NSC Circular 35530'),
        ('FIREFIGHTING', 'HYDRANT', 'Fire Main Pump', NULL, 0.6000, 0.6000, 0.2500, 'MSEDCL NSC Circular 35530'),
        ('FIREFIGHTING', 'JOCKEY', 'Fire Jockey Pump', NULL, 0.6000, 0.6000, 0.2500, 'MSEDCL NSC Circular 35530'),
        ('FIREFIGHTING', 'SPRINKLER', 'Sprinkler Pump', NULL, 0.6000, 0.6000, 0.2500, 'MSEDCL NSC Circular 35530'),
        
        -- Infrastructure (MSEDCL: MDF=0.6)
        ('INFRASTRUCTURE', 'STP', 'STP/WTP Plant', NULL, 0.6000, 0.0000, 0.0000, 'MSEDCL NSC Circular 35530'),
        ('INFRASTRUCTURE', 'CLUBHOUSE', 'Clubhouse & Amenities', NULL, 0.6000, 0.0000, 0.0000, 'MSEDCL NSC Circular 35530'),
        ('INFRASTRUCTURE', 'EV', 'EV Charger', NULL, 0.6000, 0.0000, 0.0000, 'MSEDCL NSC Circular 35530'),
        ('INFRASTRUCTURE', 'STREET_LIGHTING', 'Street Lighting', NULL, 0.6000, 0.6000, 0.0000, 'MSEDCL NSC Circular 35530'),
        
        -- Other (MSEDCL: MDF=0.6, EDF=0.6)
        ('OTHER', 'SECURITY', 'Security System', NULL, 0.6000, 0.6000, 0.2500, 'MSEDCL NSC Circular 35530'),
        ('OTHER', 'SMALL_POWER', 'Common Area Power', NULL, 0.6000, 0.6000, 0.0000, 'MSEDCL NSC Circular 35530')
      ON CONFLICT (category, sub_category, description) DO UPDATE SET
        watt_per_sqm = EXCLUDED.watt_per_sqm,
        mdf = EXCLUDED.mdf,
        edf = EXCLUDED.edf,
        fdf = EXCLUDED.fdf,
        notes = EXCLUDED.notes
    `);
    console.log('✓ electrical_load_factors table synced with latest defaults');

    // Add flat_loads and building_breakdowns columns to electrical_load_calculations
    try {
      await query(`
        ALTER TABLE electrical_load_calculations 
        ADD COLUMN IF NOT EXISTS flat_loads JSONB,
        ADD COLUMN IF NOT EXISTS building_breakdowns JSONB
      `);
      console.log('✓ electrical_load_calculations table migrated (flat_loads, building_breakdowns added)');
    } catch (err) {
      console.log('ℹ electrical_load_calculations table migration: columns may already exist');
    }

    // Add assignment tracking columns to RFC
    const rfcAssignCols = [
      'ALTER TABLE requests_for_change ADD COLUMN IF NOT EXISTS assigned_by_id INTEGER REFERENCES users(id)',
      'ALTER TABLE requests_for_change ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE requests_for_change ADD COLUMN IF NOT EXISTS due_date DATE',
    ];
    for (const sql of rfcAssignCols) {
      try { await query(sql); } catch (err) { /* column may exist */ }
    }
    console.log('✓ requests_for_change assignment columns added');

    console.log('✅ All database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Helper function to get user level
async function getUserLevel(email) {
  try {
    // Check if super admin
    if (SUPER_ADMIN_EMAILS.includes(email)) {
      return 'SUPER_ADMIN';
    }
    
    const result = await query('SELECT user_level FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return result.rows[0].user_level;
    }
    // Default to L4 if user not found
    return 'L4';
  } catch (error) {
    console.error('Error fetching user level:', error);
    return 'L4';
  }
}

// Projects endpoint - filters based on user level (with auth)
app.get('/api/projects', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    let query_text = `
      SELECT p.*, u.full_name as assigned_lead_name
      FROM projects p
      LEFT JOIN users u ON p.assigned_lead_id = u.id
      WHERE p.is_archived = FALSE
      ORDER BY p.updated_at DESC
    `;

    // If user email provided, check their level and filter accordingly
    if (userEmail) {
      const userLevel = await getUserLevel(userEmail);
      
      if (userLevel === 'L2') {
        // L2 users only see projects assigned to them
        query_text = `
          SELECT p.*, u.full_name as assigned_lead_name
          FROM projects p
          LEFT JOIN users u ON p.assigned_lead_id = u.id
          WHERE p.assigned_lead_id = (SELECT id FROM users WHERE email = $1)
          AND p.is_archived = FALSE
          ORDER BY p.updated_at DESC
        `;
        const result = await query(query_text, [userEmail]);
        return res.json(result.rows);
      } else if (userLevel === 'L3' || userLevel === 'L4') {
        // L3 and L4 have limited view
        query_text = `
          SELECT p.*, u.full_name as assigned_lead_name
          FROM projects p
          LEFT JOIN users u ON p.assigned_lead_id = u.id
          WHERE p.is_archived = FALSE
          ORDER BY p.updated_at DESC
          LIMIT 10
        `;
        const result = await query(query_text);
        return res.json(result.rows);
      }
    }

    // Default: return all active projects (L1 access)
    const result = await query(query_text);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Public projects endpoint (no auth required) - used during project creation
app.get('/api/projects-public', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, 
              u.full_name as assigned_lead_name,
              (SELECT COUNT(*) FROM buildings WHERE project_id = p.id) as building_count
       FROM projects p
       LEFT JOIN users u ON p.assigned_lead_id = u.id
       WHERE p.is_archived = FALSE
       ORDER BY p.updated_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects', message: error.message });
  }
});

// Get single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const text = `
      SELECT p.*, u.full_name as assigned_lead_name
      FROM projects p
      LEFT JOIN users u ON p.assigned_lead_id = u.id
      WHERE p.id = $1
    `;
    const result = await query(text, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Project standard selections (per-project overrides)
app.get('/api/projects/:projectId/standard-selections', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await query(
      `SELECT * FROM project_standard_selections
       WHERE project_id = $1 AND is_active = true
       ORDER BY standard_key`,
      [projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching project standard selections:', error);
    res.status(500).json({ error: 'Failed to fetch project standard selections' });
  }
});

app.put('/api/projects/:projectId/standard-selections', verifyToken, requireRole('SUPER_ADMIN', 'L0', 'L1'), async (req, res) => {
  const { projectId } = req.params;
  const { selections } = req.body;

  if (!Array.isArray(selections)) {
    return res.status(400).json({ error: 'Selections must be an array' });
  }

  try {
    await transaction(async (client) => {
      for (const selection of selections) {
        if (!selection.standard_key) continue;
        const hasValue = Boolean(selection.standard_value || selection.standard_ref_id);
        const isActive = selection.is_active ?? hasValue;

        await client.query(
          `INSERT INTO project_standard_selections
            (project_id, standard_key, standard_value, standard_ref_id, notes, is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
           ON CONFLICT (project_id, standard_key)
           DO UPDATE SET
             standard_value = EXCLUDED.standard_value,
             standard_ref_id = EXCLUDED.standard_ref_id,
             notes = EXCLUDED.notes,
             is_active = EXCLUDED.is_active,
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $7`,
          [
            projectId,
            selection.standard_key,
            selection.standard_value || null,
            selection.standard_ref_id || null,
            selection.notes || null,
            isActive,
            req.user.email
          ]
        );
      }
    });

    const updated = await query(
      `SELECT * FROM project_standard_selections
       WHERE project_id = $1 AND is_active = true
       ORDER BY standard_key`,
      [projectId]
    );
    res.json(updated.rows);
  } catch (error) {
    console.error('Error updating project standard selections:', error);
    res.status(500).json({ error: 'Failed to update project standard selections' });
  }
});

// Get user by email
app.get('/api/users/email/:email', async (req, res) => {
  const { email } = req.params;
  const decodedEmail = decodeURIComponent(email);
  console.log('📧 Fetching user by email:', decodedEmail);
  
  try {
    const result = await query(
      'SELECT id, email, full_name, role, user_level FROM users WHERE email = $1',
      [decodedEmail]
    );
    
    console.log('Found users:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found:', decodedEmail);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User found:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get all users for assigning leads
app.get('/api/users/level/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const text = 'SELECT id, email, full_name, user_level FROM users WHERE user_level = $1 ORDER BY full_name ASC';
    const result = await query(text, [level]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get users that can be added to a project by the current user
app.get('/api/users/addable', verifyToken, async (req, res) => {
  try {
    const currentUserLevel = req.user.userLevel;
    let allowedLevels = [];

    // Define which levels each user can add
    if (currentUserLevel === 'SUPER_ADMIN') {
      allowedLevels = ['L1', 'L2', 'L3', 'L4'];
    } else if (currentUserLevel === 'L1') {
      allowedLevels = ['L2', 'L3', 'L4'];
    } else if (currentUserLevel === 'L2') {
      allowedLevels = ['L3', 'L4'];
    } else {
      return res.json([]); // L3 and L4 cannot add users
    }

    const text = 'SELECT id, email, full_name, user_level FROM users WHERE user_level = ANY($1) ORDER BY user_level, full_name ASC';
    const result = await query(text, [allowedLevels]);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching addable users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get project team members
app.get('/api/projects/:id/team', async (req, res) => {
  try {
    const { id } = req.params;
    
    const text = `
      SELECT 
        pt.id,
        pt.user_id,
        pt.role,
        pt.assigned_at,
        u.email,
        u.full_name,
        u.user_level,
        assigned_by_user.full_name as assigned_by_name
      FROM project_team pt
      JOIN users u ON pt.user_id = u.id
      LEFT JOIN users assigned_by_user ON pt.assigned_by = assigned_by_user.id
      WHERE pt.project_id = $1
      ORDER BY u.user_level, u.full_name
    `;
    
    const result = await query(text, [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching project team:', error);
    res.status(500).json({ error: 'Failed to fetch project team' });
  }
});

// Add team member to project (L2 can add L3/L4, L1 can add L2/L3/L4)
app.post('/api/projects/:id/team', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, assignedBy } = req.body;
    const currentUserLevel = req.user.userLevel;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get the user level of the person being added
    const userToAdd = await query('SELECT user_level FROM users WHERE id = $1', [userId]);
    if (userToAdd.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUserLevel = userToAdd.rows[0].user_level;

    // Check permissions: L2 can add L3 and L4 only
    if (currentUserLevel === 'L2') {
      if (!['L3', 'L4'].includes(targetUserLevel)) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'L2 users can only add L3 and L4 team members' 
        });
      }
    }
    // L1 can add L2, L3, L4
    else if (currentUserLevel === 'L1') {
      if (!['L2', 'L3', 'L4'].includes(targetUserLevel)) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'L1 users can add L2, L3, and L4 team members' 
        });
      }
    }
    // SUPER_ADMIN can add anyone
    else if (currentUserLevel !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'You do not have permission to add team members' 
      });
    }
    
    const text = `
      INSERT INTO project_team (project_id, user_id, role, assigned_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id, user_id) 
      DO UPDATE SET role = $3, assigned_by = $4, assigned_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await query(text, [id, userId, role || targetUserLevel, assignedBy || req.user.id]);
    logger.info(`Team member added to project ${id} by ${currentUserLevel}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error adding team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Remove team member from project
app.delete('/api/projects/:id/team/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    const text = 'DELETE FROM project_team WHERE project_id = $1 AND user_id = $2 RETURNING *';
    const result = await query(text, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    
    res.json({ success: true, message: 'Team member removed' });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// Assign lead to project (L1 and SUPER_ADMIN only)
app.post('/api/projects/:id/assign-lead', async (req, res) => {
  try {
    const { id } = req.params;
    const { leadId, userEmail } = req.body;

    // Verify user is L1 or SUPER_ADMIN
    const userLevel = await getUserLevel(userEmail);
    if (userLevel !== 'L1' && userLevel !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Unauthorized: L1 access required' });
    }

    const text = 'UPDATE projects SET assigned_lead_id = $1 WHERE id = $2 RETURNING *';
    const result = await query(text, [leadId, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// Update project lifecycle stage
app.patch('/api/projects/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, userEmail } = req.body;

    // Verify stage is valid
    const validStages = ['Concept', 'DD', 'Tender', 'VFC'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage' });
    }

    const text = 'UPDATE projects SET lifecycle_stage = $1 WHERE id = $2 RETURNING *';
    const result = await query(text, [stage, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project stage:', error);
    res.status(500).json({ error: 'Failed to update project stage' });
  }
});

// Archive/Hand Over project
app.post('/api/projects/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    const text = `
      UPDATE projects 
      SET is_archived = TRUE, archived_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await query(text, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ error: 'Failed to archive project' });
  }
});

// Get archived projects
app.get('/api/projects/archive/list', async (req, res) => {
  try {
    const text = `
      SELECT p.*, u.full_name as assigned_lead_name
      FROM projects p
      LEFT JOIN users u ON p.assigned_lead_id = u.id
      WHERE p.is_archived = TRUE
      ORDER BY p.archived_at DESC
    `;
    const result = await query(text);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching archived projects:', error);
    res.status(500).json({ error: 'Failed to fetch archived projects' });
  }
});

// Get MAS count
app.get('/api/mas/pending-count', async (req, res) => {
  try {
    const { projectId, userEmail } = req.query;
    
    let query_text = 'SELECT COUNT(*) as count FROM material_approval_sheets WHERE status = $1';
    let params = ['pending'];

    if (projectId) {
      query_text += ' AND project_id = $2';
      params.push(projectId);
    }

    const result = await query(query_text, params);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching MAS count:', error);
    res.status(500).json({ error: 'Failed to fetch MAS count' });
  }
});

// Get MAS summary grouped by project (pending/approved/total)
app.get('/api/mas/summary', verifyToken, async (req, res) => {
  try {
    const text = `
      SELECT
        project_id,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
        COUNT(*) AS total_count
      FROM material_approval_sheets
      GROUP BY project_id
      ORDER BY project_id
    `;
    const result = await query(text);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching MAS summary:', error);
    res.status(500).json({ error: 'Failed to fetch MAS summary' });
  }
});

// Get RFI count
app.get('/api/rfi/pending-count', async (req, res) => {
  try {
    const { projectId, userEmail } = req.query;
    
    let query_text = 'SELECT COUNT(*) as count FROM requests_for_information WHERE status = $1';
    let params = ['pending'];

    if (projectId) {
      query_text += ' AND project_id = $2';
      params.push(projectId);
    }

    const result = await query(query_text, params);
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching RFI count:', error);
    res.status(500).json({ error: 'Failed to fetch RFI count' });
  }
});

// Get all MAS items for a project
app.get('/api/mas/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const text = `
      SELECT m.*, au.full_name as assigned_to_name
      FROM material_approval_sheets m
      LEFT JOIN users au ON m.assigned_to_id = au.id
      WHERE m.project_id = $1
      ORDER BY m.updated_at DESC
    `;
    const result = await query(text, [projectId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching MAS:', error);
    res.status(500).json({ error: 'Failed to fetch MAS' });
  }
});

// Get all RFI items for a project
app.get('/api/rfi/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const text = `
      SELECT r.*, u.full_name as raised_by_name, au.full_name as assigned_to_name
      FROM requests_for_information r
      LEFT JOIN users u ON r.raised_by_id = u.id
      LEFT JOIN users au ON r.assigned_to_id = au.id
      WHERE r.project_id = $1
      ORDER BY r.updated_at DESC
    `;
    const result = await query(text, [projectId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching RFI:', error);
    res.status(500).json({ error: 'Failed to fetch RFI' });
  }
});

// User sync endpoint
app.post('/api/auth/sync', async (req, res) => {
  const { email, fullName } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await query('SELECT id, email, user_level, is_active FROM users WHERE email = $1', [email]);
    
    // If user exists, update last_login and return
    if (existingUser.rows.length > 0) {
      const updateText = `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP,
            full_name = $1
        WHERE email = $2
        RETURNING id, email, full_name, user_level, role, is_active;
      `;
      const result = await query(updateText, [fullName, email]);
      return res.json(result.rows[0]);
    }
    
    // New user - check if they are super admin
    if (SUPER_ADMIN_EMAILS.includes(email)) {
      // Auto-create super admin accounts
      const text = `
        INSERT INTO users (email, full_name, user_level, is_active, last_login)
        VALUES ($1, $2, 'SUPER_ADMIN', true, CURRENT_TIMESTAMP)
        RETURNING id, email, full_name, user_level, role, is_active;
      `;
      const result = await query(text, [email, fullName]);
      console.log(`✅ Super admin auto-created: ${email}`);
      return res.json(result.rows[0]);
    }
    
    // Non-registered user - return null to indicate no access
    console.log(`⚠️ Login attempt by non-registered user: ${email} (${fullName})`);
    res.status(403).json({ 
      error: 'Not registered', 
      message: 'Your account is not registered in the system. Please contact your administrator for access.',
      email: email
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user data' });
  }
});

// Get pending users (inactive users awaiting approval)
app.get('/api/users/pending', verifyToken, async (req, res) => {
  try {
    const text = `
      SELECT id, email, full_name, user_level, created_at
      FROM users
      WHERE is_active = false
      ORDER BY created_at DESC
    `;
    const result = await query(text);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Activate a user (approve registration)
app.post('/api/users/:id/activate', verifyToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if requesting user has permission (L1 or SUPER_ADMIN)
    const requester = await query('SELECT user_level FROM users WHERE email = $1', [req.user.email]);
    if (requester.rows.length === 0 || !['L1', 'SUPER_ADMIN'].includes(requester.rows[0].user_level)) {
      return res.status(403).json({ error: 'Unauthorized: Only L1 and Super Admins can activate users' });
    }
    
    const text = `
      UPDATE users
      SET is_active = true,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, full_name, user_level, is_active
    `;
    const result = await query(text, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`✅ User activated: ${result.rows[0].email} by ${req.user.email}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Project Standards endpoint
app.get('/api/project-standards', async (req, res) => {
  try {
    const applicationTypes = await query(
      'SELECT DISTINCT value FROM project_standards WHERE category = $1 AND is_active = true ORDER BY value',
      ['application_type']
    );
    const residentialTypes = await query(
      'SELECT DISTINCT value FROM project_standards WHERE category = $1 AND is_active = true ORDER BY value',
      ['residential_type']
    );
    const flatTypes = await query(
      'SELECT DISTINCT value FROM project_standards WHERE category = $1 AND is_active = true ORDER BY value',
      ['flat_type']
    );
    const buildingTypes = await query(
      'SELECT DISTINCT value FROM project_standards WHERE category = $1 AND is_active = true ORDER BY value',
      ['building_type']
    );

    res.json({
      applicationTypes: applicationTypes.rows.map(r => r.value),
      residentialTypes: residentialTypes.rows.map(r => r.value),
      flatTypes: flatTypes.rows.map(r => r.value),
      buildingTypes: buildingTypes.rows.map(r => r.value),
    });
  } catch (error) {
    console.error('Error fetching standards:', error);
    res.status(500).json({ error: 'Failed to fetch standards' });
  }
});

// Get all standards (with all details) - for admin management
app.get('/api/project-standards-all', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, category, value, description, is_active FROM project_standards ORDER BY category, value'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all standards:', error.message, error.code);
    res.status(500).json({ error: 'Failed to fetch standards', details: error.message });
  }
});

// Add new standard
app.post('/api/project-standards', async (req, res) => {
  const { category, value, description } = req.body;
  
  try {
    const result = await query(
      'INSERT INTO project_standards (category, value, description, is_active) VALUES ($1, $2, $3, true) RETURNING *',
      [category, value, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding standard:', error);
    // PostgreSQL unique constraint violation error code is 23505
    if (error.code === '23505') {
      res.status(400).json({ error: 'This option already exists in this category' });
    } else {
      res.status(500).json({ error: 'Failed to add standard', details: error.message });
    }
  }
});

// Update standard
app.patch('/api/project-standards/:id', async (req, res) => {
  const { id } = req.params;
  const { value, description, is_active } = req.body;
  
  try {
    let updateQuery = 'UPDATE project_standards SET ';
    const params = [];
    const updates = [];
    
    if (value !== undefined) {
      updates.push(`value = $${params.length + 1}`);
      params.push(value);
    }
    if (description !== undefined) {
      updates.push(`description = $${params.length + 1}`);
      params.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${params.length + 1}`);
      params.push(is_active);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateQuery += updates.join(', ') + ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);
    
    const result = await query(updateQuery, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Standard not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating standard:', error.message, error.code);
    res.status(500).json({ error: 'Failed to update standard', details: error.message });
  }
});

// Delete standard
// Delete standard
app.delete('/api/project-standards/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query('DELETE FROM project_standards WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Standard not found' });
    }
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting standard:', error.message, error.code);
    res.status(500).json({ error: 'Failed to delete standard', details: error.message });
  }
});

// ============================================================================
// Project Standards Documents Endpoints
// ============================================================================

// Upload a standards document (PDF)
app.post('/api/project-standards-documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { category, description, projectId } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Upload to Google Cloud Storage or local storage
    let fileUrl;
    if (isStorageConfigured()) {
      fileUrl = await uploadToGCS(req.file, 'standards-documents');
    } else {
      // For development without GCS, store file info (in production, this should always use GCS)
      fileUrl = `/uploads/standards-documents/${req.file.filename || Date.now()}_${req.file.originalname}`;
    }

    // Get user info from request (if authenticated)
    const userEmail = req.user?.email || req.headers['x-dev-user-email'];
    let uploadedById = null;
    
    if (userEmail) {
      const userResult = await query('SELECT id FROM users WHERE email = $1', [userEmail]);
      if (userResult.rows.length > 0) {
        uploadedById = userResult.rows[0].id;
      }
    }

    // Insert document record
    const result = await query(
      `INSERT INTO project_standards_documents 
       (project_id, document_name, category, file_url, file_size, file_type, uploaded_by_id, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        projectId || null,
        req.file.originalname,
        category,
        fileUrl,
        req.file.size,
        req.file.mimetype,
        uploadedById,
        description || null
      ]
    );

    res.json({
      success: true,
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading standards document:', error);
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
});

// Get all standards documents (optionally filtered by category or project)
app.get('/api/project-standards-documents', async (req, res) => {
  try {
    const { category, projectId } = req.query;
    
    let queryText = `
      SELECT psd.*, u.full_name as uploaded_by_name 
      FROM project_standards_documents psd
      LEFT JOIN users u ON psd.uploaded_by_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (category) {
      params.push(category);
      queryText += ` AND psd.category = $${params.length}`;
    }
    
    if (projectId) {
      params.push(projectId);
      queryText += ` AND (psd.project_id = $${params.length} OR psd.project_id IS NULL)`;
    }
    
    queryText += ' ORDER BY psd.category, psd.created_at DESC';
    
    const result = await query(queryText, params);
    
    // Group by category
    const documentsByCategory = result.rows.reduce((acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    }, {});
    
    res.json({
      documents: result.rows,
      documentsByCategory
    });
  } catch (error) {
    console.error('Error fetching standards documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Delete a standards document
app.delete('/api/project-standards-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get document info before deletion (to delete file from storage)
    const docResult = await query('SELECT * FROM project_standards_documents WHERE id = $1', [id]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = docResult.rows[0];
    
    // Delete from storage if using GCS
    if (isStorageConfigured() && document.file_url) {
      try {
        await deleteFromGCS(document.file_url);
      } catch (storageError) {
        console.warn('Warning: Failed to delete file from storage:', storageError.message);
      }
    }
    
    // Delete from database
    await query('DELETE FROM project_standards_documents WHERE id = $1', [id]);
    
    res.json({ success: true, id: parseInt(id) });
  } catch (error) {
    console.error('Error deleting standards document:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

// Get document categories
app.get('/api/project-standards-documents/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'company_policies', label: 'Company Policies' },
      { value: 'local_bylaws', label: 'Local Bylaws' },
      { value: 'is_codes', label: 'IS Codes' },
      { value: 'nbc_codes', label: 'NBC Codes' },
      { value: 'design_standards', label: 'Design Standards' },
      { value: 'safety_regulations', label: 'Safety Regulations' },
      { value: 'material_specs', label: 'Material Specifications' },
      { value: 'other', label: 'Other Documents' }
    ];
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching document categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  const { name, location, latitude, longitude, state, buildings, societies, assignedLeadId, projectCategory, userEmail } = req.body;
  const buildingsList = Array.isArray(buildings) ? buildings : [];
  const societiesList = Array.isArray(societies) ? societies : [];

  try {
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    console.log('📝 Creating project:', { name, location, buildingCount: buildingsList.length, assignedLeadId });

    // Create project with optional assigned lead
    const projectResult = await query(
      `INSERT INTO projects (name, description, state, lifecycle_stage, start_date, target_completion_date, assigned_lead_id, project_category)
       VALUES ($1, $2, $3, 'Concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', $4, $5)
       RETURNING id`,
      [name, location, state || null, assignedLeadId || null, projectCategory || null]
    );

    const projectId = projectResult.rows[0].id;

    // Insert societies
    const societyIdMap = {};
    if (societiesList.length > 0) {
      const societyRows = societiesList.map(society => ([
        projectId,
        society.name,
        society.description || null
      ]));
      const societyInsert = buildBulkInsert(societyRows, 3);
      const societyResult = await query(
        `INSERT INTO societies (project_id, name, description)
         VALUES ${societyInsert.placeholders}
         RETURNING id, name`,
        societyInsert.values
      );
      societyResult.rows.forEach(row => {
        societyIdMap[row.name] = row.id;
      });
      societiesList.forEach(society => {
        if (society.id !== undefined && societyIdMap[society.name]) {
          societyIdMap[society.id] = societyIdMap[society.name];
        }
      });
    }

    // First pass: Insert all buildings without twin relationships
    const buildingIdMap = {}; // Map building names to their database IDs
    for (const building of buildingsList) {
      const buildingResult = await query(
        `INSERT INTO buildings (
          project_id, name, application_type, location_latitude, location_longitude, 
          residential_type, villa_type, villa_count, building_type,
          society_id,
          gf_entrance_lobby,
          pool_volume, has_lift, lift_name, lift_passenger_capacity,
          car_parking_count_per_floor, car_parking_area, two_wheeler_parking_count, 
          two_wheeler_parking_area, ev_parking_percentage, shop_count, shop_area,
          office_count, office_area, common_area, twin_of_building_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
         RETURNING id`,
        [
          projectId, 
          building.name, 
          building.applicationType, 
          latitude && latitude !== '' ? latitude : null, 
          longitude && longitude !== '' ? longitude : null, 
          building.residentialType || null, 
          building.villaType || null, 
          building.villaCount && building.villaCount !== '' ? building.villaCount : null,
          building.buildingType || null,
          societyIdMap[building.societyId] || societyIdMap[building.societyName] || null,
          building.gfEntranceLobby && building.gfEntranceLobby !== '' ? building.gfEntranceLobby : null,
          building.poolVolume && building.poolVolume !== '' ? building.poolVolume : null,
          building.hasLift || false,
          building.liftName || null,
          building.liftPassengerCapacity && building.liftPassengerCapacity !== '' ? building.liftPassengerCapacity : null,
          building.carParkingCountPerFloor && building.carParkingCountPerFloor !== '' ? building.carParkingCountPerFloor : null,
          building.carParkingArea && building.carParkingArea !== '' ? building.carParkingArea : null,
          building.twoWheelerParkingCount && building.twoWheelerParkingCount !== '' ? building.twoWheelerParkingCount : null,
          building.twoWheelerParkingArea && building.twoWheelerParkingArea !== '' ? building.twoWheelerParkingArea : null,
          building.evParkingPercentage && building.evParkingPercentage !== '' ? building.evParkingPercentage : null,
          building.shopCount && building.shopCount !== '' ? building.shopCount : null,
          building.shopArea && building.shopArea !== '' ? building.shopArea : null,
          building.officeCount && building.officeCount !== '' ? building.officeCount : null,
          building.officeArea && building.officeArea !== '' ? building.officeArea : null,
          building.commonArea && building.commonArea !== '' ? building.commonArea : null,
          null // Set twin_of_building_id to null initially
        ]
      );

      const buildingId = buildingResult.rows[0].id;
      buildingIdMap[building.name] = buildingId;

      // First pass: Insert all floors without twin relationships
      const floorIdMap = {};
      const floorsList = Array.isArray(building.floors) ? building.floors : [];
      const floorRows = floorsList.map(floor => {
        const floorHeightValue = floor.floorHeight === '' || floor.floorHeight === undefined
          ? null
          : floor.floorHeight ?? floor.floor_height ?? null;
        const typicalLobbyValue = (floor.typicalLobbyArea !== undefined && floor.typicalLobbyArea !== '' && floor.typicalLobbyArea !== null)
          ? parseFloat(floor.typicalLobbyArea)
          : (floor.typical_lobby_area !== undefined && floor.typical_lobby_area !== '' && floor.typical_lobby_area !== null)
            ? parseFloat(floor.typical_lobby_area)
            : null;
        return [
          buildingId,
          floor.floorNumber,
          floor.floorName,
          floorHeightValue,
          typicalLobbyValue,
          null
        ];
      });

      if (floorRows.length > 0) {
        const { placeholders, values } = buildBulkInsert(floorRows, 6);
        const floorResult = await query(
          `INSERT INTO floors (building_id, floor_number, floor_name, floor_height, typical_lobby_area, twin_of_floor_id)
           VALUES ${placeholders}
           RETURNING id, floor_name`,
          values
        );

        floorResult.rows.forEach(row => {
          floorIdMap[row.floor_name] = row.id;
        });

        const flatRows = [];
        for (const floor of floorsList) {
          const floorId = floorIdMap[floor.floorName];
          if (!floorId) continue;
          const flatsList = Array.isArray(floor.flats) ? floor.flats : [];
          flatsList.forEach(flat => {
            flatRows.push([
              floorId,
              flat.type || null,
              flat.area && flat.area !== '' ? parseFloat(flat.area) : null,
              flat.count && flat.count !== '' ? parseInt(flat.count) : null
            ]);
          });
        }

        if (flatRows.length > 0) {
          const flatInsert = buildBulkInsert(flatRows, 4);
          await query(
            `INSERT INTO flats (floor_id, flat_type, area_sqft, number_of_flats)
             VALUES ${flatInsert.placeholders}`,
            flatInsert.values
          );
        }
      }

      // Second pass: Update twin relationships
      for (const floor of floorsList) {
        if (floor.twinOfFloorName && floorIdMap[floor.twinOfFloorName]) {
          await query(
            `UPDATE floors SET twin_of_floor_id = $1 WHERE id = $2`,
            [floorIdMap[floor.twinOfFloorName], floorIdMap[floor.floorName]]
          );
        }
      }
    }

    // Second pass: Update building twin relationships
    for (const building of buildingsList) {
      if (building.twinOfBuildingName && buildingIdMap[building.twinOfBuildingName]) {
        await query(
          `UPDATE buildings SET twin_of_building_id = $1 WHERE id = $2`,
          [buildingIdMap[building.twinOfBuildingName], buildingIdMap[building.name]]
        );
      }
    }

    res.json({ id: projectId, message: 'Project created successfully' });
  } catch (error) {
    console.error('Error creating project:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

// Update project - PATCH endpoint
app.patch('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, latitude, longitude, state, buildings, societies, assignedLeadId, projectCategory } = req.body;
  const buildingsList = Array.isArray(buildings) ? buildings : [];
  const societiesList = Array.isArray(societies) ? societies : [];

  console.log('🔄 PATCH /api/projects/:id called', { id, name, buildingCount: buildingsList.length, assignedLeadId });

  try {
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    console.log('📝 Updating project:', { id, name, location, buildingCount: buildingsList.length, assignedLeadId });

    // Update project basic info including assigned lead
    await query(
      `UPDATE projects 
       SET name = $1, description = $2, state = $3, assigned_lead_id = $4, project_category = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [name, location, state || null, assignedLeadId || null, projectCategory || null, id]
    );

    // Delete existing buildings, floors, and flats (cascade will handle related records)
    await query('DELETE FROM buildings WHERE project_id = $1', [id]);
    await query('DELETE FROM societies WHERE project_id = $1', [id]);

    const societyIdMap = {};
    if (societiesList.length > 0) {
      const societyRows = societiesList.map(society => ([
        id,
        society.name,
        society.description || null
      ]));
      const societyInsert = buildBulkInsert(societyRows, 3);
      const societyResult = await query(
        `INSERT INTO societies (project_id, name, description)
         VALUES ${societyInsert.placeholders}
         RETURNING id, name`,
        societyInsert.values
      );
      societyResult.rows.forEach(row => {
        societyIdMap[row.name] = row.id;
      });
      societiesList.forEach(society => {
        if (society.id !== undefined && societyIdMap[society.name]) {
          societyIdMap[society.id] = societyIdMap[society.name];
        }
      });
    }

    // First pass: Insert all buildings without twin relationships
    const buildingIdMap = {};
    for (const building of buildingsList) {
      const buildingResult = await query(
        `INSERT INTO buildings (
          project_id, name, application_type, location_latitude, location_longitude, 
          residential_type, villa_type, villa_count, building_type,
          society_id,
          gf_entrance_lobby,
          pool_volume, has_lift, lift_name, lift_passenger_capacity,
          car_parking_count_per_floor, car_parking_area, two_wheeler_parking_count, 
          two_wheeler_parking_area, ev_parking_percentage, shop_count, shop_area,
          office_count, office_area, common_area, twin_of_building_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
         RETURNING id`,
        [
          id, 
          building.name, 
          building.applicationType, 
          building.latitude && building.latitude !== '' ? parseFloat(building.latitude) : null, 
          building.longitude && building.longitude !== '' ? parseFloat(building.longitude) : null, 
          building.residentialType || null, 
          building.villaType || null, 
          building.villaCount && building.villaCount !== '' ? parseInt(building.villaCount) : null,
          building.buildingType || null,
          societyIdMap[building.societyId] || societyIdMap[building.societyName] || null,
          building.gfEntranceLobby && building.gfEntranceLobby !== '' ? building.gfEntranceLobby : null,
          building.poolVolume && building.poolVolume !== '' ? parseFloat(building.poolVolume) : null,
          building.hasLift || false,
          building.liftName || null,
          building.liftPassengerCapacity && building.liftPassengerCapacity !== '' ? parseInt(building.liftPassengerCapacity) : null,
          building.carParkingCountPerFloor && building.carParkingCountPerFloor !== '' ? parseInt(building.carParkingCountPerFloor) : null,
          building.carParkingArea && building.carParkingArea !== '' ? parseFloat(building.carParkingArea) : null,
          building.twoWheelerParkingCount && building.twoWheelerParkingCount !== '' ? parseInt(building.twoWheelerParkingCount) : null,
          building.twoWheelerParkingArea && building.twoWheelerParkingArea !== '' ? parseFloat(building.twoWheelerParkingArea) : null,
          building.evParkingPercentage && building.evParkingPercentage !== '' ? parseFloat(building.evParkingPercentage) : null,
          building.shopCount && building.shopCount !== '' ? parseInt(building.shopCount) : null,
          building.shopArea && building.shopArea !== '' ? parseFloat(building.shopArea) : null,
          building.officeCount && building.officeCount !== '' ? parseInt(building.officeCount) : null,
          building.officeArea && building.officeArea !== '' ? parseFloat(building.officeArea) : null,
          building.commonArea && building.commonArea !== '' ? parseFloat(building.commonArea) : null,
          null // Set twin_of_building_id to null initially
        ]
      );

      const buildingId = buildingResult.rows[0].id;
      buildingIdMap[building.name] = buildingId;

      // First pass: Insert all floors without twin relationships
      const floorIdMap = {};
      const floorsList = Array.isArray(building.floors) ? building.floors : [];
      const floorRows = floorsList.map(floor => {
        const floorHeightValue = floor.floorHeight === '' || floor.floorHeight === undefined
          ? null
          : floor.floorHeight ?? floor.floor_height ?? null;
        const typicalLobbyValue = (floor.typicalLobbyArea !== undefined && floor.typicalLobbyArea !== '' && floor.typicalLobbyArea !== null)
          ? parseFloat(floor.typicalLobbyArea)
          : (floor.typical_lobby_area !== undefined && floor.typical_lobby_area !== '' && floor.typical_lobby_area !== null)
            ? parseFloat(floor.typical_lobby_area)
            : null;
        return [
          buildingId,
          floor.floorNumber,
          floor.floorName,
          floorHeightValue,
          typicalLobbyValue,
          null
        ];
      });

      if (floorRows.length > 0) {
        const { placeholders, values } = buildBulkInsert(floorRows, 6);
        const floorResult = await query(
          `INSERT INTO floors (building_id, floor_number, floor_name, floor_height, typical_lobby_area, twin_of_floor_id)
           VALUES ${placeholders}
           RETURNING id, floor_name`,
          values
        );

        floorResult.rows.forEach(row => {
          floorIdMap[row.floor_name] = row.id;
        });

        const flatRows = [];
        for (const floor of floorsList) {
          const floorId = floorIdMap[floor.floorName];
          if (!floorId) continue;
          const flatsList = Array.isArray(floor.flats) ? floor.flats : [];
          flatsList.forEach(flat => {
            flatRows.push([
              floorId,
              flat.type || null,
              flat.area && flat.area !== '' ? parseFloat(flat.area) : null,
              flat.count && flat.count !== '' ? parseInt(flat.count) : null
            ]);
          });
        }

        if (flatRows.length > 0) {
          const flatInsert = buildBulkInsert(flatRows, 4);
          await query(
            `INSERT INTO flats (floor_id, flat_type, area_sqft, number_of_flats)
             VALUES ${flatInsert.placeholders}`,
            flatInsert.values
          );
        }
      }

      // Second pass: Update twin relationships
      for (const floor of floorsList) {
        if (floor.twinOfFloorName && floorIdMap[floor.twinOfFloorName]) {
          await query(
            `UPDATE floors SET twin_of_floor_id = $1 WHERE id = $2`,
            [floorIdMap[floor.twinOfFloorName], floorIdMap[floor.floorName]]
          );
        }
      }
    }

    // Second pass: Update building twin relationships
    for (const building of buildingsList) {
      if (building.twinOfBuildingName && buildingIdMap[building.twinOfBuildingName]) {
        await query(
          `UPDATE buildings SET twin_of_building_id = $1 WHERE id = $2`,
          [buildingIdMap[building.twinOfBuildingName], buildingIdMap[building.name]]
        );
      }
    }

    res.json({ id, message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to update project', details: error.message });
  }
});

// Delete project (L0 and SUPER_ADMIN only)
app.delete('/api/projects/:id', verifyToken, requireRole('SUPER_ADMIN', 'L0'), async (req, res) => {
  const { id } = req.params;

  try {
    const projectResult = await query('SELECT id, name FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Fetch full project with hierarchy
app.get('/api/projects/:id/full', async (req, res) => {
  const { id } = req.params;

  try {
    // Query 1: Get project
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    // Query 2: Get societies
    const societiesResult = await query(
      'SELECT * FROM societies WHERE project_id = $1 ORDER BY name',
      [id]
    );

    // Query 3: Get all buildings at once
    const buildingsResult = await query(
      `SELECT buildings.*, societies.name AS society_name
       FROM buildings
       LEFT JOIN societies ON societies.id = buildings.society_id
       WHERE buildings.project_id = $1
       ORDER BY buildings.id`,
      [id]
    );

    // Query 4: Get all floors for all buildings at once
    const floorsResult = await query(
      `SELECT floors.* FROM floors
       INNER JOIN buildings ON floors.building_id = buildings.id
       WHERE buildings.project_id = $1
       ORDER BY floors.building_id, floors.floor_number`,
      [id]
    );

    // Query 5: Get all flats for all floors at once
    const flatsResult = await query(
      `SELECT flats.* FROM flats
       INNER JOIN floors ON flats.floor_id = floors.id
       INNER JOIN buildings ON floors.building_id = buildings.id
       WHERE buildings.project_id = $1
       ORDER BY flats.floor_id`,
      [id]
    );

    // Build societies array
    const societies = societiesResult.rows.map(society => ({
      id: society.id,
      name: society.name,
      description: society.description,
      project_id: society.project_id
    }));

    // Create lookup maps
    const buildingIdToNameMap = {};
    buildingsResult.rows.forEach(b => {
      buildingIdToNameMap[b.id] = b.name;
    });

    const floorIdToNameMap = {};
    floorsResult.rows.forEach(f => {
      floorIdToNameMap[f.id] = f.floor_name;
    });

    // Group flats by floor_id
    const flatsByFloorId = {};
    flatsResult.rows.forEach(flat => {
      if (!flatsByFloorId[flat.floor_id]) {
        flatsByFloorId[flat.floor_id] = [];
      }
      flatsByFloorId[flat.floor_id].push({
        id: flat.id,
        type: flat.flat_type,
        area: flat.area_sqft,
        count: flat.number_of_flats,
        flat_type: flat.flat_type,
        area_sqft: flat.area_sqft,
        number_of_flats: flat.number_of_flats,
      });
    });

    // Group floors by building_id
    const floorsByBuildingId = {};
    floorsResult.rows.forEach(floor => {
      if (!floorsByBuildingId[floor.building_id]) {
        floorsByBuildingId[floor.building_id] = [];
      }
      floorsByBuildingId[floor.building_id].push({
        id: floor.id,
        floorNumber: floor.floor_number,
        floorName: floor.floor_name,
        floorHeight: floor.floor_height,
        typicalLobbyArea: floor.typical_lobby_area,
        twinOfFloorId: floor.twin_of_floor_id,
        twinOfFloorName: floor.twin_of_floor_id ? floorIdToNameMap[floor.twin_of_floor_id] : null,
        floor_number: floor.floor_number,
        floor_name: floor.floor_name,
        floor_height: floor.floor_height,
        typical_lobby_area: floor.typical_lobby_area,
        twin_of_floor_id: floor.twin_of_floor_id,
        flats: flatsByFloorId[floor.id] || [],
      });
    });

    // Build buildings array
    const buildings = buildingsResult.rows.map(building => ({
      id: building.id,
      name: building.name,
      applicationType: building.application_type,
      application_type: building.application_type,
      residentialType: building.residential_type,
      villaType: building.villa_type,
      villaCount: building.villa_count,
      isTwin: building.is_twin,
      twinOfBuildingId: building.twin_of_building_id,
      twinOfBuildingName: building.twin_of_building_id ? buildingIdToNameMap[building.twin_of_building_id] : null,
      twin_of_building_id: building.twin_of_building_id,
      societyId: building.society_id,
      society_id: building.society_id,
      societyName: building.society_name,
      gfEntranceLobby: building.gf_entrance_lobby,
      gf_entrance_lobby: building.gf_entrance_lobby,
      floors: floorsByBuildingId[building.id] || [],
    }));

    res.json({
      id: project.id,
      name: project.name,
      location: project.description,
      description: project.description,
      completion_percentage: project.completion_percentage,
      floors_completed: project.floors_completed,
      total_floors: project.total_floors,
      material_stock_percentage: project.material_stock_percentage,
      mep_status: project.mep_status,
      lifecycle_stage: project.lifecycle_stage,
      assigned_lead_name: project.lead_name,
      start_date: project.created_at,
      target_completion_date: project.created_at,
      status: project.project_status,
      latitude: buildingsResult.rows[0]?.location_latitude || '',
      longitude: buildingsResult.rows[0]?.location_longitude || '',
      buildings,
      societies,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// ============= SITE AREAS ENDPOINTS =============
// Endpoints for managing landscape, amenities, parking, and external infrastructure

// Get all site areas for a project
app.get('/api/projects/:id/site-areas', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      'SELECT * FROM site_areas WHERE project_id = $1 ORDER BY area_type, name',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching site areas:', error);
    res.status(500).json({ error: 'Failed to fetch site areas' });
  }
});

// Get a single site area
app.get('/api/site-areas/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query('SELECT * FROM site_areas WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site area not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching site area:', error);
    res.status(500).json({ error: 'Failed to fetch site area' });
  }
});

// Create a new site area
app.post('/api/projects/:projectId/site-areas', async (req, res) => {
  const { projectId } = req.params;
  const {
    area_type,
    name,
    description,
    area_sqm,
    water_volume_cum,
    softscape_area_sqm,
    requires_water,
    water_connection_points,
    estimated_water_demand,
    requires_electrical,
    electrical_load_kw,
    lighting_points,
    power_points,
    has_ev_charging,
    ev_charging_points,
    requires_drainage,
    drainage_type,
    requires_hvac,
    hvac_capacity_tr,
    requires_fire_fighting,
    fire_hydrant_points,
    sprinkler_required,
    irrigation_type,
    landscape_category,
    amenity_type,
    capacity_persons,
    operational_hours,
    parking_type,
    car_spaces,
    bike_spaces,
    infrastructure_type,
    equipment_details,
    capacity_rating,
    location_description,
    notes
  } = req.body;
  
  try {
    if (
      area_type === 'landscape' &&
      softscape_area_sqm !== null &&
      softscape_area_sqm !== undefined &&
      area_sqm !== null &&
      area_sqm !== undefined &&
      Number(softscape_area_sqm) > Number(area_sqm)
    ) {
      return res.status(400).json({
        error: 'Softscape area cannot exceed total landscape area.'
      });
    }

    const result = await query(
      `INSERT INTO site_areas (
        project_id, area_type, name, description, area_sqm,
        water_volume_cum,
        softscape_area_sqm,
        requires_water, water_connection_points, estimated_water_demand,
        requires_electrical, electrical_load_kw, lighting_points, power_points,
        has_ev_charging, ev_charging_points,
        requires_drainage, drainage_type,
        requires_hvac, hvac_capacity_tr,
        requires_fire_fighting, fire_hydrant_points, sprinkler_required,
        irrigation_type, landscape_category,
        amenity_type, capacity_persons, operational_hours,
        parking_type, car_spaces, bike_spaces,
        infrastructure_type, equipment_details, capacity_rating,
        location_description, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36
      ) RETURNING *`,
      [
        projectId, area_type, name, description, area_sqm,
        water_volume_cum,
        softscape_area_sqm,
        requires_water, water_connection_points, estimated_water_demand,
        requires_electrical, electrical_load_kw, lighting_points, power_points,
        has_ev_charging, ev_charging_points,
        requires_drainage, drainage_type,
        requires_hvac, hvac_capacity_tr,
        requires_fire_fighting, fire_hydrant_points, sprinkler_required,
        irrigation_type, landscape_category,
        amenity_type, capacity_persons, operational_hours,
        parking_type, car_spaces, bike_spaces,
        infrastructure_type, equipment_details, capacity_rating,
        location_description, notes
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating site area:', error);
    res.status(500).json({ error: 'Failed to create site area' });
  }
});

// Update a site area
app.put('/api/site-areas/:id', async (req, res) => {
  const { id } = req.params;
  const {
    area_type,
    name,
    description,
    area_sqm,
    water_volume_cum,
    softscape_area_sqm,
    requires_water,
    water_connection_points,
    estimated_water_demand,
    requires_electrical,
    electrical_load_kw,
    lighting_points,
    power_points,
    has_ev_charging,
    ev_charging_points,
    requires_drainage,
    drainage_type,
    requires_hvac,
    hvac_capacity_tr,
    requires_fire_fighting,
    fire_hydrant_points,
    sprinkler_required,
    irrigation_type,
    landscape_category,
    amenity_type,
    capacity_persons,
    operational_hours,
    parking_type,
    car_spaces,
    bike_spaces,
    infrastructure_type,
    equipment_details,
    capacity_rating,
    location_description,
    notes
  } = req.body;
  
  try {
    if (
      area_type === 'landscape' &&
      softscape_area_sqm !== null &&
      softscape_area_sqm !== undefined &&
      area_sqm !== null &&
      area_sqm !== undefined &&
      Number(softscape_area_sqm) > Number(area_sqm)
    ) {
      return res.status(400).json({
        error: 'Softscape area cannot exceed total landscape area.'
      });
    }

    const result = await query(
      `UPDATE site_areas SET
        area_type = $1, name = $2, description = $3, area_sqm = $4,
        water_volume_cum = $5,
        softscape_area_sqm = $6,
        requires_water = $7, water_connection_points = $8, estimated_water_demand = $9,
        requires_electrical = $10, electrical_load_kw = $11, lighting_points = $12,
        power_points = $13, has_ev_charging = $14, ev_charging_points = $15,
        requires_drainage = $16, drainage_type = $17,
        requires_hvac = $18, hvac_capacity_tr = $19,
        requires_fire_fighting = $20, fire_hydrant_points = $21, sprinkler_required = $22,
        irrigation_type = $23, landscape_category = $24,
        amenity_type = $25, capacity_persons = $26, operational_hours = $27,
        parking_type = $28, car_spaces = $29, bike_spaces = $30,
        infrastructure_type = $31, equipment_details = $32, capacity_rating = $33,
        location_description = $34, notes = $35,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $36
      RETURNING *`,
      [
        area_type, name, description, area_sqm,
        water_volume_cum,
        softscape_area_sqm,
        requires_water, water_connection_points, estimated_water_demand,
        requires_electrical, electrical_load_kw, lighting_points, power_points,
        has_ev_charging, ev_charging_points,
        requires_drainage, drainage_type,
        requires_hvac, hvac_capacity_tr,
        requires_fire_fighting, fire_hydrant_points, sprinkler_required,
        irrigation_type, landscape_category,
        amenity_type, capacity_persons, operational_hours,
        parking_type, car_spaces, bike_spaces,
        infrastructure_type, equipment_details, capacity_rating,
        location_description, notes,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site area not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating site area:', error);
    res.status(500).json({ error: 'Failed to update site area' });
  }
});

// Delete a site area
app.delete('/api/site-areas/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query('DELETE FROM site_areas WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site area not found' });
    }
    
    res.json({ message: 'Site area deleted successfully', deletedArea: result.rows[0] });
  } catch (error) {
    console.error('Error deleting site area:', error);
    res.status(500).json({ error: 'Failed to delete site area' });
  }
});

// Get site areas summary for a project (for calculations)
app.get('/api/projects/:id/site-areas/summary', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query(
      `SELECT 
        area_type,
        COUNT(*) as count,
        SUM(area_sqm) as total_area_sqm,
        SUM(softscape_area_sqm) as total_softscape_area_sqm,
        SUM(CASE WHEN requires_water THEN estimated_water_demand ELSE 0 END) as total_water_demand,
        SUM(CASE WHEN requires_electrical THEN electrical_load_kw ELSE 0 END) as total_electrical_load,
        SUM(lighting_points) as total_lighting_points,
        SUM(power_points) as total_power_points,
        SUM(CASE WHEN has_ev_charging THEN ev_charging_points ELSE 0 END) as total_ev_charging_points
      FROM site_areas
      WHERE project_id = $1
      GROUP BY area_type`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching site areas summary:', error);
    res.status(500).json({ error: 'Failed to fetch site areas summary' });
  }
});

// ============= RFI ENDPOINTS =============

// Create new RFI
app.post('/api/rfi', async (req, res) => {
  const {
    projectId,
    projectName,
    recordNo,
    revision,
    dateRaised,
    disciplines,
    rfiSubject,
    rfiDescription,
    attachmentUrls,
    raisedBy,
    raisedByEmail,
    projectTeamResponse,
    designTeamResponse,
  } = req.body;

  try {
    // Generate RFI reference number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countResult = await query(
      'SELECT COUNT(*) as count FROM requests_for_information WHERE rfi_ref_no LIKE $1',
      [`RFI-${datePrefix}%`]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const rfiRefNo = `RFI-${datePrefix}-${String(count).padStart(3, '0')}`;

    const result = await query(
      `INSERT INTO requests_for_information (
        project_id, rfi_ref_no, project_name, record_no, revision, date_raised,
        disciplines, rfi_subject, rfi_description, attachment_urls,
        raised_by, raised_by_email, project_team_response, design_team_response,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        projectId,
        rfiRefNo,
        projectName,
        recordNo,
        revision,
        dateRaised,
        JSON.stringify(disciplines),
        rfiSubject,
        rfiDescription,
        JSON.stringify(attachmentUrls || []),
        raisedBy,
        raisedByEmail,
        JSON.stringify(projectTeamResponse || []),
        JSON.stringify(designTeamResponse || []),
        'Pending',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating RFI:', error);
    res.status(500).json({ error: 'Failed to create RFI' });
  }
});

// Get all RFIs (with optional filters)
app.get('/api/rfi', async (req, res) => {
  const { status, projectId } = req.query;

  try {
    let queryText = `SELECT r.*, u.full_name as raised_by_name, au.full_name as assigned_to_name
      FROM requests_for_information r
      LEFT JOIN users u ON u.id = r.raised_by_id
      LEFT JOIN users au ON au.id = r.assigned_to_id
      WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'All') {
      queryText += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (projectId) {
      queryText += ` AND r.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    queryText += ' ORDER BY r.created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching RFIs:', error);
    res.status(500).json({ error: 'Failed to fetch RFIs' });
  }
});

// Get single RFI by ID
app.get('/api/rfi/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT r.*, p.name as project_name,
              u.full_name as raised_by_name,
              au.full_name as assigned_to_name,
              abu.full_name as assigned_by_name
       FROM requests_for_information r
       LEFT JOIN projects p ON p.id = r.project_id
       LEFT JOIN users u ON u.id = r.raised_by_id
       LEFT JOIN users au ON au.id = r.assigned_to_id
       LEFT JOIN users abu ON abu.id = r.assigned_by_id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RFI not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching RFI:', error);
    res.status(500).json({ error: 'Failed to fetch RFI' });
  }
});

// Update RFI
app.patch('/api/rfi/:id', async (req, res) => {
  const { id } = req.params;
  const {
    status,
    projectTeamResponse,
    designTeamResponse,
    rfiDescription,
  } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (projectTeamResponse) {
      updates.push(`project_team_response = $${paramIndex}`);
      params.push(JSON.stringify(projectTeamResponse));
      paramIndex++;
    }

    if (designTeamResponse) {
      updates.push(`design_team_response = $${paramIndex}`);
      params.push(JSON.stringify(designTeamResponse));
      paramIndex++;
    }

    if (rfiDescription) {
      updates.push(`rfi_description = $${paramIndex}`);
      params.push(rfiDescription);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(
      `UPDATE requests_for_information 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RFI not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating RFI:', error);
    res.status(500).json({ error: 'Failed to update RFI' });
  }
});

// Assign RFI to a user
app.patch('/api/rfi/:id/assign', verifyToken, async (req, res) => {
  try {
    const { assigned_to_id, due_date, priority } = req.body;
    const userId = req.user?.userId;

    const result = await query(
      `UPDATE requests_for_information SET
        assigned_to_id = $1, assigned_by_id = $2, assigned_at = CURRENT_TIMESTAMP,
        due_date = COALESCE($3, due_date),
        priority = COALESCE($4, priority),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [assigned_to_id, userId, due_date || null, priority || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'RFI not found' });

    // Notify assignee
    if (assigned_to_id) {
      const rfi = result.rows[0];
      await query(
        `INSERT INTO notifications (user_id, project_id, title, message, notification_type, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, 'todo', 'rfi', $5)`,
        [assigned_to_id, rfi.project_id, 'RFI Assigned', `You have been assigned RFI: ${rfi.rfi_subject || rfi.rfi_ref_no}`, rfi.id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning RFI:', error);
    res.status(500).json({ error: 'Failed to assign RFI' });
  }
});

// Delete RFI
app.delete('/api/rfi/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM requests_for_information WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RFI not found' });
    }

    res.json({ message: 'RFI deleted successfully' });
  } catch (error) {
    console.error('Error deleting RFI:', error);
    res.status(500).json({ error: 'Failed to delete RFI' });
  }
});

// ============= END RFI ENDPOINTS =============

// ============= MAS ENDPOINTS =============

// Create new MAS
app.post('/api/mas', async (req, res) => {
  const {
    projectId,
    materialName,
    materialCategory,
    manufacturer,
    modelSpecification,
    quantity,
    unit,
    submittedByVendor,
    vendorEmail,
    attachmentUrls,
  } = req.body;

  try {
    // Generate MAS reference number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countResult = await query(
      'SELECT COUNT(*) as count FROM material_approval_sheets WHERE mas_ref_no LIKE $1',
      [`MAS-${datePrefix}%`]
    );
    const count = parseInt(countResult.rows[0].count) + 1;
    const masRefNo = `MAS-${datePrefix}-${String(count).padStart(3, '0')}`;

    const result = await query(
      `INSERT INTO material_approval_sheets (
        project_id, mas_ref_no, material_name, material_category, manufacturer,
        model_specification, quantity, unit, submitted_by_vendor, vendor_email,
        attachment_urls, l2_status, l1_status, final_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        projectId,
        masRefNo,
        materialName,
        materialCategory,
        manufacturer,
        modelSpecification,
        quantity,
        unit,
        submittedByVendor,
        vendorEmail,
        JSON.stringify(attachmentUrls || []),
        'Pending',
        'Pending',
        'Pending',
        'Pending',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating MAS:', error);
    res.status(500).json({ error: 'Failed to create MAS' });
  }
});

// Get all MAS (with optional filters)
app.get('/api/mas', async (req, res) => {
  const { status, projectId, l2_status, l1_status } = req.query;

  try {
    let queryText = `SELECT m.*, 
      au.full_name as assigned_to_name
      FROM material_approval_sheets m
      LEFT JOIN users au ON m.assigned_to_id = au.id
      WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'All') {
      queryText += ` AND m.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (l2_status && l2_status !== 'All') {
      queryText += ` AND m.l2_status = $${paramIndex}`;
      params.push(l2_status);
      paramIndex++;
    }

    if (l1_status && l1_status !== 'All') {
      queryText += ` AND m.l1_status = $${paramIndex}`;
      params.push(l1_status);
      paramIndex++;
    }

    if (projectId) {
      queryText += ` AND m.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    queryText += ' ORDER BY m.created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching MAS:', error);
    res.status(500).json({ error: 'Failed to fetch MAS' });
  }
});

// Get single MAS by ID
app.get('/api/mas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT m.*, p.name as project_name,
              au.full_name as assigned_to_name,
              abu.full_name as assigned_by_name
       FROM material_approval_sheets m
       LEFT JOIN projects p ON m.project_id = p.id
       LEFT JOIN users au ON au.id = m.assigned_to_id
       LEFT JOIN users abu ON abu.id = m.assigned_by_id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MAS not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching MAS:', error);
    res.status(500).json({ error: 'Failed to fetch MAS' });
  }
});

// Update MAS - L2 Review
app.patch('/api/mas/:id/l2-review', async (req, res) => {
  const { id } = req.params;
  const { status, comments, reviewedBy } = req.body;

  try {
    const result = await query(
      `UPDATE material_approval_sheets 
       SET l2_status = $1, 
           l2_comments = $2, 
           l2_reviewed_by = $3, 
           l2_reviewed_at = CURRENT_TIMESTAMP,
           final_status = CASE 
             WHEN $1 = 'Rejected' THEN 'Rejected'
             WHEN $1 = 'Approved' AND l1_status = 'Approved' THEN 'Approved'
             ELSE 'Pending'
           END,
           status = CASE 
             WHEN $1 = 'Rejected' THEN 'Rejected'
             WHEN $1 = 'Approved' AND l1_status = 'Approved' THEN 'Approved'
             ELSE 'Pending'
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, comments, reviewedBy, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MAS not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating MAS L2 review:', error);
    res.status(500).json({ error: 'Failed to update MAS' });
  }
});

// Update MAS - L1 Review
app.patch('/api/mas/:id/l1-review', async (req, res) => {
  const { id } = req.params;
  const { status, comments, reviewedBy } = req.body;

  try {
    const result = await query(
      `UPDATE material_approval_sheets 
       SET l1_status = $1, 
           l1_comments = $2, 
           l1_reviewed_by = $3, 
           l1_reviewed_at = CURRENT_TIMESTAMP,
           final_status = CASE 
             WHEN $1 = 'Rejected' THEN 'Rejected'
             WHEN $1 = 'Approved' AND l2_status = 'Approved' THEN 'Approved'
             ELSE 'Pending'
           END,
           status = CASE 
             WHEN $1 = 'Rejected' THEN 'Rejected'
             WHEN $1 = 'Approved' AND l2_status = 'Approved' THEN 'Approved'
             ELSE 'Pending'
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, comments, reviewedBy, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MAS not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating MAS L1 review:', error);
    res.status(500).json({ error: 'Failed to update MAS' });
  }
});

// Update MAS general info
app.patch('/api/mas/:id', async (req, res) => {
  const { id } = req.params;
  const {
    materialName,
    materialCategory,
    manufacturer,
    modelSpecification,
    quantity,
    unit,
  } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (materialName) {
      updates.push(`material_name = $${paramIndex}`);
      params.push(materialName);
      paramIndex++;
    }

    if (materialCategory) {
      updates.push(`material_category = $${paramIndex}`);
      params.push(materialCategory);
      paramIndex++;
    }

    if (manufacturer) {
      updates.push(`manufacturer = $${paramIndex}`);
      params.push(manufacturer);
      paramIndex++;
    }

    if (modelSpecification) {
      updates.push(`model_specification = $${paramIndex}`);
      params.push(modelSpecification);
      paramIndex++;
    }

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramIndex}`);
      params.push(quantity);
      paramIndex++;
    }

    if (unit) {
      updates.push(`unit = $${paramIndex}`);
      params.push(unit);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(
      `UPDATE material_approval_sheets 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MAS not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating MAS:', error);
    res.status(500).json({ error: 'Failed to update MAS' });
  }
});

// Delete MAS
app.delete('/api/mas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM material_approval_sheets WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MAS not found' });
    }

    res.json({ message: 'MAS deleted successfully' });
  } catch (error) {
    console.error('Error deleting MAS:', error);
    res.status(500).json({ error: 'Failed to delete MAS' });
  }
});

// Assign MAS to a user
app.patch('/api/mas/:id/assign', verifyToken, async (req, res) => {
  try {
    const { assigned_to_id, due_date } = req.body;
    const userId = req.user?.userId;

    const result = await query(
      `UPDATE material_approval_sheets SET
        assigned_to_id = $1, assigned_by_id = $2, assigned_at = CURRENT_TIMESTAMP,
        due_date = COALESCE($3, due_date),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [assigned_to_id, userId, due_date || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'MAS not found' });

    // Notify assignee
    if (assigned_to_id) {
      const mas = result.rows[0];
      await query(
        `INSERT INTO notifications (user_id, project_id, title, message, notification_type, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, 'todo', 'mas', $5)`,
        [assigned_to_id, mas.project_id, 'MAS Assigned', `You have been assigned MAS: ${mas.material_name || mas.mas_ref_no}`, mas.id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning MAS:', error);
    res.status(500).json({ error: 'Failed to assign MAS' });
  }
});

// ============= END MAS ENDPOINTS =============

// ============= DRAWING SCHEDULE ENDPOINTS =============

// Create a new drawing schedule entry
app.post('/api/drawing-schedules', verifyToken, async (req, res) => {
  try {
    const {
      projectId,
      drawingRefNo,
      discipline,
      drawingTitle,
      drawingType,
      revision,
      plannedSubmissionDate,
      actualSubmissionDate,
      status,
      priority,
      assignedTo,
      remarks,
      attachmentUrls
    } = req.body;

    const userEmail = req.user?.email;

    // Validation
    if (!projectId || !drawingTitle || !drawingRefNo) {
      return res.status(400).json({ error: 'Project ID, Drawing Ref No, and Drawing Title are required' });
    }

    // Check if drawing ref number already exists
    const existingDrawing = await query(
      'SELECT id FROM drawing_schedules WHERE drawing_ref_no = $1',
      [drawingRefNo]
    );

    if (existingDrawing.rows.length > 0) {
      return res.status(400).json({ error: 'Drawing reference number already exists' });
    }

    // Insert new drawing schedule
    const result = await query(
      `INSERT INTO drawing_schedules (
        project_id, drawing_ref_no, discipline, drawing_title, drawing_type,
        revision, planned_submission_date, actual_submission_date, status,
        priority, assigned_to, remarks, attachment_urls, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        projectId,
        drawingRefNo,
        discipline,
        drawingTitle,
        drawingType,
        revision || 'R0',
        plannedSubmissionDate,
        actualSubmissionDate,
        status || 'Planned',
        priority || 'Medium',
        assignedTo,
        remarks,
        JSON.stringify(attachmentUrls || []),
        userEmail,
        userEmail
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating drawing schedule:', error);
    res.status(500).json({ error: 'Failed to create drawing schedule' });
  }
});

// Get all drawing schedules with optional filters (accessible by team members)
app.get('/api/drawing-schedules', verifyToken, async (req, res) => {
  try {
    const { projectId, discipline, status, priority } = req.query;
    
    let queryText = `
      SELECT 
        ds.*,
        p.project_name
      FROM drawing_schedules ds
      LEFT JOIN projects p ON ds.project_id = p.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (projectId) {
      queryText += ` AND ds.project_id = $${paramCount}`;
      queryParams.push(projectId);
      paramCount++;
    }

    if (discipline) {
      queryText += ` AND ds.discipline = $${paramCount}`;
      queryParams.push(discipline);
      paramCount++;
    }

    if (status) {
      queryText += ` AND ds.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    if (priority) {
      queryText += ` AND ds.priority = $${paramCount}`;
      queryParams.push(priority);
      paramCount++;
    }

    queryText += ' ORDER BY ds.planned_submission_date ASC, ds.created_at DESC';

    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching drawing schedules:', error);
    res.status(500).json({ error: 'Failed to fetch drawing schedules' });
  }
});

// Get single drawing schedule by ID (accessible by team members)
app.get('/api/drawing-schedules/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        ds.*,
        p.project_name
      FROM drawing_schedules ds
      LEFT JOIN projects p ON ds.project_id = p.id
      WHERE ds.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drawing schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching drawing schedule:', error);
    res.status(500).json({ error: 'Failed to fetch drawing schedule' });
  }
});

// Update drawing schedule
app.patch('/api/drawing-schedules/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      discipline,
      drawingTitle,
      drawingType,
      revision,
      plannedSubmissionDate,
      actualSubmissionDate,
      status,
      priority,
      assignedTo,
      remarks,
      attachmentUrls
    } = req.body;

    const userEmail = req.user?.email;

    // Check if drawing exists
    const existingDrawing = await query(
      'SELECT * FROM drawing_schedules WHERE id = $1',
      [id]
    );

    if (existingDrawing.rows.length === 0) {
      return res.status(404).json({ error: 'Drawing schedule not found' });
    }

    // Update drawing schedule
    const result = await query(
      `UPDATE drawing_schedules SET
        discipline = COALESCE($1, discipline),
        drawing_title = COALESCE($2, drawing_title),
        drawing_type = COALESCE($3, drawing_type),
        revision = COALESCE($4, revision),
        planned_submission_date = COALESCE($5, planned_submission_date),
        actual_submission_date = COALESCE($6, actual_submission_date),
        status = COALESCE($7, status),
        priority = COALESCE($8, priority),
        assigned_to = COALESCE($9, assigned_to),
        remarks = COALESCE($10, remarks),
        attachment_urls = COALESCE($11, attachment_urls),
        updated_by = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *`,
      [
        discipline,
        drawingTitle,
        drawingType,
        revision,
        plannedSubmissionDate,
        actualSubmissionDate,
        status,
        priority,
        assignedTo,
        remarks,
        attachmentUrls ? JSON.stringify(attachmentUrls) : null,
        userEmail,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating drawing schedule:', error);
    res.status(500).json({ error: 'Failed to update drawing schedule' });
  }
});

// Delete drawing schedule
app.delete('/api/drawing-schedules/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM drawing_schedules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drawing schedule not found' });
    }

    res.json({ message: 'Drawing schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting drawing schedule:', error);
    res.status(500).json({ error: 'Failed to delete drawing schedule' });
  }
});

// Get drawing schedule statistics for a project
app.get('/api/drawing-schedules/stats/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Planned' THEN 1 END) as planned,
        COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'Submitted' THEN 1 END) as submitted,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'Delayed' THEN 1 END) as delayed,
        COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'Medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'Low' THEN 1 END) as low_priority
      FROM drawing_schedules
      WHERE project_id = $1`,
      [projectId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching drawing schedule stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============= END DRAWING SCHEDULE ENDPOINTS =============

// ============= DESIGN CALCULATIONS ENDPOINTS =============

// Create a new design calculation
app.post('/api/design-calculations', verifyToken, upload.single('calculationFile'), async (req, res) => {
  try {
    const {
      projectId,
      building_id,
      floor_id,
      calculationType,
      title,
      description,
      calculatedBy,
      verifiedBy,
      status,
      remarks
    } = req.body;

    const userEmail = req.user?.email;
    let fileUrl = null;
    let fileName = null;

    // Upload file if provided
    if (req.file && isStorageConfigured()) {
      const uploadResult = await uploadToGCS(req.file);
      fileUrl = uploadResult.url;
      fileName = req.file.originalname;
    }

    const result = await query(
      `INSERT INTO design_calculations (
        project_id, building_id, floor_id, calculation_type, title, description,
        calculated_by, verified_by, status, file_url, file_name, remarks, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        projectId,
        building_id || null,
        floor_id || null,
        calculationType,
        title,
        description || null,
        calculatedBy,
        verifiedBy || null,
        status || 'Draft',
        fileUrl,
        fileName,
        remarks || null,
        userEmail
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating design calculation:', error);
    res.status(500).json({ error: 'Failed to create design calculation', message: error.message });
  }
});

// Get all design calculations for a project (accessible by team members)
app.get('/api/design-calculations', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const result = await query(
      `SELECT 
        dc.*,
        b.name as building_name,
        f.floor_name
      FROM design_calculations dc
      LEFT JOIN buildings b ON dc.building_id = b.id
      LEFT JOIN floors f ON dc.floor_id = f.id
      WHERE dc.project_id = $1
      ORDER BY dc.created_at DESC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching design calculations:', error);
    res.status(500).json({ error: 'Failed to fetch design calculations' });
  }
});

// Get single design calculation by ID (accessible by team members)
app.get('/api/design-calculations/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        dc.*,
        b.name as building_name,
        f.floor_name,
        p.name as project_name
      FROM design_calculations dc
      LEFT JOIN buildings b ON dc.building_id = b.id
      LEFT JOIN floors f ON dc.floor_id = f.id
      LEFT JOIN projects p ON dc.project_id = p.id
      WHERE dc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Design calculation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching design calculation:', error);
    res.status(500).json({ error: 'Failed to fetch design calculation' });
  }
});

// Update design calculation
app.patch('/api/design-calculations/:id', verifyToken, upload.single('calculationFile'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      building_id,
      floor_id,
      calculationType,
      title,
      description,
      calculatedBy,
      verifiedBy,
      status,
      remarks
    } = req.body;

    const userEmail = req.user?.email;

    // Get current calculation for file management
    const currentCalc = await query('SELECT * FROM design_calculations WHERE id = $1', [id]);
    
    if (currentCalc.rows.length === 0) {
      return res.status(404).json({ error: 'Design calculation not found' });
    }

    let fileUrl = currentCalc.rows[0].file_url;
    let fileName = currentCalc.rows[0].file_name;

    // Upload new file if provided
    if (req.file && isStorageConfigured()) {
      // Delete old file if exists
      if (fileUrl) {
        try {
          await deleteFromGCS(fileUrl);
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
      }
      
      const uploadResult = await uploadToGCS(req.file);
      fileUrl = uploadResult.url;
      fileName = req.file.originalname;
    }

    const result = await query(
      `UPDATE design_calculations SET
        building_id = COALESCE($1, building_id),
        floor_id = COALESCE($2, floor_id),
        calculation_type = COALESCE($3, calculation_type),
        title = COALESCE($4, title),
        description = COALESCE($5, description),
        calculated_by = COALESCE($6, calculated_by),
        verified_by = COALESCE($7, verified_by),
        status = COALESCE($8, status),
        file_url = $9,
        file_name = $10,
        remarks = COALESCE($11, remarks),
        updated_by = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *`,
      [
        building_id || null,
        floor_id || null,
        calculationType,
        title,
        description,
        calculatedBy,
        verifiedBy,
        status,
        fileUrl,
        fileName,
        remarks,
        userEmail,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating design calculation:', error);
    res.status(500).json({ error: 'Failed to update design calculation' });
  }
});

// Delete design calculation
app.delete('/api/design-calculations/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get calculation to delete file
    const calc = await query('SELECT * FROM design_calculations WHERE id = $1', [id]);
    
    if (calc.rows.length === 0) {
      return res.status(404).json({ error: 'Design calculation not found' });
    }

    // Delete file if exists
    if (calc.rows[0].file_url && isStorageConfigured()) {
      try {
        await deleteFromGCS(calc.rows[0].file_url);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    await query('DELETE FROM design_calculations WHERE id = $1', [id]);

    res.json({ message: 'Design calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting design calculation:', error);
    res.status(500).json({ error: 'Failed to delete design calculation' });
  }
});

// Get design calculations statistics
app.get('/api/design-calculations/stats/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'Under Review' THEN 1 END) as "underReview",
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'Revised' THEN 1 END) as revised
      FROM design_calculations
      WHERE project_id = $1`,
      [projectId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching design calculation stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get buildings for a project
app.get('/api/projects/:projectId/buildings', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await query(
      `SELECT 
         buildings.id,
         buildings.name,
         buildings.project_id,
         buildings.society_id,
         buildings.application_type,
         buildings.building_type,
         buildings.residential_type,
         buildings.villa_type,
         buildings.villa_count,
         buildings.gf_entrance_lobby,
         buildings.car_parking_area,
         buildings.created_at,
         buildings.updated_at,
         buildings.is_twin,
         buildings.twin_of_building_id,
         societies.name AS society_name,
         COALESCE(floor_summary.floor_count, 0) AS floor_count,
         COALESCE(floor_summary.total_height_m, 0) AS total_height_m,
         COALESCE(floor_summary.avg_typical_lobby_area, 0) AS avg_typical_lobby_area
       FROM buildings
       LEFT JOIN societies ON societies.id = buildings.society_id
       LEFT JOIN (
         SELECT
           building_id,
           COUNT(*) AS floor_count,
           COALESCE(SUM(COALESCE(floor_height, 3.5)), 0) AS total_height_m,
           COALESCE(
             AVG(typical_lobby_area) FILTER (WHERE typical_lobby_area > 0),
             0
           ) AS avg_typical_lobby_area
         FROM floors
         GROUP BY building_id
       ) AS floor_summary ON floor_summary.building_id = buildings.id
       WHERE buildings.project_id = $1
       ORDER BY buildings.name`,
      [projectId]
    );

    // Fetch flat data for each building
    const buildings = await Promise.all(result.rows.map(async (building) => {
      const flatsResult = await query(
        `SELECT 
           fl.flat_type,
           fl.area_sqft,
           SUM(fl.number_of_flats) as total_count
         FROM flats fl
         INNER JOIN floors f ON f.id = fl.floor_id
         WHERE f.building_id = $1
         GROUP BY fl.flat_type, fl.area_sqft
         ORDER BY fl.flat_type`,
        [building.id]
      );

      return {
        ...building,
        flats: flatsResult.rows.map(flat => ({
          flat_type: flat.flat_type,
          area_sqft: parseFloat(flat.area_sqft),
          total_count: parseInt(flat.total_count)
        }))
      };
    }));

    console.log(`[DEBUG] Buildings for project ${projectId}:`, buildings.map(b => ({
      name: b.name,
      height: b.total_height_m,
      floors: b.floor_count,
      gf_lobby: b.gf_entrance_lobby,
      avg_lobby: b.avg_typical_lobby_area,
      flats_count: b.flats.reduce((sum, f) => sum + f.total_count, 0)
    })));

    // Disable caching to ensure fresh data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(buildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

// ============= END DESIGN CALCULATIONS ENDPOINTS =============

// ============= WATER DEMAND CALCULATIONS ENDPOINTS =============

// Create a new water demand calculation
app.post('/api/water-demand-calculations', verifyToken, async (req, res) => {
  try {
    const {
      projectId,
      calculationName,
      selectedBuildings,
      calculationDetails,
      totalWaterDemand,
      status,
      verifiedBy,
      remarks
    } = req.body;

    const userEmail = req.user?.email;

    // Validation
    if (!projectId || !calculationName || !selectedBuildings || !calculationDetails) {
      return res.status(400).json({ 
        error: 'Project ID, calculation name, selected buildings, and calculation details are required' 
      });
    }

    const result = await query(
      `INSERT INTO water_demand_calculations (
        project_id, calculation_name, selected_buildings, calculation_details,
        total_water_demand, status, calculated_by, verified_by, remarks, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        projectId,
        calculationName,
        JSON.stringify(selectedBuildings),
        JSON.stringify(calculationDetails),
        totalWaterDemand || 0,
        status || 'Draft',
        userEmail,
        verifiedBy || null,
        remarks || null,
        userEmail
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating water demand calculation:', error);
    res.status(500).json({ error: 'Failed to create water demand calculation', message: error.message });
  }
});

// Get all water demand calculations for a project
app.get('/api/water-demand-calculations', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const result = await query(
      `SELECT wdc.*, p.name as project_name
       FROM water_demand_calculations wdc
       LEFT JOIN projects p ON wdc.project_id = p.id
       WHERE wdc.project_id = $1
       ORDER BY wdc.created_at DESC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching water demand calculations:', error);
    res.status(500).json({ error: 'Failed to fetch water demand calculations' });
  }
});

// Get a specific water demand calculation by ID
app.get('/api/water-demand-calculations/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT wdc.*, p.name as project_name
       FROM water_demand_calculations wdc
       LEFT JOIN projects p ON wdc.project_id = p.id
       WHERE wdc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Water demand calculation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching water demand calculation:', error);
    res.status(500).json({ error: 'Failed to fetch water demand calculation' });
  }
});

// Update a water demand calculation
app.put('/api/water-demand-calculations/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      calculationName,
      selectedBuildings,
      calculationDetails,
      totalWaterDemand,
      status,
      verifiedBy,
      remarks
    } = req.body;

    const userEmail = req.user?.email;

    const result = await query(
      `UPDATE water_demand_calculations SET
        calculation_name = COALESCE($1, calculation_name),
        selected_buildings = COALESCE($2, selected_buildings),
        calculation_details = COALESCE($3, calculation_details),
        total_water_demand = COALESCE($4, total_water_demand),
        status = COALESCE($5, status),
        verified_by = COALESCE($6, verified_by),
        remarks = COALESCE($7, remarks),
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        calculationName,
        selectedBuildings ? JSON.stringify(selectedBuildings) : null,
        calculationDetails ? JSON.stringify(calculationDetails) : null,
        totalWaterDemand,
        status,
        verifiedBy,
        remarks,
        userEmail,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Water demand calculation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating water demand calculation:', error);
    res.status(500).json({ error: 'Failed to update water demand calculation' });
  }
});

// Delete a water demand calculation
app.delete('/api/water-demand-calculations/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const calc = await query('SELECT * FROM water_demand_calculations WHERE id = $1', [id]);
    
    if (calc.rows.length === 0) {
      return res.status(404).json({ error: 'Water demand calculation not found' });
    }

    await query('DELETE FROM water_demand_calculations WHERE id = $1', [id]);

    res.json({ message: 'Water demand calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting water demand calculation:', error);
    res.status(500).json({ error: 'Failed to delete water demand calculation' });
  }
});

// Get buildings with detailed information for water demand calculation
app.get('/api/projects/:projectId/buildings-detailed', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await query(
      `SELECT 
        b.*,
        json_agg(
          json_build_object(
            'id', f.id,
            'floor_number', f.floor_number,
            'floor_name', f.floor_name,
            'flats', (
              SELECT json_agg(
                json_build_object(
                  'id', fl.id,
                  'flat_type', fl.flat_type,
                  'area_sqft', fl.area_sqft,
                  'number_of_flats', fl.number_of_flats
                )
              )
              FROM flats fl
              WHERE fl.floor_id = f.id
            )
          )
          ORDER BY f.floor_number
        ) FILTER (WHERE f.id IS NOT NULL) as floors
       FROM buildings b
       LEFT JOIN floors f ON b.id = f.building_id
       WHERE b.project_id = $1
       GROUP BY b.id
       ORDER BY b.name`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching buildings detailed:', error);
    res.status(500).json({ error: 'Failed to fetch buildings with details' });
  }
});

// ============= END WATER DEMAND CALCULATIONS ENDPOINTS =============

// ============= ELECTRICAL LOAD CALCULATIONS ENDPOINTS =============

// Create a new electrical load calculation
app.post('/api/electrical-load-calculations', verifyToken, async (req, res) => {
  try {
    const {
      projectId,
      calculationName,
      selectedBuildings,
      inputParameters,
      status,
      remarks
    } = req.body;

    // Resolve project-level guideline selection
    let guidelineSelection = inputParameters?.guideline || null;
    if (!guidelineSelection && projectId) {
      const guidelineRes = await query(
        `SELECT standard_value
         FROM project_standard_selections
         WHERE project_id = $1 AND standard_key = $2 AND is_active = true
         LIMIT 1`,
        [projectId, 'electrical_load_guideline']
      );
      guidelineSelection = guidelineRes.rows[0]?.standard_value || null;
    }

    if (guidelineSelection) {
      inputParameters.guideline = guidelineSelection;
    }

    // Initialize calculator
    const calculator = new ElectricalLoadCalculator({ query });

    // Perform calculation with regulatory framework support
    const results = await calculator.calculate(inputParameters, selectedBuildings, projectId, guidelineSelection);

    // Extract regulatory compliance data
    const regulatoryCompliance = results.regulatoryCompliance || {};
    const frameworkIds = results.regulatoryFramework ? [results.regulatoryFramework.id] : [];

    // Save to database with regulatory compliance fields
    const result = await query(
      `INSERT INTO electrical_load_calculations (
        project_id,
        calculation_name,
        selected_buildings,
        input_parameters,
        building_ca_loads,
        flat_loads,
        society_ca_loads,
        building_breakdowns,
        total_loads,
        total_connected_load_kw,
        maximum_demand_kw,
        essential_demand_kw,
        fire_demand_kw,
        transformer_size_kva,
        framework_ids,
        area_type,
        total_carpet_area,
        sanctioned_load_kw,
        sanctioned_load_kva,
        msedcl_minimum_kw,
        load_method_applied,
        load_after_df_kw,
        load_after_df_kva,
        dtc_needed,
        dtc_type,
        dtc_capacity_kva,
        dtc_count,
        dtc_land_sqm,
        substation_needed,
        substation_type,
        substation_land_sqm,
        exceeds_single_consumer_limit,
        exceeds_cumulative_limit,
        validation_warnings,
        calculation_metadata,
        status,
        calculated_by,
        remarks,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)
      RETURNING *`,
      [
        projectId,
        calculationName,
        JSON.stringify(selectedBuildings),
        JSON.stringify(inputParameters),
        JSON.stringify(results.buildingCALoads),
        JSON.stringify(results.flatLoads || null),
        JSON.stringify(results.societyCALoads),
        JSON.stringify(results.buildingBreakdowns || null),
        JSON.stringify(results.totals),
        results.totals.grandTotalTCL,
        results.totals.totalMaxDemand,
        results.totals.totalEssential,
        results.totals.totalFire,
        results.totals.transformerSizeKVA,
        frameworkIds,
        results.areaType,
        parseFloat(inputParameters.totalCarpetArea) || null,
        regulatoryCompliance.sanctionedLoad?.sanctionedLoadKW || null,
        regulatoryCompliance.sanctionedLoad?.sanctionedLoadKVA || null,
        regulatoryCompliance.msedclMinimum?.requiredKW || null,
        regulatoryCompliance.msedclMinimum?.applied ? 'MSEDCL Minimum' : 'NBC',
        regulatoryCompliance.loadAfterDF?.maxDemandKW || null,
        regulatoryCompliance.loadAfterDF?.maxDemandKVA || null,
        regulatoryCompliance.dtc?.needed || false,
        regulatoryCompliance.dtc?.needed ? 'DTC_OUTDOOR' : null,
        regulatoryCompliance.dtc?.totalCapacity || null,
        regulatoryCompliance.dtc?.dtcCount || null,
        regulatoryCompliance.dtc?.landRequired || null,
        regulatoryCompliance.substation?.needed || false,
        regulatoryCompliance.substation?.substationType || null,
        regulatoryCompliance.substation?.landRequired || null,
        regulatoryCompliance.validation?.exceedsKWLimit || false,
        regulatoryCompliance.validation?.exceedsKVALimit || false,
        regulatoryCompliance.warnings || [],
        JSON.stringify(regulatoryCompliance),
        status || 'Draft',
        req.user.email,
        remarks,
        req.user.email
      ]
    );

    // Return the saved calculation with full results
    const savedCalc = result.rows[0];
    res.json({
      ...savedCalc,
      // Parse JSON fields for immediate use
      selected_buildings: selectedBuildings,
      input_parameters: inputParameters,
      building_ca_loads: results.buildingCALoads,
      flat_loads: results.flatLoads || null,
      society_ca_loads: results.societyCALoads,
      building_breakdowns: results.buildingBreakdowns || null,
      total_loads: results.totals,
      regulatory_compliance: regulatoryCompliance,
      regulatory_framework: results.regulatoryFramework,
      factors_used: results.factorsUsed || null,
      factors_guideline: results.factorsGuideline || null
    });
  } catch (error) {
    console.error('Error creating electrical load calculation:', error);
    res.status(500).json({ error: error.message || 'Failed to create electrical load calculation' });
  }
});

// Get all electrical load calculations for a project
app.get('/api/electrical-load-calculations', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const result = await query(
      `SELECT * FROM electrical_load_calculations
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching electrical load calculations:', error);
    res.status(500).json({ error: 'Failed to fetch electrical load calculations' });
  }
});

// Get a single electrical load calculation by ID
app.get('/api/electrical-load-calculations/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const calculationId = parseInt(id, 10);
    if (Number.isNaN(calculationId)) {
      return res.status(400).json({ error: 'Invalid calculation id' });
    }

    const result = await query(
      'SELECT * FROM electrical_load_calculations WHERE id = $1',
      [calculationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Electrical load calculation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching electrical load calculation:', error);
    res.status(500).json({ error: 'Failed to fetch electrical load calculation' });
  }
});

// Update an electrical load calculation
app.put('/api/electrical-load-calculations/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const calculationId = parseInt(id, 10);
    if (Number.isNaN(calculationId)) {
      return res.status(400).json({ error: 'Invalid calculation id' });
    }
    const {
      calculationName,
      inputParameters,
      selectedBuildings,
      status,
      remarks,
      verifiedBy
    } = req.body;

    // Check if calculation exists
    const existing = await query(
      'SELECT * FROM electrical_load_calculations WHERE id = $1',
      [calculationId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Electrical load calculation not found' });
    }

    // If inputs changed, recalculate
    let results = null;
    if (inputParameters) {
      const calculator = new ElectricalLoadCalculator({ query });
      const buildings = selectedBuildings || existing.rows[0].selected_buildings;
      const projectId = existing.rows[0].project_id;
      results = await calculator.calculate(inputParameters, buildings, projectId);
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (calculationName) {
      updateFields.push(`calculation_name = $${paramIndex++}`);
      values.push(calculationName);
    }

    if (inputParameters && results) {
      updateFields.push(`input_parameters = $${paramIndex++}`);
      values.push(JSON.stringify(inputParameters));

      updateFields.push(`building_ca_loads = $${paramIndex++}`);
      values.push(JSON.stringify(results.buildingCALoads));

      updateFields.push(`society_ca_loads = $${paramIndex++}`);
      values.push(JSON.stringify(results.societyCALoads));

      updateFields.push(`total_loads = $${paramIndex++}`);
      values.push(JSON.stringify(results.totals));

      updateFields.push(`total_connected_load_kw = $${paramIndex++}`);
      values.push(results.totals.grandTotalTCL);

      updateFields.push(`maximum_demand_kw = $${paramIndex++}`);
      values.push(results.totals.totalMaxDemand);

      updateFields.push(`essential_demand_kw = $${paramIndex++}`);
      values.push(results.totals.totalEssential);

      updateFields.push(`fire_demand_kw = $${paramIndex++}`);
      values.push(results.totals.totalFire);

      updateFields.push(`transformer_size_kva = $${paramIndex++}`);
      values.push(results.totals.transformerSizeKVA);
    }

    if (selectedBuildings) {
      updateFields.push(`selected_buildings = $${paramIndex++}`);
      values.push(JSON.stringify(selectedBuildings));
    }

    if (status) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (remarks !== undefined) {
      updateFields.push(`remarks = $${paramIndex++}`);
      values.push(remarks);
    }

    if (verifiedBy) {
      updateFields.push(`verified_by = $${paramIndex++}`);
      values.push(verifiedBy);
    }

    updateFields.push(`updated_by = $${paramIndex++}`);
    values.push(req.user.email);

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(calculationId);

    const result = await query(
      `UPDATE electrical_load_calculations
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating electrical load calculation:', error);
    res.status(500).json({ error: error.message || 'Failed to update electrical load calculation' });
  }
});

// Delete an electrical load calculation
app.delete('/api/electrical-load-calculations/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const calculationId = parseInt(id, 10);
    if (Number.isNaN(calculationId)) {
      return res.status(400).json({ error: 'Invalid calculation id' });
    }

    const calc = await query('SELECT * FROM electrical_load_calculations WHERE id = $1', [calculationId]);
    
    if (calc.rows.length === 0) {
      return res.status(404).json({ error: 'Electrical load calculation not found' });
    }

    await query('DELETE FROM electrical_load_calculations WHERE id = $1', [calculationId]);

    res.json({ message: 'Electrical load calculation deleted successfully' });
  } catch (error) {
    console.error('Error deleting electrical load calculation:', error);
    res.status(500).json({ error: 'Failed to delete electrical load calculation' });
  }
});

// ============================================================================
// Electrical Load Factors Management (L0 Only)
// ============================================================================

// Get all electrical load factors
app.get('/api/electrical-load-factors', verifyToken, async (req, res) => {
  try {
    const { guideline } = req.query;
    let queryText = 'SELECT * FROM electrical_load_factors WHERE is_active = true';
    const params = [];
    
    if (guideline) {
      queryText += ' AND guideline = $1';
      params.push(guideline);
    }
    
    queryText += ' ORDER BY guideline, category, sub_category, description';
    
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching electrical load factors:', error);
    res.status(500).json({ error: 'Failed to fetch electrical load factors' });
  }
});

// Get distinct guidelines
app.get('/api/electrical-load-factors/guidelines/list', verifyToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT DISTINCT guideline FROM electrical_load_factors WHERE is_active = true ORDER BY guideline'
    );
    res.json(result.rows.map(r => r.guideline));
  } catch (error) {
    console.error('Error fetching guidelines:', error);
    res.status(500).json({ error: 'Failed to fetch guidelines' });
  }
});

// Get a specific electrical load factor
app.get('/api/electrical-load-factors/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM electrical_load_factors WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factor not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching electrical load factor:', error);
    res.status(500).json({ error: 'Failed to fetch electrical load factor' });
  }
});

// Update electrical load factor (L0 only)
app.put('/api/electrical-load-factors/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      sub_category,
      description,
      watt_per_sqm,
      mdf,
      edf,
      fdf,
      guideline,
      notes,
      is_active
    } = req.body;

    const result = await query(
      `UPDATE electrical_load_factors
       SET category = $1,
           sub_category = $2,
           description = $3,
           watt_per_sqm = $4,
           mdf = $5,
           edf = $6,
           fdf = $7,
           guideline = $8,
           notes = $9,
           is_active = $10,
           updated_by = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [category, sub_category, description, watt_per_sqm, mdf, edf, fdf, guideline, notes, is_active, req.user.email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating electrical load factor:', error);
    res.status(500).json({ error: 'Failed to update electrical load factor' });
  }
});

// Create new electrical load factor (L0 only)
app.post('/api/electrical-load-factors', verifyToken, async (req, res) => {
  try {
    const {
      category,
      sub_category,
      description,
      watt_per_sqm,
      mdf,
      edf,
      fdf,
      guideline,
      notes,
      is_active
    } = req.body;

    const result = await query(
      `INSERT INTO electrical_load_factors
       (category, sub_category, description, watt_per_sqm, mdf, edf, fdf, guideline, notes, is_active, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [category, sub_category, description, watt_per_sqm, mdf, edf, fdf, guideline, notes, is_active !== false, req.user.email]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating electrical load factor:', error);
    res.status(500).json({ error: 'Failed to create electrical load factor' });
  }
});

// Delete electrical load factor (soft delete - L0 only)
app.delete('/api/electrical-load-factors/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `UPDATE electrical_load_factors
       SET is_active = false,
           updated_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factor not found' });
    }

    res.json({ message: 'Factor deleted successfully', factor: result.rows[0] });
  } catch (error) {
    console.error('Error deleting electrical load factor:', error);
    res.status(500).json({ error: 'Failed to delete electrical load factor' });
  }
});

// =============REGULATORY FRAMEWORK ENDPOINTS =============

// Get all active regulatory frameworks
app.get('/api/regulatory-frameworks', verifyToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM v_active_regulations
      ORDER BY is_default DESC, framework_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching regulatory frameworks:', error);
    res.status(500).json({ error: 'Failed to fetch regulatory frameworks' });
  }
});

// Get single regulatory framework with all details
app.get('/api/regulatory-frameworks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const framework = await query(
      'SELECT * FROM electrical_regulation_frameworks WHERE id = $1',
      [id]
    );

    if (framework.rows.length === 0) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    // Load all related data
    const [areaTypes, loadStandards, dtcThresholds, sanctionedLimits, powerFactors, substationReqs, landReqs, leaseTerms, infraSpecs, definitions] = await Promise.all([
      query('SELECT * FROM regulation_area_types WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_load_standards WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_dtc_thresholds WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_sanctioned_load_limits WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_power_factors WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_substation_requirements WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_land_requirements WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_lease_terms WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_infrastructure_specs WHERE framework_id = $1 AND is_active = true', [id]),
      query('SELECT * FROM regulation_definitions WHERE framework_id = $1 AND is_active = true', [id])
    ]);

    res.json({
      ...framework.rows[0],
      areaTypes: areaTypes.rows,
      loadStandards: loadStandards.rows,
      dtcThresholds: dtcThresholds.rows,
      sanctionedLimits: sanctionedLimits.rows,
      powerFactors: powerFactors.rows,
      substationReqs: substationReqs.rows,
      landReqs: landReqs.rows,
      leaseTerms: leaseTerms.rows,
      infraSpecs: infraSpecs.rows,
      definitions: definitions.rows
    });
  } catch (error) {
    console.error('Error fetching regulatory framework:', error);
    res.status(500).json({ error: 'Failed to fetch regulatory framework' });
  }
});

// Set project regulatory framework selection
app.post('/api/projects/:projectId/regulatory-framework', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { frameworkId, notes } = req.body;

    // Check if framework exists and is active
    const framework = await query(
      'SELECT * FROM electrical_regulation_frameworks WHERE id = $1 AND is_active = true',
      [frameworkId]
    );

    if (framework.rows.length === 0) {
      return res.status(404).json({ error: 'Framework not found or inactive' });
    }

    // Deactivate existing selections for this project
    await query(
      'UPDATE project_regulation_selection SET is_active = false WHERE project_id = $1',
      [projectId]
    );

    // Insert new selection
    const result = await query(
      `INSERT INTO project_regulation_selection
       (project_id, framework_id, selected_by, notes, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [projectId, frameworkId, req.user.email, notes]
    );

    // Also update the project table
    await query(
      'UPDATE projects SET framework_id = $1 WHERE id = $2',
      [frameworkId, projectId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error setting project regulatory framework:', error);
    res.status(500).json({ error: 'Failed to set project regulatory framework' });
  }
});

// Get project's selected regulatory framework
app.get('/api/projects/:projectId/regulatory-framework', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await query(`
      SELECT erf.*, prs.selected_at, prs.selected_by, prs.notes
      FROM project_regulation_selection prs
      JOIN electrical_regulation_frameworks erf ON prs.framework_id = erf.id
      WHERE prs.project_id = $1 AND prs.is_active = true
      ORDER BY prs.selected_at DESC
      LIMIT 1
    `, [projectId]);

    if (result.rows.length === 0) {
      // Return default framework
      const defaultResult = await query(
        'SELECT * FROM electrical_regulation_frameworks WHERE is_default = true AND is_active = true  LIMIT 1'
      );
      return res.json(defaultResult.rows[0] || null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project regulatory framework:', error);
    res.status(500).json({ error: 'Failed to fetch project regulatory framework' });
  }
});

// Create new regulatory framework (L0 only)
app.post('/api/regulatory-frameworks', verifyToken, async (req, res) => {
  try {
    // Check if user is L0
    const userResult = await query(
      'SELECT permission_level FROM users WHERE email = $1',
      [req.user.email]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].permission_level !== 'L0') {
      return res.status(403).json({ error: 'Only L0 users can create regulatory frameworks' });
    }

    const {
      framework_code,
      framework_name,
      issuing_authority,
      state,
      country,
      circular_number,
      issue_date,
      effective_date,
      document_url,
      is_default,
      notes
    } = req.body;

    // If setting as default, unset other defaults
    if (is_default) {
      await query('UPDATE electrical_regulation_frameworks SET is_default = false');
    }

    const result = await query(
      `INSERT INTO electrical_regulation_frameworks
       (framework_code, framework_name, issuing_authority, state, country, circular_number,
        issue_date, effective_date, document_url, is_active, is_default, created_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $12)
       RETURNING *`,
      [framework_code, framework_name, issuing_authority, state, country || 'India',
       circular_number, issue_date, effective_date, document_url, is_default || false,
       req.user.email, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating regulatory framework:', error);
    res.status(500).json({ error: 'Failed to create regulatory framework' });
  }
});

// Update regulatory framework (L0 only)
app.put('/api/regulatory-frameworks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is L0
    const userResult = await query(
      'SELECT permission_level FROM users WHERE email = $1',
      [req.user.email]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].permission_level !== 'L0') {
      return res.status(403).json({ error: 'Only L0 users can update regulatory frameworks' });
    }

    const {
      framework_name,
      issuing_authority,
      state,
      country,
      circular_number,
      issue_date,
      effective_date,
      superseded_date,
      document_url,
      is_active,
      is_default,
      notes
    } = req.body;

    // If setting as default, unset other defaults
    if (is_default) {
      await query('UPDATE electrical_regulation_frameworks SET is_default = false WHERE id != $1', [id]);
    }

    const result = await query(
      `UPDATE electrical_regulation_frameworks
       SET framework_name = COALESCE($1, framework_name),
           issuing_authority = COALESCE($2, issuing_authority),
           state = COALESCE($3, state),
           country = COALESCE($4, country),
           circular_number = COALESCE($5, circular_number),
           issue_date = COALESCE($6, issue_date),
           effective_date = COALESCE($7, effective_date),
           superseded_date = COALESCE($8, superseded_date),
           document_url = COALESCE($9, document_url),
           is_active = COALESCE($10, is_active),
           is_default = COALESCE($11, is_default),
           notes = COALESCE($12, notes),
           updated_at = NOW(),
           updated_by = $13
       WHERE id = $14
       RETURNING *`,
      [framework_name, issuing_authority, state, country, circular_number, issue_date,
       effective_date, superseded_date, document_url, is_active, is_default, notes,
       req.user.email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating regulatory framework:', error);
    res.status(500).json({ error: 'Failed to update regulatory framework' });
  }
});

// ============= END ELECTRICAL LOAD CALCULATIONS ENDPOINTS =============

// ============= PROJECT CHANGE REQUEST ENDPOINTS =============

// Create a new change request
app.post('/api/change-requests', verifyToken, async (req, res) => {
  try {
    const {
      projectId,
      changeType,
      changeCategory,
      entityType,
      entityId,
      changeDescription,
      justification,
      impactAssessment,
      proposedChanges,
      currentData,
      priority,
      attachmentUrls
    } = req.body;

    const userEmail = req.user?.email;

    // Validation
    if (!projectId || !changeType || !changeDescription) {
      return res.status(400).json({ error: 'Project ID, Change Type, and Description are required' });
    }

    // Generate change reference number
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const countResult = await query(
      `SELECT COUNT(*) as count FROM project_change_requests 
       WHERE change_ref_no LIKE $1`,
      [`CR-${dateStr}-%`]
    );
    
    const count = parseInt(countResult.rows[0].count) + 1;
    const changeRefNo = `CR-${dateStr}-${String(count).padStart(3, '0')}`;

    // Insert new change request
    const result = await query(
      `INSERT INTO project_change_requests (
        project_id, change_ref_no, change_type, change_category, entity_type,
        entity_id, change_description, justification, impact_assessment,
        proposed_changes, current_data, requested_by, requested_by_email,
        priority, attachment_urls
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        projectId,
        changeRefNo,
        changeType,
        changeCategory,
        entityType,
        entityId,
        changeDescription,
        justification,
        impactAssessment,
        JSON.stringify(proposedChanges || {}),
        JSON.stringify(currentData || {}),
        userEmail,
        userEmail,
        priority || 'Medium',
        JSON.stringify(attachmentUrls || [])
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating change request:', error);
    res.status(500).json({ error: 'Failed to create change request' });
  }
});

// Get all change requests with optional filters
app.get('/api/change-requests', verifyToken, async (req, res) => {
  try {
    const { projectId, status, changeType, l2_status, l1_status } = req.query;
    
    let queryText = `
      SELECT 
        cr.*,
        p.project_name
      FROM project_change_requests cr
      LEFT JOIN projects p ON cr.project_id = p.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (projectId) {
      queryText += ` AND cr.project_id = $${paramCount}`;
      queryParams.push(projectId);
      paramCount++;
    }

    if (status) {
      queryText += ` AND cr.final_status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    if (changeType) {
      queryText += ` AND cr.change_type = $${paramCount}`;
      queryParams.push(changeType);
      paramCount++;
    }

    if (l2_status) {
      queryText += ` AND cr.l2_status = $${paramCount}`;
      queryParams.push(l2_status);
      paramCount++;
    }

    if (l1_status) {
      queryText += ` AND cr.l1_status = $${paramCount}`;
      queryParams.push(l1_status);
      paramCount++;
    }

    queryText += ' ORDER BY cr.created_at DESC';

    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching change requests:', error);
    res.status(500).json({ error: 'Failed to fetch change requests' });
  }
});

// Get single change request by ID
app.get('/api/change-requests/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        cr.*,
        p.project_name
      FROM project_change_requests cr
      LEFT JOIN projects p ON cr.project_id = p.id
      WHERE cr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching change request:', error);
    res.status(500).json({ error: 'Failed to fetch change request' });
  }
});

// L2 review of change request
app.patch('/api/change-requests/:id/l2-review', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { l2_status, l2_comments } = req.body;
    const userEmail = req.user?.email;

    if (!l2_status || !['Approved', 'Rejected'].includes(l2_status)) {
      return res.status(400).json({ error: 'Valid L2 status (Approved/Rejected) is required' });
    }

    // Get current change request
    const currentCR = await query(
      'SELECT * FROM project_change_requests WHERE id = $1',
      [id]
    );

    if (currentCR.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    // Calculate final status
    let finalStatus = 'Pending';
    if (l2_status === 'Rejected') {
      finalStatus = 'Rejected';
    } else if (l2_status === 'Approved') {
      // If L2 approved, still pending L1
      finalStatus = 'Pending';
    }

    // Update change request
    const result = await query(
      `UPDATE project_change_requests SET
        l2_status = $1,
        l2_comments = $2,
        l2_reviewed_by = $3,
        l2_reviewed_at = CURRENT_TIMESTAMP,
        final_status = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *`,
      [l2_status, l2_comments, userEmail, finalStatus, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating L2 review:', error);
    res.status(500).json({ error: 'Failed to update L2 review' });
  }
});

// L1 review of change request
app.patch('/api/change-requests/:id/l1-review', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { l1_status, l1_comments } = req.body;
    const userEmail = req.user?.email;

    if (!l1_status || !['Approved', 'Rejected'].includes(l1_status)) {
      return res.status(400).json({ error: 'Valid L1 status (Approved/Rejected) is required' });
    }

    // Get current change request
    const currentCR = await query(
      'SELECT * FROM project_change_requests WHERE id = $1',
      [id]
    );

    if (currentCR.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    if (currentCR.rows[0].l2_status !== 'Approved') {
      return res.status(400).json({ error: 'L2 approval required before L1 review' });
    }

    // Calculate final status
    let finalStatus = 'Pending';
    if (l1_status === 'Rejected') {
      finalStatus = 'Rejected';
    } else if (l1_status === 'Approved' && currentCR.rows[0].l2_status === 'Approved') {
      finalStatus = 'Approved';
    }

    // Update change request
    const result = await query(
      `UPDATE project_change_requests SET
        l1_status = $1,
        l1_comments = $2,
        l1_reviewed_by = $3,
        l1_reviewed_at = CURRENT_TIMESTAMP,
        final_status = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *`,
      [l1_status, l1_comments, userEmail, finalStatus, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating L1 review:', error);
    res.status(500).json({ error: 'Failed to update L1 review' });
  }
});

// Mark change request as implemented
app.patch('/api/change-requests/:id/implement', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;

    // Get current change request
    const currentCR = await query(
      'SELECT * FROM project_change_requests WHERE id = $1',
      [id]
    );

    if (currentCR.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    if (currentCR.rows[0].final_status !== 'Approved') {
      return res.status(400).json({ error: 'Change request must be approved before implementation' });
    }

    // Update change request
    const result = await query(
      `UPDATE project_change_requests SET
        implemented = TRUE,
        implemented_at = CURRENT_TIMESTAMP,
        implemented_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *`,
      [userEmail, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking as implemented:', error);
    res.status(500).json({ error: 'Failed to mark as implemented' });
  }
});

// Update change request general info
app.patch('/api/change-requests/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      changeDescription,
      justification,
      impactAssessment,
      proposedChanges,
      priority,
      attachmentUrls
    } = req.body;

    const userEmail = req.user?.email;

    // Update change request
    const result = await query(
      `UPDATE project_change_requests SET
        change_description = COALESCE($1, change_description),
        justification = COALESCE($2, justification),
        impact_assessment = COALESCE($3, impact_assessment),
        proposed_changes = COALESCE($4, proposed_changes),
        priority = COALESCE($5, priority),
        attachment_urls = COALESCE($6, attachment_urls),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *`,
      [
        changeDescription,
        justification,
        impactAssessment,
        proposedChanges ? JSON.stringify(proposedChanges) : null,
        priority,
        attachmentUrls ? JSON.stringify(attachmentUrls) : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating change request:', error);
    res.status(500).json({ error: 'Failed to update change request' });
  }
});

// Delete change request
app.delete('/api/change-requests/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM project_change_requests WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json({ message: 'Change request deleted successfully' });
  } catch (error) {
    console.error('Error deleting change request:', error);
    res.status(500).json({ error: 'Failed to delete change request' });
  }
});

// Get change request statistics
app.get('/api/change-requests/stats/:projectId', verifyToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN final_status = 'Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN final_status = 'Approved' THEN 1 END) as approved,
        COUNT(CASE WHEN final_status = 'Rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN implemented = TRUE THEN 1 END) as implemented,
        COUNT(CASE WHEN l2_status = 'Pending' THEN 1 END) as pending_l2,
        COUNT(CASE WHEN l1_status = 'Pending' AND l2_status = 'Approved' THEN 1 END) as pending_l1,
        COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'Medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'Low' THEN 1 END) as low_priority
      FROM project_change_requests
      WHERE project_id = $1`,
      [projectId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching change request stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============= END PROJECT CHANGE REQUEST ENDPOINTS =============

// ============= CONSULTANT ENDPOINTS =============

// Register a new consultant (L0/L1 only)
app.post('/api/consultants/register', verifyToken, async (req, res) => {
  try {
    const { name, email, contactNumber, companyName, projectId } = req.body;

    if (!name || !email || !contactNumber) {
      return res.status(400).json({ error: 'Name, email, and contact number are required' });
    }

    // Check if consultant already exists
    const existingConsultant = await query(
      'SELECT id FROM consultants WHERE email = $1',
      [email]
    );

    let consultantId;

    if (existingConsultant.rows.length > 0) {
      consultantId = existingConsultant.rows[0].id;
    } else {
      // Insert new consultant
      const result = await query(
        `INSERT INTO consultants (name, email, contact_number, company_name)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [name, email, contactNumber, companyName]
      );
      consultantId = result.rows[0].id;
    }

    // Link consultant to project if projectId provided
    if (projectId) {
      await query(
        `INSERT INTO project_consultants (project_id, consultant_id, assigned_by_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, consultant_id) DO NOTHING`,
        [projectId, consultantId, req.user.userId]
      );
    }

    res.json({ success: true, consultantId });
  } catch (error) {
    console.error('Error registering consultant:', error);
    res.status(500).json({ error: 'Failed to register consultant' });
  }
});

// List all active consultants
app.get('/api/consultants/list', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, contact_number, company_name
       FROM consultants
       WHERE is_active = true
       ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching consultants:', error);
    res.status(500).json({ error: 'Failed to fetch consultants' });
  }
});

// Send OTP to consultant email
app.post('/api/consultants/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if consultant exists
    const consultant = await query(
      'SELECT id FROM consultants WHERE email = $1 AND is_active = true',
      [email]
    );

    if (consultant.rows.length === 0) {
      return res.status(404).json({ error: 'Consultant not found or inactive' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP in database
    await query(
      `INSERT INTO consultant_otp (email, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [email, otp, expiresAt]
    );

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp, 'consultant');
    
    if (!emailSent) {
      logger.warn(`Failed to send OTP email to ${email}, but OTP is available`);
      // Fallback: Log OTP in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] OTP for ${email}: ${otp}`);
      }
    }

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and login consultant
app.post('/api/consultants/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Verify OTP
    const otpResult = await query(
      `SELECT id FROM consultant_otp
       WHERE email = $1 AND otp = $2 AND is_used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await query(
      'UPDATE consultant_otp SET is_used = true WHERE id = $1',
      [otpResult.rows[0].id]
    );

    // Get consultant details
    const consultant = await query(
      'SELECT id, name, email FROM consultants WHERE email = $1',
      [email]
    );

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      token,
      consultantId: consultant.rows[0].id,
      consultant: consultant.rows[0]
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Get consultant profile and projects
app.get('/api/consultants/profile', async (req, res) => {
  try {
    const consultantEmail = req.headers['x-consultant-email'];
    const devUserEmail = req.headers['x-dev-user-email'];
    
    // Allow super admin to view as consultant
    if (devUserEmail && !consultantEmail) {
      // Super admin viewing all projects
      const projectsResult = await query(
        `SELECT id, name, description, lifecycle_stage, completion_percentage
         FROM projects
         ORDER BY name`
      );

      return res.json({
        consultant: { name: 'Super Admin', email: devUserEmail },
        projects: projectsResult.rows
      });
    }

    if (!consultantEmail) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Get consultant details
    const consultantResult = await query(
      'SELECT id, name, email, contact_number, company_name FROM consultants WHERE email = $1',
      [consultantEmail]
    );

    if (consultantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const consultant = consultantResult.rows[0];

    // Get assigned projects
    const projectsResult = await query(
      `SELECT DISTINCT p.id, p.name, p.description, p.lifecycle_stage, p.completion_percentage
       FROM projects p
       JOIN project_consultants pc ON p.id = pc.project_id
       WHERE pc.consultant_id = $1
       ORDER BY p.name`,
      [consultant.id]
    );

    res.json({
      consultant,
      projects: projectsResult.rows
    });
  } catch (error) {
    console.error('Error fetching consultant profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get referred items (MAS and RFI) for consultant
app.get('/api/consultants/referred-items', async (req, res) => {
  try {
    const consultantEmail = req.headers['x-consultant-email'];
    const devUserEmail = req.headers['x-dev-user-email'];

    // Super admin can see all referred items
    if (devUserEmail && !consultantEmail) {
      const masResult = await query(
        `SELECT mas.id, mas.material_name, mas.consultant_reply, mas.consultant_replied_at,
                p.name as project_name, c.name as consultant_name
         FROM material_approval_sheets mas
         JOIN projects p ON mas.project_id = p.id
         LEFT JOIN consultants c ON mas.referred_to_consultant_id = c.id
         WHERE mas.referred_to_consultant_id IS NOT NULL
         ORDER BY mas.created_at DESC`
      );

      const rfiResult = await query(
        `SELECT rfi.id, rfi.title, rfi.consultant_reply, rfi.consultant_replied_at,
                p.name as project_name, c.name as consultant_name
         FROM requests_for_information rfi
         JOIN projects p ON rfi.project_id = p.id
         LEFT JOIN consultants c ON rfi.referred_to_consultant_id = c.id
         WHERE rfi.referred_to_consultant_id IS NOT NULL
         ORDER BY rfi.created_at DESC`
      );

      return res.json({
        mas: masResult.rows,
        rfi: rfiResult.rows
      });
    }

    if (!consultantEmail) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const consultantResult = await query(
      'SELECT id FROM consultants WHERE email = $1',
      [consultantEmail]
    );

    if (consultantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const consultantId = consultantResult.rows[0].id;

    // Get referred MAS
    const masResult = await query(
      `SELECT mas.id, mas.material_name, mas.consultant_reply, mas.consultant_replied_at,
              p.name as project_name
       FROM material_approval_sheets mas
       JOIN projects p ON mas.project_id = p.id
       WHERE mas.referred_to_consultant_id = $1
       ORDER BY mas.created_at DESC`,
      [consultantId]
    );

    // Get referred RFI
    const rfiResult = await query(
      `SELECT rfi.id, rfi.title, rfi.consultant_reply, rfi.consultant_replied_at,
              p.name as project_name
       FROM requests_for_information rfi
       JOIN projects p ON rfi.project_id = p.id
       WHERE rfi.referred_to_consultant_id = $1
       ORDER BY rfi.created_at DESC`,
      [consultantId]
    );

    res.json({
      mas: masResult.rows,
      rfi: rfiResult.rows
    });
  } catch (error) {
    console.error('Error fetching referred items:', error);
    res.status(500).json({ error: 'Failed to fetch referred items' });
  }
});

// Refer MAS to consultant
app.patch('/api/mas/:id/refer-consultant', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { consultant_id } = req.body;

    await query(
      `UPDATE material_approval_sheets
       SET referred_to_consultant_id = $1, consultant_reply_status = 'pending'
       WHERE id = $2`,
      [consultant_id, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error referring MAS to consultant:', error);
    res.status(500).json({ error: 'Failed to refer to consultant' });
  }
});

// Refer RFI to consultant
app.patch('/api/rfi/:id/refer-consultant', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { consultant_id } = req.body;

    await query(
      `UPDATE requests_for_information
       SET referred_to_consultant_id = $1, consultant_reply_status = 'pending'
       WHERE id = $2`,
      [consultant_id, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error referring RFI to consultant:', error);
    res.status(500).json({ error: 'Failed to refer to consultant' });
  }
});

// Get MAS details for consultant
app.get('/api/consultants/mas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const consultantEmail = req.headers['x-consultant-email'];
    const devUserEmail = req.headers['x-dev-user-email'];

    // Super admin can view any MAS
    if (devUserEmail && !consultantEmail) {
      const result = await query(
        `SELECT mas.*, p.name as project_name
         FROM material_approval_sheets mas
         JOIN projects p ON mas.project_id = p.id
         WHERE mas.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'MAS not found' });
      }

      return res.json(result.rows[0]);
    }

    const result = await query(
      `SELECT mas.*, p.name as project_name
       FROM material_approval_sheets mas
       JOIN projects p ON mas.project_id = p.id
       JOIN consultants c ON mas.referred_to_consultant_id = c.id
       WHERE mas.id = $1 AND c.email = $2`,
      [id, consultantEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MAS not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching MAS:', error);
    res.status(500).json({ error: 'Failed to fetch MAS' });
  }
});

// Submit consultant reply for MAS
app.post('/api/consultants/mas/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const consultantEmail = req.headers['x-consultant-email'];

    await query(
      `UPDATE material_approval_sheets mas
       SET consultant_reply = $1, consultant_replied_at = NOW(), consultant_reply_status = 'replied'
       FROM consultants c
       WHERE mas.id = $2 AND mas.referred_to_consultant_id = c.id AND c.email = $3`,
      [reply, id, consultantEmail]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting MAS reply:', error);
    res.status(500).json({ error: 'Failed to submit reply' });
  }
});

// Get RFI details for consultant
app.get('/api/consultants/rfi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const consultantEmail = req.headers['x-consultant-email'];
    const devUserEmail = req.headers['x-dev-user-email'];

    // Super admin can view any RFI
    if (devUserEmail && !consultantEmail) {
      const result = await query(
        `SELECT rfi.*, p.name as project_name, u.full_name as raised_by_name
         FROM requests_for_information rfi
         JOIN projects p ON rfi.project_id = p.id
         LEFT JOIN users u ON rfi.raised_by_id = u.id
         WHERE rfi.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'RFI not found' });
      }

      return res.json(result.rows[0]);
    }

    const result = await query(
      `SELECT rfi.*, p.name as project_name, u.full_name as raised_by_name
       FROM requests_for_information rfi
       JOIN projects p ON rfi.project_id = p.id
       LEFT JOIN users u ON rfi.raised_by_id = u.id
       JOIN consultants c ON rfi.referred_to_consultant_id = c.id
       WHERE rfi.id = $1 AND c.email = $2`,
      [id, consultantEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RFI not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching RFI:', error);
    res.status(500).json({ error: 'Failed to fetch RFI' });
  }
});

// Submit consultant reply for RFI
app.post('/api/consultants/rfi/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const consultantEmail = req.headers['x-consultant-email'];

    await query(
      `UPDATE requests_for_information rfi
       SET consultant_reply = $1, consultant_replied_at = NOW(), consultant_reply_status = 'replied'
       FROM consultants c
       WHERE rfi.id = $2 AND rfi.referred_to_consultant_id = c.id AND c.email = $3`,
      [reply, id, consultantEmail]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting RFI reply:', error);
    res.status(500).json({ error: 'Failed to submit reply' });
  }
});

// Get project details for consultant
app.get('/api/consultants/project/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const consultantEmail = req.headers['x-consultant-email'];
    const devUserEmail = req.headers['x-dev-user-email'];

    // Super admin can view any project
    if (devUserEmail && !consultantEmail) {
      const result = await query(
        `SELECT * FROM projects WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json(result.rows[0]);
    }

    const result = await query(
      `SELECT p.*
       FROM projects p
       JOIN project_consultants pc ON p.id = pc.project_id
       JOIN consultants c ON pc.consultant_id = c.id
       WHERE p.id = $1 AND c.email = $2`,
      [id, consultantEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or not accessible' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Get drawings for project (consultant access)
app.get('/api/consultants/project/:id/drawings', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Implement drawings retrieval when drawings table is available
    res.json([]);
  } catch (error) {
    console.error('Error fetching drawings:', error);
    res.status(500).json({ error: 'Failed to fetch drawings' });
  }
});

// ============= END CONSULTANT ENDPOINTS =============

// ============= VENDOR ENDPOINTS =============

// Register vendor
app.post('/api/vendors/register', verifyToken, async (req, res) => {
  try {
    const { name, email, contactNumber, companyName, projectId } = req.body;
    const assignedBy = req.userId;

    // Insert vendor
    const result = await query(
      `INSERT INTO vendors (name, email, contact_number, company_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = $1, contact_number = $2, company_name = $3, is_active = true
       RETURNING id`,
      [name, email, contactNumber, companyName]
    );

    const vendorId = result.rows[0].id;

    // Link vendor to project if provided
    if (projectId) {
      await query(
        `INSERT INTO project_vendors (project_id, vendor_id, assigned_by_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, vendor_id) DO NOTHING`,
        [projectId, vendorId, assignedBy]
      );
    }

    res.json({ success: true, vendorId });
  } catch (error) {
    console.error('Error registering vendor:', error);
    res.status(500).json({ error: 'Failed to register vendor' });
  }
});

// List all vendors
app.get('/api/vendors/list', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, contact_number, company_name, is_active, created_at
       FROM vendors
       ORDER BY name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Send OTP to vendor email
app.post('/api/vendors/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if vendor exists
    const vendor = await query(
      'SELECT id FROM vendors WHERE email = $1 AND is_active = true',
      [email]
    );

    if (vendor.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found or inactive' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP in database
    await query(
      `INSERT INTO vendor_otp (email, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [email, otp, expiresAt]
    );

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp, 'vendor');
    
    if (!emailSent) {
      logger.warn(`Failed to send OTP email to vendor ${email}, but OTP is available`);
      // Fallback: Log OTP in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] OTP for vendor ${email}: ${otp}`);
      }
    }

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending vendor OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and login vendor
app.post('/api/vendors/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Verify OTP
    const otpResult = await query(
      `SELECT id FROM vendor_otp
       WHERE email = $1 AND otp = $2 AND is_used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await query(
      'UPDATE vendor_otp SET is_used = true WHERE id = $1',
      [otpResult.rows[0].id]
    );

    // Get vendor details
    const vendor = await query(
      'SELECT id, name, email FROM vendors WHERE email = $1',
      [email]
    );

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    res.json({
      success: true,
      token,
      vendorId: vendor.rows[0].id,
      vendor: vendor.rows[0]
    });
  } catch (error) {
    console.error('Error verifying vendor OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Get vendor profile and projects
app.get('/api/vendors/profile', async (req, res) => {
  try {
    const vendorEmail = req.headers['x-vendor-email'];
    const devUserEmail = req.headers['x-dev-user-email'];
    
    // Allow super admin to view as vendor
    if (devUserEmail && !vendorEmail) {
      // Super admin viewing all projects
      const projectsResult = await query(
        `SELECT id, name, description, lifecycle_stage, completion_percentage
         FROM projects
         ORDER BY name`
      );

      return res.json({
        vendor: { name: 'Super Admin', email: devUserEmail },
        projects: projectsResult.rows
      });
    }

    if (!vendorEmail) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Get vendor details
    const vendorResult = await query(
      'SELECT id, name, email, contact_number, company_name FROM vendors WHERE email = $1',
      [vendorEmail]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = vendorResult.rows[0];

    // Get assigned projects
    const projectsResult = await query(
      `SELECT DISTINCT p.id, p.name, p.description, p.lifecycle_stage, p.completion_percentage
       FROM projects p
       JOIN project_vendors pv ON p.id = pv.project_id
       WHERE pv.vendor_id = $1
       ORDER BY p.name`,
      [vendor.id]
    );

    res.json({
      vendor,
      projects: projectsResult.rows
    });
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============= END VENDOR ENDPOINTS =============

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(port, async () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Version: ${API_VERSION}`);
  logger.info(`Health check available at http://localhost:${port}/api/health`);
  
  // Initialize database tables
  await initializeDatabase();
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new requests
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      await closePool();
      
      // Close other resources if needed
      logger.info('All resources closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});