import express from 'express';

const createSocietiesRouter = ({ query, verifyToken, logger }) => {
  const router = express.Router();

  // GET /api/projects/:projectId/societies
  router.get('/projects/:projectId/societies', verifyToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const result = await query(
        `SELECT s.*, 
          COALESCE(json_agg(json_build_object('id', b.id, 'name', b.name)) FILTER (WHERE b.id IS NOT NULL), '[]') AS buildings
         FROM societies s
         LEFT JOIN buildings b ON b.society_id = s.id
         WHERE s.project_id = $1
         GROUP BY s.id
         ORDER BY s.name`, [projectId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching societies:', err);
      res.status(500).json({ error: 'Failed to fetch societies' });
    }
  });

  // POST /api/projects/:projectId/societies
  router.post('/projects/:projectId/societies', verifyToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'Society name is required' });

      const result = await query(
        'INSERT INTO societies (project_id, name, description) VALUES ($1, $2, $3) RETURNING *',
        [projectId, name, description]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating society:', err);
      res.status(500).json({ error: 'Failed to create society' });
    }
  });

  // PUT /api/societies/:id
  router.put('/societies/:id', verifyToken, async (req, res) => {
    try {
      const { name, description } = req.body;
      const result = await query(
        'UPDATE societies SET name = $1, description = $2 WHERE id = $3 RETURNING *',
        [name, description, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Society not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating society:', err);
      res.status(500).json({ error: 'Failed to update society' });
    }
  });

  // DELETE /api/societies/:id
  router.delete('/societies/:id', verifyToken, async (req, res) => {
    try {
      // Unlink buildings first
      await query('UPDATE buildings SET society_id = NULL WHERE society_id = $1', [req.params.id]);
      await query('DELETE FROM societies WHERE id = $1', [req.params.id]);
      res.json({ message: 'Society deleted' });
    } catch (err) {
      logger.error('Error deleting society:', err);
      res.status(500).json({ error: 'Failed to delete society' });
    }
  });

  // POST /api/societies/:id/assign-building
  router.post('/societies/:id/assign-building', verifyToken, async (req, res) => {
    try {
      const { buildingId } = req.body;
      // Check if building is already assigned to another society
      const existing = await query(
        'SELECT society_id FROM buildings WHERE id = $1 AND society_id IS NOT NULL AND society_id != $2',
        [buildingId, req.params.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Building is already assigned to another society' });
      }
      const result = await query(
        'UPDATE buildings SET society_id = $1 WHERE id = $2 RETURNING *',
        [req.params.id, buildingId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error assigning building:', err);
      res.status(500).json({ error: 'Failed to assign building' });
    }
  });

  // POST /api/societies/:id/unassign-building
  router.post('/societies/:id/unassign-building', verifyToken, async (req, res) => {
    try {
      const { buildingId } = req.body;
      await query('UPDATE buildings SET society_id = NULL WHERE id = $1 AND society_id = $2',
        [buildingId, req.params.id]);
      res.json({ message: 'Building unassigned from society' });
    } catch (err) {
      logger.error('Error unassigning building:', err);
      res.status(500).json({ error: 'Failed to unassign building' });
    }
  });

  return router;
};

export default createSocietiesRouter;
