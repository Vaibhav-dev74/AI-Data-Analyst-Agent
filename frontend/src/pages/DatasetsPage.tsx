import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  Eye,
  Bot,
  AlertCircle,
  CheckCircle2,
  Search,
  Sparkles,
} from 'lucide-react';
import { datasetService } from '../services/api';
import { Dataset } from '../types';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const list = await datasetService.list();
      setDatasets(list);
    } catch (err: any) {
      setError('Failed to retrieve datasets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setSuccessMsg(null);
    setUploading(true);
    try {
      const created = await datasetService.upload(file);
      setSuccessMsg(`Successfully uploaded and profiled "${created.name}" (${created.row_count.toLocaleString()} rows).`);
      await loadDatasets();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'File upload failed. Ensure it is a valid CSV or Excel file under 50MB.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete dataset "${name}"?`)) return;
    try {
      await datasetService.delete(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
      setSuccessMsg(`Dataset "${name}" deleted.`);
    } catch (err) {
      setError('Failed to delete dataset.');
    }
  };

  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.original_filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Dataset Management
            <Database className="h-5 w-5 text-blue-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Upload, profile, clean, and manage structured CSV and Excel files for autonomous AI analysis.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-8 text-center transition-all hover:border-blue-500/60 hover:bg-slate-900/70 cursor-pointer"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 group-hover:scale-105 transition-transform">
          {uploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-200">
          {uploading ? 'Analyzing and profiling schema...' : 'Drag and drop your dataset here, or click to browse'}
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Supports CSV, XLSX, and XLS formats up to 50MB. Automatic data type inference, duplicate detection, and parametric profiling.
        </p>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono">.csv</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono">.xlsx</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono">.xls</span>
        </div>
      </div>

      {/* Dataset Directory Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">Ingested Datasets</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
              {filtered.length} total
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-56 rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading datasets...</div>
          ) : filtered.length > 0 ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-3 px-3">Dataset Name</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Rows</th>
                  <th className="py-3 px-3">Columns</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-sans font-medium text-slate-200 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-blue-400 shrink-0" />
                      <Link to={`/datasets/${d.id}`} className="hover:text-blue-400 hover:underline">
                        {d.name}
                      </Link>
                    </td>
                    <td className="py-3 px-3 uppercase text-slate-400 text-[11px]">{d.file_type}</td>
                    <td className="py-3 px-3 text-slate-400">
                      {(d.file_size / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-3 px-3 text-blue-300">{d.row_count.toLocaleString()}</td>
                    <td className="py-3 px-3">{d.column_count}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-500 text-[11px]">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/datasets/${d.id}`}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          title="Inspect Schema & Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/chat?dataset=${d.id}`}
                          className="rounded p-1.5 text-blue-400 hover:bg-blue-600/20"
                          title="Converse with AI Analyst"
                        >
                          <Bot className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(d.id, d.name)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                          title="Delete Dataset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <Database className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p>No matching datasets found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
