import fs from 'fs';
import path from 'path';
import { PaymentDataRecord } from '../preprocessing/types.js';

// Seeded PRNG for reproducible dataset generation
class SeededRandom {
  private seed: number;

  constructor(seed = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  weightedChoice<T>(items: { item: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let rand = this.next() * totalWeight;
    for (const entry of items) {
      if (rand < entry.weight) return entry.item;
      rand -= entry.weight;
    }
    return items[0].item;
  }

  gaussian(mean = 0, stdev = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z * stdev;
  }
}

export const FAILURE_REASONS = [
  'Insufficient Funds',
  'Network Failure',
  'Bank Decline',
  'Expired Payment Method',
  'Authentication Failure',
  'Daily Limit Exceeded',
  'Customer Dropout'
];

export const PAYMENT_METHODS = [
  'CARD_CREDIT',
  'CARD_DEBIT',
  'UPI',
  'NETBANKING',
  'AUTO_DEBIT',
  'WALLET'
];

export const CUSTOMER_SEGMENTS = ['ENTERPRISE', 'PRO', 'GROWTH', 'STARTER'];
export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELLED', 'NONE'];

export function generateSyntheticDataset(count = 5000, seed = 42): PaymentDataRecord[] {
  const rng = new SeededRandom(seed);
  const records: PaymentDataRecord[] = [];

  // Generate a pool of 1,200 realistic customers with persistent attributes
  const customerPool = Array.from({ length: 1200 }, (_, i) => {
    const custId = `cust_${(1000 + i).toString()}`;
    const segment = rng.weightedChoice([
      { item: 'ENTERPRISE', weight: 0.12 },
      { item: 'PRO', weight: 0.28 },
      { item: 'GROWTH', weight: 0.35 },
      { item: 'STARTER', weight: 0.25 }
    ]);
    
    const tenureDays = rng.nextInt(15, 900);
    const avgMonthlyTxns = segment === 'ENTERPRISE' ? rng.nextInt(8, 25) : segment === 'PRO' ? rng.nextInt(3, 10) : rng.nextInt(1, 4);
    const monthsActive = Math.max(1, Math.floor(tenureDays / 30));
    const totalTxns = Math.min(100, Math.max(1, monthsActive * avgMonthlyTxns));
    
    // Baseline loyalty success rate
    const baseLoyalty = segment === 'ENTERPRISE' ? 0.94 : segment === 'PRO' ? 0.88 : segment === 'GROWTH' ? 0.82 : 0.74;
    const successRate = Math.min(1.0, Math.max(0.3, rng.gaussian(baseLoyalty, 0.08)));
    
    const successfulTxns = Math.round(totalTxns * successRate);
    const failedTxns = totalTxns - successfulTxns;
    const previousRecoveries = failedTxns > 0 ? rng.nextInt(0, Math.min(failedTxns, 5)) : 0;
    
    return {
      custId,
      segment,
      tenureDays,
      totalTxns,
      successfulTxns,
      failedTxns,
      previousRecoveries,
      successRate: Number(successRate.toFixed(4)),
      preferredMethod: rng.choice(PAYMENT_METHODS)
    };
  });

  for (let i = 0; i < count; i++) {
    const customer = rng.choice(customerPool);
    const txnId = `TXN_${(100000 + i).toString()}`;

    // Select payment method with high probability of customer's preferred method
    const paymentMethod = rng.next() < 0.7 ? customer.preferredMethod : rng.choice(PAYMENT_METHODS);

    // Realistic failure reason distribution with domain weighting
    const failureReason = rng.weightedChoice([
      { item: 'Insufficient Funds', weight: 0.32 },
      { item: 'Network Failure', weight: 0.24 },
      { item: 'Bank Decline', weight: 0.16 },
      { item: 'Authentication Failure', weight: 0.14 },
      { item: 'Expired Payment Method', weight: 0.08 },
      { item: 'Daily Limit Exceeded', weight: 0.04 },
      { item: 'Customer Dropout', weight: 0.02 }
    ]);

    // Amount based on segment
    let baseAmount = 999;
    if (customer.segment === 'ENTERPRISE') {
      baseAmount = rng.choice([9999, 14999, 24999, 49999, 79999]);
    } else if (customer.segment === 'PRO') {
      baseAmount = rng.choice([2999, 4999, 7499, 9999]);
    } else if (customer.segment === 'GROWTH') {
      baseAmount = rng.choice([999, 1499, 1999, 2999]);
    } else {
      baseAmount = rng.choice([499, 799, 999, 1299]);
    }
    const amount = Math.max(100, Math.round(rng.gaussian(baseAmount, baseAmount * 0.15)));

    // Retries currently undertaken (0 to 4)
    const retryCount = rng.weightedChoice([
      { item: 0, weight: 0.55 },
      { item: 1, weight: 0.28 },
      { item: 2, weight: 0.12 },
      { item: 3, weight: 0.04 },
      { item: 4, weight: 0.01 }
    ]);

    // Time since failure (in minutes, 5 mins to 2880 mins / 48 hrs)
    const timeSinceFailure = rng.nextInt(5, 2880);

    // Subscription status
    let subscriptionStatus = 'ACTIVE';
    if (customer.segment === 'STARTER' && rng.next() < 0.3) {
      subscriptionStatus = rng.choice(['PAST_DUE', 'UNPAID', 'NONE']);
    } else if (rng.next() < 0.15) {
      subscriptionStatus = rng.choice(['PAST_DUE', 'UNPAID']);
    }

    // Days since last payment (1 to 60 days)
    const daysSinceLastPayment = rng.nextInt(1, 45);

    // Time context
    const isWeekend = rng.next() < 0.28 ? 1 : 0;
    const hourOfDay = rng.nextInt(0, 23);

    // Realistic calculation for historical success rate
    const historicalSuccessRate = customer.totalTxns > 0
      ? Number((customer.successfulTxns / customer.totalTxns).toFixed(4))
      : 0.5;

    // REALISTIC NON-RANDOM RECOVERY LOGIC (Target variable formulation)
    // We compute a logistic score based on well-established financial domain indicators:
    let recoveryLogit = -0.3; // Baseline shift for balanced 55-65% recovery rate

    // 1. Failure Reason Impact
    switch (failureReason) {
      case 'Network Failure':
        recoveryLogit += 1.6; // High recoverability via auto-retry
        break;
      case 'Insufficient Funds':
        recoveryLogit += 0.8; // Moderate-high recoverability on off-peak retry or reminder
        break;
      case 'Authentication Failure':
        recoveryLogit += 0.4; // Recoverable via 1-click payment link / SMS
        break;
      case 'Expired Payment Method':
        recoveryLogit -= 0.2; // Requires card replacement
        break;
      case 'Daily Limit Exceeded':
        recoveryLogit += 0.3; // Recoverable on next day retry
        break;
      case 'Bank Decline':
        recoveryLogit -= 1.2; // Hard decline - lower recoverability without customer action
        break;
      case 'Customer Dropout':
        recoveryLogit += 0.2; // WhatsApp prompt recovers checkout drops
        break;
      default:
        recoveryLogit += 0.0;
    }

    // 2. Customer Historical Loyalty & Track Record
    recoveryLogit += (historicalSuccessRate - 0.75) * 3.2;
    recoveryLogit += Math.min(customer.tenureDays / 365, 2.0) * 0.35;
    recoveryLogit += Math.min(customer.previousRecoveries, 3) * 0.25;

    // 3. Retry Penalty (Diminishing returns after multiple failed retries)
    if (retryCount === 0) recoveryLogit += 0.2;
    else if (retryCount === 1) recoveryLogit -= 0.3;
    else if (retryCount === 2) recoveryLogit -= 1.1;
    else recoveryLogit -= 2.4;

    // 4. Time Since Failure (Latency degradation)
    if (timeSinceFailure < 60) recoveryLogit += 0.3; // fresh failure
    else if (timeSinceFailure > 1440) recoveryLogit -= 0.8; // >24h old

    // 5. Customer Segment & Subscription
    if (customer.segment === 'ENTERPRISE') recoveryLogit += 0.7;
    else if (customer.segment === 'PRO') recoveryLogit += 0.3;
    else if (customer.segment === 'STARTER') recoveryLogit -= 0.4;

    if (subscriptionStatus === 'ACTIVE') recoveryLogit += 0.4;
    else if (subscriptionStatus === 'CANCELLED' || subscriptionStatus === 'UNPAID') recoveryLogit -= 1.5;

    // 6. Payment Method Characteristics
    if (paymentMethod === 'UPI' || paymentMethod === 'AUTO_DEBIT') recoveryLogit += 0.2;
    if (paymentMethod === 'CARD_CREDIT') recoveryLogit += 0.1;

    // Convert logit to probability via sigmoid function
    const trueRecoveryProb = 1.0 / (1.0 + Math.exp(-recoveryLogit));

    // Sample deterministic binary outcome based on probability + small realistic noise
    const noise = (rng.next() - 0.5) * 0.12;
    const sampledProb = Math.max(0.02, Math.min(0.98, trueRecoveryProb + noise));
    const recoverySuccess = rng.next() < sampledProb ? 1 : 0;

    records.push({
      transaction_id: txnId,
      customer_id: customer.custId,
      amount,
      payment_method: paymentMethod,
      failure_reason: failureReason,
      customer_age_days: customer.tenureDays,
      previous_transactions: customer.totalTxns,
      successful_transactions: customer.successfulTxns,
      failed_transactions: customer.failedTxns,
      previous_recovery_count: customer.previousRecoveries,
      retry_count: retryCount,
      time_since_failure: timeSinceFailure,
      customer_segment: customer.segment,
      subscription_status: subscriptionStatus,
      days_since_last_payment: daysSinceLastPayment,
      historical_success_rate: historicalSuccessRate,
      is_weekend: isWeekend,
      hour_of_day: hourOfDay,
      recovery_success: recoverySuccess
    });
  }

  return records;
}

export function saveSyntheticDataset(records: PaymentDataRecord[], filename = 'synthetic_payments_5000.json'): string {
  const dataDir = path.join(process.cwd(), 'ml', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  console.log(`[ML Dataset] Saved ${records.length} synthetic payment records to ${filePath}`);
  return filePath;
}
