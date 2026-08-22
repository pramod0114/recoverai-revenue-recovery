import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { UserRole } from '../types/index.js';
import { memoryStore } from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'recoverai_jwt_super_secret_signing_key_2026';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || (req.headers['x-access-token'] as string);

  if (!authHeader) {
    return next(new AppError('Authentication required. Bearer token missing.', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Insufficient privileges. Required: ${allowedRoles.join(' or ')}.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}
