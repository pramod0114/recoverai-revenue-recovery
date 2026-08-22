import { EvaluationMetrics, ConfusionMatrix } from '../preprocessing/types.js';

export class ModelEvaluator {
  public static evaluate(
    yTrue: number[],
    yProb: number[],
    threshold = 0.5,
    avgFalsePositiveCost = 25, // INR cost of sending unnecessary notifications or triggering unnecessary dunning
    avgFalseNegativeCost = 350 // INR average recoverable revenue lost by not attempting recovery
  ): EvaluationMetrics {
    const total = yTrue.length;
    if (total === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1_score: 0,
        roc_auc: 0,
        confusion_matrix: { true_positives: 0, false_positives: 0, true_negatives: 0, false_negatives: 0 },
        false_positive_rate: 0,
        false_negative_rate: 0,
        estimated_false_positive_cost: 0,
        test_sample_size: 0,
        train_sample_size: 0
      };
    }

    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (let i = 0; i < total; i++) {
      const pred = yProb[i] >= threshold ? 1 : 0;
      const actual = yTrue[i];

      if (pred === 1 && actual === 1) tp++;
      else if (pred === 1 && actual === 0) fp++;
      else if (pred === 0 && actual === 0) tn++;
      else if (pred === 0 && actual === 1) fn++;
    }

    const accuracy = (tp + tn) / total;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1_score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const false_positive_rate = fp + tn > 0 ? fp / (fp + tn) : 0;
    const false_negative_rate = fn + tp > 0 ? fn / (fn + tp) : 0;

    // Calculate ROC-AUC via Trapezoidal Rule over ranked probabilities
    const roc_auc = ModelEvaluator.calculateRocAuc(yTrue, yProb);

    // False Positive and False Negative financial impact
    const estimated_false_positive_cost = fp * avgFalsePositiveCost + fn * avgFalseNegativeCost;

    return {
      accuracy: Number(accuracy.toFixed(4)),
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1_score: Number(f1_score.toFixed(4)),
      roc_auc: Number(roc_auc.toFixed(4)),
      confusion_matrix: {
        true_positives: tp,
        false_positives: fp,
        true_negatives: tn,
        false_negatives: fn
      },
      false_positive_rate: Number(false_positive_rate.toFixed(4)),
      false_negative_rate: Number(false_negative_rate.toFixed(4)),
      estimated_false_positive_cost,
      test_sample_size: total,
      train_sample_size: 0
    };
  }

  // Exact ROC-AUC Computation
  public static calculateRocAuc(yTrue: number[], yProb: number[]): number {
    const combined = yTrue.map((actual, idx) => ({ actual, prob: yProb[idx] }));
    // Sort descending by predicted probability
    combined.sort((a, b) => b.prob - a.prob);

    const posCount = yTrue.filter((y) => y === 1).length;
    const negCount = yTrue.length - posCount;

    if (posCount === 0 || negCount === 0) return 0.5;

    let tp = 0;
    let fp = 0;
    let prevTpr = 0;
    let prevFpr = 0;
    let auc = 0;

    for (let i = 0; i < combined.length; i++) {
      if (combined[i].actual === 1) {
        tp++;
      } else {
        fp++;
      }

      const tpr = tp / posCount;
      const fpr = fp / negCount;

      // Trapezoid area: (FPR_i - FPR_{i-1}) * (TPR_i + TPR_{i-1}) / 2
      auc += (fpr - prevFpr) * ((tpr + prevTpr) / 2);
      prevTpr = tpr;
      prevFpr = fpr;
    }

    return Math.max(0.5, Math.min(1.0, auc));
  }
}
