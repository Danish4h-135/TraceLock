import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('investigator@tracelock.sec');
  const [password, setPassword] = useState('Investigator2026!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-obsidian-900 border border-slate-800 rounded-lg p-7 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 mb-3 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans uppercase">TRACELOCK</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">SECURE EVIDENCE. TRUSTED INVESTIGATIONS.</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Investigator Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono transition-colors"
              placeholder="analyst@agency.gov"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Access Token / Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-obsidian-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono transition-colors"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="font-mono">Authenticating Token...</span>
            ) : (
              <>
                <span>Access Forensics Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Select Pre-configured Demo Identity:</span>
          </div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => handleSelectDemo('admin@tracelock.sec', 'TraceLockAdmin2026!')}
              className="w-full text-left p-2 rounded bg-obsidian-950 border border-slate-800 hover:border-slate-700 flex justify-between items-center transition-colors"
            >
              <div>
                <span className="font-medium text-slate-200">Agent Marcus Vance</span>
                <span className="text-[10px] text-slate-500 block font-mono">admin@tracelock.sec</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                ADMIN
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemo('investigator@tracelock.sec', 'Investigator2026!')}
              className="w-full text-left p-2 rounded bg-obsidian-950 border border-slate-800 hover:border-slate-700 flex justify-between items-center transition-colors"
            >
              <div>
                <span className="font-medium text-slate-200">Sarah Chen</span>
                <span className="text-[10px] text-slate-500 block font-mono">investigator@tracelock.sec</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                INVESTIGATOR
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDemo('viewer@tracelock.sec', 'Viewer2026!')}
              className="w-full text-left p-2 rounded bg-obsidian-950 border border-slate-800 hover:border-slate-700 flex justify-between items-center transition-colors"
            >
              <div>
                <span className="font-medium text-slate-200">David Ross, Esq.</span>
                <span className="text-[10px] text-slate-500 block font-mono">viewer@tracelock.sec</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                VIEWER
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
