import { PaymentDataRecord } from './types.js';

export interface PreprocessorConfig {
  categoricalMappings: {
    payment_method: string[];
    failure_reason: string[];
    customer_segment: string[];
    subscription_status: string[];
  };
  numericalFeatures: string[];
  scalerMeans: Record<string, number>;
  scalerStds: Record<string, number>;
  medians: Record<string, number>;
  modes: Record<string, string>;
  featureNames: string[];
}

export class DataPreprocessor {
  public config: PreprocessorConfig;
  public isFitted = false;

  constructor(config?: PreprocessorConfig) {
    if (config) {
      this.config = config;
      this.isFitted = true;
    } else {
      this.config = {
        categoricalMappings: {
          payment_method: ['CARD_CREDIT', 'CARD_DEBIT', 'UPI', 'NETBANKING', 'AUTO_DEBIT', 'WALLET', 'OTHER'],
          failure_reason: [
            'Insufficient Funds',
            'Network Failure',
            'Bank Decline',
            'Expired Payment Method',
            'Authentication Failure',
            'Daily Limit Exceeded',
            'Customer Dropout',
            'Other'
          ],
          customer_segment: ['ENTERPRISE', 'PRO', 'GROWTH', 'STARTER', 'UNKNOWN'],
          subscription_status: ['ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELLED', 'NONE', 'UNKNOWN']
        },
        numericalFeatures: [
          'amount',
          'customer_age_days',
          'previous_transactions',
          'successful_transactions',
          'failed_transactions',
          'previous_recovery_count',
          'retry_count',
          'time_since_failure',
          'days_since_last_payment',
          'historical_success_rate',
          'is_weekend',
          'hour_of_day'
        ],
        scalerMeans: {},
        scalerStds: {},
        medians: {},
        modes: {},
        featureNames: []
      };
    }
  }

  // 1. Clean and deduplicate raw records
  public cleanAndDeduplicate(records: Partial<PaymentDataRecord>[]): PaymentDataRecord[] {
    const seen = new Set<string>();
    const cleaned: PaymentDataRecord[] = [];

    for (const raw of records) {
      if (!raw || typeof raw !== 'object') continue;
      const txnId = raw.transaction_id || `txn_synth_${Math.random().toString(36).substring(2, 9)}`;
      if (seen.has(txnId)) continue;
      seen.add(txnId);

      // Safe normalization of values
      const record: PaymentDataRecord = {
        transaction_id: txnId,
        customer_id: raw.customer_id || 'cust_unknown',
        amount: typeof raw.amount === 'number' && !isNaN(raw.amount) ? Math.max(0, raw.amount) : 999,
        payment_method: (raw.payment_method || 'CARD_CREDIT').toUpperCase(),
        failure_reason: raw.failure_reason || 'Other',
        customer_age_days: typeof raw.customer_age_days === 'number' && !isNaN(raw.customer_age_days) ? Math.max(0, raw.customer_age_days) : 30,
        previous_transactions: typeof raw.previous_transactions === 'number' && !isNaN(raw.previous_transactions) ? Math.max(0, raw.previous_transactions) : 1,
        successful_transactions: typeof raw.successful_transactions === 'number' && !isNaN(raw.successful_transactions) ? Math.max(0, raw.successful_transactions) : 1,
        failed_transactions: typeof raw.failed_transactions === 'number' && !isNaN(raw.failed_transactions) ? Math.max(0, raw.failed_transactions) : 0,
        previous_recovery_count: typeof raw.previous_recovery_count === 'number' && !isNaN(raw.previous_recovery_count) ? Math.max(0, raw.previous_recovery_count) : 0,
        retry_count: typeof raw.retry_count === 'number' && !isNaN(raw.retry_count) ? Math.max(0, raw.retry_count) : 0,
        time_since_failure: typeof raw.time_since_failure === 'number' && !isNaN(raw.time_since_failure) ? Math.max(0, raw.time_since_failure) : 60,
        customer_segment: (raw.customer_segment || 'GROWTH').toUpperCase(),
        subscription_status: (raw.subscription_status || 'ACTIVE').toUpperCase(),
        days_since_last_payment: typeof raw.days_since_last_payment === 'number' && !isNaN(raw.days_since_last_payment) ? Math.max(0, raw.days_since_last_payment) : 15,
        historical_success_rate: typeof raw.historical_success_rate === 'number' && !isNaN(raw.historical_success_rate) ? Math.max(0, Math.min(1, raw.historical_success_rate)) : 0.8,
        is_weekend: raw.is_weekend ? 1 : 0,
        hour_of_day: typeof raw.hour_of_day === 'number' && !isNaN(raw.hour_of_day) ? Math.max(0, Math.min(23, raw.hour_of_day)) : 14,
        recovery_success: raw.recovery_success === 1 ? 1 : 0
      };

      cleaned.push(record);
    }

    return cleaned;
  }

