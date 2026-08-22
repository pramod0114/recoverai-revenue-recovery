export type UserRole = 'ADMIN' | 'ANALYST' | 'OPERATOR';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MerchantRecord {
  id: string;
  name: string;
  email: string;
  currency: string;
  business_category: string;
  monthly_volume_est: number;
  recovery_automation_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerRecord {
  id: string;
  merchant_id: string;
  email: string;
  phone: string | null;
  name: string;
  customer_age_days: number;
  lifetime_value: number;
  total_successful_payments: number;
  total_failed_payments: number;
  risk_score: number;
  preferred_payment_method: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
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
  failure_category:
    | 'INSUFFICIENT_FUNDS'
    | 'BANK_DOWNTIME'
    | 'EXPIRED_CARD'
    | 'AUTHENTICATION_DROP'
    | 'CUSTOMER_ABANDONMENT'
    | 'FRAUD_SUSPICION'
    | 'GATEWAY_ERROR'
    | 'LIMIT_EXCEEDED'
    | 'NONE'
    | string;
  retry_count: number;
  checkout_status: 'COMPLETED' | 'DROPPED' | 'EXPIRED' | 'SESSION_TIMEOUT' | string;
  recovery_status: 'NOT_APPLICABLE' | 'AT_RISK' | 'RECOVERING' | 'RECOVERED' | 'UNRECOVERABLE' | 'EXPIRED' | string;
  recovered_amount: number;
  recovery_probability?: number;
  customer_age_days: number;
  previous_successful_payments: number;
  previous_failed_payments: number;
  previous_total_spend: number;
  created_at: string;
  updated_at: string;
}

export interface RecoveryCaseRecord {
  id: string;
  payment_id: string;
  customer_id: string;
  merchant_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_ltv?: number;
  transaction_id?: string;
  payment_method?: string;
  at_risk_amount: number;
  currency: string;
  ml_recovery_probability: number;
  recovery_probability?: number;
  risk_score?: number;
  risk_level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  primary_failure_diagnosis: string;
  recommended_strategy:
    | 'SMART_RETRY_OFFPEAK'
    | 'DUNNING_WHATSAPP'
    | 'DUNNING_EMAIL'
    | 'PAYMENT_LINK_SMS'
    | 'METHOD_SWITCH_UPI'
    | 'ONE_CLICK_MANDATE_UPDATE'
    | 'MANUAL_INTERVENTION'
    | string;
  recommended_action?: string;
  reason?: string;
  reasoning?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RECOVERED' | 'FAILED' | 'DISMISSED' | 'UNRECOVERED' | 'ESCALATED' | string;
  workflow_state?: string;
  actions_taken_count: number;
  current_retry_count?: number;
  executed_action?: string;
  result?: string;
  recovered_amount: number;
  recovered_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecoveryActionRecord {
  id: string;
  case_id: string;
  action_type: string;
  status: 'SCHEDULED' | 'EXECUTED' | 'DELIVERED' | 'CLICKED' | 'SUCCESS' | 'FAILED' | 'PENDING_REVIEW';
  trigger_channel: string;
  payload_snapshot: Record<string, unknown> | null;
  result_response: string | null;
  scheduled_for: string;
  executed_at: string | null;
  created_at: string;
}

export interface MlPredictionRecord {
  id: string;
  transaction_id: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recovery_probability: number;
  recovery_level: 'HIGH' | 'MEDIUM' | 'LOW';
  revenue_at_risk: number;
  expected_recovery: number;
  root_cause: string;
  root_cause_confidence?: number;
  recommended_action: string;
  action_reason?: string;
  explanation?: any[];
  model_version: string;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_type: 'SYSTEM_AI_AGENT' | 'ADMIN_USER' | 'ANALYST_USER' | 'WEBHOOK_EVENT';
  actor_id: string;
  action_name: string;
  entity_type: string;
  entity_id: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
