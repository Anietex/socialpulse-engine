# Platform Abstraction Refactor - Implementation Guide

## 📋 Overview

**Goal:** Refactor the Twitter-specific automation system into a platform-agnostic architecture that can support multiple social media platforms (Twitter, LinkedIn, Reddit, Instagram, etc.) while following SOLID principles and avoiding anti-patterns.

**Current State:** Tightly coupled to Twitter with hardcoded models, selectors, and workflows.

**Target State:** Clean architecture with platform adapters, separated concerns, and reusable components.

**Estimated Timeline:** 12-15 days for complete refactor

**Key Principles:**
- SOLID compliance (especially Interface Segregation and Single Responsibility)
- Strategy pattern for actions
- Repository pattern for data access
- Command pattern for operations
- Event-driven architecture for worker decoupling
- Type safety throughout

---

## 🗂️ Project Structure (Target)

```
api/src/
├── platform/
│   ├── core/                           # Core abstractions (Phase 1)
│   │   ├── interfaces/
│   │   │   ├── IContentScraper.ts
│   │   │   ├── IAuthenticator.ts
│   │   │   ├── IActionExecutor.ts
│   │   │   ├── IRateLimitProvider.ts
│   │   │   └── IContentNormalizer.ts
│   │   ├── commands/
│   │   │   ├── ICommand.ts
│   │   │   ├── ScrapeContentCommand.ts
│   │   │   └── ExecuteActionCommand.ts
│   │   ├── value-objects/
│   │   │   ├── ContentId.ts
│   │   │   ├── Metrics.ts
│   │   │   └── PlatformId.ts
│   │   └── types/
│   │       ├── ActionType.ts
│   │       ├── ContentStatus.ts
│   │       └── Platform.ts
│   ├── domain/                         # Domain models (Phase 2)
│   │   ├── entities/
│   │   │   ├── Content.ts
│   │   │   └── Author.ts
│   │   ├── repositories/
│   │   │   └── IContentRepository.ts
│   │   └── services/
│   │       └── ContentService.ts
│   ├── adapters/                       # Platform implementations (Phase 3)
│   │   ├── twitter/
│   │   │   ├── TwitterScraper.ts
│   │   │   ├── TwitterAuthenticator.ts
│   │   │   ├── TwitterActionExecutor.ts
│   │   │   ├── actions/
│   │   │   │   ├── TwitterLikeAction.ts
│   │   │   │   ├── TwitterReplyAction.ts
│   │   │   │   ├── TwitterRetweetAction.ts
│   │   │   │   └── TwitterQuoteAction.ts
│   │   │   ├── TwitterSelectors.ts
│   │   │   ├── TwitterAdapter.ts
│   │   │   └── twitter.config.ts
│   │   └── [future platforms]
│   ├── infrastructure/                 # Infrastructure (Phase 4)
│   │   ├── persistence/
│   │   │   ├── MongoContentRepository.ts
│   │   │   └── MongoPlatformConfigRepository.ts
│   │   └── browser/
│   │       └── BrowserProvider.ts
│   └── application/                    # Application services (Phase 5)
│       ├── PlatformRegistry.ts
│       ├── AutomationOrchestrator.ts
│       └── ContentWorkflowService.ts
├── shared/
│   └── database/
│       └── models/
│           ├── Content.model.ts        # Migrated from Tweet
│           └── PlatformConfig.model.ts
└── modules/
    ├── ingestion/                      # Updated (Phase 6)
    ├── automation/                     # Updated (Phase 6)
    └── llm/                            # Updated (Phase 7)
```

---

## 📅 Phase 1: Core Abstractions & Interfaces (Days 1-2)

### Task 1.1: Create Core Interfaces

**File:** `api/src/platform/core/interfaces/IContentScraper.ts`

**Description:** Define the contract for scraping content from any platform.

**Implementation:**
```typescript
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
```

**Test Requirements:**
- Mock scraper should implement interface
- Verify all methods are called correctly
- Test error handling

---

**File:** `api/src/platform/core/interfaces/IAuthenticator.ts`

**Description:** Handle authentication for different platforms.

**Implementation:**
```typescript
import { ICredentials } from '../types/Credentials';

/**
 * Interface for platform authentication
 * Handles login, session management, and auth verification
 */
export interface IAuthenticator {
  /**
   * Authenticate with the platform
   * @param credentials Platform-specific credentials
   * @throws AuthenticationError if authentication fails
   */
  authenticate(credentials: ICredentials): Promise<void>;

  /**
   * Check if currently authenticated
   * @returns true if session is valid
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Logout from the platform
   */
  logout(): Promise<void>;

  /**
   * Get current session info
   */
  getSessionInfo(): Promise<SessionInfo | null>;
}

export interface SessionInfo {
  userId: string;
  username: string;
  expiresAt?: Date;
  platformData?: Record<string, any>;
}
```

---

**File:** `api/src/platform/core/interfaces/IActionExecutor.ts`

**Description:** Execute actions (like, comment, share) on content.

**Implementation:**
```typescript
import { ActionType } from '../types/ActionType';
import { IActionStrategy } from './IActionStrategy';

/**
 * Interface for executing actions on content
 * Uses strategy pattern for platform-specific implementations
 */
export interface IActionExecutor {
  /**
   * Get all actions supported by this platform
   */
  getSupportedActions(): IActionStrategy[];

  /**
   * Check if an action is supported
   */
  supportsAction(action: ActionType): boolean;

  /**
   * Execute an action on content
   * @throws UnsupportedActionError if action not supported
   * @throws ActionExecutionError if execution fails
   */
  execute(contentId: string, action: ActionType, data?: any): Promise<void>;

  /**
   * Get the action strategy for a specific action
   */
  getActionStrategy(action: ActionType): IActionStrategy | null;
}
```

---

**File:** `api/src/platform/core/interfaces/IActionStrategy.ts`

**Description:** Strategy interface for individual actions.

**Implementation:**
```typescript
import { Page } from 'playwright';
import { ActionType } from '../types/ActionType';

/**
 * Strategy interface for individual platform actions
 * Each action (like, comment, share) implements this
 */
export interface IActionStrategy {
  /**
   * Unique action identifier
   */
  readonly name: ActionType;

  /**
   * Human-readable display name
   */
  readonly displayName: string;

  /**
   * Platform-specific action name (e.g., "retweet" for Twitter, "repost" for LinkedIn)
   */
  readonly platformActionName: string;

  /**
   * Check if this action can be executed
   * @param page Playwright page instance
   * @param contentId Content identifier
   */
  canExecute(page: Page, contentId: string): Promise<boolean>;

  /**
   * Execute the action
   * @param page Playwright page instance
   * @param contentId Content identifier
   * @param data Optional action-specific data (e.g., reply text)
   */
  execute(page: Page, contentId: string, data?: any): Promise<void>;

  /**
   * Verify the action was successful
   */
  verify(page: Page, contentId: string): Promise<boolean>;
}
```

---

**File:** `api/src/platform/core/interfaces/IRateLimitProvider.ts`

**Description:** Provide platform-specific rate limit information.

**Implementation:**
```typescript
import { ActionType } from '../types/ActionType';

/**
 * Interface for rate limit management
 */
export interface IRateLimitProvider {
  /**
   * Get rate limits for the platform
   */
  getRateLimits(): IRateLimits;

  /**
   * Check if an action would exceed rate limits
   * @param action Action to check
   * @returns true if action can be performed
   */
  canPerformAction(action: ActionType): Promise<boolean>;

  /**
   * Record that an action was performed (for tracking)
   */
  recordAction(action: ActionType): Promise<void>;

  /**
   * Get remaining actions for a specific type
   */
  getRemainingActions(action: ActionType): Promise<number>;

  /**
   * Reset rate limit counters (typically after time window)
   */
  reset(): Promise<void>;
}

export interface IRateLimits {
  [ActionType.LIKE]: RateLimitConfig;
  [ActionType.COMMENT]: RateLimitConfig;
  [ActionType.SHARE]: RateLimitConfig;
  [ActionType.QUOTE]: RateLimitConfig;
}

export interface RateLimitConfig {
  maxPerHour: number;
  maxPerDay: number;
  minIntervalMs: number; // Minimum time between actions
}
```

---

**File:** `api/src/platform/core/interfaces/IContentNormalizer.ts`

**Description:** Transform platform-specific data to universal format.

**Implementation:**
```typescript
import { RawContent } from './IContentScraper';
import { Content } from '../../domain/entities/Content';

/**
 * Interface for normalizing platform-specific content
 * Transforms raw scraped data into universal Content entity
 */
export interface IContentNormalizer {
  /**
   * Normalize raw content to universal format
   * @param raw Platform-specific raw content
   * @returns Normalized Content entity
   * @throws NormalizationError if data is invalid
   */
  normalize(raw: RawContent): Content;

  /**
   * Validate raw content before normalization
   */
  validate(raw: RawContent): boolean;

  /**
   * Extract text from content (including alt text from images)
   */
  extractText(raw: RawContent): string;

  /**
   * Extract media from content
   */
  extractMedia(raw: RawContent): MediaItem[];
}

export interface MediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  alt?: string;
  thumbnailUrl?: string;
}
```

