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
import axios from 'axios';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    try {
      setChecking(true);
      const res = await axios.get('/api/health');
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Theme & UI Appearance</h3>
            <p className="text-xs text-slate-400 mt-0.5">Toggle between enterprise Dark and Light visual themes</p>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-blue-400" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
