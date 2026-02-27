import { decode } from 'html-entities';

/**
 * Tweet text cleaning utility
 * Implements comprehensive cleaning rules for tweet preprocessing
 */
export class TextCleaner {
  /**
   * Clean tweet text according to all defined rules
   */
  static clean(text: string): string {
    if (!text || typeof text !== 'string') {
      return '<EMPTY>';
    }

    let cleaned = text;

    // Rule 3: Remove leading retweet prefixes (RT @user:, rt @user:)
    cleaned = cleaned.replace(/^RT\s+@\w+:\s*/i, '');

    // Rule 1: Replace all URLs with <URL>
    cleaned = cleaned.replace(
      /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi,
      '<URL>'
    );

    // Rule 2: Replace all @username mentions with <USER>
    cleaned = cleaned.replace(/@\w+/g, '<USER>');

    // Rule 4: Convert hashtags to plain words (remove # but keep the word)
    cleaned = cleaned.replace(/#(\w+)/g, '$1');

    // Rule 5: Decode HTML entities
    cleaned = decode(cleaned);

    // Rules 6 & 7: Preserve emojis and emoticons (no action needed)

    // Rule 11: Normalize repeated punctuation
    cleaned = cleaned.replace(/!{2,}/g, '!'); // Multiple ! → !
    cleaned = cleaned.replace(/\?{2,}/g, '?'); // Multiple ? → ?
    cleaned = cleaned.replace(/([?!]){3,}/g, (match) => {
      // Collapse ?!?!? to ?!
      const hasQuestion = match.includes('?');
      const hasExclamation = match.includes('!');
      if (hasQuestion && hasExclamation) return '?!';
      return hasQuestion ? '?' : '!';
    });

    // Rule 12: Remove boilerplate noise
    // Remove tracking parameters
    cleaned = cleaned.replace(/utm_[a-z]+=[^\s&]*/gi, '');
    // Remove common boilerplate phrases
    cleaned = cleaned.replace(/click here to unsubscribe/gi, '');
    cleaned = cleaned.replace(/via IFTTT/gi, '');
    cleaned = cleaned.replace(/sent from my \w+/gi, '');

    // Rule 13: Remove non-printable characters
    // Remove control characters (U+0000 to U+001F, U+007F to U+009F)
    // But preserve newlines temporarily (we'll remove them later)
    cleaned = cleaned.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '');

    // Rule 14: Remove emoji variation selectors
    cleaned = cleaned.replace(/\uFE0F/g, '');

    // Additional: Remove zero-width characters
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Rule 15: Keep the tweet as a single line (remove line breaks)
    cleaned = cleaned.replace(/[\r\n]+/g, ' ');

    // Rule 8: Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces → single space
    cleaned = cleaned.trim(); // Remove leading/trailing whitespace

    // Rule 19: If tweet is empty or contains only tokens, return <EMPTY>
    const onlyTokens = /^(?:<URL>|<USER>|\s)+$/.test(cleaned);
    if (!cleaned || onlyTokens) {
      return '<EMPTY>';
    }

    // Rules 9, 10, 16, 17, 18: Preserve original (no lowercasing, no spelling correction,
    // no stopword removal, no lemmatization, no translation, no rewriting)

    return cleaned;
  }

  /**
   * Check if cleaned text is empty
   */
  static isEmpty(text: string): boolean {
    return text === '<EMPTY>';
  }

  /**
   * Batch clean multiple tweets
   */
  static cleanBatch(texts: string[]): string[] {
    return texts.map((text) => this.clean(text));
  }
}
