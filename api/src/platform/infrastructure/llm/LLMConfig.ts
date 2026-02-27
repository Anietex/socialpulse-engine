/**
 * LLM Configuration
 * Prompt templates and settings for LLM generation
 */

import { Content } from '../../domain/entities/Content';

/**
 * LLM provider configuration
 */
export interface LLMProviderConfig {
  /**
   * Provider name
   */
  provider: 'openai' | 'anthropic' | 'custom';

  /**
   * API key (from environment variable)
   */
  apiKey: string;

  /**
   * Default model to use
   */
  defaultModel: string;

  /**
   * Default temperature (0-1)
   */
  temperature: number;

  /**
   * Max tokens for generation
   */
  maxTokens: number;

  /**
   * API base URL (for custom providers)
   */
  baseUrl?: string;

  /**
   * Request timeout (ms)
   */
  timeout: number;
}

/**
 * Prompt template configuration
 */
export interface PromptTemplate {
  /**
   * System message
   */
  system: string;

  /**
   * User message template with placeholders
   */
  user: string;
}

/**
 * LLM configuration
 */
export class LLMConfig {
  /**
   * Get provider configuration from environment
   */
  static getProviderConfig(): LLMProviderConfig {
    const apiKey = process.env.OPENAI_API_KEY || '';

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    return {
      provider: 'openai',
      apiKey,
      defaultModel: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '150', 10),
      timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
    };
  }

  /**
   * Reply generation prompt template
   */
  static readonly REPLY_PROMPT: PromptTemplate = {
    system: `You are a helpful social media engagement assistant. Generate thoughtful, concise replies to posts that:
- Are authentic and conversational
- Add value to the discussion
- Are 1-2 sentences maximum
- Avoid excessive emojis or hashtags
- Match the tone of the original post
- Are appropriate for professional social media engagement`,

    user: `Generate a thoughtful reply to this post:

Original Post: "{{TEXT}}"
{{CONTEXT}}

Reply (1-2 sentences, conversational):`,
  };

  /**
   * Quote generation prompt template
   */
  static readonly QUOTE_PROMPT: PromptTemplate = {
    system: `You are a helpful social media engagement assistant. Generate engaging quote tweets that:
- Provide additional perspective or insight
- Are thoughtful and add value
- Are 1-2 sentences maximum
- Avoid excessive emojis or hashtags
- Complement rather than repeat the original post
- Are appropriate for professional social media engagement`,

    user: `Generate an engaging quote tweet for this post:

Original Post: "{{TEXT}}"
{{CONTEXT}}

Quote Tweet (1-2 sentences, adds perspective):`,
  };

  /**
   * Fallback texts when LLM fails
   */
  static readonly FALLBACK_TEXTS = {
    reply: [
      'Great insights! Thanks for sharing.',
      'This is really interesting, thanks for posting!',
      'Appreciate you sharing this perspective.',
      'Thanks for sharing your thoughts on this!',
      'Really valuable insights here.',
    ],
    quote: [
      'Interesting perspective on this topic!',
      'Worth reading and considering!',
      'Great points made here.',
      'This is worth your attention!',
      'Insightful thoughts here.',
    ],
  };

  /**
   * Build reply prompt with content context
   */
  static buildReplyPrompt(content: Content): { system: string; user: string } {
    const context = this.buildContext(content);

    return {
      system: this.REPLY_PROMPT.system,
      user: this.REPLY_PROMPT.user
        .replace('{{TEXT}}', content.text)
        .replace('{{CONTEXT}}', context),
    };
  }

  /**
   * Build quote prompt with content context
   */
  static buildQuotePrompt(content: Content): { system: string; user: string } {
    const context = this.buildContext(content);

    return {
      system: this.QUOTE_PROMPT.system,
      user: this.QUOTE_PROMPT.user
        .replace('{{TEXT}}', content.text)
        .replace('{{CONTEXT}}', context),
    };
  }

  /**
   * Build context string from content metadata
   */
  private static buildContext(content: Content): string {
    const parts: string[] = [];

    if (content.author.name) {
      parts.push(`Author: ${content.author.name}`);
    }

    if (content.category) {
      parts.push(`Category: ${content.category}`);
    }

    if (content.metrics.getLikes() > 1000) {
      parts.push('Note: This is a popular post');
    }

    return parts.length > 0 ? parts.join('\n') : '';
  }

  /**
   * Get random fallback text
   */
  static getRandomFallback(type: 'reply' | 'quote'): string {
    const texts = this.FALLBACK_TEXTS[type];
    return texts[Math.floor(Math.random() * texts.length)];
  }
}
