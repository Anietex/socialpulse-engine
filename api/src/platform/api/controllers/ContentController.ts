/**
 * Content API Controller
 * Exposes ContentOrchestrationService through REST endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ContentOrchestrationService } from '../../application/services/ContentOrchestrationService';
import { PlatformService } from '../../application/services/PlatformService';
import { ContentId } from '../../core/value-objects/ContentId';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { ContentStatus } from '../../core/types/ContentStatus';
import {
  ScrapeContentRequestDto,
  ScrapeMultiPlatformRequestDto,
  ScrapeContentResponseDto,
  ScrapeMultiPlatformResponseDto,
  GetContentRequestDto,
  UpdateContentStatusRequestDto,
  GetContentStatsRequestDto,
  ContentStatsResponseDto,
  ContentResponseDto,
  ContentListResponseDto,
} from '../dto';

/**
 * ContentController class
 */
export class ContentController {
  constructor(
    private readonly orchestrationService: ContentOrchestrationService,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Scrape content from a single platform
   * POST /api/platform/content/scrape
   */
  async scrapeContent(
    req: Request<{}, {}, ScrapeContentRequestDto>,
    res: Response<ScrapeContentResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId, limit = 100, batchId } = req.body;

      // Get platform adapter
      const adapter = this.platformService.getPlatform(platformId);

      // Execute scraping
      const result = await this.orchestrationService.scrapeAndSaveContent(adapter, limit, batchId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Scrape content from multiple platforms
   * POST /api/platform/content/scrape-multiple
   */
  async scrapeMultiplePlatforms(
    req: Request<{}, {}, ScrapeMultiPlatformRequestDto>,
    res: Response<ScrapeMultiPlatformResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformIds, limitPerPlatform = 50, batchId } = req.body;

      // Get platform adapters
      const adapters = platformIds.map((id) => this.platformService.getPlatform(id));

      // Execute scraping
      const resultsMap = await this.orchestrationService.scrapeFromMultiplePlatforms(
        adapters,
        limitPerPlatform,
        batchId
      );

      // Convert Map to object for JSON response
      const results: Record<string, ScrapeContentResponseDto> = {};
      let successfulPlatforms = 0;
      let failedPlatforms = 0;
      let totalContentScraped = 0;
      let totalContentSaved = 0;

      for (const [platformId, result] of resultsMap) {
        results[platformId] = result;
        if (result.success) {
          successfulPlatforms++;
        } else {
          failedPlatforms++;
        }
        totalContentScraped += result.totalScraped;
        totalContentSaved += result.totalSaved;
      }

      const response: ScrapeMultiPlatformResponseDto = {
        results,
        summary: {
          totalPlatforms: platformIds.length,
          successfulPlatforms,
          failedPlatforms,
          totalContentScraped,
          totalContentSaved,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get content by ID
   * GET /api/platform/content/:contentId
   */
  async getContentById(
    req: Request<GetContentRequestDto>,
    res: Response<ContentResponseDto | { error: string }>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { contentId } = req.params;

      // Parse content ID
      const parsedId = ContentId.fromString(contentId);

      // Get content
      const content = await this.orchestrationService.getContent(parsedId);

      if (!content) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      // Convert to DTO
      const response: ContentResponseDto = {
        id: content.id.toString(),
        platformId: content.platformId.toString(),
        platformContentId: content.platformContentId,
        text: content.text,
        url: content.url,
        author: {
          id: content.author.id,
          displayName: content.author.name,
          username: content.author.handle,
          isVerified: content.author.isVerified(),
          followers: content.author.followerCount || 0,
        },
        metrics: {
          likes: content.metrics.getLikes(),
          comments: content.metrics.getComments(),
          shares: content.metrics.getShares(),
          views: content.metrics.getViews(),
        },
        status: content.status,
        engagementAction: content.engagementAction,
        category: content.category,
        rankScore: content.rankScore,
        createdAt: content.createdAt,
        processedAt: undefined, // TODO: Add processedAt to Content entity if needed
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get content by stage/status
   * GET /api/platform/content/by-stage/:status
   */
  async getContentByStage(
    req: Request<{ status: string }, {}, {}, { limit?: string }>,
    res: Response<ContentListResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = req.params.status as ContentStatus;
      const limit = parseInt(req.query.limit || '50', 10);

      // Get content
      const contentList = await this.orchestrationService.getContentForStage(status, limit);

      // Convert to DTOs
      const content: ContentResponseDto[] = contentList.map((item) => ({
        id: item.id.toString(),
        platformId: item.platformId.toString(),
        platformContentId: item.platformContentId,
        text: item.text,
        url: item.url,
        author: {
          id: item.author.id,
          displayName: item.author.name,
          username: item.author.handle,
          isVerified: item.author.isVerified(),
          followers: item.author.followerCount || 0,
        },
        metrics: {
          likes: item.metrics.getLikes(),
          comments: item.metrics.getComments(),
          shares: item.metrics.getShares(),
          views: item.metrics.getViews(),
        },
        status: item.status,
        engagementAction: item.engagementAction,
        category: item.category,
        rankScore: item.rankScore,
        createdAt: item.createdAt,
        processedAt: undefined, // TODO: Add processedAt to Content entity if needed
      }));

      const response: ContentListResponseDto = {
        content,
        total: content.length,
        page: 1,
        pageSize: limit,
        hasMore: content.length === limit,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update content statuses
   * PUT /api/platform/content/status
   */
  async updateContentStatuses(
    req: Request<{}, {}, UpdateContentStatusRequestDto>,
    res: Response<{ success: boolean; updatedCount: number }>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { contentIds, status } = req.body;

      // Parse content IDs
      const parsedIds = contentIds.map((id) => ContentId.fromString(id));

      // Update statuses
      await this.orchestrationService.updateContentStatuses(parsedIds, status);

      res.status(200).json({
        success: true,
        updatedCount: contentIds.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get content statistics
   * GET /api/platform/content/statistics
   */
  async getContentStatistics(
    req: Request<{}, {}, {}, GetContentStatsRequestDto>,
    res: Response<ContentStatsResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId } = req.query;

      // Parse platform ID if provided
      const parsedPlatformId = platformId ? PlatformId.fromString(platformId) : undefined;

      // Get statistics
      const stats = await this.orchestrationService.getContentStatistics(parsedPlatformId);

      // Convert Map to object
      const byStatus: Record<ContentStatus, number> = {} as Record<ContentStatus, number>;
      for (const [status, count] of stats.byStatus) {
        byStatus[status] = count;
      }

      const response: ContentStatsResponseDto = {
        total: stats.total,
        byStatus,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
