import express from 'express';

const createMasRouter = ({ query, verifyToken }) => {
  const router = express.Router();

  router.get('/mas/pending-count', async (req, res) => {
    try {
      const { projectId } = req.query;

      let queryText = 'SELECT COUNT(*) as count FROM material_approval_sheets WHERE status = $1';
      const params = ['pending'];

      if (projectId) {
        queryText += ' AND project_id = $2';
        params.push(projectId);
      }

      const result = await query(queryText, params);
      res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
      console.error('Error fetching MAS count:', error);
      res.status(500).json({ error: 'Failed to fetch MAS count' });
    }
  });

  router.get('/mas/summary', verifyToken, async (req, res) => {
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

  router.get('/mas/project/:projectId', async (req, res) => {
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

  router.post('/mas', async (req, res) => {
    const {
      projectId,
      materialName,
      materialCategory,
      manufacturer,
      modelSpecification,
      quantity,
      unit,
      submittedByVendor,
      vendorEmail,
      attachmentUrls
    } = req.body;

    try {
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countResult = await query(
        'SELECT COUNT(*) as count FROM material_approval_sheets WHERE mas_ref_no LIKE $1',
        [`MAS-${datePrefix}%`]
      );
      const count = parseInt(countResult.rows[0].count) + 1;
      const masRefNo = `MAS-${datePrefix}-${String(count).padStart(3, '0')}`;

      const result = await query(
        `INSERT INTO material_approval_sheets (
          project_id, mas_ref_no, material_name, material_category, manufacturer,
          model_specification, quantity, unit, submitted_by_vendor, vendor_email,
          attachment_urls, l2_status, l1_status, final_status, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          projectId,
          masRefNo,
          materialName,
          materialCategory,
          manufacturer,
          modelSpecification,
          quantity,
          unit,
          submittedByVendor,
          vendorEmail,
          JSON.stringify(attachmentUrls || []),
          'Pending',
          'Pending',
          'Pending',
          'Pending'
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating MAS:', error);
      res.status(500).json({ error: 'Failed to create MAS' });
    }
  });

  router.get('/mas', async (req, res) => {
    const { status, projectId, l2_status, l1_status } = req.query;

    try {
      let queryText = 'SELECT * FROM material_approval_sheets WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (status && status !== 'All') {
        queryText += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (l2_status && l2_status !== 'All') {
        queryText += ` AND l2_status = $${paramIndex}`;
        params.push(l2_status);
        paramIndex++;
      }

      if (l1_status && l1_status !== 'All') {
        queryText += ` AND l1_status = $${paramIndex}`;
        params.push(l1_status);
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
      console.error('Error fetching MAS:', error);
      res.status(500).json({ error: 'Failed to fetch MAS' });
    }
  });

  router.get('/mas/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query(
        `SELECT m.*, p.name as project_name 
         FROM material_approval_sheets m
         LEFT JOIN projects p ON m.project_id = p.id
         WHERE m.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'MAS not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching MAS:', error);
      res.status(500).json({ error: 'Failed to fetch MAS' });
    }
  });

  router.patch('/mas/:id/l2-review', async (req, res) => {
    const { id } = req.params;
    const { status, comments, reviewedBy } = req.body;

    try {
      const result = await query(
        `UPDATE material_approval_sheets 
         SET l2_status = $1, 
             l2_comments = $2, 
             l2_reviewed_by = $3, 
             l2_reviewed_at = CURRENT_TIMESTAMP,
             final_status = CASE 
               WHEN $1 = 'Rejected' THEN 'Rejected'
               WHEN $1 = 'Approved' AND l1_status = 'Approved' THEN 'Approved'
               ELSE 'Pending'
             END,
             status = CASE 
               WHEN $1 = 'Rejected' THEN 'Rejected'
               WHEN $1 = 'Approved' AND l1_status = 'Approved' THEN 'Approved'
               ELSE 'Pending'
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [status, comments, reviewedBy, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'MAS not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating MAS L2 review:', error);
      res.status(500).json({ error: 'Failed to update MAS' });
    }
  });

  router.patch('/mas/:id/l1-review', async (req, res) => {
    const { id } = req.params;
    const { status, comments, reviewedBy } = req.body;

    try {
      const result = await query(
        `UPDATE material_approval_sheets 
         SET l1_status = $1, 
             l1_comments = $2, 
             l1_reviewed_by = $3, 
             l1_reviewed_at = CURRENT_TIMESTAMP,
             final_status = CASE 
               WHEN $1 = 'Rejected' THEN 'Rejected'
               WHEN $1 = 'Approved' AND l2_status = 'Approved' THEN 'Approved'
               ELSE 'Pending'
             END,
             status = CASE 
               WHEN $1 = 'Rejected' THEN 'Rejected'
               WHEN $1 = 'Approved' AND l2_status = 'Approved' THEN 'Approved'
               ELSE 'Pending'
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [status, comments, reviewedBy, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'MAS not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating MAS L1 review:', error);
      res.status(500).json({ error: 'Failed to update MAS' });
    }
  });

  router.patch('/mas/:id', async (req, res) => {
    const { id } = req.params;
    const {
      materialName,
      materialCategory,
      manufacturer,
      modelSpecification,
      quantity,
      unit
    } = req.body;

    try {
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (materialName) {
        updates.push(`material_name = $${paramIndex}`);
        params.push(materialName);
        paramIndex++;
      }

      if (materialCategory) {
        updates.push(`material_category = $${paramIndex}`);
        params.push(materialCategory);
        paramIndex++;
      }

      if (manufacturer) {
        updates.push(`manufacturer = $${paramIndex}`);
        params.push(manufacturer);
        paramIndex++;
      }

      if (modelSpecification) {
        updates.push(`model_specification = $${paramIndex}`);
        params.push(modelSpecification);
        paramIndex++;
      }

      if (quantity !== undefined) {
        updates.push(`quantity = $${paramIndex}`);
        params.push(quantity);
        paramIndex++;
      }

      if (unit) {
        updates.push(`unit = $${paramIndex}`);
        params.push(unit);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const result = await query(
        `UPDATE material_approval_sheets 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'MAS not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating MAS:', error);
      res.status(500).json({ error: 'Failed to update MAS' });
    }
  });

  router.delete('/mas/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query(
        'DELETE FROM material_approval_sheets WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'MAS not found' });
      }

      res.json({ message: 'MAS deleted successfully' });
    } catch (error) {
      console.error('Error deleting MAS:', error);
      res.status(500).json({ error: 'Failed to delete MAS' });
    }
  });

  return router;
};

export default createMasRouter;
