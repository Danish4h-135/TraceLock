import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { logAudit } from './auditService.js';
import { UserSession } from './authService.js';

export interface CreateCaseParams {
  title: string;
  description: string;
  incidentType: 'PHISHING' | 'MALWARE' | 'DATA_BREACH' | 'INSIDER_THREAT' | 'RANSOMWARE' | 'INCIDENT_RESPONSE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  leadInvestigatorId?: string;
  actorSession: UserSession;
  ipAddress?: string;
  userAgent?: string;
}

export function generateCaseNumber(): string {
  const currentYear = new Date().getFullYear();
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM cases').get() as any;
  const count = (countRow?.cnt || 0) + 1;
  return `TL-${currentYear}-${String(count).padStart(4, '0')}`;
}

export function createCase(params: CreateCaseParams) {
  const id = uuidv4();
  const caseNumber = generateCaseNumber();
  const now = new Date().toISOString();
  const leadId = params.leadInvestigatorId || params.actorSession.id;

  db.prepare(`
    INSERT INTO cases (
      id, case_number, title, description, incident_type, priority,
      status, lead_investigator_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    caseNumber,
    params.title.trim(),
    params.description.trim(),
    params.incidentType,
    params.priority,
    'OPEN',
    leadId,
    now,
    now
  );

  // Auto-assign creator as case member
  db.prepare(`
    INSERT INTO case_members (id, case_id, user_id, role_in_case, assigned_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), id, params.actorSession.id, 'LEAD_INVESTIGATOR', now);

  logAudit({
    actorId: params.actorSession.id,
    actorEmail: params.actorSession.email,
    action: 'CASE_CREATED',
    targetType: 'CASE',
    targetId: id,
    status: 'SUCCESS',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: { caseNumber, title: params.title, priority: params.priority, incidentType: params.incidentType },
  });

  return getCaseById(id);
}

export function getCaseById(caseId: string) {
  const caseRow = db.prepare(`
    SELECT c.*, u.name as lead_investigator_name, u.email as lead_investigator_email
    FROM cases c
    LEFT JOIN users u ON c.lead_investigator_id = u.id
    WHERE c.id = ?
  `).get(caseId) as any;

  if (!caseRow) return null;

  // Fetch stats and members
  const members = db.prepare(`
    SELECT cm.*, u.name, u.email, u.role, u.badge_number, u.organization
    FROM case_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.case_id = ?
    ORDER BY u.name ASC
  `).all(caseId);

  const evidenceCount = (db.prepare('SELECT COUNT(*) as cnt FROM evidence WHERE case_id = ?').get(caseId) as any)?.cnt || 0;
  const findingsCount = (db.prepare('SELECT COUNT(*) as cnt FROM findings WHERE case_id = ?').get(caseId) as any)?.cnt || 0;
  const timelineCount = (db.prepare('SELECT COUNT(*) as cnt FROM timeline_events WHERE case_id = ?').get(caseId) as any)?.cnt || 0;
  const notesCount = (db.prepare('SELECT COUNT(*) as cnt FROM case_notes WHERE case_id = ?').get(caseId) as any)?.cnt || 0;

  return {
    ...caseRow,
    members,
    stats: {
      evidenceCount,
      findingsCount,
      timelineCount,
      notesCount,
    },
  };
}

export function getAllCases(options?: {
  status?: string;
  priority?: string;
  incidentType?: string;
  search?: string;
}) {
  let query = `
    SELECT c.*, u.name as lead_investigator_name,
      (SELECT COUNT(*) FROM evidence e WHERE e.case_id = c.id) as evidence_count,
      (SELECT COUNT(*) FROM findings f WHERE f.case_id = c.id) as findings_count
    FROM cases c
    LEFT JOIN users u ON c.lead_investigator_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options?.status) {
    query += ' AND c.status = ?';
    params.push(options.status);
  }
  if (options?.priority) {
    query += ' AND c.priority = ?';
    params.push(options.priority);
  }
  if (options?.incidentType) {
    query += ' AND c.incident_type = ?';
    params.push(options.incidentType);
  }
  if (options?.search) {
    query += ' AND (c.case_number LIKE ? OR c.title LIKE ? OR c.description LIKE ?)';
    const term = `%${options.search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY c.created_at DESC';

  return db.prepare(query).all(...params);
}

export function updateCase(
  caseId: string,
  updates: {
    title?: string;
    description?: string;
    status?: 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'CLOSED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    closureSummary?: string;
  },
  actorSession: UserSession,
  ipAddress?: string,
  userAgent?: string
) {
  const existing = getCaseById(caseId);
  if (!existing) throw new Error('Case not found');

  const now = new Date().toISOString();
  const closedAt = updates.status === 'CLOSED' ? (existing.closed_at || now) : null;

  db.prepare(`
    UPDATE cases SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      closure_summary = COALESCE(?, closure_summary),
      closed_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    updates.title || null,
    updates.description || null,
    updates.status || null,
    updates.priority || null,
    updates.closureSummary || null,
    closedAt,
    now,
    caseId
  );

  logAudit({
    actorId: actorSession.id,
    actorEmail: actorSession.email,
    action: 'CASE_UPDATED',
    targetType: 'CASE',
    targetId: caseId,
    status: 'SUCCESS',
    ipAddress,
    userAgent,
    details: { updates, previousStatus: existing.status, newStatus: updates.status || existing.status },
  });

  return getCaseById(caseId);
}

export function addMemberToCase(caseId: string, userId: string, roleInCase: string, actorSession: UserSession) {
  const existing = db.prepare('SELECT id FROM case_members WHERE case_id = ? AND user_id = ?').get(caseId, userId);
  if (existing) {
    throw new Error('User is already assigned to this case');
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO case_members (id, case_id, user_id, role_in_case, assigned_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, caseId, userId, roleInCase || 'ANALYST', now);

  logAudit({
    actorId: actorSession.id,
    actorEmail: actorSession.email,
    action: 'CASE_MEMBER_ADDED',
    targetType: 'CASE',
    targetId: caseId,
    status: 'SUCCESS',
    details: { assignedUserId: userId, roleInCase },
  });

  return { success: true };
}
