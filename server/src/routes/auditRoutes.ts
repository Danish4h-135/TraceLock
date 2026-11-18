import { Router } from 'express';
import { getAuditLogs } from '../services/auditService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/audit - List audit trail with filters
router.get('/', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req, res) => {
  const { limit, offset, targetType, targetId, actorEmail, action } = req.query;

  const logs = getAuditLogs({
    limit: limit ? Number(limit) : 100,
    offset: offset ? Number(offset) : 0,
    targetType: targetType as string,
    targetId: targetId as string,
    actorEmail: actorEmail as string,
    action: action as string,
  });

  res.json({ auditLogs: logs });
});

export default router;
