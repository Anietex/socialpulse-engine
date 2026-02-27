/**
 * LLMConfig Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LLMConfig } from '../../llm/LLMConfig';
import { Content } from '../../../domain/entities/Content';
import { Author } from '../../../domain/entities/Author';

describe('LLMConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getProviderConfig', () => {
    it('should throw error if OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => LLMConfig.getProviderConfig()).toThrow(
        'OPENAI_API_KEY environment variable is required'
      );
    });

    it('should return config with defaults when only API key is provided', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const config = LLMConfig.getProviderConfig();

      expect(config).toEqual({
        provider: 'openai',
        apiKey: 'sk-test-key',
        defaultModel: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 150,
        timeout: 30000,
      });
    });

    it('should use environment variables when provided', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.LLM_MODEL = 'gpt-4';
      process.env.LLM_TEMPERATURE = '0.9';
      process.env.LLM_MAX_TOKENS = '200';
      process.env.LLM_TIMEOUT = '60000';

      const config = LLMConfig.getProviderConfig();

      expect(config).toEqual({
        provider: 'openai',
        apiKey: 'sk-test-key',
        defaultModel: 'gpt-4',
        temperature: 0.9,
        maxTokens: 200,
        timeout: 60000,
      });
    });

    it('should parse numeric environment variables correctly', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.LLM_TEMPERATURE = '0.5';
      process.env.LLM_MAX_TOKENS = '100';

      const config = LLMConfig.getProviderConfig();

      expect(typeof config.temperature).toBe('number');
      expect(typeof config.maxTokens).toBe('number');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(100);
    });
  });

  describe('buildReplyPrompt', () => {
    it('should build reply prompt with content text', () => {
      const content = createTestContent({ text: 'This is a test post' });

      const prompt = LLMConfig.buildReplyPrompt(content);

      expect(prompt.system).toContain('social media engagement assistant');
      expect(prompt.system).toContain('1-2 sentences');
      expect(prompt.user).toContain('This is a test post');
      expect(prompt.user).toContain('Reply (1-2 sentences');
    });

    it('should include author name in context when available', () => {
      const content = createTestContent({ text: 'Test post' });

      const prompt = LLMConfig.buildReplyPrompt(content);

      expect(prompt.user).toContain('Author: Test Author');
    });

    it('should include category in context when available', () => {
      const content = createTestContent({
        text: 'Test post',
        category: 'Technology',
      });

      const prompt = LLMConfig.buildReplyPrompt(content);

      expect(prompt.user).toContain('Category: Technology');
    });

    it('should indicate popular posts', () => {
      const author = new Author(
        'author-1',
        'Test Author',
        'testauthor',
        undefined,
        undefined,
        false,
        1000
      );

      const content = Content.builder()
        .id('twitter:tweet-1')
        .platformId('twitter')
        .platformContentId('tweet-1')
        .text('Popular post')
        .author(author.toPlain())
        .url('https://twitter.com/test/status/1')
        .createdAt(new Date())
        .metrics({ likes: 2000, comments: 100, shares: 50, views: 10000 })
        .status('PENDING_CATEGORIZATION' as any)
        .media([])
        .isReply(false)
        .isRepost(false)
        .isQuote(false)
        .build();

      const prompt = LLMConfig.buildReplyPrompt(content);

      expect(prompt.user).toContain('popular post');
    });

    it('should not include category context when category is missing', () => {
      const author = new Author(
        'author-1',
        'Test Author',
        'testauthor',
        undefined,
        undefined,
        false,
        100 // Low engagement
      );

      const content = Content.builder()
        .id('twitter:tweet-1')
        .platformId('twitter')
        .platformContentId('tweet-1')
        .text('Minimal post')
        .author(author.toPlain())
        .url('https://twitter.com/test/status/1')
        .createdAt(new Date())
        .metrics({ likes: 5, comments: 0, shares: 0, views: 50 })
        .status('PENDING_CATEGORIZATION' as any)
        .media([])
        .isReply(false)
        .isRepost(false)
        .isQuote(false)
        .build();

      const prompt = LLMConfig.buildReplyPrompt(content);

      // Should still have the text
      expect(prompt.user).toContain('Minimal post');
      // Should have author since it's provided
      expect(prompt.user).toContain('Author:');
      // Should not have category since it's not provided
      expect(prompt.user).not.toContain('Category:');
    });
  });

  describe('buildQuotePrompt', () => {
    it('should build quote prompt with content text', () => {
      const content = createTestContent({ text: 'Interesting perspective' });

      const prompt = LLMConfig.buildQuotePrompt(content);

      expect(prompt.system).toContain('engaging quote tweets');
      expect(prompt.system).toContain('additional perspective');
      expect(prompt.user).toContain('Interesting perspective');
      expect(prompt.user).toContain('Quote Tweet');
    });

    it('should have different system prompt than reply', () => {
      const content = createTestContent({ text: 'Test' });

      const replyPrompt = LLMConfig.buildReplyPrompt(content);
      const quotePrompt = LLMConfig.buildQuotePrompt(content);

      expect(replyPrompt.system).not.toBe(quotePrompt.system);
      expect(replyPrompt.user).not.toBe(quotePrompt.user);
    });
  });

  describe('getRandomFallback', () => {
    it('should return a reply fallback text', () => {
      const fallback = LLMConfig.getRandomFallback('reply');

      expect(fallback).toBeDefined();
      expect(typeof fallback).toBe('string');
      expect(fallback.length).toBeGreaterThan(0);
    });

    it('should return a quote fallback text', () => {
      const fallback = LLMConfig.getRandomFallback('quote');

      expect(fallback).toBeDefined();
      expect(typeof fallback).toBe('string');
      expect(fallback.length).toBeGreaterThan(0);
    });

    it('should return different values from the pool', () => {
      const values = new Set<string>();

      // Get 20 random values - should get at least 2 different ones
      for (let i = 0; i < 20; i++) {
        values.add(LLMConfig.getRandomFallback('reply'));
      }

      expect(values.size).toBeGreaterThan(1);
    });

    it('should return values from the correct pool', () => {
      const replyFallback = LLMConfig.getRandomFallback('reply');
      const quoteFallback = LLMConfig.getRandomFallback('quote');

      // Reply fallbacks should be different from quote fallbacks
      expect(LLMConfig.FALLBACK_TEXTS.reply).toContain(replyFallback);
      expect(LLMConfig.FALLBACK_TEXTS.quote).toContain(quoteFallback);
    });
  });

  describe('FALLBACK_TEXTS', () => {
    it('should have multiple reply options', () => {
      expect(LLMConfig.FALLBACK_TEXTS.reply).toBeInstanceOf(Array);
      expect(LLMConfig.FALLBACK_TEXTS.reply.length).toBeGreaterThan(1);
    });

    it('should have multiple quote options', () => {
      expect(LLMConfig.FALLBACK_TEXTS.quote).toBeInstanceOf(Array);
      expect(LLMConfig.FALLBACK_TEXTS.quote.length).toBeGreaterThan(1);
    });

    it('should have professional, appropriate fallback texts', () => {
      const allTexts = [...LLMConfig.FALLBACK_TEXTS.reply, ...LLMConfig.FALLBACK_TEXTS.quote];

      allTexts.forEach((text) => {
        // Should not be empty
        expect(text.length).toBeGreaterThan(0);
        // Should not be overly long
        expect(text.length).toBeLessThan(200);
        // Should be professional (no excessive punctuation)
        expect(text.match(/!{2,}/)).toBeNull();
        expect(text.match(/\?{2,}/)).toBeNull();
      });
    });
  });
});

/**
 * Helper to create test content
 */
function createTestContent(
  overrides?: Partial<{
    text: string;
    category: string;
  }>
): Content {
  const author = new Author(
    'author-1',
    'Test Author',
    'testauthor',
    undefined,
    undefined,
    false,
    1000
  );

  const builder = Content.builder()
    .id('twitter:tweet-1')
    .platformId('twitter')
    .platformContentId('tweet-1')
    .text(overrides?.text || 'Test content')
    .author(author.toPlain())
    .url('https://twitter.com/test/status/1')
    .createdAt(new Date())
    .metrics({ likes: 10, comments: 5, shares: 2, views: 100 })
    .status('PENDING_CATEGORIZATION' as any)
    .media([])
    .isReply(false)
    .isRepost(false)
    .isQuote(false);

  if (overrides?.category) {
    builder.category(overrides.category);
  }

  return builder.build();
}
