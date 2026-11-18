import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { logAudit } from './auditService.js';
import { UserSession } from './authService.js';

export interface CreateTimelineEventParams {
  caseId: string;
  eventTime: string;
  title: string;
  description: string;
  category: 'ATTACK_VECTOR' | 'EXFILTRATION' | 'DETECTION' | 'CONTAINMENT' | 'ANALYSIS' | 'REMEDIATION';
  evidenceId?: string;
  actorSession: UserSession;
}

export function getTimelineEventsForCase(caseId: string) {
  return db.prepare(`
    SELECT t.*, u.name as creator_name, u.email as creator_email,
      e.evidence_number, e.original_filename as evidence_filename
    FROM timeline_events t
    LEFT JOIN users u ON t.created_by_id = u.id
    LEFT JOIN evidence e ON t.evidence_id = e.id
    WHERE t.case_id = ?
    ORDER BY t.event_time ASC
  `).all(caseId);
}

export function addTimelineEvent(params: CreateTimelineEventParams) {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO timeline_events (id, case_id, event_time, title, description, category, evidence_id, created_by_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.caseId,
    params.eventTime,
    params.title.trim(),
    params.description.trim(),
    params.category,
    params.evidenceId || null,
    params.actorSession.id,
    now
  );

  logAudit({
    actorId: params.actorSession.id,
    actorEmail: params.actorSession.email,
    action: 'TIMELINE_EVENT_ADDED',
    targetType: 'CASE',
    targetId: params.caseId,
    status: 'SUCCESS',
    details: { eventId: id, title: params.title, category: params.category, eventTime: params.eventTime },
  });

  return db.prepare('SELECT * FROM timeline_events WHERE id = ?').get(id);
}

export function deleteTimelineEvent(eventId: string, actorSession: UserSession) {
  const existing = db.prepare('SELECT * FROM timeline_events WHERE id = ?').get(eventId) as any;
  if (!existing) throw new Error('Timeline event not found');

  db.prepare('DELETE FROM timeline_events WHERE id = ?').run(eventId);

  logAudit({
    actorId: actorSession.id,
    actorEmail: actorSession.email,
    action: 'TIMELINE_EVENT_DELETED',
    targetType: 'CASE',
    targetId: existing.case_id,
    status: 'SUCCESS',
    details: { eventId, title: existing.title },
  });

  return { success: true };
}
