import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartConfig } from '../../types';
import { Download, Table as TableIcon } from 'lucide-react';

interface DynamicChartProps {
  config: ChartConfig;
  onViewData?: () => void;
}

const DEFAULT_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
];

export const DynamicChart: React.FC<DynamicChartProps> = ({ config, onViewData }) => {
  const { type, title, x_axis, y_axis, series_keys, colors, data } = config;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-sm text-slate-500">
        No graphical points available for visualization.
      </div>
    );
  }

  const palette = colors && colors.length > 0 ? colors : DEFAULT_PALETTE;
  const activeX = x_axis || Object.keys(data[0] || {})[0] || 'category';
  const activeSeries = series_keys && series_keys.length > 0 ? series_keys : [Object.keys(data[0] || {})[1] || 'value'];

  // Export underlying data as CSV
  const handleExportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(',')]
        .concat(data.map((row) => headers.map((field) => JSON.stringify(row[field] ?? '')).join(',')))
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
      case 'histogram':
        return (
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis dataKey={activeX} stroke="#94a3b8" fontSize={11} tickLine={false} interval="preserveStartEnd" angle={-15} textAnchor="end" />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {activeSeries.map((sKey, i) => (
              <Bar key={sKey} dataKey={sKey} fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis dataKey={activeX} stroke="#94a3b8" fontSize={11} tickLine={false} angle={-15} textAnchor="end" />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {activeSeries.map((sKey, i) => (
              <Line key={sKey} type="monotone" dataKey={sKey} stroke={palette[i % palette.length]} strokeWidth={2.5} dot={{ r: 3 }} />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <defs>
              {activeSeries.map((sKey, i) => (
                <linearGradient key={`grad-${sKey}`} id={`color-${sKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis dataKey={activeX} stroke="#94a3b8" fontSize={11} tickLine={false} angle={-15} textAnchor="end" />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {activeSeries.map((sKey, i) => (
              <Area key={sKey} type="monotone" dataKey={sKey} stroke={palette[i % palette.length]} fillOpacity={1} fill={`url(#color-${sKey})`} />
            ))}
          </AreaChart>
        );

      case 'pie':
        const pieValueKey = activeSeries[0] || 'value';
        return (
          <PieChart>
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Pie
              data={data}
              dataKey={pieValueKey}
              nameKey={activeX}
              cx="50%"
              cy="50%"
              outerRadius={95}
              innerRadius={type === 'pie' ? 0 : 50}
              paddingAngle={3}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'scatter':
        const scatterY = activeSeries[0] || y_axis || Object.keys(data[0])[1];
        return (
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis dataKey={activeX} name={activeX} stroke="#94a3b8" fontSize={11} />
            <YAxis dataKey={scatterY} name={scatterY} stroke="#94a3b8" fontSize={11} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
            />
            <Scatter name={title} data={data} fill="#3b82f6" />
          </ScatterChart>
        );

      default:
        return <div>Unsupported chart format</div>;
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm transition-all hover:border-slate-700">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h4 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h4>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 capitalize">{type}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onViewData && (
            <button
              onClick={onViewData}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
              title="Inspect underlying tabular data"
            >
              <TableIcon className="h-3 w-3" />
              <span>Table</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
            title="Download CSV points"
          >
            <Download className="h-3 w-3" />
            <span>CSV</span>
          </button>
        </div>
      </div>
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
