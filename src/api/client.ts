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
  getTrend: (params?: { timeframe?: string; days?: number }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any[]>(`/dashboard/trend${query}`);
  },
  getFunnel: () => request<any>('/dashboard/funnel'),
  globalSearch: (q: string) => request<any>(`/dashboard/search?q=${encodeURIComponent(q)}`),
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

  // Recovery Agent & Bounded Workflows
  getRecoveryCases: (params?: Record<string, string | number>) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any[]>(`/recovery/cases${query}`);
  },
  getRecoveryCaseById: (id: string) => request<any>(`/recovery/cases/${id}`),
  analyzeRecovery: (payload: { transaction_id?: string; case_id?: string; amount?: number; payment_method?: string; failure_reason?: string; [key: string]: any }) =>
    request<any>('/recovery/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  executeRecovery: (payload: { case_id?: string; transaction_id?: string; override_action?: string; idempotency_key?: string; [key: string]: any }) =>
    request<any>('/recovery/execute', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  verifyRecovery: (payload: { case_id: string; transaction_id?: string }) =>
    request<any>('/recovery/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  escalateRecovery: (payload: { case_id: string; reason?: string; priority?: string; operator_notes?: string }) =>
    request<any>('/recovery/escalate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getRecoveryCaseAudit: (id: string) => request<any>(`/recovery/cases/${id}/audit`),
  diagnoseAllRecoveryCases: () => request<any>('/recovery/diagnose-all', { method: 'POST' }),
  runDiagnostics: () => request<any>('/recovery/run-diagnostics', { method: 'POST' }),
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

  // ML Prediction Engine
  predictMl: (payload: { transaction_id?: string; amount?: number; payment_method?: string; failure_reason?: string; [key: string]: any }) =>
    request<any>('/ml/predict', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  batchPredictMl: (payload?: { transactions?: any[]; transaction_ids?: string[]; analyze_all_open?: boolean }) =>
    request<any>('/ml/batch-predict', {
      method: 'POST',
      body: JSON.stringify(payload || {})
    }),
  getMlMetrics: () => request<any>('/ml/metrics'),
  getMlModelInfo: () => request<any>('/ml/model-info'),
  retrainMlModel: (params?: { count?: number; seed?: number }) =>
    request<any>('/ml/retrain', {
      method: 'POST',
      body: JSON.stringify(params || {})
    }),

  // Audit
  getAuditLogs: (params?: Record<string, string | number>) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return request<any[]>(`/audit/logs${query}`);
  }
};
