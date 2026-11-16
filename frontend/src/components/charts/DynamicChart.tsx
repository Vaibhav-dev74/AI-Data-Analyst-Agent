import React, { useState } from 'react';
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartConfig } from '../../types';
import {
  Download,
  Table as TableIcon,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  CircleDot,
  Layers,
  Compass,
  AlignLeft,
  Activity,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface DynamicChartProps {
  config: ChartConfig;
  onViewData?: () => void;
}

const DEFAULT_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
];

export const DynamicChart: React.FC<DynamicChartProps> = ({ config, onViewData }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { type: initialType, title, x_axis, y_axis, series_keys, colors, data } = config;
  const [activeType, setActiveType] = useState<string>(initialType || 'bar');

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-500">
        No graphical points available for visualization.
      </div>
    );
  }

  const palette = colors && colors.length > 0 ? colors : DEFAULT_PALETTE;
  const activeX = x_axis || Object.keys(data[0] || {})[0] || 'category';
  const activeSeries = series_keys && series_keys.length > 0 ? series_keys : [Object.keys(data[0] || {})[1] || 'value'];

  // Theme-aware chart tokens
  const gridStroke = isDark ? '#334155' : '#e2e8f0';
  const axisStroke = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle = isDark
    ? { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }
    : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };

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
    switch (activeType) {
      case 'bar':
      case 'histogram':
        return (
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
            <XAxis dataKey={activeX} stroke={axisStroke} fontSize={11} tickLine={false} interval="preserveStartEnd" angle={-15} textAnchor="end" />
            <YAxis stroke={axisStroke} fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {activeSeries.map((sKey, i) => (
              <Bar key={sKey} dataKey={sKey} fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );

      case 'horizontal_bar':
        const hSeriesKey = activeSeries[0] || y_axis || Object.keys(data[0])[1];
        return (
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
            <XAxis type="number" stroke={axisStroke} fontSize={11} tickLine={false} />
            <YAxis type="category" dataKey={activeX} stroke={axisStroke} fontSize={11} tickLine={false} width={80} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey={hSeriesKey} fill={palette[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
            <XAxis dataKey={activeX} stroke={axisStroke} fontSize={11} tickLine={false} angle={-15} textAnchor="end" />
            <YAxis stroke={axisStroke} fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
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
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
            <XAxis dataKey={activeX} stroke={axisStroke} fontSize={11} tickLine={false} angle={-15} textAnchor="end" />
            <YAxis stroke={axisStroke} fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {activeSeries.map((sKey, i) => (
              <Area key={sKey} type="monotone" dataKey={sKey} stroke={palette[i % palette.length]} fillOpacity={1} fill={`url(#color-${sKey})`} />
            ))}
          </AreaChart>
        );

      case 'pie':
      case 'donut':
        const isDonut = activeType === 'donut';
        const pieValueKey = activeSeries[0] || 'value';
        return (
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Pie
              data={data}
              dataKey={pieValueKey}
              nameKey={activeX}
              cx="50%"
              cy="50%"
              outerRadius={95}
              innerRadius={isDonut ? 52 : 0}
              paddingAngle={isDonut ? 4 : 2}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke={gridStroke} />
            <PolarAngleAxis dataKey={activeX} stroke={axisStroke} fontSize={11} />
            <PolarRadiusAxis stroke={axisStroke} fontSize={10} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {activeSeries.slice(0, 4).map((sKey, i) => (
              <Radar
                key={sKey}
                name={sKey}
                dataKey={sKey}
                stroke={palette[i % palette.length]}
                fill={palette[i % palette.length]}
                fillOpacity={0.35}
              />
            ))}
          </RadarChart>
        );

      case 'composed':
        const barMetric = activeSeries[0];
        const lineMetric = activeSeries[1] || activeSeries[0];
        return (
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
            <XAxis dataKey={activeX} stroke={axisStroke} fontSize={11} tickLine={false} angle={-15} textAnchor="end" />
            <YAxis stroke={axisStroke} fontSize={11} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey={barMetric} fill={palette[0]} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey={lineMetric} stroke={palette[1] || '#10b981'} strokeWidth={3} dot={{ r: 4 }} />
          </ComposedChart>
        );

      case 'scatter':
        const scatterY = activeSeries[0] || y_axis || Object.keys(data[0])[1];
        return (
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.6} />
            <XAxis dataKey={activeX} name={activeX} stroke={axisStroke} fontSize={11} />
            <YAxis dataKey={scatterY} name={scatterY} stroke={axisStroke} fontSize={11} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
            <Scatter name={title} data={data} fill="#3b82f6" />
          </ScatterChart>
        );

      default:
        return <div className="text-sm text-slate-400">Unsupported chart format</div>;
    }
  };

  const chartTypesList = [
    { id: 'bar', label: 'Bar', icon: BarChart3 },
    { id: 'horizontal_bar', label: 'H-Bar', icon: AlignLeft },
    { id: 'line', label: 'Line', icon: TrendingUp },
    { id: 'area', label: 'Area', icon: Activity },
    { id: 'donut', label: 'Donut', icon: CircleDot },
    { id: 'pie', label: 'Pie', icon: PieIcon },
    { id: 'radar', label: 'Radar', icon: Compass },
    { id: 'composed', label: 'Combo', icon: Layers },
  ];

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 backdrop-blur-sm transition-all shadow-sm hover:shadow-md">
      {/* Header with Title and Controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h4 className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-200">{title}</h4>
          <span className="rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/40 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 capitalize">
            {activeType.replace('_', ' ')}
          </span>
        </div>

        {/* Action Controls & Chart View Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Chart Switcher Pills */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-0.5">
            {chartTypesList.map((ct) => {
              const Icon = ct.icon;
              const isActive = activeType === ct.id;
              return (
                <button
                  key={ct.id}
                  onClick={() => setActiveType(ct.id)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                  title={`View as ${ct.label} chart`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{ct.label}</span>
                </button>
              );
            })}
          </div>

          {onViewData && (
            <button
              onClick={onViewData}
              className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
              title="Inspect underlying tabular data"
            >
              <TableIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Table</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Download CSV points"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
