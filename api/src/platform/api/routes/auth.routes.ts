/**
 * Auth API Routes
 * Defines REST endpoints for authentication
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../../../middleware/validation';
import { authenticate } from '../../../middleware/authenticate';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validation';

/**
 * Create auth routes
 */
export function createAuthRoutes(controller: AuthController): Router {
  const router = Router();

  /**
   * POST /auth/register
   * Register a new user
   */
  router.post('/register', validate(registerSchema), (req, res, next) =>
    controller.register(req, res, next)
  );

  /**
   * POST /auth/login
   * Login user
   */
  router.post('/login', validate(loginSchema), (req, res, next) =>
    controller.login(req, res, next)
  );

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  router.post('/refresh', validate(refreshTokenSchema), (req, res, next) =>
    controller.refresh(req, res, next)
  );

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  router.get('/me', authenticate, (req, res, next) => controller.me(req, res, next));

  /**
   * POST /auth/logout
   * Logout user (client-side token removal)
   */
  router.post('/logout', authenticate, (req, res, next) => controller.logout(req, res, next));

  return router;
}
