export interface DecisionTreeNode {
  featureIndex?: number;
  featureName?: string;
  threshold?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  probability?: number;
  isLeaf: boolean;
}

export interface ModelWeights {
  version: string;
  type: string;
  trees: DecisionTreeNode[];
  coefficients: number[];
  intercept: number;
  featureImportances: Record<string, number>;
  hyperparameters: {
    numTrees: number;
    maxDepth: number;
    learningRate: number;
    minSamplesSplit: number;
  };
}

export class TabularRecoveryEnsemble {
  public trees: DecisionTreeNode[] = [];
  public coefficients: number[] = [];
  public intercept = 0;
  public featureImportances: Record<string, number> = {};
  public featureNames: string[] = [];

  constructor(featureNames: string[] = []) {
    this.featureNames = featureNames;
  }

  // Logistic Sigmoid
  private sigmoid(z: number): number {
    if (z > 20) return 0.99999;
    if (z < -20) return 0.00001;
    return 1.0 / (1.0 + Math.exp(-z));
  }

  // Train a gradient-boosted decision ensemble + logistic calibration
  public train(
    X: number[][],
    y: number[],
    numTrees = 24,
    maxDepth = 4,
    learningRate = 0.1,
    minSamplesSplit = 10
  ): void {
    const numSamples = X.length;
    if (numSamples === 0) return;
    const numFeatures = X[0].length;

    // Initialize baseline log-odds
    const positiveCount = y.filter((val) => val === 1).length;
    const p0 = Math.max(0.01, Math.min(0.99, positiveCount / numSamples));
    this.intercept = Math.log(p0 / (1 - p0));

    // Train gradient descent logistic coefficients for linear baseline
    this.coefficients = new Array(numFeatures).fill(0);
    const lrCoeff = 0.05;
    const iterations = 120;

    for (let iter = 0; iter < iterations; iter++) {
      const gradients = new Array(numFeatures).fill(0);
      let gradIntercept = 0;

      for (let i = 0; i < numSamples; i++) {
        let linearPred = this.intercept;
        for (let j = 0; j < numFeatures; j++) {
          linearPred += this.coefficients[j] * X[i][j];
        }
        const prob = this.sigmoid(linearPred);
        const error = y[i] - prob;

        gradIntercept += error;
        for (let j = 0; j < numFeatures; j++) {
          gradients[j] += error * X[i][j];
        }
      }

      this.intercept += (lrCoeff * gradIntercept) / numSamples;
      for (let j = 0; j < numFeatures; j++) {
        // L2 regularization
        this.coefficients[j] += (lrCoeff * gradients[j]) / numSamples - 0.001 * this.coefficients[j];
      }
    }

    // Residual boosted decision trees
    const residuals = new Array(numSamples).fill(0);
    for (let i = 0; i < numSamples; i++) {
      let linearPred = this.intercept;
      for (let j = 0; j < numFeatures; j++) {
        linearPred += this.coefficients[j] * X[i][j];
      }
      residuals[i] = y[i] - this.sigmoid(linearPred);
    }

    this.trees = [];
    const importances: Record<string, number> = {};
    this.featureNames.forEach((name) => (importances[name] = 0));

    for (let t = 0; t < numTrees; t++) {
      const sampleIndices: number[] = [];
      // Subsampling 80% for bagging
      for (let s = 0; s < Math.floor(numSamples * 0.8); s++) {
        sampleIndices.push(Math.floor(Math.random() * numSamples));
      }

      const tree = this.buildTree(
        X,
        residuals,
        sampleIndices,
        0,
        maxDepth,
        minSamplesSplit,
        importances
      );
      this.trees.push(tree);

      // Update residuals
      for (let i = 0; i < numSamples; i++) {
        const treeVal = this.predictTree(tree, X[i]);
        residuals[i] -= learningRate * treeVal;
      }
    }

    // Normalize feature importances
    // Add linear coefficient magnitudes to tree split importances
    for (let j = 0; j < numFeatures; j++) {
      const name = this.featureNames[j] || `feature_${j}`;
      const coeffMagnitude = Math.abs(this.coefficients[j]);
      importances[name] = (importances[name] || 0) + coeffMagnitude * 1.5;
    }

    const totalImp = Object.values(importances).reduce((sum, v) => sum + v, 0) || 1;
    for (const key of Object.keys(importances)) {
      importances[key] = Number((importances[key] / totalImp).toFixed(4));
    }
    this.featureImportances = importances;
  }

