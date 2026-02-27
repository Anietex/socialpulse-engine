/**
 * Worker Manager
 * Manages all background workers
 * Now unified to use Content entities
 */

import { CleanupWorker } from './workers/CleanupWorker';
import { CategorizationWorker } from './workers/CategorizationWorker';
import { RankingWorker } from './workers/RankingWorker';
import { EngagementWorker } from './workers/EngagementWorker';
import { IContentRepository } from '../../domain/repositories/IContentRepository';
import { IJobRepository } from '../../domain/repositories/IJobRepository';
import { QueueService } from './QueueService';
import { logger } from '../../../config/logger';

/**
 * Worker Manager
 * Initializes and manages all workers
 */
export class WorkerManager {
  private cleanupWorker: CleanupWorker;
  private categorizationWorker: CategorizationWorker;
  private rankingWorker: RankingWorker;
  private engagementWorker: EngagementWorker;

  constructor(
    contentRepository: IContentRepository,
    jobRepository: IJobRepository,
    queueService: QueueService
  ) {
    logger.info('Initializing workers...');

    this.cleanupWorker = new CleanupWorker(contentRepository, jobRepository, queueService);

    this.categorizationWorker = new CategorizationWorker(
      contentRepository,
      jobRepository,
      queueService
    );

    this.rankingWorker = new RankingWorker(contentRepository, jobRepository);

    this.engagementWorker = new EngagementWorker(contentRepository, jobRepository);

    logger.info('All workers initialized successfully');
  }

  /**
   * Close all workers
   */
  async close() {
    logger.info('Closing all workers...');

    await Promise.all([
      this.cleanupWorker.close(),
      this.categorizationWorker.close(),
      this.rankingWorker.close(),
      this.engagementWorker.close(),
    ]);

    logger.info('All workers closed');
  }
}
