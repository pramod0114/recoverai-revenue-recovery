import fs from 'fs';
import path from 'path';
import { generateSyntheticDataset, saveSyntheticDataset } from '../data/dataset_generator.js';
import { DataPreprocessor } from '../preprocessing/preprocessor.js';
import { TabularRecoveryEnsemble } from '../models/ensemble_model.js';
import { ModelEvaluator } from '../evaluation/evaluator.js';
import { ModelMetadata } from '../preprocessing/types.js';

export async function trainAndSaveModel(count = 5000, seed = 42, version = 'recovery-model-v1') {
  console.log(`[ML Training] 1. Generating ${count} realistic synthetic payment records (seed=${seed})...`);
  const rawDataset = generateSyntheticDataset(count, seed);
  saveSyntheticDataset(rawDataset, 'dataset_5000.json');

  console.log('[ML Training] 2. Data Preprocessing & Leakage-Free Train/Test Split (80/20)...');
  const preprocessor = new DataPreprocessor();
  const cleanedRecords = preprocessor.cleanAndDeduplicate(rawDataset);

  const { train: trainRecords, test: testRecords } = DataPreprocessor.trainTestSplit(
    cleanedRecords,
    0.2,
    seed
  );

  // Fit preprocessor on training data ONLY
  preprocessor.fit(trainRecords);

  const { X: X_train, y: y_train } = preprocessor.transform(trainRecords);
  const { X: X_test, y: y_test } = preprocessor.transform(testRecords);

  console.log(`[ML Training] Features (${preprocessor.config.featureNames.length}): ${preprocessor.config.featureNames.join(', ')}`);
  console.log(`[ML Training] Train set size: ${X_train.length}, Test set size: ${X_test.length}`);

  console.log('[ML Training] 3. Training Tabular Gradient-Boosted Decision Ensemble...');
  const ensemble = new TabularRecoveryEnsemble(preprocessor.config.featureNames);
  ensemble.train(X_train, y_train, 28, 4, 0.1, 8);

  console.log('[ML Training] 4. Evaluating on Held-Out Test Set...');
  const y_test_prob = X_test.map((x) => ensemble.predictProbability(x));
  const metrics = ModelEvaluator.evaluate(y_test, y_test_prob, 0.5);
  metrics.train_sample_size = X_train.length;
  metrics.test_sample_size = X_test.length;

  console.log('====================================================');
  console.log('           MODEL EVALUATION METRICS REPORT          ');
  console.log('====================================================');
  console.log(` Model Version        : ${version}`);
  console.log(` Accuracy             : ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(` Precision            : ${(metrics.precision * 100).toFixed(2)}%`);
  console.log(` Recall               : ${(metrics.recall * 100).toFixed(2)}%`);
  console.log(` F1 Score             : ${(metrics.f1_score * 100).toFixed(2)}%`);
  console.log(` ROC-AUC Score        : ${(metrics.roc_auc * 100).toFixed(2)}%`);
  console.log(` False Positive Rate  : ${(metrics.false_positive_rate * 100).toFixed(2)}%`);
  console.log(` False Negative Rate  : ${(metrics.false_negative_rate * 100).toFixed(2)}%`);
  console.log(` Confusion Matrix     : TP=${metrics.confusion_matrix.true_positives}, FP=${metrics.confusion_matrix.false_positives}, TN=${metrics.confusion_matrix.true_negatives}, FN=${metrics.confusion_matrix.false_negatives}`);
  console.log(` Est. FP Cost Impact  : ₹${metrics.estimated_false_positive_cost.toLocaleString()}`);
  console.log('====================================================');

  const metadata: ModelMetadata = {
    model_version: version,
    model_type: 'TabularGradientBoostedEnsemble',
    trained_at: new Date().toISOString(),
    training_samples: X_train.length,
    test_samples: X_test.length,
    features_count: preprocessor.config.featureNames.length,
    feature_names: preprocessor.config.featureNames,
    metrics,
    hyperparameters: {
      numTrees: 28,
      maxDepth: 4,
      learningRate: 0.1,
      minSamplesSplit: 8,
      seed
    },
    thresholds: {
      risk: {
        low_max: 0.29,
        medium_max: 0.59,
        high_max: 0.79
      },
      recovery: {
        high_min: 0.70,
        medium_min: 0.40
      }
    },
    safety_limits: {
      max_retries: 2,
      min_recovery_probability_for_auto_retry: 0.70,
      max_amount_for_auto_retry: 100000
    }
  };

  const serializedModel = {
    metadata,
    preprocessorConfig: preprocessor.config,
    modelWeights: ensemble.toJSON()
  };

  const modelsDir = path.join(process.cwd(), 'ml', 'models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const modelPath = path.join(modelsDir, `${version}.json`);
  fs.writeFileSync(modelPath, JSON.stringify(serializedModel, null, 2), 'utf-8');
  console.log(`[ML Training] 5. Successfully saved serialized trained model to ${modelPath}`);

  return { metadata, modelPath, metrics };
}

// Run training if executed as script
if (process.argv[1]?.includes('trainer.ts')) {
  trainAndSaveModel(5000, 42, 'recovery-model-v1').catch((err) => {
    console.error('[ML Training] Error training model:', err);
    process.exit(1);
  });
}
