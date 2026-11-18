import React, { useEffect, useState } from 'react';
import {
  FolderLock,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  HardDrive,
  X,
} from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { Case, User as UserType } from '../types';
import { useAuth } from '../context/AuthContext';

interface CasesListViewProps {
  onOpenCase: (caseId: string) => void;
  showNewCaseModal: boolean;
  onCloseNewCaseModal: () => void;
  onOpenNewCaseModal: () => void;
}

export const CasesListView: React.FC<CasesListViewProps> = ({
  onOpenCase,
  showNewCaseModal,
  onCloseNewCaseModal,
  onOpenNewCaseModal,
}) => {
  const { user, isInvestigator } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // New Case Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentType, setIncidentType] = useState('PHISHING');
  const [priority, setPriority] = useState('HIGH');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await api.getCases({
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        incidentType: typeFilter || undefined,
      });
      setCases(data.cases);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [search, statusFilter, priorityFilter, typeFilter]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const res = await api.createCase({
        title,
        description,
        incidentType,
        priority,
      });
      onCloseNewCaseModal();
      setTitle('');
      setDescription('');
      fetchCases();
      if (res.case?.id) {
        onOpenCase(res.case.id);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create case');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans uppercase">
            Investigations Directory
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Active Cyber Defense Cases, Incident Records & Evidence Repositories
          </p>
        </div>

        {isInvestigator && (
          <button
            onClick={onOpenNewCaseModal}
            className="flex items-center gap-2 px-3 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Open New Case</span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-obsidian-950 border border-slate-800 p-3 rounded">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Case ID (e.g. TL-2026), title, keyword..."
            className="w-full bg-obsidian-900 border border-slate-700/80 rounded pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-obsidian-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-obsidian-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Case Table */}
      <div className="bg-obsidian-950 border border-slate-800 rounded overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-obsidian-900 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
            <tr>
              <th className="py-3 px-4">Case Ref</th>
              <th className="py-3 px-4">Investigation Title & Scope</th>
              <th className="py-3 px-4">Incident Type</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Lead Custodian</th>
              <th className="py-3 px-4 text-center">Evidence</th>
              <th className="py-3 px-4 text-right">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {cases.map((c) => (
              <tr
                key={c.id}
                onClick={() => onOpenCase(c.id)}
                className="hover:bg-slate-900/60 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-mono font-medium text-sky-400 whitespace-nowrap">
                  {c.case_number}
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-100">{c.title}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{c.description}</div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                  {c.incident_type}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <StatusBadge status={c.priority} type="priority" />
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <StatusBadge status={c.status} type="status" />
                </td>
                <td className="py-3 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                  {c.lead_investigator_name || 'Unassigned'}
                </td>
                <td className="py-3 px-4 text-center font-mono font-semibold text-slate-200">
                  <span className="px-2 py-0.5 rounded bg-obsidian-900 border border-slate-800">
                    {c.evidence_count ?? 0}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px] whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {cases.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                  No investigations found matching the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-obsidian-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm uppercase font-sans">
                <FolderLock className="w-4 h-4 text-sky-400" />
                <span>Initialize Forensic Investigation</span>
              </div>
              <button onClick={onCloseNewCaseModal} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Investigation Name / Scope *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Operation PhishStorm - Executive Token Exfiltration"
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Incident Classification *
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  >
                    <option value="PHISHING">Phishing</option>
                    <option value="MALWARE">Malware</option>
                    <option value="DATA_BREACH">Data Breach</option>
                    <option value="INSIDER_THREAT">Insider Threat</option>
                    <option value="RANSOMWARE">Ransomware</option>
                    <option value="INCIDENT_RESPONSE">Incident Response</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Priority Rating *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-obsidian-950 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Incident Description & Initial Indicators *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the initial trigger, targeted assets, timestamps, and observed anomalies..."
                  className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseNewCaseModal}
                  className="px-3 py-2 rounded bg-obsidian-950 border border-slate-700 text-slate-300 text-xs hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider disabled:opacity-50"
                >
                  {createLoading ? 'Registering...' : 'Register Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
