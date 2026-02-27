import { BaseCommand, CommandContext } from './ICommand';
import { Result, ResultUtils } from '../types';
import { IContentScraper } from '../interfaces/IContentScraper';
import { IContentNormalizer, NormalizedContent } from '../interfaces/IContentNormalizer';
import { PlatformId } from '../value-objects/PlatformId';

/**
 * Input for scraping content
 */
export interface ScrapeContentInput {
  /**
   * Platform to scrape from
   */
  platformId: PlatformId;

  /**
   * Maximum number of items to scrape (optional)
   */
  limit?: number;

  /**
   * Additional scraping options
   */
  options?: {
    /**
     * Skip normalization (return raw content)
     */
    skipNormalization?: boolean;

    /**
     * Custom filters for scraping
     */
    filters?: Record<string, any>;
  };
}

/**
 * Output from scraping content
 */
export interface ScrapeContentOutput {
  /**
   * Platform that was scraped
   */
  platformId: string;

  /**
   * Normalized content items
   */
  content: NormalizedContent[];

  /**
   * Number of items scraped
   */
  count: number;

  /**
   * Number of items that failed normalization
   */
  failedCount: number;

  /**
   * Scraping metadata
   */
  metadata: {
    scrapedAt: Date;
    durationMs: number;
  };
}

/**
 * Command for scraping content from a platform
 *
 * Responsibilities:
 * 1. Use IContentScraper to fetch raw content
 * 2. Use IContentNormalizer to normalize content
 * 3. Handle errors and provide detailed results
 */
export class ScrapeContentCommand extends BaseCommand<ScrapeContentInput, ScrapeContentOutput> {
  readonly name = 'ScrapeContent';

  constructor(
    private readonly scraper: IContentScraper,
    private readonly normalizer: IContentNormalizer
  ) {
    super();
  }

  /**
   * Validate scraping input
   */
  validate(input: ScrapeContentInput): Result<true, string> {
    if (!input.platformId) {
      return ResultUtils.err('platformId is required');
    }

    if (input.limit !== undefined && input.limit <= 0) {
      return ResultUtils.err('limit must be greater than 0');
    }

    // Verify scraper and normalizer match the platform
    if (this.scraper.platformId !== input.platformId.toString()) {
      return ResultUtils.err(
        `Scraper platform (${this.scraper.platformId}) does not match input platform (${input.platformId.toString()})`
      );
    }

    if (this.normalizer.platformId !== input.platformId.toString()) {
      return ResultUtils.err(
        `Normalizer platform (${this.normalizer.platformId}) does not match input platform (${input.platformId.toString()})`
      );
    }

    return ResultUtils.ok(true);
  }

  /**
   * Execute scraping logic
   */
  protected async executeImpl(
    input: ScrapeContentInput,
    _context?: CommandContext
  ): Promise<ScrapeContentOutput> {
    const startTime = Date.now();

    // Check if scraper is ready
    const isReady = await this.scraper.isReady();
    if (!isReady) {
      throw new Error(
        `Scraper for ${input.platformId.toString()} is not ready. Ensure authentication and page load.`
      );
    }

    // Scrape raw content
    const rawContent = await this.scraper.scrape();

    // Apply limit if specified
    const limitedContent = input.limit ? rawContent.slice(0, input.limit) : rawContent;

    // Skip normalization if requested
    if (input.options?.skipNormalization) {
      return {
        platformId: input.platformId.toString(),
        content: limitedContent as any, // Raw content
        count: limitedContent.length,
        failedCount: 0,
        metadata: {
          scrapedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      };
    }

    // Normalize content
    const normalizedContent = this.normalizer.normalizeMany(limitedContent);
    const failedCount = limitedContent.length - normalizedContent.length;

    return {
      platformId: input.platformId.toString(),
      content: normalizedContent,
      count: normalizedContent.length,
      failedCount,
      metadata: {
        scrapedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    };
  }
}
