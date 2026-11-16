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
  Loader2,
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

  const handleDownloadReport = async (r: ReportItem) => {
    try {
      setDownloadingId(r.id);
      setError(null);
      const ext = r.format === 'pdf' ? 'pdf' : 'xlsx';
      const cleanTitle = r.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanTitle}.${ext}`;
      await reportService.download(r.id, filename);
    } catch (err: any) {
      console.error('Download failed', err);
      setError(`Failed to download report: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

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

      setSuccessMsg(`Compiled ${format.toUpperCase()} report: "${rep.title}". Downloading now...`);
      await loadData();

      // Automatically trigger download
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const cleanTitle = reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanTitle}.${ext}`;
      await reportService.download(rep.id, filename);
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
    <div className="space-y-6 max-w-7xl mx-auto transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Executive Report Studio
            <FileText className="h-5 w-5 text-purple-500" />
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Publish and download comprehensive executive PDF audits and Excel workbooks synthesized from dataset metrics and AI findings.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 shadow-xs">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Generator Form */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span>Generate New Business Report</span>
        </h3>

        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Dataset</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.file_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Report Title</label>
            <input
              type="text"
              required
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Q3 Financial Assessment"
              className="h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-800 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Output Format</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-all ${
                  format === 'pdf'
                    ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-600/10 dark:text-red-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF (ReportLab)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-all ${
                  format === 'excel'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-600/10 dark:text-emerald-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing and compiling {format.toUpperCase()} report...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Compile and Download {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Reports History */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Generated Reports Library</span>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
            {reports.length} generated
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          {reports.length > 0 ? (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                  <th className="py-3 px-3">Report Title</th>
                  <th className="py-3 px-3">Dataset</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-200 flex items-center gap-2">
                      {r.format === 'pdf' ? (
                        <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      <span>{r.title}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{r.dataset_name}</td>
                    <td className="py-3 px-3 uppercase text-[11px]">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          r.format === 'pdf'
                            ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                        }`}
                      >
                        {r.format}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {(r.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] font-mono">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownloadReport(r)}
                          disabled={downloadingId === r.id}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-all shadow-xs disabled:opacity-50"
                          title="Download report binary"
                        >
                          <Download className={`h-3 w-3 ${downloadingId === r.id ? 'animate-bounce' : ''}`} />
                          <span>{downloadingId === r.id ? 'Downloading...' : 'Download'}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Delete report"
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
              <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p>No reports generated yet. Select a dataset above to create your first report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
