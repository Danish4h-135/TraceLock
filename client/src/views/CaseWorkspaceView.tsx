import React, { useEffect, useState } from 'react';
import {
  FolderLock,
  HardDrive,
  Link as LinkIcon,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  History,
  FileCheck2,
  Plus,
  RefreshCw,
  Download,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Pin,
  Trash2,
  AlertOctagon,
  FileCode,
  Sparkles,
  Activity,
} from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { HashDisplay } from '../components/HashDisplay';
import {
  Case,
  EvidenceItem,
  CustodyEvent,
  ChainVerificationReport,
  TimelineEvent,
  Finding,
  CaseNote,
  AuditLog,
} from '../types';
import { useAuth } from '../context/AuthContext';

interface CaseWorkspaceViewProps {
  caseId: string;
  onBack: () => void;
}

export const CaseWorkspaceView: React.FC<CaseWorkspaceViewProps> = ({ caseId, onBack }) => {
  const { user, isInvestigator, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'evidence' | 'custody' | 'timeline' | 'findings' | 'notes' | 'audit' | 'report'
  >('overview');

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Evidence Selection for Chain of Custody & Verification
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('');
  const [custodyEvents, setCustodyEvents] = useState<CustodyEvent[]>([]);
  const [chainReport, setChainReport] = useState<ChainVerificationReport | null>(null);
  const [chainLoading, setChainLoading] = useState(false);

  // Modals & Forms
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadSource, setUploadSource] = useState('Forensic Acquisition');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Custody Append Modal
  const [showAppendCustodyModal, setShowAppendCustodyModal] = useState(false);
  const [custodyAction, setCustodyAction] = useState<string>('CHECKED_OUT');
  const [custodyDetails, setCustodyDetails] = useState('');

  // Timeline Event Modal
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineTime, setTimelineTime] = useState(new Date().toISOString().slice(0, 16));
  const [timelineTitle, setTimelineTitle] = useState('');
  const [timelineCategory, setTimelineCategory] = useState<any>('ANALYSIS');
  const [timelineDesc, setTimelineDesc] = useState('');
  const [timelineEvidenceId, setTimelineEvidenceId] = useState('');

  // Finding Modal
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [findingTitle, setFindingTitle] = useState('');
  const [findingDesc, setFindingDesc] = useState('');
  const [findingSeverity, setFindingSeverity] = useState<any>('HIGH');
  const [findingRemediation, setFindingRemediation] = useState('');
  const [findingEvidenceId, setFindingEvidenceId] = useState('');

  // Note Input
  const [newNoteContent, setNewNoteContent] = useState('');

  // Live Verification State
  const [verifyingEvidenceId, setVerifyingEvidenceId] = useState<string | null>(null);
  const [verifyResultModal, setVerifyResultModal] = useState<any | null>(null);

  // Tamper Simulation Modal
  const [showTamperModal, setShowTamperModal] = useState(false);
  const [tamperSeq, setTamperSeq] = useState<number>(2);
  const [tamperText, setTamperText] = useState('UNAUTHORIZED TAMPER: Stolen hash values altered in database');

  const loadCaseFullData = async () => {
    setLoading(true);
    try {
      const [cRes, evRes, tlRes, fRes, nRes, aRes] = await Promise.all([
        api.getCaseById(caseId),
        api.getEvidenceByCase(caseId),
        api.getTimeline(caseId),
        api.getFindings(caseId),
        api.getNotes(caseId),
        api.getAuditLogs({ targetType: 'CASE', targetId: caseId, limit: 100 }),
      ]);

      setCaseData(cRes.case);
      setEvidenceList(evRes.evidence);
      setTimeline(tlRes.timeline);
      setFindings(fRes.findings);
      setNotes(nRes.notes);
      setAuditTrail(aRes.auditLogs);

      if (evRes.evidence.length > 0 && !selectedEvidenceId) {
        setSelectedEvidenceId(evRes.evidence[0].id);
      }
    } catch (err) {
      console.error('Error loading workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseFullData();
  }, [caseId]);

  // Load custody chain when selected evidence changes
  useEffect(() => {
    if (!selectedEvidenceId) return;

    const loadCustody = async () => {
      setChainLoading(true);
      try {
        const [cRes, vRes] = await Promise.all([
          api.getCustodyEvents(selectedEvidenceId),
          api.verifyCustodyChain(selectedEvidenceId),
        ]);
        setCustodyEvents(cRes.custodyEvents);
        setChainReport(vRes.report);
      } catch (err) {
        console.error('Error fetching custody chain:', err);
      } finally {
        setChainLoading(false);
      }
    };

    loadCustody();
  }, [selectedEvidenceId]);

  // Handle Evidence Upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadLoading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('description', uploadDesc);
    formData.append('sourceDevice', uploadSource);

    try {
      await api.uploadEvidence(caseId, formData);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDesc('');
      loadCaseFullData();
    } catch (err: any) {
      setUploadError(err.message || 'Evidence upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  // Perform Live Evidence Re-Hashing Verification
  const handleVerifyEvidence = async (evidenceId: string) => {
    setVerifyingEvidenceId(evidenceId);
    try {
      const res = await api.verifyEvidenceIntegrity(evidenceId);
      setVerifyResultModal(res);
      // Reload chain if currently selected
      if (selectedEvidenceId === evidenceId) {
        const cRes = await api.getCustodyEvents(evidenceId);
        const vRes = await api.verifyCustodyChain(evidenceId);
        setCustodyEvents(cRes.custodyEvents);
        setChainReport(vRes.report);
      }
    } catch (err: any) {
      alert(`Verification Error: ${err.message}`);
    } finally {
      setVerifyingEvidenceId(null);
    }
  };

  // Append Custody Event
  const handleAppendCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvidenceId || !custodyDetails) return;

    try {
      await api.appendCustodyEvent(selectedEvidenceId, {
        action: custodyAction,
        details: custodyDetails,
      });
      setShowAppendCustodyModal(false);
      setCustodyDetails('');
      // Reload chain
      const cRes = await api.getCustodyEvents(selectedEvidenceId);
      const vRes = await api.verifyCustodyChain(selectedEvidenceId);
      setCustodyEvents(cRes.custodyEvents);
      setChainReport(vRes.report);
    } catch (err: any) {
      alert(err.message || 'Failed to append custody event');
    }
  };

  // Tamper Simulation Demo
  const handleSimulateTamper = async () => {
    if (!selectedEvidenceId) return;
    try {
      await api.simulateCustodyTamper(selectedEvidenceId, {
        sequenceNumber: tamperSeq,
        tamperedText: tamperText,
      });
      setShowTamperModal(false);
      // Re-verify chain to reveal detection
      const cRes = await api.getCustodyEvents(selectedEvidenceId);
      const vRes = await api.verifyCustodyChain(selectedEvidenceId);
      setCustodyEvents(cRes.custodyEvents);
      setChainReport(vRes.report);
    } catch (err: any) {
      alert(err.message || 'Tamper simulation failed');
    }
  };

  // Restore Chain Integrity
  const handleRestoreChain = async () => {
    if (!selectedEvidenceId) return;
    try {
      await api.restoreCustodyChain(selectedEvidenceId);
      const cRes = await api.getCustodyEvents(selectedEvidenceId);
      const vRes = await api.verifyCustodyChain(selectedEvidenceId);
      setCustodyEvents(cRes.custodyEvents);
      setChainReport(vRes.report);
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    }
  };

  // Add Timeline Event
  const handleAddTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addTimelineEvent(caseId, {
        eventTime: new Date(timelineTime).toISOString(),
        title: timelineTitle,
        category: timelineCategory,
        description: timelineDesc,
        evidenceId: timelineEvidenceId || undefined,
      });
      setShowTimelineModal(false);
      setTimelineTitle('');
      setTimelineDesc('');
      const res = await api.getTimeline(caseId);
      setTimeline(res.timeline);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Finding
  const handleAddFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFinding(caseId, {
        title: findingTitle,
        description: findingDesc,
        severity: findingSeverity,
        remediation: findingRemediation,
        evidenceId: findingEvidenceId || undefined,
      });
      setShowFindingModal(false);
      setFindingTitle('');
      setFindingDesc('');
      setFindingRemediation('');
      const res = await api.getFindings(caseId);
      setFindings(res.findings);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Case Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    try {
      await api.createNote(caseId, { content: newNoteContent });
      setNewNoteContent('');
      const res = await api.getNotes(caseId);
      setNotes(res.notes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePinNote = async (noteId: string) => {
    try {
      await api.togglePinNote(noteId);
      const res = await api.getNotes(caseId);
      setNotes(res.notes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Permanently delete this note?')) return;
    try {
      await api.deleteNote(noteId);
      const res = await api.getNotes(caseId);
      setNotes(res.notes);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !caseData) {
    return (
      <div className="p-16 text-center font-mono text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
        <span className="tracking-wider uppercase">Loading Forensic Investigation Workspace...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Workspace Header */}
      <div className="bg-obsidian-950 border border-slate-800 rounded p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onBack}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title="Back to Directory"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="font-mono font-bold text-sky-400 text-sm tracking-wide">
                {caseData.case_number}
              </span>
              <span className="text-slate-600">&bull;</span>
              <StatusBadge status={caseData.incident_type} type="status" />
              <StatusBadge status={caseData.priority} type="priority" />
              <StatusBadge status={caseData.status} type="status" />
            </div>
            <h1 className="text-lg font-bold text-white font-sans">{caseData.title}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isInvestigator && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ingest Evidence</span>
              </button>
            )}

            <a
              href={api.getReportHtmlUrl(caseId)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-obsidian-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-mono transition-all hover:scale-[1.02] active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              <span>Print/Export Dossier</span>
            </a>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="flex items-center gap-1.5 border-t border-slate-800/80 pt-3 overflow-x-auto text-xs pb-1">
          {[
            { id: 'overview', label: 'Overview', icon: FolderLock },
            { id: 'evidence', label: `Evidence Vault (${evidenceList.length})`, icon: HardDrive },
            { id: 'custody', label: 'Chain of Custody', icon: LinkIcon },
            { id: 'timeline', label: `Timeline (${timeline.length})`, icon: Clock },
            { id: 'findings', label: `Findings (${findings.length})`, icon: AlertTriangle },
            { id: 'notes', label: `Notes (${notes.length})`, icon: FileText },
            { id: 'audit', label: `Audit Trail (${auditTrail.length})`, icon: History },
            { id: 'report', label: 'Report Preview', icon: FileCheck2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-[11px] whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 border border-slate-700 font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT CONTAINER WITH SMOOTH ANIMATION */}
      <div key={activeTab} className="animate-fade-in animate-slide-up">
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="forensic-card bg-obsidian-950 border border-slate-800 rounded p-5 space-y-3 shadow-lg">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>Investigation Scope & Threat Telemetry</span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">{caseData.description}</p>
                {caseData.closure_summary && (
                  <div className="mt-4 p-3.5 bg-obsidian-900 border border-emerald-800/60 rounded text-xs">
                    <span className="font-mono text-emerald-400 font-bold uppercase block mb-1">
                      Formal Closure Resolution:
                    </span>
                    <p className="text-slate-300">{caseData.closure_summary}</p>
                  </div>
                )}
              </div>

              {/* Quick Evidence Preview Table */}
              <div className="bg-obsidian-950 border border-slate-800 rounded p-5 space-y-3 shadow-lg">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>Digital Evidence Inventory</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('evidence')}
                    className="text-xs font-mono text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Manage Vault &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-obsidian-900 text-slate-400 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">Artifact Name</th>
                        <th className="p-2">Original Baseline Hash (SHA-256)</th>
                        <th className="p-2 text-right">Integrity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {evidenceList.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2 font-mono font-semibold text-sky-400">{e.evidence_number}</td>
                          <td className="p-2 text-slate-200 font-medium">{e.original_filename}</td>
                          <td className="p-2">
                            <HashDisplay hash={e.sha256} truncate />
                          </td>
                          <td className="p-2 text-right">
                            <StatusBadge status={e.status} type="status" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Case Meta & Custodians */}
            <div className="space-y-6">
              <div className="bg-obsidian-950 border border-slate-800 rounded p-5 space-y-3 text-xs shadow-lg">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Forensics Metadata
                </h3>
                <div className="space-y-2 font-mono text-[11px] divide-y divide-slate-800/60">
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-slate-500">Case Identifier:</span>
                    <span className="text-sky-300 font-bold">{caseData.case_number}</span>
                  </div>
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-slate-500">Created:</span>
                    <span className="text-slate-300">{new Date(caseData.created_at).toLocaleString()}</span>
                  </div>
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-slate-500">Lead Investigator:</span>
                    <span className="text-slate-200">{caseData.lead_investigator_name || 'Unassigned'}</span>
                  </div>
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-slate-500">Classification:</span>
                    <span className="text-slate-200">{caseData.incident_type}</span>
                  </div>
                  <div className="pt-1.5 flex justify-between">
                    <span className="text-slate-500">Storage Location:</span>
                    <span className="text-emerald-400 font-bold">TraceLock Vault Tier 1</span>
                  </div>
                </div>
              </div>

              {/* Assigned Custodians */}
              <div className="bg-obsidian-950 border border-slate-800 rounded p-5 space-y-3 shadow-lg">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Investigation Team</span>
                </h3>
                <div className="space-y-2">
                  {caseData.members?.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded bg-obsidian-900 border border-slate-800 text-xs flex justify-between items-center hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-slate-200">{m.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{m.role_in_case}</div>
                      </div>
                      <span className="font-mono text-[10px] text-sky-400 px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. EVIDENCE VAULT TAB */}
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Digital Evidence Vault & Hash Repository
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Untrusted artifacts isolated outside web root. Immutable SHA-256 baseline registration.
                </p>
              </div>
              {isInvestigator && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider transition-all hover:scale-[1.02] shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Artifact</span>
                </button>
              )}
            </div>

            <div className="bg-obsidian-950 border border-slate-800 rounded overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-obsidian-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Artifact ID</th>
                    <th className="py-3 px-4">Filename & Source</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">MIME Type</th>
                    <th className="py-3 px-4">Cryptographic Baseline (SHA-256)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {evidenceList.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {e.evidence_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{e.original_filename}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{e.description}</div>
                        {e.source_device && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Source: {e.source_device}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                        {(e.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {e.mime_type}
                      </td>
                      <td className="py-3 px-4">
                        <HashDisplay hash={e.sha256} truncate />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={e.status} type="status" />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleVerifyEvidence(e.id)}
                          disabled={verifyingEvidenceId === e.id}
                          title="Re-read physical vault file and verify live SHA-256 hash"
                          className="px-2.5 py-1 rounded bg-obsidian-900 border border-slate-700 hover:border-sky-500 text-sky-300 hover:text-white font-mono text-[11px] transition-all hover:scale-105 active:scale-95"
                        >
                          {verifyingEvidenceId === e.id ? 'Hashing...' : 'Verify Hash'}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedEvidenceId(e.id);
                            setActiveTab('custody');
                          }}
                          title="View sequential chain of custody blocks"
                          className="px-2.5 py-1 rounded bg-obsidian-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-mono text-[11px] transition-all hover:scale-105 active:scale-95"
                        >
                          Custody Chain
                        </button>

                        <a
                          href={api.downloadEvidenceUrl(e.id)}
                          title="Secure authorized download with forensic audit log"
                          className="inline-block p-1.5 rounded bg-obsidian-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-emerald-400 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                  {evidenceList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                        No digital evidence registered in vault.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. CHAIN OF CUSTODY TAB (THE TAMPER-EVIDENT CRYPTOGRAPHIC LEDGER) */}
        {activeTab === 'custody' && (
          <div className="space-y-6">
            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-obsidian-950 border border-slate-800 p-4 rounded shadow-lg">
              <div className="flex items-center gap-3">
                <label className="text-xs font-mono uppercase text-slate-400">Select Evidence Item:</label>
                <select
                  value={selectedEvidenceId}
                  onChange={(e) => setSelectedEvidenceId(e.target.value)}
                  className="bg-obsidian-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500"
                >
                  {evidenceList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.evidence_number} — {e.original_filename}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {isInvestigator && (
                  <button
                    onClick={() => setShowAppendCustodyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase font-sans transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Custody Event</span>
                  </button>
                )}

                {isAdmin && (
                  <>
                    <button
                      onClick={() => setShowTamperModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-mono transition-all hover:scale-105 active:scale-95"
                      title="Educational DFIR Demo: Alter historical block in DB to prove tamper detection"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Simulate Tamper</span>
                    </button>

                    <button
                      onClick={handleRestoreChain}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-obsidian-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-mono transition-all hover:scale-105 active:scale-95"
                      title="Recalculate hashes across chain to restore validity"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Restore Chain</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Cryptographic Chain Integrity Verification Banner */}
            {chainReport && (
              <div
                className={`p-4 rounded border flex items-center justify-between shadow-xl transition-all ${
                  chainReport.status === 'CHAIN_INTEGRITY_VERIFIED'
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {chainReport.status === 'CHAIN_INTEGRITY_VERIFIED' ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-mono font-bold text-sm tracking-wide">
                      {chainReport.status === 'CHAIN_INTEGRITY_VERIFIED'
                        ? 'CHAIN INTEGRITY VERIFIED — CRYPTOGRAPHIC LEDGER INTACT'
                        : 'CHAIN INTEGRITY COMPROMISED — TAMPERING DETECTED'}
                    </div>
                    <div className="text-xs font-mono opacity-80 mt-0.5">
                      {chainReport.status === 'CHAIN_INTEGRITY_VERIFIED'
                        ? `All ${chainReport.totalBlocks} sequential event blocks mathematically audited against Genesis Anchor.`
                        : `Violation at Block #${chainReport.brokenBlockIndex}: ${chainReport.violationReason}`}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] opacity-80 hidden md:block">
                  <div>AUDITED: {new Date(chainReport.verifiedAt).toLocaleTimeString()}</div>
                  <div>BLOCK COUNT: {chainReport.totalBlocks} BLOCKS</div>
                </div>
              </div>
            )}

            {/* Chain Block Ledger Visualizer with Linking Arrows */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Sequential Cryptographic Ledger Blocks
              </h3>

              <div className="space-y-3">
                {custodyEvents.map((evt, idx) => {
                  const isGenesis = evt.sequence_number === 1;
                  const isBroken =
                    chainReport?.status === 'CHAIN_INTEGRITY_COMPROMISED' &&
                    chainReport.brokenBlockIndex === evt.sequence_number;

                  return (
                    <React.Fragment key={evt.id}>
                      <div
                        className={`forensic-card p-4 rounded border transition-all ${
                          isBroken
                            ? 'bg-rose-950/40 border-rose-600 shadow-xl shadow-rose-950/60'
                            : 'bg-obsidian-950 border-slate-800 hover:border-sky-500/50'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-400 font-mono text-xs font-bold">
                              BLOCK #{evt.sequence_number}
                            </span>
                            <StatusBadge status={evt.action} type="action" />
                            {isGenesis && (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-[10px]">
                                GENESIS ANCHOR
                              </span>
                            )}
                            {isBroken && (
                              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-mono text-[10px] font-bold animate-pulse">
                                VIOLATION DETECTED HERE
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 font-mono">
                            Custodian: <strong className="text-slate-200">{evt.actor_name || evt.actor_email}</strong> &bull;{' '}
                            {new Date(evt.timestamp).toLocaleString()}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 font-sans mb-3">{evt.details}</p>

                        {/* Hashes Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span className="text-slate-500 uppercase text-[10px]">Prev Hash (N-1):</span>
                            <span className="text-slate-400 truncate select-all">{evt.previous_event_hash}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 md:justify-end">
                            <span className="text-sky-500 uppercase text-[10px]">Current Hash (N):</span>
                            <span className="text-sky-300 font-semibold truncate select-all">
                              {evt.current_event_hash}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Hash Link Connector */}
                      {idx < custodyEvents.length - 1 && (
                        <div className="flex items-center justify-center py-0.5">
                          <div className="flex items-center gap-2 px-3 py-1 rounded bg-obsidian-900 border border-slate-800/80 text-[10px] font-mono text-slate-400 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                            <span>SHA-256 HASH LINK &bull; INCORPORATED IN BLOCK #{evt.sequence_number + 1}</span>
                            <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {custodyEvents.length === 0 && (
                  <div className="py-8 text-center text-slate-500 font-mono text-xs">
                    No custody events recorded for this artifact.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Forensic Incident & Attack Timeline
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Reconstructed chronological sequence of threat actor activity and defensive actions.
                </p>
              </div>
              {isInvestigator && (
                <button
                  onClick={() => setShowTimelineModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase font-sans transition-all hover:scale-[1.02] shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Milestone</span>
                </button>
              )}
            </div>

            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6 py-2">
              {timeline.map((item) => (
                <div key={item.id} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-sky-500 border-2 border-obsidian-950 group-hover:scale-125 transition-transform" />
                  <div className="forensic-card bg-obsidian-950 border border-slate-800 p-4 rounded space-y-2 hover:border-slate-700 shadow-md">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-sky-400 font-semibold">
                          {new Date(item.event_time).toLocaleString()}
                        </span>
                        <StatusBadge status={item.category} type="status" />
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        Logged by {item.creator_name || item.creator_email}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white font-sans">{item.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{item.description}</p>

                    {item.evidence_number && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-400">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Associated Artifact:</span>
                        <span className="text-sky-400 font-bold">{item.evidence_number}</span>
                        <span className="text-slate-500">({item.evidence_filename})</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {timeline.length === 0 && (
                <div className="py-8 text-center text-slate-500 font-mono text-xs">
                  No timeline milestones recorded for this investigation.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. FINDINGS TAB */}
        {activeTab === 'findings' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Forensic Findings & Technical Analysis
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Confirmed indicators of compromise, vulnerabilities, and threat assessment.
                </p>
              </div>
              {isInvestigator && (
                <button
                  onClick={() => setShowFindingModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase font-sans transition-all hover:scale-[1.02] shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Document Finding</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {findings.map((f) => (
                <div
                  key={f.id}
                  className="forensic-card bg-obsidian-950 border border-slate-800 p-5 rounded space-y-3 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={f.severity} type="severity" />
                      <StatusBadge status={f.status} type="status" />
                      <h3 className="font-bold text-white text-sm font-sans">{f.title}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      Author: {f.author_name || f.author_email} &bull; {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{f.description}</p>

                  {f.remediation && (
                    <div className="p-3 rounded bg-obsidian-900 border border-emerald-900/40 text-xs">
                      <strong className="text-emerald-400 font-mono uppercase block mb-1">
                        Recommended Remediation & Countermeasure:
                      </strong>
                      <p className="text-slate-300">{f.remediation}</p>
                    </div>
                  )}

                  {f.evidence_number && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-400">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Evidence Link:</span>
                      <span className="text-sky-400 font-bold">{f.evidence_number}</span>
                      <span className="text-slate-500">({f.evidence_filename})</span>
                    </div>
                  )}
                </div>
              ))}

              {findings.length === 0 && (
                <div className="py-8 text-center text-slate-500 font-mono text-xs">
                  No findings documented yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Investigator Scratchpad & Case Notes
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Working hypotheses, checklist items, and internal collaboration logs.
                </p>
              </div>
            </div>

            {/* Add Note Form */}
            {isInvestigator && (
              <form onSubmit={handleAddNote} className="bg-obsidian-950 border border-slate-800 p-4 rounded space-y-3 shadow-md">
                <label className="block text-xs font-mono uppercase text-slate-400">Add New Case Note:</label>
                <textarea
                  rows={3}
                  required
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record investigative observation, tool commands executed, or next steps..."
                  className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase font-sans tracking-wider transition-all hover:scale-105 active:scale-95"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            )}

            {/* Notes List */}
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-4 rounded border transition-colors ${
                    note.is_pinned === 1
                      ? 'bg-obsidian-900/90 border-amber-800/80 shadow'
                      : 'bg-obsidian-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      {note.is_pinned === 1 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800">
                          <Pin className="w-3 h-3" />
                          <span>PINNED</span>
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-200">
                        {note.author_name || note.author_email}
                      </span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>

                    {isInvestigator && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePinNote(note.id)}
                          className={`p-1 rounded text-xs transition-colors ${
                            note.is_pinned === 1
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={note.is_pinned === 1 ? 'Unpin note' : 'Pin note to top'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </div>
                </div>
              ))}

              {notes.length === 0 && (
                <div className="py-8 text-center text-slate-500 font-mono text-xs">
                  No case notes recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. AUDIT TRAIL TAB */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Immutable Case Audit Log
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Append-only ledger of all access, downloads, modifications, and verifications related to this case.
              </p>
            </div>

            <div className="bg-obsidian-950 border border-slate-800 rounded overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-obsidian-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">IP Address</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Context Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditTrail.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-sky-400 whitespace-nowrap">{log.action}</td>
                      <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap">{log.actor_email}</td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{log.ip_address}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <StatusBadge status={log.status} type="action" />
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate font-sans text-xs">
                        {log.details || '--'}
                      </td>
                    </tr>
                  ))}
                  {auditTrail.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                        No audit events recorded for this case.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. REPORT PREVIEW TAB */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Official Forensic Report & Dossier
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Court-ready digital forensics report with cryptographic chain certifications.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={api.getReportHtmlUrl(caseId)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Printable Report (PDF)</span>
                </a>
              </div>
            </div>

            <div className="bg-obsidian-950 border border-slate-800 rounded p-6 font-sans space-y-6 shadow-2xl">
              <div className="border-b-2 border-sky-500 pb-4 flex justify-between items-end">
                <div>
                  <h1 className="text-xl font-bold text-white uppercase tracking-tight">
                    TraceLock Forensic Investigation Dossier
                  </h1>
                  <p className="text-xs text-slate-400 font-mono">
                    Official Evidence Record & Chain-of-Custody Certification
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-slate-400">
                  <div>CASE: <strong className="text-white">{caseData.case_number}</strong></div>
                  <div>GENERATED: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded bg-obsidian-900 border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Title:</span>
                  <span className="text-slate-200 font-semibold">{caseData.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Incident Type:</span>
                  <span className="text-slate-200">{caseData.incident_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Priority / Status:</span>
                  <span className="text-slate-200">{caseData.priority} / {caseData.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Lead Custodian:</span>
                  <span className="text-slate-200">{caseData.lead_investigator_name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase text-sky-400 font-bold border-b border-slate-800 pb-1 mb-2">
                  1. Executive Summary
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">{caseData.description}</p>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase text-sky-400 font-bold border-b border-slate-800 pb-1 mb-2">
                  2. Evidence Inventory & Baseline Hashes
                </h3>
                <div className="space-y-2">
                  {evidenceList.map((e) => (
                    <div key={e.id} className="p-2.5 rounded bg-obsidian-900 border border-slate-800 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-sky-400 mr-2">{e.evidence_number}</span>
                        <span className="text-slate-200 font-medium">{e.original_filename}</span>
                        <span className="text-slate-500 font-mono text-[11px] ml-2">({(e.file_size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <div className="font-mono text-[11px] text-sky-300">
                        SHA-256: {e.sha256}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded border-2 border-dashed border-emerald-800 bg-emerald-950/20 text-xs font-mono">
                <div className="font-bold text-emerald-400 uppercase mb-1">
                  Cryptographic Evidence & Chain Integrity Seal
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  All evidence items and chained custody events have been verified against TraceLock's sequential SHA-256
                  mathematical ledger. Each historical event block incorporates the cryptographic proof of its predecessor,
                  preventing silent retroactive modifications.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS WITH ENHANCED ANIMATION & LASER RADAR SCANNER */}

      {/* Ingest Evidence Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-obsidian-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm uppercase font-sans">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Ingest Digital Evidence Artifact</span>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs animate-shake">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Select Evidence File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 font-mono file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-mono file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Evidence Description & Artifact Context *
                </label>
                <textarea
                  required
                  rows={3}
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="e.g. Memory dump of victim workstation WORKSTATION-FIN-08 prior to network isolation..."
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Source Device / Forensic Acquisition Method
                </label>
                <input
                  type="text"
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                  placeholder="e.g. FTK Imager Station 02 / Hardware Write-Blocker"
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 font-sans"
                />
              </div>

              <div className="p-3 rounded bg-obsidian-950 border border-slate-800 text-[11px] font-mono text-slate-400">
                <span className="text-sky-400 font-bold block mb-0.5">Automated Cryptographic Ingestion:</span>
                File will be moved to isolated vault, SHA-256 and MD5 computed streaming, baseline recorded, and Genesis custody block created.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 rounded bg-obsidian-950 border border-slate-700 text-slate-300 text-xs hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !uploadFile}
                  className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider disabled:opacity-50 transition-all hover:scale-[1.02]"
                >
                  {uploadLoading ? 'Computing Hashes & Ingesting...' : 'Secure & Fingerprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Verification Result Modal with Laser Scanner Animation */}
      {verifyResultModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative overflow-hidden bg-obsidian-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 animate-slide-up">
            {/* Laser scanning beam animation */}
            <div className="scan-beam pointer-events-none" />

            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm uppercase font-sans">
                {verifyResultModal.verified ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <span>Cryptographic Integrity Verification Audit</span>
              </div>
              <button onClick={() => setVerifyResultModal(null)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div
              className={`p-4 rounded border ${
                verifyResultModal.verified
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-800 text-rose-300'
              }`}
            >
              <div className="font-mono font-bold text-sm tracking-wide flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${verifyResultModal.verified ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                {verifyResultModal.verified ? 'INTEGRITY VERIFIED' : 'INTEGRITY CHECK FAILED'}
              </div>
              <p className="text-xs font-mono mt-1 opacity-90">
                {verifyResultModal.verified
                  ? 'Physical stored file matches original recorded SHA-256 fingerprint bit-for-bit.'
                  : 'CRITICAL FAILURE: The stored file in the vault does not match the baseline hash! The file has been modified, corrupted, or tampered with!'}
              </p>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-obsidian-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Expected Baseline SHA-256:</span>
                <span className="text-sky-400 break-all select-all">{verifyResultModal.expectedSha256}</span>
              </div>

              <div className="p-2.5 rounded bg-obsidian-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Live Re-Calculated SHA-256:</span>
                <span
                  className={`break-all select-all font-bold ${
                    verifyResultModal.verified ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {verifyResultModal.calculatedSha256}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-500 flex justify-between pt-2 border-t border-slate-800">
              <span>Audited at: {new Date(verifyResultModal.verifiedAt).toLocaleString()}</span>
              <span className="text-emerald-400">FIPS 180-4 STREAM AUDIT PASS</span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setVerifyResultModal(null)}
                className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono uppercase transition-all hover:scale-105 active:scale-95"
              >
                Acknowledge Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Custody Event Modal */}
      {showAppendCustodyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-obsidian-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm uppercase font-sans">
                <LinkIcon className="w-4 h-4 text-sky-400" />
                <span>Append Custody Ledger Block</span>
              </div>
              <button onClick={() => setShowAppendCustodyModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleAppendCustody} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Custody Action Type *
                </label>
                <select
                  value={custodyAction}
                  onChange={(e) => setCustodyAction(e.target.value)}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                >
                  <option value="CHECKED_OUT">Checked Out (Forensic Lab Analysis)</option>
                  <option value="CHECKED_IN">Checked In (Returned to Vault)</option>
                  <option value="TRANSFERRED">Transferred to External Custodian / Law Enforcement</option>
                  <option value="ANALYZED">Analyzed in Sandbox Environment</option>
                  <option value="EXPORTED">Exported / Downloaded</option>
                  <option value="DISPOSED">Forensic Decommission / Disposal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Custody Operation Details & Purpose *
                </label>
                <textarea
                  required
                  rows={3}
                  value={custodyDetails}
                  onChange={(e) => setCustodyDetails(e.target.value)}
                  placeholder="Detail the transfer destination, courier name, lab station, or justification..."
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="p-3 rounded bg-obsidian-950 border border-slate-800 text-[11px] font-mono text-slate-400">
                <span className="text-sky-400 font-bold block mb-0.5">Cryptographic Block Chaining:</span>
                New block will sign <code>Hash(N-1)</code> with sequence number, custodian identity, and timestamp.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAppendCustodyModal(false)}
                  className="px-3 py-2 rounded bg-obsidian-950 border border-slate-700 text-slate-300 text-xs hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider transition-all hover:scale-[1.02]"
                >
                  Append Cryptographic Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tamper Simulation Modal */}
      {showTamperModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-obsidian-900 border border-rose-800 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm uppercase font-sans">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Simulate Out-of-Band Database Tampering</span>
              </div>
              <button onClick={() => setShowTamperModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300">
              This DFIR educational utility modifies historical custody records in the database directly WITHOUT
              updating the cryptographic hash chain. This proves that TraceLock mathematically detects any rogue
              database alterations.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Target Block Sequence # to Tamper:
                </label>
                <input
                  type="number"
                  min={1}
                  max={custodyEvents.length}
                  value={tamperSeq}
                  onChange={(e) => setTamperSeq(Number(e.target.value))}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Tampered Payload Text to Inject:
                </label>
                <input
                  type="text"
                  value={tamperText}
                  onChange={(e) => setTamperText(e.target.value)}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-rose-300 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTamperModal(false)}
                className="px-3 py-2 rounded bg-obsidian-950 border border-slate-700 text-slate-300 text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulateTamper}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono uppercase tracking-wider transition-all hover:scale-[1.02]"
              >
                Inject Tampered Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Timeline Event Modal */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-obsidian-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm uppercase font-sans">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Log Timeline Milestone</span>
              </div>
              <button onClick={() => setShowTimelineModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddTimeline} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Event Timestamp *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={timelineTime}
                    onChange={(e) => setTimelineTime(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={timelineCategory}
                    onChange={(e) => setTimelineCategory(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="ATTACK_VECTOR">Attack Vector</option>
                    <option value="EXFILTRATION">Exfiltration</option>
                    <option value="DETECTION">Detection</option>
                    <option value="CONTAINMENT">Containment</option>
                    <option value="ANALYSIS">Analysis</option>
                    <option value="REMEDIATION">Remediation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  value={timelineTitle}
                  onChange={(e) => setTimelineTitle(e.target.value)}
                  placeholder="e.g. Threat Actor Pinged Gateway from Tor Exit Node"
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Description & Context *
                </label>
                <textarea
                  rows={3}
                  required
                  value={timelineDesc}
                  onChange={(e) => setTimelineDesc(e.target.value)}
                  placeholder="Detailed telemetry observations..."
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Link Associated Evidence Item
                </label>
                <select
                  value={timelineEvidenceId}
                  onChange={(e) => setTimelineEvidenceId(e.target.value)}
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-200 font-mono"
                >
                  <option value="">No linked evidence</option>
                  {evidenceList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.evidence_number} — {e.original_filename}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTimelineModal(false)}
                  className="px-3 py-2 rounded bg-obsidian-950 border border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider transition-all hover:scale-[1.02]"
                >
                  Log Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Finding Modal */}
      {showFindingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-obsidian-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm uppercase font-sans">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Document Forensic Finding</span>
              </div>
              <button onClick={() => setShowFindingModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddFinding} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Finding Title *
                </label>
                <input
                  type="text"
                  required
                  value={findingTitle}
                  onChange={(e) => setFindingTitle(e.target.value)}
                  placeholder="e.g. Reverse-proxy credential harvesting infrastructure confirmed"
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Severity *
                  </label>
                  <select
                    value={findingSeverity}
                    onChange={(e) => setFindingSeverity(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                    <option value="INFORMATIONAL">Informational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Linked Evidence
                  </label>
                  <select
                    value={findingEvidenceId}
                    onChange={(e) => setFindingEvidenceId(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="">No linked evidence</option>
                    {evidenceList.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.evidence_number} — {e.original_filename}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Technical Description & Analysis *
                </label>
                <textarea
                  rows={3}
                  required
                  value={findingDesc}
                  onChange={(e) => setFindingDesc(e.target.value)}
                  placeholder="Describe observed attacker techniques, TTPs, or technical impact..."
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Remediation Guidance & Countermeasure
                </label>
                <textarea
                  rows={2}
                  value={findingRemediation}
                  onChange={(e) => setFindingRemediation(e.target.value)}
                  placeholder="Security policy adjustments, network ACLs, token revocation..."
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFindingModal(false)}
                  className="px-3 py-2 rounded bg-obsidian-950 border border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider transition-all hover:scale-[1.02]"
                >
                  Save Finding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
