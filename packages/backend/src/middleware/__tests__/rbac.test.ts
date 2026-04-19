import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { rbacMiddleware } from '../rbac.js';
import type { RoleType } from '@wsb/shared';

function createMockReq(path: string, role?: RoleType): Request {
  return {
    path,
    role,
    traveler_id: role ? 'test-user' : undefined,
  } as unknown as Request;
}

function createMockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('rbacMiddleware', () => {
  // --- Auth endpoints: all roles allowed ---
  it('should allow any role to access /api/v1/auth/*', () => {
    const roles: RoleType[] = ['traveler', 'representative', 'staff', 'staff_desk', 'admin', 'super_admin'];
    for (const role of roles) {
      const req = createMockReq('/api/v1/auth/magic-link', role);
      const res = createMockRes();
      const next = vi.fn();
      rbacMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  // --- Traveler self-service endpoints ---
  it('should allow traveler to access /api/v1/travelers/me', () => {
    const req = createMockReq('/api/v1/travelers/me', 'traveler');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow representative to access /api/v1/travelers/me', () => {
    const req = createMockReq('/api/v1/travelers/me', 'representative');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny staff from accessing /api/v1/travelers/me', () => {
    const req = createMockReq('/api/v1/travelers/me', 'staff');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should deny admin from accessing /api/v1/travelers/me', () => {
    const req = createMockReq('/api/v1/travelers/me', 'admin');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // --- Family endpoint: representative only ---
  it('should allow representative to access /api/v1/travelers/me/family', () => {
    const req = createMockReq('/api/v1/travelers/me/family', 'representative');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny traveler from accessing /api/v1/travelers/me/family', () => {
    const req = createMockReq('/api/v1/travelers/me/family', 'traveler');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // --- Staff manifest and scans: staff only ---
  it('should allow staff to access /api/v1/staff/manifest', () => {
    const req = createMockReq('/api/v1/staff/manifest', 'staff');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow staff to access /api/v1/staff/scans/batch', () => {
    const req = createMockReq('/api/v1/staff/scans/batch', 'staff');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow staff to access /api/v1/staff/scan-modes', () => {
    const req = createMockReq('/api/v1/staff/scan-modes', 'staff');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny traveler from accessing /api/v1/staff/manifest', () => {
    const req = createMockReq('/api/v1/staff/manifest', 'traveler');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should deny admin from accessing /api/v1/staff/scans/batch', () => {
    const req = createMockReq('/api/v1/staff/scans/batch', 'admin');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // --- Staff rescue: staff_desk, admin, super_admin ---
  it('should allow staff_desk to access /api/v1/staff/rescue/search', () => {
    const req = createMockReq('/api/v1/staff/rescue/search', 'staff_desk');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow admin to access /api/v1/staff/rescue/search', () => {
    const req = createMockReq('/api/v1/staff/rescue/search', 'admin');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow super_admin to access /api/v1/staff/rescue/search', () => {
    const req = createMockReq('/api/v1/staff/rescue/search', 'super_admin');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny staff from accessing /api/v1/staff/rescue/search', () => {
    const req = createMockReq('/api/v1/staff/rescue/search', 'staff');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should deny traveler from accessing /api/v1/staff/rescue/search', () => {
    const req = createMockReq('/api/v1/staff/rescue/search', 'traveler');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // --- Admin endpoints: admin, super_admin ---
  it('should allow admin to access /api/v1/admin/travelers', () => {
    const req = createMockReq('/api/v1/admin/travelers', 'admin');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow super_admin to access /api/v1/admin/travelers', () => {
    const req = createMockReq('/api/v1/admin/travelers', 'super_admin');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny staff from accessing /api/v1/admin/travelers', () => {
    const req = createMockReq('/api/v1/admin/travelers', 'staff');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should deny traveler from accessing /api/v1/admin/audit-logs', () => {
    const req = createMockReq('/api/v1/admin/audit-logs', 'traveler');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // --- Notification stream: traveler, representative ---
  it('should allow traveler to access /api/v1/notifications/stream', () => {
    const req = createMockReq('/api/v1/notifications/stream', 'traveler');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should allow representative to access /api/v1/notifications/stream', () => {
    const req = createMockReq('/api/v1/notifications/stream', 'representative');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny staff from accessing /api/v1/notifications/stream', () => {
    const req = createMockReq('/api/v1/notifications/stream', 'staff');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // --- Unauthenticated requests pass through ---
  it('should pass through unauthenticated requests (no role)', () => {
    const req = createMockReq('/api/v1/travelers/me');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  // --- Unmatched paths pass through ---
  it('should pass through unmatched paths', () => {
    const req = createMockReq('/api/v1/health', 'traveler');
    const res = createMockRes();
    const next = vi.fn();
    rbacMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