---

### Task 1.2: Create Value Objects

**File:** `api/src/platform/core/value-objects/ContentId.ts`

**Description:** Type-safe content identifier.

**Implementation:**
```typescript
/**
 * Value object for Content ID
 * Ensures ID validity and provides type safety
 */
export class ContentId {
  private readonly _value: string;

  constructor(value: string) {
    if (!ContentId.isValid(value)) {
      throw new Error(`Invalid ContentId: ${value}`);
    }
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: ContentId): boolean {
    return this._value === other._value;
  }

  static isValid(value: string): boolean {
    // MongoDB ObjectId: 24 hex characters
    return /^[a-f\d]{24}$/i.test(value);
  }

  static fromString(value: string): ContentId {
    return new ContentId(value);
  }
}
```

**Test Requirements:**
- Valid IDs should construct successfully
- Invalid IDs should throw errors
- Equality should work correctly
- toString() should return original value

---

**File:** `api/src/platform/core/value-objects/PlatformId.ts`

**Description:** Type-safe platform identifier.

**Implementation:**
```typescript
/**
 * Supported platforms
 */
export enum Platform {
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  REDDIT = 'reddit',
  INSTAGRAM = 'instagram',
}

/**
 * Value object for Platform ID
 * Ensures only valid platforms are used
 */
export class PlatformId {
  private constructor(private readonly _value: Platform) {}

  get value(): Platform {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: PlatformId): boolean {
    return this._value === other._value;
  }

  isTwitter(): boolean {
    return this._value === Platform.TWITTER;
  }

  isLinkedIn(): boolean {
    return this._value === Platform.LINKEDIN;
  }

  isReddit(): boolean {
    return this._value === Platform.REDDIT;
  }

  isInstagram(): boolean {
    return this._value === Platform.INSTAGRAM;
  }

  static fromString(value: string): PlatformId {
    if (!Object.values(Platform).includes(value as Platform)) {
      throw new Error(`Invalid platform: ${value}`);
    }
    return new PlatformId(value as Platform);
  }

  static twitter(): PlatformId {
    return new PlatformId(Platform.TWITTER);
  }

  static linkedin(): PlatformId {
    return new PlatformId(Platform.LINKEDIN);
  }

  static reddit(): PlatformId {
    return new PlatformId(Platform.REDDIT);
  }

  static instagram(): PlatformId {
    return new PlatformId(Platform.INSTAGRAM);
  }

  static all(): PlatformId[] {
    return Object.values(Platform).map(p => new PlatformId(p));
  }
}
```

---

**File:** `api/src/platform/core/value-objects/Metrics.ts`

**Description:** Content engagement metrics value object.

**Implementation:**
```typescript
/**
 * Value object for content engagement metrics
 * Validates metrics and provides computed properties
 */
export class Metrics {
  constructor(
    public readonly likes: number,
    public readonly shares: number,
    public readonly comments: number,
    public readonly views: number = 0,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.likes < 0) throw new Error('Likes cannot be negative');
    if (this.shares < 0) throw new Error('Shares cannot be negative');
    if (this.comments < 0) throw new Error('Comments cannot be negative');
    if (this.views < 0) throw new Error('Views cannot be negative');
  }

  /**
   * Total engagement (likes + shares + comments)
   */
  get totalEngagement(): number {
    return this.likes + this.shares + this.comments;
  }

  /**
   * Engagement rate (engagement / views)
   */
  get engagementRate(): number {
    return this.views > 0 ? this.totalEngagement / this.views : 0;
  }

  /**
   * Check if content has high engagement
   */
  isHighEngagement(threshold: number = 1000): boolean {
    return this.totalEngagement > threshold;
  }

  /**
   * Check if content is in sweet spot for growth (10-50 comments)
   */
  isInGrowthSweetSpot(): boolean {
    return this.comments >= 10 && this.comments <= 50;
  }

  /**
   * Create Metrics from plain object
   */
  static fromPlain(data: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
  }): Metrics {
    return new Metrics(data.likes, data.shares, data.comments, data.views);
  }

  /**
   * Convert to plain object for serialization
   */
  toPlain(): {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  } {
    return {
      likes: this.likes,
      shares: this.shares,
      comments: this.comments,
      views: this.views,
    };
  }

  equals(other: Metrics): boolean {
    return (
      this.likes === other.likes &&
      this.shares === other.shares &&
      this.comments === other.comments &&
      this.views === other.views
    );
  }
}
```

---

### Task 1.3: Create Core Types & Enums

**File:** `api/src/platform/core/types/ActionType.ts`

**Description:** Universal action types.

**Implementation:**
```typescript
/**
 * Universal action types across all platforms
 */
export enum ActionType {
  LIKE = 'like',       // Universal "like" (Twitter: like, LinkedIn: like, Reddit: upvote)
  COMMENT = 'comment', // Universal "comment" (Twitter: reply, LinkedIn: comment, Reddit: comment)
  SHARE = 'share',     // Universal "share" (Twitter: retweet, LinkedIn: repost, Reddit: crosspost)
  QUOTE = 'quote',     // Quote with commentary (Twitter: quote tweet, LinkedIn: repost with thoughts)
  IGNORE = 'ignore',   // No action
}

/**
 * Action metadata for display and configuration
 */
export interface ActionMetadata {
  type: ActionType;
  displayName: string;
  description: string;
  requiresInput: boolean; // e.g., comment/quote need text input
}

export const ACTION_METADATA: Record<ActionType, ActionMetadata> = {
  [ActionType.LIKE]: {
    type: ActionType.LIKE,
    displayName: 'Like',
    description: 'Express approval or agreement',
    requiresInput: false,
  },
  [ActionType.COMMENT]: {
    type: ActionType.COMMENT,
    displayName: 'Comment',
    description: 'Add a comment or reply',
    requiresInput: true,
  },
  [ActionType.SHARE]: {
    type: ActionType.SHARE,
    displayName: 'Share',
    description: 'Share content without commentary',
    requiresInput: false,
  },
  [ActionType.QUOTE]: {
    type: ActionType.QUOTE,
    displayName: 'Quote',
    description: 'Share with added commentary',
    requiresInput: true,
  },
  [ActionType.IGNORE]: {
    type: ActionType.IGNORE,
    displayName: 'Ignore',
    description: 'No action',
    requiresInput: false,
  },
};
```

---

**File:** `api/src/platform/core/types/ContentStatus.ts`

**Description:** Content processing status (renamed from TweetStatus).

**Implementation:**
```typescript
/**
 * Content processing status through the pipeline
 */
export enum ContentStatus {
  INGESTED = 'ingested',                   // Just scraped
  CLEANED = 'cleaned',                     // Text cleaned, OCR processed
  CATEGORIZED = 'categorized',             // Category assigned
  RANKED = 'ranked',                       // Quality score assigned
  ENGAGEMENT_DETERMINED = 'engagement_determined', // Action decided
  AUTOMATED = 'automated',                 // Action executed
  FAILED = 'failed',                       // Processing failed
}

/**
 * Status transition map - defines valid transitions
 */
export const STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  [ContentStatus.INGESTED]: [ContentStatus.CLEANED, ContentStatus.FAILED],
  [ContentStatus.CLEANED]: [ContentStatus.CATEGORIZED, ContentStatus.FAILED],
  [ContentStatus.CATEGORIZED]: [ContentStatus.RANKED, ContentStatus.FAILED],
  [ContentStatus.RANKED]: [ContentStatus.ENGAGEMENT_DETERMINED, ContentStatus.FAILED],
  [ContentStatus.ENGAGEMENT_DETERMINED]: [ContentStatus.AUTOMATED, ContentStatus.FAILED],
  [ContentStatus.AUTOMATED]: [],
  [ContentStatus.FAILED]: [],
};

/**
 * Check if status transition is valid
 */
export function isValidTransition(from: ContentStatus, to: ContentStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
```

---

### Task 1.4: Create Command Pattern Infrastructure

**File:** `api/src/platform/core/commands/ICommand.ts`

**Description:** Command pattern interface.

**Implementation:**
```typescript
/**
 * Command pattern interface
 * Encapsulates operations as first-class objects
 */
export interface ICommand<TResult = void> {
  /**
   * Execute the command
   */
  execute(): Promise<TResult>;

  /**
   * Undo the command (optional)
   */
  undo?(): Promise<void>;

  /**
   * Validate command can be executed (optional)
   */
  validate?(): Promise<boolean>;

  /**
   * Get command name for logging
   */
  getName(): string;
}

/**
 * Command execution result
 */
export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  executedAt: Date;
}
```

---

**File:** `api/src/platform/core/commands/ScrapeContentCommand.ts`

**Description:** Command for scraping content.

