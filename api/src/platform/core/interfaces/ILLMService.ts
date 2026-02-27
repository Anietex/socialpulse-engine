/**
 * LLM Service Interface
 * Abstraction for LLM providers (OpenAI, Anthropic, etc.)
 */

import { Content } from '../../domain/entities/Content';
import { ActionType } from '../types/ActionType';

/**
 * LLM generation request
 */
export interface LLMRequest {
  /**
   * Type of content to generate
   */
  type: 'reply' | 'quote';

  /**
   * Original content to respond to
   */
  content: Content;

  /**
   * Optional context for generation
   */
  context?: {
    authorName?: string;
    category?: string;
    keywords?: string[];
  };

  /**
   * Generation options
   */
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  };
}

/**
 * LLM generation response
 */
export interface LLMResponse {
  /**
   * Generated text
   */
  text: string;

  /**
   * Model used for generation
   */
  model: string;

  /**
   * Tokens used
   */
  tokensUsed?: number;

  /**
   * Generation timestamp
   */
  generatedAt: Date;

  /**
   * Whether fallback was used
   */
  isFallback: boolean;
}

/**
 * LLM Service Interface
 */
export interface ILLMService {
  /**
   * Generate reply text for a comment/reply action
   * @param content Content to reply to
   * @param context Optional context
   * @returns Generated reply text
   */
  generateReply(content: Content, context?: LLMRequest['context']): Promise<LLMResponse>;

  /**
   * Generate quote text for a quote action
   * @param content Content to quote
   * @param context Optional context
   * @returns Generated quote text
   */
  generateQuote(content: Content, context?: LLMRequest['context']): Promise<LLMResponse>;

  /**
   * Generate text for any action type
   * @param actionType Type of action
   * @param content Content to generate for
   * @param context Optional context
   * @returns Generated text
   */
  generateForAction(
    actionType: ActionType,
    content: Content,
    context?: LLMRequest['context']
  ): Promise<LLMResponse>;

  /**
   * Check if LLM service is available
   * @returns True if service is ready
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get service health status
   * @returns Health information
   */
  getHealth(): Promise<{
    available: boolean;
    provider: string;
    error?: string;
  }>;
}
