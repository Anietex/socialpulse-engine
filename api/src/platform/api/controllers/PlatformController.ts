/**
 * Platform API Controller
 * Exposes PlatformService through REST endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { PlatformService } from '../../application/services/PlatformService';
import {
  InitBrowserSessionRequestDto,
  AuthenticatePlatformRequestDto,
  SaveAuthStateRequestDto,
  LoadAuthStateRequestDto,
  RestartSessionRequestDto,
  PlatformHealthResponseDto,
  AllPlatformsHealthResponseDto,
  AllPlatformsCapabilitiesResponseDto,
  PlatformStatisticsResponseDto,
  RegisteredPlatformsResponseDto,
  AuthenticationStatusResponseDto,
  OperationSuccessResponseDto,
} from '../dto';

/**
 * PlatformController class
 */
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /**
   * Get all registered platforms
   * GET /api/platform/platforms
   */
  async getRegisteredPlatforms(
    _req: Request,
    res: Response<RegisteredPlatformsResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const platforms = this.platformService.getRegisteredPlatforms();

      const response: RegisteredPlatformsResponseDto = {
        platforms,
        count: platforms.length,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check platform health for all platforms
   * GET /api/platform/platforms/health
   */
  async checkPlatformHealth(
    _req: Request,
    res: Response<AllPlatformsHealthResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const healthMap = await this.platformService.checkPlatformHealth();

      // Convert Map to object
      const platforms: Record<string, PlatformHealthResponseDto> = {};
      let ready = 0;
      let authenticated = 0;
      let errors = 0;

      for (const [platformId, health] of healthMap) {
        platforms[platformId] = {
          platformId: health.platformId,
          isReady: health.isReady,
          authenticated: health.authenticated,
          lastChecked: health.lastChecked,
          error: health.error,
        };

        if (health.isReady) ready++;
        if (health.authenticated) authenticated++;
        if (health.error) errors++;
      }

      const response: AllPlatformsHealthResponseDto = {
        platforms,
        summary: {
          total: healthMap.size,
          ready,
          authenticated,
          errors,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all platform capabilities
   * GET /api/platform/platforms/capabilities
   */
  async getAllPlatformCapabilities(
    _req: Request,
    res: Response<AllPlatformsCapabilitiesResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const capabilities = this.platformService.getAllPlatformCapabilities();

      const response: AllPlatformsCapabilitiesResponseDto = {
        platforms: capabilities.map((cap) => ({
          platformId: cap.platformId,
          displayName: cap.displayName,
          scraping: cap.scraping,
          supportedActions: cap.supportedActions,
          rateLimits: cap.rateLimits,
          mediaSupport: cap.mediaSupport,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get platform statistics
   * GET /api/platform/platforms/statistics
   */
  async getPlatformStatistics(
    _req: Request,
    res: Response<PlatformStatisticsResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = this.platformService.getPlatformStatistics();

      const response: PlatformStatisticsResponseDto = {
        total: stats.total,
        registered: stats.registered,
        activeBrowserSessions: stats.activeBrowserSessions,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initialize browser session for a platform
   * POST /api/platform/platforms/:platformId/browser/init
   */
  async initializeBrowserSession(
    req: Request<{ platformId: string }, {}, InitBrowserSessionRequestDto>,
    res: Response<OperationSuccessResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.params;
      const { config } = req.body;

      await this.platformService.initializeBrowserSession(platformId, config);

      res.status(200).json({
        success: true,
        message: `Browser session initialized for ${platformId}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close browser session for a platform
   * POST /api/platform/platforms/:platformId/browser/close
   */
  async closeBrowserSession(
    req: Request<{ platformId: string }>,
    res: Response<OperationSuccessResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.params;

      await this.platformService.closeBrowserSession(platformId);

      res.status(200).json({
        success: true,
        message: `Browser session closed for ${platformId}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close all browser sessions
   * POST /api/platform/platforms/browser/close-all
   */
  async closeAllBrowserSessions(
    _req: Request,
    res: Response<OperationSuccessResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      await this.platformService.closeAllBrowserSessions();

      res.status(200).json({
        success: true,
        message: 'All browser sessions closed',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restart browser session
   * POST /api/platform/platforms/:platformId/browser/restart
   */
  async restartBrowserSession(
    req: Request<{ platformId: string }, {}, RestartSessionRequestDto>,
    res: Response<OperationSuccessResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.params;
      const { preserveAuth = true } = req.body;

      await this.platformService.restartBrowserSession(platformId, preserveAuth);

      res.status(200).json({
        success: true,
        message: `Browser session restarted for ${platformId}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Authenticate platform
   * POST /api/platform/platforms/:platformId/auth/authenticate
   */
  async authenticatePlatform(
    req: Request<{ platformId: string }, {}, AuthenticatePlatformRequestDto>,
    res: Response<AuthenticationStatusResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.params;
      const { credentials } = req.body;

      const authenticated = await this.platformService.authenticatePlatform(
        platformId,
        credentials
      );

      res.status(200).json({
        platformId,
        authenticated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check authentication status
   * GET /api/platform/platforms/:platformId/auth/status
   */
  async checkAuthenticationStatus(
    req: Request<{ platformId: string }>,
    res: Response<AuthenticationStatusResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.params;

      const authenticated = await this.platformService.isPlatformAuthenticated(platformId);

      res.status(200).json({
        platformId,
        authenticated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout from platform
   * POST /api/platform/platforms/:platformId/auth/logout
   */
  async logoutPlatform(
    req: Request<{ platformId: string }>,
    res: Response<OperationSuccessResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.params;

      await this.platformService.logoutPlatform(platformId);

      res.status(200).json({
        success: true,
        message: `Logged out from ${platformId}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Save authentication state
   * POST /api/platform/platforms/:platformId/auth/save
   */
  async saveAuthenticationState(
    req: Request<{ platformId: string }, {}, SaveAuthStateRequestDto>,
    res: Response<OperationSuccessResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.params;
      const { path } = req.body;

      await this.platformService.saveAuthenticationState(platformId, path);

      res.status(200).json({
        success: true,
        message: `Authentication state saved for ${platformId}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Load authentication state
   * POST /api/platform/platforms/:platformId/auth/load
   */
  async loadAuthenticationState(
    req: Request<{ platformId: string }, {}, LoadAuthStateRequestDto>,
    res: Response<OperationSuccessResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.params;
      const { path } = req.body;

      await this.platformService.loadAuthenticationState(platformId, path);

      res.status(200).json({
        success: true,
        message: `Authentication state loaded for ${platformId}`,
      });
    } catch (error) {
      next(error);
    }
  }
}
