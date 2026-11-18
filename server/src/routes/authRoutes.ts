import { Router } from 'express';
import { authenticateUser, createUser, getAllUsers } from '../services/authService.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { loginRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// POST /api/auth/login (with brute-force rate limiting)
router.post('/login', loginRateLimiter(10, 60 * 1000), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const result = authenticateUser(email, password, req.ip, req.headers['user-agent']);
  if (!result) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  res.json({
    message: 'Authentication successful',
    token: result.token,
    user: result.user,
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users
router.get('/users', requireAuth, (_req, res) => {
  const users = getAllUsers();
  res.json({ users });
});

// POST /api/auth/users (Admin only)
router.post('/users', requireAuth, requireRole('ADMIN'), (req: AuthenticatedRequest, res) => {
  try {
    const { email, password, name, role, badgeNumber, organization } = req.body;
    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'email, password, name, and role are required' });
      return;
    }

    const created = createUser({
      email,
      password,
      name,
      role,
      badgeNumber,
      organization,
      creatorSession: req.user,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ message: 'User created successfully', user: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
