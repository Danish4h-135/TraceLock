import assert from 'node:assert';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

import { initDatabase, db } from '../src/db/index.js';
import { runSeed } from '../src/db/seed.js';
import { calculateBufferHashes, verifyEvidenceIntegrity } from '../src/crypto/hasher.js';
import {
  computeGenesisHash,
  computeEventHash,
  verifyCustodyChain,
  CustodyEventRecord,
} from '../src/crypto/chain.js';
import { authenticateUser } from '../src/services/authService.js';
import { getEvidenceByCase } from '../src/services/evidenceService.js';
import { getCustodyEventsForEvidence, verifyEvidenceCustodyChain } from '../src/services/custodyService.js';

async function runTests() {
  console.log('------------------------------------------------------------');
  console.log('   TRACELOCK AUTOMATED DFIR & SECURITY VERIFICATION SUITE   ');
  console.log('------------------------------------------------------------\n');

  // TEST 1: Real Cryptographic Hashing against Known Reference Vector
  console.log('[TEST 1] Testing cryptographic SHA-256 and MD5 streaming engine...');
  const testString = 'TraceLock: Secure Evidence. Trusted Investigations. 2026';
  const expectedSha256 = crypto.createHash('sha256').update(testString).digest('hex').toLowerCase();
  const expectedMd5 = crypto.createHash('md5').update(testString).digest('hex').toLowerCase();

  const calculated = calculateBufferHashes(Buffer.from(testString, 'utf-8'));
  assert.strictEqual(calculated.sha256, expectedSha256, 'SHA-256 hash must match reference implementation');
  assert.strictEqual(calculated.md5, expectedMd5, 'MD5 hash must match reference implementation');
  console.log('  -> PASS: SHA-256 and MD5 match OpenSSL reference vectors bit-for-bit.');
  console.log(`     Vector SHA-256: ${calculated.sha256}\n`);

  // TEST 2: Tamper-Evident Chained Hash Verification & Tamper Detection
  console.log('[TEST 2] Testing tamper-evident custody chain mathematical verification...');
  const mockEvidenceId = 'evd-test-uuid-001';
  const mockSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const mockCreated = '2026-11-18T10:00:00.000Z';

  const genesisHash = computeGenesisHash(mockEvidenceId, mockSha256, mockCreated);
  const block1Hash = computeEventHash(genesisHash, 1, mockEvidenceId, 'EVIDENCE_SECURED', 'user-1', '2026-11-18T10:05:00.000Z', 'Vault Ingestion');
  const block2Hash = computeEventHash(block1Hash, 2, mockEvidenceId, 'HASH_VERIFIED', 'user-1', '2026-11-18T10:15:00.000Z', 'Baseline audit pass');
  const block3Hash = computeEventHash(block2Hash, 3, mockEvidenceId, 'CHECKED_OUT', 'user-2', '2026-11-18T11:00:00.000Z', 'Transfer to Lab 4');

  const testChain: CustodyEventRecord[] = [
    {
      id: 'blk-1',
      evidence_id: mockEvidenceId,
      sequence_number: 1,
      action: 'EVIDENCE_SECURED',
      actor_id: 'user-1',
      timestamp: '2026-11-18T10:05:00.000Z',
      details: 'Vault Ingestion',
      previous_event_hash: genesisHash,
      current_event_hash: block1Hash,
    },
    {
      id: 'blk-2',
      evidence_id: mockEvidenceId,
      sequence_number: 2,
      action: 'HASH_VERIFIED',
      actor_id: 'user-1',
      timestamp: '2026-11-18T10:15:00.000Z',
      details: 'Baseline audit pass',
      previous_event_hash: block1Hash,
      current_event_hash: block2Hash,
    },
    {
      id: 'blk-3',
      evidence_id: mockEvidenceId,
      sequence_number: 3,
      action: 'CHECKED_OUT',
      actor_id: 'user-2',
      timestamp: '2026-11-18T11:00:00.000Z',
      details: 'Transfer to Lab 4',
      previous_event_hash: block2Hash,
      current_event_hash: block3Hash,
    },
  ];

  const cleanReport = verifyCustodyChain(testChain, { id: mockEvidenceId, sha256: mockSha256, created_at: mockCreated });
  assert.strictEqual(cleanReport.status, 'CHAIN_INTEGRITY_VERIFIED');
  assert.strictEqual(cleanReport.totalBlocks, 3);
  console.log('  -> PASS: Clean chain validated. Status = CHAIN_INTEGRITY_VERIFIED.');

  // Now simulate out-of-band tampering on Block 2 details
  const tamperedChain = JSON.parse(JSON.stringify(testChain));
  tamperedChain[1].details = 'Tampered log: Evidence deleted'; // Malicious alteration without recalculating hash
  const tamperedReport = verifyCustodyChain(tamperedChain, { id: mockEvidenceId, sha256: mockSha256, created_at: mockCreated });
  assert.strictEqual(tamperedReport.status, 'CHAIN_INTEGRITY_COMPROMISED');
  assert.strictEqual(tamperedReport.brokenBlockIndex, 2);
  console.log('  -> PASS: Tampering detected instantly! Broken block correctly identified: Block #2.');
  console.log(`     Violation reason: ${tamperedReport.violationReason}\n`);

  // TEST 3: Database Initialization & Forensic Seed Data
  console.log('[TEST 3] Testing database initialization and forensic demo seed...');
  initDatabase();
  runSeed();

  const caseRow = db.prepare('SELECT * FROM cases WHERE case_number = ?').get('TL-2026-0842') as any;
  assert.ok(caseRow, 'Sample phishing case TL-2026-0842 must exist');
  console.log(`  -> PASS: Found Seed Case: [${caseRow.case_number}] ${caseRow.title}`);

  const evidenceItems = getEvidenceByCase(caseRow.id) as any[];
  assert.strictEqual(evidenceItems.length, 4, 'Case must contain 4 authentic forensic evidence artifacts');
  console.log(`  -> PASS: 4 evidence artifacts verified in case inventory:`);
  for (const item of evidenceItems) {
    console.log(`     * ${item.evidence_number}: ${item.original_filename} (${item.file_size} bytes) | SHA-256: ${item.sha256}`);
  }

  // TEST 4: Live Physical File Vault Integrity
  console.log('\n[TEST 4] Verifying physical vault file existence and live cryptographic integrity...');
  const vaultDir = path.resolve(process.cwd(), '..', 'storage', 'vault');
  for (const item of evidenceItems) {
    const filePath = path.join(vaultDir, item.stored_filename);
    assert.ok(fs.existsSync(filePath), `Physical file ${item.stored_filename} must exist in vault`);

    const integrityResult = await verifyEvidenceIntegrity(filePath, item.sha256);
    assert.strictEqual(integrityResult.verified, true);
    assert.strictEqual(integrityResult.result, 'INTEGRITY_VERIFIED');
    console.log(`  -> PASS: Physical file ${item.original_filename} matches stored SHA-256 bit-for-bit.`);
  }

  // TEST 5: Real Chained Custody Verification for Seed Evidence
  console.log('\n[TEST 5] Mathematically verifying chained custody records across all seed evidence...');
  for (const item of evidenceItems) {
    const custodyReport = verifyEvidenceCustodyChain(item.id);
    assert.strictEqual(custodyReport.status, 'CHAIN_INTEGRITY_VERIFIED');
    assert.ok(custodyReport.totalBlocks >= 4);
    console.log(`  -> PASS: [${item.evidence_number}] Custody Chain (${custodyReport.totalBlocks} blocks) Verified Intact. Head: ${custodyReport.headHash.slice(0, 16)}...`);
  }

  // TEST 6: Authentication & Role-Based Access Control
  console.log('\n[TEST 6] Testing Authentication & RBAC token generation...');
  const adminAuth = authenticateUser('admin@tracelock.sec', 'TraceLockAdmin2026!');
  assert.ok(adminAuth, 'Admin authentication must succeed');
  assert.strictEqual(adminAuth.user.role, 'ADMIN');

  const investigatorAuth = authenticateUser('investigator@tracelock.sec', 'Investigator2026!');
  assert.ok(investigatorAuth, 'Investigator authentication must succeed');
  assert.strictEqual(investigatorAuth.user.role, 'INVESTIGATOR');

  const viewerAuth = authenticateUser('viewer@tracelock.sec', 'Viewer2026!');
  assert.ok(viewerAuth, 'Viewer authentication must succeed');
  assert.strictEqual(viewerAuth.user.role, 'VIEWER');

  const invalidAuth = authenticateUser('admin@tracelock.sec', 'WrongPassword123!');
  assert.strictEqual(invalidAuth, null, 'Invalid password must be rejected');
  console.log('  -> PASS: Authentication & RBAC roles (ADMIN, INVESTIGATOR, VIEWER) validated.');

  console.log('\n------------------------------------------------------------');
  console.log('   ALL 6 DFIR CORE VERIFICATION TESTS PASSED SUCCESSFULLY!  ');
  console.log('------------------------------------------------------------');
}

runTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});
