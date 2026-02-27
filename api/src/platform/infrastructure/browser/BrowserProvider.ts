import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';

/**
 * Browser configuration options
 */
export interface BrowserConfig {
  headless?: boolean;
  slowMo?: number;
  userDataDir?: string;
  viewport?: {
    width: number;
    height: number;
  };
  timeout?: number;
  args?: string[];
}

/**
 * Browser session interface
 */
export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  platformId: string;
}

/**
 * Browser Provider for managing Playwright instances
 * Handles browser lifecycle, context management, and session cleanup
 *
 * Benefits:
 * - Centralized browser instance management
 * - Automatic resource cleanup
 * - Session isolation per platform
 * - Configurable browser options
 * - Error handling and recovery
 */
export class BrowserProvider {
  private sessions: Map<string, BrowserSession> = new Map();
  private defaultConfig: BrowserConfig;

  constructor(config?: BrowserConfig) {
    this.defaultConfig = {
      headless: true,
      slowMo: 100,
      viewport: { width: 1920, height: 1080 },
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Create a new browser session for a platform
   * @param platformId Unique identifier for the platform
   * @param config Optional configuration overrides
   * @returns Browser session with browser, context, and page
   */
  async createSession(
    platformId: string,
    config?: Partial<BrowserConfig>
  ): Promise<BrowserSession> {
    // Check if session already exists
    if (this.sessions.has(platformId)) {
      throw new Error(`Browser session for platform "${platformId}" already exists`);
    }

    const mergedConfig = { ...this.defaultConfig, ...config };

    try {
      // Launch browser
      const launchOptions: LaunchOptions = {
        headless: mergedConfig.headless,
        slowMo: mergedConfig.slowMo,
        args: mergedConfig.args || [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      };

      const browser = await chromium.launch(launchOptions);

      // Create context
      const context = await browser.newContext({
        viewport: mergedConfig.viewport,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });

      // Set default timeout
      if (mergedConfig.timeout) {
        context.setDefaultTimeout(mergedConfig.timeout);
      }

      // Create page
      const page = await context.newPage();

      // Store session
      const session: BrowserSession = {
        browser,
        context,
        page,
        platformId,
      };

      this.sessions.set(platformId, session);

      return session;
    } catch (error) {
      throw new Error(
        `Failed to create browser session for "${platformId}": ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get existing browser session
   * @param platformId Platform identifier
   * @returns Browser session or null if not found
   */
  getSession(platformId: string): BrowserSession | null {
    return this.sessions.get(platformId) || null;
  }

  /**
   * Check if session exists
   * @param platformId Platform identifier
   * @returns true if session exists
   */
  hasSession(platformId: string): boolean {
    return this.sessions.has(platformId);
  }

  /**
   * Get or create session
   * @param platformId Platform identifier
   * @param config Optional configuration overrides
   * @returns Existing or newly created browser session
   */
  async getOrCreateSession(
    platformId: string,
    config?: Partial<BrowserConfig>
  ): Promise<BrowserSession> {
    const existing = this.getSession(platformId);
    if (existing) {
      return existing;
    }

    return await this.createSession(platformId, config);
  }

  /**
   * Close a specific browser session
   * @param platformId Platform identifier
   */
  async closeSession(platformId: string): Promise<void> {
    const session = this.sessions.get(platformId);
    if (!session) {
      return;
    }

    try {
      await session.context.close();
      await session.browser.close();
    } catch (error) {
      console.error(`Error closing session for "${platformId}":`, error);
    } finally {
      this.sessions.delete(platformId);
    }
  }

  /**
   * Close all browser sessions
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.sessions.keys()).map((platformId) =>
      this.closeSession(platformId)
    );

    await Promise.all(closePromises);
  }

  /**
   * Save session state (cookies, storage) for a platform
   * @param platformId Platform identifier
   * @param path Path to save session state
   */
  async saveSessionState(platformId: string, path: string): Promise<void> {
    const session = this.sessions.get(platformId);
    if (!session) {
      throw new Error(`No session found for platform "${platformId}"`);
    }

    await session.context.storageState({ path });
  }

  /**
   * Load session state (cookies, storage) for a platform
   * @param platformId Platform identifier
   * @param path Path to load session state from
   */
  async loadSessionState(platformId: string, path: string): Promise<void> {
    const session = this.sessions.get(platformId);
    if (!session) {
      throw new Error(`No session found for platform "${platformId}"`);
    }

    // Close existing context
    await session.context.close();

    // Create new context with saved state
    const newContext = await session.browser.newContext({
      storageState: path,
      viewport: this.defaultConfig.viewport,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    const newPage = await newContext.newPage();

    // Update session
    session.context = newContext;
    session.page = newPage;
  }

  /**
   * Restart a browser session
   * @param platformId Platform identifier
   * @param preserveState Whether to preserve session state
   * @param config Optional configuration overrides
   */
  async restartSession(
    platformId: string,
    preserveState: boolean = false,
    config?: Partial<BrowserConfig>
  ): Promise<BrowserSession> {
    let statePath: string | undefined;

    if (preserveState) {
      const tempPath = `/tmp/session-${platformId}-${Date.now()}.json`;
      await this.saveSessionState(platformId, tempPath);
      statePath = tempPath;
    }

    await this.closeSession(platformId);
    const newSession = await this.createSession(platformId, config);

    if (statePath) {
      await this.loadSessionState(platformId, statePath);
    }

    return newSession;
  }

  /**
   * Get count of active sessions
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get list of active platform IDs
   */
  getActivePlatformIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Check if any session is active
   */
  hasActiveSessions(): boolean {
    return this.sessions.size > 0;
  }
}
