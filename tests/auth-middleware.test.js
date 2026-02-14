import { describe, it, expect, vi, beforeEach } from 'vitest';

// Minimal mock for db query
const mockQuery = vi.fn();

// Mock modules before importing
vi.mock('../server/db.js', () => ({
  query: (...args) => mockQuery(...args),
}));

vi.mock('../server/utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks are set up
const { default: createAuthMiddleware } = await import('../server/middleware/auth.js');

describe('Auth Middleware', () => {
  let verifyToken, requireRole;
  let req, res, next;

  beforeEach(() => {
    ({ verifyToken, requireRole } = createAuthMiddleware(null)); // no Firebase Admin
    req = {
      path: '/api/test',
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    mockQuery.mockReset();
  });

  describe('verifyToken', () => {
    it('skips auth for health check endpoint', async () => {
      req.path = '/api/health';
      await verifyToken(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects requests with no auth header and no dev bypass', async () => {
      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows dev bypass with x-dev-user-email when NODE_ENV != production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      req.headers['x-dev-user-email'] = 'test@test.com';
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@test.com', user_level: 'L2' }],
      });

      await verifyToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.email).toBe('test@test.com');
      expect(req.user.userLevel).toBe('L2');
      process.env.NODE_ENV = origEnv;
    });

    it('rejects dev bypass in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      req.headers['x-dev-user-email'] = 'test@test.com';

      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      process.env.NODE_ENV = origEnv;
    });

    it('rejects bearer token when Firebase Admin is not configured', async () => {
      req.headers.authorization = 'Bearer fake-token';
      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireRole', () => {
    it('allows matching role', () => {
      const middleware = requireRole('SUPER_ADMIN', 'L1');
      req.user = { userLevel: 'L1' };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects non-matching role', () => {
      const middleware = requireRole('SUPER_ADMIN');
      req.user = { userLevel: 'L4' };
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rejects missing user', () => {
      const middleware = requireRole('SUPER_ADMIN');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
