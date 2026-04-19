import type { Request, Response, NextFunction } from 'express';
import type { RoleType } from '@wsb/shared';

interface RbacRule {
  pattern: RegExp;
  allowedRoles: RoleType[];
}

/**
 * RBAC matrix from the design document:
 * - /auth/*                    → all roles (handled by public paths in auth middleware)
 * - /travelers/me/family       → representative only
 * - /travelers/me/*            → traveler, representative
 * - /staff/manifest            → staff only
 * - /staff/scans/*             → staff only
 * - /staff/rescue/*            → staff_desk, admin, super_admin
 * - /admin/*                   → admin, super_admin
 * - /notifications/stream      → traveler, representative
 *
 * Order matters: more specific rules must come before general ones.
 */
const RBAC_RULES: RbacRule[] = [
  // Auth endpoints are public — no RBAC check needed
  { pattern: /^\/api\/v1\/auth\//, allowedRoles: ['traveler', 'minor', 'representative', 'staff', 'staff_desk', 'admin', 'super_admin'] },

  // Family endpoint — representative only
  { pattern: /^\/api\/v1\/travelers\/me\/family/, allowedRoles: ['representative'] },

  // Traveler self-service endpoints
  { pattern: /^\/api\/v1\/travelers\/me/, allowedRoles: ['traveler', 'representative'] },

  // Notification SSE stream
  { pattern: /^\/api\/v1\/notifications\/stream/, allowedRoles: ['traveler', 'representative'] },

  // Staff manifest and scans
  { pattern: /^\/api\/v1\/staff\/manifest/, allowedRoles: ['staff'] },
  { pattern: /^\/api\/v1\/staff\/scans/, allowedRoles: ['staff'] },
  { pattern: /^\/api\/v1\/staff\/scan-modes/, allowedRoles: ['staff'] },

  // Staff rescue desk
  { pattern: /^\/api\/v1\/staff\/rescue/, allowedRoles: ['staff_desk', 'admin', 'super_admin'] },

  // Admin endpoints
  { pattern: /^\/api\/v1\/admin/, allowedRoles: ['admin', 'super_admin'] },
];

export function rbacMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip RBAC for unauthenticated requests (auth middleware handles public paths)
  if (!req.role) {
    next();
    return;
  }

  const matchedRule = RBAC_RULES.find(rule => rule.pattern.test(req.path));

  // If no rule matches, allow through (e.g., health check)
  if (!matchedRule) {
    next();
    return;
  }

  if (matchedRule.allowedRoles.includes(req.role)) {
    next();
    return;
  }

  res.status(403).json({
    error: 'forbidden',
    message: 'You do not have permission to access this resource',
  });
}
