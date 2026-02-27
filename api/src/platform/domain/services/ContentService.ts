import { Content } from '../entities/Content';
import { IContentRepository } from '../repositories/IContentRepository';
import { ContentStatus, ContentStatusUtils } from '../../core/types/ContentStatus';
import { ContentId } from '../../core/value-objects/ContentId';
import { PlatformId } from '../../core/value-objects/PlatformId';

/**
 * Domain service for content operations
 * Contains business logic that doesn't fit in entities or involves multiple entities
 *
 * Why Domain Service:
 * - Status transitions involve validation rules across the system
 * - Growth scoring involves complex calculations
 * - Batch operations coordin ate multiple entities
 */
export class ContentService {
  constructor(private readonly contentRepository: IContentRepository) {}

  /**
   * Transition content to new status with validation
   * Ensures only valid transitions are allowed
   */
  async transitionStatus(contentId: ContentId, newStatus: ContentStatus): Promise<void> {
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId.toString()}`);
    }

    // Check if transition is valid
    const nextStatus = ContentStatusUtils.getNextStatus(content.status);
    if (nextStatus !== newStatus) {
      throw new Error(
        `Invalid status transition: ${content.status} -> ${newStatus}. Expected: ${nextStatus}`
      );
    }

    await this.contentRepository.updateStatus(contentId, newStatus);
  }

  /**
   * Get content ready for next processing stage
   */
  async getContentForNextStage(
    currentStatus: ContentStatus,
    limit: number = 100
  ): Promise<Content[]> {
    return this.contentRepository.findByStatus(currentStatus, limit);
  }

  /**
   * Get content ready for categorization
   */
  async getContentForCategorization(batchId: string, limit: number = 100): Promise<Content[]> {
    const allContent = await this.contentRepository.findByBatchId(batchId);
    return allContent.filter((c) => c.canBeCategorized()).slice(0, limit);
  }

  /**
   * Get content ready for ranking
   */
  async getContentForRanking(batchId: string, limit: number = 100): Promise<Content[]> {
    return this.contentRepository.findForRanking(batchId, limit);
  }

  /**
   * Get content ready for engagement determination
   */
  async getContentForEngagementDetermination(
    batchId: string,
    limit: number = 100
  ): Promise<Content[]> {
    return this.contentRepository.findForEngagement(batchId, limit);
  }

  /**
   * Get content ready for automation
   */
  async getContentForAutomation(batchId: string, limit: number = 100): Promise<Content[]> {
    return this.contentRepository.findForAutomation(batchId, limit);
  }

  /**
   * Calculate growth score for content
   *
   * Growth score algorithm:
   * - Comment sweet spot (10-50 comments = highest score)
   * - Engagement ratio (engagement / views)
   * - Anti-viral penalty (too much engagement = likely viral, skip)
   *
   * Scoring:
   * - 0-30: Low quality or too viral
   * - 31-60: Medium quality
   * - 61-100: High quality, good for engagement
   */
  calculateGrowthScore(content: Content): number {
    const metrics = content.metrics;

    // Comment sweet spot scoring (50% weight)
    let commentScore = 0;
    const comments = metrics.getComments();

    if (comments < 10) {
      // Ramp up score as we approach sweet spot
      commentScore = comments * 10;
    } else if (comments <= 50) {
      // Sweet spot - max score
      commentScore = 100;
    } else if (comments <= 200) {
      // Declining from sweet spot
      commentScore = 100 - ((comments - 50) / 150) * 40;
    } else {
      // Too many comments - likely viral, apply heavy penalty
      const penalty = Math.min(((comments - 200) / 100) * 30, 30);
      commentScore = Math.max(30, 60 - penalty);
    }

    // Engagement ratio scoring (30% weight)
    const engagementRatio = metrics.getEngagementRate();
    const ratioScore = Math.min(engagementRatio * 100 * 50, 100);

    // Anti-viral scoring (20% weight)
    // Penalize content that's too popular (likely already viral)
    let antiViralScore = 100;
    const likes = metrics.getLikes();

    if (comments > 500 || likes > 50000) {
      // Definitely viral - skip
      antiViralScore = 0;
    } else if (comments > 200 || likes > 20000) {
      // Probably viral - low score
      antiViralScore = 40;
    } else if (comments > 100 || likes > 10000) {
      // Getting popular - medium penalty
      antiViralScore = 70;
    }

    // Weighted final score
    const finalScore = commentScore * 0.5 + ratioScore * 0.3 + antiViralScore * 0.2;

    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  /**
   * Determine if content should be automated
   *
   * Criteria:
   * - Must be in correct status
   * - Must have engagement action assigned
   * - Must have rank score >= 50 (high quality)
   */
  shouldAutomateContent(content: Content): boolean {
    return (
      content.shouldAutomate() && content.rankScore !== undefined && content.rankScore >= 50 // Only automate high-quality content
    );
  }

  /**
   * Find content in growth sweet spot by platform
   */
  async findGrowthOpportunities(platformId: PlatformId, limit: number = 50): Promise<Content[]> {
    return this.contentRepository.findInGrowthSweetSpot(platformId, limit);
  }

  /**
   * Find fresh, high-quality content for engagement
   */
  async findFreshQualityContent(
    platformId: PlatformId,
    maxAgeHours: number = 24,
    limit: number = 50
  ): Promise<Content[]> {
    const freshContent = await this.contentRepository.findFreshContent(
      maxAgeHours,
      platformId,
      limit * 2 // Get more to filter
    );

    // Filter for quality and growth sweet spot
    return freshContent
      .filter((c) => {
        const score = this.calculateGrowthScore(c);
        return score >= 60 && c.isInGrowthSweetSpot();
      })
      .slice(0, limit);
  }

  /**
   * Batch update content statuses
   */
  async batchUpdateStatus(contentIds: ContentId[], newStatus: ContentStatus): Promise<void> {
    // Validate all transitions are valid
    const contents = await this.contentRepository.findByIds(contentIds);

    for (const content of contents) {
      const nextStatus = ContentStatusUtils.getNextStatus(content.status);
      if (nextStatus !== newStatus) {
        throw new Error(
          `Invalid status transition for content ${content.id.toString()}: ${content.status} -> ${newStatus}`
        );
      }
    }

    // All valid - update
    await this.contentRepository.updateManyStatuses(contentIds, newStatus);
  }

  /**
   * Check if content exists by platform content ID
   * Useful for deduplication during ingestion
   */
  async contentExists(platformId: PlatformId, platformContentId: string): Promise<boolean> {
    const content = await this.contentRepository.findByPlatformContentId(
      platformId,
      platformContentId
    );
    return content !== null;
  }

  /**
   * Get statistics for a batch
   */
  async getBatchStatistics(batchId: string): Promise<BatchStatistics> {
    const allContent = await this.contentRepository.findByBatchId(batchId);

    const stats: BatchStatistics = {
      total: allContent.length,
      byStatus: {},
      byCategory: {},
      averageRankScore: 0,
      inGrowthSweetSpot: 0,
      readyForAutomation: 0,
    };

    let totalRankScore = 0;
    let rankedCount = 0;

    for (const content of allContent) {
      // Count by status
      const status = content.status;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by category
      if (content.category) {
        stats.byCategory[content.category] = (stats.byCategory[content.category] || 0) + 1;
      }

      // Track rank scores
      if (content.rankScore !== undefined) {
        totalRankScore += content.rankScore;
        rankedCount++;
      }

      // Track growth sweet spot
      if (content.isInGrowthSweetSpot()) {
        stats.inGrowthSweetSpot++;
      }

      // Track automation ready
      if (this.shouldAutomateContent(content)) {
        stats.readyForAutomation++;
      }
    }

    // Calculate average rank score
    if (rankedCount > 0) {
      stats.averageRankScore = Math.round(totalRankScore / rankedCount);
    }

    return stats;
  }
}

/**
 * Batch statistics interface
 */
export interface BatchStatistics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  averageRankScore: number;
  inGrowthSweetSpot: number;
  readyForAutomation: number;
}
