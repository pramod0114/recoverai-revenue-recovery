import { Router, Request, Response } from 'express';
import { memoryStore } from '../db/connection.js';

export const auditRouter = Router();

auditRouter.get('/logs', (req: Request, res: Response) => {
  let logs = [...memoryStore.auditLogs];
  const { actorType, entityType, limit = '50', page = '1' } = req.query;

  if (actorType && actorType !== 'ALL') {
    logs = logs.filter((l) => l.actor_type === actorType);
  }
  if (entityType && entityType !== 'ALL') {
    logs = logs.filter((l) => l.entity_type === entityType);
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
  const total = logs.length;
  const startIndex = (pageNum - 1) * pageSize;
  const paginated = logs.slice(startIndex, startIndex + pageSize);

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
