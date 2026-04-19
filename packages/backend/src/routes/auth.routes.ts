import { Router } from 'express';
import type Redis from 'ioredis';
import type { Pool } from 'pg';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { createAuthService } from '../services/auth.service.js';
import { emailService } from '../services/email.service.js';

export function createAuthRouter(db: Pool, redis: Redis) {
  const router = Router();
  const authService = createAuthService({ db, emailService, redis });

  const magicLinkRateLimit = createRateLimiter(redis, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    keyPrefix: 'rl:magic:',
    keyGenerator: (req) => {
      const email = (req.body as { email?: string })?.email?.trim().toLowerCase() ?? 'unknown';
      return email;
    },
  });

  // POST /api/v1/auth/magic-link
  router.post('/magic-link', magicLinkRateLimit, async (req, res) => {
    try {
      const { email } = req.body as { email?: string };

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ error: 'validation_error', message: 'Valid email is required' });
        return;
      }

      const result = await authService.requestMagicLink(email);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/auth/magic-link/verify
  router.get('/magic-link/verify', async (req, res) => {
    try {
      const token = req.query.token as string | undefined;

      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'validation_error', message: 'Token is required' });
        return;
      }

      const result = await authService.verifyMagicLink(token);

      if ('error' in result) {
        res.status(401).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/auth/booking-lookup
  router.post('/booking-lookup', async (req, res) => {
    try {
      const { booking_id, last_name } = req.body as { booking_id?: string; last_name?: string };

      if (!booking_id || typeof booking_id !== 'string' || !last_name || typeof last_name !== 'string') {
        res.status(400).json({ error: 'validation_error', message: 'booking_id and last_name are required' });
        return;
      }

      const clientIp = req.ip ?? 'unknown';
      const result = await authService.bookingLookup(booking_id, last_name, clientIp);

      if ('error' in result) {
        res.status(401).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/auth/refresh
  router.post('/refresh', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid authorization header' });
        return;
      }

      const token = authHeader.slice(7);
      const result = authService.refreshSession(token);

      if ('error' in result) {
        res.status(401).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/auth/logout
  router.post('/logout', (_req, res) => {
    res.status(204).send();
  });

  return router;
}
