import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Code2,
  Terminal,
  Play,
  Database,
  Sparkles,
  AlertCircle,
  Table as TableIcon,
} from 'lucide-react';
import { analyticsService, datasetService } from '../services/api';
import { ColumnProfile, Dataset } from '../types';
import { DynamicChart } from '../components/charts/DynamicChart';
import { DataTable } from '../components/analyst/DataTable';

export const AnalyticsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [datasetColumns, setDatasetColumns] = useState<ColumnProfile[]>([]);
  const [operation, setOperation] = useState<'sql' | 'summary' | 'correlation' | 'group_by' | 'outliers'>('sql');

  // Form states
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM dataset LIMIT 20');
  const [groupByCol, setGroupByCol] = useState('');
  const [metricCol, setMetricCol] = useState('');
  const [aggFunc, setAggFunc] = useState('sum');
  const [outlierCol, setOutlierCol] = useState('');

  // Results
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const list = await datasetService.list();
        setDatasets(list);
        if (list.length > 0) {
          setSelectedDatasetId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load datasets', err);
      }
    };
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (!selectedDatasetId) return;
    const fetchColumns = async () => {
      try {
        const prof = await datasetService.getProfile(selectedDatasetId);
        const cols = prof.columns || [];
        setDatasetColumns(cols);

        const cat = cols.find((c) => c.data_type === 'categorical' || c.data_type === 'text');
        const num = cols.find((c) => c.data_type === 'numeric');
        if (cat) setGroupByCol(cat.column_name);
        if (num) {
          setMetricCol(num.column_name);
          setOutlierCol(num.column_name);
        }
      } catch (err) {
        console.error('Failed to load columns', err);
      }
    };
    fetchColumns();
  }, [selectedDatasetId]);

  const handleExecute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedDatasetId) return;

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      let payload: any = {
        dataset_id: selectedDatasetId,
        operation,
      };

      if (operation === 'sql') {
        payload.sql_query = sqlQuery;
      } else if (operation === 'group_by') {
        payload.parameters = { group_by: groupByCol, metric: metricCol, function: aggFunc };
      } else if (operation === 'outliers') {
        payload.parameters = { column: outlierCol };
      }

      const res = await analyticsService.analyze(payload);
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const numericCols = datasetColumns.filter((c) => c.data_type === 'numeric');
  const categoricalCols = datasetColumns.filter((c) => c.data_type === 'categorical' || c.data_type === 'text' || c.data_type === 'datetime');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Analytics & SQL Studio
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Execute sandboxed DuckDB SQL queries, statistical tests, correlation matrices, and parametric grouping.
          </p>
        </div>

        {/* Dataset Selector */}
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-500" />
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.file_type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Operation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'sql', label: 'DuckDB SQL Editor' },
          { id: 'summary', label: 'Summary Statistics' },
          { id: 'correlation', label: 'Correlation Matrix' },
          { id: 'group_by', label: 'Group & Aggregate' },
          { id: 'outliers', label: 'IQR Outlier Detection' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setOperation(tab.id as any);
              setResult(null);
            }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              operation === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Operation Form Controls */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        {operation === 'sql' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-400" />
                DuckDB Read-Only Query (Target view: 'dataset')
              </span>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSqlQuery('SELECT * FROM dataset LIMIT 15')}
                  className="rounded bg-slate-800 px-2 py-0.5 text-slate-400 hover:text-slate-200"
                >
                  SELECT *
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSqlQuery(
                      'SELECT COUNT(*) as total_rows FROM dataset'
                    )
                  }
                  className="rounded bg-slate-800 px-2 py-0.5 text-slate-400 hover:text-slate-200"
                >
                  COUNT(*)
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-blue-300 focus:border-blue-500 focus:outline-none"
              placeholder="SELECT column_a, SUM(column_b) FROM dataset GROUP BY column_a ORDER BY 2 DESC LIMIT 10"
            />
          </div>
        )}

        {operation === 'group_by' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Group By Dimension</label>
              <select
                value={groupByCol}
                onChange={(e) => setGroupByCol(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                {categoricalCols.map((c) => (
                  <option key={c.column_name} value={c.column_name}>
                    {c.column_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Numeric Metric</label>
              <select
                value={metricCol}
                onChange={(e) => setMetricCol(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                {numericCols.map((c) => (
                  <option key={c.column_name} value={c.column_name}>
                    {c.column_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Aggregation Function</label>
              <select
                value={aggFunc}
                onChange={(e) => setAggFunc(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="sum">SUM</option>
                <option value="mean">MEAN / AVERAGE</option>
                <option value="median">MEDIAN</option>
                <option value="count">COUNT</option>
                <option value="min">MIN</option>
                <option value="max">MAX</option>
              </select>
            </div>
          </div>
        )}

        {operation === 'outliers' && (
          <div className="max-w-md">
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Numeric Column for IQR Test</label>
            <select
              value={outlierCol}
              onChange={(e) => setOutlierCol(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              {numericCols.map((c) => (
                <option key={c.column_name} value={c.column_name}>
                  {c.column_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {operation === 'summary' && (
          <p className="text-xs text-slate-400">
            Calculates parametric count, mean, standard deviation, min, max, quartiles, median, and skewness across all numerical columns.
          </p>
        )}

        {operation === 'correlation' && (
          <p className="text-xs text-slate-400">
            Computes Pearson correlation coefficients across numerical attributes and ranks the strongest pairwise relationships.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => handleExecute()}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-white" />
            )}
            <span>Execute Operation</span>
          </button>

          {result?.execution_time_ms !== undefined && (
            <span className="text-[11px] font-mono text-slate-400">
              Completed in {result.execution_time_ms}ms
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          {result.explanation && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-300">
              {result.explanation}
            </div>
          )}

          {/* Dynamic Chart if recommended */}
          {result.chart_config && (
            <DynamicChart config={result.chart_config} />
          )}

          {/* Table */}
          {result.rows && result.rows.length > 0 && (
            <DataTable data={result.rows} columns={result.columns} title="Execution Output" />
          )}
        </div>
      )}
    </div>
  );
};
