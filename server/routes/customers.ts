import { Router, Request, Response, NextFunction } from 'express';
import { memoryStore } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const customersRouter = Router();

customersRouter.get('/', (req: Request, res: Response) => {
  let list = Array.from(memoryStore.customers.values());
  const { search, limit = '25', page = '1' } = req.query;

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }

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

customersRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  const customer = memoryStore.customers.get(req.params.id);
  if (!customer) {
    return next(new AppError(`Customer not found with id ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  const payments = Array.from(memoryStore.payments.values()).filter((p) => p.customer_id === customer.id);
  const cases = Array.from(memoryStore.recoveryCases.values()).filter((c) => c.customer_id === customer.id);

  res.json({
    success: true,
    data: {
      ...customer,
      payments,
      recoveryCases: cases
    }
  });
});
