// Policy Management API Endpoints
import { Router } from 'express';
import { query, getClient } from '../db.js';
import logger from '../utils/logger.js';

const router = Router();

// ============================================================================
// POLICY VERSIONS ENDPOINTS
// ============================================================================

/**
 * GET /api/policy-versions
 * Get all policy versions with optional filtering
 */
router.get('/policy-versions', async (req, res) => {
  try {
    const { status, is_default } = req.query;
    
    let sql = `
      SELECT 
        pv.*,
        (SELECT COUNT(*) FROM water_consumption_rates WHERE policy_version_id = pv.id) as water_rates_count,
        (SELECT COUNT(*) FROM occupancy_factors WHERE policy_version_id = pv.id) as occupancy_factors_count,
        (SELECT COUNT(*) FROM calculation_parameters WHERE policy_version_id = pv.id) as calc_params_count
      FROM policy_versions pv
      WHERE 1=1
    `;
    
    const params = [];
    if (status) {
      params.push(status);
      sql += ` AND pv.status = $${params.length}`;
    }
    if (is_default !== undefined) {
      params.push(is_default === 'true');
      sql += ` AND pv.is_default = $${params.length}`;
    }
    
    sql += ' ORDER BY pv.effective_date DESC, pv.id DESC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching policy versions:', error);
    res.status(500).json({ error: 'Failed to fetch policy versions' });
  }
});

/**
 * GET /api/policy-versions/:id
 * Get a specific policy version with all its parameters
 */
router.get('/policy-versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get policy version
    const policyResult = await query(
      'SELECT * FROM policy_versions WHERE id = $1',
      [id]
    );
    
    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Policy version not found' });
    }
    
    const policy = policyResult.rows[0];
    
    // Get all related data
    const [waterRates, occupancyFactors, calcParams] = await Promise.all([
      query('SELECT * FROM water_consumption_rates WHERE policy_version_id = $1 ORDER BY project_type, sub_type, usage_category', [id]),
      query('SELECT * FROM occupancy_factors WHERE policy_version_id = $1 ORDER BY project_type, sub_type, unit_type, factor_type', [id]),
      query('SELECT * FROM calculation_parameters WHERE policy_version_id = $1 ORDER BY category, parameter_name', [id])
    ]);
    
    res.json({
      ...policy,
      water_rates: waterRates.rows,
      occupancy_factors: occupancyFactors.rows,
      calculation_parameters: calcParams.rows
    });
  } catch (error) {
    logger.error('Error fetching policy version:', error);
    res.status(500).json({ error: 'Failed to fetch policy version' });
  }
});

/**
 * POST /api/policy-versions
 * Create a new policy version
 */
