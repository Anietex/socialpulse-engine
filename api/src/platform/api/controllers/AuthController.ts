/**
 * Auth Controller
 * Handles authentication HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../../application/services/AuthenticationService';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../validators/auth.validation';
import { logger } from '../../../config/logger';

/**
 * Auth Controller
 * Handles user authentication, registration, and token management
 */
export class AuthController {
  constructor(private readonly authService: AuthenticationService) {}

  /**
   * Register a new user
   * POST /auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: RegisterDto = req.body;

      const user = await this.authService.register(data);

      // Don't return password in response
      const publicUser = user.toPublic();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: publicUser,
      });
    } catch (error: any) {
      logger.error('Registration failed', { email: req.body.email, error });

      if (error.message === 'Email already registered') {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password }: LoginDto = req.body;

      const result = await this.authService.login(email, password);

      // Don't return password in response
      const publicUser = result.user.toPublic();

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: publicUser,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error: any) {
      logger.error('Login failed', { email: req.body.email, error });

      if (
        error.message === 'Invalid email or password' ||
        error.message === 'Account is suspended'
      ) {
        res.status(401).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenDto = req.body;

      const result = await this.authService.refreshAccessToken(refreshToken);

      // Don't return password in response
      const publicUser = result.user.toPublic();

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: publicUser,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error: any) {
      logger.error('Token refresh failed', { error });

      if (
        error.message === 'Invalid or expired refresh token' ||
        error.message === 'User not found' ||
        error.message === 'Account is suspended'
      ) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
        return;
      }

      next(error);
    }
  }

  /**
   * Get current user
   * GET /auth/me
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // User is already attached by authenticate middleware
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Get current user failed', { error });
      next(error);
    }
  }

  /**
   * Logout user (client-side token removal)
   * POST /auth/logout
   */
  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // JWT is stateless, so logout is handled client-side
      // In a real app with token blacklist, we'd add the token here

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout failed', { error });
      next(error);
    }
  }
}
