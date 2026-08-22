import { ApiResponse } from '../types';

const BASE_URL = '/api';

export class ApiError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code = 'API_ERROR', details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('recoverai_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      const errMessage = data.error?.message || response.statusText || 'Request failed';
      const errCode = data.error?.code || `HTTP_${response.status}`;
      throw new ApiError(errMessage, errCode, data.error?.details);
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network communication failure', 'NETWORK_ERROR');
  }
}

export const api = {
  // Health
  getHealth: () => request<any>('/health'),

  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  getMe: () => request<{ user: any }>('/auth/me'),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),

  // Dashboard
  getKpis: () => request<any>('/dashboard/kpis'),
  getTrend: () => request<any[]>('/dashboard/trend'),
  getFailureBreakdown: () => request<any[]>('/dashboard/failure-breakdown'),
  getInterventionsBreakdown: () => request<any>('/dashboard/interventions-breakdown'),
  getRecentActivity: () => request<any[]>('/dashboard/recent-activity'),

  // Payments
  getPayments: (params?: Record<string, string | number>) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any[]>(`/payments${query}`);
  },
  getPaymentById: (id: string) => request<any>(`/payments/${id}`),
  retryPayment: (id: string) => request<any>(`/payments/${id}/retry`, { method: 'POST' }),

  // Customers
  getCustomers: (params?: Record<string, string | number>) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any[]>(`/customers${query}`);
  },
  getCustomerById: (id: string) => request<any>(`/customers/${id}`),

  // Recovery
  getRecoveryCases: (params?: Record<string, string | number>) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any[]>(`/recovery/cases${query}`);
  },
  getRecoveryCaseById: (id: string) => request<any>(`/recovery/cases/${id}`),
  triggerRecoveryAction: (id: string, actionData: { actionType: string; channel?: string }) =>
    request<any>(`/recovery/cases/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(actionData)
    }),
  approveRecoveryCase: (id: string) =>
    request<any>(`/recovery/cases/${id}/approve`, { method: 'POST' }),
  escalateRecoveryCase: (id: string, data?: { reason?: string }) =>
    request<any>(`/recovery/cases/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    }),
  stopRecoveryCase: (id: string) =>
    request<any>(`/recovery/cases/${id}/stop`, { method: 'POST' }),
  getInterventions: (params?: Record<string, string | number>) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any[]>(`/recovery/interventions${query}`);
  },
  batchDiagnose: () => request<any>('/recovery/batch-diagnose', { method: 'POST' }),

  // Audit
  getAuditLogs: (params?: Record<string, string | number>) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any[]>(`/audit/logs${query}`);
  }
};
