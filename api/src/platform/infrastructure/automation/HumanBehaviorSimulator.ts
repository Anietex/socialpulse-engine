/**
 * Human Behavior Simulator
 * Platform-agnostic facade for simulating realistic human behavior in browser automation
 *
 * This service can be used by ANY platform adapter (Twitter, LinkedIn, Reddit, Instagram, etc.)
 * to make automation look more natural and avoid detection.
 *
 * Usage Example:
 * ```typescript
 * const simulator = new HumanBehaviorSimulator(page);
 *
 * // Before taking action
 * await simulator.simulateReading('This is the content to read');
 * await simulator.pause();
 *
 * // Type naturally
 * await simulator.typeNaturally('My response text');
 *
 * // Click naturally
 * await simulator.clickElement('button[data-testid="submit"]');
 * ```
 */

import { Page } from 'playwright';
import {
  randomDelay,
  humanPause,
  readingTime,
  scrollRandomly,
  randomMouseMovement,
  hoverBeforeClick,
  maybeReRead,
} from './BehaviorUtils';
import { typeHumanLike, typeWithThinkingTime } from './TypingSimulator';
import { moveMouseNaturally, moveToElement, clickNaturally } from './MouseSimulator';
import { logger } from '../../../config/logger';

/**
 * Configuration for behavior simulation
 */
export interface BehaviorConfig {
  /**
   * Enable/disable typing simulation
   */
  enableTyping?: boolean;

  /**
   * Enable/disable mouse simulation
   */
  enableMouse?: boolean;

  /**
   * Enable/disable reading simulation
   */
  enableReading?: boolean;

  /**
   * Enable/disable random scrolling
   */
  enableScrolling?: boolean;

  /**
   * Speed multiplier (1.0 = normal, 0.5 = slower, 2.0 = faster)
   */
  speedMultiplier?: number;
}

/**
 * Human Behavior Simulator
 * Provides realistic human-like behavior for browser automation
 */
export class HumanBehaviorSimulator {
  private config: Required<BehaviorConfig>;

  constructor(
    private readonly page: Page,
    config: BehaviorConfig = {}
  ) {
    this.config = {
      enableTyping: config.enableTyping ?? true,
      enableMouse: config.enableMouse ?? true,
      enableReading: config.enableReading ?? true,
      enableScrolling: config.enableScrolling ?? true,
      speedMultiplier: config.speedMultiplier ?? 1.0,
    };
  }

  /**
   * Simulate reading content
   * Calculates reading time based on text length and optionally scrolls
   */
  async simulateReading(text: string): Promise<void> {
    if (!this.config.enableReading) {
      return;
    }

    const textLength = text.length;
    logger.debug(`Simulating reading ${textLength} characters`);

    // Calculate reading time
    await readingTime(this.page, textLength);

    // 60% chance to scroll while reading
    if (this.config.enableScrolling && Math.random() < 0.6) {
      await scrollRandomly(this.page);
    }

    // 50% chance for random mouse movement
    if (this.config.enableMouse && Math.random() < 0.5) {
      await randomMouseMovement(this.page);
    }
  }

  /**
   * Human pause - thinking/hesitation
   */
  async pause(): Promise<void> {
    await humanPause(this.page);
  }

  /**
   * Type text naturally with typos, variable speed, and thinking time
   */
  async typeNaturally(text: string, withThinkingTime: boolean = true): Promise<void> {
    if (!this.config.enableTyping) {
      // Fallback to instant typing
      await this.page.keyboard.type(text);
      return;
    }

    logger.debug(`Typing naturally: ${text.substring(0, 50)}...`);

    if (withThinkingTime) {
      await typeWithThinkingTime(this.page, text);
    } else {
      await typeHumanLike(this.page, text);
    }
  }

  /**
   * Click element naturally (hover first, then click)
   */
  async clickElement(selector: string): Promise<void> {
    if (!this.config.enableMouse) {
      // Fallback to instant click
      await this.page.click(selector);
      return;
    }

    logger.debug(`Clicking naturally: ${selector}`);
    await clickNaturally(this.page, selector);
  }

  /**
   * Move mouse to element naturally
   */
  async moveToElement(selector: string): Promise<void> {
    if (!this.config.enableMouse) {
      return;
    }

    await moveToElement(this.page, selector);
  }

  /**
   * Hover before clicking (common pattern)
   */
  async hoverBeforeClick(selector: string): Promise<void> {
    if (!this.config.enableMouse) {
      return;
    }

    await hoverBeforeClick(this.page, selector);
  }

  /**
   * Scroll randomly (like reading replies)
   */
  async scroll(): Promise<void> {
    if (!this.config.enableScrolling) {
      return;
    }

    await scrollRandomly(this.page);
  }

  /**
   * Maybe re-read content before submitting (30% chance)
   */
  async maybeReRead(): Promise<void> {
    if (!this.config.enableReading) {
      return;
    }

    await maybeReRead(this.page);
  }

  /**
   * Simulate complete engagement flow
   * Read content → Pause → Type response → Maybe re-read → Submit
   */
  async simulateEngagementFlow(
    contentText: string,
    responseText: string,
    textareaSelector: string,
    submitSelector: string
  ): Promise<void> {
    logger.info('Starting human-like engagement flow');

    // Step 1: Read the content
    await this.simulateReading(contentText);

    // Step 2: Pause (thinking)
    await this.pause();

    // Step 3: Click textarea naturally
    await this.clickElement(textareaSelector);

    // Step 4: Type response naturally (with thinking time)
    await this.typeNaturally(responseText, true);

    // Step 5: Maybe re-read before submitting (30% chance)
    await this.maybeReRead();

    // Step 6: Click submit button naturally
    await this.clickElement(submitSelector);

    logger.info('Human-like engagement flow completed');
  }

  /**
   * Get random delay adjusted by speed multiplier
   */
  getRandomDelay(min: number, max: number): number {
    const delay = randomDelay(min, max);
    return Math.floor(delay / this.config.speedMultiplier);
  }

  /**
   * Wait for random delay (adjusted by speed multiplier)
   */
  async randomWait(min: number, max: number): Promise<void> {
    const delay = this.getRandomDelay(min, max);
    await this.page.waitForTimeout(delay);
  }
}

// Export utilities for direct use if needed
export { randomDelay, humanPause, readingTime, scrollRandomly };
export { typeHumanLike, typeWithThinkingTime };
export { moveMouseNaturally, moveToElement, clickNaturally };
