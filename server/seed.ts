import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { generateSyntheticDataset } from '../data/generate_dataset.js';

dotenv.config();

async function runSeed() {
  console.log('=== RECOVERAI SEED PIPELINE INITIALIZING ===');
  
  const dataPath = path.join(process.cwd(), 'data', 'synthetic_payments_5000.json');
  let dataset: any[] = [];
  
  if (!fs.existsSync(dataPath)) {
    console.log('[Seed] Generating 5,000 synthetic payment records...');
    dataset = generateSyntheticDataset(5000);
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(dataset, null, 2), 'utf-8');
  } else {
    console.log('[Seed] Reading existing dataset from', dataPath);
    dataset = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }

  console.log(`[Seed] Dataset loaded: ${dataset.length} payment records ready.`);

  // Check MySQL connectivity
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbUser = process.env.DB_USER || 'recover_user';
  const dbPassword = process.env.DB_PASSWORD || 'recover_password';
  const dbName = process.env.DB_NAME || 'recoverai_db';
  const dbPort = Number(process.env.DB_PORT || 3306);

  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
      connectTimeout: 3000
    });

    console.log(`[Seed] Connected to MySQL database (${dbName}) on ${dbHost}:${dbPort}`);

    // Create schema if needed
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'database', 'schema.sql'), 'utf-8');
    const statements = schemaSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      if (stmt.toLowerCase().startsWith('use ') || stmt.toLowerCase().startsWith('create database')) continue;
      await connection.query(stmt);
    }
    console.log('[Seed] Executed database schema tables.');

    // Seed default users
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('Admin@RecoverAI2026', salt);
    const analystPass = await bcrypt.hash('Analyst@RecoverAI2026', salt);

    await connection.query(
      `INSERT INTO users (id, email, password_hash, full_name, role) VALUES 
       ('usr_admin_01', 'admin@recoverai.io', ?, 'Pramod Mahajan (Chief Risk Officer)', 'ADMIN'),
       ('usr_analyst_01', 'analyst@recoverai.io', ?, 'Devin Thorne (Recovery Specialist)', 'ANALYST')
       ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)`,
      [adminPass, analystPass]
    );

    console.log('[Seed] Seeded default users (admin@recoverai.io / analyst@recoverai.io).');
    await connection.end();
    console.log('[Seed] MySQL seeding completed successfully.');
  } catch (err) {
    console.log(`[Seed] MySQL server offline or unconfigured (${(err as Error).message}).`);
    console.log('[Seed] Seed dataset is prepared at data/synthetic_payments_5000.json for application runtime.');
  }
}

runSeed().catch(console.error);
