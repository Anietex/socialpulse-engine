import { IActionStrategy, ActionContext } from '../../../core/interfaces/IActionStrategy';
import { ActionType } from '../../../core/types/ActionType';
import { ActionExecutionError } from '../../../core/errors/PlatformErrors';
import { TwitterSelectors } from '../TwitterSelectors';
import { randomDelay, hoverBeforeClick } from '../utils/humanBehavior';

/**
 * Twitter Like Action Strategy
 * Implements the strategy for liking tweets with human-like behavior
 */
export class TwitterLikeAction implements IActionStrategy {
  readonly actionType = ActionType.LIKE;

  /**
   * Validate data for like action
   * Like action doesn't require any data
   */
  validateData(_data?: any): boolean {
    return true; // Like action doesn't need additional data
  }

  /**
   * Check if the like action can be executed
   * Verifies that the like button exists and is clickable
   */
  async canExecute(context: ActionContext, _contentId: string): Promise<boolean> {
    try {
      const { page } = context;
      if (!page) return false;

      const likeButton = await page.$(TwitterSelectors.likeButton);
      return likeButton !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute the like action
   * Hovers over and clicks the like button with random delays
   */
  async execute(context: ActionContext, contentId: string, _data?: any): Promise<void> {
    const { page } = context;

    if (!page) {
      throw new ActionExecutionError(
        'Page context is required for browser-based actions',
        'twitter',
        this.actionType,
        contentId
      );
    }

    try {
      // Hover over like button (human behavior)
      await hoverBeforeClick(page, TwitterSelectors.likeButton);
      await page.waitForTimeout(randomDelay(100, 300));

      // Click like
      const likeButton = await page.$(TwitterSelectors.likeButton);
      if (!likeButton) {
        throw new ActionExecutionError(
          'Like button not found',
          'twitter',
          this.actionType,
          contentId
        );
      }

      await likeButton.click();
      await page.waitForTimeout(randomDelay(400, 900));

      // Verify the action was successful
      const verified = await this.verifyAction(page);
      if (!verified) {
        throw new ActionExecutionError(
          'Like action could not be verified',
          'twitter',
          this.actionType,
          contentId
        );
      }
    } catch (error) {
      if (error instanceof ActionExecutionError) {
        throw error;
      }
      throw new ActionExecutionError(
        `Failed to execute like action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter',
        this.actionType,
        contentId
      );
    }
  }

  /**
   * Private method to verify that the like action was successful
   * Checks if the like button has the "liked" state
   */
  private async verifyAction(page: any): Promise<boolean> {
    try {
      // Check for unlike button (indicates like was successful)
      const unlikeButton = await page.$(TwitterSelectors.unlikeButton);
      if (unlikeButton) return true;

      // Fallback: check aria-label
      const likeButton = await page.$(TwitterSelectors.likeButton);
      if (!likeButton) return false;

      const ariaLabel = await likeButton.getAttribute('aria-label');
      return ariaLabel?.toLowerCase().includes('liked') || false;
    } catch (error) {
      return false;
    }
  }
}
