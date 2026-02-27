/**
 * Alternative to Playwright: Use real Chrome with Chrome DevTools Protocol
 * This is much harder to detect since it's using actual Chrome
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { logger } from '../../config/logger.js';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_PORT = 9222;

class ChromeCDPManager {
  private cdpEndpoint: string | null = null;

  /**
   * Launch real Chrome with remote debugging
   */
  async launchRealChrome(): Promise<void> {
    try {
      // Launch Chrome with debugging port in background
      const chromeProcess = spawn(
        CHROME_PATH,
        [`--remote-debugging-port=${CDP_PORT}`, '--user-data-dir=/tmp/chrome-cdp-profile'],
        {
          detached: true,
          stdio: 'ignore',
        }
      );

      // Unref so parent process can exit independently
      chromeProcess.unref();

      // Wait for Chrome to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.cdpEndpoint = `http://localhost:${CDP_PORT}`;
      logger.info(`Real Chrome launched with CDP on port ${CDP_PORT}`);
    } catch (error) {
      logger.error('Failed to launch real Chrome:', error);
      throw error;
    }
  }

  /**
   * Connect Playwright to real Chrome via CDP
   */
  async connectPlaywright() {
    if (!this.cdpEndpoint) {
      await this.launchRealChrome();
    }

    const browser = await chromium.connectOverCDP(this.cdpEndpoint!);
    logger.info('Playwright connected to real Chrome via CDP');

    return browser;
  }
}

export const chromeCDPManager = new ChromeCDPManager();
