export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface ColumnProfile {
  id?: string;
  column_name: string;
  data_type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';
  null_count: number;
  null_percentage?: number;
  unique_count: number;
  sample_values?: any[];
  statistics?: {
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
    q25?: number;
    q75?: number;
    top_values?: Record<string, number>;
  };
}

export interface Dataset {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  row_count: number;
  column_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  metadata_profile?: {
    total_rows: number;
    total_columns: number;
    duplicate_rows: number;
    total_null_cells: number;
    null_percentage: number;
    memory_usage_mb: number;
    columns_overview: Array<{
      name: string;
      type: string;
      nulls: number;
    }>;
  };
  columns?: ColumnProfile[];
}

export interface DatasetPreview {
  id: string;
  name: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  rows: Record<string, any>[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'histogram' | 'heatmap';
  title: string;
  x_axis?: string;
  y_axis?: string;
  series_keys?: string[];
  colors?: string[];
  data?: Record<string, any>[];
}

export interface AnalysisResultOut {
  raw_data?: Record<string, any>[];
  summary_metrics?: {
    row_count: number;
    execution_time_ms: number;
    columns: string[];
  };
  findings?: string;
  recommendations?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  chart_config?: ChartConfig;
  query_sql?: string;
  analytical_method?: string;
  result?: AnalysisResultOut;
  created_at: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  dataset_id: string;
  dataset_name?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionDetail extends SessionSummary {
  messages: ChatMessage[];
}

export interface ForecastResponse {
  target_column: string;
  date_column?: string;
  historical_points: Array<{ period: string; actual: number | null; predicted: number | null }>;
  forecast_points: Array<{ period: string; actual: number | null; predicted: number | null }>;
  metrics: {
    r2_score: number;
    rmse: number;
    mae: number;
  };
  chart_config: ChartConfig;
  business_insights: string[];
}

export interface AnomalyResponse {
  total_samples: number;
  anomalies_detected: number;
  anomaly_rate_percent: number;
  features_analyzed: string[];
  top_anomalies: Record<string, any>[];
  chart_config: ChartConfig;
  insights: string[];
}

export interface ClusteringResponse {
  n_clusters: number;
  features: string[];
  silhouette_score: number;
  cluster_profiles: Array<{
    cluster_name: string;
    size: number;
    percentage: number;
    means: Record<string, number>;
  }>;
  chart_config: ChartConfig;
  insights: string[];
}

export interface ReportItem {
  id: string;
  title: string;
  format: 'pdf' | 'excel';
  dataset_id: string;
  dataset_name?: string;
  file_size_bytes: number;
  created_at: string;
}

export interface DashboardStats {
  total_datasets: number;
  total_analyses: number;
  total_reports: number;
  total_messages: number;
  recent_activity: Array<{
    id: string;
    action: string;
    details?: any;
    timestamp: string;
  }>;
}
