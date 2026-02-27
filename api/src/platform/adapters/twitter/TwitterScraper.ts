import { IContentScraper, RawContent } from '../../core/interfaces/IContentScraper';
import { TwitterSelectors } from './TwitterSelectors';
import { Page } from 'playwright';
import { ScrapingError } from '../../core/errors/PlatformErrors';

/**
 * Twitter Content Scraper
 * Implements IContentScraper for scraping tweets from Twitter
 *
 * Responsibilities:
 * - Navigate to Twitter timeline
 * - Extract tweet data from DOM
 * - Handle pagination and scrolling
 * - Return raw tweet data (before normalization)
 */
export class TwitterScraper implements IContentScraper {
  readonly platformId = 'twitter';

  constructor(private readonly page: Page) {}

  /**
   * Check if scraper is ready
   * Verifies page is loaded and authenticated
   */
  async isReady(): Promise<boolean> {
    try {
      // Check if we're on Twitter
      const url = this.page.url();
      if (!url.includes('twitter.com') && !url.includes('x.com')) {
        return false;
      }

      // Check if timeline is present (indicates logged in)
      const timeline = await this.page.$(TwitterSelectors.timeline);
      return timeline !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Scrape tweets from current page
   * @param limit - Maximum number of tweets to scrape
   * @returns Array of raw tweet data
   */
  async scrape(limit: number = 50): Promise<RawContent[]> {
    try {
      // Ensure scraper is ready
      const ready = await this.isReady();
      if (!ready) {
        throw new ScrapingError(
          'Scraper not ready - page not loaded or not authenticated',
          'twitter'
        );
      }

      const tweets: RawContent[] = [];
      const scrapedIds = new Set<string>();

      // Scroll and scrape until we have enough tweets or no more tweets found
      let lastHeight = 0;
      let noNewTweetsCount = 0;

      while (tweets.length < limit && noNewTweetsCount < 3) {
        // Get all tweet elements on current page
        const tweetElements = await this.page.$$(TwitterSelectors.tweet);

        for (const tweetElement of tweetElements) {
          if (tweets.length >= limit) break;

          try {
            const tweetData = await this.extractTweetData(tweetElement);
            if (tweetData && !scrapedIds.has(tweetData.id)) {
              tweets.push(tweetData);
              scrapedIds.add(tweetData.id);
            }
          } catch (error) {
            // Skip tweets that fail to scrape
            console.warn('Failed to scrape tweet:', error);
          }
        }

        // Scroll down to load more tweets
        await this.page.evaluate(() => {
          // @ts-expect-error - window and document exist in browser context
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait for new content to load
        await this.page.waitForTimeout(2000);

        // Check if page height changed (new content loaded)
        // @ts-expect-error - document exists in browser context
        const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === lastHeight) {
          noNewTweetsCount++;
        } else {
          noNewTweetsCount = 0;
        }
        lastHeight = currentHeight;
      }

      return tweets;
    } catch (error) {
      if (error instanceof ScrapingError) {
        throw error;
      }
      throw new ScrapingError(
        `Failed to scrape tweets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter'
      );
    }
  }

  /**
   * Extract data from a single tweet element
   * @param element - Playwright element handle for tweet
   * @returns Raw tweet data
   */
  private async extractTweetData(element: any): Promise<RawContent> {
    try {
      // Extract tweet ID from element (usually in data attribute or URL)
      const tweetLink = await element.$('a[href*="/status/"]');
      const href = tweetLink ? await tweetLink.getAttribute('href') : null;
      const tweetId = href ? href.split('/status/')[1]?.split('?')[0] : null;

      if (!tweetId) {
        throw new Error('Could not extract tweet ID');
      }

      // Extract text content
      const textElement = await element.$(TwitterSelectors.tweetText);
      const text = textElement ? await textElement.innerText() : '';

      // Extract author info
      const userNameElement = await element.$(TwitterSelectors.userName);
      const userNameText = userNameElement ? await userNameElement.innerText() : '';
      const [displayName, handle] = this.parseUserName(userNameText);

      // Extract metrics
      const metrics = await this.extractMetrics(element);

      // Extract media
      const hasMedia =
        (await element.$(TwitterSelectors.tweetPhoto)) !== null ||
        (await element.$(TwitterSelectors.tweetVideo)) !== null;

      // Build raw content object
      const rawContent: RawContent = {
        id: tweetId,
        platformId: 'twitter',
        text,
        author: {
          name: displayName,
          handle: handle,
        },
        url: `https://twitter.com/i/web/status/${tweetId}`,
        createdAt: new Date().toISOString(), // TODO: Extract actual timestamp
        metrics,
        hasMedia,
        // Store raw element for potential future processing
        _raw: true,
      };

      return rawContent;
    } catch (error) {
      throw new Error(
        `Failed to extract tweet data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse username text to extract display name and handle
   * Format is usually: "Display Name\n@handle\n·\ntimestamp"
   */
  private parseUserName(userNameText: string): [string, string] {
    const lines = userNameText.split('\n').map((l) => l.trim());
    const displayName = lines[0] || 'Unknown';
    const handle = lines.find((l) => l.startsWith('@')) || '@unknown';
    return [displayName, handle.replace('@', '')];
  }

  /**
   * Extract engagement metrics from tweet element
   */
  private async extractMetrics(element: any): Promise<Record<string, number>> {
    try {
      const metrics: Record<string, number> = {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
      };

      // Extract like count
      const likeElement = await element.$(TwitterSelectors.likeCount);
      if (likeElement) {
        const likeText = await likeElement.getAttribute('aria-label');
        metrics.likes = this.parseMetricText(likeText);
      }

      // Extract reply count
      const replyElement = await element.$(TwitterSelectors.replyCount);
      if (replyElement) {
        const replyText = await replyElement.getAttribute('aria-label');
        metrics.comments = this.parseMetricText(replyText);
      }

      // Extract retweet count
      const retweetElement = await element.$(TwitterSelectors.retweetCount);
      if (retweetElement) {
        const retweetText = await retweetElement.getAttribute('aria-label');
        metrics.shares = this.parseMetricText(retweetText);
      }

      return metrics;
    } catch (error) {
      return { likes: 0, comments: 0, shares: 0, views: 0 };
    }
  }

  /**
   * Parse metric text to extract number
   * Handles formats like: "5 likes", "1.2K likes", "5.4M likes"
   */
  private parseMetricText(text: string | null): number {
    if (!text) return 0;

    const match = text.match(/(\d+\.?\d*)(K|M)?/i);
    if (!match) return 0;

    const number = parseFloat(match[1]);
    const multiplier = match[2];

    if (multiplier === 'K' || multiplier === 'k') {
      return Math.round(number * 1000);
    }
    if (multiplier === 'M' || multiplier === 'm') {
      return Math.round(number * 1000000);
    }

    return Math.round(number);
  }
}
