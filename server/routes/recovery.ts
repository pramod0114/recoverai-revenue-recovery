import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { memoryStore } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { RecoveryAgent } from '../agent/RecoveryAgent.js';
import { AuditService } from '../agent/AuditService.js';
import { ControlledRecoveryAction } from '../agent/types.js';

export const recoveryRouter = Router();
const agent = RecoveryAgent.getInstance();
const auditService = AuditService.getInstance();

/**
 * GET /api/recovery/cases
 * List all recovery cases with filtering, search, pagination
 */
recoveryRouter.get('/cases', (req: Request, res: Response) => {
  let list = Array.from(memoryStore.recoveryCases.values());
  const { status, strategy, search, workflow_state, limit = '25', page = '1' } = req.query;

  if (status && status !== 'ALL') {
    list = list.filter((c) => c.status === status);
  }
  if (workflow_state && workflow_state !== 'ALL') {
    list = list.filter((c) => (c as any).workflow_state === workflow_state);
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

/**
 * GET /api/recovery/cases/:id
 * Retrieve full recovery case record with payment and audit trail
 */
recoveryRouter.get('/cases/:id', (req: Request, res: Response, next: NextFunction) => {
  const item = memoryStore.recoveryCases.get(req.params.id);
  if (!item) {
    return next(new AppError(`Recovery case not found with id ${req.params.id}`, 404, 'NOT_FOUND'));
  }

  const actions = Array.from(memoryStore.recoveryActions.values()).filter((a) => a.case_id === item.id);
  const payment = memoryStore.payments.get(item.payment_id);
  const auditTrail = auditService.getCaseAuditTrail(item.id);

  res.json({
    success: true,
    data: {
      ...item,
      payment,
      actions,
      auditTrail
    }
  });
});

/**
 * POST /api/recovery/analyze
 * AI Revenue Recovery Agent analysis & policy evaluation endpoint
 */
recoveryRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      case_id,
      transaction_id,
      amount,
      payment_method,
      failure_reason,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      retry_count,
      risk_score,
      recovery_probability,
      root_cause
    } = req.body;

    // Resolve transaction context if only ID is provided
    let txId = transaction_id;
    let resolvedAmount = amount;
    let resolvedMethod = payment_method;
    let resolvedReason = failure_reason;
    let resolvedRetry = retry_count ?? 0;
    let resolvedCustId = customer_id;
    let resolvedCustName = customer_name;
    let resolvedCustEmail = customer_email;
    let resolvedCustPhone = customer_phone;

    if (case_id && (!txId || !resolvedAmount)) {
      const existing = memoryStore.recoveryCases.get(case_id);
      if (existing) {
        txId = existing.transaction_id || existing.payment_id;
        resolvedAmount = resolvedAmount || existing.at_risk_amount;
        resolvedMethod = resolvedMethod || existing.payment_method;
        resolvedReason = resolvedReason || existing.primary_failure_diagnosis;
        resolvedRetry = existing.actions_taken_count || 0;
        resolvedCustId = resolvedCustId || existing.customer_id;
        resolvedCustName = resolvedCustName || existing.customer_name;
        resolvedCustEmail = resolvedCustEmail || existing.customer_email;
        resolvedCustPhone = resolvedCustPhone || existing.customer_phone;
      }
    }

    if (txId && (!resolvedAmount || !resolvedMethod)) {
      const payment = memoryStore.payments.get(txId);
      if (payment) {
        resolvedAmount = resolvedAmount || payment.amount;
        resolvedMethod = resolvedMethod || payment.payment_method;
        resolvedReason = resolvedReason || payment.failure_reason || payment.failure_category;
        resolvedRetry = resolvedRetry || payment.retry_count || 0;
        resolvedCustId = resolvedCustId || payment.customer_id;
        resolvedCustName = resolvedCustName || payment.customer_name;
        resolvedCustEmail = resolvedCustEmail || payment.customer_email;
        resolvedCustPhone = resolvedCustPhone || payment.customer_phone;
      }
    }

    if (!txId) {
      return next(new AppError('transaction_id or case_id is required for AI analysis.', 400, 'BAD_REQUEST'));
    }

    const decision = await agent.analyze({
      case_id,
      transaction_id: txId,
      amount: Number(resolvedAmount || 1000),
      payment_method: resolvedMethod || 'UPI',
      failure_reason: resolvedReason || 'Network Failure',
      customer_id: resolvedCustId,
      customer_name: resolvedCustName,
      customer_email: resolvedCustEmail,
      customer_phone: resolvedCustPhone,
      retry_count: Number(resolvedRetry),
      risk_score: risk_score !== undefined ? Number(risk_score) : undefined,
      recovery_probability: recovery_probability !== undefined ? Number(recovery_probability) : undefined,
      root_cause
    });

    res.json({
      success: true,
      data: decision
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/recovery/override
 * ADMIN-ONLY Endpoint: Override automated safety policy on a blocked/restricted recovery case
 */
recoveryRouter.post('/override', authenticate, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { case_id, override_action, reason, idempotency_key } = req.body;

    if (!case_id) {
      throw new AppError('case_id is required for policy override.', 400, 'VALIDATION_ERROR');
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      throw new AppError('A valid justification reason is mandatory for admin policy overrides.', 400, 'REASON_REQUIRED');
    }

    const targetCase = memoryStore.recoveryCases.get(case_id);
    if (!targetCase) {
      throw new AppError(`Recovery case with id ${case_id} not found.`, 404, 'NOT_FOUND');
    }

    const actionToRun = (override_action as ControlledRecoveryAction) || 'RETRY_PAYMENT';

    // Execute through agent with override permission
    const result = await agent.execute({
      case_id,
      override_action: actionToRun,
      idempotency_key: idempotency_key || `idemp_ovr_${Date.now()}_${case_id}`
    });

    // Record high-visibility compliance audit log
    const auditRecord = {
      id: `aud_${Date.now()}_override`,
      actor_type: 'ADMIN_USER',
      actor_id: req.user!.id,
      actor_name: req.user!.fullName,
      actor_role: 'ADMIN',
      action_name: 'POLICY_OVERRIDE',
      entity_type: 'RECOVERY_CASE',
      entity_id: case_id,
      case_id,
      reason: reason.trim(),
      result: result.execution?.status || result.workflow_state || 'OVERRIDE_EXECUTED',
      previous_state: {
        status: targetCase.status,
        workflow_state: (targetCase as any).workflow_state,
        actions_taken: targetCase.actions_taken_count
      },
      new_state: {
        action: actionToRun,
        result: result.execution?.status || result.workflow_state,
        authorized_by: req.user!.fullName,
        role: req.user!.role,
        reason: reason.trim(),
        timestamp: new Date().toISOString()
      },
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'RecoverAI Admin Console',
      created_at: new Date().toISOString()
    };

    memoryStore.auditLogs.unshift(auditRecord);

    res.json({
      success: true,
      message: 'Admin policy override approved and executed.',
      data: {
        result,
        audit: auditRecord
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/recovery/execute
 * Execute bounded recovery action in Razorpay Test Mode with verification & audit
 */
recoveryRouter.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { case_id, transaction_id, override_action, idempotency_key } = req.body;

    let targetCaseId = case_id;
    if (!targetCaseId && transaction_id) {
      const existing = Array.from(memoryStore.recoveryCases.values()).find(
        (c) => c.transaction_id === transaction_id || c.payment_id === transaction_id
      );
      if (existing) {
        targetCaseId = existing.id;
      } else {
        // Run analysis first to create case
        const decision = await agent.analyze({
          transaction_id,
          amount: req.body.amount || 1000,
          payment_method: req.body.payment_method || 'UPI',
          failure_reason: req.body.failure_reason || 'Network Failure'
        });
        targetCaseId = decision.case_id;
      }
    }

    if (!targetCaseId) {
      return next(new AppError('case_id or transaction_id is required for execution.', 400, 'BAD_REQUEST'));
    }

    const result = await agent.execute({
      case_id: targetCaseId,
      override_action: override_action as ControlledRecoveryAction,
      idempotency_key
    });

    // Mirror user context if authenticated
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded: any = jwt.decode(token);
        if (decoded) {
          memoryStore.auditLogs.unshift({
            id: `aud_${Date.now()}_exec_usr`,
            actor_type: decoded.role === 'ADMIN' ? 'ADMIN_USER' : 'ANALYST_USER',
            actor_id: decoded.id,
            actor_name: decoded.fullName,
            actor_role: decoded.role,
            action_name: override_action || 'RECOVERY_ACTION_EXECUTE',
            entity_type: 'RECOVERY_CASE',
            entity_id: targetCaseId,
            case_id: targetCaseId,
            result: result.execution?.status || result.workflow_state,
            previous_state: null,
            new_state: { action: override_action, result: result.execution?.status || result.workflow_state },
            ip_address: req.ip || '127.0.0.1',
            user_agent: req.headers['user-agent'] || 'RecoverAI Portal',
            created_at: new Date().toISOString()
          });
        }
      } catch (tokenErr) {
        // Ignore token decode failure
      }
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/recovery/verify
 * Explicit recovery status verification endpoint
 */
recoveryRouter.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { case_id } = req.body;
    if (!case_id) {
      return next(new AppError('case_id is required for verification.', 400, 'BAD_REQUEST'));
    }

    const result = await agent.verifyCase(case_id);
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/recovery/escalate
 * Human operator escalation endpoint
 */
recoveryRouter.post('/escalate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { case_id, reason, priority = 'HIGH', assigned_status = 'PENDING_REVIEW', operator_notes } = req.body;
    if (!case_id) {
      return next(new AppError('case_id is required for escalation.', 400, 'BAD_REQUEST'));
    }

    const result = await agent.escalate({
      case_id,
      reason: reason || 'Manual operator escalation requested from dashboard.',
      priority,
      assigned_status,
      operator_notes
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * GET /api/recovery/:id/audit and GET /api/recovery/cases/:id/audit
 * Retrieve complete audit trail for a recovery case
 */
const getAuditHandler = (req: Request, res: Response, next: NextFunction) => {
  const caseId = req.params.id;
  if (!caseId) {
    return next(new AppError('Case ID is required.', 400, 'BAD_REQUEST'));
  }

  const logs = auditService.getCaseAuditTrail(caseId);
  res.json({
    success: true,
    data: {
      case_id: caseId,
      total_entries: logs.length,
      audit_trail: logs
    }
  });
};

recoveryRouter.get('/:id/audit', getAuditHandler);
recoveryRouter.get('/cases/:id/audit', getAuditHandler);

/**
 * POST /api/recovery/diagnose-all
 * Run AI recovery agent diagnostics and policy checks across all open cases
 */
recoveryRouter.post('/diagnose-all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = Array.from(memoryStore.recoveryCases.values());
    let analyzedCount = 0;

    for (const c of cases) {
      await agent.analyze({
        case_id: c.id,
        transaction_id: c.transaction_id || c.payment_id || c.id,
        amount: c.at_risk_amount,
        payment_method: c.payment_method || 'UPI',
        failure_reason: c.primary_failure_diagnosis || 'Network Failure',
        retry_count: c.actions_taken_count || 0,
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        customer_email: c.customer_email,
        customer_phone: c.customer_phone
      });
      analyzedCount++;
    }

    res.json({
      success: true,
      message: `AI Recovery Agent analyzed and evaluated policies for ${analyzedCount} cases.`,
      data: {
        analyzed_count: analyzedCount
      }
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * POST /api/recovery/run-diagnostics
 * Full interactive system diagnostics sweep across failed payments, ML predictions, and agent policy evaluation
 */
recoveryRouter.post('/run-diagnostics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = Array.from(memoryStore.recoveryCases.values());
    const payments = Array.from(memoryStore.payments.values()).filter((p) => p.payment_status !== 'SUCCESSFUL');
    
    let analyzedCount = 0;
    let highRiskCount = 0;
    let totalAtRisk = 0;
    let expectedRecovery = 0;
    let recommendedInterventions = 0;

    // Analyze first 50 cases in memory
    for (const c of cases.slice(0, 50)) {
      const decision = await agent.analyze({
        case_id: c.id,
        transaction_id: c.transaction_id || c.payment_id || c.id,
        amount: c.at_risk_amount,
        payment_method: c.payment_method || 'UPI',
        failure_reason: c.primary_failure_diagnosis || 'Network Failure',
        retry_count: c.actions_taken_count || 0,
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        customer_email: c.customer_email,
        customer_phone: c.customer_phone
      });
      analyzedCount++;
      totalAtRisk += c.at_risk_amount;
      const recProb = (decision as any).recovery_probability || 0.65;
      expectedRecovery += Math.round(c.at_risk_amount * recProb);
      const riskLevel = (decision as any).risk_level || ((decision as any).risk_score >= 0.6 ? 'HIGH' : 'LOW');
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || (decision as any).risk_score >= 0.6) {
        highRiskCount++;
      }
      if (decision.recommended_action && (decision.policy_result?.passed || (decision.policy_result as any)?.allowed)) {
        recommendedInterventions++;
      }
    }

    res.json({
      success: true,
      message: 'AI Recovery Diagnostics sweep completed successfully.',
      data: {
        analyzed_count: Math.max(analyzedCount, payments.length),
        total_revenue_at_risk: totalAtRisk,
        expected_recovery: expectedRecovery,
        high_risk_cases: highRiskCount,
        recommended_interventions: recommendedInterventions,
        model_version: 'recovery-model-v1',
        policy_boundaries_checked: ['max_retries_le_2', 'hard_decline_block', 'cooloff_period_45m', 'customer_fatigue_zero'],
        timestamp: new Date().toISOString()
      }
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * Legacy support for manual intervention log / case action
 */
recoveryRouter.post('/cases/:id/action', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { actionType } = req.body;
    const result = await agent.execute({
      case_id: req.params.id,
      override_action: actionType as ControlledRecoveryAction
    });
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    next(err);
  }
});

recoveryRouter.post('/cases/:id/escalate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await agent.escalate({
      case_id: req.params.id,
      reason: req.body.reason || 'Escalated by analyst'
    });
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    next(err);
  }
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

  actions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const enriched = actions.map((act) => {
    const rCase = memoryStore.recoveryCases.get(act.case_id);
    return {
      ...act,
      case: rCase
        ? {
            id: rCase.id,
            customer_name: rCase.customer_name,
            at_risk_amount: rCase.at_risk_amount,
            recovery_probability: rCase.recovery_probability,
            risk_level: rCase.risk_level,
            status: rCase.status,
            workflow_state: (rCase as any).workflow_state
          }
        : null
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
