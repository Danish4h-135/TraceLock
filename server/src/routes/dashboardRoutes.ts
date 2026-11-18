import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/dashboard
router.get('/', requireAuth, (_req, res) => {
  const totalCases = (db.prepare('SELECT COUNT(*) as cnt FROM cases').get() as any)?.cnt || 0;
  const activeCases = (db.prepare("SELECT COUNT(*) as cnt FROM cases WHERE status IN ('OPEN', 'IN_PROGRESS')").get() as any)?.cnt || 0;
  const closedCases = (db.prepare("SELECT COUNT(*) as cnt FROM cases WHERE status = 'CLOSED'").get() as any)?.cnt || 0;
  const totalEvidence = (db.prepare('SELECT COUNT(*) as cnt FROM evidence').get() as any)?.cnt || 0;
  const criticalFindings = (db.prepare("SELECT COUNT(*) as cnt FROM findings WHERE severity = 'CRITICAL'").get() as any)?.cnt || 0;

  // Integrity verification status stats
  const verifiedChecks = (db.prepare("SELECT COUNT(*) as cnt FROM integrity_checks WHERE result = 'INTEGRITY_VERIFIED'").get() as any)?.cnt || 0;
  const compromisedChecks = (db.prepare("SELECT COUNT(*) as cnt FROM integrity_checks WHERE result = 'INTEGRITY_COMPROMISED'").get() as any)?.cnt || 0;

  // Recent audit logs
  const recentAudit = db.prepare(`
    SELECT * FROM audit_logs 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all();

  // Recent cases
  const recentCases = db.prepare(`
    SELECT c.*, u.name as lead_investigator_name,
      (SELECT COUNT(*) FROM evidence e WHERE e.case_id = c.id) as evidence_count,
      (SELECT COUNT(*) FROM findings f WHERE f.case_id = c.id) as findings_count
    FROM cases c
    LEFT JOIN users u ON c.lead_investigator_id = u.id
    ORDER BY c.created_at DESC
    LIMIT 5
  `).all();

  res.json({
    metrics: {
      totalCases,
      activeCases,
      closedCases,
      totalEvidence,
      criticalFindings,
      verifiedChecks,
      compromisedChecks,
    },
    recentAudit,
    recentCases,
  });
});

export default router;
