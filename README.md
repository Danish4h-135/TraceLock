# TraceLock

```
████████╗██████╗  █████╗  ██████╗███████╗██╗      ██████╗  ██████╗██╗  ██╗
╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝██║     ██╔═══██╗██╔════╝██║ ██╔╝
   ██║   ██████╔╝███████║██║     █████╗  ██║     ██║   ██║██║     █████╔╝ 
   ██║   ██╔══██╗██╔══██║██║     ██╔══╝  ██║     ██║   ██║██║     ██╔═██╗ 
   ██║   ██║  ██║██║  ██║╚██████╗███████╗███████╗╚██████╔╝╚██████╗██║  ██╗
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
```

> **Secure Evidence. Trusted Investigations.**  
> *Enterprise-Grade Digital Forensics & Incident Response (DFIR) Evidence Management Platform*

---

## 1. Executive Summary & Core Mission

During cyber incident response and digital forensics investigations, digital artifacts—such as disk images, PCAP network captures, phishing emails, malware samples, and system access logs—face serious evidentiary challenges:

- **Provenance Failure**: Who acquired the artifact, when, from which machine, and using what tool?
- **Chain of Custody Breaks**: Who possessed the evidence during analysis, where was it transferred, and can that history be verified?
- **Silent Tampering**: Has an artifact been altered (accidentally or maliciously) since initial ingestion?
- **Audit Deficiencies**: Can investigators prove non-repudiation and withstand judicial cross-examination?

**TraceLock** solves these problems through **real mathematical cryptographic proof**:

1. **Streaming SHA-256 Ingestion**: Generates verifiable cryptographic fingerprints upon artifact acquisition.
2. **Tamper-Evident Chained Custody**: An append-only cryptographic ledger where each custody event signs the hash of the preceding event (`Hash_N = SHA-256(Hash_{N-1} | Sequence | Action | Actor | Time | Details)`).
3. **Live Re-Hash Auditing**: Performs on-demand bit-level re-verification against stored baseline hashes.
4. **Untrusted Input Isolation**: Restricts raw forensic evidence to a private vault outside web root with path traversal protection, MIME validation, and non-executable execution protection.
5. **Court-Ready Forensics Reporting**: Generates official DFIR case dossiers with cryptographic certification seals.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  TraceLock UI                                     |
|  React 18 + Vite + Tailwind CSS + Lucide Icons + DFIR Obsidian SOC Theme          |
|  - Real-time Chain of Custody Visualizer & Tamper Detector                        |
|  - Cryptographic Verification Matrix (Live SHA-256 comparison)                    |
|  - Investigation Timeline, Findings Manager, Case Workspace, Audit Console        |
+-----------------------------------------------------------------------------------+
                                         |
                                         | REST API (JSON) + Authenticated Streams
                                         v
+-----------------------------------------------------------------------------------+
|                             TraceLock Core API Server                             |
|  Node.js v22 + Express + TypeScript + Native Node:Crypto                          |
|  - Security Layer: Helmet, Strict CORS, Rate Limiting, Input Sanitization         |
|  - Auth & RBAC Guard: JWT + Bcrypt password hashing, Role enforcement            |
|  - Cryptographic Engine: Streaming SHA-256, Hash-Chained Custody Ledger           |
|  - File Custody Vault: Safe sandbox storage, MIME & Path Traversal Guards         |
+-----------------------------------------------------------------------------------+
                  |                                                  |
                  v                                                  v
