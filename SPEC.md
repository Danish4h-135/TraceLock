# TraceLock — System Specification & Architecture Design
**Product Name:** TraceLock  
**Tagline:** Secure Evidence. Trusted Investigations.  
**Version:** 1.0.0-PROD  
**Domain:** Digital Forensics and Incident Response (DFIR) & Evidence Management  

---

## 1. Executive Summary & Core Mission
TraceLock is a cybersecurity investigation and digital evidence management platform providing cryptographic integrity verification, tamper-evident chain-of-custody tracking, and investigation auditability. Built for incident response teams, SOC analysts, and academic cybersecurity environments.

Modern cyber investigations suffer from broken chains of custody, untracked evidence modifications, untrusted file mishandling, and siloed investigative notes. TraceLock solves these problems by providing:
1. **Mathematical Evidence Integrity**: Real-time SHA-256 cryptographic hashing upon ingestion and on-demand live re-verification against immutable original baselines.
2. **Cryptographic Tamper-Evident Chain of Custody**: A sequential hash-chained ledger where every custody event cryptographically signs the hash of the preceding event, ensuring retroactive modifications or database tampering are mathematically detectable.
3. **Immutable System Audit Trail**: Granular, append-only security logs of every user interaction, permission check, evidence access, and case modification.
4. **Secure Untrusted Artifact Isolation**: High-security evidence vault isolating uploaded artifacts outside the web root, preventing execution, directory traversal, and unauthenticated exfiltration.
5. **Collaborative DFIR Workspace**: Case management, dynamic attack timeline reconstruction, structured technical findings with severity tags, investigator scratchpads, and role-based access control (Admin, Investigator, Viewer).
6. **Forensic Dossier & Report Engine**: One-click generation of structured investigation reports with cryptographic verification seals.

*Disclaimer: This platform provides technical verification of cryptographic hashes and custody events for investigation management. It does not constitute a legal determination of admissibility.*

---

## 2. System Architecture & Tech Stack

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
|  - Auth & RBAC Guard: JWT + Argon2/Bcrypt password hashing, Role enforcement     |
|  - Cryptographic Engine: Streaming SHA-256, Hash-Chained Custody Ledger           |
|  - File Custody Vault: Safe sandbox storage, MIME & Path Traversal Guards         |
+-----------------------------------------------------------------------------------+
                  |                                                  |
                  v                                                  v
