import { describe, it, expect, beforeAll } from 'vitest';
import { MLRecoveryPredictor } from '../ml/inference/predictor.js';
import { RootCauseAnalyzer } from '../ml/inference/root_cause.js';
import { DecisionEngine } from '../ml/inference/decision_engine.js';
import { DataPreprocessor } from '../ml/preprocessing/preprocessor.js';
import { ModelEvaluator } from '../ml/evaluation/evaluator.js';

describe('ML Revenue Risk & Recovery Prediction Engine', () => {
  let predictor: MLRecoveryPredictor;

  beforeAll(() => {
    predictor = MLRecoveryPredictor.getInstance();
  });

  describe('1. Risk Classification & Recovery Classification', () => {
    it('correctly maps numeric risk scores to categorical risk levels', () => {
      expect(predictor.classifyRiskLevel(0.15)).toBe('LOW');
      expect(predictor.classifyRiskLevel(0.29)).toBe('LOW');
      expect(predictor.classifyRiskLevel(0.45)).toBe('MEDIUM');
      expect(predictor.classifyRiskLevel(0.59)).toBe('MEDIUM');
      expect(predictor.classifyRiskLevel(0.68)).toBe('HIGH');
      expect(predictor.classifyRiskLevel(0.79)).toBe('HIGH');
      expect(predictor.classifyRiskLevel(0.85)).toBe('CRITICAL');
      expect(predictor.classifyRiskLevel(0.99)).toBe('CRITICAL');
    });

    it('correctly maps recovery probabilities to categorical recovery levels', () => {
      expect(predictor.classifyRecoveryLevel(0.85)).toBe('HIGH');
      expect(predictor.classifyRecoveryLevel(0.70)).toBe('HIGH');
      expect(predictor.classifyRecoveryLevel(0.55)).toBe('MEDIUM');
      expect(predictor.classifyRecoveryLevel(0.40)).toBe('MEDIUM');
      expect(predictor.classifyRecoveryLevel(0.35)).toBe('LOW');
      expect(predictor.classifyRecoveryLevel(0.05)).toBe('LOW');
    });
  });

  describe('2. Revenue at Risk & Expected Recovery Calculations', () => {
    it('calculates revenue_at_risk and expected_recovery accurately', () => {
      const pred = predictor.predict({
        transaction_id: 'TXN_TEST_01',
        amount: 10000,
        payment_method: 'UPI',
        failure_reason: 'Network Failure',
        retry_count: 0,
        historical_success_rate: 0.95
      });

      expect(pred.amount).toBe(10000);
      expect(pred.revenue_at_risk).toBeCloseTo(10000 * pred.risk_score, 1);
      expect(pred.expected_recovery).toBeCloseTo(10000 * pred.recovery_probability, 1);
      expect(pred.risk_score).toBeGreaterThanOrEqual(0);
      expect(pred.risk_score).toBeLessThanOrEqual(1);
      expect(pred.recovery_probability).toBeGreaterThanOrEqual(0);
      expect(pred.recovery_probability).toBeLessThanOrEqual(1);
    });
  });

  describe('3. Root Cause Analysis', () => {
    it('diagnoses insufficient funds', () => {
      const diag = RootCauseAnalyzer.diagnose('Account balance insufficient to complete debit', 'AUTO_DEBIT');
      expect(diag.root_cause).toBe('Insufficient Funds');
      expect(diag.confidence).toBeGreaterThan(0.85);
    });

    it('diagnoses network failures', () => {
      const diag = RootCauseAnalyzer.diagnose('Issuer switch unavailable or network timeout', 'NETBANKING');
      expect(diag.root_cause).toBe('Network Failure');
      expect(diag.confidence).toBeGreaterThan(0.85);
    });

    it('diagnoses expired payment methods', () => {
      const diag = RootCauseAnalyzer.diagnose('Card validity date expired', 'CARD_CREDIT');
      expect(diag.root_cause).toBe('Expired Payment Method');
      expect(diag.confidence).toBeGreaterThan(0.85);
    });

    it('diagnoses authentication dropouts', () => {
      const diag = RootCauseAnalyzer.diagnose('Customer did not enter 3D Secure OTP', 'CARD_DEBIT');
      expect(diag.root_cause).toBe('Authentication Failure');
      expect(diag.confidence).toBeGreaterThan(0.8);
    });

    it('diagnoses bank decline', () => {
      const diag = RootCauseAnalyzer.diagnose('Transaction rejected by bank limit', 'CARD_CREDIT');
      expect(diag.root_cause).toBe('Bank Decline');
      expect(diag.confidence).toBeGreaterThan(0.8);
    });

    it('falls back to Other gracefully when empty or unknown', () => {
      const diag = RootCauseAnalyzer.diagnose('', 'WALLET');
      expect(diag.root_cause).toBe('Other');
    });
  });

  describe('4. Bounded Decision Layer & Safety Limits', () => {
    const decisionEngine = new DecisionEngine({ max_retries: 2, min_recovery_probability_for_auto_retry: 0.70 });

    it('recommends RETRY_PAYMENT for high recovery probability with network failure and retry_count < 2', () => {
      const decision = decisionEngine.decide(0.88, 'HIGH', 'Network Failure', 0, 2499, 'UPI');
      expect(decision.recommended_action).toBe('RETRY_PAYMENT');
      expect(decision.is_automated_eligible).toBe(true);
    });

    it('enforces retry ceiling: stops auto-retry when retry_count reaches max_retries', () => {
      const decision = decisionEngine.decide(0.85, 'HIGH', 'Network Failure', 2, 2499, 'UPI');
      expect(decision.recommended_action).toBe('GENERATE_PAYMENT_LINK');
      expect(decision.action_reason).toContain('Retry ceiling');
    });

    it('routes low recovery probability to HUMAN_ESCALATION when retry limit exceeded', () => {
      const decision = decisionEngine.decide(0.25, 'LOW', 'Bank Decline', 3, 4999, 'CARD_CREDIT');
      expect(decision.recommended_action).toBe('HUMAN_ESCALATION');
      expect(decision.is_automated_eligible).toBe(false);
    });

    it('generates payment link for expired payment methods', () => {
      const decision = decisionEngine.decide(0.65, 'MEDIUM', 'Expired Payment Method', 0, 999, 'CARD_CREDIT');
      expect(decision.recommended_action).toBe('GENERATE_PAYMENT_LINK');
    });

    it('suggests alternate method for hard bank declines', () => {
      const decision = decisionEngine.decide(0.60, 'MEDIUM', 'Bank Decline', 0, 1999, 'CARD_DEBIT');
      expect(decision.recommended_action).toBe('SUGGEST_ALTERNATE_METHOD');
    });

    it('recommends SEND_PAYMENT_REMINDER for medium recovery probability and moderate retry', () => {
      const decision = decisionEngine.decide(0.55, 'MEDIUM', 'Insufficient Funds', 1, 3000, 'UPI');
      expect(decision.recommended_action).toBe('SEND_PAYMENT_REMINDER');
    });

    it('recommends NO_ACTION when amount is 0', () => {
      const decision = decisionEngine.decide(0.85, 'HIGH', 'Network Failure', 0, 0, 'UPI');
      expect(decision.recommended_action).toBe('NO_ACTION');
    });
  });

  describe('5. Edge Cases Handling', () => {
    it('handles ₹0 amount safely without division errors', () => {
      const pred = predictor.predict({
        transaction_id: 'TXN_ZERO',
        amount: 0,
        payment_method: 'UPI',
        failure_reason: 'Network Failure'
      });
      expect(pred.amount).toBe(0);
      expect(pred.revenue_at_risk).toBe(0);
      expect(pred.expected_recovery).toBe(0);
      expect(pred.recommended_action).toBe('NO_ACTION');
    });

    it('handles negative amount safely', () => {
      const pred = predictor.predict({
        transaction_id: 'TXN_NEG',
        amount: -500,
        payment_method: 'UPI'
      });
      expect(pred.revenue_at_risk).toBe(0);
      expect(pred.recommended_action).toBe('NO_ACTION');
    });

    it('handles missing failure reason gracefully', () => {
      const pred = predictor.predict({
        transaction_id: 'TXN_NO_REASON',
        amount: 1499,
        payment_method: 'CARD_CREDIT'
      });
      expect(pred.root_cause).toBeDefined();
      expect(pred.risk_score).toBeGreaterThan(0);
      expect(pred.recommended_action).toBeDefined();
    });

    it('handles unknown payment method gracefully', () => {
      const pred = predictor.predict({
        transaction_id: 'TXN_UNKNOWN_METHOD',
        amount: 2999,
        payment_method: 'CRYPTO_UNSUPPORTED',
        failure_reason: 'Network Failure'
      });
      expect(pred.recovery_probability).toBeGreaterThan(0);
      expect(pred.risk_level).toBeDefined();
    });

    it('handles retry count well above maximum (> 5)', () => {
      const pred = predictor.predict({
        transaction_id: 'TXN_HIGH_RETRIES',
        amount: 3499,
        payment_method: 'CARD_CREDIT',
        failure_reason: 'Insufficient Funds',
        retry_count: 8
      });
      expect(pred.recommended_action).not.toBe('RETRY_PAYMENT');
      expect(['GENERATE_PAYMENT_LINK', 'HUMAN_ESCALATION']).toContain(pred.recommended_action);
    });
  });

  describe('6. Batch Prediction & Aggregation', () => {
    it('correctly aggregates multiple transactions into a batch summary', () => {
      const batchInput = [
        { transaction_id: 'B1', amount: 1000, failure_reason: 'Network Failure', retry_count: 0 },
        { transaction_id: 'B2', amount: 2000, failure_reason: 'Insufficient Funds', retry_count: 1 },
        { transaction_id: 'B3', amount: 5000, failure_reason: 'Bank Decline', retry_count: 3 }
      ];

      const batch = predictor.batchPredict(batchInput);

      expect(batch.total_transactions).toBe(3);
      expect(batch.total_failed_amount).toBe(8000);
      expect(batch.total_revenue_at_risk).toBeGreaterThan(0);
      expect(batch.expected_recoverable_revenue).toBeGreaterThan(0);
      expect(batch.predictions.length).toBe(3);
      expect(batch.risk_distribution).toBeDefined();
      expect(batch.recovery_distribution).toBeDefined();
      expect(batch.recommended_actions).toBeDefined();
    });
  });

  describe('7. Explainability & Contributing Factors', () => {
    it('returns top contributing factors with impact and direction', () => {
      const pred = predictor.predict({
        transaction_id: 'TXN_EXP',
        amount: 4999,
        historical_success_rate: 0.96,
        successful_transactions: 12,
        retry_count: 0,
        failure_reason: 'Network Failure'
      });

      expect(pred.explanation.length).toBeGreaterThan(0);
      pred.explanation.forEach((exp) => {
        expect(exp.feature).toBeDefined();
        expect(exp.impact).toBeGreaterThanOrEqual(0);
        expect(['+', '-']).toContain(exp.direction);
        expect(exp.description.length).toBeGreaterThan(5);
      });
    });
  });

  describe('8. Model Evaluation & ROC-AUC Engine', () => {
    it('evaluates classification metrics accurately', () => {
      const yTrue = [1, 1, 1, 0, 0, 1, 0, 0, 1, 0];
      const yProb = [0.9, 0.8, 0.7, 0.2, 0.1, 0.85, 0.3, 0.4, 0.75, 0.15];

      const metrics = ModelEvaluator.evaluate(yTrue, yProb, 0.5);

      expect(metrics.accuracy).toBe(1.0);
      expect(metrics.precision).toBe(1.0);
      expect(metrics.recall).toBe(1.0);
      expect(metrics.f1_score).toBe(1.0);
      expect(metrics.roc_auc).toBe(1.0);
      expect(metrics.false_positive_rate).toBe(0.0);
      expect(metrics.false_negative_rate).toBe(0.0);
      expect(metrics.confusion_matrix.true_positives).toBe(5);
      expect(metrics.confusion_matrix.true_negatives).toBe(5);
    });
  });

  describe('9. Data Preprocessor & Feature Encoding Integrity', () => {
    it('scales numerical features and one-hot encodes categoricals correctly', () => {
      const preprocessor = predictor.preprocessor;
      expect(preprocessor.isFitted).toBe(true);

      const featureVector = preprocessor.transformRecord({
        amount: 2500,
        payment_method: 'UPI',
        failure_reason: 'Network Failure',
        customer_segment: 'GROWTH',
        subscription_status: 'ACTIVE'
      });

      expect(featureVector.length).toBe(predictor.metadata?.features_count || 38);
      featureVector.forEach((val) => {
        expect(isNaN(val)).toBe(false);
        expect(isFinite(val)).toBe(true);
      });
    });

    it('loads model artifact with valid hyperparameters and feature importances', () => {
      expect(predictor.isReady).toBe(true);
      expect(predictor.metadata?.model_version).toBeDefined();
      expect(predictor.metadata?.features_count).toBeGreaterThan(20);
      expect(Object.keys(predictor.model.featureImportances).length).toBeGreaterThan(0);
    });
  });
});
