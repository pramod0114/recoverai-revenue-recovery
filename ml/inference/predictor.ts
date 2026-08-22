import fs from 'fs';
import path from 'path';
import {
  PaymentDataRecord,
  PredictionResult,
  BatchPredictionSummary,
  RiskLevel,
  RecoveryLevel,
  ModelMetadata
} from '../preprocessing/types.js';
import { DataPreprocessor } from '../preprocessing/preprocessor.js';
import { TabularRecoveryEnsemble } from '../models/ensemble_model.js';
import { RootCauseAnalyzer } from './root_cause.js';
import { DecisionEngine } from './decision_engine.js';
import { ExplainabilityEngine } from './explainability.js';

export interface PredictorConfig {
  modelPath?: string;
  riskThresholds?: {
    low_max: number;
    medium_max: number;
    high_max: number;
  };
  recoveryThresholds?: {
    high_min: number;
    medium_min: number;
  };
  safetyLimits?: {
    max_retries: number;
    min_recovery_probability_for_auto_retry: number;
    max_amount_for_auto_retry: number;
  };
}

export class MLRecoveryPredictor {
  private static instance: MLRecoveryPredictor | null = null;
  public preprocessor: DataPreprocessor;
  public model: TabularRecoveryEnsemble;
  public decisionEngine: DecisionEngine;
  public metadata: ModelMetadata | null = null;
  public isReady = false;

  private riskThresholds = {
    low_max: 0.29,
    medium_max: 0.59,
    high_max: 0.79
  };

  private recoveryThresholds = {
    high_min: 0.70,
    medium_min: 0.40
  };

  constructor(config?: PredictorConfig) {
    this.preprocessor = new DataPreprocessor();
    this.model = new TabularRecoveryEnsemble();
    this.decisionEngine = new DecisionEngine(config?.safetyLimits);

    if (config?.riskThresholds) this.riskThresholds = config.riskThresholds;
    if (config?.recoveryThresholds) this.recoveryThresholds = config.recoveryThresholds;
  }

  public static getInstance(): MLRecoveryPredictor {
    if (!MLRecoveryPredictor.instance) {
      MLRecoveryPredictor.instance = new MLRecoveryPredictor();
      MLRecoveryPredictor.instance.loadOrTrainDefault();
    }
    return MLRecoveryPredictor.instance;
  }

  // Load saved model artifact from disk or train if not present
  public loadOrTrainDefault(): boolean {
    const candidatePaths = [
      path.join(process.cwd(), 'ml', 'models', 'recovery-model-v1.json'),
      path.join(process.cwd(), 'ml', 'models', 'recovery_model_v1.json')
    ];

    for (const modelFilePath of candidatePaths) {
      if (fs.existsSync(modelFilePath)) {
        try {
          const rawContent = fs.readFileSync(modelFilePath, 'utf-8');
          const serialized = JSON.parse(rawContent);
          this.metadata = serialized.metadata;
          this.preprocessor = new DataPreprocessor(serialized.preprocessorConfig);
          this.model = new TabularRecoveryEnsemble(serialized.preprocessorConfig.featureNames);
          this.model.fromJSON(serialized.modelWeights, serialized.preprocessorConfig.featureNames);
          this.isReady = true;
          console.log(`[ML Predictor] Loaded model ${this.metadata?.model_version || 'v1'} with ${this.metadata?.feature_names.length} features.`);
          return true;
        } catch (err) {
          console.warn('[ML Predictor] Error loading model from file:', modelFilePath, err);
        }
      }
    }
    return false;
  }

  // Classify numeric risk score into categorical RiskLevel
  public classifyRiskLevel(riskScore: number): RiskLevel {
    if (riskScore <= this.riskThresholds.low_max) return 'LOW';
    if (riskScore <= this.riskThresholds.medium_max) return 'MEDIUM';
    if (riskScore <= this.riskThresholds.high_max) return 'HIGH';
    return 'CRITICAL';
  }

  // Classify recovery probability into categorical RecoveryLevel
  public classifyRecoveryLevel(recoveryProb: number): RecoveryLevel {
    if (recoveryProb >= this.recoveryThresholds.high_min) return 'HIGH';
    if (recoveryProb >= this.recoveryThresholds.medium_min) return 'MEDIUM';
    return 'LOW';
  }

