import { IActionStrategy, ActionContext } from '../../../core/interfaces/IActionStrategy';
import { ActionType } from '../../../core/types/ActionType';
import { ActionExecutionError } from '../../../core/errors/PlatformErrors';
import { TwitterSelectors } from '../TwitterSelectors';
import { randomDelay, hoverBeforeClick } from '../utils/humanBehavior';

/**
 * Twitter Retweet Action Strategy
 * Implements the strategy for retweeting tweets with human-like behavior
 */
export class TwitterRetweetAction implements IActionStrategy {
  readonly actionType = ActionType.SHARE;

  /**
   * Validate data for retweet action
   * Retweet action doesn't require any data
   */
  validateData(_data?: any): boolean {
    return true; // Retweet action doesn't need additional data
  }

  /**
   * Check if the retweet action can be executed
   * Verifies that the retweet button exists
   */
  async canExecute(context: ActionContext, _contentId: string): Promise<boolean> {
    try {
      const { page } = context;
      if (!page) return false;

      const retweetButton = await page.$(TwitterSelectors.retweetButton);
      return retweetButton !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute the retweet action
   * Clicks retweet button and confirms the action
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
      // Hover over retweet button
      await hoverBeforeClick(page, TwitterSelectors.retweetButton);
      await page.waitForTimeout(randomDelay(150, 350));

      // Click retweet button to open menu
      const retweetButton = await page.$(TwitterSelectors.retweetButton);
      if (!retweetButton) {
        throw new ActionExecutionError(
          'Retweet button not found',
          'twitter',
          this.actionType,
          contentId
        );
      }

      await retweetButton.click();
      await page.waitForTimeout(randomDelay(500, 1000));

      // Wait for retweet confirm button in the dropdown menu
      const retweetConfirm = await page.waitForSelector(TwitterSelectors.retweetConfirm, {
        timeout: 5000,
        state: 'visible',
      });

      if (!retweetConfirm) {
        throw new ActionExecutionError(
          'Retweet confirm button not found',
          'twitter',
          this.actionType,
          contentId
        );
      }

      // Hover and click confirm
      await hoverBeforeClick(page, TwitterSelectors.retweetConfirm);
      await page.waitForTimeout(randomDelay(100, 250));

      await retweetConfirm.click();
      await page.waitForTimeout(randomDelay(600, 1200));

      // Verify the action was successful
      const verified = await this.verifyAction(page);
      if (!verified) {
        throw new ActionExecutionError(
          'Retweet action could not be verified',
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
        `Failed to execute retweet action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter',
        this.actionType,
        contentId
      );
    }
  }

  /**
   * Private method to verify that the retweet was successful
   * Checks if the retweet button shows "unretweet" state
   */
  private async verifyAction(page: any): Promise<boolean> {
    try {
      // Check for unretweet button (indicates retweet was successful)
      const unretweetButton = await page.$(TwitterSelectors.unretweet);
      if (unretweetButton) return true;

      // Fallback: check aria-label on retweet button
      const retweetButton = await page.$(TwitterSelectors.retweetButton);
      if (!retweetButton) return false;

      const ariaLabel = await retweetButton.getAttribute('aria-label');
      return ariaLabel?.toLowerCase().includes('retweeted') || false;
    } catch (error) {
      return false;
    }
  }
}
