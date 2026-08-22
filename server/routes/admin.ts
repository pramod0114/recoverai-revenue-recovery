import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { memoryStore } from '../db/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { PolicyEngine } from '../agent/PolicyEngine.js';

export const adminRouter = Router();

// Protect ALL admin routes with authenticate + requireRole(['ADMIN'])
adminRouter.use(authenticate);
adminRouter.use(requireRole(['ADMIN']));

/**
 * GET /api/admin/users
 * Returns list of registered users
 */
adminRouter.get('/users', (_req: Request, res: Response) => {
  const users = Array.from(memoryStore.users.values()).map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    title: u.title || (u.role === 'ADMIN' ? 'Chief Risk Officer' : 'Payment Recovery Analyst'),
    isActive: u.is_active,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at
  }));

  res.json({
    success: true,
    data: users
  });
});

/**
 * POST /api/admin/users
 * Create a new user
 */
adminRouter.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, role, title } = req.body;

    if (!email || !password || !fullName || !role) {
      throw new AppError('Email, password, fullName, and role are required.', 400, 'VALIDATION_ERROR');
    }

    if (role !== 'ADMIN' && role !== 'ANALYST') {
      throw new AppError('Role must be either ADMIN or ANALYST.', 400, 'INVALID_ROLE');
    }

    const cleanEmail = email.toLowerCase().trim();
    if (memoryStore.users.has(cleanEmail)) {
      throw new AppError('User with this email already exists.', 409, 'USER_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      password_hash: passwordHash,
      full_name: fullName.trim(),
      title: title?.trim() || (role === 'ADMIN' ? 'Administrator' : 'Recovery Specialist'),
      role,
      is_active: true,
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.users.set(cleanEmail, newUser);

    // Audit log
    memoryStore.auditLogs.unshift({
      id: `aud_${Date.now()}_user_create`,
      actor_type: 'ADMIN_USER',
      actor_id: req.user!.id,
      actor_name: req.user!.fullName,
      actor_role: req.user!.role,
      action_name: 'USER_CREATED',
      entity_type: 'USER',
      entity_id: newUser.id,
      previous_state: null,
      new_state: { email: newUser.email, role: newUser.role, fullName: newUser.full_name },
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'RecoverAI Admin Console',
      created_at: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        title: newUser.title,
        isActive: newUser.is_active,
        createdAt: newUser.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user role, active status, or details
 */
adminRouter.put('/users/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role, isActive, fullName, title } = req.body;

    let targetUser = Array.from(memoryStore.users.values()).find((u) => u.id === id);
    if (!targetUser) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const prevState = {
      role: targetUser.role,
      is_active: targetUser.is_active,
      full_name: targetUser.full_name,
      title: targetUser.title
    };

    if (role && (role === 'ADMIN' || role === 'ANALYST')) {
      targetUser.role = role;
    }
    if (typeof isActive === 'boolean') {
      targetUser.is_active = isActive;
    }
    if (fullName) {
      targetUser.full_name = fullName.trim();
    }
    if (title) {
      targetUser.title = title.trim();
    }
    targetUser.updated_at = new Date().toISOString();

    // Audit log
    memoryStore.auditLogs.unshift({
      id: `aud_${Date.now()}_user_update`,
      actor_type: 'ADMIN_USER',
      actor_id: req.user!.id,
      actor_name: req.user!.fullName,
      actor_role: req.user!.role,
      action_name: 'USER_UPDATED',
      entity_type: 'USER',
      entity_id: targetUser.id,
      previous_state: prevState,
      new_state: {
        role: targetUser.role,
        is_active: targetUser.is_active,
        full_name: targetUser.full_name,
        title: targetUser.title
      },
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'RecoverAI Admin Console',
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.full_name,
        role: targetUser.role,
        title: targetUser.title,
        isActive: targetUser.is_active,
        updatedAt: targetUser.updated_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/policies
 * Returns recovery safety policy boundaries
 */
adminRouter.get('/policies', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: memoryStore.policyConfig
  });
});

/**
 * PUT /api/admin/policies
 * Update recovery policies
 */
adminRouter.put('/policies', (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      max_retries,
      auto_retry_threshold,
      min_amount_for_auto_action,
      max_amount_for_auto_retry,
      cooldown_seconds,
      stop_after_success,
      stop_after_max_retries,
      require_idempotency
    } = req.body;

    const prevState = { ...memoryStore.policyConfig };

    if (typeof max_retries === 'number' && max_retries >= 1 && max_retries <= 10) {
      memoryStore.policyConfig.max_retries = max_retries;
    }
    if (typeof auto_retry_threshold === 'number' && auto_retry_threshold >= 0 && auto_retry_threshold <= 1) {
      memoryStore.policyConfig.auto_retry_threshold = auto_retry_threshold;
    }
    if (typeof min_amount_for_auto_action === 'number') {
      memoryStore.policyConfig.min_amount_for_auto_action = min_amount_for_auto_action;
    }
    if (typeof max_amount_for_auto_retry === 'number') {
      memoryStore.policyConfig.max_amount_for_auto_retry = max_amount_for_auto_retry;
    }
    if (typeof cooldown_seconds === 'number') {
      memoryStore.policyConfig.cooldown_seconds = cooldown_seconds;
    }
    if (typeof stop_after_success === 'boolean') {
      memoryStore.policyConfig.stop_after_success = stop_after_success;
    }
    if (typeof stop_after_max_retries === 'boolean') {
      memoryStore.policyConfig.stop_after_max_retries = stop_after_max_retries;
    }
    if (typeof require_idempotency === 'boolean') {
      memoryStore.policyConfig.require_idempotency = require_idempotency;
    }

    // Sync with singleton PolicyEngine
    PolicyEngine.getInstance().updateConfig({
      max_retries: memoryStore.policyConfig.max_retries,
      auto_retry_threshold: memoryStore.policyConfig.auto_retry_threshold,
      max_amount_for_auto_retry: memoryStore.policyConfig.max_amount_for_auto_retry,
      stop_after_success: memoryStore.policyConfig.stop_after_success,
      cooldown_seconds: memoryStore.policyConfig.cooldown_seconds
    });

    // Log audit event
    memoryStore.auditLogs.unshift({
      id: `aud_${Date.now()}_policy_update`,
      actor_type: 'ADMIN_USER',
      actor_id: req.user!.id,
      actor_name: req.user!.fullName,
      actor_role: 'ADMIN',
      action_name: 'POLICY_CONFIGURATION_UPDATE',
      entity_type: 'POLICY_CONFIG',
      entity_id: 'global_policy_rules',
      reason: 'Admin adjusted recovery policy thresholds and safety boundaries',
      previous_state: prevState,
      new_state: memoryStore.policyConfig,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'RecoverAI Admin Console',
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Recovery policies successfully updated and synchronized.',
      data: memoryStore.policyConfig
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/configuration
 * Returns system configuration
 */
adminRouter.get('/configuration', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: memoryStore.systemConfig
  });
});

/**
 * PUT /api/admin/configuration
 * Update system configuration
 */
adminRouter.put('/configuration', (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      gatewayMode,
      mlModelVersion,
      autonomousRecoveryEnabled,
      riskScoreThreshold,
      dunningChannel,
      webhookUrl,
      rateLimitPerMin
    } = req.body;

    const prevState = { ...memoryStore.systemConfig };

    if (gatewayMode) memoryStore.systemConfig.gatewayMode = gatewayMode;
    if (mlModelVersion) memoryStore.systemConfig.mlModelVersion = mlModelVersion;
    if (typeof autonomousRecoveryEnabled === 'boolean') {
      memoryStore.systemConfig.autonomousRecoveryEnabled = autonomousRecoveryEnabled;
    }
    if (typeof riskScoreThreshold === 'number') {
      memoryStore.systemConfig.riskScoreThreshold = riskScoreThreshold;
    }
    if (dunningChannel) memoryStore.systemConfig.dunningChannel = dunningChannel;
    if (webhookUrl) memoryStore.systemConfig.webhookUrl = webhookUrl;
    if (typeof rateLimitPerMin === 'number') {
      memoryStore.systemConfig.rateLimitPerMin = rateLimitPerMin;
    }

    memoryStore.systemConfig.updatedAt = new Date().toISOString();
    memoryStore.systemConfig.updatedBy = req.user!.fullName;

    // Log audit event
    memoryStore.auditLogs.unshift({
      id: `aud_${Date.now()}_sys_cfg`,
      actor_type: 'ADMIN_USER',
      actor_id: req.user!.id,
      actor_name: req.user!.fullName,
      actor_role: 'ADMIN',
      action_name: 'SYSTEM_CONFIGURATION_UPDATE',
      entity_type: 'SYSTEM_CONFIG',
      entity_id: 'global_system_config',
      reason: 'Admin updated core engine parameters and webhook endpoints',
      previous_state: prevState,
      new_state: memoryStore.systemConfig,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'RecoverAI Admin Console',
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'System configuration updated successfully.',
      data: memoryStore.systemConfig
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/overrides
 * Returns list of overrides performed in the system
 */
adminRouter.get('/overrides', (_req: Request, res: Response) => {
  const overrides = memoryStore.auditLogs.filter((l) => l.action_name === 'POLICY_OVERRIDE');
  res.json({
    success: true,
    data: overrides
  });
});
