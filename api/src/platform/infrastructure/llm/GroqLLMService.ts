/**
 * Groq LLM Service Implementation
 * Uses Groq's fast inference API for text generation
 */

import { Content } from '../../domain/entities/Content';
import { ActionType } from '../../core/types/ActionType';
import { ILLMService, LLMResponse, LLMRequest } from '../../core/interfaces/ILLMService';
import {
  LLMUnavailableError,
  LLMGenerationError,
  LLMRateLimitError,
  LLMConfigurationError,
} from '../../core/errors/LLMErrors';
import { LLMConfig } from './LLMConfig';
import { logger } from '../../../config/logger';

/**
 * Groq API Configuration
 */
export interface GroqConfig {
  apiKey: string;
  model: string;
  timeout: number;
  temperature: number;
  maxTokens: number;
}

/**
 * Groq API Response
 */
interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Groq LLM Service
 * Fast, affordable inference using Groq's LPU architecture
 */
export class GroqLLMService implements ILLMService {
  private config: GroqConfig;
  private isHealthy: boolean = false;

  constructor(config?: Partial<GroqConfig>) {
    // Default Groq configuration
    const defaultConfig: GroqConfig = {
      apiKey: process.env.GROQ_API_KEY || '',
      model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      timeout: parseInt(process.env.GROQ_TIMEOUT || '30000'),
      temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '60'),
    };

    this.config = {
      ...defaultConfig,
      ...config,
    };

    // Validate API key
    if (!this.config.apiKey) {
      throw new LLMConfigurationError('Groq API key is required');
    }

    logger.info('Groq LLM Service initialized', {
      model: this.config.model,
      temperature: this.config.temperature,
    });

