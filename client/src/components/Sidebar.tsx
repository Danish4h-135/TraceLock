import React from 'react';
import {
  LayoutDashboard,
  FolderLock,
  HardDrive,
  FileCheck2,
  History,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, caseId?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'SOC Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Investigations', icon: FolderLock },
    { id: 'evidence', label: 'Evidence Vault', icon: HardDrive },
    { id: 'audit', label: 'Security Audit Trail', icon: History },
    { id: 'lab', label: 'DFIR Crypto Lab', icon: FlaskConical },
  ];

  return (
    <aside className="w-60 border-r border-slate-800 bg-obsidian-950 flex flex-col justify-between shrink-0 h-[calc(100vh-3.5rem)]">
      {/* Nav List */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          Forensics Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'cases' && currentView === 'case-workspace');

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-sky-400 border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-900 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Security Status Box */}
      <div className="p-3 border-t border-slate-800/80 bg-obsidian-950">
        <div className="p-2.5 rounded bg-obsidian-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>FIPS-180-4 COMPLIANT</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
            Streaming cryptographic digests with tamper-evident chain linking.
          </p>
          <div className="mt-2 text-[10px] font-mono text-slate-600 flex justify-between">
            <span>TraceLock DFIR v1.0</span>
            <span>SECURED</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
