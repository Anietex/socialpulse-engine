/**
 * Platform Adapters
 * Barrel export for all platform-specific implementations
 *
 * Each platform has its own adapter that implements the core interfaces:
 * - IContentScraper
 * - IAuthenticator
 * - IActionExecutor
 * - IRateLimitProvider
 * - IContentNormalizer
 */

// Twitter adapter
export * from './twitter';

// Future adapters:
// export * from './linkedin';
// export * from './reddit';
// export * from './instagram';
