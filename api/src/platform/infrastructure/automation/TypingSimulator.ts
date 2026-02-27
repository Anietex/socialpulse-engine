/**
 * Typing Simulator
 * Simulates realistic human typing with variable speed and typos
 */

import { Page } from 'playwright';
import { randomDelay } from './BehaviorUtils';

/**
 * Typo map - adjacent keys on QWERTY keyboard
 */
const TYPO_MAP: Record<string, string[]> = {
  a: ['s', 'q', 'w'],
  s: ['a', 'd', 'w', 'e'],
  d: ['s', 'f', 'e', 'r'],
  e: ['w', 'r', 'd', 's'],
  f: ['d', 'g', 'r', 't'],
  g: ['f', 'h', 't', 'y'],
  h: ['g', 'j', 'y', 'u'],
  i: ['u', 'o', 'k', 'j'],
  j: ['h', 'k', 'u', 'i'],
  k: ['j', 'l', 'i', 'o'],
  l: ['k', 'p', 'o'],
  n: ['b', 'm', 'h', 'j'],
  o: ['i', 'p', 'l', 'k'],
  p: ['o', 'l'],
  q: ['w', 'a'],
  r: ['e', 't', 'f', 'd'],
  t: ['r', 'y', 'g', 'f'],
  u: ['y', 'i', 'j', 'h'],
  v: ['c', 'b', 'f', 'g'],
  w: ['q', 'e', 's', 'a'],
  x: ['z', 'c', 's', 'd'],
  y: ['t', 'u', 'h', 'g'],
  z: ['x', 'a'],
};

/**
 * Get typing speed based on position in text
 * Start: slow (thinking), Middle: fast (flowing), End: slow (finishing)
 */
function getTypingSpeedByPosition(charIndex: number, totalLength: number): number {
  const progress = charIndex / totalLength;

  if (progress < 0.15) {
    // Start - slower (80-150ms) - thinking about what to say
    return Math.random() < 0.1 ? randomDelay(250, 500) : randomDelay(80, 150);
  } else if (progress < 0.85) {
    // Middle - faster (30-80ms) - in the flow
    return Math.random() < 0.08 ? randomDelay(200, 400) : randomDelay(30, 80);
  } else {
    // End - slowing down (60-120ms) - finishing thought
    return Math.random() < 0.1 ? randomDelay(250, 500) : randomDelay(60, 120);
  }
}

/**
 * Simulate a typo: type wrong character, pause, backspace, correct
 */
async function simulateTypo(page: Page, correctChar: string): Promise<void> {
  const lowerChar = correctChar.toLowerCase();
  const possibleTypos = TYPO_MAP[lowerChar] || ['x']; // Fallback to 'x'
  const typo = possibleTypos[Math.floor(Math.random() * possibleTypos.length)];

  // Type wrong character
  await page.keyboard.type(typo);
  await page.waitForTimeout(randomDelay(100, 250)); // Notice mistake

  // Backspace
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(randomDelay(80, 180));

  // Type correct character
  await page.keyboard.type(correctChar);
}

/**
 * Small mouse drift during typing (humans do this unconsciously)
 */
async function mouseDriftDuringTyping(page: Page): Promise<void> {
  const currentPos = { x: randomDelay(400, 800), y: randomDelay(300, 500) };
  const driftX = currentPos.x + randomDelay(-30, 30);
  const driftY = currentPos.y + randomDelay(-20, 20);

  await page.mouse.move(driftX, driftY);
}

/**
 * Type text with realistic human-like behavior
 *
 * Features:
 * - Variable typing speed (slow start, fast middle, slow end)
 * - Random typos with corrections (7% chance)
 * - Mouse drift during typing
 * - Realistic pauses
 */
export async function typeHumanLike(page: Page, text: string): Promise<void> {
  const words = text.split(' ');
  let charIndex = 0;

  for (let wordIdx = 0; wordIdx < words.length; wordIdx++) {
    const word = words[wordIdx];

    // 7% chance of typo on this word (if word has mappable chars)
    const shouldTypo = Math.random() < 0.07 && word.length > 2;
    const typoCharIndex = shouldTypo ? randomDelay(1, word.length - 1) : -1;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];

      if (i === typoCharIndex) {
        // Make a typo
        await simulateTypo(page, char);
      } else {
        // Type normally with varied speed
        await page.keyboard.type(char);
        await page.waitForTimeout(getTypingSpeedByPosition(charIndex, text.length));
      }

      charIndex++;

      // Occasional mouse drift during typing (15% chance per few chars)
      if (Math.random() < 0.15 && charIndex % 5 === 0) {
        await mouseDriftDuringTyping(page);
      }
    }

    // Add space after word (except last word)
    if (wordIdx < words.length - 1) {
      await page.keyboard.type(' ');
      await page.waitForTimeout(getTypingSpeedByPosition(charIndex, text.length));
      charIndex++;
    }
  }

  // Pause after typing (like reviewing what you wrote)
  await page.waitForTimeout(randomDelay(800, 2000));
}

/**
 * Type text with thinking time before starting
 */
export async function typeWithThinkingTime(page: Page, text: string): Promise<void> {
  // Simulate "thinking time" before typing (2-5 seconds)
  const thinkingTime = randomDelay(2000, 5000);
  await page.waitForTimeout(thinkingTime);

  await typeHumanLike(page, text);
}
