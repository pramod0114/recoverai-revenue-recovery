import { ControlledRecoveryAction, PolicyConfig, PolicyEvaluationResult } from './types.js';

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  max_retries: 3,
  auto_retry_threshold: 0.70,
  min_amount_for_auto_action: 1,
  max_amount_for_auto_retry: 100000,
  cooldown_seconds: 30,
  stop_after_success: true,
  stop_after_max_retries: true,
  require_idempotency: true
};

export class PolicyEngine {
  private static instance: PolicyEngine;
  public config: PolicyConfig;
  private recentExecutionTimestamps: Map<string, number> = new Map(); // case_id -> timestamp

  constructor(config?: Partial<PolicyConfig>) {
    this.config = {
      ...DEFAULT_POLICY_CONFIG,
      ...config
    };
  }

  public static getInstance(config?: Partial<PolicyConfig>): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine(config);
    } else if (config) {
      PolicyEngine.instance.updateConfig(config);
    }
    return PolicyEngine.instance;
  }

  public updateConfig(newConfig: Partial<PolicyConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  /**
   * Evaluate if a requested action adheres to safety and bounds policies.
   */
  public evaluate(
    requestedAction: ControlledRecoveryAction,
    params: {
      case_id?: string;
      amount: number;
      retry_count: number;
      recovery_probability: number;
      is_already_recovered?: boolean;
      last_action_timestamp?: string | number | null;
      payment_status?: string;
      case_status?: string;
    }
  ): PolicyEvaluationResult {
    const violations: string[] = [];
    let allowedAction: ControlledRecoveryAction = requestedAction;

    // Policy Rule 1: STOP_AFTER_SUCCESS
    // If the payment or case is already resolved/recovered/successful, disallow any recovery action
    if (
      this.config.stop_after_success &&
      (params.is_already_recovered ||
        params.payment_status === 'SUCCESSFUL' ||
        params.payment_status === 'RECOVERED' ||
        params.case_status === 'RECOVERED')
    ) {
      violations.push('CASE_ALREADY_RECOVERED');
      return {
        passed: false,
        action: requestedAction,
        allowed_action: 'NO_ACTION',
        policy_name: 'STOP_AFTER_SUCCESS_POLICY',
        violations,
        reason: 'Payment has already been successfully recovered or processed. Duplicate intervention blocked.',
        is_automated: false
      };
    }

    // Policy Rule 2: Non-positive or zero amount boundary
    if (params.amount <= 0 || params.amount < this.config.min_amount_for_auto_action) {
      violations.push('INVALID_OR_ZERO_AMOUNT');
      return {
        passed: false,
        action: requestedAction,
        allowed_action: 'NO_ACTION',
        policy_name: 'MIN_AMOUNT_POLICY',
        violations,
        reason: `Amount (₹${params.amount}) is below minimum actionable threshold (₹${this.config.min_amount_for_auto_action}).`,
        is_automated: false
      };
    }

    // Policy Rule 3: High Value Safety Cap for Automated Actions
    if (params.amount > this.config.max_amount_for_auto_retry) {
      violations.push('HIGH_VALUE_MANUAL_REVIEW_REQUIRED');
      return {
        passed: false,
        action: requestedAction,
        allowed_action: 'HUMAN_ESCALATION',
        policy_name: 'HIGH_VALUE_SAFETY_POLICY',
        violations,
        reason: `Transaction amount (₹${params.amount}) exceeds auto-action safety cap (₹${this.config.max_amount_for_auto_retry}). Manual operator review required.`,
        is_automated: false
      };
    }

    // Policy Rule 4: STOP_AFTER_MAX_RETRIES & Retry Count Ceiling
    if (requestedAction === 'RETRY_PAYMENT') {
      if (this.config.stop_after_max_retries && params.retry_count >= this.config.max_retries) {
        violations.push('MAX_RETRIES_EXCEEDED');
        allowedAction = 'HUMAN_ESCALATION';

        return {
          passed: false,
          action: requestedAction,
          allowed_action: allowedAction,
          policy_name: 'MAX_RETRIES_LIMIT_POLICY',
          violations,
          reason: `Auto-retry halted because retry ceiling (${this.config.max_retries}) was reached. Re-routed to ${allowedAction}.`,
          is_automated: false
        };
      }

      // Policy Rule 5: AUTO_RETRY_THRESHOLD Gate
      if (params.recovery_probability < this.config.auto_retry_threshold) {
        violations.push('LOW_PROBABILITY_RETRY_BLOCKED');
        allowedAction = params.recovery_probability >= 0.40 ? 'SEND_PAYMENT_REMINDER' : 'HUMAN_ESCALATION';

        return {
          passed: false,
          action: requestedAction,
          allowed_action: allowedAction,
          policy_name: 'PROBABILITY_THRESHOLD_POLICY',
          violations,
          reason: `Automated debit retry denied due to recovery probability (${(params.recovery_probability * 100).toFixed(0)}%) < ${(this.config.auto_retry_threshold * 100).toFixed(0)}%. Re-routed to ${allowedAction}.`,
          is_automated: allowedAction === 'SEND_PAYMENT_REMINDER'
        };
      }

      // Policy Rule 6: Cooldown verification
      if (params.case_id && this.config.cooldown_seconds > 0) {
        const lastExec = this.recentExecutionTimestamps.get(params.case_id);
        const now = Date.now();
        if (lastExec && now - lastExec < this.config.cooldown_seconds * 1000) {
          const remainingSecs = Math.ceil((this.config.cooldown_seconds * 1000 - (now - lastExec)) / 1000);
          violations.push('COOLDOWN_ACTIVE');
          return {
            passed: false,
            action: requestedAction,
            allowed_action: 'NO_ACTION',
            policy_name: 'COOLDOWN_POLICY',
            violations,
            reason: `Action deferred. Minimum cooldown interval (${this.config.cooldown_seconds}s) between retries is active (${remainingSecs}s remaining).`,
            is_automated: false
          };
        }
      }
    }

    // Record timestamp if passing
    if (params.case_id) {
      this.recentExecutionTimestamps.set(params.case_id, Date.now());
    }

    return {
      passed: true,
      action: requestedAction,
      allowed_action: requestedAction,
      policy_name: 'BOUNDED_SAFETY_POLICY',
      violations: [],
      reason: 'Action passed all automated safety policy constraints and bounded thresholds.',
      is_automated: requestedAction !== 'HUMAN_ESCALATION' && requestedAction !== 'NO_ACTION'
    };
  }

  /**
   * Reset cooldown cache (useful for testing)
   */
  public resetCooldowns(): void {
    this.recentExecutionTimestamps.clear();
  }
}
