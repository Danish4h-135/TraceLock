import React, { useEffect, useState } from 'react';
import { History, Search, Filter, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { AuditLog } from '../types';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actorEmailSearch, setActorEmailSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        targetType: targetTypeFilter || undefined,
        action: actionFilter || undefined,
        actorEmail: actorEmailSearch || undefined,
        limit: 150,
      });
      setLogs(res.auditLogs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [targetTypeFilter, actionFilter, actorEmailSearch]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans uppercase">
            Security & Forensics Audit Trail
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Immutable, Append-Only System Activity & Custodial Operations Ledger
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded bg-obsidian-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh Audit Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-obsidian-950 border border-slate-800 p-3 rounded text-xs">
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Search Actor Email:</label>
          <input
            type="text"
            value={actorEmailSearch}
            onChange={(e) => setActorEmailSearch(e.target.value)}
            placeholder="e.g. sarah.chen@agency.gov"
            className="w-full bg-obsidian-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Filter by Target Resource:</label>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="w-full bg-obsidian-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="">All Resource Types</option>
            <option value="CASE">Case / Investigation</option>
            <option value="EVIDENCE">Evidence Artifact</option>
            <option value="FINDING">Forensic Finding</option>
            <option value="USER">User / Identity</option>
            <option value="SYSTEM">Core System</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Filter by Action:</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-obsidian-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="">All Actions</option>
            <option value="AUTH_LOGIN_SUCCESS">Login Success</option>
            <option value="AUTH_LOGIN_FAILED">Login Failed</option>
            <option value="CASE_CREATED">Case Created</option>
            <option value="EVIDENCE_UPLOADED">Evidence Uploaded</option>
            <option value="EVIDENCE_DOWNLOADED">Evidence Downloaded</option>
            <option value="EVIDENCE_HASH_VERIFIED">Hash Verified</option>
            <option value="CUSTODY_EVENT_RECORDED">Custody Event</option>
            <option value="FORENSIC_REPORT_GENERATED">Report Generated</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-obsidian-950 border border-slate-800 rounded overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-obsidian-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
            <tr>
              <th className="py-3 px-4">Timestamp (UTC)</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Target</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Context Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="py-2.5 px-4 font-bold text-sky-400 whitespace-nowrap">{log.action}</td>
                <td className="py-2.5 px-4 text-slate-200 whitespace-nowrap">{log.actor_email}</td>
                <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                    {log.target_type}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">{log.ip_address}</td>
                <td className="py-2.5 px-4 whitespace-nowrap">
                  <StatusBadge status={log.status} type="action" />
                </td>
                <td className="py-2.5 px-4 text-slate-300 font-sans text-xs max-w-sm truncate">
                  {log.details || '--'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                  No audit logs matching filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
