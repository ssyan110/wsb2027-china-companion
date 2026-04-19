import { useAuthStore } from '../stores/auth.store';

/** Configuration for the retry logic */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,   // 1 second
  maxDelay: 10000,    // 10 seconds
} as const;

/** Computes exponential backoff delay clamped to maxDelay. */
export function computeDelay(attempt: number, base: number, max: number): number {
  return Math.min(base * 2 ** attempt, max);
}

/** Returns true when the response status warrants a retry (5xx). */
function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

/** A small helper so tests can await a delay without real timers. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Authenticated API client with exponential-backoff retry.
 *
 * - Reads `session_token` from the auth Zustand store.
 * - Sets `Authorization: Bearer {token}` on every request.
 * - Sets `Content-Type: application/json`.
 * - Retries up to 3 times on network errors and 5xx responses.
 * - Throws immediately on 4xx (non-retryable) errors.
 */
export async function apiClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = useAuthStore.getState().session_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestInit: RequestInit = { ...init, headers };

  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const res = await fetch(path, requestInit);

      // Non-retryable client errors — throw immediately
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`API ${res.status}: ${res.statusText}`);
      }

      // Retryable server errors
      if (isRetryableStatus(res.status)) {
        lastError = new Error(`API ${res.status}: ${res.statusText}`);
        if (attempt < RETRY_CONFIG.maxRetries) {
          await delay(computeDelay(attempt, RETRY_CONFIG.baseDelay, RETRY_CONFIG.maxDelay));
          continue;
        }
        throw lastError;
      }

      // Success
      return res.json() as Promise<T>;
    } catch (err) {
      // If we already threw a non-retryable 4xx, re-throw immediately
      if (err instanceof Error && err.message.startsWith('API 4')) {
        throw err;
      }

      lastError = err;

      // Network error or retryable server error — retry if attempts remain
      if (attempt < RETRY_CONFIG.maxRetries) {
        await delay(computeDelay(attempt, RETRY_CONFIG.baseDelay, RETRY_CONFIG.maxDelay));
        continue;
      }
    }
  }

  // All retries exhausted
  throw lastError;
}
