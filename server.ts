import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import { initDatabase } from './server/db/connection.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import {
  securityHeaders,
  rawBodySaver,
} from './server/middleware/security.js';

import { healthRouter } from './server/routes/health.js';
import { authRouter } from './server/routes/auth.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { paymentsRouter } from './server/routes/payments.js';
import { customersRouter } from './server/routes/customers.js';
import { recoveryRouter } from './server/routes/recovery.js';
import { mlRouter } from './server/routes/ml.js';
import { auditRouter } from './server/routes/audit.js';
import { adminRouter } from './server/routes/admin.js';
import { webhooksRouter } from './server/routes/webhooks.js';

dotenv.config();

const app = express();

/* --------------------------------------------------
   Security
-------------------------------------------------- */

app.use(securityHeaders);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* --------------------------------------------------
   Request Body Parsing
-------------------------------------------------- */

app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, res: any, buf: Buffer, encoding: string) => {
      rawBodySaver(req, res, buf, encoding);
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

/* --------------------------------------------------
   Database
-------------------------------------------------- */

const databaseReady = initDatabase().catch((error) => {
  console.error(
    '[RecoverAI] Database initialization encountered an error (using fallback store):',
    error
  );
});

/*
 * Ensure database initialization attempt completes before handling API requests.
 */
app.use('/api', async (_req, _res, next) => {
  try {
    await databaseReady;
    next();
  } catch (error) {
    next();
  }
});

/* --------------------------------------------------
   API Routes
-------------------------------------------------- */

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/recovery', recoveryRouter);
app.use('/api/ml', mlRouter);
app.use('/api/audit', auditRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks', webhooksRouter);

/* --------------------------------------------------
   API Error Handler
-------------------------------------------------- */

app.use('/api', errorHandler);

/* --------------------------------------------------
   Local Production Frontend
-------------------------------------------------- */

if (
  process.env.NODE_ENV === 'production' &&
  !process.env.VERCEL
) {
  const distPath = path.join(process.cwd(), 'dist');

  app.use(express.static(distPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

/* --------------------------------------------------
   Local Development
-------------------------------------------------- */

if (!process.env.VERCEL) {
  const startLocalServer = async () => {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');

      const vite = await createViteServer({
        server: {
          middlewareMode: true,
        },
        appType: 'spa',
      });

      app.use(vite.middlewares);
    }

    const PORT = Number(process.env.PORT || 3000);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[RecoverAI] Server running on http://localhost:${PORT}`
      );
    });
  };

  startLocalServer().catch((error) => {
    console.error(
      '[RecoverAI] Fatal server error:',
      error
    );

    process.exit(1);
  });
}

/* --------------------------------------------------
   Vercel Export
-------------------------------------------------- */

export default app;
