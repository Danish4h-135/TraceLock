import { Router } from 'express';
import { getTimelineEventsForCase, addTimelineEvent, deleteTimelineEvent } from '../services/timelineService.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getParam } from '../utils/params.js';

const router = Router();

// GET /api/cases/:caseId/timeline
router.get('/:caseId/timeline', requireAuth, (req, res) => {
  const caseId = getParam(req.params.caseId);
  const events = getTimelineEventsForCase(caseId);
  res.json({ timeline: events });
});

// POST /api/cases/:caseId/timeline
router.post('/:caseId/timeline', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const caseId = getParam(req.params.caseId);
    const { eventTime, title, description, category, evidenceId } = req.body;
    if (!eventTime || !title || !description || !category) {
      res.status(400).json({ error: 'eventTime, title, description, and category are required' });
      return;
    }

    const event = addTimelineEvent({
      caseId,
      eventTime,
      title,
      description,
      category,
      evidenceId,
      actorSession: req.user!,
    });

    res.status(201).json({ message: 'Timeline event recorded', event });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/timeline/:id
router.delete('/:id', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const result = deleteTimelineEvent(id, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
