import { RootCauseCategory } from '../preprocessing/types.js';

export interface RootCauseDiagnosis {
  root_cause: RootCauseCategory;
  confidence: number;
  description: string;
}

export class RootCauseAnalyzer {
  public static diagnose(
    failureReason: string = '',
    paymentMethod: string = '',
    additionalData?: Record<string, any>
  ): RootCauseDiagnosis {
    const reasonLower = (failureReason || '').toLowerCase();
    const methodUpper = (paymentMethod || '').toUpperCase();

    // 1. Insufficient Funds
    if (
      reasonLower.includes('insufficient') ||
      reasonLower.includes('balance') ||
      reasonLower.includes('low_fund') ||
      reasonLower.includes('funds')
    ) {
      return {
        root_cause: 'Insufficient Funds',
        confidence: 0.94,
        description: 'Customer account or wallet does not hold required balance to clear the authorization request.'
      };
    }

    // 2. Network Failure
    if (
      reasonLower.includes('network') ||
      reasonLower.includes('timeout') ||
      reasonLower.includes('switch unavailable') ||
      reasonLower.includes('gateway') ||
      reasonLower.includes('downtime') ||
      reasonLower.includes('connectivity')
    ) {
      return {
        root_cause: 'Network Failure',
        confidence: 0.92,
        description: 'Temporary packet loss, latency timeout, or banking switch downtime during processing.'
      };
    }

    // 3. Expired Payment Method
    if (
      reasonLower.includes('expired') ||
      reasonLower.includes('expiry') ||
      reasonLower.includes('invalid_card_date') ||
      reasonLower.includes('card lapsed')
    ) {
      return {
        root_cause: 'Expired Payment Method',
        confidence: 0.96,
        description: 'Stored card or mandate instrument validity date has passed expiration.'
      };
    }

    // 4. Authentication Failure
    if (
      reasonLower.includes('auth') ||
      reasonLower.includes('otp') ||
      reasonLower.includes('3ds') ||
      reasonLower.includes('secure') ||
      reasonLower.includes('pin') ||
      reasonLower.includes('abandon') ||
      reasonLower.includes('dropout')
    ) {
      return {
        root_cause: 'Authentication Failure',
        confidence: 0.88,
        description: 'Two-factor 3D Secure / UPI OTP authentication was not completed by payer within timeout.'
      };
    }

    // 5. Bank Decline
    if (
      reasonLower.includes('bank decline') ||
      reasonLower.includes('issuer') ||
      reasonLower.includes('limit') ||
      reasonLower.includes('velocity') ||
      reasonLower.includes('rejected by bank') ||
      reasonLower.includes('fraud') ||
      reasonLower.includes('restricted')
    ) {
      return {
        root_cause: 'Bank Decline',
        confidence: 0.86,
        description: 'Issuing bank refused authorization due to card spending limit or internal risk policies.'
      };
    }

    // 6. Other / Fallback
    return {
      root_cause: 'Other',
      confidence: 0.65,
      description: 'Unclassified payment exception requiring contextual analysis.'
    };
  }
}
