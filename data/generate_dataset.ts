import fs from 'fs';
import path from 'path';

export interface SyntheticPaymentRecord {
  id: string;
  transaction_id: string;
  merchant_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: number;
  currency: string;
  payment_method: 'CARD_CREDIT' | 'CARD_DEBIT' | 'UPI' | 'NETBANKING' | 'WALLET' | 'AUTO_DEBIT';
  payment_status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'RECOVERED' | 'ABANDONED';
  failure_code: string | null;
  failure_reason: string | null;
  failure_category:
    | 'INSUFFICIENT_FUNDS'
    | 'BANK_DOWNTIME'
    | 'EXPIRED_CARD'
    | 'AUTHENTICATION_DROP'
    | 'CUSTOMER_ABANDONMENT'
    | 'FRAUD_SUSPICION'
    | 'GATEWAY_ERROR'
    | 'LIMIT_EXCEEDED'
    | 'NONE';
  customer_age_days: number;
  previous_successful_payments: number;
  previous_failed_payments: number;
  previous_total_spend: number;
  retry_count: number;
  subscription_status: 'ACTIVE' | 'PAST_DUE' | 'UNPAID' | 'CANCELLED' | 'NONE';
  invoice_status: 'PAID' | 'ISSUED' | 'PAST_DUE' | 'UNCOLLECTIBLE' | 'NONE';
  checkout_status: 'COMPLETED' | 'DROPPED' | 'EXPIRED' | 'SESSION_TIMEOUT';
  recovery_status: 'NOT_APPLICABLE' | 'AT_RISK' | 'RECOVERING' | 'RECOVERED' | 'UNRECOVERABLE' | 'EXPIRED';
  recovered_amount: number;
  ml_recovery_probability: number;
  recommended_strategy:
    | 'SMART_RETRY_OFFPEAK'
    | 'DUNNING_WHATSAPP'
    | 'DUNNING_EMAIL'
    | 'PAYMENT_LINK_SMS'
    | 'METHOD_SWITCH_UPI'
    | 'ONE_CLICK_MANDATE_UPDATE'
    | 'MANUAL_INTERVENTION'
    | 'NONE';
  created_at: string;
}

const FIRST_NAMES = ['Aarav', 'Vihaan', 'Aditi', 'Diya', 'Rohan', 'Ananya', 'Kavya', 'Rahul', 'Sneha', 'Vikram', 'Pooja', 'Arjun', 'Isha', 'Siddharth', 'Meera', 'Rishi', 'Neha', 'Kabir', 'Tanvi', 'Aditya'];
const LAST_NAMES = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Gupta', 'Iyer', 'Nair', 'Mehta', 'Joshi', 'Chopra', 'Kapoor', 'Singh', 'Deshmukh', 'Menon', 'Bhat', 'Rao', 'Agarwal', 'Chatterjee', 'Sen', 'Pillai'];
const MERCHANTS = [
  { id: 'mch_saas_cloud', name: 'CloudScale SaaS India', cat: 'B2B Software' },
  { id: 'mch_edtech_pro', name: 'LearnFlow EdTech', cat: 'Education' },
  { id: 'mch_ecom_luxe', name: 'NovaStore Retail', cat: 'E-Commerce' },
  { id: 'mch_fin_stream', name: 'WealthPulse Premium', cat: 'FinTech Subscriptions' }
];

