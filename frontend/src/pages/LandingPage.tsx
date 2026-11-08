import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Brain,
  Code2,
  Database,
  FileSpreadsheet,
  FileText,
  LineChart,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DynamicChart } from '../components/charts/DynamicChart';
import { ChartConfig } from '../types';

export const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chart' | 'sql' | 'insights'>('chart');

  // Interactive sample simulation
  const sampleChart: ChartConfig = {
    type: 'bar',
    title: 'Top 5 Selling Products by Total Revenue',
    x_axis: 'product_name',
    y_axis: 'revenue',
    series_keys: ['revenue'],
    colors: ['#3b82f6'],
    data: [
      { product_name: 'Smart 4K Monitor', revenue: 78540 },
      { product_name: 'UltraBook Pro', revenue: 64200 },
      { product_name: 'Standing Desk Pro', revenue: 52180 },
      { product_name: 'Ergonomic Chair', revenue: 41890 },
      { product_name: 'Wireless Headphones', revenue: 38250 },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800/80 px-6 sm:px-12 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">InsightIQ</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 shadow-md shadow-blue-500/20"
          >
            Start Analyzing Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 sm:px-12 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next-Generation Autonomous Data Analytics Platform</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 leading-tight">
          Turn Raw Datasets into <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">Actionable Business Intelligence</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
          Upload any CSV or Excel file and converse with an autonomous LangGraph agent. Experience real-time DuckDB SQL execution, automated statistical profiling, dynamic charts, predictive forecasting, and executive PDF reports.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all"
          >
            <span>Launch Analyst Agent</span>
            <Play className="h-4 w-4 fill-white" />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all"
          >
            <span>Live Workspace Demo</span>
          </Link>
        </div>

        {/* Live Interactive Preview Card */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-2xl backdrop-blur-md text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-300 font-mono">
                Query: "What were my top five selling products by total revenue?"
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs">
              <button
                onClick={() => setActiveTab('chart')}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  activeTab === 'chart' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chart View
              </button>
              <button
                onClick={() => setActiveTab('sql')}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  activeTab === 'sql' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Verified SQL
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  activeTab === 'insights' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Executive Findings
              </button>
            </div>
          </div>

          <div className="pt-4">
            {activeTab === 'chart' && <DynamicChart config={sampleChart} />}

            {activeTab === 'sql' && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-blue-300">
                <div className="text-slate-500 mb-2">// Sandboxed DuckDB Query Execution (14.2ms)</div>
                <pre className="whitespace-pre-wrap">
{`SELECT 
    "product_name",
    ROUND(SUM("revenue"), 2) AS total_revenue
FROM dataset
WHERE "product_name" IS NOT NULL
GROUP BY "product_name"
ORDER BY total_revenue DESC
LIMIT 5;`}
                </pre>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Sparkles className="h-4 w-4" />
                  <span>Grounding-Audited Analytics Response</span>
                </div>
                <p className="text-slate-300">
                  Across 500 sales records, the <b>Smart 4K Monitor</b> ranks #1 with <b>$78,540</b> in total revenue, followed closely by the <b>UltraBook Pro</b> at $64,200. Together, the top two products generate <b>51.8%</b> of top-5 sales volume.
                </p>
                <div className="pt-2 border-t border-slate-800 text-slate-400">
                  <span className="font-semibold text-slate-200">Recommended Next Steps:</span>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Evaluate supply chain allocation for Smart 4K Monitors to prevent out-of-stock incidents.</li>
                    <li>Package secondary accessories with UltraBook Pro to lift Average Order Value by ~14%.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="px-6 py-20 sm:px-12 border-t border-slate-800/80 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-100">
            Engineered for Precision & Security
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            InsightIQ never invents statistics. Every visual, number, and recommendation is computed through verifiable SQL and statistical tool calls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-blue-500/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 mb-4">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">LangGraph Orchestration</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              7-node autonomous pipeline: Question Understanding, Schema Context Analyzer, Query Planner, Sandboxed Executor, Result Validator, Dynamic Visualizer, and Insight Synthesizer.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-emerald-500/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Zero Arbitrary Execution</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Strict SQL AST parsing, read-only SELECT allowlists, resource timeouts, and user data isolation prevent injection attacks and protect tenant confidentiality.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-purple-500/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-400 mb-4">
              <LineChart className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Predictive Machine Learning</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Integrated Scikit-learn forecasting, Isolation Forest multivariate anomaly detection, and K-Means segmentation with live model quality scores (R², RMSE, Silhouette).
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-xs text-slate-500">
        InsightIQ Autonomous Data Analytics Platform • Enterprise AI System • Production Ready
      </footer>
    </div>
  );
};
