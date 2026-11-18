import { getCaseById } from './caseService.js';
import { getEvidenceByCase } from './evidenceService.js';
import { getCustodyEventsForEvidence, verifyEvidenceCustodyChain } from './custodyService.js';
import { getTimelineEventsForCase } from './timelineService.js';
import { getFindingsForCase } from './findingsService.js';
import { getNotesForCase } from './notesService.js';
import { getAuditLogs } from './auditService.js';
import { UserSession } from './authService.js';
import { logAudit } from './auditService.js';

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateForensicCaseDossier(caseId: string, actorSession: UserSession) {
  const caseData = getCaseById(caseId);
  if (!caseData) throw new Error('Case not found');

  const evidenceList = getEvidenceByCase(caseId) as any[];

  // Collect custody events and verify each chain
  const evidenceDossier = evidenceList.map((item) => {
    const custodyEvents = getCustodyEventsForEvidence(item.id);
    const chainVerification = verifyEvidenceCustodyChain(item.id);

    return {
      ...item,
      custodyEvents,
      chainVerification,
    };
  });

  const timeline = getTimelineEventsForCase(caseId);
  const findings = getFindingsForCase(caseId);
  const notes = getNotesForCase(caseId);
  const auditTrail = getAuditLogs({ targetType: 'CASE', targetId: caseId, limit: 50 });

  const generatedAt = new Date().toISOString();

  logAudit({
    actorId: actorSession.id,
    actorEmail: actorSession.email,
    action: 'FORENSIC_REPORT_GENERATED',
    targetType: 'CASE',
    targetId: caseId,
    status: 'SUCCESS',
    details: { caseNumber: caseData.case_number, evidenceCount: evidenceList.length, findingsCount: findings.length },
  });

  return {
    reportMetadata: {
      generatedAt,
      generatedBy: {
        id: actorSession.id,
        name: actorSession.name,
        email: actorSession.email,
        badgeNumber: actorSession.badgeNumber,
        organization: actorSession.organization,
      },
      software: 'TraceLock Forensics Platform v1.0.0',
      hashAlgorithm: 'SHA-256 (FIPS 180-4)',
      disclaimer: 'This automated report provides technical verification of cryptographic hashes and custody events. It does not constitute a legal determination of admissibility.',
    },
    caseData,
    evidenceDossier,
    timeline,
    findings,
    notes,
    auditTrail,
  };
}

