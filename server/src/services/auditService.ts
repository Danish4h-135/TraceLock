import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';

export interface AuditLogEntry {
  actorId?: string | null;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'DENIED';
  details?: Record<string, any> | string;
}

export function logAudit(entry: AuditLogEntry): string {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const detailsStr = typeof entry.details === 'object' ? JSON.stringify(entry.details) : (entry.details || '');
  const ip = entry.ipAddress || '127.0.0.1';
  const ua = entry.userAgent || 'system';

  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_email, action, target_type, target_id, ip_address, user_agent, status, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    entry.actorId || null,
    entry.actorEmail,
    entry.action,
    entry.targetType,
    entry.targetId,
    ip,
    ua,
    entry.status,
    detailsStr,
    createdAt
  );

  return id;
}

export function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  targetType?: string;
  targetId?: string;
  actorEmail?: string;
  action?: string;
}) {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (options?.targetType) {
    query += ' AND target_type = ?';
    params.push(options.targetType);
  }
  if (options?.targetId) {
    query += ' AND target_id = ?';
    params.push(options.targetId);
  }
  if (options?.actorEmail) {
    query += ' AND actor_email LIKE ?';
    params.push(`%${options.actorEmail}%`);
  }
  if (options?.action) {
    query += ' AND action = ?';
    params.push(options.action);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}
