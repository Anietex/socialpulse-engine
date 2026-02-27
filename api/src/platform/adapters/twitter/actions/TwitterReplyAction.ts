import { IActionStrategy, ActionContext } from '../../../core/interfaces/IActionStrategy';
import { ActionType } from '../../../core/types/ActionType';
import { ActionExecutionError } from '../../../core/errors/PlatformErrors';
import { TwitterSelectors } from '../TwitterSelectors';
import {
  randomDelay,
  hoverBeforeClick,
  typeWithHumanBehavior,
  readingTime,
  scrollRandomly,
  reReadOriginalTweet,
  thinkingPause,
} from '../utils/humanBehavior';

/**
 * Twitter Reply Action Strategy
 * Implements the strategy for replying to tweets with extensive human-like behaviors
 */
export class TwitterReplyAction implements IActionStrategy {
  readonly actionType = ActionType.COMMENT;

  /**
   * Validate data for reply action
   * Reply action requires replyText in data
   */
  validateData(data?: any): boolean {
    return (
      !!data?.replyText && typeof data.replyText === 'string' && data.replyText.trim().length > 0
    );
  }

  /**
   * Check if the reply action can be executed
   * Verifies that the reply button exists
   */
  async canExecute(context: ActionContext, _contentId: string): Promise<boolean> {
    try {
      const { page } = context;
      if (!page) return false;

      const replyButton = await page.$(TwitterSelectors.replyButton);
      return replyButton !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute the reply action
   * Includes: reading time, scrolling, hovering, thinking pause, human-like typing
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
        'Reply text is required in data.replyText',
        'twitter',
        this.actionType,
        contentId
      );
    }

    const { replyText, originalText } = data;

    try {
      // Simulate reading original tweet
      if (originalText) {
        await readingTime(page, originalText.length);
      }

      // Random scrolling (60% chance) - simulate browsing/reading
      if (Math.random() < 0.6) {
        await scrollRandomly(page);
      }

      // Hover over reply button
      await hoverBeforeClick(page, TwitterSelectors.replyButton);
      await page.waitForTimeout(randomDelay(150, 400));

      // Click reply button
      const replyButton = await page.$(TwitterSelectors.replyButton);
      if (!replyButton) {
        throw new ActionExecutionError(
          'Reply button not found',
          'twitter',
          this.actionType,
          contentId
        );
      }

      await replyButton.click();
      await page.waitForTimeout(randomDelay(800, 1500));

      // Wait for reply modal/textbox to appear
      const replyBox = await page.waitForSelector(TwitterSelectors.replyTextbox, {
        timeout: 5000,
        state: 'visible',
      });

      if (!replyBox) {
        throw new ActionExecutionError(
          'Reply textbox did not appear',
          'twitter',
          this.actionType,
          contentId
        );
      }

      // Click textbox to focus
      await replyBox.click();
      await page.waitForTimeout(randomDelay(300, 700));

      // Thinking time before typing (simulate composing thoughts)
      await thinkingPause(page);

      // Type with human-like behavior (typos, varied speed, mouse drift)
      await typeWithHumanBehavior(page, replyText);

      // Pause after typing (review)
      await page.waitForTimeout(randomDelay(800, 2000));

      // 30% chance to re-read original tweet before submitting
      if (Math.random() < 0.3) {
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
      await page.waitForTimeout(randomDelay(1000, 2000));

      // Verify the reply was posted
      const verified = await this.verifyAction(page);
      if (!verified) {
        throw new ActionExecutionError(
          'Reply could not be verified',
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
        `Failed to execute reply action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'twitter',
        this.actionType,
        contentId
      );
    }
  }

  /**
   * Private method to verify that the reply was successfully posted
   * Checks that the reply modal is closed
   */
  private async verifyAction(page: any): Promise<boolean> {
    try {
      // Wait a bit for the UI to update
      await page.waitForTimeout(randomDelay(1000, 2000));

      // Check that reply modal is no longer visible
      const replyModal = await page.$(TwitterSelectors.replyModal);
      if (replyModal) {
        const isVisible = await replyModal.isVisible();
        return !isVisible; // Success if modal is not visible
      }

      // If modal doesn't exist, check that textbox is gone
      const replyBox = await page.$(TwitterSelectors.replyTextbox);
      return replyBox === null;
    } catch (error) {
      // If we can't find the modal/textbox, assume success
      return true;
    }
  }
}
