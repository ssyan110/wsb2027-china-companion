import { Router } from 'express';
import type { Pool } from 'pg';
import type { RoleType, MasterListQueryParams } from '@wsb/shared';
import { createQrService } from '../services/qr.service.js';
import { createAuditService } from '../services/audit.service.js';
import { createDispatchService } from '../services/dispatch.service.js';
import { createAdminService } from '../services/admin.service.js';
import type { CreateTravelerInput, UpdateTravelerInput } from '../services/admin.service.js';
import { createAdminEntitiesService } from '../services/admin-entities.service.js';
import type {
  CreateGroupInput, UpdateGroupInput,
  CreateEventInput, UpdateEventInput,
  CreateBusInput, UpdateBusInput,
  CreateHotelInput, UpdateHotelInput,
} from '../services/admin-entities.service.js';
import { createFamilyService } from '../services/family.service.js';
import { createMasterListService } from '../services/master-list.service.js';
import { validateSortColumn, ALLOWED_SORT_COLUMNS } from '../utils/query-validators.js';

export function createAdminRouter(db: Pool) {
  const router = Router();
  const qrService = createQrService({ db });
  const auditService = createAuditService({ db });
  const dispatchService = createDispatchService({ db });
  const adminService = createAdminService({ db });
  const entitiesService = createAdminEntitiesService({ db });
  const familyService = createFamilyService({ db });
  const masterListService = createMasterListService({ db, auditService });

  // ── Master List ──────────────────────────────────────────────

  // GET /api/v1/admin/master-list
  router.get('/master-list', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      // Parse query params
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const page_size = req.query.page_size ? parseInt(req.query.page_size as string, 10) : undefined;

      // Validate page/page_size are positive integers when provided
      if (req.query.page !== undefined && (isNaN(page!) || page! < 1)) {
        res.status(400).json({ error: 'validation_error', message: 'page and page_size must be positive integers' });
        return;
      }
      if (req.query.page_size !== undefined && (isNaN(page_size!) || page_size! < 1)) {
        res.status(400).json({ error: 'validation_error', message: 'page and page_size must be positive integers' });
        return;
      }

      // Validate sort_by
      const sort_by = typeof req.query.sort_by === 'string' ? req.query.sort_by : undefined;
      if (sort_by && !validateSortColumn(sort_by)) {
        res.status(400).json({
          error: 'validation_error',
          message: `Invalid sort column. Allowed: ${ALLOWED_SORT_COLUMNS.join(', ')}`,
        });
        return;
      }

      const params = {
        page,
        page_size,
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        role_type: typeof req.query.role_type === 'string' ? req.query.role_type as RoleType : undefined,
        access_status: typeof req.query.access_status === 'string' ? req.query.access_status as MasterListQueryParams['access_status'] : undefined,
        group_id: typeof req.query.group_id === 'string' ? req.query.group_id : undefined,
        hotel_id: typeof req.query.hotel_id === 'string' ? req.query.hotel_id : undefined,
        sort_by,
        sort_order: typeof req.query.sort_order === 'string' ? req.query.sort_order as 'asc' | 'desc' : undefined,
        unmask: req.query.unmask === 'true',
        // Extended filter parameters (Requirement 5.6, 14.5)
        invitee_type: typeof req.query.invitee_type === 'string' ? req.query.invitee_type as 'invitee' | 'guest' : undefined,
        pax_type: typeof req.query.pax_type === 'string' ? req.query.pax_type as 'adult' | 'child' | 'infant' : undefined,
        checkin_status: typeof req.query.checkin_status === 'string' ? req.query.checkin_status as 'pending' | 'checked_in' | 'no_show' : undefined,
        vip_tag: typeof req.query.vip_tag === 'string' ? req.query.vip_tag : undefined,
        agent_code: typeof req.query.agent_code === 'string' ? req.query.agent_code : undefined,
      };

      const actor = { id: adminId, role: req.role as RoleType };
      const result = await masterListService.query(params, actor);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/admin/master-list/export
  router.get('/master-list/export', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      // Parse query params (same as master-list route)
      const params: MasterListQueryParams = {
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        role_type: typeof req.query.role_type === 'string' ? req.query.role_type as RoleType : undefined,
        access_status: typeof req.query.access_status === 'string' ? req.query.access_status as MasterListQueryParams['access_status'] : undefined,
        group_id: typeof req.query.group_id === 'string' ? req.query.group_id : undefined,
        hotel_id: typeof req.query.hotel_id === 'string' ? req.query.hotel_id : undefined,
        sort_by: typeof req.query.sort_by === 'string' ? req.query.sort_by : undefined,
        sort_order: typeof req.query.sort_order === 'string' ? req.query.sort_order as 'asc' | 'desc' : undefined,
        unmask: req.query.unmask === 'true',
      };

      // Validate sort_by if provided
      if (params.sort_by && !validateSortColumn(params.sort_by)) {
        res.status(400).json({
          error: 'validation_error',
          message: `Invalid sort column. Allowed: ${ALLOWED_SORT_COLUMNS.join(', ')}`,
        });
        return;
      }

      const actor = { id: adminId, role: req.role as RoleType };

      // Set CSV response headers with current UTC date
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(now.getUTCDate()).padStart(2, '0');
      const filename = `master-list-${yyyy}-${mm}-${dd}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Stream CSV chunks from the async generator
      const csvGenerator = masterListService.exportCsv(params, actor);
      for await (const chunk of csvGenerator) {
        res.write(chunk);
      }
      res.end();
    } catch {
      // If headers haven't been sent yet, return JSON error
      if (!res.headersSent) {
        res.status(500).json({ error: 'server_error', message: 'Internal server error' });
      } else {
        res.end();
      }
    }
  });

  // ── Traveler CRUD ────────────────────────────────────────────

  // GET /api/v1/admin/travelers
  router.get('/travelers', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }
      const travelers = await adminService.listTravelers();
      res.json({ travelers });
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/admin/travelers/:id
  router.get('/travelers/:id', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }
      const result = await adminService.getTravelerById(req.params.id);
      if ('error' in result) {
        res.status(404).json(result);
        return;
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/admin/travelers
  router.post('/travelers', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }
      const input = req.body as CreateTravelerInput;
      if (!input.full_name || !input.email || !input.role_type) {
        res.status(400).json({ error: 'validation_error', message: 'full_name, email, and role_type are required' });
        return;
      }
      const result = await adminService.createTraveler(input);
      if ('error' in result) {
        res.status(400).json(result);
        return;
      }
      res.status(201).json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // PATCH /api/v1/admin/travelers/:id
  router.patch('/travelers/:id', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }
      const input = req.body as UpdateTravelerInput;

      // Validate enum fields against allowed values (Requirement 3.2)
      const ALLOWED_GENDER = ['male', 'female', 'other', 'undisclosed'];
      const ALLOWED_INVITEE_TYPE = ['invitee', 'guest'];
      const ALLOWED_PAX_TYPE = ['adult', 'child', 'infant'];
      const ALLOWED_CHECKIN_STATUS = ['pending', 'checked_in', 'no_show'];

      if (input.gender !== undefined && !ALLOWED_GENDER.includes(input.gender)) {
        res.status(400).json({
          error: 'validation_error',
          message: `Invalid gender. Allowed: ${ALLOWED_GENDER.join(', ')}`,
        });
        return;
      }
      if (input.invitee_type !== undefined && !ALLOWED_INVITEE_TYPE.includes(input.invitee_type)) {
        res.status(400).json({
          error: 'validation_error',
          message: `Invalid invitee_type. Allowed: ${ALLOWED_INVITEE_TYPE.join(', ')}`,
        });
        return;
      }
      if (input.pax_type !== undefined && !ALLOWED_PAX_TYPE.includes(input.pax_type)) {
        res.status(400).json({
          error: 'validation_error',
          message: `Invalid pax_type. Allowed: ${ALLOWED_PAX_TYPE.join(', ')}`,
        });
        return;
      }
      if (input.checkin_status !== undefined && !ALLOWED_CHECKIN_STATUS.includes(input.checkin_status)) {
        res.status(400).json({
          error: 'validation_error',
          message: `Invalid checkin_status. Allowed: ${ALLOWED_CHECKIN_STATUS.join(', ')}`,
        });
        return;
      }

      // Pass actor context for audit logging (Requirement 12.4)
      const actor = { id: adminId, role: req.role as string };
      const result = await adminService.updateTraveler(req.params.id, input, actor);
      if ('error' in result) {
        res.status(404).json(result);
        return;
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // DELETE /api/v1/admin/travelers/:id
  router.delete('/travelers/:id', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }
      const result = await adminService.deactivateTraveler(req.params.id);
      if ('error' in result) {
        res.status(404).json(result);
        return;
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // ── CSV Import ─────────────────────────────────────────────

  // POST /api/v1/admin/import/travelers
  router.post('/import/travelers', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      // Accept CSV as raw text body or as a `csv` field in JSON
      let csvContent: string;
      if (typeof req.body === 'string') {
        csvContent = req.body;
      } else if (req.body?.csv && typeof req.body.csv === 'string') {
        csvContent = req.body.csv;
      } else {
        res.status(400).json({ error: 'validation_error', message: 'CSV content is required (send as text body or { csv: "..." })' });
        return;
      }

      const result = await adminService.importTravelersCsv(csvContent);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/admin/qr/reissue
  router.post('/qr/reissue', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const { traveler_id } = req.body as { traveler_id?: string };
      if (!traveler_id || typeof traveler_id !== 'string') {
        res.status(400).json({ error: 'validation_error', message: 'traveler_id is required' });
        return;
      }

      const adminRole = req.role ?? 'admin';
      const result = await qrService.reissueToken(traveler_id, adminId, adminRole);

      if ('error' in result) {
        const status = result.error === 'not_found' || result.error === 'no_active_token' ? 404 : 400;
        res.status(status).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // GET /api/v1/admin/audit-logs
  router.get('/audit-logs', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const filters = {
        start_date: typeof req.query.start_date === 'string' ? req.query.start_date : undefined,
        end_date: typeof req.query.end_date === 'string' ? req.query.end_date : undefined,
        action_type: typeof req.query.action_type === 'string' ? req.query.action_type : undefined,
        actor_id: typeof req.query.actor_id === 'string' ? req.query.actor_id : undefined,
        traveler_id: typeof req.query.traveler_id === 'string' ? req.query.traveler_id : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        page_size: req.query.page_size ? parseInt(req.query.page_size as string, 10) : undefined,
      };

      const result = await auditService.getAuditLogs(filters);

      if ('error' in result) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/admin/dispatch/auto
  router.post('/dispatch/auto', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const { event_id } = req.body as { event_id?: string };
      if (!event_id || typeof event_id !== 'string') {
        res.status(400).json({ error: 'validation_error', message: 'event_id is required' });
        return;
      }

      const result = await dispatchService.autoDispatch(event_id);

      if ('error' in result) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // POST /api/v1/admin/dispatch/commit
  router.post('/dispatch/commit', async (req, res) => {
    try {
      const adminId = req.traveler_id;
      if (!adminId) {
        res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
        return;
      }

      const { assignments, event_id } = req.body as {
        assignments?: Array<{ traveler_id: string; bus_id: string }>;
        event_id?: string;
      };

      if (!assignments || !Array.isArray(assignments)) {
        res.status(400).json({ error: 'validation_error', message: 'assignments array is required' });
        return;
      }

      if (!event_id || typeof event_id !== 'string') {
        res.status(400).json({ error: 'validation_error', message: 'event_id is required' });
        return;
      }

      const result = await dispatchService.commitDispatch(assignments, event_id);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'server_error', message: 'Internal server error' });
    }
  });

  // ── Groups CRUD ───────────────────────────────────────────

  router.get('/groups', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const groups = await entitiesService.listGroups();
      res.json({ groups });
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.post('/groups', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const input = req.body as CreateGroupInput;
      if (!input.name) { res.status(400).json({ error: 'validation_error', message: 'name is required' }); return; }
      const result = await entitiesService.createGroup(input);
      res.status(201).json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.patch('/groups/:id', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const result = await entitiesService.updateGroup(req.params.id, req.body as UpdateGroupInput);
      if ('error' in result) { res.status(404).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.delete('/groups/:id', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const result = await entitiesService.deleteGroup(req.params.id);
      if ('error' in result) { res.status(404).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // ── Events CRUD ──────────────────────────────────────────

  router.get('/events', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const events = await entitiesService.listEvents();
      res.json({ events });
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.post('/events', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const input = req.body as CreateEventInput;
      if (!input.name || !input.event_type || !input.date) {
        res.status(400).json({ error: 'validation_error', message: 'name, event_type, and date are required' }); return;
      }
      const result = await entitiesService.createEvent(input);
      if ('error' in result) { res.status(400).json(result); return; }
      res.status(201).json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.patch('/events/:id', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const result = await entitiesService.updateEvent(req.params.id, req.body as UpdateEventInput);
      if ('error' in result) {
        const status = result.error === 'not_found' ? 404 : 400;
        res.status(status).json(result); return;
      }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.delete('/events/:id', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const result = await entitiesService.deleteEvent(req.params.id);
      if ('error' in result) { res.status(404).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // ── Buses CRUD ───────────────────────────────────────────

  router.get('/buses', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const buses = await entitiesService.listBuses();
      res.json({ buses });
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.post('/buses', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const input = req.body as CreateBusInput;
      if (!input.bus_number || !input.capacity) {
        res.status(400).json({ error: 'validation_error', message: 'bus_number and capacity are required' }); return;
      }
      const result = await entitiesService.createBus(input);
      if ('error' in result) { res.status(400).json(result); return; }
      res.status(201).json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.patch('/buses/:id', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const result = await entitiesService.updateBus(req.params.id, req.body as UpdateBusInput);
      if ('error' in result) { res.status(404).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // ── Hotels CRUD ──────────────────────────────────────────

  router.get('/hotels', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const hotels = await entitiesService.listHotels();
      res.json({ hotels });
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.post('/hotels', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const input = req.body as CreateHotelInput;
      if (!input.name) { res.status(400).json({ error: 'validation_error', message: 'name is required' }); return; }
      const result = await entitiesService.createHotel(input);
      res.status(201).json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.patch('/hotels/:id', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const result = await entitiesService.updateHotel(req.params.id, req.body as UpdateHotelInput);
      if ('error' in result) { res.status(404).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.delete('/hotels/:id', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const result = await entitiesService.deleteHotel(req.params.id);
      if ('error' in result) { res.status(404).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // ── Assignment endpoints ─────────────────────────────────

  router.post('/travelers/:id/assign-group', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const { group_id } = req.body as { group_id?: string };
      if (!group_id) { res.status(400).json({ error: 'validation_error', message: 'group_id is required' }); return; }
      const result = await entitiesService.assignGroup({ traveler_id: req.params.id, group_id });
      if ('error' in result) { res.status(400).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.post('/travelers/:id/assign-hotel', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const { hotel_id } = req.body as { hotel_id?: string };
      if (!hotel_id) { res.status(400).json({ error: 'validation_error', message: 'hotel_id is required' }); return; }
      const result = await entitiesService.assignHotel({ traveler_id: req.params.id, hotel_id });
      if ('error' in result) { res.status(400).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  router.post('/travelers/:id/assign-bus', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const { bus_id, event_id } = req.body as { bus_id?: string; event_id?: string };
      if (!bus_id || !event_id) { res.status(400).json({ error: 'validation_error', message: 'bus_id and event_id are required' }); return; }
      const result = await entitiesService.assignBus({ traveler_id: req.params.id, bus_id, event_id });
      if ('error' in result) { res.status(400).json(result); return; }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // ── Flight CSV Import ────────────────────────────────────

  router.post('/import/flights', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      let csvContent: string;
      if (typeof req.body === 'string') {
        csvContent = req.body;
      } else if (req.body?.csv && typeof req.body.csv === 'string') {
        csvContent = req.body.csv;
      } else {
        res.status(400).json({ error: 'validation_error', message: 'CSV content is required' }); return;
      }
      const result = await entitiesService.importFlightsCsv(csvContent);
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // ── Family Linking ─────────────────────────────────────────

  // POST /api/v1/admin/families
  router.post('/families', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const { representative_id } = req.body as { representative_id?: string };
      if (!representative_id) {
        res.status(400).json({ error: 'validation_error', message: 'representative_id is required' }); return;
      }
      const result = await familyService.createFamily(representative_id);
      if ('error' in result) {
        const status = result.error === 'not_found' ? 404 : 400;
        res.status(status).json(result); return;
      }
      res.status(201).json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // POST /api/v1/admin/families/:id/members
  router.post('/families/:id/members', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const { traveler_id } = req.body as { traveler_id?: string };
      if (!traveler_id) {
        res.status(400).json({ error: 'validation_error', message: 'traveler_id is required' }); return;
      }
      const result = await familyService.linkMember(req.params.id, traveler_id);
      if ('error' in result) {
        const status = result.error === 'not_found' ? 404 : 400;
        res.status(status).json(result); return;
      }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // POST /api/v1/admin/families/:id/guardian
  router.post('/families/:id/guardian', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const { minor_id, guardian_id } = req.body as { minor_id?: string; guardian_id?: string };
      if (!minor_id || !guardian_id) {
        res.status(400).json({ error: 'validation_error', message: 'minor_id and guardian_id are required' }); return;
      }
      const result = await familyService.assignGuardian(minor_id, guardian_id);
      if ('error' in result) {
        const status = result.error === 'not_found' ? 404 : 400;
        res.status(status).json(result); return;
      }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  // DELETE /api/v1/admin/families/:id/members/:travelerId
  router.delete('/families/:id/members/:travelerId', async (req, res) => {
    try {
      if (!req.traveler_id) { res.status(401).json({ error: 'unauthorized', message: 'Authentication required' }); return; }
      const result = await familyService.unlinkMember(req.params.id, req.params.travelerId);
      if ('error' in result) {
        const status = result.error === 'not_found' ? 404 : 400;
        res.status(status).json(result); return;
      }
      res.json(result);
    } catch { res.status(500).json({ error: 'server_error', message: 'Internal server error' }); }
  });

  return router;
}
