import { Router, Request, Response } from 'express';
import { memoryStore } from '../db/connection.js';
import { MLRecoveryPredictor } from '../../ml/inference/predictor.js';
import { trainAndSaveModel } from '../../ml/training/trainer.js';
import { MlPredictionRecord } from '../types/index.js';
import { PaymentDataRecord } from '../../ml/preprocessing/types.js';

export const mlRouter = Router();

const predictor = MLRecoveryPredictor.getInstance();

// 1. POST /api/ml/predict - Single transaction prediction
mlRouter.post('/predict', (req: Request, res: Response): void => {
  try {
    const {
      transaction_id,
      amount,
      payment_method,
      failure_reason,
      customer_id,
      customer_age_days,
      previous_transactions,
      successful_transactions,
      failed_transactions,
      previous_recovery_count,
      retry_count,
      time_since_failure,
      customer_segment,
      subscription_status,
      days_since_last_payment,
      historical_success_rate,
      is_weekend,
      hour_of_day
    } = req.body || {};

    let resolvedRecord: Partial<any> = {};

    // 1. If transaction_id is provided, check if it exists in memoryStore
    if (transaction_id) {
      const existingPayment = Array.from(memoryStore.payments.values()).find(
        (p) => p.transaction_id === transaction_id || p.id === transaction_id
      );

      if (existingPayment) {
        const customer = existingPayment.customer_id
          ? memoryStore.customers.get(existingPayment.customer_id)
          : null;

        const prevSuccess = customer?.total_successful_payments ?? existingPayment.previous_successful_payments ?? 5;
        const prevFail = customer?.total_failed_payments ?? existingPayment.previous_failed_payments ?? 1;
        const totalTxns = prevSuccess + prevFail;

        resolvedRecord = {
          transaction_id: existingPayment.transaction_id || transaction_id,
          customer_id: existingPayment.customer_id,
          amount: existingPayment.amount,
          payment_method: existingPayment.payment_method,
          failure_reason: existingPayment.failure_reason || existingPayment.failure_category || 'Network Failure',
          customer_age_days: customer?.customer_age_days ?? existingPayment.customer_age_days ?? 60,
          previous_transactions: totalTxns,
          successful_transactions: prevSuccess,
          failed_transactions: prevFail,
          previous_recovery_count: 1,
          retry_count: existingPayment.retry_count ?? 0,
          time_since_failure: 30,
          customer_segment: customer?.lifetime_value && customer.lifetime_value > 20000 ? 'ENTERPRISE' : 'GROWTH',
          subscription_status: existingPayment.subscription_id ? 'ACTIVE' : 'NONE',
          days_since_last_payment: 10,
          historical_success_rate: totalTxns > 0 ? prevSuccess / totalTxns : 0.8,
          is_weekend: 0,
          hour_of_day: 14
        };
      }
    }

    // Merge explicitly passed parameters over resolved record
    resolvedRecord = {
      ...resolvedRecord,
      transaction_id: transaction_id || resolvedRecord.transaction_id || `TXN_${Date.now()}`,
      amount: amount !== undefined ? Number(amount) : (resolvedRecord.amount ?? 999),
      payment_method: payment_method || resolvedRecord.payment_method || 'UPI',
      failure_reason: failure_reason || resolvedRecord.failure_reason || 'Network Failure',
      customer_id: customer_id || resolvedRecord.customer_id || 'cust_default',
      customer_age_days: customer_age_days !== undefined ? Number(customer_age_days) : (resolvedRecord.customer_age_days ?? 45),
      previous_transactions: previous_transactions !== undefined ? Number(previous_transactions) : (resolvedRecord.previous_transactions ?? 6),
      successful_transactions: successful_transactions !== undefined ? Number(successful_transactions) : (resolvedRecord.successful_transactions ?? 5),
      failed_transactions: failed_transactions !== undefined ? Number(failed_transactions) : (resolvedRecord.failed_transactions ?? 1),
      previous_recovery_count: previous_recovery_count !== undefined ? Number(previous_recovery_count) : (resolvedRecord.previous_recovery_count ?? 1),
      retry_count: retry_count !== undefined ? Number(retry_count) : (resolvedRecord.retry_count ?? 0),
      time_since_failure: time_since_failure !== undefined ? Number(time_since_failure) : (resolvedRecord.time_since_failure ?? 25),
      customer_segment: customer_segment || resolvedRecord.customer_segment || 'GROWTH',
      subscription_status: subscription_status || resolvedRecord.subscription_status || 'ACTIVE',
      days_since_last_payment: days_since_last_payment !== undefined ? Number(days_since_last_payment) : (resolvedRecord.days_since_last_payment ?? 12),
      historical_success_rate: historical_success_rate !== undefined ? Number(historical_success_rate) : (resolvedRecord.historical_success_rate ?? 0.83),
      is_weekend: is_weekend !== undefined ? Number(is_weekend) : (resolvedRecord.is_weekend ?? 0),
      hour_of_day: hour_of_day !== undefined ? Number(hour_of_day) : (resolvedRecord.hour_of_day ?? 14)
    };

    // Run ML prediction
    const prediction = predictor.predict(resolvedRecord);

    // Save prediction result in Database/MemoryStore (Requirement 14)
    const storedRecord: MlPredictionRecord = {
      id: `mlp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      transaction_id: prediction.transaction_id,
      risk_score: prediction.risk_score,
      risk_level: prediction.risk_level,
      recovery_probability: prediction.recovery_probability,
      recovery_level: prediction.recovery_level,
      revenue_at_risk: prediction.revenue_at_risk,
      expected_recovery: prediction.expected_recovery,
      root_cause: prediction.root_cause,
      root_cause_confidence: prediction.root_cause_confidence,
      recommended_action: prediction.recommended_action,
      action_reason: prediction.action_reason,
      explanation: prediction.explanation,
      model_version: prediction.model_version,
      created_at: prediction.created_at
    };

    memoryStore.mlPredictions.set(prediction.transaction_id, storedRecord);

    res.json({
      success: true,
      data: prediction
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ML_PREDICTION_ERROR',
        message: error.message || 'Error processing ML prediction'
      }
    });
  }
});

// 2. POST /api/ml/batch-predict - Batch analysis over transactions
mlRouter.post('/batch-predict', (req: Request, res: Response): void => {
  try {
    const { transactions, transaction_ids, analyze_all_open } = req.body || {};
    let recordsToPredict: Partial<any>[] = [];

    if (Array.isArray(transactions) && transactions.length > 0) {
      recordsToPredict = transactions;
    } else if (Array.isArray(transaction_ids) && transaction_ids.length > 0) {
      recordsToPredict = transaction_ids.map((id: string) => {
        const found = Array.from(memoryStore.payments.values()).find(
          (p) => p.transaction_id === id || p.id === id
        );
        if (found) {
          return {
            transaction_id: found.transaction_id,
            amount: found.amount,
            payment_method: found.payment_method,
            failure_reason: found.failure_reason || found.failure_category || 'Network Failure',
            retry_count: found.retry_count || 0
          };
        }
        return { transaction_id: id, amount: 1499, payment_method: 'UPI', failure_reason: 'Network Failure' };
      });
    } else {
      // Default: analyze all failed/at-risk payments in memoryStore
      const allPayments = Array.from(memoryStore.payments.values());
      const failedPayments = allPayments.filter(
        (p) => p.payment_status === 'FAILED' || p.payment_status === 'ABANDONED' || p.recovery_status === 'AT_RISK' || p.recovery_status === 'RECOVERING'
      );

      const sourceList = failedPayments.length > 0 ? failedPayments.slice(0, 100) : allPayments.slice(0, 50);

      recordsToPredict = sourceList.map((p) => ({
        transaction_id: p.transaction_id,
        amount: p.amount,
        payment_method: p.payment_method,
        failure_reason: p.failure_reason || p.failure_category || 'Network Failure',
        retry_count: p.retry_count ?? 0,
        customer_age_days: p.customer_age_days ?? 45,
        previous_transactions: (p.previous_successful_payments ?? 3) + (p.previous_failed_payments ?? 1),
        successful_transactions: p.previous_successful_payments ?? 3,
        failed_transactions: p.previous_failed_payments ?? 1,
        subscription_status: 'ACTIVE'
      }));
    }

    const batchSummary = predictor.batchPredict(recordsToPredict);

    // Store batch predictions to memoryStore
    for (const pred of batchSummary.predictions) {
      memoryStore.mlPredictions.set(pred.transaction_id, {
        id: `mlp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transaction_id: pred.transaction_id,
        risk_score: pred.risk_score,
        risk_level: pred.risk_level,
        recovery_probability: pred.recovery_probability,
        recovery_level: pred.recovery_level,
        revenue_at_risk: pred.revenue_at_risk,
        expected_recovery: pred.expected_recovery,
        root_cause: pred.root_cause,
        root_cause_confidence: pred.root_cause_confidence,
        recommended_action: pred.recommended_action,
        action_reason: pred.action_reason,
        explanation: pred.explanation,
        model_version: pred.model_version,
        created_at: pred.created_at
      });
    }

    res.json({
      success: true,
      data: batchSummary
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ML_BATCH_PREDICTION_ERROR',
        message: error.message || 'Error processing batch predictions'
      }
    });
  }
});

