/**
 * LLM Provider Factory
 * Creates the appropriate LLM service based on configuration
 */

import { ILLMService } from '../../core/interfaces/ILLMService';
import { OpenAILLMService } from './OpenAILLMService';
import { OllamaLLMService } from './OllamaLLMService';
import { GroqLLMService } from './GroqLLMService';
import { OpenRouterLLMService } from './OpenRouterLLMService';
import { LLMConfigurationError } from '../../core/errors/LLMErrors';
import { logger } from '../../../config/logger';

/**
 * Supported LLM providers
 */
export enum LLMProviderType {
  OPENAI = 'openai',
  OLLAMA = 'ollama',
  GROQ = 'groq',
  OPENROUTER = 'openrouter',
}

/**
 * LLM Provider configuration
 */
export interface LLMProviderOptions {
  /**
   * Provider type
   */
  provider: LLMProviderType;

  /**
   * OpenAI-specific options
   */
  openai?: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  };

  /**
   * Ollama-specific options
   */
  ollama?: {
    baseUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  };

  /**
   * Groq-specific options
   */
  groq?: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  };

  /**
   * OpenRouter-specific options
   */
  openrouter?: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    referrer?: string;
    title?: string;
  };
}

/**
 * LLM Provider Factory
 * Creates LLM service instances based on configuration
 */
export class LLMProvider {
  /**
   * Create LLM service from environment configuration
   */
  static createFromEnvironment(): ILLMService | null {
    try {
      const provider = this.getProviderFromEnvironment();

      switch (provider) {
        case LLMProviderType.OPENAI:
          return this.createOpenAIService();

        case LLMProviderType.OLLAMA:
          return this.createOllamaService();

        case LLMProviderType.GROQ:
          return this.createGroqService();

        case LLMProviderType.OPENROUTER:
          return this.createOpenRouterService();

        default:
          logger.warn(`Unknown LLM provider: ${provider}`);
          return null;
      }
    } catch (error) {
      logger.error('Failed to create LLM service from environment', { error });
      return null;
    }
  }

  /**
   * Create LLM service from explicit options
   */
  static create(options: LLMProviderOptions): ILLMService {
    switch (options.provider) {
      case LLMProviderType.OPENAI:
        return this.createOpenAIService(options.openai);

      case LLMProviderType.OLLAMA:
        return this.createOllamaService(options.ollama);

      case LLMProviderType.GROQ:
        return this.createGroqService(options.groq);

      case LLMProviderType.OPENROUTER:
        return this.createOpenRouterService(options.openrouter);

      default:
        throw new LLMConfigurationError(`Unsupported LLM provider: ${options.provider}`);
    }
  }

  /**
   * Get provider type from environment
   */
  private static getProviderFromEnvironment(): LLMProviderType {
    const providerEnv = process.env.LLM_PROVIDER?.toLowerCase();

    switch (providerEnv) {
      case 'openai':
        return LLMProviderType.OPENAI;

      case 'ollama':
        return LLMProviderType.OLLAMA;

      case 'groq':
        return LLMProviderType.GROQ;

      case 'openrouter':
        return LLMProviderType.OPENROUTER;

      default:
        // Auto-select based on available API keys
        if (process.env.GROQ_API_KEY) {
          logger.info('LLM_PROVIDER not set, defaulting to Groq (API key found)');
          return LLMProviderType.GROQ;
        } else if (process.env.OPENROUTER_API_KEY) {
          logger.info('LLM_PROVIDER not set, defaulting to OpenRouter (API key found)');
          return LLMProviderType.OPENROUTER;
        } else if (process.env.OPENAI_API_KEY) {
          logger.info('LLM_PROVIDER not set, defaulting to OpenAI (API key found)');
          return LLMProviderType.OPENAI;
        } else {
          logger.info('LLM_PROVIDER not set, defaulting to Ollama');
          return LLMProviderType.OLLAMA;
        }
    }
  }

  /**
   * Create OpenAI LLM service
   */
  private static createOpenAIService(config?: LLMProviderOptions['openai']): ILLMService {
    logger.info('Creating OpenAI LLM service');

    return new OpenAILLMService({
      apiKey: config?.apiKey,
      defaultModel: config?.model,
      temperature: config?.temperature,
      maxTokens: config?.maxTokens,
      timeout: config?.timeout,
    });
  }

  /**
   * Create Ollama LLM service
   */
  private static createOllamaService(config?: LLMProviderOptions['ollama']): ILLMService {
    logger.info('Creating Ollama LLM service');

    return new OllamaLLMService({
      baseUrl: config?.baseUrl,
      model: config?.model,
      temperature: config?.temperature,
      maxTokens: config?.maxTokens,
      timeout: config?.timeout,
    });
  }

  /**
   * Create Groq LLM service
   */
  private static createGroqService(config?: LLMProviderOptions['groq']): ILLMService {
    logger.info('Creating Groq LLM service');

    return new GroqLLMService({
      apiKey: config?.apiKey,
      model: config?.model,
      temperature: config?.temperature,
      maxTokens: config?.maxTokens,
      timeout: config?.timeout,
    });
  }

  /**
   * Create OpenRouter LLM service
   */
  private static createOpenRouterService(config?: LLMProviderOptions['openrouter']): ILLMService {
    logger.info('Creating OpenRouter LLM service');

    return new OpenRouterLLMService({
      apiKey: config?.apiKey,
      model: config?.model,
      temperature: config?.temperature,
      maxTokens: config?.maxTokens,
      timeout: config?.timeout,
      referrer: config?.referrer,
      title: config?.title,
    });
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): LLMProviderType[] {
    const providers: LLMProviderType[] = [];

    // Check API-based providers
    if (process.env.GROQ_API_KEY) {
      providers.push(LLMProviderType.GROQ);
    }

    if (process.env.OPENROUTER_API_KEY) {
      providers.push(LLMProviderType.OPENROUTER);
    }

    if (process.env.OPENAI_API_KEY) {
      providers.push(LLMProviderType.OPENAI);
    }

    // Ollama is always potentially available (just needs to be running)
    providers.push(LLMProviderType.OLLAMA);

    return providers;
  }

  /**
   * Check if a specific provider is configured
   */
  static isProviderConfigured(provider: LLMProviderType): boolean {
    switch (provider) {
      case LLMProviderType.OPENAI:
        return !!process.env.OPENAI_API_KEY;

      case LLMProviderType.GROQ:
        return !!process.env.GROQ_API_KEY;

      case LLMProviderType.OPENROUTER:
        return !!process.env.OPENROUTER_API_KEY;

      case LLMProviderType.OLLAMA:
        // Ollama doesn't require API key, just needs to be running
        return true;

      default:
        return false;
    }
  }
}