  // Predict on a single payment record or transaction payload
  public predict(record: Partial<PaymentDataRecord>): PredictionResult {
    const rawAmount = typeof record.amount === 'number' && !isNaN(record.amount) ? record.amount : 0;
    const txnId = record.transaction_id || `txn_pred_${Date.now()}`;

    // Handle edge case: Negative or 0 amount
    if (rawAmount <= 0) {
      return {
        transaction_id: txnId,
        amount: Math.max(0, rawAmount),
        risk_score: 0.0,
        risk_level: 'LOW',
        recovery_probability: 0.0,
        recovery_level: 'LOW',
        revenue_at_risk: 0.0,
        expected_recovery: 0.0,
        root_cause: 'Other',
        root_cause_confidence: 1.0,
        recommended_action: 'NO_ACTION',
        action_reason: 'Zero or negative transaction amount requires no recovery execution.',
        explanation: [
          {
            feature: 'amount',
            impact: 1.0,
            direction: '-',
            description: 'Non-positive transaction amount.'
          }
        ],
        model_version: this.metadata?.model_version || 'recovery-model-v1',
        created_at: new Date().toISOString()
      };
    }

    // Transform record into feature vector
    const vector = this.preprocessor.transformRecord(record);

    // Compute ML predictions
    const recoveryProb = this.model.predictProbability(vector);
    const riskScore = this.model.predictRiskScore(vector, recoveryProb, rawAmount);

    const riskLevel = this.classifyRiskLevel(riskScore);
    const recoveryLevel = this.classifyRecoveryLevel(recoveryProb);

    // Calculate revenue metrics
    const revenue_at_risk = Number((rawAmount * riskScore).toFixed(2));
    const expected_recovery = Number((rawAmount * recoveryProb).toFixed(2));

    // Root cause analysis
    const rootCauseDiagnosis = RootCauseAnalyzer.diagnose(
      record.failure_reason,
      record.payment_method,
      record
    );

    // Bounded rule decision
    const decision = this.decisionEngine.decide(
      recoveryProb,
      recoveryLevel,
      rootCauseDiagnosis.root_cause,
      record.retry_count ?? 0,
      rawAmount,
      record.payment_method
    );

    // Model feature explainability
    const modelContributions = this.model.explainPrediction(vector);
    const explanation = ExplainabilityEngine.explain(record, modelContributions);

    return {
      transaction_id: txnId,
      amount: rawAmount,
      risk_score: riskScore,
      risk_level: riskLevel,
      recovery_probability: recoveryProb,
      recovery_level: recoveryLevel,
      revenue_at_risk,
      expected_recovery,
      root_cause: rootCauseDiagnosis.root_cause,
      root_cause_confidence: rootCauseDiagnosis.confidence,
      recommended_action: decision.recommended_action,
      action_reason: decision.action_reason,
      explanation,
      model_version: this.metadata?.model_version || 'recovery-model-v1',
      created_at: new Date().toISOString()
    };
  }

  // Batch analysis across multiple records
  public batchPredict(records: Partial<PaymentDataRecord>[]): BatchPredictionSummary {
    const predictions: PredictionResult[] = [];
    let totalFailedAmount = 0;
    let totalRevenueAtRisk = 0;
    let totalExpectedRecovery = 0;
    let highRiskCount = 0;

    const riskDistribution: Record<RiskLevel, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };

    const recoveryDistribution: Record<RecoveryLevel, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    const recommendedActions: Record<string, number> = {
      RETRY_PAYMENT: 0,
      SEND_PAYMENT_REMINDER: 0,
      GENERATE_PAYMENT_LINK: 0,
      SUGGEST_ALTERNATE_METHOD: 0,
      HUMAN_ESCALATION: 0,
      NO_ACTION: 0
    };

    for (const r of records) {
      const pred = this.predict(r);
      predictions.push(pred);

      totalFailedAmount += pred.amount;
      totalRevenueAtRisk += pred.revenue_at_risk;
      totalExpectedRecovery += pred.expected_recovery;

      riskDistribution[pred.risk_level] = (riskDistribution[pred.risk_level] || 0) + 1;
      recoveryDistribution[pred.recovery_level] = (recoveryDistribution[pred.recovery_level] || 0) + 1;
      recommendedActions[pred.recommended_action] = (recommendedActions[pred.recommended_action] || 0) + 1;

      if (pred.risk_level === 'HIGH' || pred.risk_level === 'CRITICAL') {
        highRiskCount++;
      }
    }

    const totalTxns = predictions.length;
    const recoveryRatePrediction =
      totalFailedAmount > 0 ? Number(((totalExpectedRecovery / totalFailedAmount) * 100).toFixed(1)) : 0;

    return {
      total_transactions: totalTxns,
      total_failed_amount: Number(totalFailedAmount.toFixed(2)),
      total_revenue_at_risk: Number(totalRevenueAtRisk.toFixed(2)),
      expected_recoverable_revenue: Number(totalExpectedRecovery.toFixed(2)),
      high_risk_count: highRiskCount,
      recovery_rate_prediction: recoveryRatePrediction,
      risk_distribution: riskDistribution,
      recovery_distribution: recoveryDistribution,
      recommended_actions: recommendedActions as any,
      predictions
    };
  }
}
