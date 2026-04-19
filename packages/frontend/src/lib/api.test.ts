import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────

let mockToken: string | null = 'test-jwt-token';

vi.mock('../stores/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ session_token: mockToken }),
  },
}));

import { apiClient, computeDelay } from './api';

// ─── Helpers ─────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

/** Flush all pending timers and microtasks so retries resolve instantly. */
async function flushRetries() {
  for (let i = 0; i < 10; i++) {
    vi.advanceTimersByTime(15_000);
    await Promise.resolve();
  }
}

// ─── Tests ───────────────────────────────────────────────────

describe('apiClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockToken = 'test-jwt-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should set Authorization header from auth store', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    const p = apiClient('/api/v1/test');
    await flushRetries();
    await p;

    const [, init] = spy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('should set Content-Type to application/json', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    const p = apiClient('/api/v1/test');
    await flushRetries();
    await p;

    const [, init] = spy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should omit Authorization header when no token', async () => {
    mockToken = null;
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    const p = apiClient('/api/v1/test');
    await flushRetries();
    await p;

    const [, init] = spy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should return parsed JSON on success', async () => {
    const payload = { traveler_id: 't1', name: 'Alice' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(payload));

    const p = apiClient<{ traveler_id: string; name: string }>('/api/v1/test');
    await flushRetries();
    const result = await p;

    expect(result).toEqual(payload);
  });

  it('should forward custom init options', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    const p = apiClient('/api/v1/test', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    await flushRetries();
    await p;

    const [path, init] = spy.mock.calls[0];
    expect(path).toBe('/api/v1/test');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
  });

  // ── 4xx errors: throw immediately, no retry ──

  it('should throw immediately on 400 without retrying', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(null, 400, 'Bad Request'),
    );

    const p = apiClient('/api/v1/test');
    await flushRetries();

    await expect(p).rejects.toThrow('API 400: Bad Request');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should throw immediately on 401', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(null, 401, 'Unauthorized'),
    );

    const p = apiClient('/api/v1/test');
    await flushRetries();

    await expect(p).rejects.toThrow('API 401: Unauthorized');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should throw immediately on 403', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(null, 403, 'Forbidden'),
    );

    const p = apiClient('/api/v1/test');
    await flushRetries();

    await expect(p).rejects.toThrow('API 403: Forbidden');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should throw immediately on 404', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(null, 404, 'Not Found'),
    );

    const p = apiClient('/api/v1/test');
    await flushRetries();

    await expect(p).rejects.toThrow('API 404: Not Found');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // ── 5xx errors: retry up to 3 times ──

  it('should retry on 500 and succeed on second attempt', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(null, 500, 'Internal Server Error'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const p = apiClient('/api/v1/test');
    await flushRetries();
    const result = await p;

    expect(result).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should retry on 502 and succeed on third attempt', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(null, 502, 'Bad Gateway'))
      .mockResolvedValueOnce(jsonResponse(null, 503, 'Service Unavailable'))
      .mockResolvedValueOnce(jsonResponse({ recovered: true }));

    const p = apiClient('/api/v1/test');
    await flushRetries();
    const result = await p;

    expect(result).toEqual({ recovered: true });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should throw after exhausting all retries on 500', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(null, 500, 'Internal Server Error'),
    );

    const p = apiClient('/api/v1/test');
    await flushRetries();

    await expect(p).rejects.toThrow('API 500');
    // 1 initial + 3 retries = 4 total
    expect(spy).toHaveBeenCalledTimes(4);
  });

  // ── Network errors: retry ──

  it('should retry on network error and succeed', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const p = apiClient('/api/v1/test');
    await flushRetries();
    const result = await p;

    expect(result).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('should throw after exhausting retries on persistent network error', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );

    const p = apiClient('/api/v1/test');
    await flushRetries();

    await expect(p).rejects.toThrow('Failed to fetch');
    expect(spy).toHaveBeenCalledTimes(4);
  });
});

// ── computeDelay ──

describe('computeDelay', () => {
  it('should return base delay for attempt 0', () => {
    expect(computeDelay(0, 1000, 10000)).toBe(1000);
  });

  it('should double delay for each attempt', () => {
    expect(computeDelay(1, 1000, 10000)).toBe(2000);
    expect(computeDelay(2, 1000, 10000)).toBe(4000);
  });

  it('should clamp to max delay', () => {
    expect(computeDelay(5, 1000, 10000)).toBe(10000);
    expect(computeDelay(10, 1000, 10000)).toBe(10000);
  });
});
