import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { query } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { upload, uploadToGCS, deleteFromGCS, isStorageConfigured } from './storage.js';
import { 
  isLLMConfigured, 
  executeNaturalLanguageQuery, 
  suggestVisualization,
  generateProjectStory,
  chatWithDatabase 
} from './llm.js';

const app = express();
const port = process.env.PORT || 5175;

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
    console.warn('⚠️  Firebase Admin SDK not configured. Auth middleware will be disabled.');
  }
  
  if (adminConfig) {
    admin.initializeApp({
      credential: admin.credential.cert(adminConfig),
    });
    firebaseAdmin = admin;
    console.log('✅ Firebase Admin SDK initialized');
  }
} catch (error) {
  console.warn('⚠️  Failed to initialize Firebase Admin SDK:', error.message);
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../public')));

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

// ============================================================================
// Routes
// ============================================================================

// Public health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Chat with database
app.post('/api/llm/chat', verifyToken, async (req, res) => {
  try {
    if (!isLLMConfigured()) {
      return res.status(503).json({ 
        error: 'LLM service not configured'
      });
    }

    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await chatWithDatabase(message, history || []);
    
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

// Super Admin Email
const SUPER_ADMIN_EMAIL = 'lodhaatelier@gmail.com';

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
    
    console.log('✓ users table initialized');

    // Create projects table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Concept',
        lifecycle_stage VARCHAR(50) NOT NULL DEFAULT 'Concept',
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
      ADD COLUMN IF NOT EXISTS lead_name VARCHAR(255)
    `);
    console.log('✓ projects table migrated (project_status, site_status, lead_name)');

    // Create buildings table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        building_type VARCHAR(100),
        application_type VARCHAR(100) NOT NULL,
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

    // Create floors table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS floors (
        id SERIAL PRIMARY KEY,
        building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
        floor_number INTEGER NOT NULL,
        floor_name VARCHAR(100),
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
    if (email === SUPER_ADMIN_EMAIL) {
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

// Add team member to project
app.post('/api/projects/:id/team', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, assignedBy } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const text = `
      INSERT INTO project_team (project_id, user_id, role, assigned_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (project_id, user_id) 
      DO UPDATE SET role = $3, assigned_by = $4, assigned_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await query(text, [id, userId, role || null, assignedBy || null]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding team member:', error);
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
      SELECT * FROM material_approval_sheets
      WHERE project_id = $1
      ORDER BY updated_at DESC
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
      SELECT r.*, u.full_name as raised_by_name
      FROM requests_for_information r
      LEFT JOIN users u ON r.raised_by_id = u.id
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
    // Determine user level
    let userLevel = 'L4'; // Default
    
    // Super admin check - also insert into DB so other endpoints can access it
    if (email === SUPER_ADMIN_EMAIL) {
      userLevel = 'SUPER_ADMIN';
    }

    const text = `
      INSERT INTO users (email, full_name, user_level, last_login)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (email) 
      DO UPDATE SET 
        last_login = CURRENT_TIMESTAMP,
        full_name = EXCLUDED.full_name,
        user_level = EXCLUDED.user_level
      RETURNING id, email, full_name, user_level, role;
    `;
    
    const result = await query(text, [email, fullName, userLevel]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user data' });
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

// Create new project
app.post('/api/projects', async (req, res) => {
  const { name, location, latitude, longitude, buildings, assignedLeadId, userEmail } = req.body;

  try {
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    console.log('📝 Creating project:', { name, location, buildingCount: buildings?.length, assignedLeadId });

    // Create project with optional assigned lead
    const projectResult = await query(
      `INSERT INTO projects (name, description, lifecycle_stage, start_date, target_completion_date, assigned_lead_id)
       VALUES ($1, $2, 'Concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', $3)
       RETURNING id`,
      [name, location, assignedLeadId || null]
    );

    const projectId = projectResult.rows[0].id;

    // First pass: Insert all buildings without twin relationships
    const buildingIdMap = {}; // Map building names to their database IDs
    for (const building of buildings) {
      const buildingResult = await query(
        `INSERT INTO buildings (
          project_id, name, application_type, location_latitude, location_longitude, 
          residential_type, villa_type, villa_count, building_type,
          pool_volume, has_lift, lift_name, lift_passenger_capacity,
          car_parking_count_per_floor, car_parking_area, two_wheeler_parking_count, 
          two_wheeler_parking_area, ev_parking_percentage, shop_count, shop_area,
          office_count, office_area, common_area, twin_of_building_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
      const floorIdMap = {}; // Map floor names to their database IDs
      for (const floor of building.floors) {
        const floorResult = await query(
          `INSERT INTO floors (building_id, floor_number, floor_name, twin_of_floor_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [buildingId, floor.floorNumber, floor.floorName, null]
        );

        const floorId = floorResult.rows[0].id;
        floorIdMap[floor.floorName] = floorId;

        // Insert flats
        for (const flat of floor.flats) {
          await query(
            `INSERT INTO flats (floor_id, flat_type, area_sqft, number_of_flats)
             VALUES ($1, $2, $3, $4)`,
            [
              floorId, 
              flat.type || null, 
              flat.area && flat.area !== '' ? parseFloat(flat.area) : null, 
              flat.count && flat.count !== '' ? parseInt(flat.count) : null
            ]
          );
        }
      }

      // Second pass: Update twin relationships
      for (const floor of building.floors) {
        if (floor.twinOfFloorName && floorIdMap[floor.twinOfFloorName]) {
          await query(
            `UPDATE floors SET twin_of_floor_id = $1 WHERE id = $2`,
            [floorIdMap[floor.twinOfFloorName], floorIdMap[floor.floorName]]
          );
        }
      }
    }

    // Second pass: Update building twin relationships
    for (const building of buildings) {
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
  const { name, location, latitude, longitude, buildings, assignedLeadId } = req.body;

  console.log('🔄 PATCH /api/projects/:id called', { id, name, buildingCount: buildings?.length, assignedLeadId });

  try {
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    console.log('📝 Updating project:', { id, name, location, buildingCount: buildings?.length, assignedLeadId });

    // Update project basic info including assigned lead
    await query(
      `UPDATE projects 
       SET name = $1, description = $2, assigned_lead_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [name, location, assignedLeadId || null, id]
    );

    // Delete existing buildings, floors, and flats (cascade will handle related records)
    await query('DELETE FROM buildings WHERE project_id = $1', [id]);

    // First pass: Insert all buildings without twin relationships
    const buildingIdMap = {};
    for (const building of buildings || []) {
      const buildingResult = await query(
        `INSERT INTO buildings (
          project_id, name, application_type, location_latitude, location_longitude, 
          residential_type, villa_type, villa_count, building_type,
          pool_volume, has_lift, lift_name, lift_passenger_capacity,
          car_parking_count_per_floor, car_parking_area, two_wheeler_parking_count, 
          two_wheeler_parking_area, ev_parking_percentage, shop_count, shop_area,
          office_count, office_area, common_area, twin_of_building_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
      for (const floor of building.floors || []) {
        const floorResult = await query(
          `INSERT INTO floors (building_id, floor_number, floor_name, twin_of_floor_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [buildingId, floor.floorNumber, floor.floorName, null]
        );

        const floorId = floorResult.rows[0].id;
        floorIdMap[floor.floorName] = floorId;

        // Insert flats
        for (const flat of floor.flats || []) {
          await query(
            `INSERT INTO flats (floor_id, flat_type, area_sqft, number_of_flats)
             VALUES ($1, $2, $3, $4)`,
            [
              floorId, 
              flat.type || null, 
              flat.area && flat.area !== '' ? parseFloat(flat.area) : null, 
              flat.count && flat.count !== '' ? parseInt(flat.count) : null
            ]
          );
        }
      }

      // Second pass: Update twin relationships
      for (const floor of building.floors || []) {
        if (floor.twinOfFloorName && floorIdMap[floor.twinOfFloorName]) {
          await query(
            `UPDATE floors SET twin_of_floor_id = $1 WHERE id = $2`,
            [floorIdMap[floor.twinOfFloorName], floorIdMap[floor.floorName]]
          );
        }
      }
    }

    // Second pass: Update building twin relationships
    for (const building of buildings || []) {
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

// Fetch full project with hierarchy
app.get('/api/projects/:id/full', async (req, res) => {
  const { id } = req.params;

  try {
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];
    const buildingsResult = await query('SELECT * FROM buildings WHERE project_id = $1', [id]);

    const buildings = [];
    // First, create a map of building IDs to names for twin reference lookup
    const buildingIdToNameMap = {};
    buildingsResult.rows.forEach(b => {
      buildingIdToNameMap[b.id] = b.name;
    });

    for (const building of buildingsResult.rows) {
      const floorsResult = await query('SELECT * FROM floors WHERE building_id = $1', [building.id]);

      const floors = [];
      // First, create a map of floor IDs to names for twin reference lookup
      const floorIdToNameMap = {};
      floorsResult.rows.forEach(f => {
        floorIdToNameMap[f.id] = f.floor_name;
      });

      for (const floor of floorsResult.rows) {
        const flatsResult = await query('SELECT * FROM flats WHERE floor_id = $1', [floor.id]);

        floors.push({
          id: floor.id,
          floorNumber: floor.floor_number,
          floorName: floor.floor_name,
          twinOfFloorId: floor.twin_of_floor_id,
          twinOfFloorName: floor.twin_of_floor_id ? floorIdToNameMap[floor.twin_of_floor_id] : null,
          // Also include snake_case for ProjectDetail page compatibility
          floor_number: floor.floor_number,
          floor_name: floor.floor_name,
          twin_of_floor_id: floor.twin_of_floor_id,
          flats: flatsResult.rows.map(f => ({
            id: f.id,
            type: f.flat_type,
            area: f.area_sqft,
            count: f.number_of_flats,
            // Also include snake_case for compatibility
            flat_type: f.flat_type,
            area_sqft: f.area_sqft,
            number_of_flats: f.number_of_flats,
          })),
        });
      }

      buildings.push({
        id: building.id,
        name: building.name,
        applicationType: building.application_type,
        application_type: building.application_type, // snake_case for compatibility
        residentialType: building.residential_type,
        villaType: building.villa_type,
        villaCount: building.villa_count,
        isTwin: building.is_twin,
        twinOfBuildingId: building.twin_of_building_id,
        twinOfBuildingName: building.twin_of_building_id ? buildingIdToNameMap[building.twin_of_building_id] : null,
        twin_of_building_id: building.twin_of_building_id, // snake_case for compatibility
        floors,
      });
    }

    res.json({
      id: project.id,
      name: project.name,
      location: project.description,
      latitude: buildingsResult.rows[0]?.location_latitude || '',
      longitude: buildingsResult.rows[0]?.location_longitude || '',
      buildings,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
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
    let queryText = 'SELECT * FROM requests_for_information WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'All') {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (projectId) {
      queryText += ` AND project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC';

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
      'SELECT * FROM requests_for_information WHERE id = $1',
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
    let queryText = 'SELECT * FROM material_approval_sheets WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'All') {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (l2_status && l2_status !== 'All') {
      queryText += ` AND l2_status = $${paramIndex}`;
      params.push(l2_status);
      paramIndex++;
    }

    if (l1_status && l1_status !== 'All') {
      queryText += ` AND l1_status = $${paramIndex}`;
      params.push(l1_status);
      paramIndex++;
    }

    if (projectId) {
      queryText += ` AND project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    queryText += ' ORDER BY created_at DESC';

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
      `SELECT m.*, p.name as project_name 
       FROM material_approval_sheets m
       LEFT JOIN projects p ON m.project_id = p.id
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

// Get all drawing schedules with optional filters
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

// Get single drawing schedule by ID
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

// Get all design calculations for a project
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

// Get single design calculation by ID
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
      'SELECT * FROM buildings WHERE project_id = $1 ORDER BY name',
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

// ============= END DESIGN CALCULATIONS ENDPOINTS =============

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

    // TODO: Send OTP via email service (for now, just log it)
    console.log(`OTP for ${email}: ${otp}`);

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/api/health`);
  
  // Initialize database tables
  await initializeDatabase();
});