router.post('/policy-versions', async (req, res) => {
  try {
    const {
      name,
      policy_number,
      revision_number,
      effective_date,
      document_url,
      description,
      created_by
    } = req.body;
    
    const result = await query(
      `INSERT INTO policy_versions 
       (name, policy_number, revision_number, effective_date, document_url, status, description, created_by)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
       RETURNING *`,
      [name, policy_number, revision_number, effective_date, document_url, description, created_by]
    );
    
    logger.info(`Policy version created: ${result.rows[0].id} by ${created_by}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating policy version:', error);
    res.status(500).json({ error: 'Failed to create policy version' });
  }
});

/**
 * PUT /api/policy-versions/:id
 * Update a policy version
 */
router.put('/policy-versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, policy_number, revision_number, effective_date, description } = req.body;
    
    const result = await query(
      `UPDATE policy_versions 
       SET name = $1, policy_number = $2, revision_number = $3, 
           effective_date = $4, description = $5
       WHERE id = $6
       RETURNING *`,
      [name, policy_number, revision_number, effective_date, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy version not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating policy version:', error);
    res.status(500).json({ error: 'Failed to update policy version' });
  }
});

/**
 * POST /api/policy-versions/:id/activate
 * Activate a policy version (set as default)
 */
router.post('/policy-versions/:id/activate', async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { approved_by } = req.body;
    
    // Remove is_default from all policies
    await client.query('UPDATE policy_versions SET is_default = false');
    
    // Set this one as default and active
    const result = await client.query(
      `UPDATE policy_versions 
       SET status = 'active', is_default = true, approved_by = $1, approved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [approved_by, id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Policy version not found');
    }
    
    // Log the change
    await client.query(
      `INSERT INTO policy_change_log 
       (policy_version_id, table_name, action, new_values, changed_by, reason)
       VALUES ($1, 'policy_versions', 'activate', $2, $3, 'Policy activated and set as default')`,
      [id, JSON.stringify({ status: 'active', is_default: true }), approved_by]
    );
    
    await client.query('COMMIT');
    
    logger.info(`Policy ${id} activated by ${approved_by}`);
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error activating policy:', error);
    res.status(500).json({ error: 'Failed to activate policy' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/policy-versions/:id/archive
 * Archive a policy version
 */
router.post('/policy-versions/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { archived_by } = req.body;
    
    const result = await query(
      `UPDATE policy_versions 
       SET status = 'archived', is_default = false, archived_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy version not found' });
    }
    
    // Log the change
    await query(
      `INSERT INTO policy_change_log 
       (policy_version_id, table_name, action, changed_by, reason)
       VALUES ($1, 'policy_versions', 'archive', $2, 'Policy archived')`,
      [id, archived_by]
    );
    
    logger.info(`Policy ${id} archived by ${archived_by}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error archiving policy:', error);
    res.status(500).json({ error: 'Failed to archive policy' });
  }
});

// ============================================================================
// WATER CONSUMPTION RATES ENDPOINTS
// ============================================================================

/**
 * GET /api/policy-versions/:id/water-rates
 * Get water consumption rates for a policy version
 */
router.get('/policy-versions/:policyId/water-rates', async (req, res) => {
  try {
    const { policyId } = req.params;
    const result = await query(
      `SELECT * FROM water_consumption_rates 
       WHERE policy_version_id = $1 
       ORDER BY project_type, sub_type, usage_category`,
      [policyId]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching water rates:', error);
    res.status(500).json({ error: 'Failed to fetch water rates' });
  }
});

/**
 * POST /api/policy-versions/:id/water-rates
 * Add/update water consumption rates (bulk upsert)
 */
router.post('/policy-versions/:policyId/water-rates', async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { policyId } = req.params;
    const { rates, changed_by } = req.body; // rates is an array
    
    const inserted = [];
    for (const rate of rates) {
      const result = await client.query(
        `INSERT INTO water_consumption_rates 
         (policy_version_id, project_type, sub_type, usage_category, rate_value, unit, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (policy_version_id, project_type, sub_type, usage_category)
         DO UPDATE SET rate_value = $5, unit = $6, notes = $7, updated_at = NOW()
         RETURNING *`,
        [policyId, rate.project_type, rate.sub_type, rate.usage_category, 
         rate.rate_value, rate.unit, rate.notes]
      );
      inserted.push(result.rows[0]);
    }
    
    // Log the changes
    await client.query(
      `INSERT INTO policy_change_log 
       (policy_version_id, table_name, action, new_values, changed_by, reason)
       VALUES ($1, 'water_consumption_rates', 'bulk_upsert', $2, $3, 'Bulk update of water rates')`,
      [policyId, JSON.stringify({ count: rates.length }), changed_by]
    );
    
    await client.query('COMMIT');
    
    logger.info(`${rates.length} water rates updated for policy ${policyId}`);
    res.json(inserted);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating water rates:', error);
    res.status(500).json({ error: 'Failed to update water rates' });
  } finally {
    client.release();
  }
});

// ============================================================================
// OCCUPANCY FACTORS ENDPOINTS
// ============================================================================

/**
 * GET /api/policy-versions/:id/occupancy-factors
 * Get occupancy factors for a policy version
 */
router.get('/policy-versions/:policyId/occupancy-factors', async (req, res) => {
  try {
    const { policyId } = req.params;
    const result = await query(
      `SELECT * FROM occupancy_factors 
       WHERE policy_version_id = $1 
       ORDER BY project_type, sub_type, unit_type, factor_type`,
      [policyId]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching occupancy factors:', error);
    res.status(500).json({ error: 'Failed to fetch occupancy factors' });
  }
});

/**
 * POST /api/policy-versions/:id/occupancy-factors
 * Add/update occupancy factors (bulk upsert)
 */
router.post('/policy-versions/:policyId/occupancy-factors', async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { policyId } = req.params;
    const { factors, changed_by } = req.body;
    
    const inserted = [];
    for (const factor of factors) {
      const result = await client.query(
        `INSERT INTO occupancy_factors 
         (policy_version_id, project_type, sub_type, unit_type, factor_value, factor_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (policy_version_id, project_type, sub_type, unit_type, factor_type)
         DO UPDATE SET factor_value = $5, notes = $7, updated_at = NOW()
         RETURNING *`,
        [policyId, factor.project_type, factor.sub_type, factor.unit_type, 
         factor.factor_value, factor.factor_type, factor.notes]
      );
      inserted.push(result.rows[0]);
    }
    
    await client.query(
      `INSERT INTO policy_change_log 
       (policy_version_id, table_name, action, new_values, changed_by, reason)
       VALUES ($1, 'occupancy_factors', 'bulk_upsert', $2, $3, 'Bulk update of occupancy factors')`,
      [policyId, JSON.stringify({ count: factors.length }), changed_by]
    );
    
    await client.query('COMMIT');
    
    logger.info(`${factors.length} occupancy factors updated for policy ${policyId}`);
    res.json(inserted);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating occupancy factors:', error);
    res.status(500).json({ error: 'Failed to update occupancy factors' });
  } finally {
    client.release();
  }
});

// ============================================================================
// CALCULATION PARAMETERS ENDPOINTS
// ============================================================================

/**
 * GET /api/policy-versions/:id/calculation-parameters
 * Get calculation parameters for a policy version
 */
router.get('/policy-versions/:policyId/calculation-parameters', async (req, res) => {
  try {
    const { policyId } = req.params;
    const result = await query(
      `SELECT * FROM calculation_parameters 
       WHERE policy_version_id = $1 
       ORDER BY category, parameter_name`,
      [policyId]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching calculation parameters:', error);
    res.status(500).json({ error: 'Failed to fetch calculation parameters' });
  }
});

/**
 * GET /api/policy-change-log/:policyId
 * Get change history for a policy
 */
router.get('/policy-change-log/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params;
    const result = await query(
      `SELECT * FROM policy_change_log 
       WHERE policy_version_id = $1 
       ORDER BY changed_at DESC
       LIMIT 100`,
      [policyId]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching change log:', error);
    res.status(500).json({ error: 'Failed to fetch change log' });
  }
});

export default router;
