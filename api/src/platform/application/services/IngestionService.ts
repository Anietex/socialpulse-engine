/**
 * Ingestion Service
 * Handles bulk content ingestion from external sources (Chrome extension)
 * Now unified to use Content entities for all platforms
 */

import { IContentRepository } from '../../domain/repositories/IContentRepository';
import { IBatchRepository } from '../../domain/repositories/IBatchRepository';
import { Content } from '../../domain/entities/Content';
import { Author } from '../../domain/entities/Author';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { Metrics } from '../../core/value-objects/Metrics';
import { ContentStatus } from '../../core/types/ContentStatus';
import { Batch, BatchStage } from '../../domain/entities/Batch';
import { QueueService } from '../../infrastructure/queue/QueueService';
import { logger } from '../../../config/logger';
import { nanoid } from 'nanoid';

/**
 * Tweet ingest DTO (from Chrome extension)
 * Supports both old and new formats for backward compatibility
 */
export interface TweetIngestDto {
  injectedId: string;
  text: string;
  user: {
    name: string;
    handle: string;
    avatar?: string;
  };
  url?: string; // Optional - will be generated if missing
  media?: {
    images?: Array<string | { url: string; alt?: string }>; // Supports both formats
    videos?: string[];
    gifs?: string[];
  };
  metrics?: {
    likes?: number;
    replies?: number;
    reposts?: number;
    views?: number;
  };
  scrapedAt?: string;
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  stored: number;
  totalUnique: number;
  accepted: number;
  skipped?: number;
  errors?: string[];
  processingTime: number;
  batchId?: string;
}

/**
 * Ingestion statistics
 */
export interface IngestionStats {
  total: number;
  byStatus: Record<string, number>;
}

/**
 * Ingestion Service
 */
export class IngestionService {
  constructor(
    private readonly contentRepository: IContentRepository,
    private readonly batchRepository: IBatchRepository,
    private readonly queueService: QueueService
  ) {}

  /**
   * Ingest tweets from Chrome extension in batches
   * Now creates Content entities for unified processing
   */
  async ingestTweets(userId: string, tweets: TweetIngestDto[]): Promise<IngestionResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    logger.info(`Starting batch ingestion of ${tweets.length} tweets for user ${userId}`);

    // Filter out tweets without injectedId
    const validTweets = tweets.filter((tweet) => {
      if (!tweet.injectedId) {
        errors.push('Tweet missing injectedId');
        return false;
      }
      return true;
    });

    if (validTweets.length === 0) {
      logger.warn('No valid tweets to ingest');
      return {
        stored: 0,
        totalUnique: await this.contentRepository.count({}),
        accepted: tweets.length,
        errors: errors.length > 0 ? errors : undefined,
        processingTime: Date.now() - startTime,
      };
    }

    // Batch check for existing content by platform content ID (injectedId)
    // Check each one individually since there's no bulk method
    const existingChecks = await Promise.all(
      validTweets.map(async (t) => {
        const existing = await this.contentRepository.findByPlatformContentId(
          PlatformId.twitter(),
          t.injectedId
        );
        return existing ? t.injectedId : null;
      })
    );
    const existingIds = new Set(existingChecks.filter((id): id is string => id !== null));

    logger.debug(`Found ${existingIds.size} existing content out of ${validTweets.length}`);

    // Filter out existing content
    const newTweets = validTweets.filter((tweet) => !existingIds.has(tweet.injectedId));

    if (newTweets.length === 0) {
      logger.info('All tweets already exist, skipping insertion');
      return {
        stored: 0,
        totalUnique: await this.contentRepository.count({}),
        accepted: tweets.length,
        skipped: existingIds.size,
        errors: errors.length > 0 ? errors : undefined,
        processingTime: Date.now() - startTime,
      };
    }

    // Generate batch ID for tracking
    const batchId = nanoid(12);
    logger.info(`Generated batch ID ${batchId} for ${newTweets.length} tweets`);

