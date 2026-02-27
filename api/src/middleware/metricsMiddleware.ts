import { Request, Response, NextFunction } from 'express';
import { metrics } from '../observability/metrics.js';

/**
 * Express middleware that records request latency metrics.
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000; // ms
    const route = req.route?.path || req.originalUrl || 'unknown';

    metrics.observeHttpRequest(req.method, route, res.statusCode, duration);
  });

  next();
};