    // Check health asynchronously
    this.checkHealth();
  }

  /**
   * Check Groq health
   */
  private async checkHealth(): Promise<void> {
    try {
      const available = await this.isAvailable();
      this.isHealthy = available;
      if (available) {
        logger.info('Groq service is healthy');
      } else {
        logger.warn('Groq service is not available');
      }
    } catch (error) {
      this.isHealthy = false;
      logger.warn('Groq health check failed', { error });
    }
  }

  /**
   * Generate reply text
   */
  async generateReply(content: Content, _context?: LLMRequest['context']): Promise<LLMResponse> {
    try {
      // Build engagement-specific prompt
      const prompt = this.buildEngagementPrompt(content, 'reply');

      // Generate with Groq
      const response = await this.generateWithGroq(prompt);

      return response;
    } catch (error) {
      logger.error('Reply generation failed, using fallback', {
        contentId: content.id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return fallback response
      return this.createFallbackResponse('reply');
    }
  }

  /**
   * Generate quote text
   */
  async generateQuote(content: Content, _context?: LLMRequest['context']): Promise<LLMResponse> {
    try {
      // Build engagement-specific prompt
      const prompt = this.buildEngagementPrompt(content, 'quote');

      // Generate with Groq
      const response = await this.generateWithGroq(prompt);

      return response;
    } catch (error) {
      logger.error('Quote generation failed, using fallback', {
        contentId: content.id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return fallback response
      return this.createFallbackResponse('quote');
    }
  }

  /**
   * Generate text for any action type
   */
  async generateForAction(
    actionType: ActionType,
    content: Content,
    context?: LLMRequest['context']
  ): Promise<LLMResponse> {
    switch (actionType) {
      case ActionType.COMMENT:
        return this.generateReply(content, context);

      case ActionType.QUOTE:
        return this.generateQuote(content, context);

      default:
        throw new LLMGenerationError(
          `Action type ${actionType} does not require LLM generation`,
          'groq'
        );
    }
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      logger.debug('Groq availability check failed', { error });
      return false;
    }
  }

  /**
   * Get service health
   */
  async getHealth(): Promise<{
    available: boolean;
    provider: string;
    error?: string;
  }> {
    const available = await this.isAvailable();

    return {
      available,
      provider: 'groq',
      error: available ? undefined : 'Groq API not available or invalid API key',
    };
  }

  /**
   * Generate text using Groq API
   */
  private async generateWithGroq(prompt: string): Promise<LLMResponse> {
    if (!this.isHealthy) {
      throw new LLMUnavailableError('groq', 'Service not initialized properly');
    }

    try {
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content:
                "You are a thoughtful social media user who reads carefully and understands tone, sarcasm, and context. You write authentic, human replies like you're texting a friend. Be casually skeptical of hype and big claims. NEVER use: gaming terms (leveled up, epic, flex), corporate speak (conviction, paradigm), or marketing hype (bold, revolutionary). Never fanboy over CEOs or be reverent to crypto personalities.",
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new LLMRateLimitError('groq', undefined);
        }

        throw new LLMGenerationError(
          `Groq API returned ${response.status}`,
          'groq',
          response.status
        );
      }

      const data = (await response.json()) as GroqResponse;

      const generatedText = data.choices[0]?.message?.content?.trim();

      if (!generatedText) {
        throw new LLMGenerationError('Groq returned empty response', 'groq');
      }

      const duration = Date.now() - startTime;

      logger.info('Groq generation successful', {
        model: data.model,
        tokensUsed: data.usage.total_tokens,
        duration,
      });

      return {
        text: this.truncate(generatedText),
        model: data.model,
        tokensUsed: data.usage.total_tokens,
        generatedAt: new Date(),
        isFallback: false,
      };
    } catch (error: any) {
      // Handle fetch errors
      if (error.name === 'AbortError') {
        throw new LLMGenerationError('Groq request timed out', 'groq', 408);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        this.isHealthy = false;
        throw new LLMUnavailableError('groq', 'Cannot connect to Groq API', error);
      }

      // Re-throw LLM errors
      if (
        error instanceof LLMUnavailableError ||
        error instanceof LLMGenerationError ||
        error instanceof LLMRateLimitError
      ) {
        throw error;
      }

      // Generic generation error
      throw new LLMGenerationError(
        error?.message || 'Groq generation failed',
        'groq',
        undefined,
        error
      );
    }
  }

  /**
   * Build engagement-specific prompt (anti-AI language)
   */
  private buildEngagementPrompt(content: Content, action: 'reply' | 'quote'): string {
    const category = content.category ? `Category: ${content.category}\n` : '';
    const metrics = `Metrics: ${content.metrics.getLikes()} likes, ${content.metrics.getShares()} shares, ${content.metrics.getComments()} comments\n`;
    const text = content.getTextForProcessing();

    const replyInstructions = `You are writing a social media reply. Follow these rules:

1. READ CAREFULLY: Understand the post's actual message and tone
   - Is it sarcastic? Critical? Sincere? Joking?
   - Don't agree with absurd claims just because they're stated

2. REPLY NATURALLY (max 20 words):
   - Sound like a real person having a casual conversation
   - Match the energy and tone of the original post

3. AVOID THESE AI-ISH PHRASES:
   - Gaming terms: "leveled up", "game changer", "next level", "epic"
   - Corporate speak: "paradigm", "ecosystem", "conviction"
   - Marketing hype: "revolutionary", "breakthrough", "transformative"
   - AI tells: "fascinating", "intriguing", "noteworthy", "compelling"
   - Emojis and hashtags

Write like you're texting a friend, not writing a LinkedIn post.`;

    const quoteInstructions = `You are writing a quote-post. Follow these rules:

1. READ CAREFULLY: Understand the post's actual message and tone

2. ADD YOUR TAKE (max 25 words):
   - Sound like a real person sharing a genuine thought
   - Match the energy and tone appropriately

3. AVOID THESE AI-ISH PHRASES:
   - Gaming terms: "leveled up", "game changer", "next level", "epic"
   - Corporate speak: "paradigm", "ecosystem", "conviction"
   - Marketing hype: "revolutionary", "breakthrough", "transformative"
   - AI tells: "fascinating", "intriguing", "noteworthy", "compelling"
   - Emojis and hashtags

Write like you're texting a friend, not writing a LinkedIn post.`;

    const instruction = action === 'reply' ? replyInstructions : quoteInstructions;

    return `${instruction}

${category}${metrics}Author: ${content.author.handle}
Post: """${text}"""

Response:`;
  }

  /**
   * Truncate text to max 160 characters
   */
  private truncate(text: string): string {
    const maxLength = 160;
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1).trimEnd() + '…';
  }

  /**
   * Create fallback response when LLM fails
   */
  private createFallbackResponse(type: 'reply' | 'quote'): LLMResponse {
    return {
      text: LLMConfig.getRandomFallback(type),
      model: 'fallback',
      generatedAt: new Date(),
      isFallback: true,
    };
  }
}