+------------------------------------+             +--------------------------------+
|         Relational Storage         |             |       Forensic Vault           |
|  SQLite (WAL mode, foreign keys)   |             |  Isolated Private Directory    |
|  Prisma / SQL schema with indexes  |             |  - No execution permissions    |
|  Cases, Evidence, Custody, Audit,  |             |  - UUID filename addressing    |
|  Timeline, Findings, Users         |             |  - Preserved raw original copy |
+------------------------------------+             +--------------------------------+
```

### Technology Decisions & Rationale:
1. **Backend**: Node.js v22 with TypeScript & Express.
   - Built-in `node:crypto` provides native OpenSSL-accelerated SHA-256 and HMAC streaming without native C++ compilation headaches.
   - Streaming hash calculation reads files in 64KB chunks directly from upload streams, scaling to large disk images/PCAPs without memory exhaustion.
2. **Database**: SQLite via Prisma ORM / `better-sqlite3`.
   - Single-file zero-config database with WAL mode enabled; ideal for portability, zero-dependency deployment, atomic transactions, and forensic reproducibility.
3. **Frontend**: React 18 with Vite, Tailwind CSS, Lucide icons.
   - High-performance, fast reactive updates for cryptographic verification states, interactive timelines, and custody chain graphs.
   - Professional SOC visual theme: Dark slate, charcoal, zero AI-sparkles, monospace forensic data display.
4. **Security Architecture**:
   - Evidence files stored in `storage/vault/` with strictly generated UUIDs. Original filenames preserved solely in database metadata.
   - Direct web execution blocked. Downloads served with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
   - Strict RBAC: Admin, Investigator, Viewer.

---

## 3. Detailed Data Models

### 3.1 Users & RBAC
- `id` (UUID, PK)
- `email` (Unique)
- `passwordHash` (Bcrypt/Argon2)
- `name` (String)
- `role` (`ADMIN`, `INVESTIGATOR`, `VIEWER`)
- `badgeNumber` / `organization` (String)
- `createdAt`, `updatedAt`

### 3.2 Investigations (Cases)
- `id` (UUID, PK)
- `caseNumber` (e.g., `TL-2026-0842`, Unique)
- `title` (String)
- `description` (Text)
- `incidentType` (`PHISHING`, `MALWARE`, `DATA_BREACH`, `INSIDER_THREAT`, `RANSOMWARE`, `INCIDENT_RESPONSE`, `OTHER`)
- `priority` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
- `status` (`OPEN`, `IN_PROGRESS`, `ON_HOLD`, `CLOSED`)
- `leadInvestigatorId` (FK -> User)
- `closureSummary` (Text, nullable)
- `createdAt`, `updatedAt`, `closedAt`

### 3.3 Evidence Items
- `id` (UUID, PK)
- `caseId` (FK -> Investigation)
- `evidenceNumber` (e.g., `EVD-001`, Unique per case)
- `originalFilename` (String)
- `storedFilename` (String - UUID on disk)
- `fileSize` (BigInt/Int)
- `mimeType` (String)
- `sha256` (String, 64 hex chars - Baseline Cryptographic Hash)
- `md5` (String, 32 hex chars - Forensic legacy cross-reference)
- `uploadedById` (FK -> User)
- `description` (Text)
- `sourceDevice` / `custodyLocation` (String)
- `status` (`SECURED`, `CHECKED_OUT`, `ANALYZED`, `DISPOSED`)
- `createdAt`, `updatedAt`

### 3.4 Tamper-Evident Chain of Custody (Cryptographic Blockchain Ledger)
- `id` (UUID, PK)
- `evidenceId` (FK -> EvidenceItem)
- `sequenceNumber` (Int, 1, 2, 3...)
- `action` (`EVIDENCE_COLLECTED`, `EVIDENCE_SECURED`, `CHECKED_OUT`, `CHECKED_IN`, `HASH_VERIFIED`, `TRANSFERRED`, `ANALYZED`, `EXPORTED`, `DISPOSED`)
- `actorId` (FK -> User)
- `timestamp` (DateTime)
- `details` (Text / JSON - Reason, transfer destination, notes)
- `previousEventHash` (String, 64 hex chars - SHA-256 of previous event record, or Genesis anchor)
- `currentEventHash` (String, 64 hex chars)
  *Formula:* `SHA-256(previousEventHash + ":" + sequenceNumber + ":" + evidenceId + ":" + action + ":" + actorId + ":" + timestamp + ":" + details)`

### 3.5 Integrity Verification Records
- `id` (UUID, PK)
- `evidenceId` (FK -> EvidenceItem)
- `verifiedById` (FK -> User)
- `calculatedHash` (String, 64 hex chars)
- `expectedHash` (String, 64 hex chars)
- `result` (`INTEGRITY_VERIFIED`, `INTEGRITY_COMPROMISED`)
- `verifiedAt` (DateTime)
- `notes` (String)

### 3.6 Investigation Timeline Events
- `id` (UUID, PK)
- `caseId` (FK -> Investigation)
- `eventTime` (DateTime)
- `title` (String)
- `description` (Text)
- `category` (`ATTACK_VECTOR`, `EXFILTRATION`, `DETECTION`, `CONTAINMENT`, `ANALYSIS`, `REMEDIATION`)
- `evidenceId` (FK -> EvidenceItem, nullable)
- `createdById` (FK -> User)
- `createdAt`

### 3.7 Forensic Findings
- `id` (UUID, PK)
- `caseId` (FK -> Investigation)
- `title` (String)
- `description` (Text)
- `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`)
- `status` (`DRAFT`, `CONFIRMED`, `REFUTED`, `RESOLVED`)
- `remediation` (Text)
- `evidenceId` (FK -> EvidenceItem, nullable)
- `authorId` (FK -> User)
- `createdAt`, `updatedAt`

### 3.8 Investigation Notes
- `id` (UUID, PK)
- `caseId` (FK -> Investigation)
- `authorId` (FK -> User)
- `content` (Text)
- `isPinned` (Boolean)
- `createdAt`, `updatedAt`

### 3.9 System Audit Log
- `id` (UUID, PK)
- `actorId` (FK -> User, nullable for failed logins)
- `actorEmail` (String)
- `action` (String, e.g., `AUTH_LOGIN`, `EVIDENCE_UPLOAD`, `HASH_VERIFY`, `CASE_CREATE`)
- `targetType` (String, e.g., `CASE`, `EVIDENCE`, `FINDING`, `SYSTEM`)
- `targetId` (String)
- `ipAddress` (String)
- `userAgent` (String)
- `status` (`SUCCESS`, `FAILURE`, `DENIED`)
- `details` (JSON / Text)
- `createdAt` (DateTime)

---

## 4. Cryptographic Specifications

### 4.1 Real Evidence Hashing
- Algorithm: SHA-256 (`crypto.createHash('sha256')`) + MD5 for supplementary forensic cataloging.
- Process:
  1. Stream incoming multipart file directly into cryptographic hash accumulator.
  2. Write bytes to temporary vault file simultaneously.
  3. Finalize hash digest when stream closes.
  4. Ensure zero in-memory duplication.

### 4.2 Tamper-Evident Custody Verification Algorithm
- Chain Genesis for an evidence item:
  `Hash_0 = SHA-256("GENESIS:" + evidenceId + ":" + evidenceSha256 + ":" + createdAt)`
- Successive events:
  `Hash_N = SHA-256(Hash_{N-1} + ":" + sequenceNumber + ":" + evidenceId + ":" + action + ":" + actorId + ":" + timestampISO + ":" + details)`
- Verification Procedure:
  1. Fetch all chain events for given evidence item ordered by `sequenceNumber ASC`.
  2. Compute expected Genesis hash.
  3. For each event `i` from 1 to `N`:
     - Assert `event[i].previousEventHash == calculatedHash[i-1]`.
     - Recompute `expectedHash = SHA-256(...)`.
     - Assert `event[i].currentEventHash == expectedHash`.
  4. If any mismatch is encountered:
     - Return status `CHAIN_INTEGRITY_COMPROMISED`
     - Return exact violation metadata: broken block index, expected hash, found hash, tampered fields.
  5. If all match:
     - Return status `CHAIN_INTEGRITY_VERIFIED` with total block count and genesis timestamp.

---

## 5. Security & Isolation Controls
1. **Strict File Isolation**:
   - Files stored in non-public path: `<server_root>/storage/vault/<uuid>`.
   - No executable permissions set on vault directory.
   - File extension stripped from physical storage to defeat direct mime-type execution exploits.
2. **Download Protection**:
   - Endpoints require valid JWT bearer token.
   - Case access checked against user role / assignment.
   - Streams with headers:
     `Content-Disposition: attachment; filename="sanitized_name"`
     `Content-Security-Policy: default-src 'none'`
     `X-Content-Type-Options: nosniff`
   - Every download generates an audit log entry and chain of custody event (`EVIDENCE_EXPORTED` or `CHECKED_OUT`).
3. **RBAC Guarding**:
   - Admin: All access, user management, system audit logs, tamper test utilities.
   - Investigator: Full case and evidence operations on assigned or open cases.
   - Viewer: Read-only query access; all mutating routes return 403 Forbidden.

---

## 6. Execution Plan & Deliverables
1. **Phase 1**: Architecture & Directory Setup (Frontend + Backend workspace).
2. **Phase 2**: Backend Database Schema, Migrations, Seed Data with Realistic Phishing Investigation.
3. **Phase 3**: Authentication, RBAC, Core Security Middleware, Audit Logging System.
4. **Phase 4**: Evidence Vault & Streaming Cryptographic Hashing Engine.
5. **Phase 5**: Tamper-Evident Custody Chain Engine with Real Cryptographic Verification & Tamper Detection.
6. **Phase 6**: Case Workspace, Timeline, Findings, Notes API.
7. **Phase 7**: Comprehensive Investigation Report Generation (Structured technical DFIR dossier).
8. **Phase 8**: High-Caliber Frontend UI (React + Vite + Tailwind, SOC Dark Slate aesthetic).
9. **Phase 9**: Empirical Verification & Testing Suite (Automated API tests, Hash verification tests, Chain tamper tests).
10. **Phase 10**: Documentation, README, and Deployment Readiness.
