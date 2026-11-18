import assert from 'node:assert';
import http from 'node:http';
import app from '../src/server.js';

async function runE2ETest() {
  console.log('------------------------------------------------------------');
  console.log('   TRACELOCK END-TO-END HTTP API & SERVING VERIFICATION    ');
  console.log('------------------------------------------------------------\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099';

  try {
    // 1. Health Endpoint
    console.log('[E2E 1] Checking GET /api/health...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'OPERATIONAL');
    console.log('  -> PASS: Health check OK, Status = OPERATIONAL\n');

    // 2. Authentication
    console.log('[E2E 2] Testing POST /api/auth/login...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'investigator@tracelock.sec',
        password: 'Investigator2026!',
      }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Token must be returned');
    assert.strictEqual(loginData.user.role, 'INVESTIGATOR');
    const token = loginData.token;
    console.log(`  -> PASS: Login successful. JWT token issued for ${loginData.user.name} (${loginData.user.role})\n`);

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 3. Dashboard Metrics
    console.log('[E2E 3] Testing GET /api/dashboard...');
    const dashRes = await fetch(`${baseUrl}/api/dashboard`, { headers: authHeaders });
    assert.strictEqual(dashRes.status, 200);
    const dashData = await dashRes.json();
    assert.ok(dashData.metrics.activeCases >= 1);
    assert.ok(dashData.metrics.totalEvidence >= 4);
    console.log(`  -> PASS: Dashboard metrics loaded. Active cases: ${dashData.metrics.activeCases}, Evidence count: ${dashData.metrics.totalEvidence}\n`);

    // 4. Investigations List
    console.log('[E2E 4] Testing GET /api/cases...');
    const casesRes = await fetch(`${baseUrl}/api/cases`, { headers: authHeaders });
    assert.strictEqual(casesRes.status, 200);
    const casesData = await casesRes.json();
    assert.ok(casesData.cases.length >= 1);
    const targetCase = casesData.cases.find((c: any) => c.case_number === 'TL-2026-0842') || casesData.cases[0];
    console.log(`  -> PASS: Case directory verified. Case: [${targetCase.case_number}] ${targetCase.title}\n`);

    // 5. Evidence Inventory
    console.log(`[E2E 5] Testing GET /api/cases/${targetCase.id}/evidence...`);
    const evRes = await fetch(`${baseUrl}/api/cases/${targetCase.id}/evidence`, { headers: authHeaders });
    assert.strictEqual(evRes.status, 200);
    const evData = await evRes.json();
    assert.ok(evData.evidence.length >= 4);
    const firstEvidence = evData.evidence[0];
    console.log(`  -> PASS: Evidence items loaded (${evData.evidence.length} artifacts). Sample: ${firstEvidence.evidence_number} (${firstEvidence.original_filename})\n`);

    // 6. Live Re-hash Cryptographic Integrity Verification
    console.log(`[E2E 6] Testing POST /api/evidence/${firstEvidence.id}/verify...`);
    const verifyRes = await fetch(`${baseUrl}/api/evidence/${firstEvidence.id}/verify`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.strictEqual(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.verified, true);
    assert.strictEqual(verifyData.result, 'INTEGRITY_VERIFIED');
    assert.strictEqual(verifyData.calculatedSha256, verifyData.expectedSha256);
    console.log(`  -> PASS: Live SHA-256 verification confirmed: ${verifyData.result}`);
    console.log(`     Baseline SHA-256: ${verifyData.expectedSha256}\n`);

    // 7. Tamper-Evident Custody Chain Verification
    console.log(`[E2E 7] Testing GET /api/evidence/${firstEvidence.id}/custody/verify-chain...`);
    const chainRes = await fetch(`${baseUrl}/api/evidence/${firstEvidence.id}/custody/verify-chain`, {
      headers: authHeaders,
    });
    assert.strictEqual(chainRes.status, 200);
    const chainData = await chainRes.json();
    assert.strictEqual(chainData.report.status, 'CHAIN_INTEGRITY_VERIFIED');
    assert.ok(chainData.report.totalBlocks >= 4);
    console.log(`  -> PASS: Custody chain verified. Total blocks: ${chainData.report.totalBlocks}, Head: ${chainData.report.headHash.slice(0, 16)}...\n`);

    // 8. Forensic HTML Report Generation
    console.log(`[E2E 8] Testing GET /api/cases/${targetCase.id}/report/html...`);
    const reportRes = await fetch(`${baseUrl}/api/cases/${targetCase.id}/report/html`, {
      headers: authHeaders,
    });
    assert.strictEqual(reportRes.status, 200);
    const htmlReport = await reportRes.text();
    assert.ok(htmlReport.includes('TRACELOCK INVESTIGATION REPORT'));
    assert.ok(htmlReport.includes(targetCase.case_number));
    assert.ok(htmlReport.includes('CRYPTOGRAPHIC CHAIN INTEGRITY AUDIT'));
    console.log('  -> PASS: Formal Investigation Report successfully generated and rendered.\n');

    // 9. Static Frontend Bundle Serving
    console.log('[E2E 9] Testing GET / (Production React Frontend Serving)...');
    const frontendRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(frontendRes.status, 200);
    const frontendHtml = await frontendRes.text();
    assert.ok(frontendHtml.includes('TraceLock'));
    assert.ok(frontendHtml.includes('<div id="root"></div>'));
    console.log('  -> PASS: Production frontend HTML bundle served cleanly.\n');

    console.log('------------------------------------------------------------');
    console.log('   ALL 9 END-TO-END HTTP API & SERVING TESTS PASSED!        ');
    console.log('------------------------------------------------------------');
    server.close();
    process.exit(0);
  } finally {
    server.close();
  }
}

runE2ETest().catch((err) => {
  console.error('\n[FATAL E2E FAILURE]', err);
  process.exit(1);
});
