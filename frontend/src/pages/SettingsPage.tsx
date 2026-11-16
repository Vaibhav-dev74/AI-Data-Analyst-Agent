import React, { useEffect, useState } from 'react';
import {
  Settings,
  Bot,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle,
  Moon,
  Sun,
  Activity,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    try {
      setChecking(true);
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err) {
      setHealth({ status: 'unreachable' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          System Configuration & Settings
          <Settings className="h-5 w-5 text-slate-400" />
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Environment parameters, AI provider integration, and runtime health status.
        </p>
      </div>

      <div className="space-y-6">
        {/* Backend & AI Provider Status */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">AI Engine & Model Provider</h3>
            </div>
            <button
              onClick={checkHealth}
              disabled={checking}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              <Activity className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
              <span>Verify Ping</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-slate-400 text-[11px]">Configured Provider</span>
              <p className="mt-1 font-semibold text-white capitalize">
                {health?.provider || 'Google Gemini / Local Fallback'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-slate-400 text-[11px]">Runtime Gateway</span>
              <p className="mt-1 font-semibold text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                {health?.status === 'healthy' ? 'Online & Healthy' : 'Checking...'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-slate-400 text-[11px]">Agent Pipeline</span>
              <p className="mt-1 font-semibold text-indigo-400">LangGraph 7-Node Graph</p>
            </div>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-blue-400">Provider Note:</span> External LLM keys (Gemini API or OpenAI API) are read securely from backend environment variables (<code className="text-blue-300 font-mono">.env</code>). When an API key is not supplied, the platform automatically utilizes its high-precision local deterministic analytical engine without interruption.
          </div>
        </div>

        {/* Database & Sandboxing Engine */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Database className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Database & Sandboxing Engine</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
                <Cpu className="h-4 w-4 text-blue-400" />
                <span>Analytical SQL Engine</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                DuckDB 2.0 In-Memory Engine with vectorized columnar query execution. Read-only view isolation per dataset partition.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Metadata Persistence</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                SQLAlchemy ORM with Alembic schema migrations. Configurable for Supabase PostgreSQL in production or SQLite locally.
              </p>
            </div>
          </div>
        </div>

        {/* Appearance & Preferences */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Theme & UI Appearance</span>
              <span className="rounded bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
                {theme} active
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Toggle between enterprise Dark and Light visual themes across all workspaces and dashboards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-900/30 text-blue-400 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="h-4 w-4 text-blue-500" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
