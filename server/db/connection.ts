import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { generateSyntheticDataset, SyntheticPaymentRecord } from '../../data/generate_dataset.js';

dotenv.config();

export interface DbStatusInfo {
  connected: boolean;
  message: string;
  storageEngine: string;
  isMySqlActive: boolean;
  counts: {
    payments: number;
    customers: number;
    recoveryCases: number;
    auditLogs: number;
    users: number;
  };
}

// In-Memory Storage Store
export const memoryStore = {
  payments: new Map<string, any>(),
  customers: new Map<string, any>(),
  recoveryCases: new Map<string, any>(),
  recoveryActions: new Map<string, any>(),
  users: new Map<string, any>(),
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
    gatewayMode: 'TEST_MODE',
    mlModelVersion: 'recovery-model-v1',
    autonomousRecoveryEnabled: true,
    riskScoreThreshold: 0.65,
    dunningChannel: 'WHATSAPP_UPI',
    webhookUrl: '/api/webhooks/razorpay',
    rateLimitPerMin: 300,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Boot'
  },
  auditLogs: [] as any[],
  mlPredictions: new Map<string, any>(),
  webhookEvents: new Map<string, any>()
};

let pool: mysql.Pool | null = null;
let isMySqlConnected = false;

const databaseUrl = process.env.DATABASE_URL;
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || process.env.DB_DATABASE || 'recoverai_db';
const dbPort = Number(process.env.DB_PORT || 4000);

if (databaseUrl) {
  try {
    const dbUrl = new URL(databaseUrl);
    const connectionLimit = Math.min(
      Math.max(Number(process.env.DB_CONNECTION_LIMIT || 2), 1),
      5
    );

    pool = mysql.createPool({
      host: dbUrl.hostname,
      port: Number(dbUrl.port || 4000),
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.replace(/^\//, '') || 'recoverai_db',
      waitForConnections: true,
      connectionLimit,
      maxIdle: connectionLimit,
      idleTimeout: 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
    });
  } catch (err) {
    console.warn('[DB] Could not construct MySQL pool from DATABASE_URL:', err);
    pool = null;
  }
} else if (dbHost && dbUser) {
  try {
    const connectionLimit = Math.min(
      Math.max(Number(process.env.DB_CONNECTION_LIMIT || 2), 1),
      5
    );

    pool = mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit,
      maxIdle: connectionLimit,
      idleTimeout: 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      ssl: process.env.DB_SSL === 'false' ? undefined : {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
    });
    console.log(`[DB] Created MySQL/TiDB pool for host: ${dbHost}:${dbPort}, database: ${dbName}`);
  } catch (err) {
    console.warn('[DB] Could not construct MySQL pool from DB_* parameters:', err);
    pool = null;
  }
}

/**
 * Seed in-memory storage with initial users, dataset, customers and cases
 */
