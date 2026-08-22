import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import {
  UserRecord,
  MerchantRecord,
  CustomerRecord,
  PaymentRecord,
  RecoveryCaseRecord,
  RecoveryActionRecord,
  MlPredictionRecord,
  AuditLogRecord
} from '../types/index.js';

let pool: mysql.Pool | null = null;
let isMySqlActive = false;

// In-memory data store cache
export const memoryStore = {
  users: new Map<string, UserRecord>(),
  merchants: new Map<string, MerchantRecord>(),
  customers: new Map<string, CustomerRecord>(),
  payments: new Map<string, PaymentRecord>(),
  recoveryCases: new Map<string, RecoveryCaseRecord>(),
  recoveryActions: new Map<string, RecoveryActionRecord>(),
  mlPredictions: new Map<string, MlPredictionRecord>(),
  auditLogs: [] as AuditLogRecord[],
  policyConfig: {
    max_retries: 2,
    auto_retry_threshold: 0.70,
    min_amount_for_auto_action: 100,
    max_amount_for_auto_retry: 100000,
    cooldown_seconds: 2700,
    stop_after_success: true,
    stop_after_max_retries: true,
    require_idempotency: true
  },
  systemConfig: {
    environment: 'production-ready (sandbox)',
    gatewayMode: 'TEST_MODE' as const,
    mlModelVersion: 'recovery-model-v1 (Random Forest Ensemble)',
    autonomousRecoveryEnabled: true,
    riskScoreThreshold: 0.60,
    dunningChannel: 'WHATSAPP_AND_SMS',
    webhookUrl: 'https://api.recoverai.io/webhooks/razorpay/v1',
    rateLimitPerMin: 120,
    updatedAt: new Date().toISOString(),
    updatedBy: 'Pramod Mahajan (Chief Risk Officer)'
  }
};

export async function initDatabase(): Promise<void> {
  // 1. Try MySQL Connection if environment variables are provided
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbUser = process.env.DB_USER || 'recover_user';
  const dbPassword = process.env.DB_PASSWORD || 'recover_password';
  const dbName = process.env.DB_NAME || 'recoverai_db';
  const dbPort = Number(process.env.DB_PORT || 3306);

  try {
    const testPool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000
    });

    const conn = await testPool.getConnection();
    await conn.ping();
    conn.release();
    pool = testPool;
    isMySqlActive = true;
    console.log(`[Database] Successfully connected to MySQL at ${dbHost}:${dbPort}/${dbName}`);
  } catch (err) {
    console.warn(`[Database] MySQL not reachable at ${dbHost}:${dbPort} (${(err as Error).message}). Initializing high-performance active in-memory storage engine.`);
    isMySqlActive = false;
    pool = null;
  }

  // 2. Populate fallback memory store with default accounts and dataset
  await seedDefaultUsers();
  await seedInitialData();
}

