import express from 'express';

const createDrawingSchedulesRouter = ({ query, verifyToken }) => {
  const router = express.Router();

  router.post('/drawing-schedules', verifyToken, async (req, res) => {
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

      if (!projectId || !drawingTitle || !drawingRefNo) {
        return res.status(400).json({ error: 'Project ID, Drawing Ref No, and Drawing Title are required' });
      }

      const existingDrawing = await query(
        'SELECT id FROM drawing_schedules WHERE drawing_ref_no = $1',
        [drawingRefNo]
      );

      if (existingDrawing.rows.length > 0) {
        return res.status(400).json({ error: 'Drawing reference number already exists' });
      }

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

  router.get('/drawing-schedules', verifyToken, async (req, res) => {
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

  router.get('/drawing-schedules/:id', verifyToken, async (req, res) => {
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

  router.patch('/drawing-schedules/:id', verifyToken, async (req, res) => {
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

      const existingDrawing = await query(
        'SELECT * FROM drawing_schedules WHERE id = $1',
        [id]
      );

      if (existingDrawing.rows.length === 0) {
        return res.status(404).json({ error: 'Drawing schedule not found' });
      }

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

  router.delete('/drawing-schedules/:id', verifyToken, async (req, res) => {
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

  router.get('/drawing-schedules/stats/:projectId', verifyToken, async (req, res) => {
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

  return router;
};

export default createDrawingSchedulesRouter;
