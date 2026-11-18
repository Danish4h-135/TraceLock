import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import {
  computeGenesisHash,
  computeEventHash,
  verifyCustodyChain,
  CustodyEventRecord,
  ChainVerificationReport,
} from '../crypto/chain.js';
import { logAudit } from './auditService.js';
import { UserSession } from './authService.js';

export function getCustodyEventsForEvidence(evidenceId: string): CustodyEventRecord[] {
  const stmt = db.prepare(`
    SELECT c.*, u.name as actor_name, u.email as actor_email
    FROM custody_events c
    LEFT JOIN users u ON c.actor_id = u.id
    WHERE c.evidence_id = ?
    ORDER BY c.sequence_number ASC
  `);
  return (stmt.all(evidenceId) as unknown) as CustodyEventRecord[];
}

export function appendCustodyEvent(params: {
  evidenceId: string;
  action:
    | 'EVIDENCE_COLLECTED'
    | 'EVIDENCE_SECURED'
    | 'CHECKED_OUT'
    | 'CHECKED_IN'
    | 'HASH_VERIFIED'
    | 'TRANSFERRED'
    | 'ANALYZED'
    | 'EXPORTED'
    | 'DISPOSED';
  actorSession: UserSession;
  details: string;
  timestamp?: string;
  ipAddress?: string;
  userAgent?: string;
}): CustodyEventRecord {
  const evidence = db.prepare('SELECT * FROM evidence WHERE id = ?').get(params.evidenceId) as any;
  if (!evidence) {
    throw new Error(`Evidence not found with ID ${params.evidenceId}`);
  }

  const existingEvents = getCustodyEventsForEvidence(params.evidenceId);
  const sequenceNumber = existingEvents.length + 1;
  const timestamp = params.timestamp || new Date().toISOString();

  let previousEventHash: string;
  if (sequenceNumber === 1) {
    // Block 1 links directly to Genesis Anchor
    previousEventHash = computeGenesisHash(evidence.id, evidence.sha256, evidence.created_at);
  } else {
    // Links to previous block's current hash
    const prevBlock = existingEvents[existingEvents.length - 1];
    previousEventHash = prevBlock.current_event_hash;
  }

  const currentEventHash = computeEventHash(
    previousEventHash,
    sequenceNumber,
    params.evidenceId,
    params.action,
    params.actorSession.id,
    timestamp,
    params.details
  );

  const eventId = uuidv4();

  db.prepare(`
    INSERT INTO custody_events (id, evidence_id, sequence_number, action, actor_id, timestamp, details, previous_event_hash, current_event_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    params.evidenceId,
    sequenceNumber,
    params.action,
    params.actorSession.id,
    timestamp,
    params.details,
    previousEventHash,
    currentEventHash
  );

  logAudit({
    actorId: params.actorSession.id,
    actorEmail: params.actorSession.email,
    action: 'CUSTODY_EVENT_RECORDED',
    targetType: 'EVIDENCE',
    targetId: params.evidenceId,
    status: 'SUCCESS',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    details: {
      sequenceNumber,
      custodyAction: params.action,
      blockHash: currentEventHash,
      prevHash: previousEventHash,
    },
  });

  return {
    id: eventId,
    evidence_id: params.evidenceId,
    sequence_number: sequenceNumber,
    action: params.action,
    actor_id: params.actorSession.id,
    timestamp,
    details: params.details,
    previous_event_hash: previousEventHash,
    current_event_hash: currentEventHash,
    actor_name: params.actorSession.name,
    actor_email: params.actorSession.email,
  };
}

export function verifyEvidenceCustodyChain(evidenceId: string): ChainVerificationReport {
  const evidence = db.prepare('SELECT id, sha256, created_at FROM evidence WHERE id = ?').get(evidenceId) as any;
  if (!evidence) {
    throw new Error(`Evidence item not found: ${evidenceId}`);
  }

  const events = getCustodyEventsForEvidence(evidenceId);
  return verifyCustodyChain(events, evidence);
}

/**
 * Simulates tampering with a historical custody event in the database.
 * Used for educational DFIR demonstration to show that any out-of-band DB tampering
 * is mathematically detected by TraceLock's chained hash verification.
 */
export function simulateTamper(evidenceId: string, sequenceNumber: number, tamperedText: string): {
  success: boolean;
  message: string;
} {
  const existing = db.prepare('SELECT * FROM custody_events WHERE evidence_id = ? AND sequence_number = ?').get(evidenceId, sequenceNumber) as any;
  if (!existing) {
    throw new Error(`Block #${sequenceNumber} not found for evidence ${evidenceId}`);
  }

  // Update only the details field WITHOUT updating the cryptographic hashes
  db.prepare(`
    UPDATE custody_events 
    SET details = ? 
    WHERE evidence_id = ? AND sequence_number = ?
  `).run(tamperedText, evidenceId, sequenceNumber);

  logAudit({
    actorEmail: 'SECURITY_TEST_HARNESS',
    action: 'SIMULATE_TAMPER_INJECTED',
    targetType: 'CUSTODY_EVENT',
    targetId: existing.id,
    status: 'SUCCESS',
    details: { evidenceId, sequenceNumber, originalDetails: existing.details, tamperedText },
  });

  return {
    success: true,
    message: `Tampering simulated on Block #${sequenceNumber}. The details were altered in DB without hash regeneration. Run chain verification to witness detection.`,
  };
}

/**
 * Restores original integrity of the chain by recalculating all sequential hashes.
 */
export function restoreChainIntegrity(evidenceId: string): { success: boolean; message: string } {
  const evidence = db.prepare('SELECT * FROM evidence WHERE id = ?').get(evidenceId) as any;
  if (!evidence) {
    throw new Error(`Evidence not found: ${evidenceId}`);
  }

  const events = getCustodyEventsForEvidence(evidenceId);
  if (events.length === 0) return { success: true, message: 'No events to restore' };

  let prevHash = computeGenesisHash(evidence.id, evidence.sha256, evidence.created_at);

  for (let i = 0; i < events.length; i++) {
    const block = events[i];
    const seq = i + 1;
    const recomputedHash = computeEventHash(
      prevHash,
      seq,
      evidence.id,
      block.action,
      block.actor_id,
      block.timestamp,
      block.details
    );

    db.prepare(`
      UPDATE custody_events 
      SET sequence_number = ?, previous_event_hash = ?, current_event_hash = ?
      WHERE id = ?
    `).run(seq, prevHash, recomputedHash, block.id);

    prevHash = recomputedHash;
  }

  logAudit({
    actorEmail: 'SECURITY_TEST_HARNESS',
    action: 'CUSTODY_CHAIN_RESTORED',
    targetType: 'EVIDENCE',
    targetId: evidenceId,
    status: 'SUCCESS',
    details: { totalBlocksRestored: events.length },
  });

  return { success: true, message: `Custody chain hashes recalculated and restored across ${events.length} blocks.` };
}
