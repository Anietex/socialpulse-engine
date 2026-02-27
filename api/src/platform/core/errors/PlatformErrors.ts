/**
 * Custom error classes for platform abstraction layer
 * Provides specific error types for better error handling
 */

/**
 * Base error for all platform-related errors
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'PLATFORM_ERROR',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'PlatformError';
    Object.setPrototypeOf(this, PlatformError.prototype);
  }

  /**
   * Convert to JSON for logging/API responses
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Error during content scraping
 */
export class ScrapingError extends PlatformError {
  constructor(
    message: string,
    public readonly platformId: string,
    details?: any
  ) {
    super(message, 'SCRAPING_ERROR', details);
    this.name = 'ScrapingError';
    Object.setPrototypeOf(this, ScrapingError.prototype);
  }

  static notReady(platformId: string): ScrapingError {
    return new ScrapingError(
      `Scraper for ${platformId} is not ready. Ensure authentication and page load.`,
      platformId
    );
  }

  static noContent(platformId: string): ScrapingError {
    return new ScrapingError(`No content found to scrape on ${platformId}`, platformId);
  }

  static selectorNotFound(platformId: string, selector: string): ScrapingError {
    return new ScrapingError(
      `Selector "${selector}" not found on ${platformId}. Platform may have changed.`,
      platformId,
      { selector }
    );
  }
}

/**
 * Error during authentication
 */
export class AuthenticationError extends PlatformError {
  constructor(
    message: string,
    public readonly platformId: string,
    details?: any
  ) {
    super(message, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }

  static invalidCredentials(platformId: string): AuthenticationError {
    return new AuthenticationError(`Invalid credentials for ${platformId}`, platformId);
  }

  static sessionExpired(platformId: string): AuthenticationError {
    return new AuthenticationError(
      `Session expired for ${platformId}. Please re-authenticate.`,
      platformId
    );
  }

  static notAuthenticated(platformId: string): AuthenticationError {
    return new AuthenticationError(`Not authenticated with ${platformId}`, platformId);
  }
}

/**
 * Error during action execution
 */
export class ActionExecutionError extends PlatformError {
  constructor(
    message: string,
    public readonly platformId: string,
    public readonly actionType: string,
    public readonly contentId: string,
    details?: any
  ) {
    super(message, 'ACTION_EXECUTION_ERROR', details);
    this.name = 'ActionExecutionError';
    Object.setPrototypeOf(this, ActionExecutionError.prototype);
  }

  static actionNotSupported(platformId: string, actionType: string): ActionExecutionError {
    return new ActionExecutionError(
      `Action "${actionType}" is not supported on ${platformId}`,
      platformId,
      actionType,
      ''
    );
  }

  static actionFailed(
    platformId: string,
    actionType: string,
    contentId: string,
    reason: string
  ): ActionExecutionError {
    return new ActionExecutionError(
      `Failed to execute "${actionType}" on content ${contentId}: ${reason}`,
      platformId,
      actionType,
      contentId,
      { reason }
    );
  }

  static invalidActionData(
    platformId: string,
    actionType: string,
    contentId: string,
    reason: string
  ): ActionExecutionError {
    return new ActionExecutionError(
      `Invalid action data for "${actionType}": ${reason}`,
      platformId,
      actionType,
      contentId,
      { reason }
    );
  }
}

/**
 * Error due to rate limiting
 */
export class RateLimitError extends PlatformError {
  constructor(
    message: string,
    public readonly platformId: string,
    public readonly actionType: string,
    public readonly resetAt: Date,
    details?: any
  ) {
    super(message, 'RATE_LIMIT_ERROR', details);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  static limitExceeded(platformId: string, actionType: string, resetAt: Date): RateLimitError {
    return new RateLimitError(
      `Rate limit exceeded for "${actionType}" on ${platformId}. Resets at ${resetAt.toISOString()}`,
      platformId,
      actionType,
      resetAt
    );
  }

  /**
   * Get milliseconds until rate limit resets
   */
  getMillisecondsUntilReset(): number {
    return Math.max(0, this.resetAt.getTime() - Date.now());
  }

  /**
   * Get seconds until rate limit resets
   */
  getSecondsUntilReset(): number {
    return Math.ceil(this.getMillisecondsUntilReset() / 1000);
  }
}

/**
 * Error during content normalization
 */
export class NormalizationError extends PlatformError {
  constructor(
    message: string,
    public readonly platformId: string,
    public readonly rawContentId: string,
    details?: any
  ) {
    super(message, 'NORMALIZATION_ERROR', details);
    this.name = 'NormalizationError';
    Object.setPrototypeOf(this, NormalizationError.prototype);
  }

  static missingRequiredField(
    platformId: string,
    rawContentId: string,
    field: string
  ): NormalizationError {
    return new NormalizationError(
      `Cannot normalize content ${rawContentId}: missing required field "${field}"`,
      platformId,
      rawContentId,
      { field }
    );
  }

  static invalidFieldFormat(
    platformId: string,
    rawContentId: string,
    field: string,
    expectedFormat: string
  ): NormalizationError {
    return new NormalizationError(
      `Cannot normalize content ${rawContentId}: field "${field}" has invalid format (expected: ${expectedFormat})`,
      platformId,
      rawContentId,
      { field, expectedFormat }
    );
  }
}

/**
 * Error when platform configuration is invalid
 */
export class PlatformConfigurationError extends PlatformError {
  constructor(
    message: string,
    public readonly platformId: string,
    details?: any
  ) {
    super(message, 'PLATFORM_CONFIGURATION_ERROR', details);
    this.name = 'PlatformConfigurationError';
    Object.setPrototypeOf(this, PlatformConfigurationError.prototype);
  }

  static missingConfig(platformId: string, configKey: string): PlatformConfigurationError {
    return new PlatformConfigurationError(
      `Missing required configuration for ${platformId}: ${configKey}`,
      platformId,
      { configKey }
    );
  }

  static invalidConfig(
    platformId: string,
    configKey: string,
    reason: string
  ): PlatformConfigurationError {
    return new PlatformConfigurationError(
      `Invalid configuration for ${platformId}.${configKey}: ${reason}`,
      platformId,
      { configKey, reason }
    );
  }
}

/**
 * Error when platform adapter is not found
 */
export class PlatformNotFoundError extends PlatformError {
  constructor(public readonly platformId: string) {
    super(`No adapter found for platform: ${platformId}`, 'PLATFORM_NOT_FOUND');
    this.name = 'PlatformNotFoundError';
    Object.setPrototypeOf(this, PlatformNotFoundError.prototype);
  }
}

/**
 * Error when a command validation fails
 */
export class CommandValidationError extends PlatformError {
  constructor(
    message: string,
    public readonly commandName: string,
    details?: any
  ) {
    super(message, 'COMMAND_VALIDATION_ERROR', details);
    this.name = 'CommandValidationError';
    Object.setPrototypeOf(this, CommandValidationError.prototype);
  }
}

/**
 * Error when a command execution fails
 */
export class CommandExecutionError extends PlatformError {
  constructor(
    message: string,
    public readonly commandName: string,
    details?: any
  ) {
    super(message, 'COMMAND_EXECUTION_ERROR', details);
    this.name = 'CommandExecutionError';
    Object.setPrototypeOf(this, CommandExecutionError.prototype);
  }
}
