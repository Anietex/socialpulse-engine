import { IActionStrategy, ActionContext } from '../../../core/interfaces/IActionStrategy';
import { ActionType } from '../../../core/types/ActionType';
import { ActionExecutionError } from '../../../core/errors/PlatformErrors';
import { TwitterSelectors } from '../TwitterSelectors';
import {
  randomDelay,
  hoverBeforeClick,
  typeWithHumanBehavior,
  readingTime,
  reReadOriginalTweet,
  thinkingPause,
} from '../utils/humanBehavior';

/**
 * Twitter Quote Tweet Action Strategy
 * Implements the strategy for quote tweeting with human-like behavior
 */
export class TwitterQuoteAction implements IActionStrategy {
  readonly actionType = ActionType.QUOTE;

  /**
   * Validate data for quote action
   * Quote action requires quoteText in data
   */
  validateData(data?: any): boolean {
    return (
      !!data?.quoteText && typeof data.quoteText === 'string' && data.quoteText.trim().length > 0
    );
  }

  /**
   * Check if the quote action can be executed
   * Verifies that the retweet button exists (quote is accessed via retweet menu)
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
   * Execute the quote tweet action
   * Opens retweet menu, selects quote tweet, types message, and submits
   */
  async execute(context: ActionContext, contentId: string, data?: any): Promise<void> {
    const { page } = context;

    if (!page) {
      throw new ActionExecutionError(
        'Page context is required for browser-based actions',
        'twitter',
        this.actionType,
        contentId
      );
    }

    // Validate data
    if (!this.validateData(data)) {
      throw new ActionExecutionError(
        'Quote text is required in data.quoteText',
        'twitter',
        this.actionType,
        contentId
      );
    }

    const { quoteText, originalText } = data;

    try {
      // Simulate reading original tweet
      if (originalText) {
        await readingTime(page, originalText.length);
      }

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

      // Click "Quote" option in the menu
      const quoteButton = await page.waitForSelector(TwitterSelectors.quoteButton, {
        timeout: 5000,
        state: 'visible',
      });

      if (!quoteButton) {
        throw new ActionExecutionError(
          'Quote button not found in menu',
          'twitter',
          this.actionType,
          contentId
        );
      }

      await hoverBeforeClick(page, TwitterSelectors.quoteButton);
      await page.waitForTimeout(randomDelay(100, 250));

      await quoteButton.click();
      await page.waitForTimeout(randomDelay(1000, 2000));

      // Wait for quote textbox to appear
      const quoteTextbox = await page.waitForSelector(TwitterSelectors.quoteTextbox, {
        timeout: 5000,
        state: 'visible',
      });

      if (!quoteTextbox) {
        throw new ActionExecutionError(
          'Quote textbox did not appear',
          'twitter',
          this.actionType,
          contentId
        );
      }

      // Click textbox to focus
      await quoteTextbox.click();
      await page.waitForTimeout(randomDelay(300, 700));

      // Thinking time before typing
      await thinkingPause(page);

      // Type quote with human-like behavior
      await typeWithHumanBehavior(page, quoteText);

      // Pause after typing (review)
      await page.waitForTimeout(randomDelay(800, 2000));

      // 40% chance to re-read original tweet before submitting
      if (Math.random() < 0.4) {
        await reReadOriginalTweet(page);
      }

      // Find and click submit button
      const submitButton = await page.waitForSelector(TwitterSelectors.submitButton, {
        timeout: 10000,
        state: 'visible',
      });

      if (!submitButton) {
        throw new ActionExecutionError(
          'Submit button not found or disabled',
          'twitter',
          this.actionType,
          contentId
        );
      }

      // Hover over submit before clicking
      await hoverBeforeClick(page, TwitterSelectors.submitButton);
      await page.waitForTimeout(randomDelay(100, 250));

      // Click submit
      await submitButton.click();
      await page.waitForTimeout(randomDelay(1500, 3000));

      // Verify the quote was posted
      const verified = await this.verifyAction(page);
      if (!verified) {
        throw new ActionExecutionError(
          'Quote tweet could not be verified',
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
        `Failed to execute quote action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter',
        this.actionType,
        contentId
      );
    }
  }

  /**
   * Private method to verify that the quote tweet was successfully posted
   * Checks that the compose modal is closed and we're back to timeline
   */
  private async verifyAction(page: any): Promise<boolean> {
    try {
      // Wait for UI to update
      await page.waitForTimeout(randomDelay(1500, 2500));

      // Check that quote textbox is no longer visible
      const quoteTextbox = await page.$(TwitterSelectors.quoteTextbox);
      if (quoteTextbox) {
        const isVisible = await quoteTextbox.isVisible();
        return !isVisible; // Success if textbox is not visible
      }

      // If textbox doesn't exist, assume success
      return true;
    } catch (error) {
      // If we can't find the textbox, assume success
      return true;
    }
  }
}
