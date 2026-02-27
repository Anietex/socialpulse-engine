import {
  cleanupQueue,
  ocrQueue,
  categorizationQueue,
  rankingQueue,
  engagementQueue,
  automationQueue,
  sessionResetQueue,
} from '../queues.js';
import { logger } from '../../../config/logger.js';

/**
 * Add a cleanup job to the queue
 */
export const addCleanupJob = async (tweetId: string, batchId: string) => {
  try {
    await cleanupQueue.add('cleanup', { tweetId, batchId }, { priority: 1 });
    logger.info(`Cleanup job added for tweet ${tweetId} in batch ${batchId}`);
  } catch (error) {
    logger.error(`Failed to add cleanup job for tweet ${tweetId}:`, error);
    throw error;
  }
};

/**
 * Add an OCR job to the queue
 */
export const addOcrJob = async (tweetId: string, imageUrls: string[]) => {
  try {
    await ocrQueue.add('ocr', { tweetId, imageUrls }, { priority: 2 });
    logger.info(`OCR job added for tweet ${tweetId} with ${imageUrls.length} images`);
  } catch (error) {
    logger.error(`Failed to add OCR job for tweet ${tweetId}:`, error);
    throw error;
  }
};

/**
 * Add a categorization batch job to the queue
 */
export const addCategorizationJob = async (batchId: string, tweetIds: string[]) => {
  try {
    await categorizationQueue.add('categorization', { batchId, tweetIds }, { priority: 3 });
    logger.info(`Categorization batch job added for ${tweetIds.length} tweets in batch ${batchId}`);
  } catch (error) {
    logger.error(`Failed to add categorization job for batch ${batchId}:`, error);
    throw error;
  }
};

/**
 * Add a ranking batch job to the queue
 */
export const addRankingJob = async (batchId: string, tweetIds: string[]) => {
  try {
    await rankingQueue.add('ranking', { batchId, tweetIds }, { priority: 4 });
    logger.info(`Ranking batch job added for ${tweetIds.length} tweets in batch ${batchId}`);
  } catch (error) {
    logger.error(`Failed to add ranking job for batch ${batchId}:`, error);
    throw error;
  }
};

/**
 * Add an engagement batch job to the queue
 */
export const addEngagementJob = async (batchId: string, tweetIds: string[]) => {
  try {
    await engagementQueue.add('engagement', { batchId, tweetIds }, { priority: 5 });
    logger.info(`Engagement batch job added for ${tweetIds.length} tweets in batch ${batchId}`);
  } catch (error) {
    logger.error(`Failed to add engagement job for batch ${batchId}:`, error);
    throw error;
  }
};

/**
 * Add an automation job to the queue
 */
export const addAutomationJob = async (
  tweetId: string,
  tweetUrl: string,
  category: string,
  rankScore: number,
  engagementAction: 'reply' | 'like' | 'quote' | 'ignore'
) => {
  try {
    await automationQueue.add(
      'automation',
      { tweetId, tweetUrl, category, rankScore, engagementAction },
      { priority: 6 }
    );
    logger.info(`Automation job added for tweet ${tweetId} with action: ${engagementAction}`);
  } catch (error) {
    logger.error(`Failed to add automation job for tweet ${tweetId}:`, error);
    throw error;
  }
};

/**
 * Add a session reset job to the queue (delayed by 30 minutes)
 */
export const addSessionResetJob = async (userId: string) => {
  try {
    const THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutes in milliseconds

    await sessionResetQueue.add(
      'session-reset',
      { userId },
      {
        delay: THIRTY_MINUTES,
        jobId: `session-reset-${userId}`, // Ensures only one job per user
        removeOnComplete: true,
      }
    );

    logger.info(`Session reset job scheduled for user ${userId} (30 minutes delay)`);
  } catch (error) {
    logger.error(`Failed to add session reset job for user ${userId}:`, error);
    throw error;
  }
};
