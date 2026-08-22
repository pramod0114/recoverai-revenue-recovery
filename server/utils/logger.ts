import crypto from 'crypto';

export interface StructuredLog {
  request_id?: string;
  event_id?: string;
  case_id?: string;
  user_id?: string;
  action_id?: string;
  timestamp: string;
  status: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'BLOCKED';
  service: string;
  message: string;
  metadata?: Record<string, any>;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'secret',
  'key_secret',
  'webhook_secret',
  'razorpay_key_secret',
  'jwt_secret',
  'token',
  'authorization',
  'cvv',
  'card_number',
  'pan'
]);

/**
 * Mask sensitive fields in objects and strings before logging
 */
export function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Mask potential JWT tokens (Bearer eyJ...)
    if (obj.startsWith('Bearer eyJ')) {
      return 'Bearer [MASKED_JWT_TOKEN]';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item));
  }

  if (typeof obj === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password')) {
        masked[key] = '********';
      } else if (lowerKey.includes('card') && typeof value === 'string' && value.length >= 12) {
        masked[key] = `**** **** **** ${value.slice(-4)}`;
      } else if (lowerKey === 'email' && typeof value === 'string' && value.includes('@')) {
        const [user, domain] = value.split('@');
        masked[key] = `${user.charAt(0)}***@${domain}`;
      } else if ((lowerKey === 'phone' || lowerKey === 'contact') && typeof value === 'string' && value.length > 6) {
        masked[key] = `${value.slice(0, 3)}****${value.slice(-3)}`;
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }

  return obj;
}

export class Logger {
  public static log(entry: Omit<StructuredLog, 'timestamp'>): void {
    const structured: StructuredLog = {
      timestamp: new Date().toISOString(),
      ...entry,
      metadata: entry.metadata ? maskSensitiveData(entry.metadata) : undefined
    };

    const prefix = `[${structured.timestamp}] [${structured.service}] [${structured.status}]`;
    const contextIds = [
      structured.request_id ? `req=${structured.request_id}` : '',
      structured.event_id ? `evt=${structured.event_id}` : '',
      structured.case_id ? `case=${structured.case_id}` : '',
      structured.user_id ? `user=${structured.user_id}` : ''
    ].filter(Boolean).join(' ');

    if (structured.status === 'ERROR') {
      console.error(`${prefix} ${contextIds} ${structured.message}`, structured.metadata || '');
    } else if (structured.status === 'WARN') {
      console.warn(`${prefix} ${contextIds} ${structured.message}`, structured.metadata || '');
    } else {
      console.log(`${prefix} ${contextIds} ${structured.message}`, structured.metadata || '');
    }
  }

  public static info(service: string, message: string, meta?: Record<string, any>): void {
    this.log({ service, status: 'INFO', message, metadata: meta });
  }

  public static warn(service: string, message: string, meta?: Record<string, any>): void {
    this.log({ service, status: 'WARN', message, metadata: meta });
  }

  public static error(service: string, message: string, meta?: Record<string, any>): void {
    this.log({ service, status: 'ERROR', message, metadata: meta });
  }
}
