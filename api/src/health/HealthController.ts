/**
 * Health Controller
 * Handles health check endpoints for monitoring and Kubernetes probes
 */

import { Request, Response } from 'express';
import { config } from '../config/env';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { logger } from '../config/logger';

/**
 * Redis client for health checks
 */
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
});

// Handle Redis client errors gracefully
redisClient.on('error', (err) => {
  logger.debug('Redis health check client error', { error: err.message });
});

/**
 * Health Response
 */
interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version?: string;
  services?: {
    database?: { status: string; latency?: number };
    redis?: { status: string; latency?: number };
    queues?: { status: string };
  };
}

/**
 * Readiness Response
 */
interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
  };
}

/**
 * Liveness Response
 */
interface LivenessResponse {
  status: 'alive';
  timestamp: string;
}

/**
 * Get comprehensive health status
 * GET /health
 */
export const getHealth = async (_req: Request, res: Response<HealthResponse>): Promise<void> => {
  const startTime = Date.now();

  try {
    // Check MongoDB
    const dbStatus = await checkDatabase();

    // Check Redis
    const redisStatus = await checkRedis();

    // Overall status
    const allHealthy = dbStatus.status === 'connected' && redisStatus.status === 'connected';
    const status = allHealthy ? 'ok' : 'degraded';

    const healthResponse: HealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
      version: process.env.npm_package_version,
      services: {
        database: dbStatus,
        redis: redisStatus,
        queues: { status: redisStatus.status === 'connected' ? 'ok' : 'degraded' },
      },
    };

    const statusCode = status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthResponse);

    const duration = Date.now() - startTime;
    logger.debug(`Health check completed in ${duration}ms`, { status });
  } catch (error) {
    logger.error('Health check failed', { error });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
    });
  }
};

/**
 * Get readiness status (Kubernetes readiness probe)
 * Returns 200 if the service is ready to accept traffic
 * GET /readiness
 */
export const getReadiness = async (
  _req: Request,
  res: Response<ReadinessResponse>
): Promise<void> => {
  try {
    // Check if critical services are ready
    const dbReady = mongoose.connection.readyState === 1; // 1 = connected
    const redisReady = redisClient.status === 'ready';

    const ready = dbReady && redisReady;

    const readinessResponse: ReadinessResponse = {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbReady,
        redis: redisReady,
      },
    };

    const statusCode = ready ? 200 : 503;
    res.status(statusCode).json(readinessResponse);
  } catch (error) {
    logger.error('Readiness check failed', { error });

    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        redis: false,
      },
    });
  }
};

/**
 * Get liveness status (Kubernetes liveness probe)
 * Returns 200 if the service is alive (even if degraded)
 * GET /liveness
 */
export const getLiveness = (_req: Request, res: Response<LivenessResponse>): void => {
  // Simple liveness check - process is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Check MongoDB connection
 */
async function checkDatabase(): Promise<{ status: string; latency?: number }> {
  try {
    const startTime = Date.now();
    const state = mongoose.connection.readyState;

    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const status = stateMap[state as keyof typeof stateMap] || 'unknown';

    if (state === 1 && mongoose.connection.db) {
      // Ping the database to check latency
      await mongoose.connection.db.admin().ping();
      const latency = Date.now() - startTime;
      return { status, latency };
    }

    return { status };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return { status: 'error' };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<{ status: string; latency?: number }> {
  try {
    const startTime = Date.now();
    const status = redisClient.status;

    if (status === 'ready') {
      // Ping Redis to check latency
      await redisClient.ping();
      const latency = Date.now() - startTime;
      return { status: 'connected', latency };
    }

    return { status };
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return { status: 'error' };
  }
}
