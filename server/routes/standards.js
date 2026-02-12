import express from 'express';

const createStandardsRouter = ({ query, verifyToken, logger }) => {
  const router = express.Router();

  // ========== CALCULATION STANDARDS ==========

  // GET /api/standards/calculation - List all calc standards
  router.get('/standards/calculation', verifyToken, async (req, res) => {
    try {
      const { discipline, category, building_type, project_type } = req.query;
      let sql = 'SELECT * FROM calculation_standards WHERE is_active = true';
      const params = [];
      let paramCount = 0;

      if (discipline) { paramCount++; sql += ` AND discipline = $${paramCount}`; params.push(discipline); }
      if (category) { paramCount++; sql += ` AND category = $${paramCount}`; params.push(category); }
      if (building_type) { paramCount++; sql += ` AND building_type = $${paramCount}`; params.push(building_type); }
      if (project_type) { paramCount++; sql += ` AND project_type = $${paramCount}`; params.push(project_type); }

      sql += ' ORDER BY discipline, category, parameter_name';
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching calculation standards:', err);
      res.status(500).json({ error: 'Failed to fetch calculation standards' });
    }
  });

  // POST /api/standards/calculation
  router.post('/standards/calculation', verifyToken, async (req, res) => {
    try {
      const { discipline, category, building_type, project_type, flat_type, area_type,
        parameter_name, parameter_value, unit, state, city, description } = req.body;
      const userId = req.user?.userId;

      const result = await query(
        `INSERT INTO calculation_standards (discipline, category, building_type, project_type,
         flat_type, area_type, parameter_name, parameter_value, unit, state, city, description, created_by_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [discipline, category, building_type, project_type, flat_type, area_type,
         parameter_name, parameter_value, unit, state, city, description, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating calculation standard:', err);
      res.status(500).json({ error: 'Failed to create calculation standard' });
    }
  });

  // PUT /api/standards/calculation/:id
  router.put('/standards/calculation/:id', verifyToken, async (req, res) => {
    try {
      const { discipline, category, building_type, project_type, flat_type, area_type,
        parameter_name, parameter_value, unit, state, city, description } = req.body;

      const result = await query(
        `UPDATE calculation_standards SET
          discipline = COALESCE($1, discipline), category = COALESCE($2, category),
          building_type = COALESCE($3, building_type), project_type = COALESCE($4, project_type),
          flat_type = COALESCE($5, flat_type), area_type = COALESCE($6, area_type),
          parameter_name = COALESCE($7, parameter_name), parameter_value = COALESCE($8, parameter_value),
          unit = COALESCE($9, unit), state = COALESCE($10, state), city = COALESCE($11, city),
          description = COALESCE($12, description)
         WHERE id = $13 RETURNING *`,
        [discipline, category, building_type, project_type, flat_type, area_type,
         parameter_name, parameter_value, unit, state, city, description, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Standard not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating calculation standard:', err);
      res.status(500).json({ error: 'Failed to update calculation standard' });
    }
  });

  // DELETE /api/standards/calculation/:id
  router.delete('/standards/calculation/:id', verifyToken, async (req, res) => {
    try {
      await query('UPDATE calculation_standards SET is_active = false WHERE id = $1', [req.params.id]);
      res.json({ message: 'Standard deactivated' });
    } catch (err) {
      logger.error('Error deleting calculation standard:', err);
      res.status(500).json({ error: 'Failed to delete calculation standard' });
    }
  });

  // ========== TRANSFORMER RATINGS ==========

  // GET /api/standards/transformers
  router.get('/standards/transformers', verifyToken, async (req, res) => {
    try {
      const { project_type, state, city } = req.query;
      let sql = 'SELECT * FROM transformer_ratings WHERE is_active = true';
      const params = [];
      let paramCount = 0;
      if (project_type) { paramCount++; sql += ` AND project_type = $${paramCount}`; params.push(project_type); }
      if (state) { paramCount++; sql += ` AND state = $${paramCount}`; params.push(state); }
      if (city) { paramCount++; sql += ` AND city = $${paramCount}`; params.push(city); }
      sql += ' ORDER BY project_type, rating_kva';
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching transformer ratings:', err);
      res.status(500).json({ error: 'Failed to fetch transformer ratings' });
    }
  });

  // POST /api/standards/transformers
  router.post('/standards/transformers', verifyToken, async (req, res) => {
    try {
      const { project_type, rating_kva, state, city, description } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO transformer_ratings (project_type, rating_kva, state, city, description, created_by_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [project_type, rating_kva, state, city, description, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating transformer rating:', err);
      res.status(500).json({ error: 'Failed to create transformer rating' });
    }
  });

  // PUT /api/standards/transformers/:id
  router.put('/standards/transformers/:id', verifyToken, async (req, res) => {
    try {
      const { project_type, rating_kva, state, city, description } = req.body;
      const result = await query(
        `UPDATE transformer_ratings SET project_type = $1, rating_kva = $2, state = $3, city = $4, description = $5
         WHERE id = $6 RETURNING *`,
        [project_type, rating_kva, state, city, description, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating transformer rating:', err);
      res.status(500).json({ error: 'Failed to update transformer rating' });
    }
  });

  // ========== PHE STANDARDS ==========

  // GET /api/standards/phe
  router.get('/standards/phe', verifyToken, async (req, res) => {
    try {
      const { project_type } = req.query;
      let sql = 'SELECT * FROM phe_standards WHERE is_active = true';
      const params = [];
      if (project_type) { sql += ' AND project_type = $1'; params.push(project_type); }
      sql += ' ORDER BY project_type, use_type';
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching PHE standards:', err);
      res.status(500).json({ error: 'Failed to fetch PHE standards' });
    }
  });

  // POST /api/standards/phe
  router.post('/standards/phe', verifyToken, async (req, res) => {
    try {
      const { project_type, use_type, per_capita_demand_lpd, storage_days_ugr,
        storage_days_oht, storage_days_rainwater, description } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO phe_standards (project_type, use_type, per_capita_demand_lpd, storage_days_ugr,
         storage_days_oht, storage_days_rainwater, description, created_by_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [project_type, use_type, per_capita_demand_lpd, storage_days_ugr,
         storage_days_oht, storage_days_rainwater, description, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating PHE standard:', err);
      res.status(500).json({ error: 'Failed to create PHE standard' });
    }
  });

  // PUT /api/standards/phe/:id
  router.put('/standards/phe/:id', verifyToken, async (req, res) => {
    try {
      const { project_type, use_type, per_capita_demand_lpd, storage_days_ugr,
        storage_days_oht, storage_days_rainwater, description } = req.body;
      const result = await query(
        `UPDATE phe_standards SET project_type = $1, use_type = $2, per_capita_demand_lpd = $3,
         storage_days_ugr = $4, storage_days_oht = $5, storage_days_rainwater = $6, description = $7
         WHERE id = $8 RETURNING *`,
        [project_type, use_type, per_capita_demand_lpd, storage_days_ugr,
         storage_days_oht, storage_days_rainwater, description, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating PHE standard:', err);
      res.status(500).json({ error: 'Failed to update PHE standard' });
    }
  });

  // ========== FIRE FIGHTING STANDARDS ==========

  // GET /api/standards/fire
  router.get('/standards/fire', verifyToken, async (req, res) => {
    try {
      const result = await query(
        'SELECT * FROM fire_standards WHERE is_active = true ORDER BY building_height_range');
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching fire standards:', err);
      res.status(500).json({ error: 'Failed to fetch fire standards' });
    }
  });

  // POST /api/standards/fire
  router.post('/standards/fire', verifyToken, async (req, res) => {
    try {
      const { building_height_range, num_buildings_range, application,
        ugr_storage_litres, oht_storage_litres, description } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO fire_standards (building_height_range, num_buildings_range, application,
         ugr_storage_litres, oht_storage_litres, description, created_by_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [building_height_range, num_buildings_range, application,
         ugr_storage_litres, oht_storage_litres, description, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating fire standard:', err);
      res.status(500).json({ error: 'Failed to create fire standard' });
    }
  });

  // ========== POPULATION STANDARDS ==========

  // GET /api/standards/population
  router.get('/standards/population', verifyToken, async (req, res) => {
    try {
      const result = await query(
        'SELECT * FROM population_standards WHERE is_active = true ORDER BY building_type, flat_type');
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching population standards:', err);
      res.status(500).json({ error: 'Failed to fetch population standards' });
    }
  });

  // POST /api/standards/population
  router.post('/standards/population', verifyToken, async (req, res) => {
    try {
      const { building_type, flat_type, population_per_flat, description } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO population_standards (building_type, flat_type, population_per_flat, description, created_by_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *
         ON CONFLICT (building_type, flat_type) DO UPDATE SET population_per_flat = EXCLUDED.population_per_flat`,
        [building_type, flat_type, population_per_flat, description, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating population standard:', err);
      res.status(500).json({ error: 'Failed to create population standard' });
    }
  });

  // ========== EV STANDARDS ==========

  // GET /api/standards/ev
  router.get('/standards/ev', verifyToken, async (req, res) => {
    try {
      const result = await query('SELECT * FROM ev_standards WHERE is_active = true ORDER BY building_type');
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching EV standards:', err);
      res.status(500).json({ error: 'Failed to fetch EV standards' });
    }
  });

  // POST /api/standards/ev
  router.post('/standards/ev', verifyToken, async (req, res) => {
    try {
      const { building_type, ev_car_percentage, description } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO ev_standards (building_type, ev_car_percentage, description, created_by_id)
         VALUES ($1, $2, $3, $4) RETURNING *
         ON CONFLICT (building_type) DO UPDATE SET ev_car_percentage = EXCLUDED.ev_car_percentage`,
        [building_type, ev_car_percentage, description, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating EV standard:', err);
      res.status(500).json({ error: 'Failed to create EV standard' });
    }
  });

  // ========== DDS POLICIES ==========

  // GET /api/standards/dds-policies
  router.get('/standards/dds-policies', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT dp.*, u.full_name as created_by_name
         FROM dds_policies dp
         LEFT JOIN users u ON u.id = dp.created_by_id
         WHERE dp.is_active = true
         ORDER BY dp.name`
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching DDS policies:', err);
      res.status(500).json({ error: 'Failed to fetch DDS policies' });
    }
  });

  // POST /api/standards/dds-policies
  router.post('/standards/dds-policies', verifyToken, async (req, res) => {
    try {
      const { name, description, policy_data, building_type } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO dds_policies (name, description, policy_data, building_type, created_by_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [name, description, JSON.stringify(policy_data), building_type, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating DDS policy:', err);
      res.status(500).json({ error: 'Failed to create DDS policy' });
    }
  });

  // ========== REFERENCE DOCUMENTS ==========

  // GET /api/standards/reference-documents
  router.get('/standards/reference-documents', verifyToken, async (req, res) => {
    try {
      const { category } = req.query;
      let sql = `SELECT rd.*, u.full_name as uploaded_by_name
                 FROM reference_documents rd
                 LEFT JOIN users u ON u.id = rd.uploaded_by_id
                 WHERE rd.is_active = true`;
      const params = [];
      if (category) { sql += ' AND rd.category = $1'; params.push(category); }
      sql += ' ORDER BY rd.category, rd.document_name';
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching reference documents:', err);
      res.status(500).json({ error: 'Failed to fetch reference documents' });
    }
  });

  // POST /api/standards/reference-documents
  router.post('/standards/reference-documents', verifyToken, async (req, res) => {
    try {
      const { category, subcategory, document_name, file_url, file_type, file_size } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO reference_documents (category, subcategory, document_name, file_url, file_type, file_size, uploaded_by_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [category, subcategory, document_name, file_url, file_type, file_size, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating reference document:', err);
      res.status(500).json({ error: 'Failed to create reference document' });
    }
  });

  // POST /api/standards/reference-documents/:id/process - Process doc with LLM
  router.post('/standards/reference-documents/:id/process', verifyToken, async (req, res) => {
    try {
      // This would integrate with the LLM service to extract factors
      const doc = await query('SELECT * FROM reference_documents WHERE id = $1', [req.params.id]);
      if (doc.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

      // Mark as processing - actual LLM processing would be async
      await query(
        `UPDATE reference_documents SET is_processed = true, llm_processed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [req.params.id]
      );

      res.json({ message: 'Document queued for LLM processing', document: doc.rows[0] });
    } catch (err) {
      logger.error('Error processing document:', err);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  return router;
};

export default createStandardsRouter;
