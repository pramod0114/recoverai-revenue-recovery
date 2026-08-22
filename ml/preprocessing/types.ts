export interface PaymentDataRecord {
  transaction_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'CARD_CREDIT' | 'CARD_DEBIT' | 'UPI' | 'NETBANKING' | 'AUTO_DEBIT' | 'WALLET' | string;
  failure_reason: string;
  customer_age_days: number;
  previous_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  previous_recovery_count: number;
  retry_count: number;
  time_since_failure: number; // in minutes
  customer_segment: 'ENTERPRISE' | 'PRO' | 'GROWTH' | 'STARTER' | string;
  subscription_status: 'ACTIVE' | 'PAST_DUE' | 'UNPAID' | 'CANCELLED' | 'NONE' | string;
  days_since_last_payment: number;
  historical_success_rate: number;
  is_weekend: number; // 0 or 1
  hour_of_day: number; // 0 to 23
  recovery_success: number; // 0 or 1 target
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecoveryLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type RecommendedAction =
  | 'RETRY_PAYMENT'
  | 'SEND_PAYMENT_REMINDER'
  | 'GENERATE_PAYMENT_LINK'
  | 'SUGGEST_ALTERNATE_METHOD'
  | 'HUMAN_ESCALATION'
  | 'NO_ACTION';

export type RootCauseCategory =
  | 'Insufficient Funds'
  | 'Network Failure'
  | 'Bank Decline'
  | 'Expired Payment Method'
  | 'Authentication Failure'
  | 'Other';

export interface ExplanationFactor {
  feature: string;
  impact: number;
  direction: '+' | '-';
  description: string;
}

export interface PredictionResult {
  transaction_id: string;
  amount: number;
  risk_score: number;
  risk_level: RiskLevel;
  recovery_probability: number;
  recovery_level: RecoveryLevel;
  revenue_at_risk: number;
  expected_recovery: number;
  root_cause: RootCauseCategory;
  root_cause_confidence: number;
  recommended_action: RecommendedAction;
  action_reason: string;
  explanation: ExplanationFactor[];
  model_version: string;
  created_at: string;
}

export interface BatchPredictionSummary {
  total_transactions: number;
  total_failed_amount: number;
  total_revenue_at_risk: number;
  expected_recoverable_revenue: number;
  high_risk_count: number;
  recovery_rate_prediction: number;
  risk_distribution: Record<RiskLevel, number>;
  recovery_distribution: Record<RecoveryLevel, number>;
  recommended_actions: Record<RecommendedAction, number>;
  predictions: PredictionResult[];
}

export interface ConfusionMatrix {
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  confusion_matrix: ConfusionMatrix;
  false_positive_rate: number;
  false_negative_rate: number;
  estimated_false_positive_cost: number;
  test_sample_size: number;
  train_sample_size: number;
}

export interface ModelMetadata {
  model_version: string;
  model_type: string;
  trained_at: string;
  training_samples: number;
  test_samples: number;
  features_count: number;
  feature_names: string[];
  metrics: EvaluationMetrics;
  hyperparameters: Record<string, any>;
  thresholds: {
    risk: {
      low_max: number;
      medium_max: number;
      high_max: number;
    };
    recovery: {
      high_min: number;
      medium_min: number;
    };
  };
  safety_limits: {
    max_retries: number;
    min_recovery_probability_for_auto_retry: number;
    max_amount_for_auto_retry: number;
  };
}