    // Convert DTOs to Content entities (unified format)
    const contentEntities = newTweets.map((tweetData) => {
      // Create Author entity
      const author = new Author(
        tweetData.user.handle || 'unknown',
        tweetData.user.name || 'Unknown',
        tweetData.user.handle || 'unknown',
        tweetData.user.avatar,
        undefined, // followerCount
        false // isVerified
      );

      // Create Metrics value object
      const metrics = Metrics.fromObject({
        likes: tweetData.metrics?.likes || 0,
        comments: tweetData.metrics?.replies || 0,
        shares: tweetData.metrics?.reposts || 0,
        views: tweetData.metrics?.views || 0,
      });

      // Generate URL if missing (backward compatibility)
      const contentUrl =
        tweetData.url ||
        `https://twitter.com/${tweetData.user.handle}/status/${tweetData.injectedId}`;

      // Map media to Content format - supports both string and object formats
      const media = [
        ...(tweetData.media?.images || []).map((img) => {
          if (typeof img === 'string') {
            return { type: 'image' as const, url: img };
          } else {
            return {
              type: 'image' as const,
              url: img.url,
              alt: img.alt,
            };
          }
        }),
        ...(tweetData.media?.videos || []).map((url) => ({ type: 'video' as const, url })),
        ...(tweetData.media?.gifs || []).map((url) => ({ type: 'gif' as const, url })),
      ];

      return Content.builder()
        .id(tweetData.injectedId)
        .platformId('twitter')
        .platformContentId(tweetData.injectedId)
        .text(tweetData.text || '')
        .author(author)
        .url(contentUrl)
        .createdAt(tweetData.scrapedAt ? new Date(tweetData.scrapedAt) : new Date())
        .metrics(metrics.toObject())
        .status(ContentStatus.PENDING_CATEGORIZATION) // Start with PENDING_CATEGORIZATION
        .media(media)
        .isReply(false)
        .isRepost(false)
        .isQuote(false)
        .batchId(batchId)
        .build();
    });

    try {
      // Create batch tracking record
      const batchEntity = Batch.builder()
        .id(`batch_${Date.now()}_${nanoid(8)}`)
        .batchId(batchId)
        .userId(userId)
        .totalTweets(newTweets.length)
        .currentStage(BatchStage.CLEANUP)
        .processedTweets(0)
        .failedTweets(0)
        .createdAt(new Date())
        .updatedAt(new Date())
        .build();

      await this.batchRepository.save(batchEntity);
      logger.info(`Created batch record ${batchId} for ${newTweets.length} tweets`);

      // Bulk insert content
      const insertedContent = await this.contentRepository.saveMany(contentEntities);

      logger.info(
        `Successfully inserted ${insertedContent.length} content items in batch ${batchId}`
      );

      // Queue categorization jobs for all inserted content (skip cleanup, go straight to processing)
      const queuePromises = insertedContent.map((content) =>
        this.queueService.addCategorizationJob(content.id.toString(), batchId).catch((error) => {
          logger.error(
            `Failed to queue categorization job for content ${content.id.toString()}:`,
            error
          );
        })
      );

      // Fire and forget (don't wait for all queue jobs to complete)
      Promise.all(queuePromises).catch((error) => {
        logger.error('Error queuing categorization jobs:', error);
      });

      const totalUnique = await this.contentRepository.count({});
      const processingTime = Date.now() - startTime;

      logger.info(
        `Batch ingestion completed: ${insertedContent.length} stored, ${processingTime}ms`
      );

      return {
        stored: insertedContent.length,
        totalUnique,
        accepted: tweets.length,
        skipped: existingIds.size,
        errors: errors.length > 0 ? errors : undefined,
        processingTime,
        batchId,
      };
    } catch (error: any) {
      logger.error('Failed to ingest tweet batch:', error);
      throw error;
    }
  }

  /**
   * Get ingestion statistics
   */
  async getIngestionStats(_userId: string): Promise<IngestionStats> {
    const total = await this.contentRepository.count({});

    // Get counts by status manually since there's no countByStatus method
    const byStatus: Record<string, number> = {};
    for (const status of Object.values(ContentStatus)) {
      const count = await this.contentRepository.count({ status });
      if (count > 0) {
        byStatus[status] = count;
      }
    }

    return {
      total,
      byStatus,
    };
  }
}
