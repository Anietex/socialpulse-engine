/**
 * LLM Service Errors
 * Custom errors for LLM operations
 */

/**
 * Base LLM error
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'LLMError';
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

/**
 * LLM service not available (API key missing, network issue, etc.)
 */
export class LLMUnavailableError extends LLMError {
  constructor(provider: string, reason: string, originalError?: Error) {
    super(`LLM service ${provider} unavailable: ${reason}`, provider, originalError);
    this.name = 'LLMUnavailableError';
    Object.setPrototypeOf(this, LLMUnavailableError.prototype);
  }
}

/**
 * LLM generation failed (rate limit, content policy, etc.)
 */
export class LLMGenerationError extends LLMError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    originalError?: Error
  ) {
    super(message, provider, originalError);
    this.name = 'LLMGenerationError';
    Object.setPrototypeOf(this, LLMGenerationError.prototype);
  }
}

/**
 * LLM rate limit exceeded
 */
export class LLMRateLimitError extends LLMError {
  constructor(
    public readonly provider: string,
    public readonly resetAt?: Date,
    originalError?: Error
  ) {
    super(
      `LLM rate limit exceeded for ${provider}${resetAt ? `. Resets at ${resetAt.toISOString()}` : ''}`,
      provider,
      originalError
    );
    this.name = 'LLMRateLimitError';
    Object.setPrototypeOf(this, LLMRateLimitError.prototype);
  }
}

/**
 * LLM configuration error
 */
export class LLMConfigurationError extends LLMError {
  constructor(message: string, provider?: string) {
    super(message, provider);
    this.name = 'LLMConfigurationError';
    Object.setPrototypeOf(this, LLMConfigurationError.prototype);
  }
}

/**
 * LLM content policy violation
 */
export class LLMContentPolicyError extends LLMError {
  constructor(
    public readonly provider: string,
    public readonly reason: string,
    originalError?: Error
  ) {
    super(`Content policy violation (${provider}): ${reason}`, provider, originalError);
    this.name = 'LLMContentPolicyError';
    Object.setPrototypeOf(this, LLMContentPolicyError.prototype);
  }
}
