import React from 'react';
import { Shield, Lock, User, LogOut, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, quickSwitch } = useAuth();

  return (
    <header className="h-14 border-b border-slate-800 bg-obsidian-950/90 backdrop-blur px-5 flex items-center justify-between sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200">
          <Shield className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-white uppercase font-sans">TRACELOCK</span>
            <span className="px-1.5 py-0.2 text-[10px] font-mono bg-sky-950 text-sky-400 border border-sky-800/60 rounded">
              SEC-DFIR
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono tracking-tight hidden sm:block">
            SECURE EVIDENCE. TRUSTED INVESTIGATIONS.
          </div>
        </div>
      </div>

      {/* Engine Status */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-obsidian-900 border border-slate-800/80 rounded text-xs font-mono text-slate-400">
        <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>SHA-256 INTEGRITY ENGINE: <strong className="text-emerald-400">ONLINE</strong></span>
        <span className="text-slate-600">&bull;</span>
        <span className="text-slate-500">CUSTODY CHAIN: <strong className="text-sky-400">TAMPER-EVIDENT</strong></span>
      </div>

      {/* Demo Role Switcher & User Profile */}
      <div className="flex items-center gap-4">
        {/* Quick Demo Switcher */}
        <div className="hidden md:flex items-center gap-1 bg-obsidian-900 border border-slate-800 p-1 rounded text-xs">
          <span className="text-[10px] font-mono text-slate-500 px-1.5 uppercase">Switch Demo Role:</span>
          <button
            onClick={() => quickSwitch('ADMIN')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              user?.role === 'ADMIN'
                ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => quickSwitch('INVESTIGATOR')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              user?.role === 'INVESTIGATOR'
                ? 'bg-sky-950 text-sky-300 border border-sky-800 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Investigator
          </button>
          <button
            onClick={() => quickSwitch('VIEWER')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              user?.role === 'VIEWER'
                ? 'bg-slate-800 text-slate-200 border border-slate-600 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Viewer
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200">{user.name}</div>
              <div className="text-[10px] font-mono text-slate-500 flex items-center justify-end gap-1">
                <span className="text-sky-400">{user.role}</span>
                {user.badgeNumber && <span>&bull; {user.badgeNumber}</span>}
              </div>
            </div>

            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4 text-slate-400" />
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded border border-transparent hover:border-rose-900/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
