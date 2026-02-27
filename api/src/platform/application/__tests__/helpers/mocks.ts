/**
 * Mock objects for application service tests
 */
import { jest } from '@jest/globals';
import { Content } from '../../../domain/entities/Content';
import { Author } from '../../../domain/entities/Author';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { ActionType } from '../../../core/types/ActionType';
import { RawContent } from '../../../core/interfaces/IContentScraper';
import { NormalizedContent } from '../../../core/interfaces/IContentNormalizer';
import { ActionResult } from '../../../core/interfaces/IActionExecutor';
import { RateLimitStatus } from '../../../core/interfaces/IRateLimitProvider';

/**
 * Create a test Content entity
 */
export function createTestContent(
  overrides?: Partial<{
    id: string;
    platformId: string;
    platformContentId: string;
    text: string;
    status: ContentStatus;
    engagementAction: ActionType;
    category: string;
    rankScore: number;
  }>
): Content {
  const author = new Author(
    'author-1',
    'Test Author',
    'testauthor',
    undefined,
    undefined,
    false,
    1000
  );

  const platformId = overrides?.platformId || 'twitter';
  const platformContentId = overrides?.platformContentId || 'tweet-123';
  const contentId = overrides?.id || `${platformId}:${platformContentId}`;

  const builder = Content.builder()
    .id(contentId)
    .platformId(platformId)
    .platformContentId(platformContentId)
    .text(overrides?.text || 'Test tweet content')
    .author(author.toPlain())
    .url('https://twitter.com/test/status/123')
    .createdAt(new Date('2024-01-15T10:00:00Z'))
    .metrics({ likes: 10, comments: 5, shares: 2, views: 100 })
    .status(overrides?.status || ContentStatus.PENDING_CATEGORIZATION)
    .media([])
    .isReply(false)
    .isRepost(false)
    .isQuote(false);

  if (overrides?.engagementAction) {
    builder.engagementAction(overrides.engagementAction);
  }

  if (overrides?.category) {
    builder.category(overrides.category);
  }

  if (overrides?.rankScore !== undefined) {
    builder.rankScore(overrides.rankScore);
  }

  return builder.build();
}

/**
 * Create test RawContent
 */
export function createTestRawContent(id: string = 'tweet-123'): RawContent {
  return {
    id,
    text: 'Test tweet',
    author: {
      id: 'author-1',
      username: 'testuser',
      displayName: 'Test User',
      followers: 1000,
    },
    metrics: {
      likes: 10,
      retweets: 2,
      replies: 5,
      views: 100,
    },
    createdAt: '2024-01-15T10:00:00Z',
    url: `https://twitter.com/test/status/${id}`,
  };
}

/**
 * Create test NormalizedContent
 */
export function createTestNormalizedContent(id: string = 'tweet-123'): NormalizedContent {
  return {
    id,
    platformId: 'twitter',
    url: `https://twitter.com/test/status/${id}`,
    authorId: 'author-1',
    authorUsername: 'testuser',
    authorDisplayName: 'Test User',
    authorFollowers: 1000,
    authorIsVerified: false,
    text: 'Test tweet content',
    hasMedia: false,
    likes: 10,
    comments: 5,
    shares: 2,
    views: 100,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    isReply: false,
    isRepost: false,
    isQuote: false,
  };
}

/**
 * Mock ContentRepository
 */
