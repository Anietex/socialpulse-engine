/**
 * LLM Integration Example
 * Demonstrates how to use the LLM service with AutomationOrchestrator
 *
 * Usage:
 *   npm run dev
 *   Then in another terminal:
 *   node --loader ts-node/esm src/examples/llm-integration-example.ts
 */

import { OpenAILLMService } from '../platform/infrastructure/llm/OpenAILLMService';
import { AutomationOrchestrator } from '../platform/application/services/AutomationOrchestrator';
import { Content } from '../platform/domain/entities/Content';
import { Author } from '../platform/domain/entities/Author';
import { ContentStatus } from '../platform/core/types/ContentStatus';
import { ActionType } from '../platform/core/types/ActionType';
import { logger } from '../config/logger';

async function main() {
  try {
    logger.info('=== LLM Integration Example ===\n');

    // Example 1: Initialize LLM Service
    logger.info('1. Initializing OpenAI LLM Service...');
    const llmService = new OpenAILLMService();

    // Check health
    const health = await llmService.getHealth();
    logger.info('LLM Service Health:', health);

    if (!health.available) {
      logger.warn('LLM service unavailable. Make sure OPENAI_API_KEY is set.');
      logger.warn('Continuing with fallback mode...\n');
    }

    // Example 2: Direct LLM Usage
    logger.info('\n2. Testing Direct LLM Generation...');

    const testContent = createTestContent(
      'Just launched our new AI-powered analytics dashboard! ' +
        'It helps teams understand user behavior patterns in real-time. ' +
        'Check it out!',
      ActionType.COMMENT
    );

    logger.info('Test Content:', {
      text: testContent.text,
      author: testContent.author.name,
      action: testContent.engagementAction,
    });

    // Generate reply
    logger.info('\nGenerating reply...');
    const replyResponse = await llmService.generateReply(testContent);
    logger.info('Generated Reply:', {
      text: replyResponse.text,
      model: replyResponse.model,
      tokensUsed: replyResponse.tokensUsed,
      isFallback: replyResponse.isFallback,
    });

    // Generate quote
    const quoteContent = createTestContent(
      'The future of software development is not about writing more code, ' +
        'but writing better code that solves real problems.',
      ActionType.QUOTE
    );

    logger.info('\nGenerating quote...');
    const quoteResponse = await llmService.generateQuote(quoteContent);
    logger.info('Generated Quote:', {
      text: quoteResponse.text,
      model: quoteResponse.model,
      tokensUsed: quoteResponse.tokensUsed,
      isFallback: quoteResponse.isFallback,
    });

    // Example 3: AutomationOrchestrator with LLM
    logger.info('\n3. Testing AutomationOrchestrator with LLM...');

    // Create repository (mock for this example)
    const repository = createMockRepository();

    // Create orchestrator with LLM service
    // @ts-ignore - Example demonstration
    const orchestrator = new AutomationOrchestrator(repository, llmService);

    logger.info('AutomationOrchestrator created with LLM service');
    logger.info('When automation runs, it will use AI-generated replies and quotes!');

    // Example 4: Without LLM Service (Fallback Mode)
    logger.info('\n4. Testing AutomationOrchestrator without LLM (Fallback Mode)...');

    // @ts-ignore - Example demonstration
    const orchestratorNoLLM = new AutomationOrchestrator(repository);

    logger.info('AutomationOrchestrator created without LLM service');
    logger.info('Will use predefined fallback texts');

    // Example 5: Configuration Options
    logger.info('\n5. LLM Configuration Options:');
    logger.info('Environment Variables:');
    logger.info('  OPENAI_API_KEY - OpenAI API key (required)');
    logger.info('  LLM_MODEL      - Model to use (default: gpt-4o-mini)');
    logger.info('  LLM_TEMPERATURE - Temperature 0-1 (default: 0.7)');
    logger.info('  LLM_MAX_TOKENS  - Max tokens (default: 150)');
    logger.info('  LLM_TIMEOUT     - Timeout in ms (default: 30000)');

    logger.info('\n=== Example Complete ===');
    process.exit(0);
  } catch (error) {
    logger.error('Example failed:', error);
    process.exit(1);
  }
}

/**
 * Create test content
 */
function createTestContent(text: string, action: ActionType): Content {
  const author = new Author(
    'author-1',
    'John Developer',
    'johndev',
    undefined,
    'https://example.com/avatar.jpg',
    true,
    50000
  );

  return Content.builder()
    .id('twitter:example-tweet-1')
    .platformId('twitter')
    .platformContentId('example-tweet-1')
    .text(text)
    .author(author.toPlain())
    .url('https://twitter.com/johndev/status/123456789')
    .createdAt(new Date())
    .metrics({ likes: 250, comments: 45, shares: 30, views: 5000 })
    .status(ContentStatus.QUEUED_FOR_ENGAGEMENT)
    .engagementAction(action)
    .category('Technology')
    .rankScore(8.5)
    .media([])
    .isReply(false)
    .isRepost(false)
    .isQuote(false)
    .build();
}

/**
 * Create mock repository for example
 */
function createMockRepository(): any {
  return {
    findById: async () => null,
    findByIds: async () => [],
    findByPlatform: async () => [],
    findByPlatformContentId: async () => null,
    findByStatus: async () => [],
    findByPlatformAndStatus: async () => [],
    findReadyForAction: async () => [],
    findForRanking: async () => [],
    findByBatchId: async () => [],
    findForEngagement: async () => [],
    save: async (content: any) => content,
    saveMany: async (contents: any[]) => contents,
    updateStatus: async () => {},
    updateManyStatuses: async () => {},
    delete: async () => {},
    count: async () => 0,
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