const FAILURE_SCENARIOS = [
  {
    category: 'INSUFFICIENT_FUNDS' as const,
    code: 'BAD_REQUEST_INSUFFICIENT_FUNDS',
    reason: 'Account balance insufficient to complete debit',
    method: 'AUTO_DEBIT' as const,
    recoverability: 0.82,
    strategy: 'SMART_RETRY_OFFPEAK' as const,
    weight: 0.32
  },
  {
    category: 'BANK_DOWNTIME' as const,
    code: 'GATEWAY_ERROR_ISSUER_DOWN',
    reason: 'Issuer bank switch unavailable or timing out',
    method: 'NETBANKING' as const,
    recoverability: 0.89,
    strategy: 'METHOD_SWITCH_UPI' as const,
    weight: 0.22
  },
  {
    category: 'EXPIRED_CARD' as const,
    code: 'CARD_ERROR_EXPIRED',
    reason: 'Card validity date has lapsed or card replaced',
    method: 'CARD_CREDIT' as const,
    recoverability: 0.74,
    strategy: 'ONE_CLICK_MANDATE_UPDATE' as const,
    weight: 0.14
  },
  {
    category: 'AUTHENTICATION_DROP' as const,
    code: 'AUTH_ERROR_OTP_TIMEOUT',
    reason: 'Customer did not enter 3D Secure OTP in time',
    method: 'CARD_DEBIT' as const,
    recoverability: 0.68,
    strategy: 'PAYMENT_LINK_SMS' as const,
    weight: 0.16
  },
  {
    category: 'CUSTOMER_ABANDONMENT' as const,
    code: 'CHECKOUT_USER_DROPOUT',
    reason: 'Customer closed browser checkout iframe before authorization',
    method: 'UPI' as const,
    recoverability: 0.58,
    strategy: 'DUNNING_WHATSAPP' as const,
    weight: 0.10
  },
  {
    category: 'LIMIT_EXCEEDED' as const,
    code: 'CARD_ERROR_TXN_LIMIT',
    reason: 'Daily transaction limit exceeded for card/mandate',
    method: 'CARD_CREDIT' as const,
    recoverability: 0.62,
    strategy: 'DUNNING_EMAIL' as const,
    weight: 0.04
  },
  {
    category: 'FRAUD_SUSPICION' as const,
    code: 'RISK_DECLINE_HIGH_VELOCITY',
    reason: 'Velocity check triggered by issuer fraud defense',
    method: 'CARD_CREDIT' as const,
    recoverability: 0.12,
    strategy: 'MANUAL_INTERVENTION' as const,
    weight: 0.02
  }
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomWeightedFailure() {
  const rand = Math.random();
  let cumulative = 0;
  for (const s of FAILURE_SCENARIOS) {
    cumulative += s.weight;
    if (rand <= cumulative) return s;
  }
  return FAILURE_SCENARIOS[0];
}

export function generateSyntheticDataset(count = 5000): SyntheticPaymentRecord[] {
  const records: SyntheticPaymentRecord[] = [];
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // Pre-generate 1,000 distinct customers
  const customers = Array.from({ length: 1200 }, (_, i) => {
    const fn = randomChoice(FIRST_NAMES);
    const ln = randomChoice(LAST_NAMES);
    const id = `cust_${(i + 1000).toString()}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${Math.floor(Math.random() * 90 + 10)}@example.com`;
    const phone = `+9198${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const ageDays = Math.floor(Math.random() * 700 + 15);
    const prevSuccess = Math.floor(Math.random() * 25);
    const prevFail = Math.floor(Math.random() * 4);
    const prevSpend = prevSuccess * Math.floor(Math.random() * 4000 + 499);
    return { id, name: `${fn} ${ln}`, email, phone, ageDays, prevSuccess, prevFail, prevSpend };
  });

  for (let i = 0; i < count; i++) {
    const customer = randomChoice(customers);
    const merchant = randomChoice(MERCHANTS);
    const recordId = `pay_${(i + 1).toString().padStart(6, '0')}`;
    const txnId = `txn_rzp_${(10000000 + i).toString()}`;
    
    // Spread timestamp across last 30 days
    const timeOffset = Math.floor(Math.random() * thirtyDaysMs);
    const createdAtIso = new Date(now - timeOffset).toISOString();

    // Realistic amount distribution (e.g. ₹499 to ₹45,000)
    let amount = 999;
    const amtTier = Math.random();
    if (amtTier < 0.40) amount = randomChoice([499, 799, 999, 1499, 1999]);
    else if (amtTier < 0.75) amount = randomChoice([2999, 4999, 7499, 9999]);
    else if (amtTier < 0.95) amount = randomChoice([14999, 19999, 24999, 29999]);
    else amount = Math.floor(Math.random() * 20000 + 30000);

    // Realistic outcome distribution: 68% Initial Success, 32% Failure / Drop
    const isSuccess = Math.random() < 0.68;

    if (isSuccess) {
      records.push({
        id: recordId,
        transaction_id: txnId,
        merchant_id: merchant.id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        amount,
        currency: 'INR',
        payment_method: randomChoice(['UPI', 'CARD_CREDIT', 'CARD_DEBIT', 'NETBANKING', 'AUTO_DEBIT']),
        payment_status: 'SUCCESSFUL',
        failure_code: null,
        failure_reason: null,
        failure_category: 'NONE',
        customer_age_days: customer.ageDays,
        previous_successful_payments: customer.prevSuccess,
        previous_failed_payments: customer.prevFail,
        previous_total_spend: customer.prevSpend,
        retry_count: 0,
        subscription_status: Math.random() > 0.4 ? 'ACTIVE' : 'NONE',
        invoice_status: Math.random() > 0.5 ? 'PAID' : 'NONE',
        checkout_status: 'COMPLETED',
        recovery_status: 'NOT_APPLICABLE',
        recovered_amount: 0,
        ml_recovery_probability: 0.98,
        recommended_strategy: 'NONE',
        created_at: createdAtIso
      });
    } else {
      // Failed or abandoned payment
      const scenario = randomWeightedFailure();
      const retryCount = Math.floor(Math.random() * 3);
      
      // Recovery outcome calculation
      const isRecovered = Math.random() < scenario.recoverability;
      const isRecovering = !isRecovered && Math.random() < 0.55;
      
      let paymentStatus: 'FAILED' | 'RECOVERED' | 'ABANDONED' = 'FAILED';
      let recoveryStatus: 'AT_RISK' | 'RECOVERING' | 'RECOVERED' | 'UNRECOVERABLE' = 'AT_RISK';
      let recoveredAmount = 0;

      if (isRecovered) {
        paymentStatus = 'RECOVERED';
        recoveryStatus = 'RECOVERED';
        recoveredAmount = amount;
      } else if (isRecovering) {
        paymentStatus = 'FAILED';
        recoveryStatus = 'RECOVERING';
      } else {
        paymentStatus = scenario.category === 'CUSTOMER_ABANDONMENT' ? 'ABANDONED' : 'FAILED';
        recoveryStatus = scenario.category === 'FRAUD_SUSPICION' ? 'UNRECOVERABLE' : 'AT_RISK';
      }

      records.push({
        id: recordId,
        transaction_id: txnId,
        merchant_id: merchant.id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        amount,
        currency: 'INR',
        payment_method: scenario.method,
        payment_status: paymentStatus,
        failure_code: scenario.code,
        failure_reason: scenario.reason,
        failure_category: scenario.category,
        customer_age_days: customer.ageDays,
        previous_successful_payments: customer.prevSuccess,
        previous_failed_payments: customer.prevFail + 1,
        previous_total_spend: customer.prevSpend,
        retry_count: retryCount,
        subscription_status: Math.random() > 0.4 ? (isRecovered ? 'ACTIVE' : 'PAST_DUE') : 'NONE',
        invoice_status: Math.random() > 0.5 ? (isRecovered ? 'PAID' : 'PAST_DUE') : 'NONE',
        checkout_status: scenario.category === 'CUSTOMER_ABANDONMENT' ? 'DROPPED' : 'COMPLETED',
        recovery_status: recoveryStatus,
        recovered_amount: recoveredAmount,
        ml_recovery_probability: Number((scenario.recoverability + (Math.random() * 0.1 - 0.05)).toFixed(4)),
        recommended_strategy: scenario.strategy,
        created_at: createdAtIso
      });
    }
  }

  return records;
}

// Generate file if executed directly
if (process.argv[1]?.includes('generate_dataset.ts')) {
  console.log('Generating 5,000 synthetic payments...');
  const dataset = generateSyntheticDataset(5000);
  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'synthetic_payments_5000.json');
  fs.writeFileSync(outFile, JSON.stringify(dataset, null, 2), 'utf-8');
  console.log(`Saved ${dataset.length} records to ${outFile}`);
}
