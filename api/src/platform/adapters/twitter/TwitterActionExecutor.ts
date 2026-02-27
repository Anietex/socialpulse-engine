import { IActionExecutor, ActionResult } from '../../core/interfaces/IActionExecutor';
import { IActionStrategy, ActionContext } from '../../core/interfaces/IActionStrategy';
import { ActionType } from '../../core/types/ActionType';
import { ActionExecutionError } from '../../core/errors/PlatformErrors';
import {
  TwitterLikeAction,
  TwitterReplyAction,
  TwitterRetweetAction,
  TwitterQuoteAction,
} from './actions';

/**
 * Twitter Action Executor
 * Manages and executes all Twitter-specific actions using strategy pattern
 *
 * Benefits:
 * - Single place to manage all Twitter actions
 * - Easy to add new actions (just add to strategies map)
 * - Strategy pattern makes actions swappable and testable
 */
export class TwitterActionExecutor implements IActionExecutor {
  readonly platformId = 'twitter';
  private strategies: Map<ActionType, IActionStrategy>;
  private page: any;

  constructor(page: any) {
    this.page = page;
    // Register all Twitter action strategies
    this.strategies = new Map<ActionType, IActionStrategy>([
      [ActionType.LIKE, new TwitterLikeAction()],
      [ActionType.COMMENT, new TwitterReplyAction()],
      [ActionType.SHARE, new TwitterRetweetAction()],
      [ActionType.QUOTE, new TwitterQuoteAction()],
    ]);
  }

  /**
   * Get all supported action strategies
   */
  getSupportedActions(): IActionStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Check if an action is supported
   */
  supportsAction(action: ActionType): boolean {
    return this.strategies.has(action);
  }

  /**
   * Get a specific action strategy
   */
  getActionStrategy(action: ActionType): IActionStrategy | null {
    return this.strategies.get(action) || null;
  }

  /**
   * Execute an action on content
   * @param actionType - The type of action to execute
   * @param contentId - Platform-specific content identifier
   * @param data - Optional data needed for the action (e.g., comment text)
   * @returns ActionResult with execution details
   * @throws ActionExecutionError if action fails
   */
  async executeAction(actionType: string, contentId: string, data?: any): Promise<ActionResult> {
    const action = actionType as ActionType;

    // Check if action is supported
    const strategy = this.strategies.get(action);
    if (!strategy) {
      throw new ActionExecutionError(
        `Unsupported action: ${actionType}`,
        this.platformId,
        actionType,
        contentId
      );
    }

    // Build action context
    const context: ActionContext = {
      page: this.page,
    };

    const executedAt = new Date();

    try {
      // Check if action can be executed
      const canExecute = await strategy.canExecute(context, contentId);
      if (!canExecute) {
        throw new ActionExecutionError(
          `Action ${actionType} is not available on this content`,
          this.platformId,
          actionType,
          contentId
        );
      }

      // Execute the action (throws on failure)
      await strategy.execute(context, contentId, data);

      // Return success result
      return {
        success: true,
        actionType,
        contentId,
        executedAt,
      };
    } catch (error) {
      // Return error result
      return {
        success: false,
        actionType,
        contentId,
        executedAt,
        error: error instanceof Error ? error.message : 'Unknown error during action execution',
      };
    }
  }
}
