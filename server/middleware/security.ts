import { Request, Response, NextFunction } from 'express';

/**
 * Production Security Hardening Headers Middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent Clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent Cross-Site Scripting (XSS)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * In-Memory Token Bucket Rate Limiter
 * Enforces per-IP and per-token rate limits to prevent brute-force & denial of service
 */
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();

export function createRateLimiter(options: { maxRequests: number; windowMs: number; message?: string }) {
  const { maxRequests, windowMs, message } = options;
  const refillRate = maxRequests / (windowMs / 1000); // tokens per second

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();

    let bucket = rateLimitMap.get(key);
    if (!bucket) {
      bucket = { tokens: maxRequests, lastRefill: now };
      rateLimitMap.set(key, bucket);
    } else {
      // Refill tokens based on elapsed time
      const elapsedSeconds = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(maxRequests, bucket.tokens + elapsedSeconds * refillRate);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));
      next();
    } else {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message || 'Too many requests. Please slow down and try again shortly.'
        }
      });
    }
  };
}

/**
 * Webhook Raw Body Capture Middleware
 * Captures exact raw Buffer/String for cryptographic HMAC-SHA256 signature verification
 */
export function rawBodySaver(req: any, res: Response, buf: Buffer, encoding: string) {
  if (buf && buf.length) {
    req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
  }
}