// 3. GET /api/ml/metrics - Held-out test set evaluation metrics
mlRouter.get('/metrics', (_req: Request, res: Response): void => {
  try {
    const metadata = predictor.metadata;
    if (!metadata) {
      res.status(503).json({
        success: false,
        error: { code: 'MODEL_NOT_READY', message: 'ML model is currently initializing' }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        model_version: metadata.model_version,
        model_type: metadata.model_type,
        trained_at: metadata.trained_at,
        training_samples: metadata.training_samples,
        test_samples: metadata.test_samples,
        metrics: metadata.metrics
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'METRICS_ERROR', message: error.message }
    });
  }
});

// 4. GET /api/ml/model-info - Model information, features, thresholds & safety limits
mlRouter.get('/model-info', (_req: Request, res: Response): void => {
  try {
    const metadata = predictor.metadata;
    res.json({
      success: true,
      data: {
        model_version: metadata?.model_version || 'recovery-model-v1',
        model_type: metadata?.model_type || 'TabularGradientBoostedEnsemble',
        trained_at: metadata?.trained_at || new Date().toISOString(),
        training_samples: metadata?.training_samples || 4000,
        test_samples: metadata?.test_samples || 1000,
        features_count: metadata?.features_count || 38,
        feature_names: metadata?.feature_names || [],
        hyperparameters: metadata?.hyperparameters || {
          numTrees: 28,
          maxDepth: 4,
          learningRate: 0.1,
          minSamplesSplit: 8
        },
        thresholds: metadata?.thresholds || {
          risk: { low_max: 0.29, medium_max: 0.59, high_max: 0.79 },
          recovery: { high_min: 0.70, medium_min: 0.40 }
        },
        safety_limits: metadata?.safety_limits || {
          max_retries: 2,
          min_recovery_probability_for_auto_retry: 0.70,
          max_amount_for_auto_retry: 100000
        },
        feature_importances: predictor.model.featureImportances
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'MODEL_INFO_ERROR', message: error.message }
    });
  }
});

// 5. POST /api/ml/retrain - Retrain model on demand
mlRouter.post('/retrain', async (req: Request, res: Response): Promise<void> => {
  try {
    const { count = 5000, seed = 42, version = `recovery-model-v${Date.now().toString().slice(-4)}` } = req.body || {};
    const result = await trainAndSaveModel(count, seed, version);
    predictor.loadOrTrainDefault();

    res.json({
      success: true,
      message: `Model successfully trained and deployed as ${version}`,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'RETRAIN_ERROR', message: error.message }
    });
  }
});

// 6. GET /api/ml/predictions - Retrieve stored predictions
mlRouter.get('/predictions', (req: Request, res: Response): void => {
  try {
    const limit = Math.min(100, Number(req.query.limit || 50));
    const allPredictions = Array.from(memoryStore.mlPredictions.values());
    const sorted = allPredictions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({
      success: true,
      data: sorted.slice(0, limit),
      total: allPredictions.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_PREDICTIONS_ERROR', message: error.message }
    });
  }
});
