import { IContentRepository } from '../../domain/repositories/IContentRepository';
import { IPlatformAdapter } from '../../infrastructure/registry/PlatformRegistry';
import { Content } from '../../domain/entities/Content';
import { ContentStatus } from '../../core/types/ContentStatus';
import { ActionType } from '../../core/types/ActionType';
import { ContentId } from '../../core/value-objects/ContentId';
import { ActionResult } from '../../core/interfaces/IActionExecutor';
import { ILLMService } from '../../core/interfaces/ILLMService';
import { logger } from '../../../config/logger';

/**
 * Automation execution result
 */
export interface AutomationResult {
  contentId: string;
  platformContentId: string;
  action: ActionType;
  success: boolean;
  executedAt: Date;
  error?: string;
}

/**
 * Automation batch result
 */
export interface AutomationBatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  results: AutomationResult[];
  errors: string[];
}

/**
 * Automation Orchestrator
 * Application service for end-to-end content automation workflow
 *
 * Workflow:
 * 1. Get content ready for automation (QUEUED_FOR_ENGAGEMENT)
 * 2. Check rate limits for each action
 * 3. Execute actions via platform adapters
 * 4. Update content status based on results
 * 5. Handle errors and retries
 *
 * Benefits:
 * - Centralized automation logic
 * - Rate limit respect
 * - Error handling and recovery
 * - Progress tracking
 * - Audit trail
 */
export class AutomationOrchestrator {
  constructor(
    private readonly repository: IContentRepository,
    private readonly llmService?: ILLMService
  ) {
    if (llmService) {
      logger.info('AutomationOrchestrator initialized with LLM service');
    } else {
      logger.warn('AutomationOrchestrator initialized without LLM service - using fallback texts');
    }
  }

  /**
   * Execute automation for a single platform
   * @param adapter Platform adapter to use
   * @param limit Maximum number of content items to process
   * @param actionType Optional: only process specific action type
   * @returns Batch result with statistics
   */
  async executeAutomation(
    adapter: IPlatformAdapter,
    limit: number = 50,
    actionType?: ActionType
  ): Promise<AutomationBatchResult> {
    const result: AutomationBatchResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: [],
      errors: [],
    };

