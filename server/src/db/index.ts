import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'tracelock.db');
export const db = new DatabaseSync(DB_PATH);

// Initialize pragmas for performance and data integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');

export function initDatabase() {
  db.exec(`
    -- Users and RBAC
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'INVESTIGATOR', 'VIEWER')),
      badge_number TEXT,
      organization TEXT DEFAULT 'Cyber Defense Operations',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Cases / Investigations
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      incident_type TEXT NOT NULL CHECK(incident_type IN ('PHISHING', 'MALWARE', 'DATA_BREACH', 'INSIDER_THREAT', 'RANSOMWARE', 'INCIDENT_RESPONSE', 'OTHER')),
      priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED')),
      lead_investigator_id TEXT REFERENCES users(id),
      closure_summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT
    );

    -- Case Team Assignments
    CREATE TABLE IF NOT EXISTS case_members (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_in_case TEXT NOT NULL DEFAULT 'ANALYST',
      assigned_at TEXT NOT NULL,
      UNIQUE(case_id, user_id)
    );

    -- Digital Evidence Items
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      evidence_number TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      md5 TEXT NOT NULL,
      sha1 TEXT NOT NULL,
      uploaded_by_id TEXT NOT NULL REFERENCES users(id),
      description TEXT NOT NULL,
      source_device TEXT,
      custody_location TEXT NOT NULL DEFAULT 'Secure Vault Tier 1',
      status TEXT NOT NULL CHECK(status IN ('SECURED', 'CHECKED_OUT', 'ANALYZED', 'DISPOSED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(case_id, evidence_number)
    );

    -- Tamper-Evident Cryptographic Chain of Custody
    CREATE TABLE IF NOT EXISTS custody_events (
      id TEXT PRIMARY KEY,
      evidence_id TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
      sequence_number INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('EVIDENCE_COLLECTED', 'EVIDENCE_SECURED', 'CHECKED_OUT', 'CHECKED_IN', 'HASH_VERIFIED', 'TRANSFERRED', 'ANALYZED', 'EXPORTED', 'DISPOSED')),
      actor_id TEXT NOT NULL REFERENCES users(id),
      timestamp TEXT NOT NULL,
      details TEXT NOT NULL,
      previous_event_hash TEXT NOT NULL,
      current_event_hash TEXT NOT NULL,
      UNIQUE(evidence_id, sequence_number)
    );

    -- Live Integrity Check Verifications
    CREATE TABLE IF NOT EXISTS integrity_checks (
      id TEXT PRIMARY KEY,
      evidence_id TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
      verified_by_id TEXT NOT NULL REFERENCES users(id),
      expected_hash TEXT NOT NULL,
      calculated_hash TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('INTEGRITY_VERIFIED', 'INTEGRITY_COMPROMISED')),
      verified_at TEXT NOT NULL,
      notes TEXT
    );

    -- Forensic Timeline Events
    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      event_time TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('ATTACK_VECTOR', 'EXFILTRATION', 'DETECTION', 'CONTAINMENT', 'ANALYSIS', 'REMEDIATION')),
      evidence_id TEXT REFERENCES evidence(id) ON DELETE SET NULL,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    -- Forensic Findings
    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('INFORMATIONAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL CHECK(status IN ('DRAFT', 'CONFIRMED', 'REFUTED', 'RESOLVED')),
      remediation TEXT,
      evidence_id TEXT REFERENCES evidence(id) ON DELETE SET NULL,
      author_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Case Notes / Collaborative Scratchpad
    CREATE TABLE IF NOT EXISTS case_notes (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- System-Wide Immutable Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT REFERENCES users(id),
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILURE', 'DENIED')),
      details TEXT,
      created_at TEXT NOT NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status, priority);
    CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_sha256 ON evidence(sha256);
    CREATE INDEX IF NOT EXISTS idx_custody_ev_seq ON custody_events(evidence_id, sequence_number);
    CREATE INDEX IF NOT EXISTS idx_timeline_case ON timeline_events(case_id, event_time);
    CREATE INDEX IF NOT EXISTS idx_findings_case ON findings(case_id, severity);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
  `);
}
