import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { logAudit } from './auditService.js';
import { UserSession } from './authService.js';

export interface CreateFindingParams {
  caseId: string;
  title: string;
  description: string;
  severity: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DRAFT' | 'CONFIRMED' | 'REFUTED' | 'RESOLVED';
  remediation?: string;
  evidenceId?: string;
  actorSession: UserSession;
}

export function getFindingsForCase(caseId: string) {
  return db.prepare(`
    SELECT f.*, u.name as author_name, u.email as author_email,
      e.evidence_number, e.original_filename as evidence_filename
    FROM findings f
    LEFT JOIN users u ON f.author_id = u.id
    LEFT JOIN evidence e ON f.evidence_id = e.id
    WHERE f.case_id = ?
    ORDER BY 
      CASE f.severity 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
        ELSE 5 
      END,
      f.created_at DESC
  `).all(caseId);
}

export function createFinding(params: CreateFindingParams) {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO findings (id, case_id, title, description, severity, status, remediation, evidence_id, author_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.caseId,
    params.title.trim(),
    params.description.trim(),
    params.severity,
    params.status || 'DRAFT',
    params.remediation ? params.remediation.trim() : null,
    params.evidenceId || null,
    params.actorSession.id,
    now,
    now
  );

  logAudit({
    actorId: params.actorSession.id,
    actorEmail: params.actorSession.email,
    action: 'FINDING_CREATED',
    targetType: 'FINDING',
    targetId: id,
    status: 'SUCCESS',
    details: { caseId: params.caseId, title: params.title, severity: params.severity },
  });

  return db.prepare('SELECT * FROM findings WHERE id = ?').get(id);
}

export function updateFinding(
  findingId: string,
  updates: {
    title?: string;
    description?: string;
    severity?: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status?: 'DRAFT' | 'CONFIRMED' | 'REFUTED' | 'RESOLVED';
    remediation?: string;
    evidenceId?: string;
  },
  actorSession: UserSession
) {
  const existing = db.prepare('SELECT * FROM findings WHERE id = ?').get(findingId) as any;
  if (!existing) throw new Error('Finding not found');

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE findings SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      severity = COALESCE(?, severity),
      status = COALESCE(?, status),
      remediation = COALESCE(?, remediation),
      evidence_id = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    updates.title || null,
    updates.description || null,
    updates.severity || null,
    updates.status || null,
    updates.remediation !== undefined ? updates.remediation : existing.remediation,
    updates.evidenceId !== undefined ? (updates.evidenceId || null) : existing.evidence_id,
    now,
    findingId
  );

  logAudit({
    actorId: actorSession.id,
    actorEmail: actorSession.email,
    action: 'FINDING_UPDATED',
    targetType: 'FINDING',
    targetId: findingId,
    status: 'SUCCESS',
    details: { updates },
  });

  return db.prepare('SELECT * FROM findings WHERE id = ?').get(findingId);
}

export function deleteFinding(findingId: string, actorSession: UserSession) {
  const existing = db.prepare('SELECT * FROM findings WHERE id = ?').get(findingId) as any;
  if (!existing) throw new Error('Finding not found');

  db.prepare('DELETE FROM findings WHERE id = ?').run(findingId);

  logAudit({
    actorId: actorSession.id,
    actorEmail: actorSession.email,
    action: 'FINDING_DELETED',
    targetType: 'FINDING',
    targetId: findingId,
    status: 'SUCCESS',
    details: { caseId: existing.case_id, title: existing.title },
  });

  return { success: true };
}
