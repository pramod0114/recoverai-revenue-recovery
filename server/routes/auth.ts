import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { memoryStore } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'recoverai_jwt_super_secret_signing_key_2026';

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required.', 400, 'VALIDATION_ERROR');
    }

    const user = memoryStore.users.get(email.toLowerCase().trim());
    if (!user || !user.is_active) {
      throw new AppError('Invalid email or credentials.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or credentials.', 401, 'INVALID_CREDENTIALS');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    user.last_login_at = new Date().toISOString();

    // Log audit event
    memoryStore.auditLogs.unshift({
      id: `aud_${Date.now()}_login`,
      actor_type: user.role === 'ADMIN' ? 'ADMIN_USER' : 'ANALYST_USER',
      actor_id: user.id,
      action_name: 'USER_LOGIN_SUCCESS',
      entity_type: 'USER',
      entity_id: user.id,
      previous_state: null,
      new_state: { email: user.email, role: user.role, timestamp: new Date().toISOString() },
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'RecoverAI Client',
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          lastLoginAt: user.last_login_at
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

authRouter.post('/logout', authenticate, (req: Request, res: Response) => {
  if (req.user) {
    memoryStore.auditLogs.unshift({
      id: `aud_${Date.now()}_logout`,
      actor_type: req.user.role === 'ADMIN' ? 'ADMIN_USER' : 'ANALYST_USER',
      actor_id: req.user.id,
      action_name: 'USER_LOGOUT',
      entity_type: 'USER',
      entity_id: req.user.id,
      previous_state: null,
      new_state: { timestamp: new Date().toISOString() },
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'RecoverAI Client',
      created_at: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});
