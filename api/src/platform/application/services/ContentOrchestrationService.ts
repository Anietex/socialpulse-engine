import { IContentRepository } from '../../domain/repositories/IContentRepository';
import { ContentService } from '../../domain/services/ContentService';
import { IPlatformAdapter } from '../../infrastructure/registry/PlatformRegistry';
import { Content, MediaItem } from '../../domain/entities/Content';
import { Author } from '../../domain/entities/Author';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { ContentStatus } from '../../core/types/ContentStatus';
import { ContentId } from '../../core/value-objects/ContentId';
import { NormalizedContent } from '../../core/interfaces/IContentNormalizer';

/**
 * Result of content orchestration operation
 */
export interface ContentOrchestrationResult {
  success: boolean;
  totalScraped: number;
  totalNormalized: number;
  totalSaved: number;
  duplicates: number;
  errors: string[];
  newContentIds: string[];
}

/**
 * Content Orchestration Service
 * Application service that coordinates scraping, normalization, and persistence
 *
 * Responsibilities:
 * - Orchestrate content scraping from platform adapters
 * - Normalize platform-specific data to domain format
 * - Detect and handle duplicate content
 * - Persist content to repository
 * - Coordinate with domain services for business logic
 *
 * Benefits:
 * - Single place for content ingestion workflow
 * - Deduplication logic centralized
 * - Error handling and reporting
 * - Transaction-like operations
 */
export class ContentOrchestrationService {
  constructor(
    private readonly repository: IContentRepository,
    private readonly domainService: ContentService
  ) {}