export function generateHtmlForensicReport(caseId: string, actorSession: UserSession): string {
  const dossier = generateForensicCaseDossier(caseId, actorSession);
  const c = dossier.caseData;

  const evidenceRows = dossier.evidenceDossier.map((e) => `
    <tr style="border-bottom: 1px solid #2d3748;">
      <td style="padding: 10px; font-family: monospace; font-weight: 600;">${escapeHtml(e.evidence_number)}</td>
      <td style="padding: 10px; font-weight: 500;">${escapeHtml(e.original_filename)}<br><small style="color: #a0aec0;">${escapeHtml(e.description)}</small></td>
      <td style="padding: 10px; font-family: monospace; font-size: 11px; word-break: break-all; color: #63b3ed;">${escapeHtml(e.sha256)}</td>
      <td style="padding: 10px;">${(e.file_size / 1024).toFixed(1)} KB</td>
      <td style="padding: 10px;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${e.chainVerification.status === 'CHAIN_INTEGRITY_VERIFIED' ? '#065f46; color: #34d399;' : '#991b1b; color: #f87171;'}">
          ${e.chainVerification.status === 'CHAIN_INTEGRITY_VERIFIED' ? 'VERIFIED INTACT' : 'COMPROMISED'}
        </span>
      </td>
    </tr>
  `).join('');

  const custodyRows = dossier.evidenceDossier.flatMap((e) =>
    e.custodyEvents.map((evt: any) => `
      <tr style="border-bottom: 1px solid #2d3748; font-size: 12px;">
        <td style="padding: 8px; font-family: monospace;">${escapeHtml(e.evidence_number)}</td>
        <td style="padding: 8px; font-family: monospace;">#${escapeHtml(evt.sequence_number)}</td>
        <td style="padding: 8px; font-weight: 600; color: #e2e8f0;">${escapeHtml(evt.action)}</td>
        <td style="padding: 8px; color: #cbd5e0;">${escapeHtml(evt.actor_name || evt.actor_email)}</td>
        <td style="padding: 8px; color: #a0aec0;">${escapeHtml(evt.timestamp)}</td>
        <td style="padding: 8px; font-family: monospace; font-size: 10px; color: #90cdf4; word-break: break-all;">${escapeHtml(evt.current_event_hash)}</td>
        <td style="padding: 8px; color: #cbd5e0;">${escapeHtml(evt.details)}</td>
      </tr>
    `)
  ).join('');

  const timelineRows = (dossier.timeline as any[]).map((t) => `
    <div style="margin-bottom: 16px; border-left: 3px solid #3182ce; padding-left: 14px;">
      <div style="font-size: 12px; color: #63b3ed; font-family: monospace;">${escapeHtml(t.event_time)} &bull; ${escapeHtml(t.category)}</div>
      <div style="font-size: 15px; font-weight: 600; color: #edf2f7; margin-top: 2px;">${escapeHtml(t.title)}</div>
      <div style="font-size: 13px; color: #cbd5e0; margin-top: 4px;">${escapeHtml(t.description)}</div>
      ${t.evidence_number ? `<div style="font-size: 11px; color: #a0aec0; margin-top: 4px; font-family: monospace;">Associated Artifact: ${escapeHtml(t.evidence_number)} (${escapeHtml(t.evidence_filename)})</div>` : ''}
    </div>
  `).join('');

  const findingsRows = (dossier.findings as any[]).map((f) => {
    let color = '#718096';
    if (f.severity === 'CRITICAL') color = '#e53e3e';
    if (f.severity === 'HIGH') color = '#dd6b20';
    if (f.severity === 'MEDIUM') color = '#d69e2e';
    if (f.severity === 'LOW') color = '#3182ce';

    return `
      <div style="border: 1px solid #4a5568; background: #1a202c; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h4 style="margin: 0; font-size: 16px; color: #fff;">${escapeHtml(f.title)}</h4>
          <span style="background: ${color}; color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${escapeHtml(f.severity)}</span>
        </div>
        <p style="color: #cbd5e0; font-size: 13px; margin: 8px 0;">${escapeHtml(f.description)}</p>
        ${f.remediation ? `<div style="background: #2d3748; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #68d391; margin-top: 8px;"><strong>Remediation:</strong> ${escapeHtml(f.remediation)}</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>TraceLock Investigation Report — ${escapeHtml(c.case_number)}</title>
      <style>
        body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }
        .container { max-width: 1000px; margin: 0 auto; background: #1e293b; padding: 40px; border-radius: 8px; border: 1px solid #334155; }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
        h1 { margin: 0 0 6px 0; font-size: 26px; color: #fff; letter-spacing: -0.5px; }
        .tagline { color: #94a3b8; font-size: 13px; font-weight: 500; }
        .meta-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #0f172a; padding: 16px; border-radius: 6px; margin-bottom: 30px; border: 1px solid #334155; }
        .meta-item label { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
        .meta-item value { display: block; font-size: 14px; font-weight: 600; color: #e2e8f0; margin-top: 4px; }
        h2 { font-size: 18px; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-top: 36px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        th { text-align: left; padding: 10px; background: #0f172a; color: #94a3b8; border-bottom: 1px solid #334155; font-size: 11px; text-transform: uppercase; }
        .seal { border: 2px dashed #059669; padding: 18px; border-radius: 6px; background: rgba(5, 150, 105, 0.08); margin-top: 40px; }
        .disclaimer-box { margin-top: 20px; padding: 14px; background: #0f172a; border-left: 3px solid #64748b; font-size: 12px; color: #94a3b8; line-height: 1.5; border-radius: 0 4px 4px 0; }
        @media print {
          body { background: #fff; color: #000; padding: 0; }
          .container { border: none; padding: 0; background: #fff; color: #000; }
          .header { border-bottom: 2px solid #000; }
          .meta-box { background: #f8fafc; border: 1px solid #ccc; }
          th { background: #f1f5f9; color: #333; }
          td { color: #111; }
          .seal { border-color: #000; background: none; }
          .disclaimer-box { background: #f1f5f9; border-color: #000; color: #333; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>TRACELOCK INVESTIGATION REPORT</h1>
            <div class="tagline">Digital Evidence Record &amp; Chain-of-Custody Dossier</div>
          </div>
          <div style="text-align: right; font-family: monospace; font-size: 12px; color: #94a3b8;">
            <div>CASE REF: <strong style="color: #fff;">${escapeHtml(c.case_number)}</strong></div>
            <div>DATE: ${escapeHtml(dossier.reportMetadata.generatedAt.split('T')[0])}</div>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-item"><label>Investigation Name</label><value>${escapeHtml(c.title)}</value></div>
          <div class="meta-item"><label>Incident Type</label><value>${escapeHtml(c.incident_type)}</value></div>
          <div class="meta-item"><label>Priority / Severity</label><value style="color: #f87171;">${escapeHtml(c.priority)}</value></div>
          <div class="meta-item"><label>Case Status</label><value>${escapeHtml(c.status)}</value></div>
          <div class="meta-item"><label>Lead Investigator</label><value>${escapeHtml(c.lead_investigator_name || 'Unassigned')}</value></div>
          <div class="meta-item"><label>Organization</label><value>${escapeHtml(dossier.reportMetadata.generatedBy.organization || 'Forensic Lab')}</value></div>
          <div class="meta-item"><label>Reporting Officer</label><value>${escapeHtml(dossier.reportMetadata.generatedBy.name)} (${escapeHtml(dossier.reportMetadata.generatedBy.badgeNumber || 'N/A')})</value></div>
          <div class="meta-item"><label>Evidence Count</label><value>${dossier.evidenceDossier.length} Items Documented</value></div>
        </div>

        <h2>1. Executive Summary &amp; Incident Overview</h2>
        <div style="background: #0f172a; padding: 18px; border-radius: 6px; border: 1px solid #334155; line-height: 1.6; color: #cbd5e0; font-size: 14px;">
          ${escapeHtml(c.description)}
          ${c.closure_summary ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;"><strong style="color: #38bdf8;">Closure Resolution:</strong> ${escapeHtml(c.closure_summary)}</div>` : ''}
        </div>

        <h2>2. Digital Evidence Inventory &amp; Cryptographic Baselines</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Artifact / Description</th>
              <th>Original SHA-256 Fingerprint</th>
              <th>Size</th>
              <th>Integrity Status</th>
            </tr>
          </thead>
          <tbody>
            ${evidenceRows || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #64748b;">No digital evidence registered for this case.</td></tr>'}
          </tbody>
        </table>

        <h2>3. Tamper-Evident Chain of Custody Ledger</h2>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">
          Each event is cryptographically linked to the preceding block using SHA-256 hash chaining: 
          <code>Hash(N) = SHA-256(Hash(N-1) | Seq | Action | Actor | Time | Details)</code>.
        </p>
        <table>
          <thead>
            <tr>
              <th>Artifact</th>
              <th>Seq</th>
              <th>Action</th>
              <th>Custodian</th>
              <th>Timestamp</th>
              <th>Cryptographic Event Hash</th>
              <th>Operational Notes</th>
            </tr>
          </thead>
          <tbody>
            ${custodyRows || '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748b;">No custody transactions logged.</td></tr>'}
          </tbody>
        </table>

        <h2>4. Forensic Attack Timeline</h2>
        <div style="margin-top: 16px;">
          ${timelineRows || '<p style="color: #64748b;">No timeline entries logged.</p>'}
        </div>

        <h2>5. Investigative Findings &amp; Technical Analysis</h2>
        <div>
          ${findingsRows || '<p style="color: #64748b;">No formal findings documented.</p>'}
        </div>

        <div class="seal">
          <div style="font-weight: 700; color: #34d399; font-size: 14px; margin-bottom: 6px;">
            CRYPTOGRAPHIC CHAIN INTEGRITY AUDIT
          </div>
          <div style="font-size: 12px; color: #cbd5e0; line-height: 1.5;">
            This section summarizes digital evidence items, custody logs, and cryptographic hashes recorded in TraceLock. 
            Each custody record is cryptographically linked to its predecessor using SHA-256 hash chaining to provide tamper-evident verification and auditability.
          </div>
          <div style="margin-top: 12px; font-family: monospace; font-size: 11px; color: #94a3b8;">
            Audit Engine: ${escapeHtml(dossier.reportMetadata.software)} &bull; Algorithm: ${escapeHtml(dossier.reportMetadata.hashAlgorithm)} &bull; Generated: ${escapeHtml(dossier.reportMetadata.generatedAt)}
          </div>
        </div>

        <div class="disclaimer-box">
          <strong>Notice:</strong> ${escapeHtml(dossier.reportMetadata.disclaimer)}
        </div>
      </div>
    </body>
    </html>
  `;
}
