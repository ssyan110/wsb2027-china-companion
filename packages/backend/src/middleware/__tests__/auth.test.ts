import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth.js';

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/v1/travelers/me',
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('authMiddleware', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalEnv;
    }
  });

  it('should allow public paths without auth', () => {
    const req = createMockReq({ path: '/api/v1/auth/magic-link' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow health check path', () => {
    const req = createMockReq({ path: '/api/v1/health' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow magic-link verify with query params', () => {
    const req = createMockReq({ path: '/api/v1/auth/magic-link/verify?token=abc' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should reject requests without Authorization header', () => {
    const req = createMockReq({ path: '/api/v1/travelers/me', headers: {} });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'unauthorized' })
    );
  });

  it('should reject requests with non-Bearer auth', () => {
    const req = createMockReq({
      path: '/api/v1/travelers/me',
      headers: { authorization: 'Basic abc123' },
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should extract traveler_id and role from valid JWT', () => {
    const token = jwt.sign(
      { sub: 'traveler-123', role: 'traveler' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
    const req = createMockReq({
      path: '/api/v1/travelers/me',
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.traveler_id).toBe('traveler-123');
    expect(req.role).toBe('traveler');
  });

  it('should reject expired tokens', () => {
    const token = jwt.sign(
      { sub: 'traveler-123', role: 'traveler' },
      TEST_SECRET,
      { expiresIn: '-1s' }
    );
    const req = createMockReq({
      path: '/api/v1/travelers/me',
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'token_expired' })
    );
  });

  it('should reject tokens signed with wrong secret', () => {
    const token = jwt.sign(
      { sub: 'traveler-123', role: 'traveler' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    const req = createMockReq({
      path: '/api/v1/travelers/me',
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'invalid_token' })
    );
  });

  it('should return 500 when JWT_SECRET is not configured', () => {
    delete process.env.JWT_SECRET;

    const token = jwt.sign({ sub: 'x', role: 'traveler' }, 'any', { expiresIn: '1h' });
    const req = createMockReq({
      path: '/api/v1/travelers/me',
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'server_error' })
    );
  });
});
