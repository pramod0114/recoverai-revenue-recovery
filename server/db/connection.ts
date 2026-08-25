import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
  waitForConnections: true,
  ssl: {
    rejectUnauthorized: true,
  },
});

export async function initDatabase() {
  try {
    const connection = await pool.getConnection();

    await connection.query('SELECT 1');

    connection.release();

    console.log('[DB] TiDB Cloud connected successfully');
  } catch (error) {
    console.error('[DB] TiDB connection failed:', error);
    throw error;
  }
}

export async function getConnection() {
  return pool.getConnection();
}

export default pool;
