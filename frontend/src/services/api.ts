import axios from 'axios';
import {
  AuthResponse,
  ColumnProfile,
  DashboardStats,
  Dataset,
  DatasetPreview,
  ForecastResponse,
  AnomalyResponse,
  ClusteringResponse,
  ChatMessage,
  ReportItem,
  SessionDetail,
  SessionSummary,
  User,
} from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('insightiq_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('insightiq_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post<AuthResponse>(`${API_BASE}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem('insightiq_token', res.data.access_token);
          localStorage.setItem('insightiq_refresh_token', res.data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(originalRequest);
        } catch (e) {
          localStorage.removeItem('insightiq_token');
          localStorage.removeItem('insightiq_refresh_token');
          localStorage.removeItem('insightiq_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },
  register: async (email: string, password: string, full_name: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', { email, password, full_name });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};

export const datasetService = {
  upload: async (file: File): Promise<Dataset> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<Dataset>('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  list: async (): Promise<Dataset[]> => {
    const res = await api.get<Dataset[]>('/datasets');
    return res.data;
  },
  get: async (id: string): Promise<Dataset> => {
    const res = await api.get<Dataset>(`/datasets/${id}`);
    return res.data;
  },
  getPreview: async (id: string, limit: number = 100): Promise<DatasetPreview> => {
    const res = await api.get<DatasetPreview>(`/datasets/${id}/preview?limit=${limit}`);
    return res.data;
  },
  getProfile: async (id: string): Promise<{ id: string; name: string; metadata_profile: any; columns: ColumnProfile[] }> => {
    const res = await api.get(`/datasets/${id}/profile`);
    return res.data;
  },
  clean: async (id: string, options: any): Promise<Dataset> => {
    const res = await api.post<Dataset>(`/datasets/${id}/clean`, options);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/datasets/${id}`);
  },
};

export const analystService = {
  chat: async (datasetId: string, message: string, sessionId?: string): Promise<ChatMessage> => {
    const res = await api.post<ChatMessage>('/analyst/chat', {
      dataset_id: datasetId,
      message,
      session_id: sessionId,
    });
    return res.data;
  },
  getHistory: async (): Promise<SessionSummary[]> => {
    const res = await api.get<SessionSummary[]>('/analyst/history');
    return res.data;
  },
  getSession: async (sessionId: string): Promise<SessionDetail> => {
    const res = await api.get<SessionDetail>(`/analyst/sessions/${sessionId}`);
    return res.data;
  },
  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/analyst/sessions/${sessionId}`);
  },
};

export const analyticsService = {
  analyze: async (data: { dataset_id: string; operation: string; parameters?: any; sql_query?: string }): Promise<any> => {
    const res = await api.post('/analytics/analyze', data);
    return res.data;
  },
};

export const predictionService = {
  forecast: async (data: {
    dataset_id: string;
    target_column: string;
    date_column?: string;
    periods?: number;
    model_algorithm?: string;
  }): Promise<ForecastResponse> => {
    const res = await api.post<ForecastResponse>('/predictions/forecast', data);
    return res.data;
  },
  anomalyDetection: async (data: {
    dataset_id: string;
    features: string[];
    contamination?: number;
  }): Promise<AnomalyResponse> => {
    const res = await api.post<AnomalyResponse>('/predictions/anomaly-detection', data);
    return res.data;
  },
  clustering: async (data: {
    dataset_id: string;
    features: string[];
    n_clusters?: number;
  }): Promise<ClusteringResponse> => {
    const res = await api.post<ClusteringResponse>('/predictions/clustering', data);
    return res.data;
  },
};

export const reportService = {
  generate: async (data: { dataset_id: string; title: string; format: string }): Promise<any> => {
    const res = await api.post('/reports/generate', data);
    return res.data;
  },
  list: async (): Promise<ReportItem[]> => {
    const res = await api.get<ReportItem[]>('/reports');
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/reports/${id}`);
  },
  downloadUrl: (id: string) => `/api/reports/${id}/download`,
};

export const userService = {
  getProfile: async (): Promise<User> => {
    const res = await api.get<User>('/users/profile');
    return res.data;
  },
  updateProfile: async (data: { full_name?: string; email?: string }): Promise<User> => {
    const res = await api.patch<User>('/users/profile', data);
    return res.data;
  },
  changePassword: async (current_password: string, new_password: string): Promise<void> => {
    await api.post('/users/change-password', { current_password, new_password });
  },
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await api.get<DashboardStats>('/users/dashboard-stats');
    return res.data;
  },
};

export default api;