    try {
      // Step 1: Get content ready for automation
      const content = actionType
        ? await this.repository.findReadyForAction(actionType, limit)
        : await this.repository.findByStatus(ContentStatus.QUEUED_FOR_ENGAGEMENT, limit);

      result.totalProcessed = content.length;

      if (content.length === 0) {
        return result;
      }

      // Step 2: Process each content item
      for (const item of content) {
        const actionResult = await this.processContentItem(item, adapter);
        result.results.push(actionResult);

        if (actionResult.success) {
          result.successful++;
        } else if (actionResult.error) {
          result.failed++;
          result.errors.push(`${item.id.toString()}: ${actionResult.error}`);
        } else {
          result.skipped++;
        }
      }

      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Unknown error during automation'
      );
      return result;
    }
  }

  /**
   * Execute automation across multiple platforms
   * @param adapters Array of platform adapters
   * @param limitPerPlatform Maximum content per platform
   * @returns Results per platform
   */
  async executeMultiPlatformAutomation(
    adapters: IPlatformAdapter[],
    limitPerPlatform: number = 50
  ): Promise<Map<string, AutomationBatchResult>> {
    const results = new Map<string, AutomationBatchResult>();

    // Execute automation for all platforms in parallel
    const promises = adapters.map(async (adapter) => {
      const platformId = adapter.getPlatformId();
      try {
        const result = await this.executeAutomation(adapter, limitPerPlatform);
        results.set(platformId, result);
      } catch (error) {
        results.set(platformId, {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Execute specific action type across content
   * @param adapter Platform adapter
   * @param actionType Action to execute
   * @param limit Maximum items to process
   */
  async executeActionBatch(
    adapter: IPlatformAdapter,
    actionType: ActionType,
    limit: number = 20
  ): Promise<AutomationBatchResult> {
    return this.executeAutomation(adapter, limit, actionType);
  }

  /**
   * Dry run: Preview what would be automated
   * @param limit Preview limit
   * @returns Content that would be processed
   */
  async previewAutomation(limit: number = 50): Promise<{
    totalReady: number;
    byAction: Map<ActionType, number>;
    content: Content[];
  }> {
    const content = await this.repository.findByStatus(ContentStatus.QUEUED_FOR_ENGAGEMENT, limit);

    const byAction = new Map<ActionType, number>();

    for (const item of content) {
      if (item.engagementAction) {
        const currentCount = byAction.get(item.engagementAction) || 0;
        byAction.set(item.engagementAction, currentCount + 1);
      }
    }

    return {
      totalReady: content.length,
      byAction,
      content,
    };
  }

  /**
   * Process a single content item
   */
  private async processContentItem(
    content: Content,
    adapter: IPlatformAdapter
  ): Promise<AutomationResult> {
    const baseResult: AutomationResult = {
      contentId: content.id.toString(),
      platformContentId: content.platformContentId,
      action: content.engagementAction || ActionType.LIKE,
      success: false,
      executedAt: new Date(),
    };

    try {
      // Skip if no engagement action defined
      if (!content.engagementAction) {
        baseResult.error = 'No engagement action defined';
        return baseResult;
      }

      // Check if action is supported
      if (!adapter.actionExecutor.supportsAction(content.engagementAction)) {
        baseResult.error = `Action ${content.engagementAction} not supported`;
        await this.updateContentStatus(content.id, ContentStatus.SKIPPED);
        return baseResult;
      }

      // Check rate limits
      const rateLimitStatus = await adapter.rateLimits.getRateLimitStatus(content.engagementAction);

      if (rateLimitStatus.isLimited) {
        baseResult.error = `Rate limit exceeded. Resets at ${rateLimitStatus.resetAt}`;
        return baseResult;
      }

      // Update status to ENGAGING
      await this.updateContentStatus(content.id, ContentStatus.ENGAGING);

      // Execute the action
      const actionResult: ActionResult = await adapter.actionExecutor.executeAction(
        content.engagementAction,
        content.platformContentId,
        await this.buildActionData(content)
      );

      // Update content status based on result
      if (actionResult.success) {
        await this.updateContentStatus(content.id, ContentStatus.ENGAGED);
        baseResult.success = true;
      } else {
        await this.updateContentStatus(content.id, ContentStatus.ERROR);
        baseResult.error = actionResult.error;
      }

      // Respect rate limits
      const delay = adapter.rateLimits.calculateDelay(content.engagementAction);
      if (delay > 0) {
        await this.sleep(delay);
      }

      return baseResult;
    } catch (error) {
      baseResult.error = error instanceof Error ? error.message : 'Unknown error';
      await this.updateContentStatus(content.id, ContentStatus.ERROR);
      return baseResult;
    }
  }

  /**
   * Build action-specific data for execution
   */
  private async buildActionData(content: Content): Promise<any> {
    const actionType = content.engagementAction;

    if (!actionType) {
      return {};
    }

    switch (actionType) {
      case ActionType.COMMENT:
        return {
          replyText: await this.generateReplyText(content),
          originalText: content.text,
        };

      case ActionType.QUOTE:
        return {
          quoteText: await this.generateQuoteText(content),
          originalText: content.text,
        };

      case ActionType.LIKE:
      case ActionType.SHARE:
      case ActionType.VIEW:
      default:
        return {};
    }
  }

  /**
   * Generate reply text for comments
   * Uses LLM service if available, otherwise uses fallback
   */
  private async generateReplyText(content: Content): Promise<string> {
    if (!this.llmService) {
      // Fallback when LLM service not available
      return 'Great insights! Thanks for sharing.';
    }

    try {
      const response = await this.llmService.generateReply(content);

      logger.info('Generated reply via LLM', {
        contentId: content.id.toString(),
        isFallback: response.isFallback,
        model: response.model,
      });

      return response.text;
    } catch (error) {
      logger.error('Failed to generate reply, using fallback', {
        contentId: content.id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback on error
      return 'Great insights! Thanks for sharing.';
    }
  }

  /**
   * Generate quote text for quote tweets
   * Uses LLM service if available, otherwise uses fallback
   */
  private async generateQuoteText(content: Content): Promise<string> {
    if (!this.llmService) {
      // Fallback when LLM service not available
      return 'Interesting perspective on this topic!';
    }

    try {
      const response = await this.llmService.generateQuote(content);

      logger.info('Generated quote via LLM', {
        contentId: content.id.toString(),
        isFallback: response.isFallback,
        model: response.model,
      });

      return response.text;
    } catch (error) {
      logger.error('Failed to generate quote, using fallback', {
        contentId: content.id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback on error
      return 'Interesting perspective on this topic!';
    }
  }

  /**
   * Update content status
   */
  private async updateContentStatus(contentId: ContentId, status: ContentStatus): Promise<void> {
    await this.repository.updateStatus(contentId, status);
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