**Implementation:**
```typescript
import { ICommand } from './ICommand';
import { IContentScraper } from '../interfaces/IContentScraper';
import { IContentNormalizer } from '../interfaces/IContentNormalizer';
import { Content } from '../../domain/entities/Content';
import { logger } from '../../../config/logger';

/**
 * Command to scrape and normalize content from a platform
 */
export class ScrapeContentCommand implements ICommand<Content[]> {
  constructor(
    private readonly scraper: IContentScraper,
    private readonly normalizer: IContentNormalizer,
  ) {}

  getName(): string {
    return `ScrapeContent[${this.scraper.platformId}]`;
  }

  async validate(): Promise<boolean> {
    const isReady = await this.scraper.isReady();
    if (!isReady) {
      logger.warn(`${this.getName()}: Scraper not ready`);
      return false;
    }
    return true;
  }

  async execute(): Promise<Content[]> {
    logger.info(`${this.getName()}: Starting content scrape`);

    // Scrape raw content
    const rawContent = await this.scraper.scrape();
    logger.info(`${this.getName()}: Scraped ${rawContent.length} items`);

    // Normalize each item
    const normalizedContent: Content[] = [];
    for (const raw of rawContent) {
      try {
        if (this.normalizer.validate(raw)) {
          const content = this.normalizer.normalize(raw);
          normalizedContent.push(content);
        } else {
          logger.warn(`${this.getName()}: Invalid raw content, skipping`, { id: raw.id });
        }
      } catch (error) {
        logger.error(`${this.getName()}: Failed to normalize content`, { error, raw });
      }
    }

    logger.info(`${this.getName()}: Normalized ${normalizedContent.length} items`);
    return normalizedContent;
  }
}
```

---

**File:** `api/src/platform/core/commands/ExecuteActionCommand.ts`

**Description:** Command for executing actions.

**Implementation:**
```typescript
import { ICommand } from './ICommand';
import { IActionExecutor } from '../interfaces/IActionExecutor';
import { ActionType } from '../types/ActionType';
import { logger } from '../../../config/logger';

/**
 * Command to execute an action on content
 */
export class ExecuteActionCommand implements ICommand<void> {
  constructor(
    private readonly executor: IActionExecutor,
    private readonly contentId: string,
    private readonly action: ActionType,
    private readonly data?: any,
  ) {}

  getName(): string {
    return `ExecuteAction[${this.action}:${this.contentId}]`;
  }

  async validate(): Promise<boolean> {
    if (!this.executor.supportsAction(this.action)) {
      logger.warn(`${this.getName()}: Action not supported`);
      return false;
    }
    return true;
  }

  async execute(): Promise<void> {
    if (!await this.validate()) {
      throw new Error(`${this.getName()}: Validation failed`);
    }

    logger.info(`${this.getName()}: Executing action`);
    await this.executor.execute(this.contentId, this.action, this.data);
    logger.info(`${this.getName()}: Action executed successfully`);
  }
}
```

---

### Task 1.5: Create Custom Errors

**File:** `api/src/platform/core/errors/PlatformErrors.ts`

**Description:** Platform-specific error classes.

**Implementation:**
```typescript
/**
 * Base error for all platform-related errors
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly platformId?: string,
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

export class ScrapingError extends PlatformError {
  constructor(message: string, platformId: string) {
    super(message, 'SCRAPING_ERROR', platformId);
    this.name = 'ScrapingError';
  }
}

export class AuthenticationError extends PlatformError {
  constructor(message: string, platformId: string) {
    super(message, 'AUTH_ERROR', platformId);
    this.name = 'AuthenticationError';
  }
}

export class ActionExecutionError extends PlatformError {
  constructor(message: string, platformId: string, public readonly action: string) {
    super(message, 'ACTION_ERROR', platformId);
    this.name = 'ActionExecutionError';
  }
}

export class UnsupportedActionError extends PlatformError {
  constructor(action: string, platformId: string) {
    super(`Action '${action}' not supported on platform '${platformId}'`, 'UNSUPPORTED_ACTION', platformId);
    this.name = 'UnsupportedActionError';
  }
}

export class NormalizationError extends PlatformError {
  constructor(message: string, platformId: string) {
    super(message, 'NORMALIZATION_ERROR', platformId);
    this.name = 'NormalizationError';
  }
}

export class RateLimitExceededError extends PlatformError {
  constructor(action: string, platformId: string, public readonly retryAfter?: Date) {
    super(`Rate limit exceeded for action '${action}'`, 'RATE_LIMIT', platformId);
    this.name = 'RateLimitExceededError';
  }
}
```

---

### Task 1.6: Phase 1 Testing

**Test File:** `api/src/platform/core/__tests__/value-objects.test.ts`

**Description:** Unit tests for value objects.

**Test Cases:**
- ContentId validation and equality
- PlatformId factory methods and type checking
- Metrics calculations and validation
- Error throwing for invalid inputs

---

**Test File:** `api/src/platform/core/__tests__/commands.test.ts`

**Description:** Unit tests for commands.

**Test Cases:**
- ScrapeContentCommand with mock scraper/normalizer
- ExecuteActionCommand with mock executor
- Command validation logic
- Error handling in commands

---

## 📅 Phase 2: Domain Layer (Days 3-4)

### Task 2.1: Create Content Entity

**File:** `api/src/platform/domain/entities/Content.ts`

**Description:** Rich domain entity for content (replaces anemic Tweet model).

**Implementation:**
```typescript
import { ContentId } from '../../core/value-objects/ContentId';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { Metrics } from '../../core/value-objects/Metrics';
import { ContentStatus } from '../../core/types/ContentStatus';
import { ActionType } from '../../core/types/ActionType';
import { Author } from './Author';

/**
 * Rich domain entity for content
 * Contains business logic and validation
 */
export class Content {
  private constructor(
    public readonly id: ContentId,
    public readonly platformId: PlatformId,
    public readonly platformContentId: string,
    public readonly text: string,
    public readonly author: Author,
    public readonly url: string,
    public readonly createdAt: Date,
    public readonly metrics: Metrics,
    public readonly status: ContentStatus,
    public readonly media: MediaItem[],
    public readonly category?: string,
    public readonly rankScore?: number,
    public readonly engagementAction?: ActionType,
    public readonly cleanedText?: string,
    public readonly textWithDescriptions?: string,
    public readonly platformData?: Record<string, any>,
  ) {}

  /**
   * Check if content is ready for categorization
   */
  canBeCategorized(): boolean {
    return this.status === ContentStatus.CLEANED && !!this.cleanedText;
  }

  /**
   * Check if content is ready for ranking
   */
  canBeRanked(): boolean {
    return this.status === ContentStatus.CATEGORIZED && !!this.category;
  }

  /**
   * Check if content is ready for engagement determination
   */
  canDetermineEngagement(): boolean {
    return this.status === ContentStatus.RANKED && this.rankScore !== undefined;
  }

  /**
   * Check if content should be automated
   */
  shouldAutomate(): boolean {
    return (
      this.status === ContentStatus.ENGAGEMENT_DETERMINED &&
      this.engagementAction !== ActionType.IGNORE
    );
  }

  /**
   * Check if content has high engagement
   */
  hasHighEngagement(): boolean {
    return this.metrics.isHighEngagement();
  }

  /**
   * Check if content is in growth sweet spot
   */
  isInGrowthSweetSpot(): boolean {
    return this.metrics.isInGrowthSweetSpot();
  }

  /**
   * Get text for LLM processing (prefers textWithDescriptions)
   */
  getTextForProcessing(): string {
    return this.textWithDescriptions || this.cleanedText || this.text;
  }

  /**
   * Factory method to create Content from plain object
   */
  static fromPlain(data: ContentPlainObject): Content {
    return new Content(
      ContentId.fromString(data.id),
      PlatformId.fromString(data.platformId),
      data.platformContentId,
      data.text,
      Author.fromPlain(data.author),
      data.url,
      new Date(data.createdAt),
      Metrics.fromPlain(data.metrics),
      data.status as ContentStatus,
      data.media || [],
      data.category,
      data.rankScore,
      data.engagementAction as ActionType | undefined,
      data.cleanedText,
      data.textWithDescriptions,
      data.platformData,
    );
  }

  /**
   * Convert to plain object for persistence
   */
  toPlain(): ContentPlainObject {
    return {
      id: this.id.toString(),
      platformId: this.platformId.toString(),
      platformContentId: this.platformContentId,
      text: this.text,
      author: this.author.toPlain(),
      url: this.url,
      createdAt: this.createdAt.toISOString(),
      metrics: this.metrics.toPlain(),
      status: this.status,
      media: this.media,
      category: this.category,
      rankScore: this.rankScore,
      engagementAction: this.engagementAction,
      cleanedText: this.cleanedText,
      textWithDescriptions: this.textWithDescriptions,
      platformData: this.platformData,
    };
  }

  /**
   * Builder for creating Content instances
   */
  static builder(): ContentBuilder {
    return new ContentBuilder();
  }
}

/**
 * Plain object representation for serialization
 */
export interface ContentPlainObject {
  id: string;
  platformId: string;
  platformContentId: string;
  text: string;
  author: AuthorPlainObject;
  url: string;
  createdAt: string;
  metrics: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  };
  status: string;
  media: MediaItem[];
  category?: string;
  rankScore?: number;
  engagementAction?: string;
  cleanedText?: string;
  textWithDescriptions?: string;
  platformData?: Record<string, any>;
}

export interface MediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  alt?: string;
  thumbnailUrl?: string;
}

/**
 * Builder pattern for Content creation
 */
export class ContentBuilder {
  private props: Partial<ContentPlainObject> = {};

  id(id: string): this {
    this.props.id = id;
    return this;
  }

  platformId(platformId: string): this {
    this.props.platformId = platformId;
    return this;
  }

  text(text: string): this {
    this.props.text = text;
    return this;
  }

  // ... other builder methods

  build(): Content {
    // Validation
    if (!this.props.id) throw new Error('Content ID is required');
    if (!this.props.platformId) throw new Error('Platform ID is required');
    if (!this.props.text) throw new Error('Text is required');

    return Content.fromPlain(this.props as ContentPlainObject);
  }
}
```