async function seedDefaultUsers() {
  const salt = await bcrypt.genSalt(10);
  const adminPassHash = await bcrypt.hash('Admin@RecoverAI2026', salt);
  const analystPassHash = await bcrypt.hash('Analyst@RecoverAI2026', salt);

  const adminUser: UserRecord = {
    id: 'usr_admin_01',
    email: 'admin@recoverai.io',
    password_hash: adminPassHash,
    full_name: 'Pramod Mahajan',
    title: 'Chief Risk Officer & Lead Administrator',
    role: 'ADMIN',
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  };

  const analystUser: UserRecord = {
    id: 'usr_analyst_01',
    email: 'analyst@recoverai.io',
    password_hash: analystPassHash,
    full_name: 'Devin Thorne',
    title: 'Payment Recovery Analyst',
    role: 'ANALYST',
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  };

  memoryStore.users.set(adminUser.email, adminUser);
  memoryStore.users.set(analystUser.email, analystUser);

  // Add initial system & sample role audit entries
  memoryStore.auditLogs.unshift(
    {
      id: `aud_${Date.now() - 120000}_01`,
      actor_type: 'ADMIN_USER',
      actor_id: 'usr_admin_01',
      actor_name: 'Pramod Mahajan',
      actor_role: 'ADMIN',
      action_name: 'POLICY_OVERRIDE',
      entity_type: 'RECOVERY_CASE',
      entity_id: 'RC-10291',
      case_id: 'RC-10291',
      reason: 'Temporary bank gateway outage resolved; manual off-peak retry authorized',
      result: 'OVERRIDE_APPROVED',
      previous_state: { state: 'POLICY_BLOCKED', retry_count: 2 },
      new_state: { state: 'EXECUTING', action: 'RETRY_PAYMENT', authorized_by: 'Pramod Mahajan' },
      ip_address: '192.168.1.104',
      user_agent: 'RecoverAI/Admin-Console (macOS)',
      created_at: new Date(Date.now() - 120000).toISOString()
    },
    {
      id: `aud_${Date.now() - 360000}_02`,
      actor_type: 'ANALYST_USER',
      actor_id: 'usr_analyst_01',
      actor_name: 'Devin Thorne',
      actor_role: 'ANALYST',
      action_name: 'RETRY_PAYMENT',
      entity_type: 'RECOVERY_CASE',
      entity_id: 'RC-10292',
      case_id: 'RC-10292',
      reason: 'Scheduled standard automated retry following network timeout',
      result: 'RECOVERED',
      previous_state: { state: 'APPROVED', status: 'IN_PROGRESS' },
      new_state: { state: 'RECOVERED', recovered_amount: 14999 },
      ip_address: '192.168.1.118',
      user_agent: 'RecoverAI/Analyst-Portal (Windows)',
      created_at: new Date(Date.now() - 360000).toISOString()
    },
    {
      id: `aud_${Date.now() - 900000}_03`,
      actor_type: 'SYSTEM_AI_AGENT',
      actor_id: 'recoverai_core_daemon',
      actor_name: 'AI Decision Engine',
      actor_role: 'SYSTEM',
      action_name: 'SYSTEM_INITIALIZATION',
      entity_type: 'SYSTEM',
      entity_id: 'recoverai_v1',
      previous_state: null,
      new_state: { mode: isMySqlActive ? 'MYSQL_ACTIVE' : 'MEMORY_STORE_READY', timestamp: new Date().toISOString() },
      ip_address: '127.0.0.1',
      user_agent: 'RecoverAI/1.0.0 Daemon',
      created_at: new Date(Date.now() - 900000).toISOString()
    }
  );
}

