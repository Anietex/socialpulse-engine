/**
 * Health Routes
 * Provides health check endpoints for monitoring and Kubernetes probes
 */

import { Router } from 'express';
import { getHealth, getReadiness, getLiveness } from './HealthController';

const router = Router();

/**
 * GET /health
 * Comprehensive health check with service status
 */
router.get('/health', getHealth);

/**
 * GET /readiness
 * Kubernetes readiness probe - checks if service is ready to accept traffic
 */
router.get('/readiness', getReadiness);

/**
 * GET /liveness
 * Kubernetes liveness probe - checks if service is alive
 */
router.get('/liveness', getLiveness);

export default router;