---

### Task 2.2: Create Author Entity

**File:** `api/src/platform/domain/entities/Author.ts`

**Description:** Author/user entity.

**Implementation:**
```typescript
/**
 * Author entity
 */
export class Author {
  constructor(
    public readonly name: string,
    public readonly handle: string,
    public readonly profileUrl?: string,
    public readonly avatarUrl?: string,
    public readonly verified?: boolean,
    public readonly followerCount?: number,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('Author name is required');
    }
    if (!this.handle || this.handle.trim() === '') {
      throw new Error('Author handle is required');
    }
  }

  isVerified(): boolean {
    return this.verified === true;
  }

  hasLargeFollowing(threshold: number = 10000): boolean {
    return (this.followerCount || 0) >= threshold;
  }

  static fromPlain(data: AuthorPlainObject): Author {
    return new Author(
      data.name,
      data.handle,
      data.profileUrl,
      data.avatarUrl,
      data.verified,
      data.followerCount,
    );
  }

  toPlain(): AuthorPlainObject {
    return {
      name: this.name,
      handle: this.handle,
      profileUrl: this.profileUrl,
      avatarUrl: this.avatarUrl,
      verified: this.verified,
      followerCount: this.followerCount,
    };
  }
}

export interface AuthorPlainObject {
  name: string;
  handle: string;
  profileUrl?: string;
  avatarUrl?: string;
  verified?: boolean;
  followerCount?: number;
}
```

---

### Task 2.3: Create Repository Interface

**File:** `api/src/platform/domain/repositories/IContentRepository.ts`

**Description:** Repository pattern for data access abstraction.

**Implementation:**
```typescript
import { Content } from '../entities/Content';
import { ContentId } from '../../core/value-objects/ContentId';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { ContentStatus } from '../../core/types/ContentStatus';
import { ActionType } from '../../core/types/ActionType';

/**
 * Repository interface for Content persistence
 * Abstracts data access from domain logic
 */
export interface IContentRepository {
  /**
   * Find content by ID
   */
  findById(id: ContentId): Promise<Content | null>;

  /**
   * Find multiple content by IDs
   */
  findByIds(ids: ContentId[]): Promise<Content[]>;

  /**
   * Find content by platform
   */
  findByPlatform(platformId: PlatformId, limit?: number): Promise<Content[]>;

  /**
   * Find content by status
   */
  findByStatus(status: ContentStatus, limit?: number): Promise<Content[]>;

  /**
   * Find content by platform and status
   */
  findByPlatformAndStatus(
    platformId: PlatformId,
    status: ContentStatus,
    limit?: number,
  ): Promise<Content[]>;

  /**
   * Find content ready for specific action
   */
  findReadyForAction(action: ActionType, limit?: number): Promise<Content[]>;

  /**
   * Find content in batch
   */
  findByBatchId(batchId: string): Promise<Content[]>;

  /**
   * Save content (create or update)
   */
  save(content: Content): Promise<Content>;

  /**
   * Save multiple content items
   */
  saveMany(content: Content[]): Promise<Content[]>;

  /**
   * Update content status
   */
  updateStatus(id: ContentId, status: ContentStatus): Promise<void>;

  /**
   * Update multiple statuses
   */
  updateManyStatuses(ids: ContentId[], status: ContentStatus): Promise<void>;

  /**
   * Delete content
   */
  delete(id: ContentId): Promise<void>;

  /**
   * Count content by criteria
   */
  count(criteria: ContentCountCriteria): Promise<number>;

  /**
   * Find content for ranking
   */
  findForRanking(batchId: string, limit?: number): Promise<Content[]>;

  /**
   * Find content for engagement determination
   */
  findForEngagement(batchId: string, limit?: number): Promise<Content[]>;

  /**
   * Find content for automation
   */
  findForAutomation(batchId: string, limit?: number): Promise<Content[]>;
}

export interface ContentCountCriteria {
  platformId?: PlatformId;
  status?: ContentStatus;
  batchId?: string;
  engagementAction?: ActionType;
}
```

---

### Task 2.4: Create Domain Services

**File:** `api/src/platform/domain/services/ContentService.ts`

**Description:** Domain service for content business logic.

**Implementation:**
```typescript
import { Content } from '../entities/Content';
import { IContentRepository } from '../repositories/IContentRepository';
import { ContentStatus, isValidTransition } from '../../core/types/ContentStatus';
import { ContentId } from '../../core/value-objects/ContentId';
import { logger } from '../../../config/logger';

/**
 * Domain service for content operations
 * Contains business logic that doesn't fit in entities
 */
export class ContentService {
  constructor(private readonly contentRepository: IContentRepository) {}

  /**
   * Transition content to new status with validation
   */
  async transitionStatus(
    contentId: ContentId,
    newStatus: ContentStatus,
  ): Promise<void> {
    const content = await this.contentRepository.findById(contentId);
    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    if (!isValidTransition(content.status, newStatus)) {
      throw new Error(
        `Invalid status transition: ${content.status} -> ${newStatus}`,
      );
    }

    await this.contentRepository.updateStatus(contentId, newStatus);
    logger.info(`Content ${contentId} transitioned: ${content.status} -> ${newStatus}`);
  }

  /**
   * Get content ready for next processing stage
   */
  async getContentForNextStage(
    currentStatus: ContentStatus,
    limit: number = 100,
  ): Promise<Content[]> {
    return this.contentRepository.findByStatus(currentStatus, limit);
  }

  /**
   * Calculate growth score for content
   */
  calculateGrowthScore(content: Content): number {
    const metrics = content.metrics;

    // Comment sweet spot (10-50 comments = highest score)
    let commentScore = 0;
    if (metrics.comments < 10) {
      commentScore = metrics.comments * 10;
    } else if (metrics.comments <= 50) {
      commentScore = 100;
    } else if (metrics.comments <= 200) {
      commentScore = 100 - ((metrics.comments - 50) / 150) * 40;
    } else {
      const penalty = Math.min(((metrics.comments - 200) / 100) * 30, 30);
      commentScore = Math.max(30, 60 - penalty);
    }

    // Engagement ratio score
    const engagementRatio = metrics.engagementRate;
    const ratioScore = Math.min(engagementRatio * 100 * 50, 100);

    // Anti-viral score
    let antiViralScore = 100;
    if (metrics.comments > 500 || metrics.likes > 50000) {
      antiViralScore = 0;
    } else if (metrics.comments > 200 || metrics.likes > 20000) {
      antiViralScore = 40;
    } else if (metrics.comments > 100 || metrics.likes > 10000) {
      antiViralScore = 70;
    }

    // Weighted final score
    const finalScore = commentScore * 0.5 + ratioScore * 0.3 + antiViralScore * 0.2;
    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  /**
   * Determine if content should be automated
   */
  shouldAutomateContent(content: Content): boolean {
    return (
      content.shouldAutomate() &&
      content.rankScore !== undefined &&
      content.rankScore >= 50 // Only automate high-quality content
    );
  }
}
```

---

### Task 2.5: Phase 2 Testing

**Test File:** `api/src/platform/domain/__tests__/entities.test.ts`

**Test Cases:**
- Content entity creation and validation
- Author entity validation
- Content business logic methods
- Builder pattern

**Test File:** `api/src/platform/domain/__tests__/services.test.ts`

**Test Cases:**
- ContentService status transitions
- Growth score calculations
- Business rule validations

---

## 📅 Phase 3: Twitter Adapter Implementation (Days 5-7)

### Task 3.1: Create Twitter Action Strategies

**File:** `api/src/platform/adapters/twitter/actions/TwitterLikeAction.ts`

**Description:** Strategy for Twitter like action.

**Implementation:**
```typescript
import { IActionStrategy } from '../../../core/interfaces/IActionStrategy';
import { ActionType } from '../../../core/types/ActionType';
import { Page } from 'playwright';
import { TwitterSelectors } from '../TwitterSelectors';
import { randomDelay, hoverBeforeClick } from '../utils/humanBehavior';

export class TwitterLikeAction implements IActionStrategy {
  readonly name = ActionType.LIKE;
  readonly displayName = 'Like';
  readonly platformActionName = 'like';

  private selectors = TwitterSelectors;

  async canExecute(page: Page, contentId: string): Promise<boolean> {
    try {
      const likeButton = await page.$(this.selectors.likeButton);
      return likeButton !== null;
    } catch {
      return false;
    }
  }

  async execute(page: Page, contentId: string): Promise<void> {
    // Hover over like button
    await hoverBeforeClick(page, this.selectors.likeButton);
    await page.waitForTimeout(randomDelay(100, 300));

    // Click like
    const likeButton = await page.$(this.selectors.likeButton);
    if (!likeButton) {
      throw new Error('Like button not found');
    }

    await likeButton.click();
    await page.waitForTimeout(randomDelay(400, 900));
  }

  async verify(page: Page, contentId: string): Promise<boolean> {
    try {
      // Check if like button has "liked" state
      const likeButton = await page.$(this.selectors.likeButton);
      if (!likeButton) return false;

      const ariaLabel = await likeButton.getAttribute('aria-label');
      return ariaLabel?.toLowerCase().includes('liked') || false;
    } catch {
      return false;
    }
  }
}
```

