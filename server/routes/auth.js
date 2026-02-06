import express from 'express';

const createAuthRouter = ({
  authRateLimiter,
  authSyncValidators,
  handleValidationErrors,
  query,
  superAdminEmails
}) => {
  const router = express.Router();

  router.post('/auth/sync', authRateLimiter, authSyncValidators, handleValidationErrors, async (req, res) => {
    const { email, fullName } = req.body;

    try {
      const existingUser = await query(
        'SELECT id, email, user_level, is_active FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        const updateText = `
          UPDATE users
          SET last_login = CURRENT_TIMESTAMP,
              full_name = $1
          WHERE email = $2
          RETURNING id, email, full_name, user_level, role, is_active;
        `;
        const result = await query(updateText, [fullName, email]);
        return res.json(result.rows[0]);
      }

      if (superAdminEmails.includes(email)) {
        const text = `
          INSERT INTO users (email, full_name, user_level, is_active, last_login)
          VALUES ($1, $2, 'SUPER_ADMIN', true, CURRENT_TIMESTAMP)
          RETURNING id, email, full_name, user_level, role, is_active;
        `;
        const result = await query(text, [email, fullName]);
        console.log(`✅ Super admin auto-created: ${email}`);
        return res.json(result.rows[0]);
      }

      console.log(`⚠️ Login attempt by non-registered user: ${email} (${fullName})`);
      res.status(403).json({
        error: 'Not registered',
        message: 'Your account is not registered in the system. Please contact your administrator for access.',
        email: email
      });
    } catch (error) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: 'Failed to sync user data' });
    }
  });

  return router;
};

export default createAuthRouter;
