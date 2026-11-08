import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  Database,
  FileSpreadsheet,
  FileText,
  Plus,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { userService, datasetService } from '../services/api';
import { DashboardStats, Dataset } from '../types';
import { DynamicChart } from '../components/charts/DynamicChart';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, d] = await Promise.all([
          userService.getDashboardStats(),
          datasetService.list(),
        ]);
        setStats(s);
        setDatasets(d);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Activity chart
  const activityChartConfig = {
    type: 'bar' as const,
    title: 'Platform Utilization Metrics',
    x_axis: 'metric',
    y_axis: 'count',
    series_keys: ['count'],
    colors: ['#3b82f6'],
    data: [
      { metric: 'Datasets', count: stats?.total_datasets || 0 },
      { metric: 'Sessions', count: stats?.total_analyses || 0 },
      { metric: 'Messages', count: stats?.total_messages || 0 },
      { metric: 'Reports', count: stats?.total_reports || 0 },
    ],
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-blue-950/20 to-slate-900 p-6 backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Executive Analytics Hub
            <Sparkles className="h-5 w-5 text-blue-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Monitor real-time analysis sessions, dataset ingestion pipelines, and ML projections.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/datasets"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Upload Dataset</span>
          </Link>
          <Link
            to="/chat"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Start AI Analysis</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Uploaded Datasets</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.total_datasets || 0}</span>
            <span className="text-[11px] text-emerald-400 font-medium">Active Partition</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total AI Queries</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.total_messages || 0}</span>
            <span className="text-[11px] text-slate-400 font-medium">Verified Computations</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Executive Reports</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.total_reports || 0}</span>
            <span className="text-[11px] text-purple-400 font-medium">PDF & Excel</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Analysis Sessions</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.total_analyses || 0}</span>
            <span className="text-[11px] text-amber-400 font-medium">Interactive Workflows</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Utilization Chart */}
        <div className="lg:col-span-2">
          <DynamicChart config={activityChartConfig} />
        </div>

        {/* Right: Recent Activity Audit Trail */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-200">Recent Audit Trail</h3>
            </div>
            <span className="text-[10px] text-slate-500">Live Feed</span>
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto max-h-72">
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              stats.recent_activity.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-300 capitalize">
                      {act.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">No recent activity logged yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Datasets Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Recent Datasets</h3>
            <p className="text-xs text-slate-400">Available datasets ready for natural language conversation</p>
          </div>
          <Link
            to="/datasets"
            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            <span>View All</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          {datasets.length > 0 ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Dataset Name</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3">Records</th>
                  <th className="py-2.5 px-3">Columns</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {datasets.slice(0, 5).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-sans font-medium text-slate-200 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                      <span>{d.name}</span>
                    </td>
                    <td className="py-3 px-3 uppercase text-[11px] text-slate-400">{d.file_type}</td>
                    <td className="py-3 px-3 text-blue-300">{d.row_count.toLocaleString()}</td>
                    <td className="py-3 px-3 text-slate-300">{d.column_count}</td>
                    <td className="py-3 px-3 font-sans text-slate-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <Link
                        to={`/chat?dataset=${d.id}`}
                        className="rounded-md bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs font-medium text-blue-300 hover:bg-blue-600/30"
                      >
                        Ask Agent
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <Database className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p>No datasets uploaded yet.</p>
              <Link to="/datasets" className="mt-2 inline-block text-blue-400 hover:underline">
                Upload your first dataset
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
