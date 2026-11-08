import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  Database,
  Plus,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { datasetService, reportService } from '../services/api';
import { Dataset, ReportItem } from '../types';

export const ReportsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [reportTitle, setReportTitle] = useState('Executive Data Intelligence Audit');
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [dList, rList] = await Promise.all([
        datasetService.list(),
        reportService.list(),
      ]);
      setDatasets(dList);
      setReports(rList);
      if (dList.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(dList[0].id);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) return;

    setError(null);
    setSuccessMsg(null);
    setGenerating(true);
    try {
      const rep = await reportService.generate({
        dataset_id: selectedDatasetId,
        title: reportTitle,
        format,
      });
      setSuccessMsg(`Successfully generated ${format.toUpperCase()} report: "${rep.title}".`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Report generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await reportService.delete(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError('Failed to delete report.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Executive Report Studio
            <FileText className="h-5 w-5 text-purple-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Publish comprehensive executive reports synthesized from real dataset metrics and AI findings.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Generator Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>Generate New Business Report</span>
        </h3>

        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.file_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Report Title</label>
            <input
              type="text"
              required
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Q3 Financial Assessment"
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Output Format</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                  format === 'pdf'
                    ? 'border-red-500/40 bg-red-600/10 text-red-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF (ReportLab)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                  format === 'excel'
                    ? 'border-emerald-500/40 bg-emerald-600/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="sm:col-span-3 pt-2">
            <button
              type="submit"
              disabled={generating || !selectedDatasetId}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              {generating ? 'Synthesizing publication report...' : `Compile and Download ${format.toUpperCase()}`}
            </button>
          </div>
        </form>
      </div>

      {/* Reports History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <span className="text-sm font-semibold text-slate-200">Generated Reports Library</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
            {reports.length} generated
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          {reports.length > 0 ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-3 px-3">Report Title</th>
                  <th className="py-3 px-3">Dataset</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-sans font-medium text-slate-200 flex items-center gap-2">
                      {r.format === 'pdf' ? (
                        <FileText className="h-4 w-4 text-red-400 shrink-0" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                      <span>{r.title}</span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-400">{r.dataset_name}</td>
                    <td className="py-3 px-3 uppercase text-[11px] text-slate-300">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          r.format === 'pdf'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {r.format}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {(r.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-500 text-[11px]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={reportService.downloadUrl(r.id)}
                          download
                          className="flex items-center gap-1 rounded bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs text-blue-300 hover:bg-blue-600/30"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </a>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="rounded p-1 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <FileText className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p>No reports generated yet. Select a dataset above to create your first report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
