import { Router, Request, Response } from 'express';
import { getDbStatus } from '../db/connection.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const dbStatus = getDbStatus();
  
  res.json({
    success: true,
    status: 'healthy',
    service: 'RecoverAI Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime_seconds: Math.floor(process.uptime()),
    database: {
      status: 'connected',
      engine: dbStatus.storageEngine,
      is_mysql_active: dbStatus.isMySqlActive,
      records: dbStatus.counts
    },
    ml_service: {
      configured_url: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
      status: 'AVAILABLE'
    },
    integrations: {
      razorpay_gateway: 'CONNECTED_SANDBOX'
    }
  });
});
