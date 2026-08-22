export type UserRole = 'ADMIN' | 'ANALYST' | 'OPERATOR';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  title?: string;
  lastLoginAt?: string;
}

export interface RecoveryPolicyConfig {
  max_retries: number;
  auto_retry_threshold: number;
  min_amount_for_auto_action: number;
  max_amount_for_auto_retry: number;
  cooldown_seconds: number;
  stop_after_success: boolean;
  stop_after_max_retries: boolean;
  require_idempotency: boolean;
}

export interface SystemConfiguration {
  environment: string;
  gatewayMode: 'TEST_MODE' | 'PRODUCTION';
  mlModelVersion: string;
  autonomousRecoveryEnabled: boolean;
  riskScoreThreshold: number;
  dunningChannel: string;
  webhookUrl: string;
  rateLimitPerMin: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UserManagementItem {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  title?: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface DashboardKpis {
  totalProcessedVolume: number;
  revenueAtRisk: number;
  recoveredRevenue: number;
  expectedRecovery: number;
  recoveryRate: number;
  failedPaymentsCount: number;
  successfulPaymentsCount: number;
  activeRecoveryCases: number;
  highRiskCases: number;
  escalatedCases: number;
  totalCustomers: number;
  currency: string;
  periodComparison?: Record<string, { delta: number; is_positive: boolean }>;
}

export interface DailyTrendItem {
  date: string;
  atRisk: number;
  recovered: number;
  expected: number;
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
  payment_method: 'CARD_CREDIT' | 'CARD_DEBIT' | 'UPI' | 'NETBANKING' | 'WALLET' | 'AUTO_DEBIT' | string;
  payment_status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'RECOVERED' | 'ABANDONED' | 'REFUNDED' | string;
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
  status: 'OPEN' | 'IN_PROGRESS' | 'RECOVERED' | 'FAILED' | 'DISMISSED' | 'ESCALATED' | string;
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
  actor_name?: string;
  actor_role?: 'ADMIN' | 'ANALYST' | 'SYSTEM' | string;
  action_name: string;
  entity_type: string;
  entity_id: string;
  case_id?: string;
  reason?: string;
  result?: string;
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
