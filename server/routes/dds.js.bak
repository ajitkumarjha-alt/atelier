import express from 'express';

const createDDSRouter = ({ query, verifyToken, logger }) => {
  const router = express.Router();

  // Helper: log activity
  const logActivity = async (projectId, userId, email, entityType, entityId, action, changes, description) => {
    try {
      await query(
        `INSERT INTO activity_log (project_id, user_id, user_email, entity_type, entity_id, action, changes, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [projectId, userId, email, entityType, entityId, action, JSON.stringify(changes), description]
      );
    } catch (err) {
      logger.error('Error logging activity:', err);
    }
  };

  // ========== DDS CRUD ==========

  // POST /api/projects/:projectId/dds - Create DDS
  router.post('/projects/:projectId/dds', verifyToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { dds_type = 'internal' } = req.body;
      const userId = req.user?.userId;

      // Get existing version count
      const versionResult = await query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM dds WHERE project_id = $1 AND dds_type = $2',
        [projectId, dds_type]
      );
      const nextVersion = versionResult.rows[0].next_version;

      const result = await query(
        `INSERT INTO dds (project_id, version, dds_type, status, created_by_id)
         VALUES ($1, $2, $3, 'active', $4) RETURNING *`,
        [projectId, nextVersion, dds_type, userId]
      );
      const dds = result.rows[0];

      // Auto-generate DDS items from project data (buildings, floors, external areas)
      await generateDDSItems(dds.id, projectId, dds_type);

      await logActivity(projectId, userId, req.user?.email, 'dds', dds.id, 'create',
        { version: nextVersion, type: dds_type }, `Created DDS v${nextVersion} (${dds_type})`);

      // Fetch full DDS with items
      const fullDDS = await getDDSWithItems(dds.id);
      res.status(201).json(fullDDS);
    } catch (err) {
      logger.error('Error creating DDS:', err);
      res.status(500).json({ error: 'Failed to create DDS' });
    }
  });

  // Auto-generate DDS items based on project structure
  const generateDDSItems = async (ddsId, projectId, ddsType) => {
    // Get buildings with floors
    const buildings = await query(
      `SELECT b.id, b.name, b.application_type, b.status,
              json_agg(json_build_object('id', f.id, 'name', f.floor_name, 'number', f.floor_number) ORDER BY f.floor_number)
              FILTER (WHERE f.id IS NOT NULL) AS floors
       FROM buildings b
       LEFT JOIN floors f ON f.building_id = b.id
       WHERE b.project_id = $1
       GROUP BY b.id ORDER BY b.name`, [projectId]
    );

    const disciplines = ['Electrical', 'PHE', 'Fire Fighting', 'HVAC', 'Security'];
    const drawingTypes = ['Layout Drawing', 'Schematic', 'SLD', 'BOQ'];
    let sortOrder = 0;

    // Offset dates by -7 days for consultant DDS
    const dateOffset = ddsType === 'consultant' ? -7 : 0;
    const getDate = (daysFromNow) => {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow + dateOffset);
      return d.toISOString().split('T')[0];
    };

    for (const building of buildings.rows) {
      for (const discipline of disciplines) {
        // Building-level items
        for (const drawType of drawingTypes) {
          sortOrder++;
          await query(
            `INSERT INTO dds_items (dds_id, building_id, item_category, item_name, discipline,
             expected_start_date, expected_completion_date, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [ddsId, building.id, discipline,
             `${building.name} - ${discipline} ${drawType}`, discipline,
             getDate(sortOrder * 3), getDate(sortOrder * 3 + 14), sortOrder]
          );
        }

        // Floor-level items
        if (building.floors) {
          for (const floor of building.floors) {
            sortOrder++;
            await query(
              `INSERT INTO dds_items (dds_id, building_id, floor_id, item_category, item_name,
               discipline, expected_start_date, expected_completion_date, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [ddsId, building.id, floor.id, discipline,
               `${building.name} - ${floor.name || 'Floor ' + floor.number} - ${discipline} Layout`,
               discipline, getDate(sortOrder * 2), getDate(sortOrder * 2 + 10), sortOrder]
            );
          }
        }
      }
    }

    // External area items
    const siteAreas = await query(
      'SELECT id, name, area_type FROM site_areas WHERE project_id = $1', [projectId]
    );
    for (const area of siteAreas.rows) {
      for (const discipline of disciplines) {
        sortOrder++;
        await query(
          `INSERT INTO dds_items (dds_id, item_category, item_name, discipline,
           expected_start_date, expected_completion_date, sort_order, is_external_area, external_area_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
          [ddsId, discipline,
           `${area.name} (${area.area_type}) - ${discipline}`, discipline,
           getDate(sortOrder * 2), getDate(sortOrder * 2 + 14), sortOrder, area.area_type]
        );
      }
    }
  };

  // Helper: Get DDS with all items
  const getDDSWithItems = async (ddsId) => {
    const ddsResult = await query(
      `SELECT d.*, u.full_name as created_by_name,
              p.name as project_name
       FROM dds d
       LEFT JOIN users u ON u.id = d.created_by_id
       LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.id = $1`, [ddsId]
    );
    if (ddsResult.rows.length === 0) return null;

    const items = await query(
      `SELECT di.*, 
              b.name as building_name,
              f.floor_name,
              u.full_name as assigned_to_name,
              cu.full_name as completed_by_name
       FROM dds_items di
       LEFT JOIN buildings b ON b.id = di.building_id
       LEFT JOIN floors f ON f.id = di.floor_id
       LEFT JOIN users u ON u.id = di.assigned_to_id
       LEFT JOIN users cu ON cu.id = di.completed_by_id
       WHERE di.dds_id = $1
       ORDER BY di.sort_order`, [ddsId]
    );

    return { ...ddsResult.rows[0], items: items.rows };
  };

  // GET /api/projects/:projectId/dds - List DDS for project
  router.get('/projects/:projectId/dds', verifyToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { type } = req.query;
      let sql = `SELECT d.*, u.full_name as created_by_name,
                   (SELECT COUNT(*) FROM dds_items WHERE dds_id = d.id) as total_items,
                   (SELECT COUNT(*) FROM dds_items WHERE dds_id = d.id AND status = 'completed') as completed_items
                  FROM dds d
                  LEFT JOIN users u ON u.id = d.created_by_id
                  WHERE d.project_id = $1`;
      const params = [projectId];

      if (type) {
        sql += ' AND d.dds_type = $2';
        params.push(type);
      }
      sql += ' ORDER BY d.version DESC';

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching DDS list:', err);
      res.status(500).json({ error: 'Failed to fetch DDS' });
    }
  });

  // GET /api/dds/:id - Get single DDS with items
  router.get('/dds/:id', verifyToken, async (req, res) => {
    try {
      const dds = await getDDSWithItems(req.params.id);
      if (!dds) return res.status(404).json({ error: 'DDS not found' });
      res.json(dds);
    } catch (err) {
      logger.error('Error fetching DDS:', err);
      res.status(500).json({ error: 'Failed to fetch DDS' });
    }
  });

  // PUT /api/dds/:id - Update DDS (items, dates etc)
  router.put('/dds/:id', verifyToken, async (req, res) => {
    try {
      const { items } = req.body;
      const userId = req.user?.userId;

      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.id) {
            await query(
              `UPDATE dds_items SET
                item_name = COALESCE($1, item_name),
                expected_start_date = COALESCE($2, expected_start_date),
                expected_completion_date = COALESCE($3, expected_completion_date),
                architect_input_date = COALESCE($4, architect_input_date),
                structure_input_date = COALESCE($5, structure_input_date),
                assigned_to_id = COALESCE($6, assigned_to_id),
                sort_order = COALESCE($7, sort_order)
               WHERE id = $8`,
              [item.item_name, item.expected_start_date, item.expected_completion_date,
               item.architect_input_date, item.structure_input_date,
               item.assigned_to_id, item.sort_order, item.id]
            );
          }
        }
      }

      // Log DDS update
      const dds = await getDDSWithItems(req.params.id);
      await logActivity(dds.project_id, userId, req.user?.email, 'dds', dds.id, 'update',
        { items_updated: items?.length }, 'Updated DDS items');

      // Record in DDS history
      await query(
        `INSERT INTO dds_history (dds_id, action, changed_by_id, changes)
         VALUES ($1, 'update', $2, $3)`,
        [req.params.id, userId, JSON.stringify({ items_updated: items?.length })]
      );

      const fullDDS = await getDDSWithItems(req.params.id);
      res.json(fullDDS);
    } catch (err) {
      logger.error('Error updating DDS:', err);
      res.status(500).json({ error: 'Failed to update DDS' });
    }
  });

  // POST /api/dds/:id/regenerate - Regenerate DDS items from updated project data
  router.post('/dds/:id/regenerate', verifyToken, async (req, res) => {
    try {
      const ddsResult = await query('SELECT * FROM dds WHERE id = $1', [req.params.id]);
      if (ddsResult.rows.length === 0) return res.status(404).json({ error: 'DDS not found' });
      const dds = ddsResult.rows[0];

      // Delete existing items that are not completed
      await query(
        "DELETE FROM dds_items WHERE dds_id = $1 AND status != 'completed'",
        [req.params.id]
      );

      // Regenerate items
      await generateDDSItems(req.params.id, dds.project_id, dds.dds_type);

      const fullDDS = await getDDSWithItems(req.params.id);
      res.json(fullDDS);
    } catch (err) {
      logger.error('Error regenerating DDS:', err);
      res.status(500).json({ error: 'Failed to regenerate DDS' });
    }
  });

  // ========== DDS Item Operations ==========

  // PATCH /api/dds-items/:id/complete - Mark item complete
  router.patch('/dds-items/:id/complete', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const result = await query(
        `UPDATE dds_items SET status = 'completed', actual_completion_date = CURRENT_DATE,
         completed_by_id = $1 WHERE id = $2 RETURNING *`,
        [userId, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'DDS item not found' });

      const item = result.rows[0];
      // Get DDS to log activity
      const ddsRes = await query('SELECT project_id FROM dds WHERE id = $1', [item.dds_id]);
      await logActivity(ddsRes.rows[0]?.project_id, userId, req.user?.email, 'dds_item',
        item.id, 'complete', { item_name: item.item_name }, `Completed DDS item: ${item.item_name}`);

      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error completing DDS item:', err);
      res.status(500).json({ error: 'Failed to complete DDS item' });
    }
  });

  // PATCH /api/dds-items/:id/revise - Revise completed item
  router.patch('/dds-items/:id/revise', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { reason, new_completion_date } = req.body;

      // Get current item
      const currentItem = await query('SELECT * FROM dds_items WHERE id = $1', [req.params.id]);
      if (currentItem.rows.length === 0) return res.status(404).json({ error: 'DDS item not found' });
      const item = currentItem.rows[0];

      // Increment revision
      const newRevisionCount = (item.revision_count || 0) + 1;
      const newRevision = `R${newRevisionCount}`;

      // Store revision history
      await query(
        `INSERT INTO dds_item_revisions (dds_item_id, revision, revised_by_id, reason,
         previous_completion_date, new_completion_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.id, newRevision, userId, reason, item.actual_completion_date, new_completion_date]
      );

      // Update item
      const result = await query(
        `UPDATE dds_items SET status = 'revised', revision = $1, revision_count = $2,
         actual_completion_date = NULL, expected_completion_date = COALESCE($3, expected_completion_date)
         WHERE id = $4 RETURNING *`,
        [newRevision, newRevisionCount, new_completion_date, req.params.id]
      );

      const ddsRes = await query('SELECT project_id FROM dds WHERE id = $1', [item.dds_id]);
      await logActivity(ddsRes.rows[0]?.project_id, userId, req.user?.email, 'dds_item',
        item.id, 'revise', { revision: newRevision, reason },
        `Revised DDS item to ${newRevision}: ${item.item_name}`);

      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error revising DDS item:', err);
      res.status(500).json({ error: 'Failed to revise DDS item' });
    }
  });

  // PATCH /api/dds-items/:id/mark-input - Mark architect/structure input received
  router.patch('/dds-items/:id/mark-input', verifyToken, async (req, res) => {
    try {
      const { input_type } = req.body; // 'architect' or 'structure'
      const field = input_type === 'architect' ? 'architect_input_received' : 'structure_input_received';
      const dateField = input_type === 'architect' ? 'architect_input_received_date' : 'structure_input_received_date';

      const result = await query(
        `UPDATE dds_items SET ${field} = true, ${dateField} = CURRENT_DATE WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error marking input:', err);
      res.status(500).json({ error: 'Failed to mark input received' });
    }
  });

  // PATCH /api/dds-items/:id/update-date - Update MEP due date when input overshoots
  router.patch('/dds-items/:id/update-date', verifyToken, async (req, res) => {
    try {
      const { expected_completion_date, keep_same } = req.body;
      if (keep_same) return res.json({ message: 'Date kept same' });

      const result = await query(
        'UPDATE dds_items SET expected_completion_date = $1 WHERE id = $2 RETURNING *',
        [expected_completion_date, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating date:', err);
      res.status(500).json({ error: 'Failed to update date' });
    }
  });

  // GET /api/dds-items/:id/revisions - Get revision history
  router.get('/dds-items/:id/revisions', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT r.*, u.full_name as revised_by_name
         FROM dds_item_revisions r
         JOIN users u ON u.id = r.revised_by_id
         WHERE r.dds_item_id = $1
         ORDER BY r.created_at DESC`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching revisions:', err);
      res.status(500).json({ error: 'Failed to fetch revisions' });
    }
  });

  // GET /api/dds/:id/progress - Get DDS progress for summary
  router.get('/dds/:id/progress', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT
          item_category,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
          COUNT(CASE WHEN status = 'revised' THEN 1 END) as revised,
          ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as percentage
         FROM dds_items WHERE dds_id = $1
         GROUP BY item_category ORDER BY item_category`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching DDS progress:', err);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  });

  // GET /api/dds/:id/overdue - Get overdue items
  router.get('/dds/:id/overdue', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT di.*, b.name as building_name, f.floor_name, u.full_name as assigned_to_name
         FROM dds_items di
         LEFT JOIN buildings b ON b.id = di.building_id
         LEFT JOIN floors f ON f.id = di.floor_id
         LEFT JOIN users u ON u.id = di.assigned_to_id
         WHERE di.dds_id = $1 AND di.status != 'completed'
         AND di.expected_completion_date < CURRENT_DATE
         ORDER BY di.expected_completion_date`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching overdue items:', err);
      res.status(500).json({ error: 'Failed to fetch overdue items' });
    }
  });

  // GET /api/dds/:id/pending-inputs - Items with pending architect/structure inputs
  router.get('/dds/:id/pending-inputs', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT di.*, b.name as building_name
         FROM dds_items di
         LEFT JOIN buildings b ON b.id = di.building_id
         WHERE di.dds_id = $1
         AND (
           (di.architect_input_date IS NOT NULL AND NOT di.architect_input_received
            AND di.architect_input_date <= CURRENT_DATE + INTERVAL '3 days')
           OR
           (di.structure_input_date IS NOT NULL AND NOT di.structure_input_received
            AND di.structure_input_date <= CURRENT_DATE + INTERVAL '3 days')
         )
         ORDER BY LEAST(
           CASE WHEN NOT di.architect_input_received THEN di.architect_input_date END,
           CASE WHEN NOT di.structure_input_received THEN di.structure_input_date END
         )`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching pending inputs:', err);
      res.status(500).json({ error: 'Failed to fetch pending inputs' });
    }
  });

  // GET /api/dds/:id/export - Export DDS data for Excel/PDF generation
  router.get('/dds/:id/export', verifyToken, async (req, res) => {
    try {
      const dds = await getDDSWithItems(req.params.id);
      if (!dds) return res.status(404).json({ error: 'DDS not found' });

      // Add color coding info
      const today = new Date();
      const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      dds.items = dds.items.map(item => {
        let color = 'default';
        const dueDate = item.expected_completion_date ? new Date(item.expected_completion_date) : null;
        if (item.status === 'completed') color = 'green';
        else if (dueDate && dueDate < today) color = 'red';
        else if (dueDate && dueDate <= oneWeek) color = 'amber';
        else if (item.status === 'revised') color = 'blue';
        return { ...item, color };
      });

      res.json(dds);
    } catch (err) {
      logger.error('Error exporting DDS:', err);
      res.status(500).json({ error: 'Failed to export DDS' });
    }
  });

  return router;
};

export default createDDSRouter;
