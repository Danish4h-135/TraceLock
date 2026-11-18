import { Router } from 'express';
import { generateForensicCaseDossier, generateHtmlForensicReport } from '../services/reportService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getParam } from '../utils/params.js';

const router = Router();

// GET /api/cases/:caseId/report/json - Full structured JSON dossier
router.get('/:caseId/report/json', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const caseId = getParam(req.params.caseId);
    const dossier = generateForensicCaseDossier(caseId, req.user!);
    res.json(dossier);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/cases/:caseId/report/html - Formatted Investigation Dossier HTML Report
router.get('/:caseId/report/html', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const caseId = getParam(req.params.caseId);
    const html = generateHtmlForensicReport(caseId, req.user!);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