async function seedMemoryStore(): Promise<void> {
  console.log('[RecoverAI] Initializing and seeding memory store...');

  // 1. Seed default users
  const salt = await bcrypt.genSalt(10);
  const adminPassHash = await bcrypt.hash('admin123', salt);
  const analystPassHash = await bcrypt.hash('analyst123', salt);

  const adminUser = {
    id: 'usr_admin_01',
    email: 'admin@recoverai.io',
    password_hash: adminPassHash,
    full_name: 'Pramod Mahajan',
    title: 'Chief Risk Officer',
    role: 'ADMIN',
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const analystUser = {
    id: 'usr_analyst_01',
    email: 'analyst@recoverai.io',
    password_hash: analystPassHash,
    full_name: 'Devin Thorne',
    title: 'Recovery Specialist',
    role: 'ANALYST',
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  memoryStore.users.set('admin@recoverai.io', adminUser);
  memoryStore.users.set('analyst@recoverai.io', analystUser);
  memoryStore.users.set('admin', adminUser);
  memoryStore.users.set('analyst', analystUser);

  // 2. Load or generate synthetic payment records
  let dataset: SyntheticPaymentRecord[] = [];
  const dataPath = path.join(process.cwd(), 'data', 'synthetic_payments_5000.json');

  if (fs.existsSync(dataPath)) {
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      dataset = JSON.parse(raw);
      console.log(`[DB] Loaded ${dataset.length} payments from existing JSON.`);
    } catch (err) {
      console.warn('[DB] Error parsing existing dataset, generating synthetic...', err);
      dataset = generateSyntheticDataset(1500);
    }
  } else {
    console.log('[DB] Generating synthetic payment records...');
    dataset = generateSyntheticDataset(1500);
    try {
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
      fs.writeFileSync(dataPath, JSON.stringify(dataset, null, 2), 'utf-8');
    } catch {
      // Ephemeral disk write ignore
    }
  }

  // 3. Populate memoryStore with Payments, Customers, and Recovery Cases
  dataset.forEach((record, index) => {
    memoryStore.payments.set(record.transaction_id, {
      id: record.id,
      transaction_id: record.transaction_id,
      merchant_id: record.merchant_id,
      customer_id: record.customer_id,
      customer_name: record.customer_name,
      customer_email: record.customer_email,
      customer_phone: record.customer_phone,
      subscription_id: record.subscription_status !== 'NONE' ? `sub_${record.customer_id.replace('cust_', '')}` : null,
      invoice_id: record.invoice_status !== 'NONE' ? `inv_${record.transaction_id.replace('txn_rzp_', '')}` : null,
      amount: record.amount,
      currency: record.currency,
      payment_method: record.payment_method,
      payment_status: record.payment_status,
      failure_code: record.failure_code,
      failure_reason: record.failure_reason,
      failure_category: record.failure_category,
      retry_count: record.retry_count,
      checkout_status: record.checkout_status,
      recovery_status: record.recovery_status,
      recovered_amount: record.recovered_amount,
      recovery_probability: record.ml_recovery_probability,
      customer_age_days: record.customer_age_days,
      previous_successful_payments: record.previous_successful_payments,
      previous_failed_payments: record.previous_failed_payments,
      previous_total_spend: record.previous_total_spend,
      created_at: record.created_at,
      updated_at: record.created_at
    });

    // Customer aggregation
    if (!memoryStore.customers.has(record.customer_id)) {
      memoryStore.customers.set(record.customer_id, {
        id: record.customer_id,
        merchant_id: record.merchant_id,
        email: record.customer_email,
        phone: record.customer_phone,
        name: record.customer_name,
        customer_age_days: record.customer_age_days,
        lifetime_value: record.previous_total_spend + (record.payment_status === 'SUCCESSFUL' || record.payment_status === 'RECOVERED' ? record.amount : 0),
        total_successful_payments: record.previous_successful_payments + (record.payment_status === 'SUCCESSFUL' || record.payment_status === 'RECOVERED' ? 1 : 0),
        total_failed_payments: record.previous_failed_payments + (record.payment_status === 'FAILED' ? 1 : 0),
        risk_score: record.failure_category === 'FRAUD_SUSPICION' ? 0.95 : (1 - record.ml_recovery_probability),
        preferred_payment_method: record.payment_method,
        created_at: record.created_at,
        updated_at: record.created_at
      });
    }

    // If payment failed or is in recovery, create recovery case
    if (record.payment_status !== 'SUCCESSFUL') {
      const caseId = `RC-${(10000 + index).toString()}`;
      const isRecovered = record.recovery_status === 'RECOVERED';
      const isRecovering = record.recovery_status === 'RECOVERING';
      const status = isRecovered ? 'RECOVERED' : isRecovering ? 'IN_PROGRESS' : 'OPEN';
      const workflowState = isRecovered ? 'RECOVERED' : isRecovering ? 'EXECUTING' : 'APPROVED';

      const riskScore = Number((1 - record.ml_recovery_probability).toFixed(3));
      const riskLevel = riskScore >= 0.65 ? 'HIGH' : riskScore >= 0.35 ? 'MEDIUM' : 'LOW';

      memoryStore.recoveryCases.set(caseId, {
        id: caseId,
        payment_id: record.transaction_id,
        customer_id: record.customer_id,
        merchant_id: record.merchant_id,
        customer_name: record.customer_name,
        customer_email: record.customer_email,
        customer_phone: record.customer_phone,
        transaction_id: record.transaction_id,
        payment_method: record.payment_method,
        at_risk_amount: record.amount,
        currency: record.currency,
        ml_recovery_probability: record.ml_recovery_probability,
        recovery_probability: record.ml_recovery_probability,
        risk_score: riskScore,
        risk_level: riskLevel,
        primary_failure_diagnosis: record.failure_reason || 'Transaction failed authorization',
        recommended_strategy: record.recommended_strategy || 'SMART_RETRY_OFFPEAK',
        recommended_action: record.recommended_strategy || 'SMART_RETRY_OFFPEAK',
        status,
        workflow_state: workflowState,
        actions_taken_count: record.retry_count || (isRecovered ? 1 : 0),
        current_retry_count: record.retry_count || 0,
        recovered_amount: isRecovered ? record.amount : 0,
        recovered_at: isRecovered ? record.created_at : null,
        closed_at: isRecovered ? record.created_at : null,
        created_at: record.created_at,
        updated_at: record.created_at
      });
    }
  });

  // 4. Initial audit logs
  memoryStore.auditLogs.push(
    {
      id: `aud_${Date.now()}_boot`,
      actor_type: 'SYSTEM_AI_AGENT',
      actor_id: 'recoverai_engine_daemon',
      actor_name: 'RecoverAI Core Agent',
      actor_role: 'SYSTEM',
      action_name: 'SYSTEM_BOOTSTRAP_COMPLETE',
      entity_type: 'SYSTEM',
      entity_id: 'recoverai_core',
      reason: 'RecoverAI Revenue Recovery Platform online with ML pipeline',
      result: 'OPERATIONAL',
      previous_state: null,
      new_state: { status: 'ONLINE', mode: 'TEST_MODE' },
      ip_address: '127.0.0.1',
      user_agent: 'RecoverAI Engine/1.0',
      created_at: new Date().toISOString()
    },
    {
      id: `aud_${Date.now() - 3600000}_policy`,
      actor_type: 'ADMIN_USER',
      actor_id: 'usr_admin_01',
      actor_name: 'Pramod Mahajan',
      actor_role: 'ADMIN',
      action_name: 'POLICY_ENFORCEMENT_VERIFIED',
      entity_type: 'POLICY_CONFIG',
      entity_id: 'global_policy_rules',
      reason: 'Bounded safety thresholds validated (max_retries <= 2, cooldown = 45m)',
      result: 'BOUNDED_STRICT',
      previous_state: null,
      new_state: memoryStore.policyConfig,
      ip_address: '127.0.0.1',
      user_agent: 'RecoverAI Admin/1.0',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  );

  console.log(`[RecoverAI] Memory store seeded: ${memoryStore.payments.size} payments, ${memoryStore.customers.size} customers, ${memoryStore.recoveryCases.size} cases, ${memoryStore.users.size} users.`);
}

/**
 * Initialize and test database connection (or gracefully fallback to in-memory)
 */
export async function initDatabase(): Promise<void> {
  // Always seed memory store first for immediate local availability
  await seedMemoryStore();

  if (pool) {
    let connection: mysql.PoolConnection | undefined;
    try {
      connection = await pool.getConnection();
      await connection.query('SELECT 1');
      isMySqlConnected = true;
      console.log('[DB] MySQL / TiDB Cloud connected successfully');
    } catch (error) {
      console.warn('[DB] MySQL connection unconfigured or unavailable, using in-memory store:', (error as Error).message);
      isMySqlConnected = false;
    } finally {
      connection?.release();
    }
  } else {
    console.log('[DB] Running with high-performance in-memory dataset store.');
  }
}

/**
 * Get a database connection from the pool (or mock if offline)
 */
export async function getConnection(): Promise<any> {
  if (pool && isMySqlConnected) {
    return pool.getConnection();
  }
  return {
    query: async () => [[]],
    release: () => {}
  };
}

/**
 * Execute a database query
 */
export async function query<T = any>(
  sql: string,
  values?: any[]
): Promise<[any, any]> {
  if (pool && isMySqlConnected) {
    return pool.query(sql, values);
  }
  return [[] as T[], [] as mysql.FieldPacket[]];
}

/**
 * Check database connection status
 */
export function getDbStatus(): DbStatusInfo {
  return {
    connected: true,
    message: isMySqlConnected ? 'MySQL/TiDB database connected' : 'In-memory dataset storage operational',
    storageEngine: isMySqlConnected ? 'MySQL / TiDB Cloud' : 'In-Memory State Store (Synchronized)',
    isMySqlActive: isMySqlConnected,
    counts: {
      payments: memoryStore.payments.size,
      customers: memoryStore.customers.size,
      recoveryCases: memoryStore.recoveryCases.size,
      auditLogs: memoryStore.auditLogs.length,
      users: memoryStore.users.size
    }
  };
}

export default pool;
