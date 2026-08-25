import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const dbUrl = new URL(databaseUrl);

const connectionLimit = Math.min(
  Math.max(Number(process.env.DB_CONNECTION_LIMIT || 3), 1),
  5
);

const pool = mysql.createPool({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 4000),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ''),

  waitForConnections: true,
  connectionLimit,
  maxIdle: connectionLimit,
  idleTimeout: 60000,

  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,

  ssl: {
    rejectUnauthorized: true,
  },
});

export async function initDatabase(): Promise<void> {
  let connection: mysql.PoolConnection | undefined;

  try {
    connection = await pool.getConnection();

    await connection.query('SELECT 1');

    console.log('[DB] TiDB Cloud connected successfully');
  } catch (error) {
    console.error('[DB] TiDB Cloud connection failed:', error);
    throw error;
  } finally {
    connection?.release();
  }
}

export async function getConnection(): Promise<mysql.PoolConnection> {
  return pool.getConnection();
}

export async function query<T = any>(
  sql: string,
  values?: any[]
): Promise<[T[], mysql.FieldPacket[]]> {
  return pool.query<T[]>(sql, values);
}

export default pool;