---

**File:** `api/src/platform/adapters/twitter/actions/TwitterReplyAction.ts`

**Description:** Strategy for Twitter reply action (includes all human-like behaviors).

**Implementation:**
```typescript
import { IActionStrategy } from '../../../core/interfaces/IActionStrategy';
import { ActionType } from '../../../core/types/ActionType';
import { Page } from 'playwright';
import { TwitterSelectors } from '../TwitterSelectors';
import {
  randomDelay,
  hoverBeforeClick,
  typeWithHumanBehavior,
  readingTime,
  scrollRandomly,
  reReadOriginalTweet,
} from '../utils/humanBehavior';
import { logger } from '../../../../config/logger';

export class TwitterReplyAction implements IActionStrategy {
  readonly name = ActionType.COMMENT;
  readonly displayName = 'Reply';
  readonly platformActionName = 'reply';

  private selectors = TwitterSelectors;

  async canExecute(page: Page, contentId: string): Promise<boolean> {
    try {
      const replyButton = await page.$(this.selectors.replyButton);
      return replyButton !== null;
    } catch {
      return false;
    }
  }

  async execute(page: Page, contentId: string, data?: { text: string; originalText: string }): Promise<void> {
    if (!data?.text) {
      throw new Error('Reply text is required');
    }

    const { text: replyText, originalText } = data;

    // Simulate reading original tweet
    if (originalText) {
      await readingTime(page, originalText.length);
    }

    // Random scrolling (60% chance)
    if (Math.random() < 0.6) {
      await scrollRandomly(page);
    }

    // Hover over reply button
    await hoverBeforeClick(page, this.selectors.replyButton);
    await page.waitForTimeout(randomDelay(150, 400));

    // Click reply button
    const replyButton = await page.$(this.selectors.replyButton);
    if (!replyButton) {
      throw new Error('Reply button not found');
    }

    await replyButton.click();
    await page.waitForTimeout(randomDelay(800, 1500));

    // Find reply textbox
    const replyBox = await page.waitForSelector(
      this.selectors.replyTextbox,
      { timeout: 5000 }
    );

    // Click textbox
    await replyBox.click();
    await page.waitForTimeout(randomDelay(300, 700));

    // Thinking time before typing
    const thinkingTime = randomDelay(2000, 5000);
    logger.info(`Thinking for ${(thinkingTime / 1000).toFixed(1)}s before typing reply`);
    await page.waitForTimeout(thinkingTime);

    // Type with human-like behavior (typos, varied speed, mouse drift)
    await typeWithHumanBehavior(page, replyText);

    // Pause after typing
    await page.waitForTimeout(randomDelay(800, 2000));

    // 30% chance to re-read original tweet
    if (Math.random() < 0.3) {
      await reReadOriginalTweet(page);
    }

    // Find and click submit button
    const submitButton = await page.waitForSelector(
      this.selectors.submitButton,
      { timeout: 10000 }
    );

    // Hover over submit before clicking
    await hoverBeforeClick(page, this.selectors.submitButton);
    await page.waitForTimeout(randomDelay(100, 250));

    await submitButton.click();
    await page.waitForTimeout(randomDelay(1000, 2000));
  }

  async verify(page: Page, contentId: string): Promise<boolean> {
    // Check if reply modal closed (indicates success)
    try {
      await page.waitForSelector(this.selectors.replyModal, {
        state: 'detached',
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

---

**File:** `api/src/platform/adapters/twitter/actions/TwitterRetweetAction.ts`

**Description:** Strategy for Twitter retweet/share action.

**Implementation:**
```typescript
import { IActionStrategy } from '../../../core/interfaces/IActionStrategy';
import { ActionType } from '../../../core/types/ActionType';
import { Page } from 'playwright';
import { TwitterSelectors } from '../TwitterSelectors';
import { randomDelay, hoverBeforeClick } from '../utils/humanBehavior';

export class TwitterRetweetAction implements IActionStrategy {
  readonly name = ActionType.SHARE;
  readonly displayName = 'Retweet';
  readonly platformActionName = 'retweet';

  private selectors = TwitterSelectors;

  async canExecute(page: Page, contentId: string): Promise<boolean> {
    try {
      const retweetButton = await page.$(this.selectors.retweetButton);
      return retweetButton !== null;
    } catch {
      return false;
    }
  }

  async execute(page: Page, contentId: string): Promise<void> {
    // Hover over retweet button
    await hoverBeforeClick(page, this.selectors.retweetButton);
    await page.waitForTimeout(randomDelay(150, 400));

    // Click retweet button
    const retweetButton = await page.$(this.selectors.retweetButton);
    if (!retweetButton) {
      throw new Error('Retweet button not found');
    }

    await retweetButton.click();
    await page.waitForTimeout(randomDelay(500, 900));

    // Click confirm in menu
    const confirmButton = await page.$(this.selectors.retweetConfirm);
    if (!confirmButton) {
      throw new Error('Retweet confirm not found');
    }

    await page.waitForTimeout(randomDelay(300, 700));
    await hoverBeforeClick(page, this.selectors.retweetConfirm);
    await page.waitForTimeout(randomDelay(100, 250));

    await confirmButton.click();
    await page.waitForTimeout(randomDelay(700, 1300));
  }

  async verify(page: Page, contentId: string): Promise<boolean> {
    try {
      const retweetButton = await page.$(this.selectors.retweetButton);
      if (!retweetButton) return false;

      const ariaLabel = await retweetButton.getAttribute('aria-label');
      return ariaLabel?.toLowerCase().includes('retweeted') || false;
    } catch {
      return false;
    }
  }
}
```

---

**File:** `api/src/platform/adapters/twitter/actions/TwitterQuoteAction.ts`

**Description:** Strategy for Twitter quote tweet action.

(Similar implementation to TwitterReplyAction but uses quote flow)

---

### Task 3.2: Create Twitter Selectors

**File:** `api/src/platform/adapters/twitter/TwitterSelectors.ts`

**Description:** Centralized Twitter DOM selectors.

**Implementation:**
```typescript
/**
 * Twitter DOM selectors
 * Centralized to make updates easier
 */
export const TwitterSelectors = {
  // Action buttons
  likeButton: 'button[data-testid="like"]',
  replyButton: 'button[data-testid="reply"]',
  retweetButton: 'button[data-testid="retweet"]',

  // Reply flow
  replyTextbox: 'div[role="textbox"]',
  replyModal: 'div[data-testid="replyModal"]',

  // Quote flow
  quoteButton: 'a[role="menuitem"][href*="/compose/post"]',
  quoteTextbox: 'div[data-testid="tweetTextarea_0"]',

  // Submit buttons
  submitButton: 'button[data-testid="tweetButton"]:not([disabled])',

  // Confirm actions
  retweetConfirm: 'div[data-testid="retweetConfirm"]',

  // Tweet elements
  tweet: 'article[data-testid="tweet"]',
  tweetText: 'div[data-testid="tweetText"]',
  userName: 'div[data-testid="User-Name"]',

  // Media
  tweetPhoto: 'div[data-testid="tweetPhoto"]',

  // Metrics
  replyCount: '[data-testid="reply"]',
  likeCount: '[data-testid="like"]',
  retweetCount: '[data-testid="retweet"]',
} as const;
```

---

### Task 3.3: Create Human Behavior Utilities

**File:** `api/src/platform/adapters/twitter/utils/humanBehavior.ts`

**Description:** All human-like behavior functions (mouse movement, typing, scrolling, etc.)

**Implementation:** (Move all the human behavior code we created earlier here)

```typescript
import { Page } from 'playwright';
import { logger } from '../../../../config/logger';

export const randomDelay = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// ... (all the other functions we created:
// - getTypingSpeedByPosition
// - simulateTypo
// - mouseDriftDuringTyping
// - moveMouseNaturally
// - randomMouseMovement
// - hoverBeforeClick
// - wheelScroll
// - scrollRandomly
// - reReadOriginalTweet
// - typeWithHumanBehavior
// - readingTime
// )
```

---

### Task 3.4: Create Twitter Components

**File:** `api/src/platform/adapters/twitter/TwitterScraper.ts`

**Description:** Implement IContentScraper for Twitter.

(Move chrome extension scraping logic here)

---

**File:** `api/src/platform/adapters/twitter/TwitterActionExecutor.ts`

**Description:** Implement IActionExecutor for Twitter.

**Implementation:**
```typescript
import { IActionExecutor } from '../../core/interfaces/IActionExecutor';
import { IActionStrategy } from '../../core/interfaces/IActionStrategy';
import { ActionType } from '../../core/types/ActionType';
import { UnsupportedActionError, ActionExecutionError } from '../../core/errors/PlatformErrors';
import { TwitterLikeAction } from './actions/TwitterLikeAction';
import { TwitterReplyAction } from './actions/TwitterReplyAction';
import { TwitterRetweetAction } from './actions/TwitterRetweetAction';
import { TwitterQuoteAction } from './actions/TwitterQuoteAction';
import { Page } from 'playwright';
import { logger } from '../../../config/logger';

