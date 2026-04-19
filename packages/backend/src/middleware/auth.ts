import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { RoleType } from '@wsb/shared';

export interface JwtPayload {
  sub: string;
  role: RoleType;
  family_id?: string;
  iat: number;
  exp: number;
}

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/v1/health',
  '/api/v1/auth/magic-link',
  '/api/v1/auth/magic-link/verify',
  '/api/v1/auth/booking-lookup',
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '?'));
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (isPublicPath(req.path)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'server_error', message: 'JWT secret not configured' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.traveler_id = payload.sub;
    req.role = payload.role;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'token_expired', message: 'Session token has expired' });
    } else {
      res.status(401).json({ error: 'invalid_token', message: 'Invalid session token' });
    }
  }
}