+------------------------------------+             +--------------------------------+
|         Relational Storage         |             |       Forensic Vault           |
|  SQLite (WAL mode, foreign keys)   |             |  Isolated Private Directory    |
|  Cases, Evidence, Custody, Audit,  |             |  - No execution permissions    |
|  Timeline, Findings, Users         |             |  - UUID filename addressing    |
+------------------------------------+             +--------------------------------+
```

### Technology Stack & Engineering Decisions

| Component | Selected Technology | Technical Rationale |
|-----------|---------------------|---------------------|
| **Backend Runtime** | Node.js v22 (LTS) | Native OpenSSL FIPS-compliant cryptographic acceleration (`node:crypto`) |
| **Language** | TypeScript | Strong typing across forensic data models, API payloads, and cryptographic interfaces |
| **Database** | SQLite (`node:sqlite` DatabaseSync) | Zero external daemon dependency, ACID compliant, WAL journaling, perfectly portable |
| **File Storage** | Local Isolated Vault (`storage/vault`) | UUID physical addressing, stripped extensions, non-executable, authenticated streams only |
| **Frontend** | React 18 + Vite + Tailwind CSS | Sub-millisecond rendering for high-density forensic tables, timelines, and hash graphs |
| **Authentication** | JWT + Bcrypt (12 rounds) | Stateless, tamper-resistant bearer tokens with server-side RBAC validation |

---

## 3. Cryptographic Implementation Details

### 3.1 Streaming Evidence Hashing (FIPS 180-4)
When digital evidence is uploaded, it is piped directly from the multipart stream into cryptographic hash accumulators without in-memory duplication:

$$\text{Digest} = \text{SHA-256}(\text{stream chunks})$$

TraceLock also records legacy MD5 and SHA-1 hashes for cross-referencing with external DFIR databases (e.g., VirusTotal, NSRL).

### 3.2 Tamper-Evident Chain-of-Custody Mathematics
Each custody transaction for an evidence item forms a cryptographically linked block:

1. **Genesis Anchor (Block 0)**:
   $$\text{Hash}_0 = \text{SHA-256}(\text{"TRACELOCK\_GENESIS"} \parallel \text{EvidenceID} \parallel \text{BaselineSHA256} \parallel \text{CreatedAt})$$

2. **Sequential Custody Block (Block $N$)**:
   $$\text{Hash}_N = \text{SHA-256}(\text{Hash}_{N-1} \parallel N \parallel \text{EvidenceID} \parallel \text{Action} \parallel \text{ActorID} \parallel \text{Timestamp} \parallel \text{Details})$$

3. **Chain Verification Algorithm**:
   To audit a chain of $K$ events:
   - Verify Block 1 previous hash matches Genesis Anchor $\text{Hash}_0$.
   - For each block $i \in [1, K]$, verify $\text{Block}_i.\text{prev} == \text{Block}_{i-1}.\text{current}$.
   - Recompute expected hash $\text{SHA-256}(\dots)$ and compare with $\text{Block}_i.\text{current}$.
   - If any byte was altered in the database, the check immediately flags `CHAIN_INTEGRITY_COMPROMISED` and reports the exact broken block sequence!

---

## 4. Realistic Demonstration Investigation

TraceLock includes pre-seeded realistic forensic data demonstrating an enterprise cyber investigation:

### Case `TL-2026-0842`: Operation SpearPhish
- **Incident Type**: Phishing / Credential Harvesting
- **Priority**: Critical | **Status**: In Progress
- **Scenario**: At 08:42 UTC, SOC SIEM triggered an alert regarding multiple inbound emails spoofing Okta Identity Management. The VP of Finance clicked the embedded link directing to a rogue credential harvester hosted at `login-okta-securesync.com` (IP: `198.51.100.44`). The DFIR team isolated the endpoint and acquired 4 forensic artifacts into TraceLock's vault.

#### Authentic Forensic Artifacts in Vault:
1. `urgent_mfa_update_notification.eml` — Raw RFC 822 email message with spoofed headers.
2. `credential_harvesting_portal_clone.html` — Live DOM dump of phishing landing page with exfiltration scripts.
3. `auth_gateway_access_traffic.log` — Web server access logs capturing adversary HTTP POST requests.
4. `perimeter_firewall_pcap_sample.pcap` — Real valid PCAP packet capture with binary ethernet/IP headers.

---

## 5. Pre-configured Access Roles & Test Accounts

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **ADMIN** | `admin@tracelock.sec` | `TraceLockAdmin2026!` | Full access, user creation, tamper simulation lab, system audit logs |
| **INVESTIGATOR** | `investigator@tracelock.sec` | `Investigator2026!` | Case management, evidence upload, live hash verification, custody logging |
| **VIEWER** | `viewer@tracelock.sec` | `Viewer2026!` | Read-only access to authorized cases and verified evidence metadata |

*Note: The UI includes a 1-click "Switch Demo Role" dropdown in the top navigation bar for immediate testing.*

---

## 6. Quick Start & Installation

### Prerequisites
- Node.js v22+
- npm v10+

### Step 1: Install Dependencies
```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### Step 2: Build the Application
```bash
# Build Client Frontend
cd client
npm run build

# Build Server
cd ../server
npm run build
```

### Step 3: Run the Server
```bash
cd server
npm start
```
The server will start at **http://localhost:5000**, automatically serving both the REST API and the compiled React production frontend.

---

## 7. Automated Test Suite

TraceLock contains automated tests verifying cryptographic accuracy, tamper detection, and end-to-end API operations.

### Unit & Cryptographic Verification Tests
```bash
cd server
npm test
```
**Tests Executed:**
- Reference vector SHA-256 and MD5 validation against OpenSSL standards.
- Tamper-evident custody chain mathematical verification.
- Deliberate database payload mutation detection (identifying exact broken block).
- Physical vault file existence and live stream re-hashing.
- Authentic seed evidence chain integrity verification (all 16 blocks).
- Authentication and RBAC token generation.

### End-to-End (E2E) HTTP Integration Tests
```bash
cd server
npm run test:e2e
```
**Endpoints Tested:**
- `GET /api/health` — API status check
- `POST /api/auth/login` — Authentication & JWT generation
- `GET /api/dashboard` — Metric aggregation
- `GET /api/cases` — Investigation directory
- `GET /api/cases/:id/evidence` — Evidence inventory
- `POST /api/evidence/:id/verify` — Live cryptographic file verification
- `GET /api/evidence/:id/custody/verify-chain` — Mathematical custody chain verification
- `GET /api/cases/:id/report/html` — Court-ready report rendering
- `GET /` — Production frontend bundle delivery

---

## 8. Security Hardening Controls

- **Untrusted File Isolation**: Files are renamed to UUIDs and stored outside public directories without executable flags (`chmod 0600` equivalent).
- **Hardened Download Delivery**: Served with headers:
  ```http
  Content-Disposition: attachment; filename="sanitized.ext"
  Content-Type: application/octet-stream
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'none'
  ```
- **Immutable Audit Logging**: Audit log tables do not support `UPDATE` or `DELETE` queries.
- **Server-Side Authorization**: Roles are strictly evaluated in Express middleware prior to hitting service layers.
- **Strict Visual Aesthetic**: Adheres to restrained SOC/DFIR aesthetic (dark charcoal, obsidian slate, steel blue accents, zero purple gradients, zero AI-generated fluff).

---

## 9. License

This project is licensed under the ISC License. Built for cybersecurity professionals, DFIR teams, and academic research.
