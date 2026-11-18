import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'priority' | 'severity' | 'integrity' | 'action';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status', size = 'sm' }) => {
  const norm = status.toUpperCase().replace(/\s+/g, '_');

  let style = 'bg-slate-800 text-slate-300 border-slate-700';

  if (
    norm === 'INTEGRITY_VERIFIED' ||
    norm === 'CHAIN_INTEGRITY_VERIFIED' ||
    norm === 'VERIFIED' ||
    norm === 'RESOLVED' ||
    norm === 'CONFIRMED' ||
    norm === 'SUCCESS' ||
    norm === 'SECURED'
  ) {
    style = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
  } else if (
    norm === 'INTEGRITY_COMPROMISED' ||
    norm === 'CHAIN_INTEGRITY_COMPROMISED' ||
    norm === 'FAILED' ||
    norm === 'FAILURE' ||
    norm === 'CRITICAL' ||
    norm === 'DENIED'
  ) {
    style = 'bg-rose-950/80 text-rose-400 border-rose-800/80';
  } else if (
    norm === 'HIGH' ||
    norm === 'ON_HOLD' ||
    norm === 'CHECKED_OUT' ||
    norm === 'REFUTED'
  ) {
    style = 'bg-amber-950/80 text-amber-400 border-amber-800/80';
  } else if (
    norm === 'MEDIUM' ||
    norm === 'IN_PROGRESS' ||
    norm === 'OPEN' ||
    norm === 'ANALYZED'
  ) {
    style = 'bg-sky-950/80 text-sky-400 border-sky-800/80';
  } else if (
    norm === 'LOW' ||
    norm === 'INFORMATIONAL' ||
    norm === 'CLOSED' ||
    norm === 'DRAFT' ||
    norm === 'DISPOSED'
  ) {
    style = 'bg-slate-900 text-slate-400 border-slate-700';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border tracking-wider uppercase ${padding} ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
