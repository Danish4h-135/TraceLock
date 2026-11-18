import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HashDisplayProps {
  hash: string;
  algorithm?: string;
  truncate?: boolean;
  className?: string;
}

export const HashDisplay: React.FC<HashDisplayProps> = ({
  hash,
  algorithm = 'SHA-256',
  truncate = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayHash = truncate && hash.length > 18 ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : hash;

  return (
    <div
      onClick={handleCopy}
      title={`Click to copy ${algorithm} hash:\n${hash}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-obsidian-950 border border-slate-800 text-sky-400 font-mono text-xs cursor-pointer hover:border-slate-700 hover:text-sky-300 transition-colors group ${className}`}
    >
      {algorithm && <span className="text-[10px] text-slate-500 font-sans uppercase">{algorithm}:</span>}
      <span className="select-all tracking-tight">{displayHash}</span>
      <button
        type="button"
        className="text-slate-500 group-hover:text-slate-300 focus:outline-none ml-0.5"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
};
