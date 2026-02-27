import { Content } from '../entities/Content';
import { ContentId } from '../../core/value-objects/ContentId';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { ContentStatus } from '../../core/types/ContentStatus';
import { ActionType } from '../../core/types/ActionType';

/**
 * Repository interface for Content persistence
 * Abstracts data access from domain logic (Repository Pattern)
 *
 * Benefits:
 * - Domain layer doesn't depend on infrastructure (Dependency Inversion)
 * - Easy to swap implementations (MongoDB, PostgreSQL, In-Memory)
 * - Easy to mock for testing
 * - Single place to define data access operations
 */
export interface IContentRepository {
  /**
   * Find content by ID
   * @param id Content identifier
   * @returns Content or null if not found
   */
  findById(id: ContentId): Promise<Content | null>;

  /**
   * Find multiple content by IDs
   * @param ids Array of content identifiers
   * @returns Array of found content (may be fewer than requested)
   */
  findByIds(ids: ContentId[]): Promise<Content[]>;

  /**
   * Find content by platform
   * @param platformId Platform to filter by
   * @param limit Maximum number of results
   * @returns Array of content from specified platform
   */
  findByPlatform(platformId: PlatformId, limit?: number): Promise<Content[]>;

  /**
   * Find content by status
   * @param status Status to filter by
   * @param limit Maximum number of results
   * @returns Array of content with specified status
   */
  findByStatus(status: ContentStatus, limit?: number): Promise<Content[]>;

  /**
   * Find content by platform and status
   * @param platformId Platform to filter by
   * @param status Status to filter by
   * @param limit Maximum number of results
   * @returns Array of matching content
   */
  findByPlatformAndStatus(
    platformId: PlatformId,
    status: ContentStatus,
    limit?: number
  ): Promise<Content[]>;

  /**
   * Find content ready for specific action
   * @param action Action type to filter by
   * @param limit Maximum number of results
   * @returns Array of content ready for this action
   */
  findReadyForAction(action: ActionType, limit?: number): Promise<Content[]>;

  /**
   * Find content in specific batch
   * @param batchId Batch identifier
   * @returns Array of content in this batch
   */
  findByBatchId(batchId: string): Promise<Content[]>;

  /**
   * Find content for ranking stage
   * @param batchId Batch identifier
   * @param limit Maximum number of results
   * @returns Array of content ready for ranking
   */
  findForRanking(batchId: string, limit?: number): Promise<Content[]>;

  /**
   * Find content for engagement determination stage
   * @param batchId Batch identifier
   * @param limit Maximum number of results
   * @returns Array of content ready for engagement determination
   */
  findForEngagement(batchId: string, limit?: number): Promise<Content[]>;

  /**
   * Find content for automation stage
   * @param batchId Batch identifier
   * @param limit Maximum number of results
   * @returns Array of content ready for automation
   */
  findForAutomation(batchId: string, limit?: number): Promise<Content[]>;

  /**
   * Find content in growth sweet spot
   * @param platformId Platform to filter by (optional)
   * @param limit Maximum number of results
   * @returns Array of content in growth sweet spot
   */
  findInGrowthSweetSpot(platformId?: PlatformId, limit?: number): Promise<Content[]>;

  /**
   * Find fresh content (recently created)
   * @param maxAgeHours Maximum age in hours
   * @param platformId Platform to filter by (optional)
   * @param limit Maximum number of results
   * @returns Array of fresh content
   */
  findFreshContent(
    maxAgeHours: number,
    platformId?: PlatformId,
    limit?: number
  ): Promise<Content[]>;

  /**
   * Save content (create or update)
   * @param content Content to save
   * @returns Saved content
   */
  save(content: Content): Promise<Content>;

  /**
   * Save multiple content items
   * @param content Array of content to save
   * @returns Array of saved content
   */
  saveMany(content: Content[]): Promise<Content[]>;

  /**
   * Update content status
   * @param id Content identifier
   * @param status New status
   */
  updateStatus(id: ContentId, status: ContentStatus): Promise<void>;

  /**
   * Update multiple statuses
   * @param ids Array of content identifiers
   * @param status New status for all
   */
  updateManyStatuses(ids: ContentId[], status: ContentStatus): Promise<void>;

  /**
   * Delete content
   * @param id Content identifier
   */
  delete(id: ContentId): Promise<void>;

  /**
   * Delete multiple content items
   * @param ids Array of content identifiers
   */
  deleteMany(ids: ContentId[]): Promise<void>;

  /**
   * Count content by criteria
   * @param criteria Filtering criteria
   * @returns Number of matching content items
   */
  count(criteria: ContentCountCriteria): Promise<number>;

  /**
   * Check if content exists
   * @param id Content identifier
   * @returns true if content exists
   */
  exists(id: ContentId): Promise<boolean>;

  /**
   * Find content by platform content ID (original ID from platform)
   * @param platformId Platform identifier
   * @param platformContentId Original content ID from platform
   * @returns Content or null if not found
   */
  findByPlatformContentId(
    platformId: PlatformId,
    platformContentId: string
  ): Promise<Content | null>;
}

/**
 * Criteria for counting content
 */
export interface ContentCountCriteria {
  platformId?: PlatformId;
  status?: ContentStatus;
  batchId?: string;
  engagementAction?: ActionType;
  category?: string;
  minRankScore?: number;
  maxAgeHours?: number;
}
