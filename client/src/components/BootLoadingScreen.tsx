import React, { useEffect, useState } from 'react';
import { Shield, Activity, Lock, Terminal, CheckCircle2 } from 'lucide-react';

interface BootLoadingScreenProps {
  onComplete?: () => void;
  message?: string;
}

export const BootLoadingScreen: React.FC<BootLoadingScreenProps> = ({ onComplete, message }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(15);

  const bootMessages = [
    'MOUNTING FORENSIC STORAGE VAULT (TIER-1 ISOLATION)...',
    'CALIBRATING FIPS 180-4 STREAMING HASH ENGINES (SHA-256)...',
    'AUDITING TAMPER-EVIDENT CUSTODY ANCHORS...',
    'ENFORCING ZERO-EXECUTION FILE VAULT PERMISSIONS...',
    'TRACELOCK DEFENSE CONSOLE READY.',
  ];

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < bootMessages.length) {
        setLogs((prev) => [...prev, bootMessages[currentIdx]]);
        setProgress((prev) => Math.min(prev + 20, 100));
        currentIdx++;
      } else {
        clearInterval(interval);
        if (onComplete) {
          setTimeout(onComplete, 300);
        }
      }
    }, 280);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center p-6 text-slate-300 font-mono relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-gradient from-sky-950/20 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-lg bg-obsidian-900 border border-slate-800 rounded-lg p-6 shadow-2xl relative z-10 space-y-5 animate-slide-up">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-[11px] text-slate-500 uppercase tracking-widest ml-1 font-semibold">
              TRACELOCK SYSTEM BOOT
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sky-400">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="text-[10px]">DIAGNOSTIC v1.0</span>
          </div>
        </div>

        {/* Brand Center */}
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 shadow-inner">
            <Shield className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wider font-sans uppercase">
              TRACELOCK EVIDENCE DEFENSE
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              SECURE EVIDENCE. TRUSTED INVESTIGATIONS.
            </div>
          </div>
        </div>

        {/* Terminal Boot Sequence Logs */}
        <div className="bg-obsidian-950 border border-slate-800/90 rounded p-3 text-[11px] text-slate-400 space-y-1.5 min-h-[140px] font-mono leading-relaxed">
          <div className="text-slate-600">// INITIALIZING SECURITY HARDENING SUBSYSTEMS</div>
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-300 animate-fade-in">
              <span className="text-sky-500 text-[10px]">▶</span>
              <span className={i === logs.length - 1 ? 'text-emerald-400 font-semibold' : ''}>{log}</span>
            </div>
          ))}
          {logs.length < bootMessages.length && (
            <div className="flex items-center gap-1 text-sky-400 animate-pulse">
              <span>_</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>CRYPTOGRAPHIC SELF-TEST</span>
            <span className="text-sky-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-obsidian-950 rounded overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-600 to-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
