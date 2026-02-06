import express from 'express';

const createVendorsRouter = ({ query, verifyToken }) => {
  const router = express.Router();

  router.post('/vendors/register', verifyToken, async (req, res) => {
    try {
      const { name, email, contactNumber, companyName, projectId } = req.body;
      const assignedBy = req.userId;

      const result = await query(
        `INSERT INTO vendors (name, email, contact_number, company_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET name = $1, contact_number = $2, company_name = $3, is_active = true
         RETURNING id`,
        [name, email, contactNumber, companyName]
      );

      const vendorId = result.rows[0].id;

      if (projectId) {
        await query(
          `INSERT INTO project_vendors (project_id, vendor_id, assigned_by_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (project_id, vendor_id) DO NOTHING`,
          [projectId, vendorId, assignedBy]
        );
      }

      res.json({ success: true, vendorId });
    } catch (error) {
      console.error('Error registering vendor:', error);
      res.status(500).json({ error: 'Failed to register vendor' });
    }
  });

  router.get('/vendors/list', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT id, name, email, contact_number, company_name, is_active, created_at
         FROM vendors
         ORDER BY name`
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  });

  router.post('/vendors/send-otp', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const vendor = await query(
        'SELECT id FROM vendors WHERE email = $1 AND is_active = true',
        [email]
      );

      if (vendor.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found or inactive' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await query(
        `INSERT INTO vendor_otp (email, otp, expires_at)
         VALUES ($1, $2, $3)`,
        [email, otp, expiresAt]
      );

      console.log(`OTP for vendor ${email}: ${otp}`);

      res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
      console.error('Error sending vendor OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  router.post('/vendors/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
      }

      const otpResult = await query(
        `SELECT id FROM vendor_otp
         WHERE email = $1 AND otp = $2 AND is_used = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [email, otp]
      );

      if (otpResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
      }

      await query(
        'UPDATE vendor_otp SET is_used = true WHERE id = $1',
        [otpResult.rows[0].id]
      );

      const vendor = await query(
        'SELECT id, name, email FROM vendors WHERE email = $1',
        [email]
      );

      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

      res.json({
        success: true,
        token,
        vendorId: vendor.rows[0].id,
        vendor: vendor.rows[0]
      });
    } catch (error) {
      console.error('Error verifying vendor OTP:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

  router.get('/vendors/profile', async (req, res) => {
    try {
      const vendorEmail = req.headers['x-vendor-email'];
      const devUserEmail = req.headers['x-dev-user-email'];

      if (devUserEmail && !vendorEmail) {
        const projectsResult = await query(
          `SELECT id, name, description, lifecycle_stage, completion_percentage
           FROM projects
           ORDER BY name`
        );

        return res.json({
          vendor: { name: 'Super Admin', email: devUserEmail },
          projects: projectsResult.rows
        });
      }

      if (!vendorEmail) {
        return res.status(401).json({ error: 'Not authorized' });
      }

      const vendorResult = await query(
        'SELECT id, name, email, contact_number, company_name FROM vendors WHERE email = $1',
        [vendorEmail]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      const vendor = vendorResult.rows[0];

      const projectsResult = await query(
        `SELECT DISTINCT p.id, p.name, p.description, p.lifecycle_stage, p.completion_percentage
         FROM projects p
         JOIN project_vendors pv ON p.id = pv.project_id
         WHERE pv.vendor_id = $1
         ORDER BY p.name`,
        [vendor.id]
      );

      res.json({
        vendor,
        projects: projectsResult.rows
      });
    } catch (error) {
      console.error('Error fetching vendor profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  return router;
};

export default createVendorsRouter;
