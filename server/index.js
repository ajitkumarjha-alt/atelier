import express from 'express';
import cors from 'cors';
import { query } from './db.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Super Admin Email
const SUPER_ADMIN_EMAIL = 'lodhaatelier@gmail.com';

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

// Projects endpoint - filters based on user level
app.get('/api/projects', async (req, res) => {
  try {
    const userEmail = req.query.userEmail;
    
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
    
    // Super admin check (not stored in DB, checked at runtime)
    if (email === SUPER_ADMIN_EMAIL) {
      return res.json({ 
        id: 0, 
        email, 
        full_name: fullName, 
        user_level: 'SUPER_ADMIN', 
        role: 'super_admin' 
      });
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
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/api/health`);
});