  private buildTree(
    X: number[][],
    residuals: number[],
    indices: number[],
    depth: number,
    maxDepth: number,
    minSamplesSplit: number,
    importances: Record<string, number>
  ): DecisionTreeNode {
    const meanVal = indices.reduce((sum, idx) => sum + residuals[idx], 0) / (indices.length || 1);

    if (depth >= maxDepth || indices.length < minSamplesSplit) {
      return { isLeaf: true, probability: meanVal };
    }

    const numFeatures = X[0].length;
    let bestGain = -Infinity;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    // Random feature subspace (subset of features for random forest behavior)
    const featureSubsetCount = Math.max(3, Math.floor(Math.sqrt(numFeatures) * 1.5));
    const randomFeatures: number[] = [];
    while (randomFeatures.length < featureSubsetCount) {
      const feat = Math.floor(Math.random() * numFeatures);
      if (!randomFeatures.includes(feat)) randomFeatures.push(feat);
    }

    for (const f of randomFeatures) {
      const values = indices.map((idx) => X[idx][f]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (min === max) continue;

      // Test 5 candidate split thresholds
      for (let s = 1; s <= 5; s++) {
        const threshold = min + (s / 6) * (max - min);
        const left: number[] = [];
        const right: number[] = [];

        for (const idx of indices) {
          if (X[idx][f] <= threshold) left.push(idx);
          else right.push(idx);
        }

        if (left.length === 0 || right.length === 0) continue;

        const leftMean = left.reduce((sum, idx) => sum + residuals[idx], 0) / left.length;
        const rightMean = right.reduce((sum, idx) => sum + residuals[idx], 0) / right.length;
        const varianceReduction =
          left.length * Math.pow(leftMean - meanVal, 2) + right.length * Math.pow(rightMean - meanVal, 2);

        if (varianceReduction > bestGain) {
          bestGain = varianceReduction;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIndices = left;
          bestRightIndices = right;
        }
      }
    }

    if (bestFeature === -1 || bestGain <= 0) {
      return { isLeaf: true, probability: meanVal };
    }

    const featureName = this.featureNames[bestFeature] || `f_${bestFeature}`;
    importances[featureName] = (importances[featureName] || 0) + bestGain;

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      featureName,
      threshold: bestThreshold,
      left: this.buildTree(X, residuals, bestLeftIndices, depth + 1, maxDepth, minSamplesSplit, importances),
      right: this.buildTree(X, residuals, bestRightIndices, depth + 1, maxDepth, minSamplesSplit, importances)
    };
  }

  private predictTree(node: DecisionTreeNode, x: number[]): number {
    if (node.isLeaf || node.featureIndex === undefined || node.threshold === undefined) {
      return node.probability ?? 0;
    }
    if (x[node.featureIndex] <= node.threshold) {
      return this.predictTree(node.left!, x);
    } else {
      return this.predictTree(node.right!, x);
    }
  }

  // Predict Recovery Probability (0 to 1)
  public predictProbability(x: number[]): number {
    let logOdds = this.intercept;
    for (let j = 0; j < this.coefficients.length && j < x.length; j++) {
      logOdds += this.coefficients[j] * x[j];
    }

    for (const tree of this.trees) {
      logOdds += 0.1 * this.predictTree(tree, x);
    }

    const prob = this.sigmoid(logOdds);
    return Number(Math.max(0.01, Math.min(0.99, prob)).toFixed(4));
  }

  // Predict Revenue Risk Score (Probability that revenue is permanently lost / churns)
  public predictRiskScore(x: number[], recoveryProb: number, rawAmount: number): number {
    // Risk score is inverse of recoverability, calibrated by exposure amount and failure indicators
    let rawRisk = 1.0 - recoveryProb;
    
    // Amount factor: Higher exposure adds moderate risk pressure
    if (rawAmount > 20000) rawRisk = Math.min(0.99, rawRisk + 0.06);
    else if (rawAmount < 1000) rawRisk = Math.max(0.02, rawRisk - 0.04);

    return Number(Math.max(0.01, Math.min(0.99, rawRisk)).toFixed(4));
  }

  // Compute directional feature contributions for a specific prediction vector
  public explainPrediction(x: number[]): { feature: string; impact: number; direction: '+' | '-' }[] {
    const contributions: { feature: string; impact: number; direction: '+' | '-' }[] = [];

    for (let j = 0; j < this.coefficients.length && j < x.length; j++) {
      const name = this.featureNames[j] || `feature_${j}`;
      const contrib = this.coefficients[j] * x[j];
      if (Math.abs(contrib) > 0.05) {
        contributions.push({
          feature: name,
          impact: Number(Math.abs(contrib).toFixed(3)),
          direction: contrib >= 0 ? '+' : '-'
        });
      }
    }

    // Sort by largest absolute impact
    contributions.sort((a, b) => b.impact - a.impact);
    return contributions.slice(0, 5);
  }

  public toJSON(): ModelWeights {
    return {
      version: 'recovery-model-v1',
      type: 'TabularGradientBoostedEnsemble',
      trees: this.trees,
      coefficients: this.coefficients,
      intercept: this.intercept,
      featureImportances: this.featureImportances,
      hyperparameters: {
        numTrees: this.trees.length,
        maxDepth: 4,
        learningRate: 0.1,
        minSamplesSplit: 10
      }
    };
  }

  public fromJSON(data: ModelWeights, featureNames: string[]): void {
    this.trees = data.trees || [];
    this.coefficients = data.coefficients || [];
    this.intercept = data.intercept || 0;
    this.featureImportances = data.featureImportances || {};
    this.featureNames = featureNames;
  }
}
