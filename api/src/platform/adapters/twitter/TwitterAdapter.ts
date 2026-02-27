import { IContentScraper } from '../../core/interfaces/IContentScraper';
import { IAuthenticator } from '../../core/interfaces/IAuthenticator';
import { IActionExecutor } from '../../core/interfaces/IActionExecutor';
import { IRateLimitProvider } from '../../core/interfaces/IRateLimitProvider';
import { IContentNormalizer } from '../../core/interfaces/IContentNormalizer';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { TwitterScraper } from './TwitterScraper';
import { TwitterAuthenticator } from './TwitterAuthenticator';
import { TwitterActionExecutor } from './TwitterActionExecutor';
import { TwitterRateLimitProvider } from './TwitterRateLimitProvider';
import { TwitterNormalizer } from './TwitterNormalizer';
import { Page } from 'playwright';

/**
 * Twitter Platform Adapter
 * Composes all Twitter-specific components into a unified interface
 *
 * This is the Facade pattern - provides a simple interface to a complex subsystem
 * Benefits:
 * - Single entry point for all Twitter operations
 * - Easy to instantiate and use
 * - Components are composed, not coupled
 * - Easy to test (can inject mock components)
 */
export class TwitterAdapter {
  public readonly platformId: PlatformId;
  public readonly scraper: IContentScraper;
  public readonly authenticator: IAuthenticator;
  public readonly actionExecutor: IActionExecutor;
  public readonly rateLimits: IRateLimitProvider;
  public readonly normalizer: IContentNormalizer;

  /**
   * Create Twitter adapter with Playwright page
   * @param page - Playwright page instance for browser automation
   */
  constructor(page: Page) {
    this.platformId = PlatformId.fromString('twitter');
    this.scraper = new TwitterScraper(page);
    this.authenticator = new TwitterAuthenticator(page);
    this.actionExecutor = new TwitterActionExecutor(page);
    this.rateLimits = new TwitterRateLimitProvider();
    this.normalizer = new TwitterNormalizer();
  }

  /**
   * Get platform display name
   */
  getDisplayName(): string {
    return 'Twitter';
  }

  /**
   * Get platform capabilities
   * Describes what this adapter can do
   */
  getCapabilities() {
    return {
      scraping: true,
      actions: {
        like: true,
        comment: true,
        share: true,
        quote: true,
        view: true,
      },
      mediaSupport: ['image', 'video', 'gif'],
      maxTextLength: 280,
      rateLimits: {
        like: '150/hour',
        comment: '25/hour',
        share: '50/hour',
        quote: '10/hour',
      },
    };
  }

  /**
   * Quick check if adapter is ready to use
   */
  async isReady(): Promise<boolean> {
    const authenticated = await this.authenticator.isAuthenticated();
    const scraperReady = await this.scraper.isReady();
    return authenticated && scraperReady;
  }

  /**
   * Get platform ID as string
   */
  getPlatformId(): string {
    return this.platformId.toString();
  }
}
