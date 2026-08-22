export type WorkflowState =
  | 'DETECTED'
  | 'ANALYZING'
  | 'RECOMMENDED'
  | 'POLICY_CHECK'
  | 'APPROVED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'RECOVERED'
  | 'FAILED'
  | 'ESCALATED'
  | 'BLOCKED'
  | 'CLOSED';

export type ControlledRecoveryAction =
  | 'RETRY_PAYMENT'
  | 'SEND_PAYMENT_REMINDER'
  | 'GENERATE_PAYMENT_LINK'
  | 'SUGGEST_ALTERNATE_METHOD'
  | 'HUMAN_ESCALATION'
  | 'NO_ACTION';

export type RootCauseCategory =
  | 'Network Failure'
  | 'Insufficient Funds'
  | 'Bank Decline'
  | 'Expired Payment Method'
  | 'Authentication Failure'
  | 'Limit Exceeded'
  | 'Other';

export interface PolicyConfig {
  max_retries: number;
  auto_retry_threshold: number;
  min_amount_for_auto_action: number;
  max_amount_for_auto_retry: number;
  cooldown_seconds: number;
  stop_after_success: boolean;
  stop_after_max_retries: boolean;
  require_idempotency: boolean;
}

export interface PolicyEvaluationResult {
  passed: boolean;
  action: ControlledRecoveryAction;
  allowed_action: ControlledRecoveryAction;
  policy_name: string;
  violations: string[];
  reason: string;
  is_automated: boolean;
}

export interface AgentAnalysisInput {
  case_id?: string;
  transaction_id: string;
  amount: number;
  payment_method?: string;
  failure_reason?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_age_days?: number;
  previous_transactions?: number;
  successful_transactions?: number;
  failed_transactions?: number;
  retry_count?: number;
  risk_score?: number;
  recovery_probability?: number;
  root_cause?: string;
  ml_recommendation?: string;
}

export interface AgentDecision {
  case_id: string;
  transaction_id: string;
  recommended_action: ControlledRecoveryAction;
  reason: string;
  confidence: number;
  root_cause: string;
  risk_score: number;
  recovery_probability: number;
  policy_result: PolicyEvaluationResult;
  model_version: string;
  workflow_state: WorkflowState;
}

export interface ExecutionResult {
  execution_id: string;
  case_id: string;
  transaction_id: string;
  action: ControlledRecoveryAction;
  status: 'SUCCESS' | 'FAILED' | 'PENDING_VERIFICATION' | 'BLOCKED' | 'ESCALATED';
  test_mode: true;
  gateway_reference?: string;
  payment_link_url?: string;
  message_dispatch_status?: string;
  simulated_response: Record<string, any>;
  executed_at: string;
  error_message?: string;
}

export interface VerificationResult {
  case_id: string;
  transaction_id: string;
  action: ControlledRecoveryAction;
  verified_status: 'RECOVERED' | 'FAILED' | 'ESCALATED' | 'BLOCKED';
  is_recovered: boolean;
  verified_amount: number;
  verification_source: 'RAZORPAY_TEST_GATEWAY' | 'WEBHOOK_VERIFIER' | 'CUSTOMER_INTENT';
  details: string;
  verified_at: string;
  next_allowed_action?: ControlledRecoveryAction;
}

export interface HumanEscalationPayload {
  case_id: string;
  transaction_id?: string;
  reason: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_status?: 'PENDING_REVIEW' | 'IN_INVESTIGATION' | 'RESOLVED';
  operator_notes?: string;
}

export interface AgentAuditEntry {
  id: string;
  timestamp: string;
  case_id: string;
  transaction_id?: string;
  agent: string;
  event: string;
  decision?: string;
  action?: string;
  previous_state: WorkflowState | string;
  new_state: WorkflowState | string;
  reason: string;
  result?: string | Record<string, any>;
  model_version: string;
}
