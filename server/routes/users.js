import express from 'express';

const createUsersRouter = ({ query, logger, verifyToken }) => {
  const router = express.Router();

  router.get('/users/email/:email', async (req, res) => {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);
    console.log('📧 Fetching user by email:', decodedEmail);

    try {
      const result = await query(
        'SELECT id, email, full_name, role, user_level FROM users WHERE email = $1',
        [decodedEmail]
      );

      console.log('Found users:', result.rows.length);

      if (result.rows.length === 0) {
        console.log('❌ User not found:', decodedEmail);
        return res.status(404).json({ error: 'User not found' });
      }

      console.log('✅ User found:', result.rows[0]);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  router.get('/users/level/:level', async (req, res) => {
    try {
      const { level } = req.params;
      const text = 'SELECT id, email, full_name, user_level FROM users WHERE user_level = $1 ORDER BY full_name ASC';
      const result = await query(text, [level]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  router.get('/users/addable', verifyToken, async (req, res) => {
    try {
      const currentUserLevel = req.user.userLevel;
      let allowedLevels = [];

      if (currentUserLevel === 'SUPER_ADMIN') {
        allowedLevels = ['L1', 'L2', 'L3', 'L4'];
      } else if (currentUserLevel === 'L1') {
        allowedLevels = ['L2', 'L3', 'L4'];
      } else if (currentUserLevel === 'L2') {
        allowedLevels = ['L3', 'L4'];
      } else {
        return res.json([]);
      }

      const text = 'SELECT id, email, full_name, user_level FROM users WHERE user_level = ANY($1) ORDER BY user_level, full_name ASC';
      const result = await query(text, [allowedLevels]);
      res.json(result.rows);
    } catch (error) {
      logger.error('Error fetching addable users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  router.get('/users/pending', verifyToken, async (req, res) => {
    try {
      const text = `
        SELECT id, email, full_name, user_level, created_at
        FROM users
        WHERE is_active = false
        ORDER BY created_at DESC
      `;
      const result = await query(text);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      res.status(500).json({ error: 'Failed to fetch pending users' });
    }
  });

  router.post('/users/:id/activate', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
      const requester = await query('SELECT user_level FROM users WHERE email = $1', [req.user.email]);
      if (requester.rows.length === 0 || !['L1', 'SUPER_ADMIN'].includes(requester.rows[0].user_level)) {
        return res.status(403).json({ error: 'Unauthorized: Only L1 and Super Admins can activate users' });
      }

      const text = `
        UPDATE users
        SET is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, full_name, user_level, is_active
      `;
      const result = await query(text, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      console.log(`✅ User activated: ${result.rows[0].email} by ${req.user.email}`);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ error: 'Failed to activate user' });
    }
  });

  return router;
};

export default createUsersRouter;