  // 2. Fit preprocessor on training data only (avoiding data leakage)
  public fit(trainData: PaymentDataRecord[]): void {
    const cleaned = this.cleanAndDeduplicate(trainData);

    // Compute numerical medians, means, and stds
    for (const numFeature of this.config.numericalFeatures) {
      const values = cleaned
        .map((r) => (r as any)[numFeature])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))
        .sort((a, b) => a - b);

      if (values.length === 0) {
        this.config.medians[numFeature] = 0;
        this.config.scalerMeans[numFeature] = 0;
        this.config.scalerStds[numFeature] = 1;
        continue;
      }

      // Median
      const mid = Math.floor(values.length / 2);
      this.config.medians[numFeature] = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

      // Mean
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      this.config.scalerMeans[numFeature] = mean;

      // Std
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      this.config.scalerStds[numFeature] = Math.max(1e-6, Math.sqrt(variance));
    }

    // Build complete list of output feature column names
    const featureNames: string[] = [];

    // Numerical columns
    for (const numFeature of this.config.numericalFeatures) {
      featureNames.push(numFeature);
    }

    // One-hot categorical columns
    for (const [catField, categories] of Object.entries(this.config.categoricalMappings)) {
      for (const cat of categories) {
        featureNames.push(`${catField}_${cat}`);
      }
    }

    this.config.featureNames = featureNames;
    this.isFitted = true;
  }

  // 3. Transform a single record or array into scaled numerical vector(s)
  public transformRecord(record: Partial<PaymentDataRecord>): number[] {
    if (!this.isFitted) {
      throw new Error('DataPreprocessor must be fitted before transforming records.');
    }

    const vector: number[] = [];

    // Transform numerical features using fitted mean & std
    for (const numFeature of this.config.numericalFeatures) {
      let rawVal = (record as any)[numFeature];
      if (typeof rawVal !== 'number' || isNaN(rawVal)) {
        rawVal = this.config.medians[numFeature] ?? 0;
      }
      const mean = this.config.scalerMeans[numFeature] ?? 0;
      const std = this.config.scalerStds[numFeature] ?? 1;
      const scaledVal = (rawVal - mean) / std;
      vector.push(scaledVal);
    }

    // Transform categorical features into one-hot encoding
    for (const [catField, categories] of Object.entries(this.config.categoricalMappings)) {
      const rawVal = ((record as any)[catField] || '').toString().toUpperCase();
      for (const cat of categories) {
        const isMatch = rawVal === cat.toUpperCase() || (cat === 'OTHER' && !categories.includes(rawVal));
        vector.push(isMatch ? 1.0 : 0.0);
      }
    }

    return vector;
  }

  public transform(records: Partial<PaymentDataRecord>[]): { X: number[][]; y: number[] } {
    const cleaned = this.cleanAndDeduplicate(records);
    const X: number[][] = [];
    const y: number[] = [];

    for (const r of cleaned) {
      X.push(this.transformRecord(r));
      y.push(r.recovery_success ?? 0);
    }

    return { X, y };
  }

  // 4. Split dataset into deterministic Train and Test sets
  public static trainTestSplit<T>(data: T[], testRatio = 0.2, seed = 42): { train: T[]; test: T[] } {
    // Deterministic shuffle with seed
    const shuffled = [...data];
    let m = shuffled.length;
    let s = seed;
    while (m) {
      s = (s * 9301 + 49297) % 233280;
      const i = Math.floor((s / 233280) * m--);
      const t = shuffled[m];
      shuffled[m] = shuffled[i];
      shuffled[i] = t;
    }

    const testSize = Math.floor(data.length * testRatio);
    const test = shuffled.slice(0, testSize);
    const train = shuffled.slice(testSize);

    return { train, test };
  }
}
