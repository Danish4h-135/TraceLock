import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { logAudit } from './auditService.js';
import { UserSession } from './authService.js';

export function getNotesForCase(caseId: string) {
  return db.prepare(`
    SELECT n.*, u.name as author_name, u.email as author_email
    FROM case_notes n
    LEFT JOIN users u ON n.author_id = u.id
    WHERE n.case_id = ?
    ORDER BY n.is_pinned DESC, n.created_at DESC
  `).all(caseId);
}

export function createCaseNote(caseId: string, content: string, actorSession: UserSession, isPinned: boolean = false) {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO case_notes (id, case_id, author_id, content, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, caseId, actorSession.id, content.trim(), isPinned ? 1 : 0, now, now);

  logAudit({
    actorId: actorSession.id,
    actorEmail: actorSession.email,
    action: 'CASE_NOTE_CREATED',
    targetType: 'CASE',
    targetId: caseId,
    status: 'SUCCESS',
    details: { noteId: id, isPinned },
  });

  return db.prepare('SELECT * FROM case_notes WHERE id = ?').get(id);
}

export function togglePinNote(noteId: string, actorSession: UserSession) {
  const note = db.prepare('SELECT * FROM case_notes WHERE id = ?').get(noteId) as any;
  if (!note) throw new Error('Note not found');

  const newPinned = note.is_pinned ? 0 : 1;
  db.prepare('UPDATE case_notes SET is_pinned = ?, updated_at = ? WHERE id = ?').run(
    newPinned,
    new Date().toISOString(),
    noteId
  );

  return { success: true, isPinned: newPinned === 1 };
}

export function deleteCaseNote(noteId: string, actorSession: UserSession) {
  const note = db.prepare('SELECT * FROM case_notes WHERE id = ?').get(noteId) as any;
  if (!note) throw new Error('Note not found');

  db.prepare('DELETE FROM case_notes WHERE id = ?').run(noteId);

  logAudit({
    actorId: actorSession.id,
    actorEmail: actorSession.email,
    action: 'CASE_NOTE_DELETED',
    targetType: 'CASE',
    targetId: note.case_id,
    status: 'SUCCESS',
    details: { noteId },
  });

  return { success: true };
}
