import { PlatformRegistry, IPlatformAdapter } from '../../infrastructure/registry/PlatformRegistry';
import { BrowserProvider } from '../../infrastructure/browser/BrowserProvider';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { ActionType } from '../../core/types/ActionType';

/**
 * Platform health status
 */
export interface PlatformHealth {
  platformId: string;
  isReady: boolean;
  authenticated: boolean;
  lastChecked: Date;
  error?: string;
}

/**
 * Platform capabilities summary
 */
export interface PlatformCapabilities {
  platformId: string;
  displayName: string;
  scraping: boolean;
  supportedActions: ActionType[];
  rateLimits: Record<string, string>;
  mediaSupport: string[];
}

/**
 * Platform Service
 * Application service for coordinating multi-platform operations
 *
 * Responsibilities:
 * - Platform registration and initialization
 * - Health checking across platforms
 * - Platform discovery and capability queries
 * - Centralized platform management
 * - Browser session lifecycle
 *
 * Benefits:
 * - Single point of control for all platforms
 * - Health monitoring
 * - Easy to add new platforms
 * - Graceful handling of platform failures
 */
export class PlatformService {
  constructor(
    private readonly registry: PlatformRegistry,
    private readonly browserProvider: BrowserProvider
  ) {}

  /**
   * Register a platform adapter
   */
  registerPlatform(platformId: string, adapter: IPlatformAdapter): void {
    this.registry.register(platformId, adapter);
  }

  /**
   * Get a registered platform adapter
   */
  getPlatform(platformId: string | PlatformId): IPlatformAdapter {
    return this.registry.get(platformId);
  }

  /**
   * Try to get a platform adapter (returns null if not found)
   */
  tryGetPlatform(platformId: string | PlatformId): IPlatformAdapter | null {
    return this.registry.tryGet(platformId);
  }

  /**
   * Check if platform is registered
   */
  hasPlatform(platformId: string | PlatformId): boolean {
    return this.registry.has(platformId);
  }

  /**
   * Get all registered platform IDs
   */
  getRegisteredPlatforms(): string[] {
    return this.registry.getRegisteredPlatforms();
  }

  /**
   * Get all platform adapters
   */
  getAllPlatforms(): IPlatformAdapter[] {
    return this.registry.getAll();
  }

  /**
   * Check health status of all platforms
   */
  async checkPlatformHealth(): Promise<Map<string, PlatformHealth>> {
    const healthMap = new Map<string, PlatformHealth>();
    const platformIds = this.registry.getRegisteredPlatforms();

    const promises = platformIds.map(async (platformId) => {
      try {
        const adapter = this.registry.get(platformId);
        const isReady = await adapter.isReady();
        const authenticated = await adapter.authenticator.isAuthenticated();

        healthMap.set(platformId, {
          platformId,
          isReady,
          authenticated,
          lastChecked: new Date(),
        });
      } catch (error) {
        healthMap.set(platformId, {
          platformId,
          isReady: false,
          authenticated: false,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.all(promises);

    return healthMap;
  }

  /**
   * Get only healthy (ready) platforms
   */
  async getHealthyPlatforms(): Promise<IPlatformAdapter[]> {
    const platformIds = await this.registry.getReadyPlatforms();
    return platformIds.map((id) => this.registry.get(id));
  }

  /**
   * Get platforms supporting a specific action
   */
  getPlatformsSupportingAction(actionType: ActionType): IPlatformAdapter[] {
    const supportingIds = this.registry.getPlatformsSupportingAction(actionType);
    return supportingIds.map((id) => this.registry.get(id));
  }

  /**
   * Get comprehensive capabilities for all platforms
   */
  getAllPlatformCapabilities(): PlatformCapabilities[] {
    const adapters = this.registry.getAll();

    return adapters.map((adapter) => {
      const capabilities = adapter.getCapabilities();
      const supportedActions = adapter.actionExecutor
        .getSupportedActions()
        .map((strategy) => strategy.actionType);

      return {
        platformId: adapter.getPlatformId(),
        displayName: adapter.getDisplayName(),
        scraping: capabilities.scraping || false,
        supportedActions: supportedActions as ActionType[],
        rateLimits: capabilities.rateLimits || {},
        mediaSupport: capabilities.mediaSupport || [],
      };
    });
  }

  /**
   * Initialize browser session for a platform
   */
  async initializeBrowserSession(platformId: string, config?: any): Promise<void> {
    if (this.browserProvider.hasSession(platformId)) {
      return; // Already initialized
    }

    await this.browserProvider.createSession(platformId, config);
  }

  /**
   * Close browser session for a platform
   */
  async closeBrowserSession(platformId: string): Promise<void> {
    await this.browserProvider.closeSession(platformId);
  }

  /**
   * Close all browser sessions
   */
  async closeAllBrowserSessions(): Promise<void> {
    await this.browserProvider.closeAll();
  }

  /**
   * Save authentication state for a platform
   */
  async saveAuthenticationState(platformId: string, path: string): Promise<void> {
    await this.browserProvider.saveSessionState(platformId, path);
  }

  /**
   * Load authentication state for a platform
   */
  async loadAuthenticationState(platformId: string, path: string): Promise<void> {
    await this.browserProvider.loadSessionState(platformId, path);
  }

  /**
   * Restart browser session with optional state preservation
   */
  async restartBrowserSession(platformId: string, preserveAuth: boolean = true): Promise<void> {
    await this.browserProvider.restartSession(platformId, preserveAuth);
  }

  /**
   * Get active browser session count
   */
  getActiveBrowserSessionCount(): number {
    return this.browserProvider.getActiveSessionCount();
  }

  /**
   * Get active browser session platform IDs
   */
  getActiveBrowserSessions(): string[] {
    return this.browserProvider.getActivePlatformIds();
  }

  /**
   * Authenticate with a platform
   */
  async authenticatePlatform(
    platformId: string,
    credentials: Record<string, any>
  ): Promise<boolean> {
    const adapter = this.registry.get(platformId);

    try {
      await adapter.authenticator.authenticate(credentials);
      return await adapter.authenticator.isAuthenticated();
    } catch (error) {
      console.error(`Authentication failed for ${platformId}:`, error);
      return false;
    }
  }

  /**
   * Check if platform is authenticated
   */
  async isPlatformAuthenticated(platformId: string): Promise<boolean> {
    const adapter = this.tryGetPlatform(platformId);
    if (!adapter) {
      return false;
    }

    try {
      return await adapter.authenticator.isAuthenticated();
    } catch (error) {
      return false;
    }
  }

  /**
   * Logout from a platform
   */
  async logoutPlatform(platformId: string): Promise<void> {
    const adapter = this.registry.get(platformId);
    await adapter.authenticator.logout();
  }

  /**
   * Get platform statistics
   */
  getPlatformStatistics(): {
    total: number;
    registered: string[];
    activeBrowserSessions: number;
  } {
    return {
      total: this.registry.getCount(),
      registered: this.registry.getRegisteredPlatforms(),
      activeBrowserSessions: this.browserProvider.getActiveSessionCount(),
    };
  }

  /**
   * Unregister a platform (cleanup)
   */
  async unregisterPlatform(platformId: string): Promise<void> {
    // Close browser session if exists
    if (this.browserProvider.hasSession(platformId)) {
      await this.browserProvider.closeSession(platformId);
    }

    // Unregister from registry
    this.registry.unregister(platformId);
  }

  /**
   * Cleanup all platforms (shutdown)
   */
  async cleanupAll(): Promise<void> {
    await this.browserProvider.closeAll();
    this.registry.clear();
  }
}
