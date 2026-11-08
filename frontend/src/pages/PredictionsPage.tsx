import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Brain,
  AlertTriangle,
  Users,
  Database,
  Play,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { datasetService, predictionService } from '../services/api';
import { AnomalyResponse, ClusteringResponse, ColumnProfile, Dataset, ForecastResponse } from '../types';
import { DynamicChart } from '../components/charts/DynamicChart';
import { DataTable } from '../components/analyst/DataTable';

export const PredictionsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [datasetColumns, setDatasetColumns] = useState<ColumnProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'forecast' | 'anomaly' | 'clustering'>('forecast');

  // Forecast state
  const [targetCol, setTargetCol] = useState('');
  const [dateCol, setDateCol] = useState('');
  const [periods, setPeriods] = useState(6);
  const [algorithm, setAlgorithm] = useState('linear');
  const [forecastResult, setForecastResult] = useState<ForecastResponse | null>(null);

  // Anomaly state
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [contamination, setContamination] = useState(0.05);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyResponse | null>(null);

  // Clustering state
  const [clusterFeatures, setClusterFeatures] = useState<string[]>([]);
  const [nClusters, setNClusters] = useState(3);
  const [clusteringResult, setClusteringResult] = useState<ClusteringResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const list = await datasetService.list();
        setDatasets(list);
        if (list.length > 0) setSelectedDatasetId(list[0].id);
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

        const numCols = cols.filter((c) => c.data_type === 'numeric');
        const dtCols = cols.filter((c) => c.data_type === 'datetime');

        if (numCols.length > 0) {
          setTargetCol(numCols[0].column_name);
          setSelectedFeatures(numCols.slice(0, 3).map((c) => c.column_name));
          setClusterFeatures(numCols.slice(0, 3).map((c) => c.column_name));
        }
        if (dtCols.length > 0) {
          setDateCol(dtCols[0].column_name);
        } else {
          setDateCol('');
        }
      } catch (err) {
        console.error('Failed to load schema', err);
      }
    };
    fetchColumns();
  }, [selectedDatasetId]);

  const handleRunForecast = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await predictionService.forecast({
        dataset_id: selectedDatasetId,
        target_column: targetCol,
        date_column: dateCol || undefined,
        periods,
        model_algorithm: algorithm,
      });
      setForecastResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Forecasting failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnomaly = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await predictionService.anomalyDetection({
        dataset_id: selectedDatasetId,
        features: selectedFeatures,
        contamination,
      });
      setAnomalyResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Anomaly detection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunClustering = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await predictionService.clustering({
        dataset_id: selectedDatasetId,
        features: clusterFeatures,
        n_clusters: nClusters,
      });
      setClusteringResult(res);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Clustering failed.');
    } finally {
      setLoading(false);
    }
  };

  const numCols = datasetColumns.filter((c) => c.data_type === 'numeric');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Predictive Machine Learning Engine
            <Brain className="h-5 w-5 text-indigo-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Train statistical and supervised machine learning models with rigorous cross-validation and accuracy metrics.
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'forecast'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Forward Forecasting</span>
        </button>

        <button
          onClick={() => setActiveTab('anomaly')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'anomaly'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Isolation Forest Anomalies</span>
        </button>

        <button
          onClick={() => setActiveTab('clustering')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'clustering'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>K-Means Segmentation</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. FORECASTING */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Metric to Predict</label>
              <select
                value={targetCol}
                onChange={(e) => setTargetCol(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                {numCols.map((c) => (
                  <option key={c.column_name} value={c.column_name}>
                    {c.column_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date / Chronological Column</label>
              <select
                value={dateCol}
                onChange={(e) => setDateCol(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="">(None - Sequential Index)</option>
                {datasetColumns.map((c) => (
                  <option key={c.column_name} value={c.column_name}>
                    {c.column_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Forecast Horizon</label>
              <select
                value={periods}
                onChange={(e) => setPeriods(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value={3}>Next 3 Periods</option>
                <option value={6}>Next 6 Periods</option>
                <option value={12}>Next 12 Periods</option>
                <option value={24}>Next 24 Periods</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunForecast}
                disabled={loading || !targetCol}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
              >
                {loading ? 'Fitting model...' : 'Generate Forecast'}
              </button>
            </div>
          </div>

          {forecastResult && (
            <div className="space-y-6">
              {/* Metric KPI Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400">R² Coefficient of Determination</span>
                  <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
                    {forecastResult.metrics.r2_score.toFixed(3)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400">Root Mean Squared Error (RMSE)</span>
                  <p className="text-xl font-bold text-slate-200 font-mono mt-1">
                    {forecastResult.metrics.rmse.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400">Mean Absolute Error (MAE)</span>
                  <p className="text-xl font-bold text-slate-200 font-mono mt-1">
                    {forecastResult.metrics.mae.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <DynamicChart config={forecastResult.chart_config} />

              {/* Narrative Insights */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  Model Insights & Predictions
                </h4>
                <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                  {forecastResult.business_insights.map((ins, idx) => (
                    <li key={idx}>{ins}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. ANOMALY DETECTION */}
      {activeTab === 'anomaly' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Select Features to Audit for Anomalies
              </label>
              <div className="flex flex-wrap gap-2">
                {numCols.map((c) => {
                  const isChecked = selectedFeatures.includes(c.column_name);
                  return (
                    <button
                      key={c.column_name}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setSelectedFeatures((prev) => prev.filter((f) => f !== c.column_name));
                        } else {
                          setSelectedFeatures((prev) => [...prev, c.column_name]);
                        }
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${
                        isChecked
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {c.column_name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Contamination Rate: <span className="text-slate-200 font-mono">{(contamination * 100).toFixed(0)}%</span>
              </span>
              <button
                onClick={handleRunAnomaly}
                disabled={loading || selectedFeatures.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
              >
                {loading ? 'Scoring samples...' : 'Detect Anomalies'}
              </button>
            </div>
          </div>

          {anomalyResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400">Total Samples Evaluated</span>
                  <p className="text-xl font-bold text-white font-mono mt-1">
                    {anomalyResult.total_samples.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400">Anomalous Points Detected</span>
                  <p className="text-xl font-bold text-red-400 font-mono mt-1">
                    {anomalyResult.anomalies_detected}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-[11px] text-slate-400">Outlier Rate</span>
                  <p className="text-xl font-bold text-amber-400 font-mono mt-1">
                    {anomalyResult.anomaly_rate_percent}%
                  </p>
                </div>
              </div>

              <DynamicChart config={anomalyResult.chart_config} />

              <DataTable data={anomalyResult.top_anomalies} title="Top Anomalous Records (Ranked by Outlier Score)" />
            </div>
          )}
        </div>
      )}

      {/* 3. CLUSTERING */}
      {activeTab === 'clustering' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Select Numerical Segmentation Attributes
              </label>
              <div className="flex flex-wrap gap-2">
                {numCols.map((c) => {
                  const isChecked = clusterFeatures.includes(c.column_name);
                  return (
                    <button
                      key={c.column_name}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setClusterFeatures((prev) => prev.filter((f) => f !== c.column_name));
                        } else {
                          setClusterFeatures((prev) => [...prev, c.column_name]);
                        }
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${
                        isChecked
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {c.column_name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Number of Clusters (K):</span>
                <select
                  value={nClusters}
                  onChange={(e) => setNClusters(Number(e.target.value))}
                  className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value={2}>2 Clusters</option>
                  <option value={3}>3 Clusters</option>
                  <option value={4}>4 Clusters</option>
                  <option value={5}>5 Clusters</option>
                </select>
              </div>

              <button
                onClick={handleRunClustering}
                disabled={loading || clusterFeatures.length < 2}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
              >
                {loading ? 'Fitting clusters...' : 'Run K-Means Clustering'}
              </button>
            </div>
          </div>

          {clusteringResult && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">Silhouette Quality Score</span>
                  <p className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                    {clusteringResult.silhouette_score}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
                  Optimal Separation
                </span>
              </div>

              <DynamicChart config={clusteringResult.chart_config} />

              {/* Profiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {clusteringResult.cluster_profiles.map((cp) => (
                  <div key={cp.cluster_name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-white">{cp.cluster_name}</span>
                      <span className="text-xs font-mono text-blue-400">{cp.percentage}% ({cp.size} rows)</span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      {Object.entries(cp.means).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-slate-300">
                          <span className="text-slate-400">{k}:</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
