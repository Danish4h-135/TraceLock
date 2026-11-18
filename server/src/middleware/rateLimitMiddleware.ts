import { Request, Response, NextFunction } from 'express';
import { logAudit } from '../services/auditService.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now > record.resetTime) {
      loginAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * In-memory sliding window rate limiter to protect authentication endpoints
 * against brute-force attacks and credential stuffing.
 */
export function loginRateLimiter(maxAttempts = 10, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    const record = loginAttempts.get(ip);

    if (!record || now > record.resetTime) {
      loginAttempts.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (record.count >= maxAttempts) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);

      logAudit({
        actorEmail: req.body?.email || 'ANONYMOUS',
        action: 'AUTH_RATE_LIMIT_EXCEEDED',
        targetType: 'SYSTEM_AUTH',
        targetId: 'login_endpoint',
        status: 'DENIED',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        details: { attempts: record.count, retryAfterSec },
      });

      res.setHeader('Retry-After', retryAfterSec);
      res.status(429).json({
        error: `Too many login attempts. Please wait ${retryAfterSec} seconds before retrying.`,
      });
      return;
    }

    record.count++;
    next();
  };
}
