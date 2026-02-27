/**
 * Data Transfer Objects for Content API
 */

import { ContentStatus } from '../../core/types/ContentStatus';

/**
 * Request DTO for scraping content from a platform
 */
export interface ScrapeContentRequestDto {
  platformId: string;
  limit?: number;
  batchId?: string;
}

/**
 * Request DTO for scraping from multiple platforms
 */
export interface ScrapeMultiPlatformRequestDto {
  platformIds: string[];
  limitPerPlatform?: number;
  batchId?: string;
}

/**
 * Response DTO for content scraping operations
 */
export interface ScrapeContentResponseDto {
  success: boolean;
  totalScraped: number;
  totalNormalized: number;
  totalSaved: number;
  duplicates: number;
  errors: string[];
  newContentIds: string[];
}

/**
 * Response DTO for multi-platform scraping
 */
export interface ScrapeMultiPlatformResponseDto {
  results: Record<string, ScrapeContentResponseDto>;
  summary: {
    totalPlatforms: number;
    successfulPlatforms: number;
    failedPlatforms: number;
    totalContentScraped: number;
    totalContentSaved: number;
  };
}

/**
 * Request DTO for getting content by ID
 */
export interface GetContentRequestDto {
  contentId: string;
}

/**
 * Request DTO for getting content by stage/status
 */
export interface GetContentByStageRequestDto {
  status: ContentStatus;
  limit?: number;
}

/**
 * Request DTO for updating content statuses
 */
export interface UpdateContentStatusRequestDto {
  contentIds: string[];
  status: ContentStatus;
}

/**
 * Request DTO for getting content statistics
 */
export interface GetContentStatsRequestDto {
  platformId?: string;
}

/**
 * Response DTO for content statistics
 */
export interface ContentStatsResponseDto {
  total: number;
  byStatus: Record<ContentStatus, number>;
}

/**
 * Response DTO for content entity
 */
export interface ContentResponseDto {
  id: string;
  platformId: string;
  platformContentId: string;
  text: string;
  url: string;
  author: {
    id: string;
    displayName: string;
    username: string;
    isVerified: boolean;
    followers: number;
  };
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  status: ContentStatus;
  engagementAction?: string;
  category?: string;
  rankScore?: number;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Response DTO for paginated content list
 */
export interface ContentListResponseDto {
  content: ContentResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
