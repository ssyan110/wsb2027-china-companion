import { Router } from 'express';
import type { Pool } from 'pg';
import type { Request, Response } from 'express';
import {
  createNotificationService,
  notificationEmitter,
} from '../services/notification.service.js';
import type { NotificationRequest } from '@wsb/shared';

export function createNotificationRouter(db: Pool) {
  const router = Router();
  const notificationService = createNotificationService({ db });

  // POST /api/v1/admin/notifications — create and publish notification
  router.post('/', async (req: Request, res: Response) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const { title, body, target_type, target_id } = req.body as NotificationRequest;

      const result = await notificationService.publishNotification(
        { title, body, target_type, target_id },
        adminId,
      );

      if ('error' in result) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  return router;
}

// ─── SSE Router ──────────────────────────────────────────────

export function createNotificationStreamRouter(db: Pool) {
  const router = Router();

  // GET /api/v1/notifications/stream — SSE endpoint for real-time notifications
  router.get('/stream', (req: Request, res: Response) => {
    const travelerId = req.traveler_id;
    if (!travelerId) {
      res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();

    // Send initial keepalive
    res.write(':ok\n\n');

    // Listen for notifications targeted at this traveler
    const onNotification = (notification: unknown) => {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    };

    const eventName = `notification:${travelerId}`;
    notificationEmitter.on(eventName, onNotification);

    // Cleanup on client disconnect
    req.on('close', () => {
      notificationEmitter.off(eventName, onNotification);
    });
  });

  return router;
}
