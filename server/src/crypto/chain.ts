import crypto from 'node:crypto';

export interface CustodyEventRecord {
  id: string;
  evidence_id: string;
  sequence_number: number;
  action: string;
  actor_id: string;
  timestamp: string;
  details: string;
  previous_event_hash: string;
  current_event_hash: string;
  actor_name?: string;
  actor_email?: string;
}

export interface ChainVerificationReport {
  status: 'CHAIN_INTEGRITY_VERIFIED' | 'CHAIN_INTEGRITY_COMPROMISED';
  evidenceId: string;
  totalBlocks: number;
  genesisHash: string;
  headHash: string;
  verifiedAt: string;
  brokenBlockIndex?: number;
  expectedHash?: string;
  recordedHash?: string;
  violationReason?: string;
}

/**
 * Calculates the Genesis Anchor hash for an evidence item.
 * Anchors the chain to the original file's SHA-256 hash and creation timestamp.
 */
export function computeGenesisHash(evidenceId: string, evidenceSha256: string, createdAt: string): string {
  const payload = `TRACELOCK_GENESIS|${evidenceId}|${evidenceSha256.toLowerCase()}|${createdAt}`;
  return crypto.createHash('sha256').update(payload).digest('hex').toLowerCase();
}

/**
 * Computes the cryptographic hash for a custody event block.
 * Block_N = SHA-256(PrevHash | Sequence | EvidenceId | Action | ActorId | Timestamp | Details)
 */
export function computeEventHash(
  previousEventHash: string,
  sequenceNumber: number,
  evidenceId: string,
  action: string,
  actorId: string,
  timestamp: string,
  details: string
): string {
  // Normalize whitespace and ensure deterministic serialization
  const payload = [
    previousEventHash.toLowerCase().trim(),
    sequenceNumber.toString(),
    evidenceId.trim(),
    action.trim(),
    actorId.trim(),
    timestamp.trim(),
    details.trim(),
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex').toLowerCase();
}

/**
 * Mathematically verifies the complete chain of custody from Genesis to current Head.
 * Detects any modified event text, timestamp tampering, inserted blocks, or swapped records.
 */
export function verifyCustodyChain(
  events: CustodyEventRecord[],
  evidence: { id: string; sha256: string; created_at: string }
): ChainVerificationReport {
  const verifiedAt = new Date().toISOString();

  if (!events || events.length === 0) {
    return {
      status: 'CHAIN_INTEGRITY_COMPROMISED',
      evidenceId: evidence.id,
      totalBlocks: 0,
      genesisHash: '',
      headHash: '',
      verifiedAt,
      violationReason: 'No custody events exist for this evidence item. Missing genesis anchor.',
    };
  }

  // Sort strictly by sequence number ascending
  const sorted = [...events].sort((a, b) => a.sequence_number - b.sequence_number);

  // 1. Verify Genesis Anchor on Block 1
  const expectedGenesis = computeGenesisHash(evidence.id, evidence.sha256, evidence.created_at);
  const firstBlock = sorted[0];

  if (firstBlock.sequence_number !== 1) {
    return {
      status: 'CHAIN_INTEGRITY_COMPROMISED',
      evidenceId: evidence.id,
      totalBlocks: sorted.length,
      genesisHash: expectedGenesis,
      headHash: sorted[sorted.length - 1].current_event_hash,
      verifiedAt,
      brokenBlockIndex: 1,
      violationReason: `First block sequence is ${firstBlock.sequence_number}, expected 1.`,
    };
  }

  if (firstBlock.previous_event_hash.toLowerCase() !== expectedGenesis) {
    return {
      status: 'CHAIN_INTEGRITY_COMPROMISED',
      evidenceId: evidence.id,
      totalBlocks: sorted.length,
      genesisHash: expectedGenesis,
      headHash: sorted[sorted.length - 1].current_event_hash,
      verifiedAt,
      brokenBlockIndex: 1,
      expectedHash: expectedGenesis,
      recordedHash: firstBlock.previous_event_hash,
      violationReason: 'Genesis anchor mismatch. The custody chain does not originate from the recorded evidence baseline.',
    };
  }

  // 2. Iterate through each block and re-calculate the cryptographic hash
  let expectedPrevHash = expectedGenesis;

  for (let i = 0; i < sorted.length; i++) {
    const block = sorted[i];
    const expectedSeq = i + 1;

    // Check sequence continuity
    if (block.sequence_number !== expectedSeq) {
      return {
        status: 'CHAIN_INTEGRITY_COMPROMISED',
        evidenceId: evidence.id,
        totalBlocks: sorted.length,
        genesisHash: expectedGenesis,
        headHash: sorted[sorted.length - 1].current_event_hash,
        verifiedAt,
        brokenBlockIndex: expectedSeq,
        violationReason: `Sequence break detected at index ${i + 1}. Found sequence ${block.sequence_number}, expected ${expectedSeq}.`,
      };
    }

    // Check link to previous block
    if (block.previous_event_hash.toLowerCase() !== expectedPrevHash) {
      return {
        status: 'CHAIN_INTEGRITY_COMPROMISED',
        evidenceId: evidence.id,
        totalBlocks: sorted.length,
        genesisHash: expectedGenesis,
        headHash: sorted[sorted.length - 1].current_event_hash,
        verifiedAt,
        brokenBlockIndex: block.sequence_number,
        expectedHash: expectedPrevHash,
        recordedHash: block.previous_event_hash,
        violationReason: `Previous block hash mismatch on Block #${block.sequence_number}. Chain is broken.`,
      };
    }

    // Recompute the block's current hash
    const recomputedHash = computeEventHash(
      block.previous_event_hash,
      block.sequence_number,
      block.evidence_id,
      block.action,
      block.actor_id,
      block.timestamp,
      block.details
    );

    if (block.current_event_hash.toLowerCase() !== recomputedHash) {
      return {
        status: 'CHAIN_INTEGRITY_COMPROMISED',
        evidenceId: evidence.id,
        totalBlocks: sorted.length,
        genesisHash: expectedGenesis,
        headHash: sorted[sorted.length - 1].current_event_hash,
        verifiedAt,
        brokenBlockIndex: block.sequence_number,
        expectedHash: recomputedHash,
        recordedHash: block.current_event_hash,
        violationReason: `Data tampering detected on Block #${block.sequence_number}. The block payload hash does not match stored hash.`,
      };
    }

    // Advance link
    expectedPrevHash = block.current_event_hash.toLowerCase();
  }

  // All blocks verified perfectly
  return {
    status: 'CHAIN_INTEGRITY_VERIFIED',
    evidenceId: evidence.id,
    totalBlocks: sorted.length,
    genesisHash: expectedGenesis,
    headHash: sorted[sorted.length - 1].current_event_hash,
    verifiedAt,
  };
}
