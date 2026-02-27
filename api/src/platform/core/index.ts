/**
 * Platform Core Module
 * Central export point for all core abstractions
 */

// Interfaces
export * from './interfaces/IContentScraper';
export * from './interfaces/IAuthenticator';
export * from './interfaces/IActionExecutor';
export * from './interfaces/IActionStrategy';
export * from './interfaces/IRateLimitProvider';
export * from './interfaces/IContentNormalizer';
export * from './interfaces/ILLMService';

// Value Objects
export * from './value-objects/PlatformId';
export * from './value-objects/ContentId';
export * from './value-objects/Metrics';

// Types & Enums
export * from './types';

// Commands
export * from './commands';

// Errors
export * from './errors';
