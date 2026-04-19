import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { sanitizeMiddleware } from '../sanitize.js';

function createMockReq(body: unknown): Partial<Request> {
  return { body };
}

describe('sanitizeMiddleware', () => {
  const res = {} as Response;
  const next: NextFunction = vi.fn();

  it('escapes HTML characters in string body values', () => {
    const req = createMockReq({ name: '<script>alert("xss")</script>' }) as Request;
    sanitizeMiddleware(req, res, next);
    expect(req.body.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    expect(next).toHaveBeenCalled();
  });

  it('recursively sanitizes nested objects', () => {
    const req = createMockReq({ user: { bio: '<b>bold</b>' } }) as Request;
    sanitizeMiddleware(req, res, next);
    expect(req.body.user.bio).toBe('&lt;b&gt;bold&lt;&#x2F;b&gt;');
  });

  it('sanitizes arrays of strings', () => {
    const req = createMockReq({ tags: ['<a>', 'safe'] }) as Request;
    sanitizeMiddleware(req, res, next);
    expect(req.body.tags).toEqual(['&lt;a&gt;', 'safe']);
  });

  it('leaves non-string values unchanged', () => {
    const req = createMockReq({ count: 42, active: true, data: null }) as Request;
    sanitizeMiddleware(req, res, next);
    expect(req.body).toEqual({ count: 42, active: true, data: null });
  });

  it('handles empty body gracefully', () => {
    const req = createMockReq(undefined) as Request;
    sanitizeMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