export function createMockRepository(): any {
  return {
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByPlatform: jest.fn(),
    findByPlatformContentId: jest.fn(),
    findByStatus: jest.fn(),
    findByPlatformAndStatus: jest.fn(),
    findReadyForAction: jest.fn(),
    findForRanking: jest.fn(),
    findByBatchId: jest.fn(),
    findForEngagement: jest.fn(),
    save: jest.fn(),
    saveMany: jest.fn(),
    updateStatus: jest.fn(),
    updateManyStatuses: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

/**
 * Mock PlatformAdapter
 */
export function createMockAdapter(platformId: string = 'twitter'): any {
  return {
    platformId,
    scraper: {
      platformId,
      scrape: jest.fn(),
      isReady: jest.fn(),
    },
    authenticator: {
      platformId,
      authenticate: jest.fn(),
      isAuthenticated: jest.fn(),
      logout: jest.fn(),
      getAuthStatus: jest.fn(),
    },
    actionExecutor: {
      platformId,
      executeAction: jest.fn(),
      supportsAction: jest.fn(),
      getSupportedActions: jest.fn(),
    },
    rateLimits: {
      platformId,
      checkRateLimit: jest.fn(),
      getRateLimitStatus: jest.fn(),
      calculateDelay: jest.fn(),
      recordAction: jest.fn(),
      resetLimits: jest.fn(),
    },
    normalizer: {
      platformId,
      normalize: jest.fn(),
      normalizeMany: jest.fn(),
      canNormalize: jest.fn(),
    },
    getDisplayName: jest.fn().mockReturnValue('Twitter'),
    getCapabilities: jest.fn().mockReturnValue({
      scraping: true,
      rateLimits: {},
      mediaSupport: ['image', 'video'],
    }),
    isReady: jest.fn(() => Promise.resolve(true)) as any,
    getPlatformId: jest.fn().mockReturnValue(platformId),
  };
}

/**
 * Mock ContentService
 */
export function createMockContentService(): any {
  return {
    getContentForNextStage: jest.fn(),
    validateContent: jest.fn(),
    calculateGrowthScore: jest.fn(),
    shouldEngage: jest.fn(),
  };
}

/**
 * Mock PlatformRegistry
 */
export function createMockRegistry(): any {
  return {
    register: jest.fn(),
    get: jest.fn(),
    tryGet: jest.fn(),
    has: jest.fn(),
    getRegisteredPlatforms: jest.fn().mockReturnValue([]),
    getAll: jest.fn().mockReturnValue([]),
    getReadyPlatforms: jest.fn(() => Promise.resolve([])) as any,
    getPlatformsSupportingAction: jest.fn().mockReturnValue([]),
    checkAllReadiness: jest.fn(),
    unregister: jest.fn(),
    clear: jest.fn(),
    getCount: jest.fn().mockReturnValue(0),
  };
}

/**
 * Mock BrowserProvider
 */
export function createMockBrowserProvider(): any {
  return {
    createSession: jest.fn(),
    closeSession: jest.fn(),
    closeAll: jest.fn(),
    hasSession: jest.fn().mockReturnValue(false),
    getSession: jest.fn(),
    saveSessionState: jest.fn(),
    loadSessionState: jest.fn(),
    restartSession: jest.fn(),
    getActiveSessionCount: jest.fn().mockReturnValue(0),
    getActivePlatformIds: jest.fn().mockReturnValue([]),
  };
}

/**
 * Create successful ActionResult
 */
export function createSuccessActionResult(
  actionType: ActionType = ActionType.LIKE,
  contentId: string = 'twitter:tweet-1'
): ActionResult {
  return {
    success: true,
    actionType,
    contentId,
    executedAt: new Date(),
  };
}

/**
 * Create failed ActionResult
 */
export function createFailedActionResult(
  error: string,
  actionType: ActionType = ActionType.LIKE,
  contentId: string = 'twitter:tweet-1'
): ActionResult {
  return {
    success: false,
    error,
    actionType,
    contentId,
    executedAt: new Date(),
  };
}

/**
 * Create RateLimitStatus
 */
export function createRateLimitStatus(isLimited: boolean = false): RateLimitStatus {
  return {
    actionType: ActionType.LIKE,
    actionsRemaining: isLimited ? 0 : 100,
    resetAt: new Date(Date.now() + 3600000),
    isLimited,
  };
}

/**
 * Mock LLM Service
 */
export function createMockLLMService(): any {
  return {
    generateReply: jest.fn().mockImplementation(async () => ({
      text: 'Generated reply text',
      model: 'gpt-4o-mini',
      tokensUsed: 50,
      generatedAt: new Date(),
      isFallback: false,
    })),
    generateQuote: jest.fn().mockImplementation(async () => ({
      text: 'Generated quote text',
      model: 'gpt-4o-mini',
      tokensUsed: 50,
      generatedAt: new Date(),
      isFallback: false,
    })),
    generateForAction: jest.fn().mockImplementation(async () => ({
      text: 'Generated text',
      model: 'gpt-4o-mini',
      tokensUsed: 50,
      generatedAt: new Date(),
      isFallback: false,
    })),
    isAvailable: jest.fn().mockImplementation(async () => true),
    getHealth: jest.fn().mockImplementation(async () => ({
      available: true,
      provider: 'mock',
      error: undefined,
    })),
  };
}
