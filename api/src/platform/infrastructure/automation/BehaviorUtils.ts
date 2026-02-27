/**
 * Behavior Utilities
 * Platform-agnostic utilities for simulating human-like behavior
 */

import { Page } from 'playwright';

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Human pause - simulate thinking/hesitation
 */
export async function humanPause(page: Page): Promise<void> {
  await page.waitForTimeout(randomDelay(300, 800));
}

/**
 * Calculate reading time based on text length
 * Average reading speed: ~250 words per minute
 */
export async function readingTime(page: Page, textLength: number): Promise<void> {
  const wordsEstimate = textLength / 5; // Average word length
  const readingTimeMs = (wordsEstimate / 250) * 60 * 1000; // Convert to milliseconds
  const actualTime = Math.min(Math.max(readingTimeMs, 1000), 10000); // Clamp between 1-10 seconds

  await page.waitForTimeout(actualTime);
}

/**
 * Scroll randomly to simulate reading content
 */
export async function scrollRandomly(page: Page): Promise<void> {
  const scrollAmount = randomDelay(100, 400);
  const scrollDirection = Math.random() > 0.5 ? 1 : -1;

  await page.mouse.wheel(0, scrollAmount * scrollDirection);
  await page.waitForTimeout(randomDelay(200, 500));
}

/**
 * Random mouse movement to simulate natural behavior
 */
export async function randomMouseMovement(page: Page): Promise<void> {
  const x = randomDelay(200, 1200);
  const y = randomDelay(100, 700);

  await page.mouse.move(x, y);
  await page.waitForTimeout(randomDelay(100, 300));
}

/**
 * Hover over element before clicking (natural behavior)
 */
export async function hoverBeforeClick(page: Page, selector: string): Promise<void> {
  const element = await page.$(selector);
  if (element) {
    const box = await element.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;

      await page.mouse.move(targetX, targetY);
      await page.waitForTimeout(randomDelay(100, 300));
    }
  }
}

/**
 * Re-read original content before submitting (30% chance)
 */
export async function maybeReRead(page: Page): Promise<void> {
  if (Math.random() < 0.3) {
    await scrollRandomly(page);
    await page.waitForTimeout(randomDelay(500, 1500));
  }
}
