import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { upload } from '../middleware/uploadMiddleware.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getParam } from '../utils/params.js';
import {
  createEvidenceItem,
  getEvidenceById,
  getEvidenceByCase,
  performEvidenceVerification,
  getIntegrityChecksForEvidence,
  corruptEvidenceFileForTesting,
  getVaultDir,
} from '../services/evidenceService.js';
import {
  getCustodyEventsForEvidence,
  appendCustodyEvent,
  verifyEvidenceCustodyChain,
  simulateTamper,
  restoreChainIntegrity,
} from '../services/custodyService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

// GET /api/cases/:caseId/evidence
router.get('/cases/:caseId/evidence', requireAuth, (req, res) => {
  const caseId = getParam(req.params.caseId);
  const items = getEvidenceByCase(caseId);
  res.json({ evidence: items });
});

// POST /api/cases/:caseId/evidence - Secure Upload & Hashing
router.post(
  '/cases/:caseId/evidence',
  requireAuth,
  requireRole('ADMIN', 'INVESTIGATOR'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const caseId = getParam(req.params.caseId);
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { description, sourceDevice, custodyLocation } = req.body;
      if (!description) {
        // Clean up temp file
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(400).json({ error: 'Evidence description is required' });
        return;
      }

      const evidence = await createEvidenceItem({
        caseId,
        originalFilename: req.file.originalname,
        tempFilePath: req.file.path,
        mimeType: req.file.mimetype,
        description,
        sourceDevice,
        custodyLocation,
        uploaderSession: req.user!,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({
        message: 'Evidence successfully ingested and cryptographically fingerprinted',
        evidence,
      });
    } catch (err: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/evidence/:id
router.get('/evidence/:id', requireAuth, (req, res) => {
  const id = getParam(req.params.id);
  const item = getEvidenceById(id);
  if (!item) {
    res.status(404).json({ error: 'Evidence not found' });
    return;
  }
  res.json({ evidence: item });
});

// POST /api/evidence/:id/verify - Live Cryptographic Verification
router.post('/evidence/:id/verify', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), async (req: AuthenticatedRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const result = await performEvidenceVerification(
      id,
      req.user!,
      req.ip,
      req.headers['user-agent']
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/evidence/:id/custody
router.get('/evidence/:id/custody', requireAuth, (req, res) => {
  const id = getParam(req.params.id);
  const events = getCustodyEventsForEvidence(id);
  res.json({ custodyEvents: events });
});

// POST /api/evidence/:id/custody - Append Custody Block
router.post('/evidence/:id/custody', requireAuth, requireRole('ADMIN', 'INVESTIGATOR'), (req: AuthenticatedRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const { action, details } = req.body;
    if (!action || !details) {
      res.status(400).json({ error: 'action and details are required' });
      return;
    }

    const newEvent = appendCustodyEvent({
      evidenceId: id,
      action,
      details,
      actorSession: req.user!,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ message: 'Custody event appended to cryptographic chain', event: newEvent });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/evidence/:id/custody/verify-chain - Mathematical Chain Verification
router.get('/evidence/:id/custody/verify-chain', requireAuth, (req, res) => {
  try {
    const id = getParam(req.params.id);
    const report = verifyEvidenceCustodyChain(id);
    res.json({ report });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/evidence/:id/custody/simulate-tamper - Educational DFIR Demonstration
router.post('/evidence/:id/custody/simulate-tamper', requireAuth, requireRole('ADMIN'), (req, res) => {
  try {
    const id = getParam(req.params.id);
    const { sequenceNumber, tamperedText } = req.body;
    if (!sequenceNumber || !tamperedText) {
      res.status(400).json({ error: 'sequenceNumber and tamperedText are required' });
      return;
    }

    const result = simulateTamper(id, Number(sequenceNumber), tamperedText);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/evidence/:id/custody/restore-chain
router.post('/evidence/:id/custody/restore-chain', requireAuth, requireRole('ADMIN'), (req, res) => {
  try {
    const id = getParam(req.params.id);
    const result = restoreChainIntegrity(id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/evidence/:id/simulate-file-corruption
router.post('/evidence/:id/simulate-file-corruption', requireAuth, requireRole('ADMIN'), (req, res) => {
  try {
    const id = getParam(req.params.id);
    const result = corruptEvidenceFileForTesting(id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/evidence/:id/integrity-history
router.get('/evidence/:id/integrity-history', requireAuth, (req, res) => {
  const id = getParam(req.params.id);
  const history = getIntegrityChecksForEvidence(id);
  res.json({ checks: history });
});

// GET /api/evidence/:id/download - Secure Forensic Download with Header Hardening
router.get('/evidence/:id/download', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = getParam(req.params.id);
    const item = getEvidenceById(id);
    if (!item) {
      res.status(404).json({ error: 'Evidence not found' });
      return;
    }

    const vaultPath = path.join(getVaultDir(), item.stored_filename);
    if (!fs.existsSync(vaultPath)) {
      res.status(404).json({ error: 'Evidence file is missing from vault storage' });
      return;
    }

    // Log the download to audit trail
    logAudit({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      action: 'EVIDENCE_DOWNLOADED',
      targetType: 'EVIDENCE',
      targetId: item.id,
      status: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        evidenceNumber: item.evidence_number,
        filename: item.original_filename,
        sha256: item.sha256,
      },
    });

    // Append download event to custody chain
    appendCustodyEvent({
      evidenceId: item.id,
      action: 'EXPORTED',
      actorSession: req.user!,
      details: `Evidence artifact exported/downloaded for external investigative analysis by ${req.user!.name} (${req.user!.email}).`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Set secure response headers to ensure browser never executes untrusted artifacts
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.original_filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream'); // Force raw download
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");

    const fileStream = fs.createReadStream(vaultPath);
    fileStream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