export class TwitterActionExecutor implements IActionExecutor {
  private strategies: Map<ActionType, IActionStrategy>;

  constructor() {
    this.strategies = new Map([
      [ActionType.LIKE, new TwitterLikeAction()],
      [ActionType.COMMENT, new TwitterReplyAction()],
      [ActionType.SHARE, new TwitterRetweetAction()],
      [ActionType.QUOTE, new TwitterQuoteAction()],
    ]);
  }

  getSupportedActions(): IActionStrategy[] {
    return Array.from(this.strategies.values());
  }

  supportsAction(action: ActionType): boolean {
    return this.strategies.has(action);
  }

  getActionStrategy(action: ActionType): IActionStrategy | null {
    return this.strategies.get(action) || null;
  }

  async execute(contentId: string, action: ActionType, data?: any): Promise<void> {
    const strategy = this.strategies.get(action);

    if (!strategy) {
      throw new UnsupportedActionError(action, 'twitter');
    }

    // Get page from browser manager (implementation depends on your setup)
    const page = await this.getPage(contentId);

    try {
      // Check if action can be executed
      const canExecute = await strategy.canExecute(page, contentId);
      if (!canExecute) {
        throw new ActionExecutionError(
          `Cannot execute ${action} - action not available`,
          'twitter',
          action
        );
      }

      // Execute the action
      logger.info(`Executing ${action} on content ${contentId}`);
      await strategy.execute(page, contentId, data);

      // Verify execution
      const verified = await strategy.verify(page, contentId);
      if (!verified) {
        logger.warn(`Action ${action} may not have completed successfully`);
      }

      logger.info(`Successfully executed ${action} on content ${contentId}`);
    } catch (error) {
      logger.error(`Failed to execute ${action} on content ${contentId}`, error);
      throw new ActionExecutionError(
        `Failed to execute ${action}: ${(error as Error).message}`,
        'twitter',
        action
      );
    }
  }

  private async getPage(contentId: string): Promise<Page> {
    // Implementation to get page - depends on your browser management
    // This will be integrated with automation.worker.ts
    throw new Error('Not implemented - integrate with browser manager');
  }
}
```

---

**File:** `api/src/platform/adapters/twitter/TwitterAuthenticator.ts`

**Description:** Implement IAuthenticator for Twitter.

(Use existing session/cookie management logic)

---

**File:** `api/src/platform/adapters/twitter/TwitterNormalizer.ts`

**Description:** Implement IContentNormalizer for Twitter.

(Transform scraped Twitter data to Content entity)

---

**File:** `api/src/platform/adapters/twitter/TwitterRateLimitProvider.ts`

**Description:** Implement IRateLimitProvider for Twitter.

**Implementation:**
```typescript
import { IRateLimitProvider, IRateLimits, RateLimitConfig } from '../../core/interfaces/IRateLimitProvider';
import { ActionType } from '../../core/types/ActionType';
import { RateLimitExceededError } from '../../core/errors/PlatformErrors';

export class TwitterRateLimitProvider implements IRateLimitProvider {
  private actionCounts: Map<ActionType, number[]> = new Map();

  private readonly limits: IRateLimits = {
    [ActionType.LIKE]: {
      maxPerHour: 150,
      maxPerDay: 1000,
      minIntervalMs: 2000, // 2 seconds between likes
    },
    [ActionType.COMMENT]: {
      maxPerHour: 25,
      maxPerDay: 50,
      minIntervalMs: 120000, // 2 minutes between replies
    },
    [ActionType.SHARE]: {
      maxPerHour: 50,
      maxPerDay: 300,
      minIntervalMs: 5000, // 5 seconds between retweets
    },
    [ActionType.QUOTE]: {
      maxPerHour: 10,
      maxPerDay: 25,
      minIntervalMs: 180000, // 3 minutes between quotes
    },
  };

  getRateLimits(): IRateLimits {
    return this.limits;
  }

  async canPerformAction(action: ActionType): Promise<boolean> {
    const limit = this.limits[action];
    if (!limit) return true;

    const now = Date.now();
    const timestamps = this.actionCounts.get(action) || [];

    // Remove timestamps older than 24 hours
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentTimestamps = timestamps.filter(t => t > dayAgo);

    // Check daily limit
    if (recentTimestamps.length >= limit.maxPerDay) {
      return false;
    }

    // Check hourly limit
    const hourAgo = now - 60 * 60 * 1000;
    const lastHourCount = recentTimestamps.filter(t => t > hourAgo).length;
    if (lastHourCount >= limit.maxPerHour) {
      return false;
    }

    // Check minimum interval
    if (recentTimestamps.length > 0) {
      const lastAction = Math.max(...recentTimestamps);
      if (now - lastAction < limit.minIntervalMs) {
        return false;
      }
    }

    return true;
  }

  async recordAction(action: ActionType): Promise<void> {
    const timestamps = this.actionCounts.get(action) || [];
    timestamps.push(Date.now());
    this.actionCounts.set(action, timestamps);
  }

  async getRemainingActions(action: ActionType): Promise<number> {
    const limit = this.limits[action];
    if (!limit) return Infinity;

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const timestamps = this.actionCounts.get(action) || [];
    const todayCount = timestamps.filter(t => t > dayAgo).length;

    return Math.max(0, limit.maxPerDay - todayCount);
  }

  async reset(): Promise<void> {
    this.actionCounts.clear();
  }
}
```

---

### Task 3.5: Create Twitter Adapter (Composition)

**File:** `api/src/platform/adapters/twitter/TwitterAdapter.ts`

**Description:** Main Twitter adapter that composes all components.

**Implementation:**
```typescript
import { IContentScraper } from '../../core/interfaces/IContentScraper';
import { IAuthenticator } from '../../core/interfaces/IAuthenticator';
import { IActionExecutor } from '../../core/interfaces/IActionExecutor';
import { IRateLimitProvider } from '../../core/interfaces/IRateLimitProvider';
import { IContentNormalizer } from '../../core/interfaces/IContentNormalizer';
import { PlatformId, Platform } from '../../core/value-objects/PlatformId';
import { TwitterScraper } from './TwitterScraper';
import { TwitterAuthenticator } from './TwitterAuthenticator';
import { TwitterActionExecutor } from './TwitterActionExecutor';
import { TwitterRateLimitProvider } from './TwitterRateLimitProvider';
import { TwitterNormalizer } from './TwitterNormalizer';

/**
 * Twitter platform adapter
 * Composes all Twitter-specific components
 */
export class TwitterAdapter {
  public readonly platformId: PlatformId;
  public readonly scraper: IContentScraper;
  public readonly authenticator: IAuthenticator;
  public readonly actionExecutor: IActionExecutor;
  public readonly rateLimits: IRateLimitProvider;
  public readonly normalizer: IContentNormalizer;

  constructor() {
    this.platformId = PlatformId.twitter();
    this.scraper = new TwitterScraper();
    this.authenticator = new TwitterAuthenticator();
    this.actionExecutor = new TwitterActionExecutor();
    this.rateLimits = new TwitterRateLimitProvider();
    this.normalizer = new TwitterNormalizer();
  }

  /**
   * Get platform display name
   */
  getDisplayName(): string {
    return 'Twitter';
  }

  /**
   * Get platform capabilities
   */
  getCapabilities() {
    return {
      scraping: true,
      likeAction: true,
      commentAction: true,
      shareAction: true,
      quoteAction: true,
      mediaSupport: ['image', 'video', 'gif'],
      maxTextLength: 280,
    };
  }
}
```

---

### Task 3.6: Phase 3 Testing

**Test Files:**
- `TwitterActionExecutor.test.ts`
- `TwitterLikeAction.test.ts`
- `TwitterReplyAction.test.ts`
- `humanBehavior.test.ts`
- `TwitterAdapter.test.ts`

---

## 📅 Phase 4: Infrastructure Layer (Days 8-9)

### Task 4.1: Implement Content Repository

**File:** `api/src/platform/infrastructure/persistence/MongoContentRepository.ts`

**Description:** MongoDB implementation of IContentRepository.

**Implementation:**
```typescript
import { IContentRepository, ContentCountCriteria } from '../../domain/repositories/IContentRepository';
import { Content } from '../../domain/entities/Content';
import { ContentId } from '../../core/value-objects/ContentId';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { ContentStatus } from '../../core/types/ContentStatus';
import { ActionType } from '../../core/types/ActionType';
import { ContentModel } from '../../../shared/database/models/Content.model';

