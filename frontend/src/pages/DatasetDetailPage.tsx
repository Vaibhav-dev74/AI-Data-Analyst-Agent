import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Database,
  Table as TableIcon,
  BarChart3,
  Sparkles,
  Bot,
  Sliders,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { datasetService } from '../services/api';
import { ColumnProfile, Dataset, DatasetPreview } from '../types';
import { DataTable } from '../components/analyst/DataTable';

export const DatasetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [columnsProfile, setColumnsProfile] = useState<ColumnProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'preview' | 'profile' | 'clean'>('preview');
  const [loading, setLoading] = useState(true);
  const [cleanLoading, setCleanLoading] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);

  // Cleaning form state
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [fillNullMethod, setFillNullMethod] = useState('mean');

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [d, p, prof] = await Promise.all([
          datasetService.get(id),
          datasetService.getPreview(id, 100),
          datasetService.getProfile(id),
        ]);
        setDataset(d);
        setPreview(p);
        setColumnsProfile(prof.columns || []);
      } catch (err) {
        console.error('Failed to load dataset details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleClean = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setCleanLoading(true);
      setCleanMsg(null);
      const updated = await datasetService.clean(id, {
        remove_duplicates: removeDuplicates,
        fill_null_method: fillNullMethod,
      });
      setDataset(updated);
      const [newPrev, newProf] = await Promise.all([
        datasetService.getPreview(id, 100),
        datasetService.getProfile(id),
      ]);
      setPreview(newPrev);
      setColumnsProfile(newProf.columns || []);
      setCleanMsg('Dataset cleaned and re-profiled successfully.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to clean dataset.');
    } finally {
      setCleanLoading(false);
    }
  };

  if (loading || !dataset) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
        Inspecting dataset schema...
      </div>
    );
  }

  const profile = dataset.metadata_profile;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back and Action Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/datasets"
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {dataset.name}
              <span className="rounded bg-blue-600/20 border border-blue-500/30 px-2 py-0.5 text-[10px] text-blue-300 uppercase">
                {dataset.file_type}
              </span>
            </h1>
            <p className="text-xs text-slate-400">{dataset.original_filename}</p>
          </div>
        </div>

        <Link
          to={`/chat?dataset=${dataset.id}`}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all"
        >
          <Bot className="h-4 w-4" />
          <span>Converse with AI Analyst</span>
        </Link>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[11px] text-slate-400">Total Rows</span>
          <p className="text-lg font-bold text-white mt-1 font-mono">{dataset.row_count.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[11px] text-slate-400">Columns</span>
          <p className="text-lg font-bold text-white mt-1 font-mono">{dataset.column_count}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[11px] text-slate-400">Missing Rate</span>
          <p className="text-lg font-bold text-amber-400 mt-1 font-mono">{profile?.null_percentage ?? 0}%</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[11px] text-slate-400">Duplicate Rows</span>
          <p className="text-lg font-bold text-slate-300 mt-1 font-mono">{profile?.duplicate_rows ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[11px] text-slate-400">Memory Footprint</span>
          <p className="text-lg font-bold text-slate-300 mt-1 font-mono">{profile?.memory_usage_mb ?? 0} MB</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
          <span className="text-[11px] text-slate-400">Integrity Health</span>
          <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">
            {Math.max(0, 100 - Math.round(profile?.null_percentage ?? 0))}%
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'preview'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TableIcon className="h-4 w-4" />
          <span>Data Table Preview (100 Rows)</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'profile'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Column Profiles & Distributions</span>
        </button>

        <button
          onClick={() => setActiveTab('clean')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === 'clean'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Assisted Data Cleaning</span>
        </button>
      </div>

      {/* Tab 1: Preview */}
      {activeTab === 'preview' && preview && (
        <DataTable data={preview.rows} columns={preview.columns} title={`${dataset.name} Preview`} pageSize={15} />
      )}

      {/* Tab 2: Profile */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {columnsProfile.map((col) => {
              const stats = col.statistics || {};
              return (
                <div key={col.column_name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-200 font-mono">{col.column_name}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 capitalize">
                      {col.data_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500">Missing / Nulls</span>
                      <p className="font-mono text-slate-300">{col.null_count} ({col.null_percentage}%)</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Unique Values</span>
                      <p className="font-mono text-slate-300">{col.unique_count.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Numeric Stats */}
                  {col.data_type === 'numeric' && (
                    <div className="rounded-lg bg-slate-950 p-2.5 text-[11px] font-mono space-y-1 text-slate-400 border border-slate-800/80">
                      <div className="flex justify-between">
                        <span>Mean:</span>
                        <span className="text-slate-200">{stats.mean?.toLocaleString() ?? 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Median:</span>
                        <span className="text-slate-200">{stats.median?.toLocaleString() ?? 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Std Dev:</span>
                        <span className="text-slate-200">{stats.std?.toLocaleString() ?? 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Min / Max:</span>
                        <span className="text-slate-200">{stats.min} / {stats.max}</span>
                      </div>
                    </div>
                  )}

                  {/* Categorical Top Values */}
                  {stats.top_values && (
                    <div className="space-y-1 text-[11px]">
                      <span className="text-[10px] text-slate-500">Top Frequencies:</span>
                      {Object.entries(stats.top_values).map(([val, count]) => (
                        <div key={val} className="flex justify-between text-slate-300 font-mono text-[10px]">
                          <span className="truncate max-w-[140px]">{val}</span>
                          <span className="text-blue-400">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Cleaning */}
      {activeTab === 'clean' && (
        <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Automated Cleaning Routines</h3>
            <p className="text-xs text-slate-400 mt-1">
              Apply in-memory data hygiene transforms to eliminate duplicate rows and impute missing values.
            </p>
          </div>

          {cleanMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{cleanMsg}</span>
            </div>
          )}

          <form onSubmit={handleClean} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div>
                <p className="text-xs font-semibold text-slate-200">Deduplicate Rows</p>
                <p className="text-[11px] text-slate-400">
                  Detects and purges identical record instances (detected {profile?.duplicate_rows || 0} duplicates).
                </p>
              </div>
              <input
                type="checkbox"
                checked={removeDuplicates}
                onChange={(e) => setRemoveDuplicates(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Missing Value Imputation Strategy
              </label>
              <p className="text-[11px] text-slate-400">
                Fill null cells across numerical and categorical features.
              </p>
              <select
                value={fillNullMethod}
                onChange={(e) => setFillNullMethod(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="mean">Mean (Numerical average)</option>
                <option value="median">Median (Outlier-resistant 50th percentile)</option>
                <option value="zero">Constant Zero (0)</option>
                <option value="mode">Mode (Most frequent category)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={cleanLoading}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              {cleanLoading ? 'Cleaning dataset...' : 'Apply Cleaning Transforms'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
