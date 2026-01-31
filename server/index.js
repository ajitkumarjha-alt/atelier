import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { query } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

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
        material_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ material_approval_sheets table initialized');

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
      `SELECT p.*, u.full_name as assigned_lead_name
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
  const { name, location, latitude, longitude, buildings, userEmail } = req.body;

  try {
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    console.log('📝 Creating project:', { name, location, buildingCount: buildings?.length });

    // Create project
    const projectResult = await query(
      `INSERT INTO projects (name, description, lifecycle_stage, start_date, target_completion_date)
       VALUES ($1, $2, 'Concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months')
       RETURNING id`,
      [name, location]
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
  const { name, location, latitude, longitude, buildings } = req.body;

  console.log('🔄 PATCH /api/projects/:id called', { id, name, buildingCount: buildings?.length });

  try {
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    console.log('📝 Updating project:', { id, name, location, buildingCount: buildings?.length });

    // Update project basic info
    await query(
      `UPDATE projects 
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [name, location, id]
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