import express from 'express';

const createConsultantsRouter = ({ query, verifyToken }) => {
  const router = express.Router();

  router.post('/consultants/register', verifyToken, async (req, res) => {
    try {
      const { name, email, contactNumber, companyName, projectId } = req.body;

      if (!name || !email || !contactNumber) {
        return res.status(400).json({ error: 'Name, email, and contact number are required' });
      }

      const existingConsultant = await query(
        'SELECT id FROM consultants WHERE email = $1',
        [email]
      );

      let consultantId;

      if (existingConsultant.rows.length > 0) {
        consultantId = existingConsultant.rows[0].id;
      } else {
        const result = await query(
          `INSERT INTO consultants (name, email, contact_number, company_name)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [name, email, contactNumber, companyName]
        );
        consultantId = result.rows[0].id;
      }

      if (projectId) {
        await query(
          `INSERT INTO project_consultants (project_id, consultant_id, assigned_by_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (project_id, consultant_id) DO NOTHING`,
          [projectId, consultantId, req.user.userId]
        );
      }

      res.json({ success: true, consultantId });
    } catch (error) {
      console.error('Error registering consultant:', error);
      res.status(500).json({ error: 'Failed to register consultant' });
    }
  });

  router.get('/consultants/list', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT id, name, email, contact_number, company_name
         FROM consultants
         WHERE is_active = true
         ORDER BY name`
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching consultants:', error);
      res.status(500).json({ error: 'Failed to fetch consultants' });
    }
  });

  router.post('/consultants/send-otp', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const consultant = await query(
        'SELECT id FROM consultants WHERE email = $1 AND is_active = true',
        [email]
      );

      if (consultant.rows.length === 0) {
        return res.status(404).json({ error: 'Consultant not found or inactive' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await query(
        `INSERT INTO consultant_otp (email, otp, expires_at)
         VALUES ($1, $2, $3)`,
        [email, otp, expiresAt]
      );

      console.log(`OTP for ${email}: ${otp}`);

      res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  router.post('/consultants/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
      }

      const otpResult = await query(
        `SELECT id FROM consultant_otp
         WHERE email = $1 AND otp = $2 AND is_used = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [email, otp]
      );

      if (otpResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
      }

      await query(
        'UPDATE consultant_otp SET is_used = true WHERE id = $1',
        [otpResult.rows[0].id]
      );

      const consultant = await query(
        'SELECT id, name, email FROM consultants WHERE email = $1',
        [email]
      );

      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

      res.json({
        success: true,
        token,
        consultantId: consultant.rows[0].id,
        consultant: consultant.rows[0]
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

  router.get('/consultants/profile', async (req, res) => {
    try {
      const consultantEmail = req.headers['x-consultant-email'];
      const devUserEmail = req.headers['x-dev-user-email'];

      if (devUserEmail && !consultantEmail) {
        const projectsResult = await query(
          `SELECT id, name, description, lifecycle_stage, completion_percentage
           FROM projects
           ORDER BY name`
        );

        return res.json({
          consultant: { name: 'Super Admin', email: devUserEmail },
          projects: projectsResult.rows
        });
      }

      if (!consultantEmail) {
        return res.status(401).json({ error: 'Not authorized' });
      }

      const consultantResult = await query(
        'SELECT id, name, email, contact_number, company_name FROM consultants WHERE email = $1',
        [consultantEmail]
      );

      if (consultantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Consultant not found' });
      }

      const consultant = consultantResult.rows[0];

      const projectsResult = await query(
        `SELECT DISTINCT p.id, p.name, p.description, p.lifecycle_stage, p.completion_percentage
         FROM projects p
         JOIN project_consultants pc ON p.id = pc.project_id
         WHERE pc.consultant_id = $1
         ORDER BY p.name`,
        [consultant.id]
      );

      res.json({
        consultant,
        projects: projectsResult.rows
      });
    } catch (error) {
      console.error('Error fetching consultant profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  router.get('/consultants/referred-items', async (req, res) => {
    try {
      const consultantEmail = req.headers['x-consultant-email'];
      const devUserEmail = req.headers['x-dev-user-email'];

      if (devUserEmail && !consultantEmail) {
        const masResult = await query(
          `SELECT mas.id, mas.material_name, mas.consultant_reply, mas.consultant_replied_at,
                  p.name as project_name, c.name as consultant_name
           FROM material_approval_sheets mas
           JOIN projects p ON mas.project_id = p.id
           LEFT JOIN consultants c ON mas.referred_to_consultant_id = c.id
           WHERE mas.referred_to_consultant_id IS NOT NULL
           ORDER BY mas.created_at DESC`
        );

        const rfiResult = await query(
          `SELECT rfi.id, rfi.title, rfi.consultant_reply, rfi.consultant_replied_at,
                  p.name as project_name, c.name as consultant_name
           FROM requests_for_information rfi
           JOIN projects p ON rfi.project_id = p.id
           LEFT JOIN consultants c ON rfi.referred_to_consultant_id = c.id
           WHERE rfi.referred_to_consultant_id IS NOT NULL
           ORDER BY rfi.created_at DESC`
        );

        return res.json({
          mas: masResult.rows,
          rfi: rfiResult.rows
        });
      }

      if (!consultantEmail) {
        return res.status(401).json({ error: 'Not authorized' });
      }

      const consultantResult = await query(
        'SELECT id FROM consultants WHERE email = $1',
        [consultantEmail]
      );

      if (consultantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Consultant not found' });
      }

      const consultantId = consultantResult.rows[0].id;

      const masResult = await query(
        `SELECT mas.id, mas.material_name, mas.consultant_reply, mas.consultant_replied_at,
                p.name as project_name
         FROM material_approval_sheets mas
         JOIN projects p ON mas.project_id = p.id
         WHERE mas.referred_to_consultant_id = $1
         ORDER BY mas.created_at DESC`,
        [consultantId]
      );

      const rfiResult = await query(
        `SELECT rfi.id, rfi.title, rfi.consultant_reply, rfi.consultant_replied_at,
                p.name as project_name
         FROM requests_for_information rfi
         JOIN projects p ON rfi.project_id = p.id
         WHERE rfi.referred_to_consultant_id = $1
         ORDER BY rfi.created_at DESC`,
        [consultantId]
      );

      res.json({
        mas: masResult.rows,
        rfi: rfiResult.rows
      });
    } catch (error) {
      console.error('Error fetching referred items:', error);
      res.status(500).json({ error: 'Failed to fetch referred items' });
    }
  });

  router.patch('/mas/:id/refer-consultant', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { consultant_id } = req.body;

      await query(
        `UPDATE material_approval_sheets
         SET referred_to_consultant_id = $1, consultant_reply_status = 'pending'
         WHERE id = $2`,
        [consultant_id, id]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error referring MAS to consultant:', error);
      res.status(500).json({ error: 'Failed to refer to consultant' });
    }
  });

  router.patch('/rfi/:id/refer-consultant', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { consultant_id } = req.body;

      await query(
        `UPDATE requests_for_information
         SET referred_to_consultant_id = $1, consultant_reply_status = 'pending'
         WHERE id = $2`,
        [consultant_id, id]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error referring RFI to consultant:', error);
      res.status(500).json({ error: 'Failed to refer to consultant' });
    }
  });

  router.get('/consultants/mas/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const consultantEmail = req.headers['x-consultant-email'];
      const devUserEmail = req.headers['x-dev-user-email'];

      if (devUserEmail && !consultantEmail) {
        const result = await query(
          `SELECT mas.*, p.name as project_name
           FROM material_approval_sheets mas
           JOIN projects p ON mas.project_id = p.id
           WHERE mas.id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'MAS not found' });
        }

        return res.json(result.rows[0]);
      }

      const result = await query(
        `SELECT mas.*, p.name as project_name
         FROM material_approval_sheets mas
         JOIN projects p ON mas.project_id = p.id
         JOIN consultants c ON mas.referred_to_consultant_id = c.id
         WHERE mas.id = $1 AND c.email = $2`,
        [id, consultantEmail]
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

  router.post('/consultants/mas/:id/reply', async (req, res) => {
    try {
      const { id } = req.params;
      const { reply } = req.body;
      const consultantEmail = req.headers['x-consultant-email'];

      await query(
        `UPDATE material_approval_sheets mas
         SET consultant_reply = $1, consultant_replied_at = NOW(), consultant_reply_status = 'replied'
         FROM consultants c
         WHERE mas.id = $2 AND mas.referred_to_consultant_id = c.id AND c.email = $3`,
        [reply, id, consultantEmail]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error submitting MAS reply:', error);
      res.status(500).json({ error: 'Failed to submit reply' });
    }
  });

  router.get('/consultants/rfi/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const consultantEmail = req.headers['x-consultant-email'];
      const devUserEmail = req.headers['x-dev-user-email'];

      if (devUserEmail && !consultantEmail) {
        const result = await query(
          `SELECT rfi.*, p.name as project_name, u.full_name as raised_by_name
           FROM requests_for_information rfi
           JOIN projects p ON rfi.project_id = p.id
           LEFT JOIN users u ON rfi.raised_by_id = u.id
           WHERE rfi.id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'RFI not found' });
        }

        return res.json(result.rows[0]);
      }

      const result = await query(
        `SELECT rfi.*, p.name as project_name, u.full_name as raised_by_name
         FROM requests_for_information rfi
         JOIN projects p ON rfi.project_id = p.id
         LEFT JOIN users u ON rfi.raised_by_id = u.id
         JOIN consultants c ON rfi.referred_to_consultant_id = c.id
         WHERE rfi.id = $1 AND c.email = $2`,
        [id, consultantEmail]
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

  router.post('/consultants/rfi/:id/reply', async (req, res) => {
    try {
      const { id } = req.params;
      const { reply } = req.body;
      const consultantEmail = req.headers['x-consultant-email'];

      await query(
        `UPDATE requests_for_information rfi
         SET consultant_reply = $1, consultant_replied_at = NOW(), consultant_reply_status = 'replied'
         FROM consultants c
         WHERE rfi.id = $2 AND rfi.referred_to_consultant_id = c.id AND c.email = $3`,
        [reply, id, consultantEmail]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error submitting RFI reply:', error);
      res.status(500).json({ error: 'Failed to submit reply' });
    }
  });

  router.get('/consultants/project/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const consultantEmail = req.headers['x-consultant-email'];
      const devUserEmail = req.headers['x-dev-user-email'];

      if (devUserEmail && !consultantEmail) {
        const result = await query(
          `SELECT * FROM projects WHERE id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }

        return res.json(result.rows[0]);
      }

      const result = await query(
        `SELECT p.*
         FROM projects p
         JOIN project_consultants pc ON p.id = pc.project_id
         JOIN consultants c ON pc.consultant_id = c.id
         WHERE p.id = $1 AND c.email = $2`,
        [id, consultantEmail]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found or not accessible' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  router.get('/consultants/project/:id/drawings', async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      console.error('Error fetching drawings:', error);
      res.status(500).json({ error: 'Failed to fetch drawings' });
    }
  });

  return router;
};

export default createConsultantsRouter;
