import type { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Redis = any;

export interface RateLimitOptions {
  windowMs: number;       // sliding window size in milliseconds
  maxRequests: number;    // max requests per window
  keyPrefix?: string;     // Redis key prefix
  keyGenerator?: (req: Request) => string;
}

const DEFAULT_OPTIONS: Required<RateLimitOptions> = {
  windowMs: 60_000,
  maxRequests: 100,
  keyPrefix: 'rl:',
  keyGenerator: (req: Request) => req.ip ?? 'unknown',
};

// In-memory fallback when Redis is not available
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(redis: Redis, opts: RateLimitOptions) {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${options.keyPrefix}${options.keyGenerator(req)}`;

    // Use in-memory rate limiting when Redis is not available
    if (!redis) {
      const now = Date.now();
      const entry = memoryStore.get(key) ?? { count: 0, resetAt: now + options.windowMs };
      if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + options.windowMs;
      }
      entry.count++;
      memoryStore.set(key, entry);

      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - entry.count));

      if (entry.count > options.maxRequests) {
        res.status(429).json({ error: 'rate_limited', message: 'Too many requests' });
        return;
      }
      next();
      return;
    }

    const now = Date.now();
    const windowStart = now - options.windowMs;

    try {
      const pipeline = redis.pipeline();
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      // Add current request
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
      // Count requests in window
      pipeline.zcard(key);
      // Set TTL
      pipeline.pexpire(key, options.windowMs);

      const results = await pipeline.exec();
      const requestCount = results?.[2]?.[1] as number;

      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - requestCount));

      if (requestCount > options.maxRequests) {
        res.status(429).json({ error: 'rate_limit_exceeded', message: 'Too many requests' });
        return;
      }

      next();
    } catch {
      // If Redis is down, allow the request through
      next();
    }
  };
}
