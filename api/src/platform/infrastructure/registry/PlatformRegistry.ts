import { PlatformId } from '../../core/value-objects/PlatformId';
import { PlatformNotFoundError } from '../../core/errors/PlatformErrors';
import { IContentScraper } from '../../core/interfaces/IContentScraper';
import { IAuthenticator } from '../../core/interfaces/IAuthenticator';
import { IActionExecutor } from '../../core/interfaces/IActionExecutor';
import { IRateLimitProvider } from '../../core/interfaces/IRateLimitProvider';
import { IContentNormalizer } from '../../core/interfaces/IContentNormalizer';

/**
 * Platform adapter interface
 * Represents a complete platform implementation
 */
export interface IPlatformAdapter {
  readonly platformId: PlatformId | string;
  readonly scraper: IContentScraper;
  readonly authenticator: IAuthenticator;
  readonly actionExecutor: IActionExecutor;
  readonly rateLimits: IRateLimitProvider;
  readonly normalizer: IContentNormalizer;
  getDisplayName(): string;
  getCapabilities(): any;
  isReady(): Promise<boolean>;
  getPlatformId(): string;
}

/**
 * Platform Registry
 * Manages registration and retrieval of platform adapters
 *
 * Benefits:
 * - Centralized platform adapter management
 * - Easy to add new platforms (just register them)
 * - Provides unified interface for platform operations
 * - Supports dynamic platform loading
 * - Type-safe platform retrieval
 */
export class PlatformRegistry {
  private adapters: Map<string, IPlatformAdapter> = new Map();

  /**
   * Register a platform adapter
   * @param platformId Platform identifier
   * @param adapter Platform adapter instance
   */
  register(platformId: string, adapter: IPlatformAdapter): void {
    if (this.adapters.has(platformId)) {
      throw new Error(`Platform "${platformId}" is already registered`);
    }

    this.adapters.set(platformId, adapter);
  }

  /**
   * Register multiple adapters at once
   * @param adapters Map of platform IDs to adapters
   */
  registerMany(adapters: Map<string, IPlatformAdapter>): void {
    adapters.forEach((adapter, platformId) => {
      this.register(platformId, adapter);
    });
  }

  /**
   * Unregister a platform adapter
   * @param platformId Platform identifier
   */
  unregister(platformId: string): void {
    this.adapters.delete(platformId);
  }

  /**
   * Get a platform adapter
   * @param platformId Platform identifier
   * @throws PlatformNotFoundError if platform not registered
   * @returns Platform adapter
   */
  get(platformId: string | PlatformId): IPlatformAdapter {
    const id = platformId instanceof PlatformId ? platformId.toString() : platformId;
    const adapter = this.adapters.get(id);

    if (!adapter) {
      throw new PlatformNotFoundError(id);
    }

    return adapter;
  }

  /**
   * Try to get a platform adapter
   * @param platformId Platform identifier
   * @returns Platform adapter or null if not found
   */
  tryGet(platformId: string | PlatformId): IPlatformAdapter | null {
    const id = platformId instanceof PlatformId ? platformId.toString() : platformId;
    return this.adapters.get(id) || null;
  }

  /**
   * Check if a platform is registered
   * @param platformId Platform identifier
   * @returns true if platform is registered
   */
  has(platformId: string | PlatformId): boolean {
    const id = platformId instanceof PlatformId ? platformId.toString() : platformId;
    return this.adapters.has(id);
  }

  /**
   * Get all registered platform IDs
   * @returns Array of platform IDs
   */
  getRegisteredPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get count of registered platforms
   * @returns Number of registered platforms
   */
  getCount(): number {
    return this.adapters.size;
  }

  /**
   * Check if registry is empty
   * @returns true if no platforms are registered
   */
  isEmpty(): boolean {
    return this.adapters.size === 0;
  }

  /**
   * Clear all registered platforms
   */
  clear(): void {
    this.adapters.clear();
  }

  /**
   * Get all adapters
   * @returns Array of all platform adapters
   */
  getAll(): IPlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapters for multiple platforms
   * @param platformIds Array of platform identifiers
   * @returns Array of platform adapters (only found platforms)
   */
  getMany(platformIds: (string | PlatformId)[]): IPlatformAdapter[] {
    return platformIds
      .map((id) => this.tryGet(id))
      .filter((adapter): adapter is IPlatformAdapter => adapter !== null);
  }

  /**
   * Check if all specified platforms are registered
   * @param platformIds Array of platform identifiers
   * @returns true if all platforms are registered
   */
  hasAll(platformIds: (string | PlatformId)[]): boolean {
    return platformIds.every((id) => this.has(id));
  }

  /**
   * Check readiness of all registered platforms
   * @returns Map of platform IDs to readiness status
   */
  async checkAllReadiness(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    const promises = Array.from(this.adapters.entries()).map(async ([platformId, adapter]) => {
      try {
        const ready = await adapter.isReady();
        results.set(platformId, ready);
      } catch (error) {
        results.set(platformId, false);
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Get ready platforms
   * @returns Array of platform IDs that are ready
   */
  async getReadyPlatforms(): Promise<string[]> {
    const readiness = await this.checkAllReadiness();
    return Array.from(readiness.entries())
      .filter(([_, ready]) => ready)
      .map(([platformId]) => platformId);
  }

  /**
   * Get platform capabilities summary
   * @returns Map of platform IDs to their capabilities
   */
  getPlatformCapabilities(): Map<string, any> {
    const capabilities = new Map<string, any>();

    this.adapters.forEach((adapter, platformId) => {
      capabilities.set(platformId, adapter.getCapabilities());
    });

    return capabilities;
  }

  /**
   * Find platforms supporting a specific action
   * @param actionType Action type to check
   * @returns Array of platform IDs supporting the action
   */
  getPlatformsSupportingAction(actionType: string): string[] {
    const supportingPlatforms: string[] = [];

    this.adapters.forEach((adapter, platformId) => {
      if (adapter.actionExecutor.supportsAction(actionType)) {
        supportingPlatforms.push(platformId);
      }
    });

    return supportingPlatforms;
  }
}
