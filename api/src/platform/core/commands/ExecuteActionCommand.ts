import { BaseCommand, CommandContext } from './ICommand';
import { Result, ResultUtils } from '../types';
import { IActionExecutor, ActionResult } from '../interfaces/IActionExecutor';
import { IRateLimitProvider } from '../interfaces/IRateLimitProvider';
import { ContentId } from '../value-objects/ContentId';
import { ActionType, ActionTypeUtils } from '../types/ActionType';

/**
 * Input for executing an action
 */
export interface ExecuteActionInput {
  /**
   * Content to act upon
   */
  contentId: ContentId;

  /**
   * Action to execute
   */
  actionType: ActionType;

  /**
   * Additional data for the action
   * Required for: comment (text), quote (text)
   */
  actionData?: {
    text?: string;
    [key: string]: any;
  };

  /**
   * Options for execution
   */
  options?: {
    /**
     * Skip rate limiting (use with caution)
     */
    skipRateLimit?: boolean;

    /**
     * Force execution even if action is not supported
     */
    force?: boolean;
  };
}

/**
 * Output from executing an action
 */
export interface ExecuteActionOutput {
  /**
   * Execution result
   */
  result: ActionResult;

  /**
   * Delay that was applied (in milliseconds)
   */
  delayAppliedMs?: number;

  /**
   * Rate limit information
   */
  rateLimit?: {
    actionsRemaining: number;
    resetAt: Date;
  };
}

/**
 * Command for executing an action on content
 *
 * Responsibilities:
 * 1. Validate action is supported on the platform
 * 2. Check rate limits
 * 3. Apply human-like delays
 * 4. Execute action using IActionExecutor
 * 5. Track results and rate limit consumption
 */
export class ExecuteActionCommand extends BaseCommand<ExecuteActionInput, ExecuteActionOutput> {
  readonly name = 'ExecuteAction';

  constructor(
    private readonly actionExecutor: IActionExecutor,
    private readonly rateLimitProvider: IRateLimitProvider
  ) {
    super();
  }

  /**
   * Validate action execution input
   */
  validate(input: ExecuteActionInput): Result<true, string> {
    if (!input.contentId) {
      return ResultUtils.err('contentId is required');
    }

    if (!input.actionType) {
      return ResultUtils.err('actionType is required');
    }

    // Verify action type is valid
    if (!ActionTypeUtils.isValid(input.actionType)) {
      return ResultUtils.err(
        `Invalid action type: ${input.actionType}. Valid types: ${ActionTypeUtils.all().join(', ')}`
      );
    }

    // Verify executor platform matches content platform
    if (this.actionExecutor.platformId !== input.contentId.getPlatformId().toString()) {
      return ResultUtils.err(
        `Action executor platform (${this.actionExecutor.platformId}) does not match content platform (${input.contentId.getPlatformId().toString()})`
      );
    }

    // Check if action is supported (unless force flag is set)
    if (!input.options?.force && !this.actionExecutor.supportsAction(input.actionType)) {
      return ResultUtils.err(
        `Action ${input.actionType} is not supported on ${this.actionExecutor.platformId}`
      );
    }

    // Validate action data if required
    if (ActionTypeUtils.requiresData(input.actionType) && !input.actionData?.text) {
      return ResultUtils.err(`Action ${input.actionType} requires actionData.text`);
    }

    return ResultUtils.ok(true);
  }

  /**
   * Execute action logic
   */
  protected async executeImpl(
    input: ExecuteActionInput,
    _context?: CommandContext
  ): Promise<ExecuteActionOutput> {
    let delayAppliedMs: number | undefined;

    // Check rate limits (unless skipped)
    if (!input.options?.skipRateLimit) {
      const rateLimitStatus = await this.rateLimitProvider.getRateLimitStatus(input.actionType);

      if (rateLimitStatus.isLimited) {
        throw new Error(
          `Rate limit exceeded for ${input.actionType}. Resets at ${rateLimitStatus.resetAt.toISOString()}`
        );
      }

      // Calculate and apply human-like delay
      delayAppliedMs = this.rateLimitProvider.calculateDelay(input.actionType);
      if (delayAppliedMs > 0) {
        await this.sleep(delayAppliedMs);
      }
    }

    // Execute the action
    const result = await this.actionExecutor.executeAction(
      input.actionType,
      input.contentId.getContentId(),
      input.actionData
    );

    // Get updated rate limit status
    const updatedRateLimit = await this.rateLimitProvider.getRateLimitStatus(input.actionType);

    return {
      result,
      delayAppliedMs,
      rateLimit: {
        actionsRemaining: updatedRateLimit.actionsRemaining,
        resetAt: updatedRateLimit.resetAt,
      },
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