export class MongoContentRepository implements IContentRepository {
  async findById(id: ContentId): Promise<Content | null> {
    const doc = await ContentModel.findById(id.toString());
    return doc ? this.toDomain(doc) : null;
  }

  async findByIds(ids: ContentId[]): Promise<Content[]> {
    const idStrings = ids.map(id => id.toString());
    const docs = await ContentModel.find({ _id: { $in: idStrings } });
    return docs.map(doc => this.toDomain(doc));
  }

  async findByPlatform(platformId: PlatformId, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({ platformId: platformId.toString() })
      .limit(limit)
      .sort({ createdAt: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async findByStatus(status: ContentStatus, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({ status })
      .limit(limit)
      .sort({ createdAt: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async findByPlatformAndStatus(
    platformId: PlatformId,
    status: ContentStatus,
    limit: number = 100,
  ): Promise<Content[]> {
    const docs = await ContentModel.find({
      platformId: platformId.toString(),
      status,
    })
      .limit(limit)
      .sort({ createdAt: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async findReadyForAction(action: ActionType, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({
      status: ContentStatus.ENGAGEMENT_DETERMINED,
      engagementAction: action,
    })
      .limit(limit)
      .sort({ rankScore: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async findByBatchId(batchId: string): Promise<Content[]> {
    const docs = await ContentModel.find({ batchId });
    return docs.map(doc => this.toDomain(doc));
  }

  async save(content: Content): Promise<Content> {
    const plain = content.toPlain();
    const doc = await ContentModel.findByIdAndUpdate(
      plain.id,
      plain,
      { upsert: true, new: true }
    );
    return this.toDomain(doc);
  }

  async saveMany(contents: Content[]): Promise<Content[]> {
    const operations = contents.map(content => ({
      updateOne: {
        filter: { _id: content.id.toString() },
        update: content.toPlain(),
        upsert: true,
      },
    }));

    await ContentModel.bulkWrite(operations);
    return contents;
  }

  async updateStatus(id: ContentId, status: ContentStatus): Promise<void> {
    await ContentModel.findByIdAndUpdate(id.toString(), { status });
  }

  async updateManyStatuses(ids: ContentId[], status: ContentStatus): Promise<void> {
    const idStrings = ids.map(id => id.toString());
    await ContentModel.updateMany(
      { _id: { $in: idStrings } },
      { status }
    );
  }

  async delete(id: ContentId): Promise<void> {
    await ContentModel.findByIdAndDelete(id.toString());
  }

  async count(criteria: ContentCountCriteria): Promise<number> {
    const filter: any = {};

    if (criteria.platformId) {
      filter.platformId = criteria.platformId.toString();
    }
    if (criteria.status) {
      filter.status = criteria.status;
    }
    if (criteria.batchId) {
      filter.batchId = criteria.batchId;
    }
    if (criteria.engagementAction) {
      filter.engagementAction = criteria.engagementAction;
    }

    return ContentModel.countDocuments(filter);
  }

  async findForRanking(batchId: string, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({
      batchId,
      status: ContentStatus.CATEGORIZED,
    })
      .limit(limit)
      .sort({ createdAt: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async findForEngagement(batchId: string, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({
      batchId,
      status: ContentStatus.RANKED,
    })
      .limit(limit)
      .sort({ rankScore: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  async findForAutomation(batchId: string, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({
      batchId,
      status: ContentStatus.ENGAGEMENT_DETERMINED,
      engagementAction: { $ne: ActionType.IGNORE },
    })
      .limit(limit)
      .sort({ rankScore: -1 });
    return docs.map(doc => this.toDomain(doc));
  }

  /**
   * Convert Mongoose document to domain entity
   */
  private toDomain(doc: any): Content {
    return Content.fromPlain({
      id: doc._id.toString(),
      platformId: doc.platformId,
      platformContentId: doc.platformContentId,
      text: doc.text,
      author: doc.author || doc.user, // Handle migration
      url: doc.url,
      createdAt: doc.createdAt.toISOString(),
      metrics: doc.metrics,
      status: doc.status,
      media: doc.media || [],
      category: doc.category,
      rankScore: doc.rankScore,
      engagementAction: doc.engagementAction,
      cleanedText: doc.cleanedText,
      textWithDescriptions: doc.textWithDescriptions,
      platformData: doc.platformData,
    });
  }
}
```

---

### Task 4.2: Update Mongoose Models

**File:** `api/src/shared/database/models/Content.model.ts`

**Description:** Update Tweet model to Content model (migration-friendly).

**Implementation:**
```typescript
import mongoose, { Schema, Document } from 'mongoose';
import { ContentStatus } from '../../../platform/core/types/ContentStatus';
import { ActionType } from '../../../platform/core/types/ActionType';

export interface IContentDocument extends Document {
  platformId: string;
  platformContentId: string;
  text: string;
  author: {
    name: string;
    handle: string;
    profileUrl?: string;
    avatarUrl?: string;
    verified?: boolean;
    followerCount?: number;
  };
  url: string;
  createdAt: Date;
  metrics: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  };
  status: ContentStatus;
  media: Array<{
    type: 'image' | 'video' | 'gif';
    url: string;
    alt?: string;
    thumbnailUrl?: string;
  }>;
  category?: string;
  rankScore?: number;
  engagementAction?: ActionType;
  cleanedText?: string;
  textWithDescriptions?: string;
  platformData?: Record<string, any>;
  batchId?: string;

  // Migration compatibility (will be removed)
  user?: any; // Old field name for author
}

const ContentSchema = new Schema<IContentDocument>(
  {
    platformId: { type: String, required: true, index: true },
    platformContentId: { type: String, required: true },
    text: { type: String, required: true },
    author: {
      name: { type: String, required: true },
      handle: { type: String, required: true },
      profileUrl: String,
      avatarUrl: String,
      verified: Boolean,
      followerCount: Number,
    },
    url: { type: String, required: true },
    createdAt: { type: Date, required: true },
    metrics: {
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: Object.values(ContentStatus),
      default: ContentStatus.INGESTED,
      index: true,
    },
    media: [{
      type: { type: String, enum: ['image', 'video', 'gif'] },
      url: String,
      alt: String,
      thumbnailUrl: String,
    }],
    category: { type: String, index: true },
    rankScore: { type: Number, index: true },
    engagementAction: {
      type: String,
      enum: Object.values(ActionType),
    },
    cleanedText: String,
    textWithDescriptions: String,
    platformData: Schema.Types.Mixed,
    batchId: { type: String, index: true },

    // Migration compatibility
    user: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'contents', // New collection name
  }
);

// Compound indexes
ContentSchema.index({ platformId: 1, status: 1 });
ContentSchema.index({ batchId: 1, status: 1 });
ContentSchema.index({ status: 1, rankScore: -1 });

// Virtual for backwards compatibility
ContentSchema.virtual('_author').get(function() {
  return this.author || this.user;
});

export const ContentModel = mongoose.model<IContentDocument>('Content', ContentSchema);
```

---

### Task 4.3: Create Migration Scripts

**File:** `api/src/scripts/migrations/001-tweet-to-content.ts`

**Description:** Migration script to convert Tweet collection to Content.

**Implementation:**
```typescript
import mongoose from 'mongoose';
import { Tweet } from '../../shared/database/models/Tweet.model';
import { ContentModel } from '../../shared/database/models/Content.model';
import { Platform } from '../../platform/core/value-objects/PlatformId';
import { logger } from '../../config/logger';

/**
 * Migration: Convert Tweet collection to Content collection
 *
 * Steps:
 * 1. Copy all tweets to contents collection
 * 2. Transform field names (user -> author, etc.)
 * 3. Add platformId field (all = 'twitter')
 * 4. Verify data integrity
 * 5. Optionally drop old collection
 */
async function migrateTweetsToContent() {
  try {
    logger.info('Starting migration: Tweet -> Content');

    // Count existing tweets
    const tweetCount = await Tweet.countDocuments();
    logger.info(`Found ${tweetCount} tweets to migrate`);

    if (tweetCount === 0) {
      logger.info('No tweets to migrate');
      return;
    }

    // Batch process tweets
    const batchSize = 1000;
    let processed = 0;

    while (processed < tweetCount) {
      const tweets = await Tweet.find()
        .skip(processed)
        .limit(batchSize)
        .lean();

      const contents = tweets.map(tweet => ({
        _id: tweet._id,
        platformId: Platform.TWITTER, // All existing data is Twitter
        platformContentId: tweet.tweetId || tweet._id.toString(),
        text: tweet.text,
        author: {
          name: tweet.user?.name || '',
          handle: tweet.user?.handle || '',
          profileUrl: tweet.user?.profileUrl,
          avatarUrl: tweet.user?.avatarUrl,
          verified: tweet.user?.verified,
          followerCount: tweet.user?.followerCount,
        },
        url: tweet.url,
        createdAt: tweet.createdAt || tweet.scrapedAt,
        metrics: {
          likes: tweet.metrics?.likes || 0,
          shares: tweet.metrics?.reposts || 0,
          comments: tweet.metrics?.replies || 0,
          views: tweet.metrics?.views || 0,
        },
        status: tweet.status,
        media: tweet.media || [],
        category: tweet.category,
        rankScore: tweet.rankScore,
        engagementAction: tweet.engagementAction,
        cleanedText: tweet.cleanedText,
        textWithDescriptions: tweet.textWithDescriptions,
        platformData: {
          // Store Twitter-specific data
          tweetId: tweet.tweetId,
          originalMetrics: tweet.metrics,
        },
        batchId: tweet.batchId,
      }));

      // Insert into Content collection
      await ContentModel.insertMany(contents, { ordered: false });

      processed += tweets.length;
      logger.info(`Migrated ${processed}/${tweetCount} tweets`);
    }

    // Verify migration
    const contentCount = await ContentModel.countDocuments();
    logger.info(`Migration complete. Contents: ${contentCount}, Tweets: ${tweetCount}`);

    if (contentCount !== tweetCount) {
      logger.error('Migration count mismatch! Manual verification required.');
      return;
    }

    logger.info('Migration successful! ✅');
    logger.info('To remove old Tweet collection, run: db.tweets.drop()');

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateTweetsToContent()
  .then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
```

---

### Task 4.4: Create Platform Registry

**File:** `api/src/platform/application/PlatformRegistry.ts`

**Description:** Registry for managing platform adapters.

**Implementation:**
```typescript
import { PlatformId } from '../core/value-objects/PlatformId';
import { TwitterAdapter } from '../adapters/twitter/TwitterAdapter';
import { logger } from '../../config/logger';

/**
 * Registry for platform adapters
 * Singleton pattern - only one instance
 */
export class PlatformRegistry {
  private static instance: PlatformRegistry;
  private adapters: Map<string, any>;

  private constructor() {
    this.adapters = new Map();
    this.registerDefaultAdapters();
  }

  static getInstance(): PlatformRegistry {
    if (!PlatformRegistry.instance) {
      PlatformRegistry.instance = new PlatformRegistry();
    }
    return PlatformRegistry.instance;
  }

  /**
   * Register default adapters
   */
  private registerDefaultAdapters(): void {
    this.register(new TwitterAdapter());
    logger.info('Registered default platform adapters');
  }

  /**
   * Register a platform adapter
   */
  register(adapter: any): void {
    const platformId = adapter.platformId.toString();
    this.adapters.set(platformId, adapter);
    logger.info(`Registered platform adapter: ${platformId}`);
  }

  /**
   * Get adapter for platform
   */
  getAdapter(platformId: PlatformId | string): any {
    const id = typeof platformId === 'string' ? platformId : platformId.toString();
    const adapter = this.adapters.get(id);

    if (!adapter) {
      throw new Error(`No adapter registered for platform: ${id}`);
    }

    return adapter;
  }

  /**
   * Check if platform is supported
   */
  isSupported(platformId: PlatformId | string): boolean {
    const id = typeof platformId === 'string' ? platformId : platformId.toString();
    return this.adapters.has(id);
  }

  /**
   * Get all registered platforms
   */
  getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Unregister a platform (for testing)
   */
  unregister(platformId: PlatformId | string): void {
    const id = typeof platformId === 'string' ? platformId : platformId.toString();
    this.adapters.delete(id);
  }
}

// Export singleton instance
export const platformRegistry = PlatformRegistry.getInstance();
```

---

## 📅 Phase 5: Update Workers (Days 10-11)

### Task 5.1: Update Cleanup Worker

**File:** `api/src/modules/cleanup/cleanup.worker.ts`

**Changes:**
- Import `Content` instead of `Tweet`
- Use `IContentRepository` instead of direct Mongoose
- Update to use `ContentStatus` instead of `TweetStatus`

**Example:**
```typescript
// Before:
import { Tweet } from '../../shared/database/models/Tweet.model';
const tweet = await Tweet.findById(id);

// After:
import { IContentRepository } from '../../platform/domain/repositories/IContentRepository';
import { ContentId } from '../../platform/core/value-objects/ContentId';

const contentRepo = new MongoContentRepository();
const content = await contentRepo.findById(ContentId.fromString(id));
```

---

### Task 5.2: Update Categorization Worker

Similar changes to cleanup worker, plus:
- Use `content.getTextForProcessing()` instead of accessing fields directly
- Update LLM prompts to be platform-agnostic

---

### Task 5.3: Update Ranking Worker

Similar changes, use Content entity methods:
- `content.canBeRanked()`
- `content.isInGrowthSweetSpot()`

---

### Task 5.4: Update Engagement Worker

Use platform adapter:
```typescript
import { platformRegistry } from '../../platform/application/PlatformRegistry';

const adapter = platformRegistry.getAdapter(content.platformId);
const actions = adapter.actionExecutor.getSupportedActions();
```

---

### Task 5.5: Update Automation Worker

**Major changes** - use platform adapters for execution:

```typescript
import { platformRegistry } from '../../platform/application/PlatformRegistry';
import { ExecuteActionCommand } from '../../platform/core/commands/ExecuteActionCommand';

const adapter = platformRegistry.getAdapter(content.platformId);

// Create and execute command
const command = new ExecuteActionCommand(
  adapter.actionExecutor,
  contentId,
  action,
  { text: replyText, originalText: content.text }
);

await command.execute();
```

---

## 📅 Phase 6: Update API Routes (Day 12)

### Task 6.1: Create Platform-Agnostic Endpoints

**File:** `api/src/routes/content.routes.ts`

**New routes:**
```typescript
// Platform-agnostic routes
POST   /api/:platform/ingestion/content
GET    /api/:platform/content/:id
GET    /api/:platform/content/status/:status
POST   /api/:platform/session/can-start
GET    /api/:platform/stats

// Backwards compatible (redirects to Twitter)
POST   /api/ingestion/tweets → /api/twitter/ingestion/content
```

---

### Task 6.2: Update Controllers

Create platform-aware controllers that use repositories and adapters.

---

## 📅 Phase 7: Update LLM Prompts (Day 13)

### Task 7.1: Create Platform-Aware Prompt Templates

**File:** `api/src/modules/llm/prompts/base.prompts.ts`

**Template system:**
```typescript
export function createCategorizationPrompt(platformName: string, contentType: string) {
  return `You are analyzing ${contentType} from ${platformName}.

Categorize each ${contentType} into ONE of these categories:
- Technology
- Business
- ...

${contentType.charAt(0).toUpperCase() + contentType.slice(1)} to categorize:
{CONTENT_BATCH}
`;
}
```

---

### Task 7.2: Update LLM Service

Make LLM service platform-aware:
- Accept platformId in method calls
- Use platform-specific prompts
- Handle platform-specific response formats

---

## 📅 Phase 8: Testing & Documentation (Days 14-15)

### Task 8.1: Integration Tests

- End-to-end tests with Twitter adapter
- Test all workers with new architecture
- Test API endpoints
- Test repository operations

---

### Task 8.2: Create Platform Adapter Guide

**File:** `CREATING_NEW_ADAPTER.md`

Guide for adding new platforms (LinkedIn, Reddit, etc.)

---

### Task 8.3: Update README

Document new architecture and how to use it.

---

## 🔄 Rollback Strategy

If something goes wrong, here's how to roll back:

### Rollback Phase 1-2 (Interfaces/Domain)
- No database changes yet
- Just delete new files
- No migration needed

### Rollback Phase 3-4 (Adapters/Infrastructure)
- Database migration created new collection
- Old Tweet collection still exists
- Switch back to using Tweet models

### Rollback Phase 5-7 (Workers/API/LLM)
- Revert code changes
- Keep using old Tweet-based code
- No data loss

---

## 📊 Success Criteria

Phase complete when:

1. ✅ All tests passing
2. ✅ Twitter automation still works
3. ✅ No regression in functionality
4. ✅ Code follows SOLID principles
5. ✅ Easy to add new platform (should take 2-3 days max)

---

## 🚀 Next Steps After Refactor

1. Add LinkedIn adapter (proof of concept)
2. Add Reddit adapter
3. Add Instagram adapter
4. Create unified dashboard for all platforms
5. Add cross-platform analytics

---

## 📝 Notes for Future You

### Key Design Decisions:

1. **Repository Pattern**: Abstracts data access, easy to swap databases
2. **Strategy Pattern**: Each action is independent, easy to add new actions
3. **Command Pattern**: Operations are objects, easy to queue/log/retry
4. **Value Objects**: Type safety, validation at creation
5. **Domain Entities**: Business logic lives in entities, not scattered

### Common Pitfalls to Avoid:

1. ❌ Don't leak platform details through abstractions
2. ❌ Don't force all platforms to support all actions
3. ❌ Don't put business logic in repositories
4. ❌ Don't bypass the registry to get adapters directly
5. ❌ Don't forget to update tests when adding features

### Performance Considerations:

- Repository queries can be optimized with indexes
- Use bulk operations for batch processing
- Cache platform capabilities
- Rate limiting is per-platform
- Consider read replicas for heavy queries

---

## 🤝 Getting Help

If stuck on any phase:

1. Read the SOLID principles guide
2. Review the test files for examples
3. Check existing Twitter adapter implementation
4. Look at the error classes for proper error handling
5. Review this document for architectural decisions

---

**End of Implementation Guide**

Good luck, future me! 🚀
