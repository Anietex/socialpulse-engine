/**
 * Platform API Error Handler Middleware
 * Handles errors from platform API controllers
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../config/logger';
import {
  PlatformNotFoundError,
  AuthenticationError,
  RateLimitError,
  ScrapingError,
  ActionExecutionError,
  PlatformConfigurationError,
  NormalizationError,
} from '../../core/errors/PlatformErrors';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: Date;
}

/**
 * Platform API error handler middleware
 */
export function platformErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error('Platform API Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // Default error response
  let response: ErrorResponse = {
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    statusCode: 500,
    timestamp: new Date(),
  };

  // Handle specific platform errors
  if (error instanceof PlatformNotFoundError) {
    response = {
      error: 'PlatformNotFound',
      message: error.message,
      statusCode: 404,
      timestamp: new Date(),
    };
  } else if (error instanceof AuthenticationError) {
    response = {
      error: 'AuthenticationError',
      message: error.message,
      statusCode: 401,
      details: { platformId: error.platformId },
      timestamp: new Date(),
    };
  } else if (error instanceof RateLimitError) {
    response = {
      error: 'RateLimitExceeded',
      message: error.message,
      statusCode: 429,
      details: {
        platformId: error.platformId,
        actionType: error.actionType,
        resetAt: error.resetAt,
      },
      timestamp: new Date(),
    };
  } else if (error instanceof ScrapingError) {
    response = {
      error: 'ScrapingError',
      message: error.message,
      statusCode: 500,
      details: { platformId: error.platformId },
      timestamp: new Date(),
    };
  } else if (error instanceof ActionExecutionError) {
    response = {
      error: 'ActionExecutionError',
      message: error.message,
      statusCode: 500,
      details: {
        platformId: error.platformId,
        actionType: error.actionType,
        contentId: error.contentId,
      },
      timestamp: new Date(),
    };
  } else if (error instanceof PlatformConfigurationError) {
    response = {
      error: 'PlatformConfigurationError',
      message: error.message,
      statusCode: 500,
      details: { platformId: error.platformId },
      timestamp: new Date(),
    };
  } else if (error instanceof NormalizationError) {
    response = {
      error: 'NormalizationError',
      message: error.message,
      statusCode: 500,
      details: {
        platformId: error.platformId,
        rawContentId: error.rawContentId,
      },
      timestamp: new Date(),
    };
  } else if (error.message.includes('Invalid ContentId format')) {
    // Handle value object validation errors
    response = {
      error: 'ValidationError',
      message: error.message,
      statusCode: 400,
      timestamp: new Date(),
    };
  } else if (error.message.includes('Invalid PlatformId')) {
    response = {
      error: 'ValidationError',
      message: error.message,
      statusCode: 400,
      timestamp: new Date(),
    };
  }

  // Send error response
  res.status(response.statusCode).json(response);
}

/**
 * Async handler wrapper to catch async errors
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
