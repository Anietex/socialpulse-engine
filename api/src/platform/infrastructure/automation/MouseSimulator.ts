/**
 * Mouse Simulator
 * Simulates natural mouse movement with curves and realistic behavior
 */

import { Page } from 'playwright';
import { randomDelay } from './BehaviorUtils';

/**
 * Move mouse in a natural curved path (not straight line)
 *
 * Humans don't move the mouse in perfectly straight lines - there's always
 * a slight curve and variation in speed.
 */
export async function moveMouseNaturally(
  page: Page,
  targetX: number,
  targetY: number
): Promise<void> {
  // Start from arbitrary position
  const startX = randomDelay(200, 400);
  const startY = randomDelay(100, 300);

  const steps = randomDelay(8, 15); // Number of intermediate points
  const curveIntensity = randomDelay(10, 40); // How curved the path is

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;

    // Calculate curved path (not straight line)
    const curve = Math.sin(progress * Math.PI) * curveIntensity;
    const x = startX + (targetX - startX) * progress + curve;
    const y = startY + (targetY - startY) * progress;

    await page.mouse.move(x, y);
    await page.waitForTimeout(randomDelay(5, 15)); // Small delay between movements
  }
}

/**
 * Move mouse to element with natural curved path
 */
export async function moveToElement(page: Page, selector: string): Promise<void> {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Element has no bounding box: ${selector}`);
  }

  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;

  await moveMouseNaturally(page, targetX, targetY);
}

/**
 * Hover over element before clicking (natural behavior)
 */
export async function hoverAndClick(page: Page, selector: string): Promise<void> {
  await moveToElement(page, selector);
  await page.waitForTimeout(randomDelay(100, 300));

  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  await element.click();
}

/**
 * Click with realistic pre-click hover
 */
export async function clickNaturally(page: Page, selector: string): Promise<void> {
  await moveToElement(page, selector);
  await page.waitForTimeout(randomDelay(100, 300));
  await page.click(selector);
}
