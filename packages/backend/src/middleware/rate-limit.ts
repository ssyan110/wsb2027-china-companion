import type { Request, Response, NextFunction } from 'express';
import type Redis from 'ioredis';

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

export function createRateLimiter(redis: Redis, opts: RateLimitOptions) {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${options.keyPrefix}${options.keyGenerator(req)}`;
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
