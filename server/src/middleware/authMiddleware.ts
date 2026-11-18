import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserSession } from '../services/authService.js';
import { logAudit } from '../services/auditService.js';

export interface AuthenticatedRequest extends Request {
  user?: UserSession;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const session = verifyToken(token);

  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }

  req.user = session;
  next();
}

export function requireRole(...allowedRoles: Array<'ADMIN' | 'INVESTIGATOR' | 'VIEWER'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAudit({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'ACCESS_DENIED_ROLE_INSUFFICIENT',
        targetType: 'API_ENDPOINT',
        targetId: req.originalUrl,
        status: 'DENIED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { requiredRoles: allowedRoles, userRole: req.user.role },
      });

      res.status(403).json({
        error: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}
