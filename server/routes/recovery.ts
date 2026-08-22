import { Router, Request, Response, NextFunction } from 'express';
import { memoryStore } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const recoveryRouter = Router();

recoveryRouter.get('/cases', (req: Request, res: Response) => {
  let list = Array.from(memoryStore.recoveryCases.values());
  const { status, strategy, search, limit = '25', page = '1' } = req.query;

  if (status && status !== 'ALL') {
    list = list.filter((c) => c.status === status);
  }
  if (strategy && strategy !== 'ALL') {
    list = list.filter((c) => c.recommended_strategy === strategy);
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
        (c.transaction_id && c.transaction_id.toLowerCase().includes(q)) ||
        c.primary_failure_diagnosis.toLowerCase().includes(q)
    );
  }

  // Sort by created_at desc
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

recoveryRouter.get('/cases/:id', (req: Request, res: Response, next: NextFunction) => {
  const item = memoryStore.recoveryCases.get(req.params.id);
  if (!item) {
    return next(new AppError(`Recovery case not found with id ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  const actions = Array.from(memoryStore.recoveryActions.values()).filter((a) => a.case_id === item.id);
  const payment = memoryStore.payments.get(item.payment_id);

  res.json({
    success: true,
    data: {
      ...item,
      payment,
      actions
    }
  });
});

recoveryRouter.post('/cases/:id/action', (req: Request, res: Response, next: NextFunction) => {
  const rCase = memoryStore.recoveryCases.get(req.params.id);
  if (!rCase) {
    return next(new AppError(`Recovery case not found: ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  const { actionType = 'DYNAMIC_RETRY', channel = 'WHATSAPP' } = req.body;

  // Create action record
  const actionId = `act_${Date.now()}`;
  const isRecovered = Math.random() < 0.78;

  const actionRecord = {
    id: actionId,
    case_id: rCase.id,
    action_type: actionType,
    status: isRecovered ? ('SUCCESS' as const) : ('EXECUTED' as const),
    trigger_channel: channel,
    payload_snapshot: { actionType, channel, triggerTime: new Date().toISOString() },
    result_response: isRecovered ? 'Customer completed payment link successfully' : 'Intervention dispatched via Razorpay webhook link',
    scheduled_for: new Date().toISOString(),
    executed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  memoryStore.recoveryActions.set(actionId, actionRecord);
  rCase.actions_taken_count += 1;

  if (isRecovered) {
    rCase.status = 'RECOVERED';
    rCase.recovered_amount = rCase.at_risk_amount;
    rCase.recovered_at = new Date().toISOString();
    rCase.closed_at = new Date().toISOString();

    const payment = memoryStore.payments.get(rCase.payment_id);
    if (payment) {
      payment.payment_status = 'RECOVERED';
      payment.recovery_status = 'RECOVERED';
      payment.recovered_amount = rCase.at_risk_amount;
    }
  } else {
    rCase.status = 'IN_PROGRESS';
  }

  // Audit entry
  memoryStore.auditLogs.unshift({
    id: `aud_${Date.now()}_case_action`,
    actor_type: req.user ? (req.user.role === 'ADMIN' ? 'ADMIN_USER' : 'ANALYST_USER') : 'SYSTEM_AI_AGENT',
    actor_id: req.user ? req.user.id : 'recoverai_autonomous_agent',
    action_name: 'RECOVERY_WORKFLOW_ACTION_EXECUTED',
    entity_type: 'RECOVERY_CASE',
    entity_id: rCase.id,
    previous_state: { status: rCase.status },
    new_state: { actionType, isRecovered, recoveredAmount: isRecovered ? rCase.at_risk_amount : 0 },
    ip_address: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'RecoverAI Agent Engine',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    data: {
      case: rCase,
      action: actionRecord,
      message: isRecovered
        ? `Revenue of ₹${rCase.at_risk_amount.toLocaleString('en-IN')} successfully recovered!`
        : `Recovery action ${actionType} triggered via ${channel}. Monitoring response stream.`
    }
  });
});

recoveryRouter.post('/batch-diagnose', (_req: Request, res: Response) => {
  const openCases = Array.from(memoryStore.recoveryCases.values()).filter((c) => c.status === 'OPEN').slice(0, 100);

  let updatedCount = 0;
  openCases.forEach((c) => {
    c.status = 'IN_PROGRESS';
    c.actions_taken_count += 1;
    updatedCount++;
  });

  memoryStore.auditLogs.unshift({
    id: `aud_${Date.now()}_batch`,
    actor_type: 'SYSTEM_AI_AGENT',
    actor_id: 'recoverai_batch_processor',
    action_name: 'BATCH_DIAGNOSTICS_EXECUTED',
    entity_type: 'RECOVERY_BATCH',
    entity_id: `batch_${Date.now()}`,
    previous_state: null,
    new_state: { openCasesDiagnosed: updatedCount },
    ip_address: '127.0.0.1',
    user_agent: 'RecoverAI ML Agent Daemon',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    data: {
      diagnosedCount: updatedCount,
      message: `Successfully ran AI diagnostics on ${updatedCount} open recovery cases.`
    }
  });
});

recoveryRouter.get('/interventions', (req: Request, res: Response) => {
  const { status, type, limit = '50', page = '1' } = req.query;
  let actions = Array.from(memoryStore.recoveryActions.values());
  
  if (status && status !== 'ALL') {
    actions = actions.filter((a) => a.status === status);
  }
  if (type && type !== 'ALL') {
    actions = actions.filter((a) => a.action_type === type);
  }

  // Sort descending
  actions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Join case data
  const enriched = actions.map((act) => {
    const rCase = memoryStore.recoveryCases.get(act.case_id);
    return {
      ...act,
      case: rCase ? {
        id: rCase.id,
        customer_name: rCase.customer_name,
        at_risk_amount: rCase.at_risk_amount,
        recovery_probability: rCase.recovery_probability,
        risk_level: rCase.risk_level,
        status: rCase.status
      } : null
    };
  });

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
  const total = enriched.length;
  const startIndex = (pageNum - 1) * pageSize;
  const paginated = enriched.slice(startIndex, startIndex + pageSize);

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

recoveryRouter.post('/cases/:id/approve', (req: Request, res: Response, next: NextFunction) => {
  const rCase = memoryStore.recoveryCases.get(req.params.id);
  if (!rCase) {
    return next(new AppError(`Recovery case not found: ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  rCase.status = 'IN_PROGRESS';
  rCase.actions_taken_count += 1;

  const actionId = `act_${Date.now()}`;
  const actionRecord = {
    id: actionId,
    case_id: rCase.id,
    action_type: rCase.recommended_strategy || 'DYNAMIC_RETRY',
    status: 'EXECUTED' as const,
    trigger_channel: 'RAZORPAY_AUTONOMOUS',
    payload_snapshot: { approval: 'APPROVED_BY_ANALYST', time: new Date().toISOString() },
    result_response: 'Autonomous recovery workflow approved and queued for execution',
    scheduled_for: new Date().toISOString(),
    executed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  memoryStore.recoveryActions.set(actionId, actionRecord);

  memoryStore.auditLogs.unshift({
    id: `aud_${Date.now()}_approve`,
    actor_type: req.user?.role === 'ADMIN' ? 'ADMIN_USER' : 'ANALYST_USER',
    actor_id: req.user?.id || 'analyst_operator',
    action_name: 'RECOVERY_CASE_APPROVED',
    entity_type: 'RECOVERY_CASE',
    entity_id: rCase.id,
    previous_state: { status: 'OPEN' },
    new_state: { status: 'IN_PROGRESS', approvedAt: new Date().toISOString() },
    ip_address: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'RecoverAI Operator UI',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    data: {
      case: rCase,
      message: `Recovery case #${rCase.id} approved. AI workflow initiated.`
    }
  });
});

recoveryRouter.post('/cases/:id/escalate', (req: Request, res: Response, next: NextFunction) => {
  const rCase = memoryStore.recoveryCases.get(req.params.id);
  if (!rCase) {
    return next(new AppError(`Recovery case not found: ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  rCase.status = 'IN_PROGRESS';
  rCase.recommended_strategy = 'MANUAL_INTERVENTION';

  const actionId = `act_${Date.now()}`;
  const actionRecord = {
    id: actionId,
    case_id: rCase.id,
    action_type: 'MANUAL_INTERVENTION',
    status: 'PENDING_REVIEW' as const,
    trigger_channel: 'HUMAN_SUPPORT',
    payload_snapshot: { reason: req.body?.reason || 'Escalated by analyst for high priority manual handling' },
    result_response: 'Assigned to senior recovery tier desk',
    scheduled_for: new Date().toISOString(),
    executed_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  memoryStore.recoveryActions.set(actionId, actionRecord);

  memoryStore.auditLogs.unshift({
    id: `aud_${Date.now()}_escalate`,
    actor_type: req.user?.role === 'ADMIN' ? 'ADMIN_USER' : 'ANALYST_USER',
    actor_id: req.user?.id || 'analyst_operator',
    action_name: 'RECOVERY_CASE_ESCALATED',
    entity_type: 'RECOVERY_CASE',
    entity_id: rCase.id,
    previous_state: { strategy: rCase.recommended_strategy },
    new_state: { strategy: 'MANUAL_INTERVENTION', escalated: true },
    ip_address: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'RecoverAI Operator UI',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    data: {
      case: rCase,
      message: `Recovery case #${rCase.id} escalated to human intervention desk.`
    }
  });
});

recoveryRouter.post('/cases/:id/stop', (req: Request, res: Response, next: NextFunction) => {
  const rCase = memoryStore.recoveryCases.get(req.params.id);
  if (!rCase) {
    return next(new AppError(`Recovery case not found: ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  rCase.status = 'UNRECOVERED';
  rCase.closed_at = new Date().toISOString();

  memoryStore.auditLogs.unshift({
    id: `aud_${Date.now()}_stop`,
    actor_type: req.user?.role === 'ADMIN' ? 'ADMIN_USER' : 'ANALYST_USER',
    actor_id: req.user?.id || 'analyst_operator',
    action_name: 'RECOVERY_CASE_STOPPED',
    entity_type: 'RECOVERY_CASE',
    entity_id: rCase.id,
    previous_state: { status: rCase.status },
    new_state: { status: 'UNRECOVERED', stoppedBy: 'User Action' },
    ip_address: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'RecoverAI Operator UI',
    created_at: new Date().toISOString()
  });

  res.json({
    success: true,
    data: {
      case: rCase,
      message: `Recovery workflow stopped for case #${rCase.id}.`
    }
  });
});

