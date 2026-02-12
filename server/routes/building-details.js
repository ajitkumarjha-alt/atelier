import express from 'express';

const createBuildingDetailsRouter = ({ query, verifyToken, logger }) => {
  const router = express.Router();

  // ========== STAIRCASES ==========

  // GET /api/buildings/:buildingId/staircases
  router.get('/buildings/:buildingId/staircases', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT s.*,
          COALESCE(json_agg(DISTINCT jsonb_build_object('id', sw.id, 'floor_id', sw.floor_id, 
            'width_mm', sw.width_mm, 'height_mm', sw.height_mm, 'quantity', sw.quantity,
            'floor_name', f.floor_name))
            FILTER (WHERE sw.id IS NOT NULL), '[]') AS windows,
          COALESCE(json_agg(DISTINCT jsonb_build_object('id', sd.id, 'floor_id', sd.floor_id,
            'width_mm', sd.width_mm, 'height_mm', sd.height_mm, 'quantity', sd.quantity,
            'floor_name', f2.floor_name))
            FILTER (WHERE sd.id IS NOT NULL), '[]') AS doors
         FROM staircases s
         LEFT JOIN staircase_windows sw ON sw.staircase_id = s.id
         LEFT JOIN floors f ON f.id = sw.floor_id
         LEFT JOIN staircase_doors sd ON sd.staircase_id = s.id
         LEFT JOIN floors f2 ON f2.id = sd.floor_id
         WHERE s.building_id = $1
         GROUP BY s.id ORDER BY s.name`, [req.params.buildingId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching staircases:', err);
      res.status(500).json({ error: 'Failed to fetch staircases' });
    }
  });

  // POST /api/buildings/:buildingId/staircases
  router.post('/buildings/:buildingId/staircases', verifyToken, async (req, res) => {
    try {
      const { name, windows, doors } = req.body;
      const result = await query(
        'INSERT INTO staircases (building_id, name) VALUES ($1, $2) RETURNING *',
        [req.params.buildingId, name]
      );
      const staircase = result.rows[0];

      // Add windows per floor
      if (windows && Array.isArray(windows)) {
        for (const w of windows) {
          await query(
            `INSERT INTO staircase_windows (staircase_id, floor_id, width_mm, height_mm, quantity)
             VALUES ($1, $2, $3, $4, $5)`,
            [staircase.id, w.floor_id, w.width_mm, w.height_mm, w.quantity || 1]
          );
        }
      }

      // Add doors per floor
      if (doors && Array.isArray(doors)) {
        for (const d of doors) {
          await query(
            `INSERT INTO staircase_doors (staircase_id, floor_id, width_mm, height_mm, quantity)
             VALUES ($1, $2, $3, $4, $5)`,
            [staircase.id, d.floor_id, d.width_mm, d.height_mm, d.quantity || 1]
          );
        }
      }

      res.status(201).json(staircase);
    } catch (err) {
      logger.error('Error creating staircase:', err);
      res.status(500).json({ error: 'Failed to create staircase' });
    }
  });

  // PUT /api/staircases/:id
  router.put('/staircases/:id', verifyToken, async (req, res) => {
    try {
      const { name, windows, doors } = req.body;
      await query('UPDATE staircases SET name = $1 WHERE id = $2', [name, req.params.id]);

      // Replace windows
      if (windows) {
        await query('DELETE FROM staircase_windows WHERE staircase_id = $1', [req.params.id]);
        for (const w of windows) {
          await query(
            `INSERT INTO staircase_windows (staircase_id, floor_id, width_mm, height_mm, quantity)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.params.id, w.floor_id, w.width_mm, w.height_mm, w.quantity || 1]
          );
        }
      }

      // Replace doors
      if (doors) {
        await query('DELETE FROM staircase_doors WHERE staircase_id = $1', [req.params.id]);
        for (const d of doors) {
          await query(
            `INSERT INTO staircase_doors (staircase_id, floor_id, width_mm, height_mm, quantity)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.params.id, d.floor_id, d.width_mm, d.height_mm, d.quantity || 1]
          );
        }
      }

      res.json({ message: 'Staircase updated' });
    } catch (err) {
      logger.error('Error updating staircase:', err);
      res.status(500).json({ error: 'Failed to update staircase' });
    }
  });

  // DELETE /api/staircases/:id
  router.delete('/staircases/:id', verifyToken, async (req, res) => {
    try {
      await query('DELETE FROM staircases WHERE id = $1', [req.params.id]);
      res.json({ message: 'Staircase deleted' });
    } catch (err) {
      logger.error('Error deleting staircase:', err);
      res.status(500).json({ error: 'Failed to delete staircase' });
    }
  });

  // ========== LIFTS ==========

  // GET /api/buildings/:buildingId/lifts
  router.get('/buildings/:buildingId/lifts', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT l.*, sf.floor_name as start_floor_name, lf.floor_name as last_floor_name
         FROM lifts l
         LEFT JOIN floors sf ON sf.id = l.start_floor_id
         LEFT JOIN floors lf ON lf.id = l.last_floor_id
         WHERE l.building_id = $1
         ORDER BY l.name`, [req.params.buildingId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching lifts:', err);
      res.status(500).json({ error: 'Failed to fetch lifts' });
    }
  });

  // POST /api/buildings/:buildingId/lifts
  router.post('/buildings/:buildingId/lifts', verifyToken, async (req, res) => {
    try {
      const { name, start_floor_id, last_floor_id, door_type, door_width_mm, door_height_mm, capacity_kg, speed_mps } = req.body;
      const result = await query(
        `INSERT INTO lifts (building_id, name, start_floor_id, last_floor_id, door_type,
         door_width_mm, door_height_mm, capacity_kg, speed_mps)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [req.params.buildingId, name, start_floor_id, last_floor_id,
         door_type || 'single', door_width_mm, door_height_mm, capacity_kg, speed_mps]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating lift:', err);
      res.status(500).json({ error: 'Failed to create lift' });
    }
  });

  // PUT /api/lifts/:id
  router.put('/lifts/:id', verifyToken, async (req, res) => {
    try {
      const { name, start_floor_id, last_floor_id, door_type, door_width_mm, door_height_mm, capacity_kg, speed_mps } = req.body;
      const result = await query(
        `UPDATE lifts SET name = $1, start_floor_id = $2, last_floor_id = $3, door_type = $4,
         door_width_mm = $5, door_height_mm = $6, capacity_kg = $7, speed_mps = $8
         WHERE id = $9 RETURNING *`,
        [name, start_floor_id, last_floor_id, door_type, door_width_mm, door_height_mm, capacity_kg, speed_mps, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating lift:', err);
      res.status(500).json({ error: 'Failed to update lift' });
    }
  });

  // DELETE /api/lifts/:id
  router.delete('/lifts/:id', verifyToken, async (req, res) => {
    try {
      await query('DELETE FROM lifts WHERE id = $1', [req.params.id]);
      res.json({ message: 'Lift deleted' });
    } catch (err) {
      logger.error('Error deleting lift:', err);
      res.status(500).json({ error: 'Failed to delete lift' });
    }
  });

  // ========== LOBBIES ==========

  // POST /api/floors/:floorId/lobbies
  router.post('/floors/:floorId/lobbies', verifyToken, async (req, res) => {
    try {
      const { lobby_type, name, area_sqm } = req.body;
      // Get building_id from floor
      const floorRes = await query('SELECT building_id FROM floors WHERE id = $1', [req.params.floorId]);
      const result = await query(
        `INSERT INTO lobbies (floor_id, building_id, lobby_type, name, area_sqm)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.floorId, floorRes.rows[0]?.building_id, lobby_type, name, area_sqm]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating lobby:', err);
      res.status(500).json({ error: 'Failed to create lobby' });
    }
  });

  // GET /api/buildings/:buildingId/lobbies
  router.get('/buildings/:buildingId/lobbies', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT l.*, f.floor_name
         FROM lobbies l
         LEFT JOIN floors f ON f.id = l.floor_id
         WHERE l.building_id = $1
         ORDER BY l.lobby_type, f.floor_number`, [req.params.buildingId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching lobbies:', err);
      res.status(500).json({ error: 'Failed to fetch lobbies' });
    }
  });

  // ========== SHOPS ==========

  // POST /api/floors/:floorId/shops
  router.post('/floors/:floorId/shops', verifyToken, async (req, res) => {
    try {
      const { name, area_sqm, identical_shops, is_fnb } = req.body;
      const result = await query(
        `INSERT INTO shops (floor_id, name, area_sqm, identical_shops, is_fnb)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.floorId, name, area_sqm, identical_shops, is_fnb || false]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating shop:', err);
      res.status(500).json({ error: 'Failed to create shop' });
    }
  });

  // GET /api/floors/:floorId/shops
  router.get('/floors/:floorId/shops', verifyToken, async (req, res) => {
    try {
      const result = await query('SELECT * FROM shops WHERE floor_id = $1 ORDER BY name', [req.params.floorId]);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching shops:', err);
      res.status(500).json({ error: 'Failed to fetch shops' });
    }
  });

  // ========== PARKING DETAILS ==========

  // POST /api/floors/:floorId/parking
  router.post('/floors/:floorId/parking', verifyToken, async (req, res) => {
    try {
      const { two_wheeler_count, four_wheeler_count, ev_count } = req.body;
      const result = await query(
        `INSERT INTO parking_details (floor_id, two_wheeler_count, four_wheeler_count, ev_count)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [req.params.floorId, two_wheeler_count || 0, four_wheeler_count || 0, ev_count || 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating parking:', err);
      res.status(500).json({ error: 'Failed to create parking details' });
    }
  });

  // ========== SWIMMING POOLS ==========

  // GET /api/projects/:projectId/swimming-pools
  router.get('/projects/:projectId/swimming-pools', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT sp.*, s.name as society_name
         FROM swimming_pools sp
         LEFT JOIN societies s ON s.id = sp.society_id
         WHERE sp.project_id = $1 ORDER BY sp.name`, [req.params.projectId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching swimming pools:', err);
      res.status(500).json({ error: 'Failed to fetch swimming pools' });
    }
  });

  // POST /api/projects/:projectId/swimming-pools
  router.post('/projects/:projectId/swimming-pools', verifyToken, async (req, res) => {
    try {
      const { name, volume_cum, depth_m, society_id } = req.body;
      const result = await query(
        `INSERT INTO swimming_pools (project_id, society_id, name, volume_cum, depth_m)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.projectId, society_id, name, volume_cum, depth_m]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating swimming pool:', err);
      res.status(500).json({ error: 'Failed to create swimming pool' });
    }
  });

  // ========== LANDSCAPES ==========

  // GET /api/projects/:projectId/landscapes
  router.get('/projects/:projectId/landscapes', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT l.*, s.name as society_name
         FROM landscapes l
         LEFT JOIN societies s ON s.id = l.society_id
         WHERE l.project_id = $1 ORDER BY l.name`, [req.params.projectId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching landscapes:', err);
      res.status(500).json({ error: 'Failed to fetch landscapes' });
    }
  });

  // POST /api/projects/:projectId/landscapes
  router.post('/projects/:projectId/landscapes', verifyToken, async (req, res) => {
    try {
      const { name, total_area_sqm, softscape_area_sqm, society_id } = req.body;
      const result = await query(
        `INSERT INTO landscapes (project_id, society_id, name, total_area_sqm, softscape_area_sqm)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.projectId, society_id, name, total_area_sqm, softscape_area_sqm]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating landscape:', err);
      res.status(500).json({ error: 'Failed to create landscape' });
    }
  });

  // ========== SURFACE PARKING ==========

  // POST /api/projects/:projectId/surface-parking
  router.post('/projects/:projectId/surface-parking', verifyToken, async (req, res) => {
    try {
      const { name, two_wheeler_count, four_wheeler_count, ev_charging_count, society_id } = req.body;
      const result = await query(
        `INSERT INTO surface_parking (project_id, society_id, name, two_wheeler_count, four_wheeler_count, ev_charging_count)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.params.projectId, society_id, name, two_wheeler_count || 0, four_wheeler_count || 0, ev_charging_count || 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating surface parking:', err);
      res.status(500).json({ error: 'Failed to create surface parking' });
    }
  });

  // ========== INFRASTRUCTURE (STP, Substation, etc) ==========

  // GET /api/projects/:projectId/infrastructure
  router.get('/projects/:projectId/infrastructure', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT i.*, s.name as society_name
         FROM infrastructure i
         LEFT JOIN societies s ON s.id = i.society_id
         WHERE i.project_id = $1 ORDER BY i.infra_type, i.name`, [req.params.projectId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching infrastructure:', err);
      res.status(500).json({ error: 'Failed to fetch infrastructure' });
    }
  });

  // POST /api/projects/:projectId/infrastructure
  router.post('/projects/:projectId/infrastructure', verifyToken, async (req, res) => {
    try {
      const { infra_type, name, capacity, description, society_id } = req.body;
      const result = await query(
        `INSERT INTO infrastructure (project_id, society_id, infra_type, name, capacity, description)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.params.projectId, society_id, infra_type, name, capacity, description]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating infrastructure:', err);
      res.status(500).json({ error: 'Failed to create infrastructure' });
    }
  });

  // ========== ACTIVITY LOG ==========

  // GET /api/projects/:projectId/activity-log
  router.get('/projects/:projectId/activity-log', verifyToken, async (req, res) => {
    try {
      const { entity_type, limit: resultLimit } = req.query;
      let sql = `SELECT al.*, u.full_name as user_name
                 FROM activity_log al
                 LEFT JOIN users u ON u.id = al.user_id
                 WHERE al.project_id = $1`;
      const params = [req.params.projectId];
      let paramCount = 1;
      if (entity_type) { paramCount++; sql += ` AND al.entity_type = $${paramCount}`; params.push(entity_type); }
      sql += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1}`;
      params.push(resultLimit || 50);

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching activity log:', err);
      res.status(500).json({ error: 'Failed to fetch activity log' });
    }
  });

  // ========== TEMPORARY ACCESS ==========

  // POST /api/projects/:projectId/temporary-access
  router.post('/projects/:projectId/temporary-access', verifyToken, async (req, res) => {
    try {
      const { granted_to_id, access_type, start_date, end_date } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO temporary_access (project_id, granted_by_id, granted_to_id, access_type, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [req.params.projectId, userId, granted_to_id, access_type || 'view', start_date, end_date]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating temporary access:', err);
      res.status(500).json({ error: 'Failed to create temporary access' });
    }
  });

  // GET /api/projects/:projectId/temporary-access
  router.get('/projects/:projectId/temporary-access', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT ta.*, gu.full_name as granted_by_name, tu.full_name as granted_to_name
         FROM temporary_access ta
         LEFT JOIN users gu ON gu.id = ta.granted_by_id
         LEFT JOIN users tu ON tu.id = ta.granted_to_id
         WHERE ta.project_id = $1 AND ta.is_active = true AND ta.end_date >= CURRENT_DATE
         ORDER BY ta.start_date`, [req.params.projectId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching temporary access:', err);
      res.status(500).json({ error: 'Failed to fetch temporary access' });
    }
  });

  // ========== NOTIFICATIONS ==========

  // GET /api/notifications
  router.get('/notifications', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { unread_only } = req.query;
      let sql = `SELECT n.*, p.name as project_name
                 FROM notifications n
                 LEFT JOIN projects p ON p.id = n.project_id
                 WHERE n.user_id = $1`;
      if (unread_only === 'true') sql += ' AND n.is_read = false';
      sql += ' ORDER BY n.created_at DESC LIMIT 50';
      const result = await query(sql, [userId]);
      res.json(result.rows);
    } catch (err) {
      // Table may not exist yet if migration hasn't run
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        return res.json([]);
      }
      logger.error('Error fetching notifications:', err);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // PATCH /api/notifications/:id/read
  router.patch('/notifications/:id/read', verifyToken, async (req, res) => {
    try {
      await query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
      res.json({ message: 'Notification marked as read' });
    } catch (err) {
      logger.error('Error marking notification:', err);
      res.status(500).json({ error: 'Failed to mark notification' });
    }
  });

  // PATCH /api/notifications/mark-all-read
  router.patch('/notifications/mark-all-read', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
      res.json({ message: 'All notifications marked as read' });
    } catch (err) {
      logger.error('Error marking notifications:', err);
      res.status(500).json({ error: 'Failed to mark notifications' });
    }
  });

  // ========== CM BUILDING COMPONENTS ==========

  // POST /api/projects/:projectId/cm-components
  router.post('/projects/:projectId/cm-components', verifyToken, async (req, res) => {
    try {
      const { building_id, floor_id, component_name, structure_status, mep_status, finishing_status, remark } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `INSERT INTO cm_building_components (project_id, building_id, floor_id, component_name,
         structure_status, mep_status, finishing_status, remark, updated_by_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [req.params.projectId, building_id, floor_id, component_name,
         structure_status, mep_status, finishing_status, remark, userId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating CM component:', err);
      res.status(500).json({ error: 'Failed to create CM component' });
    }
  });

  // GET /api/projects/:projectId/cm-components
  router.get('/projects/:projectId/cm-components', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT c.*, b.name as building_name, f.floor_name, u.full_name as updated_by_name
         FROM cm_building_components c
         JOIN buildings b ON b.id = c.building_id
         LEFT JOIN floors f ON f.id = c.floor_id
         LEFT JOIN users u ON u.id = c.updated_by_id
         WHERE c.project_id = $1
         ORDER BY b.name, f.floor_number`, [req.params.projectId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching CM components:', err);
      res.status(500).json({ error: 'Failed to fetch CM components' });
    }
  });

  // PUT /api/cm-components/:id
  router.put('/cm-components/:id', verifyToken, async (req, res) => {
    try {
      const { structure_status, mep_status, finishing_status, remark } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `UPDATE cm_building_components SET structure_status = $1, mep_status = $2,
         finishing_status = $3, remark = $4, updated_by_id = $5 WHERE id = $6 RETURNING *`,
        [structure_status, mep_status, finishing_status, remark, userId, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating CM component:', err);
      res.status(500).json({ error: 'Failed to update CM component' });
    }
  });

  return router;
};

export default createBuildingDetailsRouter;
