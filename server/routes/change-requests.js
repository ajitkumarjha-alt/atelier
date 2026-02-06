import express from 'express';

const createChangeRequestsRouter = ({ query, verifyToken }) => {
  const router = express.Router();

  router.post('/change-requests', verifyToken, async (req, res) => {
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

      if (!projectId || !changeType || !changeDescription) {
        return res.status(400).json({ error: 'Project ID, Change Type, and Description are required' });
      }

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

      const countResult = await query(
        `SELECT COUNT(*) as count FROM project_change_requests 
         WHERE change_ref_no LIKE $1`,
        [`CR-${dateStr}-%`]
      );

      const count = parseInt(countResult.rows[0].count) + 1;
      const changeRefNo = `CR-${dateStr}-${String(count).padStart(3, '0')}`;

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

  router.get('/change-requests', verifyToken, async (req, res) => {
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

  router.get('/change-requests/:id', verifyToken, async (req, res) => {
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

  router.patch('/change-requests/:id/l2-review', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { l2_status, l2_comments } = req.body;
      const userEmail = req.user?.email;

      if (!l2_status || !['Approved', 'Rejected'].includes(l2_status)) {
        return res.status(400).json({ error: 'Valid L2 status (Approved/Rejected) is required' });
      }

      const currentCR = await query(
        'SELECT * FROM project_change_requests WHERE id = $1',
        [id]
      );

      if (currentCR.rows.length === 0) {
        return res.status(404).json({ error: 'Change request not found' });
      }

      let finalStatus = 'Pending';
      if (l2_status === 'Rejected') {
        finalStatus = 'Rejected';
      } else if (l2_status === 'Approved') {
        finalStatus = 'Pending';
      }

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

  router.patch('/change-requests/:id/l1-review', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { l1_status, l1_comments } = req.body;
      const userEmail = req.user?.email;

      if (!l1_status || !['Approved', 'Rejected'].includes(l1_status)) {
        return res.status(400).json({ error: 'Valid L1 status (Approved/Rejected) is required' });
      }

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

      let finalStatus = 'Pending';
      if (l1_status === 'Rejected') {
        finalStatus = 'Rejected';
      } else if (l1_status === 'Approved' && currentCR.rows[0].l2_status === 'Approved') {
        finalStatus = 'Approved';
      }

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

  router.patch('/change-requests/:id/implement', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userEmail = req.user?.email;

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

  router.patch('/change-requests/:id', verifyToken, async (req, res) => {
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

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (changeDescription) {
        updates.push(`change_description = $${paramIndex}`);
        params.push(changeDescription);
        paramIndex++;
      }

      if (justification) {
        updates.push(`justification = $${paramIndex}`);
        params.push(justification);
        paramIndex++;
      }

      if (impactAssessment) {
        updates.push(`impact_assessment = $${paramIndex}`);
        params.push(impactAssessment);
        paramIndex++;
      }

      if (proposedChanges) {
        updates.push(`proposed_changes = $${paramIndex}`);
        params.push(JSON.stringify(proposedChanges));
        paramIndex++;
      }

      if (priority) {
        updates.push(`priority = $${paramIndex}`);
        params.push(priority);
        paramIndex++;
      }

      if (attachmentUrls) {
        updates.push(`attachment_urls = $${paramIndex}`);
        params.push(JSON.stringify(attachmentUrls));
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const result = await query(
        `UPDATE project_change_requests SET
          ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *`,
        params
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

  router.delete('/change-requests/:id', verifyToken, async (req, res) => {
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

  router.get('/change-requests/stats/:projectId', verifyToken, async (req, res) => {
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

  return router;
};

export default createChangeRequestsRouter;
