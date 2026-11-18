import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { calculateFileHashes, verifyEvidenceIntegrity } from '../crypto/hasher.js';
import { appendCustodyEvent, getCustodyEventsForEvidence } from './custodyService.js';
import { logAudit } from './auditService.js';
import { UserSession } from './authService.js';

const VAULT_DIR = path.resolve(process.cwd(), '..', 'storage', 'vault');
if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

export function getVaultDir(): string {
  return VAULT_DIR;
}

/**
 * Sanitizes untrusted user filenames: removes null bytes, control characters,
 * path traversal sequences, and caps filename length to 255 chars.
 */
export function sanitizeFilename(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'unnamed_evidence.bin';
  const base = path.basename(raw).replace(/[\x00-\x1f\x7f\\/]/g, '').trim();
  const safe = base.replace(/^\.+/, ''); // Prevent hidden file prefix dot traversal
  return (safe || 'unnamed_evidence.bin').slice(0, 255);
}

export interface CreateEvidenceParams {
  caseId: string;
  originalFilename: string;
  tempFilePath: string;
  mimeType: string;
  description: string;
  sourceDevice?: string;
  custodyLocation?: string;
  uploaderSession: UserSession;
  ipAddress?: string;
  userAgent?: string;
}

export async function createEvidenceItem(params: CreateEvidenceParams) {
  const caseRecord = db.prepare('SELECT id, case_number FROM cases WHERE id = ?').get(params.caseId) as any;
  if (!caseRecord) {
    throw new Error(`Case ${params.caseId} not found`);
  }

  // Count existing evidence in this case to assign next evidence number
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM evidence WHERE case_id = ?').get(params.caseId) as any;
  const nextNum = (countRow?.cnt || 0) + 1;
  const evidenceNumber = `EVD-${String(nextNum).padStart(3, '0')}`;

  const evidenceId = uuidv4();
  const storedFilename = `${evidenceId}.bin`; // Isolated raw binary name
  const finalVaultPath = path.join(VAULT_DIR, storedFilename);

  // Move temp file to secure vault
  fs.renameSync(params.tempFilePath, finalVaultPath);

  // Compute real cryptographic hashes on the stored file
  const hashes = await calculateFileHashes(finalVaultPath);
  const now = new Date().toISOString();

  // Save to database
  db.prepare(`
    INSERT INTO evidence (
      id, case_id, evidence_number, original_filename, stored_filename,
      file_size, mime_type, sha256, md5, sha1, uploaded_by_id,
      description, source_device, custody_location, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evidenceId,
    params.caseId,
    evidenceNumber,
    sanitizeFilename(params.originalFilename),
    storedFilename,
    hashes.size,
    params.mimeType || 'application/octet-stream',
    hashes.sha256,
    hashes.md5,
    hashes.sha1,
    params.uploaderSession.id,
    params.description.trim(),
    params.sourceDevice || 'Forensic Acquisition Station',
    params.custodyLocation || 'Secure Vault Tier 1',
    'SECURED',
    now,
    now
  );

  // Create Initial Chain of Custody Block (Block #1 - Secured in Vault)
  appendCustodyEvent({
    evidenceId,
    action: 'EVIDENCE_SECURED',
    actorSession: params.uploaderSession,
    details: `Evidence ingested into TraceLock Vault. Baseline SHA-256 fingerprint generated: ${hashes.sha256}. Source: ${params.sourceDevice || 'Acquisition'}. Location: ${params.custodyLocation || 'Secure Vault Tier 1'}.`,
    timestamp: now,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  logAudit({
    actorId: params.uploaderSession.id,
    actorEmail: params.uploaderSession.email,
    action: 'EVIDENCE_UPLOADED',
    targetType: 'EVIDENCE',
    targetId: evidenceId,
    status: 'SUCCESS',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: {
      caseId: params.caseId,
      caseNumber: caseRecord.case_number,
      evidenceNumber,
      sha256: hashes.sha256,
      size: hashes.size,
      filename: params.originalFilename,
    },
  });

  return getEvidenceById(evidenceId);
}

export function getEvidenceById(evidenceId: string) {
  const row = db.prepare(`
    SELECT e.*, u.name as uploader_name, u.email as uploader_email, c.case_number, c.title as case_title
    FROM evidence e
    LEFT JOIN users u ON e.uploaded_by_id = u.id
    LEFT JOIN cases c ON e.case_id = c.id
    WHERE e.id = ?
  `).get(evidenceId) as any;

  return row || null;
}

export function getEvidenceByCase(caseId: string) {
  return db.prepare(`
    SELECT e.*, u.name as uploader_name, u.email as uploader_email
    FROM evidence e
    LEFT JOIN users u ON e.uploaded_by_id = u.id
    WHERE e.case_id = ?
    ORDER BY e.evidence_number ASC
  `).all(caseId);
}

export async function performEvidenceVerification(evidenceId: string, verifierSession: UserSession, ipAddress?: string, userAgent?: string) {
  const item = getEvidenceById(evidenceId);
  if (!item) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }

  const vaultPath = path.join(VAULT_DIR, item.stored_filename);
  const verifyResult = await verifyEvidenceIntegrity(vaultPath, item.sha256);

  const checkId = uuidv4();
  const now = new Date().toISOString();

  // Record integrity verification result
  db.prepare(`
    INSERT INTO integrity_checks (id, evidence_id, verified_by_id, expected_hash, calculated_hash, result, verified_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    checkId,
    evidenceId,
    verifierSession.id,
    verifyResult.expectedSha256,
    verifyResult.calculatedSha256,
    verifyResult.result,
    now,
    verifyResult.verified ? 'Cryptographic match confirmed with baseline fingerprint.' : 'CRITICAL INTEGRITY FAILURE: Bit-level corruption or unauthorized file modification detected!'
  );

  // Append Hash Verified event to Custody Chain
  appendCustodyEvent({
    evidenceId,
    action: 'HASH_VERIFIED',
    actorSession: verifierSession,
    details: `Cryptographic audit performed. Result: ${verifyResult.result}. Calculated SHA-256: ${verifyResult.calculatedSha256}. Match: ${verifyResult.verified}.`,
    timestamp: now,
    ipAddress,
    userAgent,
  });

  logAudit({
    actorId: verifierSession.id,
    actorEmail: verifierSession.email,
    action: 'EVIDENCE_HASH_VERIFIED',
    targetType: 'EVIDENCE',
    targetId: evidenceId,
    status: verifyResult.verified ? 'SUCCESS' : 'FAILURE',
    ipAddress,
    userAgent,
    details: {
      result: verifyResult.result,
      expected: verifyResult.expectedSha256,
      calculated: verifyResult.calculatedSha256,
    },
  });

  return {
    ...verifyResult,
    checkId,
    verifiedAt: now,
    evidence: item,
  };
}

export function getIntegrityChecksForEvidence(evidenceId: string) {
  return db.prepare(`
    SELECT ic.*, u.name as verifier_name, u.email as verifier_email
    FROM integrity_checks ic
    LEFT JOIN users u ON ic.verified_by_id = u.id
    WHERE ic.evidence_id = ?
    ORDER BY ic.verified_at DESC
  `).all(evidenceId);
}

/**
 * Educational DFIR testing tool: Corrupts 1 byte of the stored physical file on disk
 * to demonstrate how TraceLock's real cryptographic verification detects silent data tampering.
 */
export function corruptEvidenceFileForTesting(evidenceId: string): { success: boolean; message: string } {
  const item = getEvidenceById(evidenceId);
  if (!item) throw new Error('Evidence not found');

  const vaultPath = path.join(VAULT_DIR, item.stored_filename);
  if (!fs.existsSync(vaultPath)) throw new Error('Physical file missing from vault');

  const buffer = fs.readFileSync(vaultPath);
  if (buffer.length > 0) {
    // Flip bits of first byte
    buffer[0] = buffer[0] ^ 0xff;
    fs.writeFileSync(vaultPath, buffer);
  }

  logAudit({
    actorEmail: 'SECURITY_TEST_HARNESS',
    action: 'CORRUPT_FILE_SIMULATION',
    targetType: 'EVIDENCE',
    targetId: evidenceId,
    status: 'SUCCESS',
    details: { filename: item.original_filename },
  });

  return {
    success: true,
    message: `Physical vault file ${item.stored_filename} was corrupted by 1 byte. Run integrity verification to observe cryptographic failure detection.`,
  };
}

/**
 * Educational DFIR testing tool: Restores the file content from a clean payload
 */
export function restoreEvidenceFileContent(evidenceId: string, cleanBuffer: Buffer): { success: boolean; message: string } {
  const item = getEvidenceById(evidenceId);
  if (!item) throw new Error('Evidence not found');

  const vaultPath = path.join(VAULT_DIR, item.stored_filename);
  fs.writeFileSync(vaultPath, cleanBuffer);

  return { success: true, message: 'File content restored in vault.' };
}
