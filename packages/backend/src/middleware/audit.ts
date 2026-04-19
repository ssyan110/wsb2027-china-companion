import type { Request, Response, NextFunction } from 'express';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method)) {
    next();
    return;
  }

  // Capture the original end to log after response
  const originalEnd = res.end;
  const startTime = Date.now();

  // Override res.end to capture the response
  res.end = function (this: Response, ...args: Parameters<Response['end']>): Response {
    const duration = Date.now() - startTime;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      actor_id: req.traveler_id ?? 'anonymous',
      actor_role: req.role ?? 'unknown',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
    };

    // Log audit entry asynchronously — don't block the response
    console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);

    return originalEnd.apply(this, args);
  } as typeof res.end;

  next();
}
