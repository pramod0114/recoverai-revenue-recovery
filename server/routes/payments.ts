import { Router, Request, Response, NextFunction } from 'express';
import { memoryStore } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const paymentsRouter = Router();

paymentsRouter.get('/', (req: Request, res: Response) => {
  let list = Array.from(memoryStore.payments.values());

  const { status, method, failureCategory, search, limit = '25', page = '1' } = req.query;

  // Filtering
  if (status && status !== 'ALL') {
    list = list.filter((p) => p.payment_status === status);
  }
  if (method && method !== 'ALL') {
    list = list.filter((p) => p.payment_method === method);
  }
  if (failureCategory && failureCategory !== 'ALL') {
    list = list.filter((p) => p.failure_category === failureCategory);
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (p) =>
        p.transaction_id.toLowerCase().includes(q) ||
        (p.customer_name && p.customer_name.toLowerCase().includes(q)) ||
        (p.customer_email && p.customer_email.toLowerCase().includes(q))
    );
  }

  // Sort descending by created_at
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
  const total = list.length;
  const startIndex = (pageNum - 1) * pageSize;
  const paginated = list.slice(startIndex, startIndex + pageSize);

  res.json({
    success: true,
    data: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

paymentsRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  const payment = memoryStore.payments.get(req.params.id);
  if (!payment) {
    return next(new AppError(`Payment record not found with id ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  const recoveryCase = Array.from(memoryStore.recoveryCases.values()).find((c) => c.payment_id === payment.id);

  res.json({
    success: true,
    data: {
      ...payment,
      recoveryCase: recoveryCase || null
    }
  });
});

paymentsRouter.post('/:id/retry', (req: Request, res: Response, next: NextFunction) => {
  const payment = memoryStore.payments.get(req.params.id);
  if (!payment) {
    return next(new AppError(`Payment not found: ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  // Simulate smart bounded retry
  payment.retry_count += 1;
  const isSuccessful = Math.random() < 0.75;

  if (isSuccessful) {
    payment.payment_status = 'RECOVERED';
    payment.recovery_status = 'RECOVERED';
    payment.recovered_amount = payment.amount;
  }

  // Update corresponding recovery case if exists
  const rCase = Array.from(memoryStore.recoveryCases.values()).find((c) => c.payment_id === payment.id);
  if (rCase) {
    rCase.actions_taken_count += 1;
    if (isSuccessful) {
      rCase.status = 'RECOVERED';
      rCase.recovered_amount = payment.amount;
      rCase.recovered_at = new Date().toISOString();
      rCase.closed_at = new Date().toISOString();
    }
  }

  // Audit trail
  memoryStore.auditLogs.unshift({
    id: `aud_${Date.now()}_retry`,
    actor_type: req.user ? (req.user.role === 'ADMIN' ? 'ADMIN_USER' : 'ANALYST_USER') : 'SYSTEM_AI_AGENT',
    actor_id: req.user ? req.user.id : 'agent_retry_daemon',
    action_name: 'PAYMENT_RETRY_TRIGGERED',
    entity_type: 'PAYMENT',
    entity_id: payment.id,
    previous_state: { retry_count: payment.retry_count - 1 },
    new_state: { retry_count: payment.retry_count, outcome: isSuccessful ? 'RECOVERED' : 'FAILED' },
    ip_address: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'RecoverAI Client',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    data: {
      payment,
      outcome: isSuccessful ? 'SUCCESS_RECOVERED' : 'RETRY_FAILED',
      message: isSuccessful
        ? `Successfully recovered ₹${payment.amount.toLocaleString('en-IN')} via dynamic channel retry!`
        : `Retry attempt #${payment.retry_count} failed. Scheduled next off-peak retry sequence.`
    }
  });
});
