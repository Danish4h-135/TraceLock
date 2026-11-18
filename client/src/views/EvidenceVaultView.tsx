import React, { useEffect, useState } from 'react';
import { HardDrive, Search, Download, ShieldCheck, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { HashDisplay } from '../components/HashDisplay';
import { EvidenceItem } from '../types';

interface EvidenceVaultViewProps {
  onOpenCase: (caseId: string) => void;
}

export const EvidenceVaultView: React.FC<EvidenceVaultViewProps> = ({ onOpenCase }) => {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchVault = async () => {
    setLoading(true);
    try {
      // Fetch cases to aggregate all evidence items
      const casesRes = await api.getCases();
      const allEvPromises = casesRes.cases.map((c) => api.getEvidenceByCase(c.id));
      const evResults = await Promise.all(allEvPromises);
      const combined = evResults.flatMap((r) => r.evidence);
      setEvidenceList(combined);
    } catch (err) {
      console.error('Failed to load vault items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, []);

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const res = await api.verifyEvidenceIntegrity(id);
      alert(`Cryptographic Audit Result: ${res.result}\nExpected: ${res.expectedSha256}\nCalculated: ${res.calculatedSha256}`);
      fetchVault();
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const filtered = evidenceList.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.evidence_number.toLowerCase().includes(q) ||
      e.original_filename.toLowerCase().includes(q) ||
      e.sha256.toLowerCase().includes(q) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans uppercase">
            Central Digital Evidence Vault
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Cryptographically Preserved Forensic Artifacts & SHA-256 Baseline Matrix
          </p>
        </div>

        <button
          onClick={fetchVault}
          className="p-2 rounded bg-obsidian-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh Vault"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-obsidian-950 border border-slate-800 p-3 rounded">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Evidence ID (EVD-001), filename, SHA-256 fingerprint, or keyword..."
            className="w-full bg-obsidian-900 border border-slate-700/80 rounded pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Evidence Table */}
      <div className="bg-obsidian-950 border border-slate-800 rounded overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-obsidian-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
            <tr>
              <th className="py-3 px-4">Artifact ID</th>
              <th className="py-3 px-4">Filename & Context</th>
              <th className="py-3 px-4">MIME / Size</th>
              <th className="py-3 px-4">Baseline Cryptographic Fingerprint (SHA-256)</th>
              <th className="py-3 px-4">Custody Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                  {e.evidence_number}
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-200">{e.original_filename}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">{e.description}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Location: {e.custody_location}
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                  <div>{e.mime_type}</div>
                  <div className="text-slate-500">{(e.file_size / 1024).toFixed(1)} KB</div>
                </td>
                <td className="py-3 px-4">
                  <HashDisplay hash={e.sha256} />
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <StatusBadge status={e.status} type="status" />
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                  <button
                    onClick={() => handleVerify(e.id)}
                    disabled={verifyingId === e.id}
                    title="Audit live hash"
                    className="px-2 py-1 rounded bg-obsidian-900 border border-slate-700 hover:border-sky-500 text-sky-300 font-mono text-[11px]"
                  >
                    {verifyingId === e.id ? 'Auditing...' : 'Live Re-Hash'}
                  </button>

                  <button
                    onClick={() => onOpenCase(e.case_id)}
                    className="px-2 py-1 rounded bg-obsidian-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-mono text-[11px]"
                  >
                    Go To Case &rarr;
                  </button>

                  <a
                    href={api.downloadEvidenceUrl(e.id)}
                    title="Download evidence"
                    className="inline-block p-1 rounded bg-obsidian-900 border border-slate-700 text-slate-400 hover:text-emerald-400"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                  No evidence items matching the search query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
