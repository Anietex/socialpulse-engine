/**
 * Platform error classes
 * Barrel export for convenient imports
 */

export {
  PlatformError,
  ScrapingError,
  AuthenticationError,
  ActionExecutionError,
  RateLimitError,
  NormalizationError,
  PlatformConfigurationError,
  PlatformNotFoundError,
  CommandValidationError,
  CommandExecutionError,
} from './PlatformErrors';

export {
  LLMError,
  LLMUnavailableError,
  LLMGenerationError,
  LLMRateLimitError,
  LLMConfigurationError,
  LLMContentPolicyError,
} from './LLMErrors';
