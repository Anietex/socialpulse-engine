/**
 * Ollama LLM Service Implementation
 * Uses Ollama local LLM for text generation
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
 * Ollama API Configuration
 */
export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  temperature: number;
  maxTokens: number;
}

/**
 * Ollama API Response
 */
interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama LLM Service
 * Uses local Ollama instance for text generation
 */
export class OllamaLLMService implements ILLMService {
  private config: OllamaConfig;
  private isHealthy: boolean = false;

  constructor(config?: Partial<OllamaConfig>) {
    // Default Ollama configuration
    const defaultConfig: OllamaConfig = {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000'),
      temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '500'),
    };

    this.config = {
      ...defaultConfig,
      ...config,
    };

    // Validate configuration
    if (!this.config.baseUrl) {
      throw new LLMConfigurationError('Ollama base URL is required');
    }

    if (!this.config.model) {
      throw new LLMConfigurationError('Ollama model name is required');
    }

    logger.info('Ollama LLM Service initialized', {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      temperature: this.config.temperature,
    });

    // Check health asynchronously
    this.checkHealth();
  }

  /**
   * Check Ollama health
   */
  private async checkHealth(): Promise<void> {
    try {
      const available = await this.isAvailable();
      this.isHealthy = available;
      if (available) {
        logger.info('Ollama service is healthy');
      } else {
        logger.warn('Ollama service is not available');
      }
    } catch (error) {
      this.isHealthy = false;
      logger.warn('Ollama health check failed', { error });
    }
  }

  /**
   * Generate reply text
   */
  async generateReply(content: Content, _context?: LLMRequest['context']): Promise<LLMResponse> {
    try {
      // Build prompt
      const prompt = LLMConfig.buildReplyPrompt(content);

      // Generate with Ollama
      const response = await this.generateWithOllama(prompt.system, prompt.user);

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

      // Generate with Ollama
      const response = await this.generateWithOllama(prompt.system, prompt.user);

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
          'ollama'
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

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      // Check if our model is available
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models || [];
      const modelExists = models.some((m: any) => m.name === this.config.model);

      return modelExists;
    } catch (error) {
      logger.debug('Ollama availability check failed', { error });
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
      provider: 'ollama',
      error: available
        ? undefined
        : `Ollama not available at ${this.config.baseUrl} or model ${this.config.model} not found`,
    };
  }

  /**
   * Generate text using Ollama API
   */
  private async generateWithOllama(
    systemMessage: string,
    userMessage: string,
    options?: LLMRequest['options']
  ): Promise<LLMResponse> {
    if (!this.isHealthy) {
      throw new LLMUnavailableError(
        'ollama',
        'Service not initialized properly or Ollama not running'
      );
    }

    try {
      const startTime = Date.now();

      // Combine system and user messages
      const fullPrompt = `${systemMessage}\n\n${userMessage}`;

      // Call Ollama API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.config.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? this.config.temperature,
            num_predict: options?.maxTokens || this.config.maxTokens,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new LLMRateLimitError('ollama', undefined);
        }

        if (response.status === 404) {
          throw new LLMUnavailableError('ollama', `Model ${this.config.model} not found`);
        }

        throw new LLMGenerationError(
          `Ollama API returned ${response.status}`,
          'ollama',
          response.status
        );
      }

      const data = (await response.json()) as OllamaResponse;

      const generatedText = data.response?.trim();

      if (!generatedText) {
        throw new LLMGenerationError('Ollama returned empty response', 'ollama');
      }

      const duration = Date.now() - startTime;

      logger.info('Ollama generation successful', {
        model: data.model,
        tokensGenerated: data.eval_count,
        duration,
      });

      return {
        text: generatedText,
        model: data.model,
        tokensUsed: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        generatedAt: new Date(),
        isFallback: false,
      };
    } catch (error: any) {
      // Handle fetch errors
      if (error.name === 'AbortError') {
        throw new LLMGenerationError('Ollama request timed out', 'ollama', 408);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        this.isHealthy = false;
        throw new LLMUnavailableError(
          'ollama',
          `Cannot connect to Ollama at ${this.config.baseUrl}`,
          error
        );
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
        error?.message || 'Ollama generation failed',
        'ollama',
        undefined,
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
