import express from 'express';

const createRFCRouter = ({ query, verifyToken, logger }) => {
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

  // POST /api/rfc - Create RFC
  router.post('/rfc', verifyToken, async (req, res) => {
    try {
      const { project_id, building_id, title, description, change_reason, impact_assessment, priority, assigned_to_id, due_date } = req.body;
      const userId = req.user?.userId;

      if (!title || !project_id) {
        return res.status(400).json({ error: 'Title and project_id are required' });
      }

      const result = await query(
        `INSERT INTO requests_for_change (project_id, building_id, title, description, change_reason,
         impact_assessment, raised_by_id, priority, assigned_to_id, assigned_by_id, assigned_at, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [project_id, building_id, title, description, change_reason, impact_assessment, userId,
         priority || 'normal', assigned_to_id || null, assigned_to_id ? userId : null,
         assigned_to_id ? new Date() : null, due_date || null]
      );

      // Notify assignee
      if (assigned_to_id) {
        await query(
          `INSERT INTO notifications (user_id, project_id, title, message, notification_type, entity_type, entity_id)
           VALUES ($1, $2, $3, $4, 'todo', 'rfc', $5)`,
          [assigned_to_id, project_id, 'RFC Assigned', `You have been assigned RFC: ${title}`, result.rows[0].id]
        );
      }

      await logActivity(project_id, userId, req.user?.email, 'rfc', result.rows[0].id, 'create',
        { title }, `Created RFC: ${title}`);

      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating RFC:', err);
      res.status(500).json({ error: 'Failed to create RFC' });
    }
  });

  // GET /api/rfc - List RFCs
  router.get('/rfc', verifyToken, async (req, res) => {
    try {
      const { project_id, status, raised_by_id } = req.query;
      let sql = `SELECT r.*, p.name as project_name, u.full_name as raised_by_name,
                   b.name as building_name, au.full_name as assigned_to_name,
                   abu.full_name as assigned_by_name
                 FROM requests_for_change r
                 JOIN projects p ON p.id = r.project_id
                 LEFT JOIN users u ON u.id = r.raised_by_id
                 LEFT JOIN buildings b ON b.id = r.building_id
                 LEFT JOIN users au ON au.id = r.assigned_to_id
                 LEFT JOIN users abu ON abu.id = r.assigned_by_id
                 WHERE 1=1`;
      const params = [];
      let paramCount = 0;

      if (project_id) { paramCount++; sql += ` AND r.project_id = $${paramCount}`; params.push(project_id); }
      if (status) { paramCount++; sql += ` AND r.status = $${paramCount}`; params.push(status); }
      if (raised_by_id) { paramCount++; sql += ` AND r.raised_by_id = $${paramCount}`; params.push(raised_by_id); }

      sql += ' ORDER BY r.created_at DESC';
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching RFCs:', err);
      res.status(500).json({ error: 'Failed to fetch RFCs' });
    }
  });

  // GET /api/rfc/:id - Get single RFC
  router.get('/rfc/:id', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT r.*, p.name as project_name, u.full_name as raised_by_name,
                b.name as building_name,
                l2u.full_name as l2_reviewed_by_name,
                l1u.full_name as l1_reviewed_by_name,
                au.full_name as assigned_to_name,
                abu.full_name as assigned_by_name
         FROM requests_for_change r
         JOIN projects p ON p.id = r.project_id
         LEFT JOIN users u ON u.id = r.raised_by_id
         LEFT JOIN buildings b ON b.id = r.building_id
         LEFT JOIN users l2u ON l2u.id = r.l2_reviewed_by_id
         LEFT JOIN users l1u ON l1u.id = r.l1_reviewed_by_id
         LEFT JOIN users au ON au.id = r.assigned_to_id
         LEFT JOIN users abu ON abu.id = r.assigned_by_id
         WHERE r.id = $1`, [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'RFC not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error fetching RFC:', err);
      res.status(500).json({ error: 'Failed to fetch RFC' });
    }
  });

  // PATCH /api/rfc/:id/assign - Assign RFC to a user
  router.patch('/rfc/:id/assign', verifyToken, async (req, res) => {
    try {
      const { assigned_to_id, due_date } = req.body;
      const userId = req.user?.userId;

      const result = await query(
        `UPDATE requests_for_change SET
          assigned_to_id = $1, assigned_by_id = $2, assigned_at = CURRENT_TIMESTAMP,
          due_date = COALESCE($3, due_date)
         WHERE id = $4 RETURNING *`,
        [assigned_to_id, userId, due_date || null, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'RFC not found' });

      // Notify assignee
      if (assigned_to_id) {
        const rfc = result.rows[0];
        await query(
          `INSERT INTO notifications (user_id, project_id, title, message, notification_type, entity_type, entity_id)
           VALUES ($1, $2, $3, $4, 'todo', 'rfc', $5)`,
          [assigned_to_id, rfc.project_id, 'RFC Assigned', `You have been assigned RFC: ${rfc.title}`, rfc.id]
        );
      }

      await logActivity(result.rows[0].project_id, userId, req.user?.email, 'rfc', req.params.id, 'assign',
        { assigned_to_id }, `Assigned RFC to user ${assigned_to_id}`);

      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error assigning RFC:', err);
      res.status(500).json({ error: 'Failed to assign RFC' });
    }
  });

  // PATCH /api/rfc/:id/l2-review
  router.patch('/rfc/:id/l2-review', verifyToken, async (req, res) => {
    try {
      const { status, comment } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `UPDATE requests_for_change SET
          l2_review_status = $1, l2_reviewed_by_id = $2, l2_review_comment = $3,
          l2_reviewed_at = CURRENT_TIMESTAMP,
          status = CASE WHEN $1 = 'rejected' THEN 'rejected' ELSE 'under_review' END
         WHERE id = $4 RETURNING *`,
        [status, userId, comment, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'RFC not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error L2 reviewing RFC:', err);
      res.status(500).json({ error: 'Failed to review RFC' });
    }
  });

  // PATCH /api/rfc/:id/l1-review
  router.patch('/rfc/:id/l1-review', verifyToken, async (req, res) => {
    try {
      const { status, comment } = req.body;
      const userId = req.user?.userId;
      const result = await query(
        `UPDATE requests_for_change SET
          l1_review_status = $1, l1_reviewed_by_id = $2, l1_review_comment = $3,
          l1_reviewed_at = CURRENT_TIMESTAMP,
          status = CASE WHEN $1 = 'approved' THEN 'approved' WHEN $1 = 'rejected' THEN 'rejected' ELSE status END
         WHERE id = $4 RETURNING *`,
        [status, userId, comment, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'RFC not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error L1 reviewing RFC:', err);
      res.status(500).json({ error: 'Failed to review RFC' });
    }
  });

  // GET /api/rfc/stats/:projectId
  router.get('/rfc/stats/:projectId', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implemented,
          COUNT(CASE WHEN status = 'pending' AND created_at < CURRENT_TIMESTAMP - INTERVAL '14 days' THEN 1 END) as critical
         FROM requests_for_change WHERE project_id = $1`, [req.params.projectId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error fetching RFC stats:', err);
      res.status(500).json({ error: 'Failed to fetch RFC stats' });
    }
  });

  // GET /api/rfc/summary - Overall RFC summary (for dashboards)
  router.get('/rfc/summary', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'pending' AND created_at < CURRENT_TIMESTAMP - INTERVAL '14 days' THEN 1 END) as critical
         FROM requests_for_change`
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error fetching RFC summary:', err);
      res.status(500).json({ error: 'Failed to fetch RFC summary' });
    }
  });

  return router;
};

export default createRFCRouter;