export async function seedInitialData(): Promise<number> {
  const dataPath = path.join(process.cwd(), 'data', 'synthetic_payments_5000.json');
  if (!fs.existsSync(dataPath)) {
    console.warn(`[Database] synthetic dataset not found at ${dataPath}. Generating now...`);
    // Dynamic import to generate
    const { generateSyntheticDataset } = await import('../../data/generate_dataset.js');
    const dataset = generateSyntheticDataset(5000);
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(dataset, null, 2), 'utf-8');
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const dataset: any[] = JSON.parse(rawData);

  // Populate memory store
  dataset.forEach((item) => {
    // 1. Merchant
    if (!memoryStore.merchants.has(item.merchant_id)) {
      memoryStore.merchants.set(item.merchant_id, {
        id: item.merchant_id,
        name: item.merchant_id === 'mch_saas_cloud' ? 'CloudScale SaaS India' : 'LearnFlow EdTech',
        email: `billing@${item.merchant_id}.com`,
        currency: 'INR',
        business_category: 'Digital Services & SaaS',
        monthly_volume_est: 25000000.0,
        recovery_automation_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // 2. Customer
    if (!memoryStore.customers.has(item.customer_id)) {
      memoryStore.customers.set(item.customer_id, {
        id: item.customer_id,
        merchant_id: item.merchant_id,
        name: item.customer_name || `Customer ${item.customer_id}`,
        email: item.customer_email || `${item.customer_id}@example.com`,
        phone: item.customer_phone || '+919800000000',
        customer_age_days: item.customer_age_days || 45,
        lifetime_value: item.previous_total_spend || 5000,
        total_successful_payments: item.previous_successful_payments || 1,
        total_failed_payments: item.previous_failed_payments || 0,
        risk_score: item.failure_category === 'FRAUD_SUSPICION' ? 0.85 : 0.08,
        preferred_payment_method: item.payment_method || 'UPI',
        created_at: item.created_at,
        updated_at: item.created_at
      });
    }

    // 3. Payment
    const paymentRecord: PaymentRecord = {
      id: item.id,
      transaction_id: item.transaction_id,
      merchant_id: item.merchant_id,
      customer_id: item.customer_id,
      customer_name: item.customer_name,
      customer_email: item.customer_email,
      customer_phone: item.customer_phone,
      subscription_id: item.subscription_status !== 'NONE' ? `sub_${item.customer_id}` : null,
      invoice_id: item.invoice_status !== 'NONE' ? `inv_${item.transaction_id}` : null,
      amount: item.amount,
      currency: item.currency || 'INR',
      payment_method: item.payment_method,
      payment_status: item.payment_status,
      failure_code: item.failure_code,
      failure_reason: item.failure_reason,
      failure_category: item.failure_category,
      retry_count: item.retry_count,
      checkout_status: item.checkout_status,
      recovery_status: item.recovery_status,
      recovered_amount: item.recovered_amount,
      customer_age_days: item.customer_age_days,
      previous_successful_payments: item.previous_successful_payments,
      previous_failed_payments: item.previous_failed_payments,
      previous_total_spend: item.previous_total_spend,
      created_at: item.created_at,
      updated_at: item.created_at
    };
    memoryStore.payments.set(item.id, paymentRecord);

    // 4. Recovery Case (for all non-successful payments)
    if (item.payment_status !== 'SUCCESSFUL' && item.recovery_status !== 'NOT_APPLICABLE') {
      const caseId = `case_${item.id}`;
      const caseRecord: RecoveryCaseRecord = {
        id: caseId,
        payment_id: item.id,
        customer_id: item.customer_id,
        merchant_id: item.merchant_id,
        customer_name: item.customer_name,
        customer_email: item.customer_email,
        customer_phone: item.customer_phone,
        transaction_id: item.transaction_id,
        payment_method: item.payment_method,
        at_risk_amount: item.amount,
        currency: item.currency || 'INR',
        ml_recovery_probability: item.ml_recovery_probability || 0.75,
        primary_failure_diagnosis: item.failure_reason || 'Payment processing declined by network',
        recommended_strategy: item.recommended_strategy || 'SMART_RETRY_OFFPEAK',
        status: item.recovery_status === 'RECOVERED' ? 'RECOVERED' : (item.recovery_status === 'RECOVERING' ? 'IN_PROGRESS' : 'OPEN'),
        actions_taken_count: item.recovery_status === 'RECOVERED' ? 2 : (item.recovery_status === 'RECOVERING' ? 1 : 0),
        recovered_amount: item.recovered_amount || 0,
        recovered_at: item.recovery_status === 'RECOVERED' ? item.created_at : null,
        closed_at: item.recovery_status === 'RECOVERED' ? item.created_at : null,
        created_at: item.created_at,
        updated_at: item.created_at
      };
      memoryStore.recoveryCases.set(caseId, caseRecord);
    }
  });

  console.log(`[Database] Loaded ${memoryStore.payments.size} payments, ${memoryStore.recoveryCases.size} recovery cases into database store.`);
  return memoryStore.payments.size;
}

export function getDbStatus() {
  return {
    isMySqlActive,
    storageEngine: isMySqlActive ? 'MySQL 8.0 (Active Pool)' : 'RecoverAI High-Performance Memory DB',
    counts: {
      payments: memoryStore.payments.size,
      recoveryCases: memoryStore.recoveryCases.size,
      customers: memoryStore.customers.size,
      merchants: memoryStore.merchants.size,
      auditLogs: memoryStore.auditLogs.length,
      users: memoryStore.users.size
    }
  };
}

export function getPool(): mysql.Pool | null {
  return pool;
}
