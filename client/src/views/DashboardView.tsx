import React, { useEffect, useState } from 'react';
import {
  FolderLock,
  HardDrive,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Activity,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { DashboardMetrics, Case, AuditLog } from '../types';

interface DashboardViewProps {
  onNavigate: (view: string, caseId?: string) => void;
  onNewCase: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onNewCase }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboard();
      setMetrics(data.metrics);
      setRecentCases(data.recentCases);
      setRecentAudit(data.recentAudit);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white font-sans uppercase">
              Security Operations & DFIR Center
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Active Digital Forensics Workspace & Evidence Custody Ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            title="Refresh Metrics"
            className="p-2 rounded bg-obsidian-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          <button
            onClick={onNewCase}
            className="flex items-center gap-2 px-3.5 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(2,132,199,0.3)] hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="forensic-card bg-obsidian-950 border border-slate-800 p-4 rounded group cursor-default">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Active Cases</span>
            <div className="p-1.5 rounded bg-sky-950/60 border border-sky-800/40 text-sky-400 group-hover:border-sky-500/60 transition-colors">
              <FolderLock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono group-hover:text-sky-300 transition-colors">
            {metrics?.activeCases ?? '--'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics?.totalCases ?? 0} Total Registered ({metrics?.closedCases ?? 0} Closed)
          </div>
        </div>

        <div className="forensic-card bg-obsidian-950 border border-slate-800 p-4 rounded group cursor-default">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Evidence Inventory</span>
            <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono group-hover:text-emerald-300 transition-colors">
            {metrics?.totalEvidence ?? '--'}
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-1 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>100% In Vault Tier-1</span>
          </div>
        </div>

        <div className="forensic-card bg-obsidian-950 border border-slate-800 p-4 rounded group cursor-default">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Integrity Verifications</span>
            <div className="p-1.5 rounded bg-sky-950/60 border border-sky-800/40 text-sky-400 group-hover:border-sky-500/60 transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono group-hover:text-sky-300 transition-colors">
            {metrics?.verifiedChecks ?? '--'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {metrics?.compromisedChecks ? (
              <span className="text-rose-400 font-semibold">{metrics.compromisedChecks} Compromised</span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Zero Integrity Violations
              </span>
            )}
          </div>
        </div>

        <div className="forensic-card bg-obsidian-950 border border-slate-800 p-4 rounded group cursor-default">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Critical Findings</span>
            <div className="p-1.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-400 group-hover:border-rose-500/60 transition-colors">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {metrics?.criticalFindings ?? '--'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            High-severity threat indicators
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Cases & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases (2 Columns) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-sky-400" />
              <span>Priority Investigations</span>
            </h2>
            <button
              onClick={() => onNavigate('cases')}
              className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors hover:translate-x-0.5"
            >
              <span>View All Cases</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-obsidian-950 border border-slate-800 rounded overflow-hidden shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-obsidian-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Investigation Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {recentCases.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => onNavigate('case-workspace', c.id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-all duration-150 hover:pl-1 group"
                  >
                    <td className="py-2.5 px-3 font-mono font-medium text-sky-400 group-hover:text-sky-300">
                      {c.case_number}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">
                      <div className="truncate max-w-xs group-hover:text-white transition-colors">{c.title}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{c.incident_type}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.priority} type="priority" />
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.status} type="status" />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300 group-hover:text-emerald-400 transition-colors">
                      {c.evidence_count ?? 0}
                    </td>
                  </tr>
                ))}
                {recentCases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                      No investigations currently logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Security Audit Feed (1 Column) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Immutable Audit Feed</span>
            </h2>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors hover:translate-x-0.5"
            >
              <span>Full Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-obsidian-950 border border-slate-800 rounded p-3 space-y-2.5 max-h-[380px] overflow-y-auto shadow-lg">
            {recentAudit.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded bg-obsidian-900 border border-slate-800 hover:border-slate-700 text-xs space-y-1 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block opacity-75" />
                    {new Date(log.created_at).toLocaleTimeString()} &bull; {log.ip_address}
                  </span>
                  <StatusBadge status={log.status} type="action" />
                </div>
                <div className="font-mono text-[11px] font-semibold text-slate-200">
                  {log.action}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Actor: <span className="text-sky-300 font-mono">{log.actor_email}</span>
                </div>
              </div>
            ))}
            {recentAudit.length === 0 && (
              <div className="py-6 text-center text-slate-500 font-mono text-xs">
                No recent audit events.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
