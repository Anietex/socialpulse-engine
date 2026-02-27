import { Page } from 'playwright';

/**
 * Human Behavior Utilities
 * Functions to simulate human-like interactions with Twitter
 * to avoid detection and appear more natural
 */

/**
 * Generate a random delay between min and max milliseconds
 */
export const randomDelay = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Calculate typing speed based on position in text
 * Humans type slower at the beginning and speed up
 */
export const getTypingSpeedByPosition = (position: number, textLength: number): number => {
  const progress = position / textLength;
  const baseSpeed = 80; // Base typing delay in ms
  const variance = 40; // Variance in typing speed

  // Slower at start, faster in middle, slightly slower at end
  let multiplier = 1;
  if (progress < 0.1) {
    multiplier = 1.5; // 50% slower at start
  } else if (progress > 0.9) {
    multiplier = 1.2; // 20% slower at end (proofreading)
  } else {
    multiplier = 0.8 + Math.random() * 0.4; // Random speed in middle
  }

  return Math.floor((baseSpeed + Math.random() * variance) * multiplier);
};

/**
 * Simulate typos and corrections (2% chance)
 */
export const simulateTypo = async (page: Page, correctChar: string): Promise<void> => {
  const typoChance = 0.02; // 2% chance of typo
  if (Math.random() < typoChance) {
    // Common typo: adjacent key
    const keyboard = 'qwertyuiopasdfghjklzxcvbnm';
    const randomChar = keyboard[Math.floor(Math.random() * keyboard.length)];

    // Type wrong character
    await page.keyboard.type(randomChar);
    await page.waitForTimeout(randomDelay(100, 300));

    // Backspace
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(randomDelay(50, 150));
  }

  // Type correct character
  await page.keyboard.type(correctChar);
};

/**
 * Simulate mouse drift during typing (humans don't keep mouse perfectly still)
 */
export const mouseDriftDuringTyping = async (page: Page): Promise<void> => {
  const driftChance = 0.15; // 15% chance of mouse drift during typing
  if (Math.random() < driftChance) {
    const currentMouse = await page.evaluate(() => {
      // window exists in browser context
      // @ts-ignore
      const w = window;
      return {
        x: w.innerWidth / 2,
        y: w.innerHeight / 2,
      };
    });

    const driftX = currentMouse.x + randomDelay(-30, 30);
    const driftY = currentMouse.y + randomDelay(-20, 20);

    await page.mouse.move(driftX, driftY, {
      steps: randomDelay(3, 8),
    });
  }
};

/**
 * Move mouse naturally (Bezier curve simulation)
 */
export const moveMouseNaturally = async (
  page: Page,
  targetX: number,
  targetY: number
): Promise<void> => {
  const steps = randomDelay(10, 20);
  await page.mouse.move(targetX, targetY, { steps });
};

/**
 * Random mouse movement (simulate distraction or reading)
 */
export const randomMouseMovement = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  if (!viewport) return;

  const targetX = randomDelay(0, viewport.width);
  const targetY = randomDelay(0, viewport.height);

  await moveMouseNaturally(page, targetX, targetY);
  await page.waitForTimeout(randomDelay(200, 600));
};

/**
 * Hover over element before clicking (human behavior)
 */
export const hoverBeforeClick = async (page: Page, selector: string): Promise<void> => {
  const element = await page.$(selector);
  if (!element) return;

  const box = await element.boundingBox();
  if (!box) return;

  // Move to element center with slight randomness
  const targetX = box.x + box.width / 2 + randomDelay(-5, 5);
  const targetY = box.y + box.height / 2 + randomDelay(-5, 5);

  await moveMouseNaturally(page, targetX, targetY);
  await page.waitForTimeout(randomDelay(100, 300));
};

/**
 * Scroll with mouse wheel (more natural than page.evaluate scrolling)
 */
export const wheelScroll = async (page: Page, deltaY: number): Promise<void> => {
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(randomDelay(100, 300));
};

/**
 * Scroll randomly (simulate reading or browsing)
 */
export const scrollRandomly = async (page: Page): Promise<void> => {
  const scrollCount = randomDelay(1, 3);
  for (let i = 0; i < scrollCount; i++) {
    const scrollAmount = randomDelay(100, 400);
    await wheelScroll(page, scrollAmount);
    await page.waitForTimeout(randomDelay(300, 800));
  }
};

/**
 * Re-read original tweet before submitting (30% chance)
 */
export const reReadOriginalTweet = async (page: Page): Promise<void> => {
  // Scroll up slightly to re-read
  await wheelScroll(page, randomDelay(-200, -100));
  await page.waitForTimeout(randomDelay(1000, 2000));

  // Scroll back down
  await wheelScroll(page, randomDelay(100, 200));
  await page.waitForTimeout(randomDelay(300, 600));
};

/**
 * Type with human-like behavior
 * Includes: varied speed, typos, mouse drift, pauses
 */
export const typeWithHumanBehavior = async (page: Page, text: string): Promise<void> => {
  const words = text.split(' ');

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Type each character
    for (let j = 0; j < word.length; j++) {
      const char = word[j];
      const delay = getTypingSpeedByPosition(j, word.length);

      // Simulate typo and correction
      await simulateTypo(page, char);
      await page.waitForTimeout(delay);

      // Occasional mouse drift while typing
      if (Math.random() < 0.1) {
        await mouseDriftDuringTyping(page);
      }
    }

    // Add space after word (except last word)
    if (i < words.length - 1) {
      await page.keyboard.type(' ');
      await page.waitForTimeout(randomDelay(50, 150));

      // Longer pause after punctuation
      if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
        await page.waitForTimeout(randomDelay(300, 700));
      }

      // 10% chance of brief pause between words (thinking)
      if (Math.random() < 0.1) {
        await page.waitForTimeout(randomDelay(500, 1500));
      }
    }
  }
};

/**
 * Calculate reading time based on text length
 * Average reading speed: 200-250 words per minute
 */
export const readingTime = async (page: Page, textLength: number): Promise<void> => {
  // Estimate: 5 characters per word, 200 words per minute
  const wordsCount = textLength / 5;
  const minutesToRead = wordsCount / 200;
  const millisecondsToRead = minutesToRead * 60 * 1000;

  // Add some randomness (read 70%-130% of average speed)
  const variance = randomDelay(70, 130) / 100;
  const actualReadingTime = millisecondsToRead * variance;

  // Cap reading time between 1s and 15s
  const cappedTime = Math.max(1000, Math.min(15000, actualReadingTime));

  await page.waitForTimeout(cappedTime);
};

/**
 * Pause to simulate thinking/reviewing
 */
export const thinkingPause = async (page: Page): Promise<void> => {
  const thinkingTime = randomDelay(2000, 5000);
  await page.waitForTimeout(thinkingTime);
};

/**
 * Random realistic delay for various actions
 */
export const realisticDelay = async (
  page: Page,
  action: 'short' | 'medium' | 'long'
): Promise<void> => {
  let delay: number;
  switch (action) {
    case 'short':
      delay = randomDelay(200, 600);
      break;
    case 'medium':
      delay = randomDelay(800, 1500);
      break;
    case 'long':
      delay = randomDelay(2000, 4000);
      break;
  }
  await page.waitForTimeout(delay);
};
