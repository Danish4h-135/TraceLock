import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  FileCode,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  AlertTriangle,
  Zap,
  Activity,
} from 'lucide-react';
import { api } from '../api';
import { EvidenceItem } from '../types';

export const VerificationLabView: React.FC = () => {
  // Tool 1: Live Interactive Hasher (Web Crypto API)
  const [inputText, setInputText] = useState('TraceLock: Secure Evidence. Trusted Investigations. 2026');
  const [liveSha256, setLiveSha256] = useState('');
  const [liveSha1, setLiveSha1] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Tool 2: Server-Side Physical File Corruption Test
  const [seedEvidence, setSeedEvidence] = useState<EvidenceItem[]>([]);
  const [selectedEvId, setSelectedEvId] = useState<string>('');
  const [corruptionStatus, setCorruptionStatus] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [testingLoading, setTestingLoading] = useState(false);

  // Compute live client hashes
  useEffect(() => {
    setIsTyping(true);
    const compute = async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode(inputText);

      // SHA-256
      const hash256Buffer = await crypto.subtle.digest('SHA-256', data);
      const hash256Array = Array.from(new Uint8Array(hash256Buffer));
      const hash256Hex = hash256Array.map((b) => b.toString(16).padStart(2, '0')).join('');
      setLiveSha256(hash256Hex);

      // SHA-1
      const hash1Buffer = await crypto.subtle.digest('SHA-1', data);
      const hash1Array = Array.from(new Uint8Array(hash1Buffer));
      const hash1Hex = hash1Array.map((b) => b.toString(16).padStart(2, '0')).join('');
      setLiveSha1(hash1Hex);

      setTimeout(() => setIsTyping(false), 200);
    };

    compute();
  }, [inputText]);

  // Load seed evidence for physical test harness
  useEffect(() => {
    const loadEvidence = async () => {
      try {
        const casesRes = await api.getCases();
        if (casesRes.cases.length > 0) {
          const evRes = await api.getEvidenceByCase(casesRes.cases[0].id);
          setSeedEvidence(evRes.evidence);
          if (evRes.evidence.length > 0) {
            setSelectedEvId(evRes.evidence[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading seed evidence:', err);
      }
    };
    loadEvidence();
  }, []);

  const handleCorruptFile = async () => {
    if (!selectedEvId) return;
    setTestingLoading(true);
    try {
      const res = await api.simulateFileCorruption(selectedEvId);
      setCorruptionStatus(res.message);
      setVerifyResult(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTestingLoading(false);
    }
  };

  const handleRunVerify = async () => {
    if (!selectedEvId) return;
    setTestingLoading(true);
    try {
      const res = await api.verifyEvidenceIntegrity(selectedEvId);
      setVerifyResult(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTestingLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-fade-in">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-white font-sans uppercase flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-sky-400" />
          <span>DFIR Cryptographic Verification Laboratory</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Empirical Validation Harness: Real SHA-256 Streaming Verification & Tamper-Evident Chain Mechanics
        </p>
      </div>

      {/* LAB SECTION 1: INTERACTIVE REAL-TIME CRYPTO HASHER */}
      <div className="forensic-card bg-obsidian-950 border border-slate-800 rounded p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
              1. Cryptographic Primitive Demonstration (FIPS 180-4 Standard)
            </h2>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <Activity className={`w-3.5 h-3.5 ${isTyping ? 'text-sky-400 animate-pulse' : 'text-slate-600'}`} />
            <span>REAL-TIME STREAM HASHING</span>
          </span>
        </div>

        <p className="text-xs text-slate-300 font-sans">
          TraceLock calculates actual bit-level cryptographic hashes on every ingested artifact. Notice that altering
          even a single character causes the entire SHA-256 fingerprint to avalanche to a completely different 256-bit digest.
        </p>

        <div>
          <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
            Test Payload String:
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500 transition-colors shadow-inner"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div
            className={`p-3 rounded bg-obsidian-900 border transition-all duration-150 space-y-1 ${
              isTyping ? 'border-sky-500/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]' : 'border-slate-800'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase">
              <span>Computed SHA-256 (64 hex):</span>
              <span className="text-emerald-400">256 BITS</span>
            </div>
            <div className="font-mono text-xs text-emerald-400 select-all break-all tracking-tight font-semibold">
              {liveSha256}
            </div>
          </div>

          <div
            className={`p-3 rounded bg-obsidian-900 border transition-all duration-150 space-y-1 ${
              isTyping ? 'border-sky-500/80 shadow-[0_0_12px_rgba(56,189,248,0.2)]' : 'border-slate-800'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase">
              <span>Computed SHA-1 (40 hex):</span>
              <span className="text-sky-400">160 BITS</span>
            </div>
            <div className="font-mono text-xs text-sky-400 select-all break-all tracking-tight font-semibold">
              {liveSha1}
            </div>
          </div>
        </div>
      </div>

      {/* LAB SECTION 2: LIVE PHYSICAL FILE CORRUPTION & DETECTION HARNESS */}
      <div className="forensic-card bg-obsidian-950 border border-slate-800 rounded p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
            2. Empirical File Tamper & Cryptographic Detection Test
          </h2>
        </div>

        <p className="text-xs text-slate-300 font-sans">
          To prove that TraceLock's integrity checks are not simulations or static hardcoded flags, this test harness
          allows you to deliberately flip 1 byte of an actual physical file in the server's storage vault. Then, execute
          a live re-hash audit to watch TraceLock catch the corruption in real-time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Select Target Stored Vault Artifact:
            </label>
            <select
              value={selectedEvId}
              onChange={(e) => setSelectedEvId(e.target.value)}
              className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-2 text-xs text-sky-300 font-mono"
            >
              {seedEvidence.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.evidence_number} — {e.original_filename} ({e.file_size} bytes)
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCorruptFile}
              disabled={testingLoading || !selectedEvId}
              className="px-3.5 py-2 rounded bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-mono uppercase font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              1. Corrupt 1 Byte
            </button>
            <button
              onClick={handleRunVerify}
              disabled={testingLoading || !selectedEvId}
              className="px-3.5 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono uppercase font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md"
            >
              2. Run Audit
            </button>
          </div>
        </div>

        {corruptionStatus && (
          <div className="p-3.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-mono animate-slide-up">
            {corruptionStatus}
          </div>
        )}

        {/* Verification Output */}
        {verifyResult && (
          <div
            className={`p-4 rounded border space-y-2 animate-slide-up ${
              verifyResult.verified
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/50 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2 font-mono font-bold text-sm">
              {verifyResult.verified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
              <span>RESULT: {verifyResult.result}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono pt-2">
              <div className="p-2 rounded bg-obsidian-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Recorded Baseline Hash:</span>
                <span className="text-sky-300 break-all">{verifyResult.expectedSha256}</span>
              </div>
              <div className="p-2 rounded bg-obsidian-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Live Recomputed Hash:</span>
                <span className={`break-all font-bold ${verifyResult.verified ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {verifyResult.calculatedSha256}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LAB SECTION 3: TAMPER-EVIDENT CHAIN OF CUSTODY MATHEMATICS */}
      <div className="forensic-card bg-obsidian-950 border border-slate-800 rounded p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-bold">
            3. Tamper-Evident Chained Hash Architecture Specification
          </h2>
        </div>

        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          TraceLock uses a sequential cryptographic hash-chained ledger modeled after modern distributed ledger technology:
        </p>

        <div className="p-4 rounded bg-obsidian-900 border border-slate-800 font-mono text-xs text-sky-300 space-y-2 overflow-x-auto shadow-inner">
          <div>// Genesis Anchor:</div>
          <div className="text-slate-400">Hash(0) = SHA-256("TRACELOCK_GENESIS" | EvidenceID | EvidenceSHA256 | CreatedAt)</div>
          <div className="mt-2">// Sequential Custody Block Formula:</div>
          <div className="text-emerald-400">
            Hash(N) = SHA-256(Hash(N-1) | SequenceNumber | EvidenceID | Action | CustodianID | Timestamp | Details)
          </div>
        </div>

        <p className="text-xs text-slate-400 font-sans">
          Because each block <code>N</code> incorporates the digest of block <code>N-1</code>, any retroactive modification of
          a historical timestamp, custodian identity, or evidence action alters that block's hash. This immediately breaks
          the chain link for every subsequent block, rendering unauthorized tampering mathematically detectable upon verification.
        </p>
      </div>
    </div>
  );
};
