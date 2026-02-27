/**
 * Interface for scraping content from a platform
 * Implementations should handle platform-specific DOM traversal
 */
export interface IContentScraper {
  /**
   * Scrape content from the platform
   * @returns Array of raw content data (not yet normalized)
   * @throws ScrapingError if scraping fails
   */
  scrape(): Promise<RawContent[]>;

  /**
   * Check if scraper is ready to scrape
   * @returns true if authenticated and page is loaded
   */
  isReady(): Promise<boolean>;

  /**
   * Get the platform this scraper targets
   */
  readonly platformId: string;
}

/**
 * Raw content before normalization
 * Platform-specific structure
 */
export interface RawContent {
  id: string;
  [key: string]: any; // Platform-specific fields
}
