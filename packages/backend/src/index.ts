import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { sanitizeMiddleware } from './middleware/sanitize.js';
import { authMiddleware } from './middleware/auth.js';
import { rbacMiddleware } from './middleware/rbac.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createTravelerRouter } from './routes/traveler.routes.js';
import { createStaffRouter } from './routes/staff.routes.js';
import { createAdminRouter } from './routes/admin.routes.js';
import { createNotificationRouter, createNotificationStreamRouter } from './routes/notification.routes.js';

const app = express();
const PORT = process.env.PORT ?? 3000;
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

// Set JWT_SECRET for auth middleware
process.env.JWT_SECRET = JWT_SECRET;

// Database pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/wsb',
  min: 5,
  max: 20,
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(sanitizeMiddleware);

// Health check (public)
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Dev auto-login (bypasses magic link for development) ────
app.get('/api/v1/dev/login/:travelerId', async (req, res) => {
  try {
    const { travelerId } = req.params;
    const result = await pool.query(
      'SELECT traveler_id, role_type, family_id FROM travelers WHERE traveler_id = $1',
      [travelerId],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'not_found', message: 'Traveler not found' });
      return;
    }
    const row = result.rows[0];
    const token = jwt.sign(
      { sub: row.traveler_id, role: row.role_type, ...(row.family_id ? { family_id: row.family_id } : {}) },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    res.json({ session_token: token, traveler_id: row.traveler_id, role_type: row.role_type });
  } catch (err) {
    console.error('Dev login error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// List demo users (public, dev only)
app.get('/api/v1/dev/users', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT traveler_id, full_name_raw, email_primary, role_type, access_status FROM travelers ORDER BY full_name_raw',
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Dev users error:', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Auth routes (public — mounted without Redis, rate limiting disabled)
app.use('/api/v1/auth', createAuthRouter(pool, null));

// Serve frontend static files in production (BEFORE auth middleware)
const __dirname2 = dirname(fileURLToPath(import.meta.url));
const frontendDist = join(__dirname2, '..', '..', 'frontend', 'dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Simple CSRF protection: reject non-same-origin POST/PATCH/DELETE that aren't JSON
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const host = req.headers.host;
    // Allow if no origin (same-origin requests) or origin matches host
    if (origin && !origin.includes(host ?? '')) {
      // Also allow if Content-Type is application/json (not form submission)
      const ct = req.headers['content-type'] ?? '';
      if (!ct.includes('application/json')) {
        res.status(403).json({ error: 'forbidden', message: 'CSRF check failed' });
        return;
      }
    }
  }
  next();
});

// Protected API routes — auth middleware only applies to /api/* paths
app.use('/api/v1/travelers', authMiddleware, rbacMiddleware, createTravelerRouter(pool));
app.use('/api/v1/notifications', authMiddleware, rbacMiddleware, createNotificationStreamRouter(pool));
app.use('/api/v1/admin', authMiddleware, rbacMiddleware, createAdminRouter(pool));
// app.use('/api/v1/staff', authMiddleware, rbacMiddleware, createStaffRouter(pool)); // needs emailService wired
app.use('/api/v1/admin/notifications', authMiddleware, rbacMiddleware, createNotificationRouter(pool));

// SPA fallback: serve index.html for any non-API route (AFTER API routes)
if (existsSync(frontendDist)) {
  app.get('*', (_req, res) => {
    res.sendFile(join(frontendDist, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`WSB 2027 backend listening on port ${PORT}`);
    console.log(`Database: ${process.env.DATABASE_URL ?? 'postgresql://localhost:5432/wsb'}`);
    console.log(`\nDemo login URLs:`);
    console.log(`  Sarah (representative): http://localhost:${PORT}/api/v1/dev/login/f0000001-0000-0000-0000-000000000001`);
    console.log(`  James (traveler):       http://localhost:${PORT}/api/v1/dev/login/f0000004-0000-0000-0000-000000000004`);
    console.log(`  Admin:                  http://localhost:${PORT}/api/v1/dev/login/f0000010-0000-0000-0000-000000000010`);
  });
}

export { app };
