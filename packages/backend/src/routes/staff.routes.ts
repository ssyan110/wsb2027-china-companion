import { Router } from 'express';
import type { Pool } from 'pg';
import { createScanService } from '../services/scan.service.js';
import { createRescueService } from '../services/rescue.service.js';
import { createAuditService } from '../services/audit.service.js';
import type { EmailService } from '../services/email.service.js';

export function createStaffRouter(db: Pool, emailService?: EmailService) {
  const router = Router();
  const scanService = createScanService({ db });
  const auditService = createAuditService({ db });
  const rescueService = createRescueService({
    db,
    emailService: emailService ?? { sendMagicLink: async () => {} },
    auditService,
  });

  // GET /api/v1/staff/manifest?mode={scan_mode}
  router.get('/manifest', async (req, res) => {
    try {
      const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
      const result = await scanService.getManifest(mode);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/staff/manifest/delta?since_version={version}
  router.get('/manifest/delta', async (req, res) => {
    try {
      const sinceVersion = req.query.since_version;
      if (typeof sinceVersion !== 'string' || !sinceVersion) {
        res.status(400).json({
          error: 'bad_request',
          message: 'since_version query parameter is required',
        });
        return;
      }

      const result = await scanService.getDeltaManifest(sinceVersion);

      if ('error' in result) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/staff/scan-modes
  router.get('/scan-modes', async (_req, res) => {
    try {
      const result = await scanService.getScanModes();
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/staff/scans/batch
  router.post('/scans/batch', async (req, res) => {
    try {
      const staffId = req.traveler_id;
      if (!staffId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const body = req.body;
      if (!body || !Array.isArray(body.scans)) {
        res.status(400).json({ error: 'bad_request', message: 'Request body must contain a scans array' });
        return;
      }

      const result = await scanService.ingestScanBatch(staffId, body);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // ─── Rescue Routes ────────────────────────────────────────────

  // GET /api/v1/staff/rescue/search?q={query}&type={name|email}
  router.get('/rescue/search', async (req, res) => {
    try {
      const staffId = req.traveler_id;
      if (!staffId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const type = typeof req.query.type === 'string' ? req.query.type : '';

      if (type !== 'name' && type !== 'email') {
        res.status(400).json({
          error: 'bad_request',
          message: 'type query parameter must be "name" or "email"',
        });
        return;
      }

      const result = await rescueService.search(q, type, staffId);

      if ('error' in result) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/staff/rescue/resend-magic-link
  router.post('/rescue/resend-magic-link', async (req, res) => {
    try {
      const staffId = req.traveler_id;
      if (!staffId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const { traveler_id } = req.body ?? {};
      if (!traveler_id || typeof traveler_id !== 'string') {
        res.status(400).json({
          error: 'bad_request',
          message: 'traveler_id is required',
        });
        return;
      }

      const result = await rescueService.resendMagicLink(traveler_id, staffId);

      if ('error' in result) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/staff/rescue/traveler/:id
  router.get('/rescue/traveler/:id', async (req, res) => {
    try {
      const staffId = req.traveler_id;
      if (!staffId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const travelerId = req.params.id;
      const result = await rescueService.getTravelerProfile(travelerId, staffId);

      if ('error' in result) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  return router;
}
