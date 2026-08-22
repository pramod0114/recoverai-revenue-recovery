import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db/connection.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { healthRouter } from './server/routes/health.js';
import { authRouter } from './server/routes/auth.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { paymentsRouter } from './server/routes/payments.js';
import { customersRouter } from './server/routes/customers.js';
import { recoveryRouter } from './server/routes/recovery.js';
import { mlRouter } from './server/routes/ml.js';
import { auditRouter } from './server/routes/audit.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize DB layer (MySQL + in-memory store fallback)
  await initDatabase();

  // API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/recovery', recoveryRouter);
  app.use('/api/ml', mlRouter);
  app.use('/api/audit', auditRouter);

  // Centralized Error Handling Middleware for APIs
  app.use('/api', errorHandler);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RecoverAI] Full-stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[RecoverAI] Fatal bootstrap error:', err);
  process.exit(1);
});
