import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { logAudit } from './auditService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tracelock-dfir-super-secure-key-2026-sha256-auth';
const JWT_EXPIRES_IN = '24h';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'INVESTIGATOR' | 'VIEWER';
  badgeNumber?: string;
  organization?: string;
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(12);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(user: UserSession): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      badgeNumber: user.badgeNumber,
      organization: user.organization,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (err) {
    return null;
  }
}

export function authenticateUser(email: string, password: string, ipAddress?: string, userAgent?: string): { user: UserSession; token: string } | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const userRow = stmt.get(email.toLowerCase().trim()) as any;

  if (!userRow) {
    logAudit({
      actorEmail: email,
      action: 'AUTH_LOGIN_FAILED',
      targetType: 'USER',
      targetId: 'unknown',
      status: 'FAILURE',
      ipAddress,
      userAgent,
      details: { reason: 'User not found' },
    });
    return null;
  }

  const valid = comparePassword(password, userRow.password_hash);
  if (!valid) {
    logAudit({
      actorId: userRow.id,
      actorEmail: userRow.email,
      action: 'AUTH_LOGIN_FAILED',
      targetType: 'USER',
      targetId: userRow.id,
      status: 'FAILURE',
      ipAddress,
      userAgent,
      details: { reason: 'Invalid password credentials' },
    });
    return null;
  }

  const userSession: UserSession = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    role: userRow.role,
    badgeNumber: userRow.badge_number,
    organization: userRow.organization,
  };

  const token = generateToken(userSession);

  logAudit({
    actorId: userRow.id,
    actorEmail: userRow.email,
    action: 'AUTH_LOGIN_SUCCESS',
    targetType: 'USER',
    targetId: userRow.id,
    status: 'SUCCESS',
    ipAddress,
    userAgent,
    details: { role: userRow.role },
  });

  return { user: userSession, token };
}

export function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'INVESTIGATOR' | 'VIEWER';
  badgeNumber?: string;
  organization?: string;
  creatorSession?: UserSession;
  ipAddress?: string;
  userAgent?: string;
}): UserSession {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email.toLowerCase().trim());
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const id = uuidv4();
  const passwordHash = hashPassword(data.password);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, badge_number, organization, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.email.toLowerCase().trim(),
    passwordHash,
    data.name.trim(),
    data.role,
    data.badgeNumber || null,
    data.organization || 'Cyber Defense Operations',
    now,
    now
  );

  logAudit({
    actorId: data.creatorSession?.id || null,
    actorEmail: data.creatorSession?.email || 'SYSTEM',
    action: 'USER_CREATED',
    targetType: 'USER',
    targetId: id,
    status: 'SUCCESS',
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    details: { createdUserEmail: data.email, role: data.role },
  });

  return {
    id,
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    role: data.role,
    badgeNumber: data.badgeNumber,
    organization: data.organization,
  };
}

export function getAllUsers() {
  return db.prepare('SELECT id, email, name, role, badge_number, organization, created_at FROM users ORDER BY name ASC').all();
}
