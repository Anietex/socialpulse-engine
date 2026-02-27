/**
 * OpenAI LLM Service Implementation
 * Uses OpenAI API for text generation
 */

import OpenAI from 'openai';
import { Content } from '../../domain/entities/Content';
import { ActionType } from '../../core/types/ActionType';
import { ILLMService, LLMResponse, LLMRequest } from '../../core/interfaces/ILLMService';
import {
  LLMUnavailableError,
  LLMGenerationError,
  LLMRateLimitError,
  LLMContentPolicyError,
  LLMConfigurationError,
} from '../../core/errors/LLMErrors';
import { LLMConfig, LLMProviderConfig } from './LLMConfig';
import { logger } from '../../../config/logger';

/**
 * OpenAI LLM Service
 */
export class OpenAILLMService implements ILLMService {
  private client!: OpenAI;
  private config!: LLMProviderConfig;
  private isHealthy: boolean = false;

  constructor(config?: Partial<LLMProviderConfig>) {
    try {
      // Get config from environment or use provided
      this.config = {
        ...LLMConfig.getProviderConfig(),
        ...config,
      };

      // Validate API key
      if (!this.config.apiKey) {
        throw new LLMConfigurationError('OpenAI API key is required');
      }

      // Initialize OpenAI client
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        timeout: this.config.timeout,
        maxRetries: 2,
      });

      this.isHealthy = true;

      logger.info('OpenAI LLM Service initialized', {
        model: this.config.defaultModel,
        temperature: this.config.temperature,
      });
    } catch (error) {
      this.isHealthy = false;
      logger.error('Failed to initialize OpenAI LLM Service', { error });

      // Don't throw - allow service to fail gracefully
      if (error instanceof LLMConfigurationError) {
        throw error;
      }
    }
  }

  /**
   * Generate reply text
   */
  async generateReply(content: Content, _context?: LLMRequest['context']): Promise<LLMResponse> {
    try {
      // Build prompt
      const prompt = LLMConfig.buildReplyPrompt(content);

      // Generate with OpenAI (no options from context - use defaults)
      const response = await this.generateWithOpenAI(prompt.system, prompt.user);

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
      // Build prompt
      const prompt = LLMConfig.buildQuotePrompt(content);

      // Generate with OpenAI (no options from context - use defaults)
      const response = await this.generateWithOpenAI(prompt.system, prompt.user);

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
          'openai'
        );
    }
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isHealthy || !this.config.apiKey) {
      return false;
    }

    try {
      // Simple health check - list models (lightweight operation)
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.warn('OpenAI health check failed', { error });
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
      provider: 'openai',
      error: available ? undefined : 'Service unavailable or API key invalid',
    };
  }

  /**
   * Generate text using OpenAI API
   */
  private async generateWithOpenAI(
    systemMessage: string,
    userMessage: string,
    options?: LLMRequest['options']
  ): Promise<LLMResponse> {
    if (!this.isHealthy) {
      throw new LLMUnavailableError('openai', 'Service not initialized properly');
    }

    try {
      const startTime = Date.now();

      // Call OpenAI API
      const completion = await this.client.chat.completions.create({
        model: options?.model || this.config.defaultModel,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        temperature: options?.temperature ?? this.config.temperature,
        max_tokens: options?.maxTokens || this.config.maxTokens,
        n: 1,
      });

      const generatedText = completion.choices[0]?.message?.content?.trim();

      if (!generatedText) {
        throw new LLMGenerationError('OpenAI returned empty response', 'openai');
      }

      const duration = Date.now() - startTime;

      logger.info('OpenAI generation successful', {
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens,
        duration,
      });

      return {
        text: generatedText,
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens,
        generatedAt: new Date(),
        isFallback: false,
      };
    } catch (error: any) {
      // Handle OpenAI-specific errors
      if (error?.status === 429) {
        const resetAt = error?.headers?.['x-ratelimit-reset-tokens']
          ? new Date(error.headers['x-ratelimit-reset-tokens'])
          : undefined;

        throw new LLMRateLimitError('openai', resetAt, error);
      }

      if (error?.status === 400 && error?.message?.includes('content_policy')) {
        throw new LLMContentPolicyError(
          'openai',
          error.message || 'Content policy violation',
          error
        );
      }

      if (error?.status === 401 || error?.status === 403) {
        this.isHealthy = false;
        throw new LLMUnavailableError(
          'openai',
          'Invalid API key or insufficient permissions',
          error
        );
      }

      // Generic generation error
      throw new LLMGenerationError(
        error?.message || 'OpenAI generation failed',
        'openai',
        error?.status,
        error
      );
    }
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
