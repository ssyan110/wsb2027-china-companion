import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
      user_agent: req.get('user-agent'),
      traveler_id: req.traveler_id,
    };
    console.log(JSON.stringify(log));
  });

  next();
}
