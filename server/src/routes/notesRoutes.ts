import { Router } from 'express';
import { getNotesForCase, createCaseNote, togglePinNote, deleteCaseNote } from '../services/notesService.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getParam } from '../utils/params.js';

const router = Router();

// GET /api/cases/:caseId/notes
router.get('/:caseId/notes', requireAuth, (req, res) => {
  const caseId = getParam(req.params.caseId);
  const notes = getNotesForCase(caseId);
  res.json({ notes });
});

// POST /api/cases/:caseId/notes
router.post('/:caseId/notes', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const caseId = getParam(req.params.caseId);
    const { content, isPinned } = req.body;
    if (!content) {
      res.status(400).json({ error: 'Note content is required' });
      return;
    }

    const note = createCaseNote(caseId, content, req.user!, !!isPinned);
    res.status(201).json({ message: 'Note recorded', note });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/notes/:id/pin
router.patch('/:id/pin', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const result = togglePinNote(id, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const result = deleteCaseNote(id, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
