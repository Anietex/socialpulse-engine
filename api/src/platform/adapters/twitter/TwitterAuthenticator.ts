import { IAuthenticator, ICredentials, SessionInfo } from '../../core/interfaces/IAuthenticator';
import { AuthenticationError } from '../../core/errors/PlatformErrors';
import { TwitterSelectors } from './TwitterSelectors';
import { Page } from 'playwright';
import { randomDelay } from './utils/humanBehavior';

/**
 * Twitter credentials interface
 */
export interface TwitterCredentials extends ICredentials {
  username: string;
  password: string;
}

/**
 * Twitter Authenticator
 * Handles authentication with Twitter using Playwright browser automation
 *
 * Features:
 * - Cookie-based session management
 * - Automatic session restoration
 * - Human-like login behavior
 */
export class TwitterAuthenticator implements IAuthenticator {
  private sessionInfo: SessionInfo | null = null;

  constructor(private readonly page: Page) {}

  /**
   * Authenticate with Twitter
   * Handles login flow with human-like behavior
   */
  async authenticate(credentials: ICredentials): Promise<void> {
    const twitterCreds = credentials as TwitterCredentials;

    if (!twitterCreds.username || !twitterCreds.password) {
      throw new AuthenticationError('Username and password are required', 'twitter');
    }

    try {
      // Navigate to Twitter login page
      await this.page.goto('https://twitter.com/login', { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(randomDelay(1000, 2000));

      // Enter username
      const usernameInput = await this.page.waitForSelector(TwitterSelectors.usernameInput, {
        timeout: 10000,
        state: 'visible',
      });

      if (!usernameInput) {
        throw new AuthenticationError('Username input not found', 'twitter');
      }

      await usernameInput.click();
      await this.page.waitForTimeout(randomDelay(300, 600));
      await usernameInput.type(twitterCreds.username, { delay: randomDelay(50, 150) });
      await this.page.waitForTimeout(randomDelay(500, 1000));

      // Click next button (Twitter has a two-step login)
      const nextButton = await this.page.$('button:has-text("Next")');
      if (nextButton) {
        await nextButton.click();
        await this.page.waitForTimeout(randomDelay(1000, 2000));
      }

      // Enter password
      const passwordInput = await this.page.waitForSelector(TwitterSelectors.passwordInput, {
        timeout: 10000,
        state: 'visible',
      });

      if (!passwordInput) {
        throw new AuthenticationError('Password input not found', 'twitter');
      }

      await passwordInput.click();
      await this.page.waitForTimeout(randomDelay(300, 600));
      await passwordInput.type(twitterCreds.password, { delay: randomDelay(50, 150) });
      await this.page.waitForTimeout(randomDelay(500, 1000));

      // Click login button
      const loginButton = await this.page.waitForSelector(TwitterSelectors.loginButton, {
        timeout: 10000,
        state: 'visible',
      });

      if (!loginButton) {
        throw new AuthenticationError('Login button not found', 'twitter');
      }

      await loginButton.click();

      // Wait for navigation to complete
      await this.page.waitForTimeout(randomDelay(3000, 5000));

      // Verify authentication was successful
      const authenticated = await this.isAuthenticated();
      if (!authenticated) {
        throw new AuthenticationError('Authentication failed - timeline not loaded', 'twitter');
      }

      // Store session info
      this.sessionInfo = {
        userId: 'twitter-user', // TODO: Extract actual user ID from page
        username: twitterCreds.username,
        platformData: {
          lastAuthenticated: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter'
      );
    }
  }

  /**
   * Check if currently authenticated
   * Verifies by checking for timeline presence
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const url = this.page.url();

      // Check if we're on Twitter/X
      if (!url.includes('twitter.com') && !url.includes('x.com')) {
        return false;
      }

      // Check if we're on login page (not authenticated)
      if (url.includes('/login')) {
        return false;
      }

      // Check if timeline exists (indicates logged in)
      const timeline = await this.page.$(TwitterSelectors.timeline);
      return timeline !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Logout from Twitter
   */
  async logout(): Promise<void> {
    try {
      // Clear cookies and session
      const context = this.page.context();
      await context.clearCookies();

      // Navigate to homepage (will require login)
      await this.page.goto('https://twitter.com', { waitUntil: 'networkidle' });

      this.sessionInfo = null;
    } catch (error) {
      throw new AuthenticationError(
        `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter'
      );
    }
  }

  /**
   * Get current session information
   */
  async getSessionInfo(): Promise<SessionInfo | null> {
    const authenticated = await this.isAuthenticated();
    if (!authenticated) {
      this.sessionInfo = null;
    }
    return this.sessionInfo;
  }

  /**
   * Save session cookies for future restoration
   */
  async saveSession(): Promise<any> {
    const context = this.page.context();
    const cookies = await context.cookies();
    return cookies;
  }

  /**
   * Restore session from saved cookies
   */
  async restoreSession(cookies: any[]): Promise<void> {
    try {
      const context = this.page.context();
      await context.addCookies(cookies);

      // Navigate to Twitter
      await this.page.goto('https://twitter.com', { waitUntil: 'networkidle' });

      // Verify session is valid
      const authenticated = await this.isAuthenticated();
      if (!authenticated) {
        throw new AuthenticationError('Session restoration failed - session expired', 'twitter');
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        `Session restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter'
      );
    }
  }
}
