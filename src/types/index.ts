export type UserRole = 'ADMIN' | 'ANALYST' | 'OPERATOR';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  lastLoginAt?: string;
}

export interface DashboardKpis {
  totalProcessedVolume: number;
  revenueAtRisk: number;
  recoveredRevenue: number;
  recoveryRate: number;
  failedPaymentsCount: number;
  successfulPaymentsCount: number;
  activeRecoveryCases: number;
  totalCustomers: number;
  currency: string;
}

export interface DailyTrendItem {
  date: string;
  atRisk: number;
  recovered: number;
  totalVolume: number;
}

export interface FailureBreakdownItem {
  category: string;
  count: number;
  amount: number;
  recoveredAmount: number;
  recoveryRate: number;
}

export interface PaymentItem {
  id: string;
  transaction_id: string;
  merchant_id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  subscription_id: string | null;
  invoice_id: string | null;
  amount: number;
  currency: string;
  payment_method: 'CARD_CREDIT' | 'CARD_DEBIT' | 'UPI' | 'NETBANKING' | 'WALLET' | 'AUTO_DEBIT';
  payment_status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'RECOVERED' | 'ABANDONED' | 'REFUNDED';
  failure_code: string | null;
  failure_reason: string | null;
  failure_category: string;
  retry_count: number;
  checkout_status: string;
  recovery_status: string;
  recovered_amount: number;
  created_at: string;
}

export interface RecoveryCaseItem {
  id: string;
  payment_id: string;
  customer_id: string;
  merchant_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  transaction_id?: string;
  payment_method?: string;
  at_risk_amount: number;
  currency: string;
  ml_recovery_probability: number;
  primary_failure_diagnosis: string;
  recommended_strategy: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RECOVERED' | 'FAILED' | 'DISMISSED';
  actions_taken_count: number;
  recovered_amount: number;
  recovered_at: string | null;
  created_at: string;
}

export interface CustomerItem {
  id: string;
  merchant_id: string;
  name: string;
  email: string;
  phone: string | null;
  customer_age_days: number;
  lifetime_value: number;
  total_successful_payments: number;
  total_failed_payments: number;
  risk_score: number;
  preferred_payment_method: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  actor_type: string;
  actor_id: string;
  action_name: string;
  entity_type: string;
  entity_id: string;
  previous_state: any;
  new_state: any;
  ip_address: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
}
