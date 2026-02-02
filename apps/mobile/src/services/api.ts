/**
 * API Service
 * Handles all HTTP requests to the TradeMate API
 */

import Constants from 'expo-constants';

// Get API URL from environment or use default
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.50.128:29000';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = config;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'API request failed') as Error & { status: number; code: string };
    error.status = response.status;
    error.code = data.error || 'UNKNOWN_ERROR';
    throw error;
  }

  return { data, status: response.status };
}

export const api = {
  get: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', headers }),

  post: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'POST', body, headers }),

  put: <T>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'PUT', body, headers }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};

// SWMS-specific API calls
export const swmsApi = {
  getTemplates: () => api.get('/api/v1/swms/templates'),

  getTemplate: (tradeType: string) => api.get(`/api/v1/swms/templates/${tradeType}`),

  generate: (data: {
    tradeType: string;
    jobDescription: string;
    siteAddress?: string;
    clientName?: string;
    expectedDuration?: string;
    useAI?: boolean;
  }) => api.post('/api/v1/swms/generate', data),

  list: (params?: { status?: string; limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    const query = queryParams.toString();
    return api.get(`/api/v1/swms${query ? `?${query}` : ''}`);
  },

  get: (id: string) => api.get(`/api/v1/swms/${id}`),

  update: (id: string, data: Record<string, unknown>) => api.put(`/api/v1/swms/${id}`, data),

  delete: (id: string) => api.delete(`/api/v1/swms/${id}`),

  sign: (id: string, signature: string, role: 'worker' | 'supervisor') =>
    api.post(`/api/v1/swms/${id}/sign`, { signature, role }),
};

export default api;
