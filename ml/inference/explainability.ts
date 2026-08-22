import { ExplanationFactor, PaymentDataRecord } from '../preprocessing/types.js';

export class ExplainabilityEngine {
  public static explain(
    rawRecord: Partial<PaymentDataRecord>,
    modelContributions: { feature: string; impact: number; direction: '+' | '-' }[]
  ): ExplanationFactor[] {
    const factors: ExplanationFactor[] = [];

    // Map raw feature names to human-readable domain insights
    const successRate = rawRecord.historical_success_rate ?? 0.8;
    const retryCount = rawRecord.retry_count ?? 0;
    const prevTxns = rawRecord.successful_transactions ?? 0;
    const failureReason = rawRecord.failure_reason || 'Unknown';
    const segment = rawRecord.customer_segment || 'GROWTH';
    const subStatus = rawRecord.subscription_status || 'ACTIVE';

    // 1. Historical success rate
    if (successRate >= 0.85) {
      factors.push({
        feature: 'historical_success_rate',
        impact: 0.28,
        direction: '+',
        description: `High historical payment success rate (${(successRate * 100).toFixed(0)}%) indicates strong customer intent.`
      });
    } else if (successRate < 0.60) {
      factors.push({
        feature: 'historical_success_rate',
        impact: 0.24,
        direction: '-',
        description: `Lower historical success rate (${(successRate * 100).toFixed(0)}%) reduces baseline recoverability.`
      });
    }

    // 2. Prior successful transactions
    if (prevTxns >= 5) {
      factors.push({
        feature: 'successful_transactions',
        impact: 0.19,
        direction: '+',
        description: `Established customer with ${prevTxns} prior successful payments.`
      });
    }

    // 3. Retry count status
    if (retryCount === 0) {
      factors.push({
        feature: 'retry_count',
        impact: 0.22,
        direction: '+',
        description: 'First attempt failure (0 retries executed) — maximum yield expected from immediate intervention.'
      });
    } else if (retryCount >= 2) {
      factors.push({
        feature: 'retry_count',
        impact: 0.26,
        direction: '-',
        description: `Multiple prior failed retries (${retryCount}) indicate persistent bank/account impediment.`
      });
    }

    // 4. Failure scenario attribution
    if (failureReason.toLowerCase().includes('network') || failureReason.toLowerCase().includes('timeout')) {
      factors.push({
        feature: 'failure_reason',
        impact: 0.25,
        direction: '+',
        description: 'Transient network/switch failure carries exceptionally high automatic retry recoverability.'
      });
    } else if (failureReason.toLowerCase().includes('insufficient')) {
      factors.push({
        feature: 'failure_reason',
        impact: 0.18,
        direction: '+',
        description: 'Insufficient funds can be recovered during optimal off-peak / payroll cycle retry.'
      });
    } else if (failureReason.toLowerCase().includes('bank decline') || failureReason.toLowerCase().includes('fraud')) {
      factors.push({
        feature: 'failure_reason',
        impact: 0.23,
        direction: '-',
        description: 'Bank decline requires customer-side authentication or payment instrument modification.'
      });
    }

    // 5. Subscription & Account Standing
    if (subStatus === 'ACTIVE') {
      factors.push({
        feature: 'subscription_status',
        impact: 0.14,
        direction: '+',
        description: 'Active subscription status signals high customer retention value.'
      });
    } else if (subStatus === 'CANCELLED' || subStatus === 'UNPAID') {
      factors.push({
        feature: 'subscription_status',
        impact: 0.20,
        direction: '-',
        description: 'Lapsed or cancelled subscription status indicates potential involuntary churn.'
      });
    }

    // Blend in any model-specific mathematical contributions
    for (const mc of modelContributions) {
      if (factors.length >= 4) break;
      if (!factors.some((f) => f.feature === mc.feature)) {
        factors.push({
          feature: mc.feature,
          impact: mc.impact,
          direction: mc.direction,
          description: `Feature ${mc.feature} contributed with impact factor ${mc.impact}`
        });
      }
    }

    return factors.slice(0, 4);
  }
}
