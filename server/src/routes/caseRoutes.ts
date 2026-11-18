import { Router } from 'express';
import { getAllCases, getCaseById, createCase, updateCase, addMemberToCase } from '../services/caseService.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getParam } from '../utils/params.js';

const router = Router();

// GET /api/cases
router.get('/', requireAuth, (req, res) => {
  const { status, priority, incidentType, search } = req.query;
  const cases = getAllCases({
    status: status as string,
    priority: priority as string,
    incidentType: incidentType as string,
    search: search as string,
  });
  res.json({ cases });
});

// POST /api/cases
router.post('/', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const { title, description, incidentType, priority, leadInvestigatorId } = req.body;
    if (!title || !description || !incidentType || !priority) {
      res.status(400).json({ error: 'title, description, incidentType, and priority are required' });
      return;
    }

    const newCase = createCase({
      title,
      description,
      incidentType,
      priority,
      leadInvestigatorId,
      actorSession: req.user!,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ message: 'Case created successfully', case: newCase });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/cases/:id
router.get('/:id', requireAuth, (req, res) => {
  const caseId = getParam(req.params.id);
  const caseItem = getCaseById(caseId);
  if (!caseItem) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }
  res.json({ case: caseItem });
});

// PATCH /api/cases/:id
router.patch('/:id', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const caseId = getParam(req.params.id);
    const updated = updateCase(
      caseId,
      req.body,
      req.user!,
      req.ip,
      req.headers['user-agent']
    );
    res.json({ message: 'Case updated successfully', case: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/cases/:id/members
router.post('/:id/members', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const caseId = getParam(req.params.id);
    const { userId, roleInCase } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = addMemberToCase(caseId, userId, roleInCase, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
