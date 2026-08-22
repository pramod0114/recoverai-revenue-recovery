import {
  AgentAnalysisInput,
  AgentDecision,
  ControlledRecoveryAction,
  PolicyEvaluationResult
} from './types.js';
import { PolicyEngine } from './PolicyEngine.js';
import { MLRecoveryPredictor } from '../../ml/inference/predictor.js';

export class AgentDecisionEngine {
  private policyEngine: PolicyEngine;
  private predictor: MLRecoveryPredictor;

  constructor(policyEngine?: PolicyEngine, predictor?: MLRecoveryPredictor) {
    this.policyEngine = policyEngine || new PolicyEngine();
    this.predictor = predictor || MLRecoveryPredictor.getInstance();
  }

  /**
   * Decide the optimal and safest recovery action for a transaction.
   */
  public async decide(input: AgentAnalysisInput): Promise<AgentDecision> {
    const caseId = input.case_id || `rc_${input.transaction_id || Date.now()}`;
    const amount = Number(input.amount || 0);
    const retryCount = Number(input.retry_count || 0);

    // 1. Check ML Prediction if not pre-computed or if fresh prediction is needed
    let riskScore = input.risk_score;
    let recoveryProb = input.recovery_probability;
    let rootCause = input.root_cause || input.failure_reason || 'Network Failure';
    let rootConfidence = 0.85;

    if (riskScore === undefined || recoveryProb === undefined) {
      try {
        const mlOut = await this.predictor.predict({
          transaction_id: input.transaction_id,
          amount,
          payment_method: input.payment_method || 'UPI',
          failure_reason: rootCause,
          retry_count: retryCount,
          customer_age_days: input.customer_age_days || 45,
          historical_success_rate:
            input.successful_transactions && input.previous_transactions
              ? input.successful_transactions / input.previous_transactions
              : 0.8
        });
        riskScore = mlOut.risk_score;
        recoveryProb = mlOut.recovery_probability;
        rootCause = mlOut.root_cause || rootCause;
        rootConfidence = mlOut.root_cause_confidence || 0.85;
      } catch (err) {
        console.warn('[AgentDecisionEngine] ML fallback heuristic invoked:', err);
        riskScore = 0.45;
        recoveryProb = 0.65;
      }
    }

    // 2. Base Action Selection Logic based on Failure Type, Probability, and Retries
    let baseAction: ControlledRecoveryAction = 'NO_ACTION';
    let baseReason = '';
    let confidence = rootConfidence;

    // Rule A: Zero or negative amount
    if (amount <= 0) {
      baseAction = 'NO_ACTION';
      baseReason = 'Transaction amount is zero or negative. No monetary recovery required.';
      confidence = 1.0;
    }
    // Rule B: Maximum retries exceeded (3 or more)
    else if (retryCount >= 3) {
      baseAction = 'HUMAN_ESCALATION';
      baseReason = `Maximum automated retry ceiling (3) exceeded with ${retryCount} attempts. Manual intervention required to prevent customer fatigue.`;
      confidence = 0.95;
    }
    // Rule C: Card/Mandate expired
    else if (
      rootCause.toLowerCase().includes('expired') ||
      (input.failure_reason && input.failure_reason.toLowerCase().includes('expired'))
    ) {
      baseAction = 'GENERATE_PAYMENT_LINK';
      baseReason = 'Payment instrument or mandate has expired. Payment link generated for customer to authorize a new instrument.';
      confidence = 0.92;
    }
    // Rule D: Authentication failure / 3DS drop
    else if (
      rootCause.toLowerCase().includes('authentication') ||
      (input.failure_reason && input.failure_reason.toLowerCase().includes('authentication'))
    ) {
      baseAction = 'SEND_PAYMENT_REMINDER';
      baseReason = 'Customer dropped off at OTP/3DS authentication. Checkout resumption reminder dispatched via WhatsApp/SMS.';
      confidence = 0.88;
    }
    // Rule E: Issuer bank decline
    else if (
      rootCause.toLowerCase().includes('decline') ||
      (input.failure_reason && input.failure_reason.toLowerCase().includes('decline'))
    ) {
      baseAction = 'SUGGEST_ALTERNATE_METHOD';
      baseReason = 'Issuer bank declined transaction. Suggesting instant fallback to UPI or alternate credit/debit card.';
      confidence = 0.86;
    }
    // Rule F: Network Failure / Transient Gateway Timeout with HIGH Probability (>= 0.70)
    else if (recoveryProb >= 0.70 && retryCount < 3) {
      baseAction = 'RETRY_PAYMENT';
      baseReason = `Payment failed due to temporary network glitch and customer has a high recovery score (${(recoveryProb * 100).toFixed(0)}%). Smart off-peak auto-retry recommended.`;
      confidence = recoveryProb;
    }
    // Rule G: Moderate Recovery Probability (0.40 to 0.69)
    else if (recoveryProb >= 0.40) {
      baseAction = 'SEND_PAYMENT_REMINDER';
      baseReason = `Moderate recovery probability (${(recoveryProb * 100).toFixed(0)}%). Dispatched gentle payment reminder link.`;
      confidence = recoveryProb;
    }
    // Rule H: Low Probability (< 0.40)
    else {
      baseAction = 'HUMAN_ESCALATION';
      baseReason = `Low recovery probability (${(recoveryProb * 100).toFixed(0)}%) with persistent error. Escalated to recovery operations desk.`;
      confidence = 0.90;
    }

    // 3. Evaluate Policy Engine constraints
    const policyResult: PolicyEvaluationResult = this.policyEngine.evaluate(baseAction, {
      case_id: caseId,
      amount,
      retry_count: retryCount,
      recovery_probability: recoveryProb
    });

    const finalAction: ControlledRecoveryAction = policyResult.passed
      ? baseAction
      : policyResult.allowed_action;

    return {
      case_id: caseId,
      transaction_id: input.transaction_id,
      recommended_action: finalAction,
      reason: policyResult.passed ? baseReason : policyResult.reason,
      confidence: Number(confidence.toFixed(2)),
      root_cause: rootCause,
      risk_score: Number((riskScore ?? 0.5).toFixed(2)),
      recovery_probability: Number((recoveryProb ?? 0.5).toFixed(2)),
      policy_result: policyResult,
      model_version: 'recovery-model-v1',
      workflow_state: policyResult.passed ? 'APPROVED' : 'BLOCKED'
    };
  }
}
