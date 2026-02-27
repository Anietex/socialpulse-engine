import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { AppError } from '../shared/utils/errors.js';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Internal Server Error';

  logger.error(`Error: ${message}`, {
    status,
    code,
    method: req.method,
    path: req.path,
    ip: req.ip,
    stack: err.stack,
  });

  res.status(status).json({
    success: false,
    error: {
      message,
      code,
      status,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      path: req.path,
    },
  });
};