  /**
   * Scrape, normalize, and save content from a platform adapter
   * @param adapter Platform adapter to scrape from
   * @param limit Maximum number of items to scrape
   * @param batchId Optional batch identifier for grouping
   * @returns Orchestration result with statistics
   */
  async scrapeAndSaveContent(
    adapter: IPlatformAdapter,
    _limit: number,
    batchId?: string
  ): Promise<ContentOrchestrationResult> {
    const result: ContentOrchestrationResult = {
      success: true,
      totalScraped: 0,
      totalNormalized: 0,
      totalSaved: 0,
      duplicates: 0,
      errors: [],
      newContentIds: [],
    };

    try {
      // Step 1: Scrape raw content from platform
      const rawContent = await adapter.scraper.scrape();
      result.totalScraped = rawContent.length;

      if (rawContent.length === 0) {
        return result;
      }

      // Step 2: Normalize to domain format
      const normalizedContent = adapter.normalizer.normalizeMany(rawContent);
      result.totalNormalized = normalizedContent.length;

      // Step 2.5: Convert to domain entities
      const domainContent = normalizedContent.map((normalized) =>
        this.convertToDomainContent(normalized)
      );

      // Step 3: Filter out duplicates
      const uniqueContent = await this.filterDuplicates(domainContent, adapter.getPlatformId());

      result.duplicates = normalizedContent.length - uniqueContent.length;

      // Step 4: Add batch ID if provided
      const contentToSave = batchId
        ? uniqueContent.map((c) => c.withBatchId(batchId))
        : uniqueContent;

      // Step 5: Save to repository
      const savedContent = await this.repository.saveMany(contentToSave);
      result.totalSaved = savedContent.length;
      result.newContentIds = savedContent.map((c) => c.id.toString());

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error during orchestration'
      );
      return result;
    }
  }

  /**
   * Scrape content from multiple platforms
   * @param adapters Array of platform adapters
   * @param limitPerPlatform Maximum items per platform
   * @param batchId Optional batch identifier
   * @returns Combined results from all platforms
   */
  async scrapeFromMultiplePlatforms(
    adapters: IPlatformAdapter[],
    limitPerPlatform: number,
    batchId?: string
  ): Promise<Map<string, ContentOrchestrationResult>> {
    const results = new Map<string, ContentOrchestrationResult>();

    // Scrape from all platforms in parallel
    const promises = adapters.map(async (adapter) => {
      const platformId = adapter.getPlatformId();
      try {
        const result = await this.scrapeAndSaveContent(adapter, limitPerPlatform, batchId);
        results.set(platformId, result);
      } catch (error) {
        results.set(platformId, {
          success: false,
          totalScraped: 0,
          totalNormalized: 0,
          totalSaved: 0,
          duplicates: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          newContentIds: [],
        });
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Get content by ID with error handling
   */
  async getContent(contentId: ContentId): Promise<Content | null> {
    return this.repository.findById(contentId);
  }

  /**
   * Get content ready for specific pipeline stage
   */
  async getContentForStage(status: ContentStatus, limit: number): Promise<Content[]> {
    return this.domainService.getContentForNextStage(status, limit);
  }

  /**
   * Batch update content status
   */
  async updateContentStatuses(contentIds: ContentId[], status: ContentStatus): Promise<void> {
    await this.repository.updateManyStatuses(contentIds, status);
  }

  /**
   * Save updated content after processing
   */
  async saveProcessedContent(content: Content[]): Promise<Content[]> {
    return this.repository.saveMany(content);
  }

  /**
   * Get content statistics
   */
  async getContentStatistics(platformId?: PlatformId): Promise<{
    total: number;
    byStatus: Map<ContentStatus, number>;
  }> {
    const statuses = [
      ContentStatus.PENDING_CATEGORIZATION,
      ContentStatus.PENDING_RANKING,
      ContentStatus.PENDING_ACTION,
      ContentStatus.QUEUED_FOR_ENGAGEMENT,
      ContentStatus.ENGAGING,
      ContentStatus.ENGAGED,
      ContentStatus.SKIPPED,
      ContentStatus.ERROR,
    ];

    const byStatus = new Map<ContentStatus, number>();
    let total = 0;

    for (const status of statuses) {
      const count = await this.repository.count({
        platformId,
        status,
      });
      byStatus.set(status, count);
      total += count;
    }

    return { total, byStatus };
  }

  /**
   * Filter out duplicate content based on platform content ID
   */
  private async filterDuplicates(content: Content[], platformId: string): Promise<Content[]> {
    const unique: Content[] = [];

    for (const item of content) {
      const existing = await this.repository.findByPlatformContentId(
        PlatformId.fromString(platformId),
        item.platformContentId
      );

      if (!existing) {
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Convert NormalizedContent to Content domain entity
   */
  private convertToDomainContent(normalized: NormalizedContent): Content {
    // Create author entity
    const author = new Author(
      normalized.authorId,
      normalized.authorDisplayName || normalized.authorUsername,
      normalized.authorUsername,
      undefined, // profileUrl
      undefined, // avatarUrl
      normalized.authorIsVerified || false,
      normalized.authorFollowers || 0,
      undefined // description
    );

    // Convert media
    const media: MediaItem[] = [];
    if (normalized.hasMedia && normalized.mediaUrls && normalized.mediaTypes) {
      for (let i = 0; i < normalized.mediaUrls.length; i++) {
        media.push({
          type: normalized.mediaTypes[i] || 'image',
          url: normalized.mediaUrls[i],
        });
      }
    }

    // Build content entity
    const builder = Content.builder()
      .id(`${normalized.platformId}:${normalized.id}`)
      .platformId(normalized.platformId)
      .platformContentId(normalized.id)
      .text(normalized.text)
      .author(author.toPlain())
      .url(normalized.url)
      .createdAt(normalized.createdAt)
      .metrics({
        likes: normalized.likes,
        comments: normalized.comments,
        shares: normalized.shares,
        views: normalized.views || 0,
      })
      .status(ContentStatus.PENDING_CATEGORIZATION)
      .media(media)
      .isReply(normalized.isReply)
      .isRepost(normalized.isRepost)
      .isQuote(normalized.isQuote);

    // Add platformData if exists
    if (normalized.rawData) {
      builder.platformData(normalized.rawData);
    }

    return builder.build();
  }
}
