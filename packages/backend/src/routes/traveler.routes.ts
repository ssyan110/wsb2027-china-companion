import { Router } from 'express';
import type { Pool } from 'pg';
import { createTravelerService } from '../services/traveler.service.js';
import { createItineraryService } from '../services/itinerary.service.js';
import { createNotificationService } from '../services/notification.service.js';

export function createTravelerRouter(db: Pool) {
  const router = Router();
  const travelerService = createTravelerService({ db });
  const itineraryService = createItineraryService({ db });
  const notificationService = createNotificationService({ db });

  // GET /api/v1/travelers/me
  router.get('/me', async (req, res) => {
    try {
      const travelerId = req.traveler_id;
      if (!travelerId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const result = await travelerService.getProfile(travelerId);

      if ('error' in result) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/travelers/me/qr
  router.get('/me/qr', async (req, res) => {
    try {
      const travelerId = req.traveler_id;
      if (!travelerId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const result = await travelerService.getQrToken(travelerId);

      if ('error' in result) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/travelers/me/family
  router.get('/me/family', async (req, res) => {
    try {
      const travelerId = req.traveler_id;
      if (!travelerId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const result = await travelerService.getFamily(travelerId);

      if ('error' in result) {
        const status = result.error === 'forbidden' ? 403 : 404;
        res.status(status).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/travelers/me/itinerary
  router.get('/me/itinerary', async (req, res) => {
    try {
      const travelerId = req.traveler_id;
      if (!travelerId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const result = await itineraryService.getItinerary(travelerId);

      if ('error' in result) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/travelers/me/notifications
  router.get('/me/notifications', async (req, res) => {
    try {
      const travelerId = req.traveler_id;
      if (!travelerId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const result = await notificationService.getNotifications(travelerId);

      if ('error' in result) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // PATCH /api/v1/travelers/me/notifications/:id/read
  router.patch('/me/notifications/:id/read', async (req, res) => {
    try {
      const travelerId = req.traveler_id;
      if (!travelerId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const notificationId = req.params.id;
      const result = await notificationService.markAsRead(travelerId, notificationId);

      if ('error' in result) {
        res.status(404).json(result);
        return;
      }

      res.status(204).send();
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  return router;
}
