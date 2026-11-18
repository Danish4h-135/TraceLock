import { Router } from 'express';
import { getFindingsForCase, createFinding, updateFinding, deleteFinding } from '../services/findingsService.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getParam } from '../utils/params.js';

const router = Router();

// GET /api/cases/:caseId/findings
router.get('/:caseId/findings', requireAuth, (req, res) => {
  const caseId = getParam(req.params.caseId);
  const findings = getFindingsForCase(caseId);
  res.json({ findings });
});

// POST /api/cases/:caseId/findings
router.post('/:caseId/findings', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const caseId = getParam(req.params.caseId);
    const { title, description, severity, status, remediation, evidenceId } = req.body;
    if (!title || !description || !severity) {
      res.status(400).json({ error: 'title, description, and severity are required' });
      return;
    }

    const finding = createFinding({
      caseId,
      title,
      description,
      severity,
      status: status || 'DRAFT',
      remediation,
      evidenceId,
      actorSession: req.user!,
    });

    res.status(201).json({ message: 'Finding documented', finding });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/findings/:id
router.patch('/:id', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const updated = updateFinding(id, req.body, req.user!);
    res.json({ message: 'Finding updated', finding: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/findings/:id
router.delete('/:id', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const result = deleteFinding(id, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
