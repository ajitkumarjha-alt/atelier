import express from 'express';

const createRfiRouter = ({ query }) => {
  const router = express.Router();

  router.get('/rfi/pending-count', async (req, res) => {
    try {
      const { projectId } = req.query;

      let queryText = 'SELECT COUNT(*) as count FROM requests_for_information WHERE status = $1';
      const params = ['pending'];

      if (projectId) {
        queryText += ' AND project_id = $2';
        params.push(projectId);
      }

      const result = await query(queryText, params);
      res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
      console.error('Error fetching RFI count:', error);
      res.status(500).json({ error: 'Failed to fetch RFI count' });
    }
  });

  router.get('/rfi/project/:projectId', async (req, res) => {
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

  router.post('/rfi', async (req, res) => {
    const {
      projectId,
      projectName,
      recordNo,
      revision,
      dateRaised,
      disciplines,
      rfiSubject,
      rfiDescription,
      attachmentUrls,
      raisedBy,
      raisedByEmail,
      projectTeamResponse,
      designTeamResponse
    } = req.body;

    try {
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countResult = await query(
        'SELECT COUNT(*) as count FROM requests_for_information WHERE rfi_ref_no LIKE $1',
        [`RFI-${datePrefix}%`]
      );
      const count = parseInt(countResult.rows[0].count) + 1;
      const rfiRefNo = `RFI-${datePrefix}-${String(count).padStart(3, '0')}`;

      const result = await query(
        `INSERT INTO requests_for_information (
          project_id, rfi_ref_no, project_name, record_no, revision, date_raised,
          disciplines, rfi_subject, rfi_description, attachment_urls,
          raised_by, raised_by_email, project_team_response, design_team_response,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          projectId,
          rfiRefNo,
          projectName,
          recordNo,
          revision,
          dateRaised,
          JSON.stringify(disciplines),
          rfiSubject,
          rfiDescription,
          JSON.stringify(attachmentUrls || []),
          raisedBy,
          raisedByEmail,
          JSON.stringify(projectTeamResponse || []),
          JSON.stringify(designTeamResponse || []),
          'Pending'
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating RFI:', error);
      res.status(500).json({ error: 'Failed to create RFI' });
    }
  });

  router.get('/rfi', async (req, res) => {
    const { status, projectId } = req.query;

    try {
      let queryText = 'SELECT * FROM requests_for_information WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (status && status !== 'All') {
        queryText += ` AND status = $${paramIndex}`;
        params.push(status);
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
      console.error('Error fetching RFIs:', error);
      res.status(500).json({ error: 'Failed to fetch RFIs' });
    }
  });

  router.get('/rfi/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query(
        'SELECT * FROM requests_for_information WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'RFI not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching RFI:', error);
      res.status(500).json({ error: 'Failed to fetch RFI' });
    }
  });

  router.patch('/rfi/:id', async (req, res) => {
    const { id } = req.params;
    const {
      status,
      projectTeamResponse,
      designTeamResponse,
      rfiDescription
    } = req.body;

    try {
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (projectTeamResponse) {
        updates.push(`project_team_response = $${paramIndex}`);
        params.push(JSON.stringify(projectTeamResponse));
        paramIndex++;
      }

      if (designTeamResponse) {
        updates.push(`design_team_response = $${paramIndex}`);
        params.push(JSON.stringify(designTeamResponse));
        paramIndex++;
      }

      if (rfiDescription) {
        updates.push(`rfi_description = $${paramIndex}`);
        params.push(rfiDescription);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const result = await query(
        `UPDATE requests_for_information 
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'RFI not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating RFI:', error);
      res.status(500).json({ error: 'Failed to update RFI' });
    }
  });

  router.delete('/rfi/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query(
        'DELETE FROM requests_for_information WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'RFI not found' });
      }

      res.json({ message: 'RFI deleted successfully' });
    } catch (error) {
      console.error('Error deleting RFI:', error);
      res.status(500).json({ error: 'Failed to delete RFI' });
    }
  });

  return router;
};

export default createRfiRouter;
