import { query } from '../db.js';
import logger from '../utils/logger.js';

/**
 * Creates authentication middleware configured with the Firebase Admin instance.
 * @param {object|null} firebaseAdmin - Initialised Firebase Admin SDK instance (null if unconfigured)
 * @returns {{ verifyToken, requireRole, checkProjectAccess }}
 */
export default function createAuthMiddleware(firebaseAdmin) {
  /**
   * Verify Firebase ID token and attach user info to request.
   * Development Mode: allows x-dev-user-email header when Firebase Admin is
   * not configured and NODE_ENV !== 'production'.
   */
  const verifyToken = async (req, res, next) => {
    // Skip auth for health check
    if (req.path === '/api/health') {
      return next();
    }

    const authHeader = req.headers.authorization;
    const devUserEmail = req.headers['x-dev-user-email'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Development bypass
      if (devUserEmail && !firebaseAdmin && process.env.NODE_ENV !== 'production') {
        try {
          logger.info(`[DEV] Using dev user bypass for email: ${devUserEmail}`);
          const userResult = await query(
            'SELECT id, email, user_level FROM users WHERE email = $1',
            [devUserEmail]
          );

          if (userResult.rows.length === 0) {
            return res.status(403).json({
              error: 'Forbidden',
              message: `User "${devUserEmail}" not found in database. Contact administrator.`,
            });
          }

          const user = userResult.rows[0];
          req.user = buildUserPayload(user, `dev-${user.id}`);
          return next();
        } catch (error) {
          logger.error('Dev user lookup error:', error.message);
          return res.status(401).json({ error: 'Unauthorized', message: 'Failed to lookup dev user' });
        }
      }

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided. Send Authorization: Bearer <token>',
      });
    }

    const token = authHeader.substring(7);

    try {
      if (!firebaseAdmin) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Firebase Admin SDK not initialized. In development, use x-dev-user-email header.',
        });
      }

      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      const userResult = await query(
        'SELECT id, email, user_level FROM users WHERE email = $1',
        [decodedToken.email]
      );

      if (userResult.rows.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'User not found in database. Contact administrator.',
        });
      }

      const user = userResult.rows[0];
      req.user = {
        ...buildUserPayload(user, decodedToken.uid),
        ...(decodedToken.custom_claims || {}),
      };
      next();
    } catch (error) {
      logger.error('Token verification error:', error.message);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  };

  /**
   * Role-based access control.
   * Usage: requireRole('SUPER_ADMIN', 'L1')
   */
  const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      }
      if (!allowedRoles.includes(req.user.userLevel)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Requires one of: ${allowedRoles.join(', ')}. Your level: ${req.user.userLevel}`,
        });
      }
      next();
    };
  };

  /**
   * Verify the authenticated user has access to the project identified by
   * :projectId or :id in the request params.
   */
  const checkProjectAccess = async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id;
      const userId = req.user.userId;
      const userLevel = req.user.userLevel;

      if (userLevel === 'SUPER_ADMIN' || userLevel === 'L1') {
        return next();
      }

      if (userLevel === 'L2') {
        const projectCheck = await query(
          'SELECT assigned_lead_id FROM projects WHERE id = $1',
          [projectId]
        );
        if (projectCheck.rows.length > 0 && projectCheck.rows[0].assigned_lead_id === userId) {
          return next();
        }
      }

      const teamCheck = await query(
        'SELECT id FROM project_team WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );

      if (teamCheck.rows.length > 0) {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this project' });
    } catch (error) {
      logger.error('Error checking project access:', error);
      return res.status(500).json({ error: 'Failed to verify project access' });
    }
  };

  return { verifyToken, requireRole, checkProjectAccess };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildUserPayload(user, uid) {
  return {
    uid,
    email: user.email,
    userId: user.id,
    userLevel: user.user_level,
    isAdmin: user.user_level === 'SUPER_ADMIN',
    isL1: user.user_level === 'L1',
    isL2: user.user_level === 'L2',
    isL3: user.user_level === 'L3',
    isL4: user.user_level === 'L4',
  };
}
