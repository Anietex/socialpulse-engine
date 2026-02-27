import type { Browser } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from '../../config/logger.js';

const DEFAULT_NAVIGATION_TIMEOUT = Number(process.env.AUTOMATION_NAV_TIMEOUT_MS || '20000');
const chromiumStealth = chromium.use(StealthPlugin());
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';

class PlaywrightManager {
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  private async launchBrowser(): Promise<Browser> {
    logger.info('Launching Playwright (stealth) browser for automation worker');

    const browser = await chromiumStealth.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    logger.info('Playwright browser launched');
    this.browser = browser;
    this.launching = null;
    return browser;
  }

  async getBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (this.launching) {
      return this.launching;
    }

    this.launching = this.launchBrowser();
    return this.launching;
  }

  async close(): Promise<void> {
    if (this.browser) {
      logger.info('Closing Playwright browser');
      await this.browser.close();
      this.browser = null;
    }
  }

  getNavigationTimeout(): number {
    return DEFAULT_NAVIGATION_TIMEOUT;
  }
}

export const browserManager = new PlaywrightManager();
