import { RecommendedAction, RecoveryLevel, RootCauseCategory } from '../preprocessing/types.js';

export interface DecisionEngineConfig {
  max_retries: number;
  min_recovery_probability_for_auto_retry: number;
  max_amount_for_auto_retry: number;
}

export interface DecisionResult {
  recommended_action: RecommendedAction;
  action_reason: string;
  is_automated_eligible: boolean;
}

export class DecisionEngine {
  public config: DecisionEngineConfig;

  constructor(config?: Partial<DecisionEngineConfig>) {
    this.config = {
      max_retries: config?.max_retries ?? 2,
      min_recovery_probability_for_auto_retry: config?.min_recovery_probability_for_auto_retry ?? 0.70,
      max_amount_for_auto_retry: config?.max_amount_for_auto_retry ?? 100000
    };
  }

  public decide(
    recoveryProb: number,
    recoveryLevel: RecoveryLevel,
    rootCause: RootCauseCategory,
    retryCount: number,
    amount: number,
    paymentMethod: string = ''
  ): DecisionResult {
    // 1. Safety edge case: Zero or negative amount
    if (amount <= 0) {
      return {
        recommended_action: 'NO_ACTION',
        action_reason: 'Invalid transaction amount (<= 0). No recovery attempt warranted.',
        is_automated_eligible: false
      };
    }

    // 2. Safety Rule: Retry count limit reached
    if (retryCount >= this.config.max_retries) {
      if (recoveryProb >= 0.40) {
        return {
          recommended_action: 'GENERATE_PAYMENT_LINK',
          action_reason: `Retry ceiling (${this.config.max_retries}) reached. Automated gateway retries halted; customer payment link required.`,
          is_automated_eligible: true
        };
      }
      return {
        recommended_action: 'HUMAN_ESCALATION',
        action_reason: `Retry limit (${this.config.max_retries}) exceeded with sub-optimal recovery probability. Routed to human desk.`,
        is_automated_eligible: false
      };
    }

    // 3. Expired payment method: Auto-retry will fail, mandate/link or alternate method needed
    if (rootCause === 'Expired Payment Method') {
      return {
        recommended_action: 'GENERATE_PAYMENT_LINK',
        action_reason: 'Card/mandate validity lapsed. One-click update link generated for customer to replace card instrument.',
        is_automated_eligible: true
      };
    }

    // 4. Bank Decline or Authentication Dropout
    if (rootCause === 'Authentication Failure') {
      return {
        recommended_action: 'SEND_PAYMENT_REMINDER',
        action_reason: 'Checkout / OTP timeout detected. WhatsApp/SMS reminder with direct checkout resumption token sent.',
        is_automated_eligible: true
      };
    }

    if (rootCause === 'Bank Decline') {
      return {
        recommended_action: 'SUGGEST_ALTERNATE_METHOD',
        action_reason: 'Issuer bank rejected transaction. Recommended switching to UPI / Alternate Card network.',
        is_automated_eligible: true
      };
    }

    // 5. HIGH Recovery Probability (>= 0.70)
    if (
      recoveryProb >= this.config.min_recovery_probability_for_auto_retry &&
      (rootCause === 'Network Failure' || rootCause === 'Insufficient Funds' || rootCause === 'Other') &&
      amount <= this.config.max_amount_for_auto_retry
    ) {
      return {
        recommended_action: 'RETRY_PAYMENT',
        action_reason: `High recovery confidence (${(recoveryProb * 100).toFixed(1)}%) with transient root cause. Smart off-peak auto-retry scheduled.`,
        is_automated_eligible: true
      };
    }

    // 6. MEDIUM Recovery Probability (0.40 - 0.69)
    if (recoveryProb >= 0.40) {
      return {
        recommended_action: 'SEND_PAYMENT_REMINDER',
        action_reason: `Moderate recovery probability (${(recoveryProb * 100).toFixed(1)}%). Dunning communication scheduled across verified channel.`,
        is_automated_eligible: true
      };
    }

    // 7. LOW Recovery Probability (< 0.40)
    return {
      recommended_action: 'HUMAN_ESCALATION',
      action_reason: `Low recovery probability (${(recoveryProb * 100).toFixed(1)}%). Assigned to risk analyst desk for manual verification.`,
      is_automated_eligible: false
    };
  }
}
