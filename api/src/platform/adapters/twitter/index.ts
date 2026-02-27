/**
 * Twitter Platform Adapter
 * Barrel export for all Twitter-specific implementations
 */

// Main adapter
export { TwitterAdapter } from './TwitterAdapter';

// Components
export { TwitterScraper } from './TwitterScraper';
export { TwitterAuthenticator, TwitterCredentials } from './TwitterAuthenticator';
export { TwitterActionExecutor } from './TwitterActionExecutor';
export { TwitterNormalizer } from './TwitterNormalizer';
export { TwitterRateLimitProvider } from './TwitterRateLimitProvider';

// Action strategies
export * from './actions';

// Utilities
export { TwitterSelectors } from './TwitterSelectors';
export * as HumanBehavior from './utils/humanBehavior';
