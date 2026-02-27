import {
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
} from '../../errors/PlatformErrors';

describe('PlatformErrors', () => {
  describe('PlatformError', () => {
    it('should create base platform error', () => {
      const error = new PlatformError('Test error', 'TEST_CODE', {
        detail: 'test',
      });

      expect(error.name).toBe('PlatformError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'test' });
    });

    it('should default to PLATFORM_ERROR code', () => {
      const error = new PlatformError('Test error');

      expect(error.code).toBe('PLATFORM_ERROR');
    });

    it('should be instance of Error', () => {
      const error = new PlatformError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PlatformError);
    });

    it('should convert to JSON', () => {
      const error = new PlatformError('Test error', 'TEST_CODE', {
        foo: 'bar',
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'PlatformError',
        code: 'TEST_CODE',
        message: 'Test error',
        details: { foo: 'bar' },
      });
    });
  });

  describe('ScrapingError', () => {
    it('should create scraping error', () => {
      const error = new ScrapingError('Scraping failed', 'twitter', {
        reason: 'timeout',
      });

      expect(error.name).toBe('ScrapingError');
      expect(error.message).toBe('Scraping failed');
      expect(error.code).toBe('SCRAPING_ERROR');
      expect(error.platformId).toBe('twitter');
      expect(error.details).toEqual({ reason: 'timeout' });
    });

    it('should create notReady error', () => {
      const error = ScrapingError.notReady('linkedin');

      expect(error.message).toContain('linkedin');
      expect(error.message).toContain('not ready');
      expect(error.platformId).toBe('linkedin');
    });

    it('should create noContent error', () => {
      const error = ScrapingError.noContent('reddit');

      expect(error.message).toContain('No content found');
      expect(error.platformId).toBe('reddit');
    });

    it('should create selectorNotFound error', () => {
      const error = ScrapingError.selectorNotFound('twitter', '.tweet-button');

      expect(error.message).toContain('.tweet-button');
      expect(error.platformId).toBe('twitter');
      expect(error.details).toEqual({ selector: '.tweet-button' });
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Auth failed', 'twitter');

      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.platformId).toBe('twitter');
    });

    it('should create invalidCredentials error', () => {
      const error = AuthenticationError.invalidCredentials('instagram');

      expect(error.message).toContain('Invalid credentials');
      expect(error.platformId).toBe('instagram');
    });

    it('should create sessionExpired error', () => {
      const error = AuthenticationError.sessionExpired('linkedin');

      expect(error.message).toContain('Session expired');
      expect(error.message).toContain('re-authenticate');
      expect(error.platformId).toBe('linkedin');
    });

    it('should create notAuthenticated error', () => {
      const error = AuthenticationError.notAuthenticated('reddit');

      expect(error.message).toContain('Not authenticated');
      expect(error.platformId).toBe('reddit');
    });
  });

  describe('ActionExecutionError', () => {
    it('should create action execution error', () => {
      const error = new ActionExecutionError('Action failed', 'twitter', 'like', 'tweet123');

      expect(error.name).toBe('ActionExecutionError');
      expect(error.code).toBe('ACTION_EXECUTION_ERROR');
      expect(error.platformId).toBe('twitter');
      expect(error.actionType).toBe('like');
      expect(error.contentId).toBe('tweet123');
    });

    it('should create actionNotSupported error', () => {
      const error = ActionExecutionError.actionNotSupported('instagram', 'quote');

      expect(error.message).toContain('not supported');
      expect(error.message).toContain('quote');
      expect(error.platformId).toBe('instagram');
      expect(error.actionType).toBe('quote');
    });

    it('should create actionFailed error', () => {
      const error = ActionExecutionError.actionFailed(
        'twitter',
        'comment',
        'tweet123',
        'Element not found'
      );

      expect(error.message).toContain('Failed to execute');
      expect(error.message).toContain('comment');
      expect(error.message).toContain('Element not found');
      expect(error.platformId).toBe('twitter');
      expect(error.actionType).toBe('comment');
      expect(error.contentId).toBe('tweet123');
    });

    it('should create invalidActionData error', () => {
      const error = ActionExecutionError.invalidActionData(
        'linkedin',
        'comment',
        'post123',
        'Text is required'
      );

      expect(error.message).toContain('Invalid action data');
      expect(error.message).toContain('Text is required');
      expect(error.details).toEqual({ reason: 'Text is required' });
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const resetAt = new Date('2025-01-01T12:00:00Z');
      const error = new RateLimitError('Rate limit exceeded', 'twitter', 'like', resetAt);

      expect(error.name).toBe('RateLimitError');
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.platformId).toBe('twitter');
      expect(error.actionType).toBe('like');
      expect(error.resetAt).toBe(resetAt);
    });

    it('should create limitExceeded error', () => {
      const resetAt = new Date('2025-01-01T12:00:00Z');
      const error = RateLimitError.limitExceeded('reddit', 'comment', resetAt);

      expect(error.message).toContain('Rate limit exceeded');
      expect(error.message).toContain('comment');
      expect(error.message).toContain(resetAt.toISOString());
      expect(error.platformId).toBe('reddit');
      expect(error.actionType).toBe('comment');
      expect(error.resetAt).toBe(resetAt);
    });

    it('should calculate milliseconds until reset', () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const error = new RateLimitError('Rate limit', 'twitter', 'like', futureDate);

      const ms = error.getMillisecondsUntilReset();

      expect(ms).toBeGreaterThan(59000); // At least 59 seconds
      expect(ms).toBeLessThanOrEqual(60000); // At most 60 seconds
    });

    it('should return 0 for past reset time', () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const error = new RateLimitError('Rate limit', 'twitter', 'like', pastDate);

      expect(error.getMillisecondsUntilReset()).toBe(0);
    });

    it('should calculate seconds until reset', () => {
      const futureDate = new Date(Date.now() + 125000); // 125 seconds from now
      const error = new RateLimitError('Rate limit', 'twitter', 'like', futureDate);

      const seconds = error.getSecondsUntilReset();

      expect(seconds).toBeGreaterThanOrEqual(124);
      expect(seconds).toBeLessThanOrEqual(125);
    });
  });

  describe('NormalizationError', () => {
    it('should create normalization error', () => {
      const error = new NormalizationError('Cannot normalize', 'twitter', 'tweet123');

      expect(error.name).toBe('NormalizationError');
      expect(error.code).toBe('NORMALIZATION_ERROR');
      expect(error.platformId).toBe('twitter');
      expect(error.rawContentId).toBe('tweet123');
    });

    it('should create missingRequiredField error', () => {
      const error = NormalizationError.missingRequiredField('linkedin', 'post123', 'authorId');

      expect(error.message).toContain('missing required field');
      expect(error.message).toContain('authorId');
      expect(error.details).toEqual({ field: 'authorId' });
    });

    it('should create invalidFieldFormat error', () => {
      const error = NormalizationError.invalidFieldFormat(
        'reddit',
        'post123',
        'createdAt',
        'ISO 8601'
      );

      expect(error.message).toContain('invalid format');
      expect(error.message).toContain('createdAt');
      expect(error.message).toContain('ISO 8601');
      expect(error.details).toEqual({
        field: 'createdAt',
        expectedFormat: 'ISO 8601',
      });
    });
  });

  describe('PlatformConfigurationError', () => {
    it('should create platform configuration error', () => {
      const error = new PlatformConfigurationError('Invalid config', 'twitter', { key: 'apiKey' });

      expect(error.name).toBe('PlatformConfigurationError');
      expect(error.code).toBe('PLATFORM_CONFIGURATION_ERROR');
      expect(error.platformId).toBe('twitter');
    });

    it('should create missingConfig error', () => {
      const error = PlatformConfigurationError.missingConfig('instagram', 'apiKey');

      expect(error.message).toContain('Missing required configuration');
      expect(error.message).toContain('apiKey');
      expect(error.details).toEqual({ configKey: 'apiKey' });
    });

    it('should create invalidConfig error', () => {
      const error = PlatformConfigurationError.invalidConfig(
        'linkedin',
        'timeout',
        'Must be positive number'
      );

      expect(error.message).toContain('Invalid configuration');
      expect(error.message).toContain('timeout');
      expect(error.message).toContain('Must be positive number');
      expect(error.details).toEqual({
        configKey: 'timeout',
        reason: 'Must be positive number',
      });
    });
  });

  describe('PlatformNotFoundError', () => {
    it('should create platform not found error', () => {
      const error = new PlatformNotFoundError('facebook');

      expect(error.name).toBe('PlatformNotFoundError');
      expect(error.code).toBe('PLATFORM_NOT_FOUND');
      expect(error.message).toContain('No adapter found');
      expect(error.message).toContain('facebook');
      expect(error.platformId).toBe('facebook');
    });
  });

  describe('CommandValidationError', () => {
    it('should create command validation error', () => {
      const error = new CommandValidationError('Invalid input', 'ScrapeContent', {
        field: 'platformId',
      });

      expect(error.name).toBe('CommandValidationError');
      expect(error.code).toBe('COMMAND_VALIDATION_ERROR');
      expect(error.commandName).toBe('ScrapeContent');
      expect(error.details).toEqual({ field: 'platformId' });
    });
  });

  describe('CommandExecutionError', () => {
    it('should create command execution error', () => {
      const error = new CommandExecutionError('Execution failed', 'ExecuteAction', {
        reason: 'timeout',
      });

      expect(error.name).toBe('CommandExecutionError');
      expect(error.code).toBe('COMMAND_EXECUTION_ERROR');
      expect(error.commandName).toBe('ExecuteAction');
      expect(error.details).toEqual({ reason: 'timeout' });
    });
  });
});
