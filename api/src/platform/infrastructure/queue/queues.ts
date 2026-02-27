/**
 * BullMQ Queue Definitions
 * Defines all queues used in the application
 */

import { Queue } from 'bullmq';
import { config } from '../../../config/env';

/**
 * Redis connection configuration
 */
const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
};

/**
 * Cleanup Queue
 * Handles tweet cleanup jobs
 */
export const cleanupQueue = new Queue('cleanup', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 1000, // Keep last 1000 failed jobs
  },
});

/**
 * OCR Queue
 * Handles OCR text extraction jobs from images
 */
export const ocrQueue = new Queue('ocr', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

/**
 * Image Captioning Queue
 * Handles image captioning/description jobs
 */
export const imageCaptioningQueue = new Queue('image-captioning', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

/**
 * Categorization Queue
 * Handles tweet categorization jobs
 */
export const categorizationQueue = new Queue('categorization', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

/**
 * Ranking Queue
 * Handles tweet ranking jobs
 */
export const rankingQueue = new Queue('ranking', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

/**
 * Engagement Queue
 * Handles tweet engagement jobs
 */
export const engagementQueue = new Queue('engagement', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

/**
 * All queues map
 */
export const queues = {
  cleanup: cleanupQueue,
  ocr: ocrQueue,
  'image-captioning': imageCaptioningQueue,
  categorization: categorizationQueue,
  ranking: rankingQueue,
  engagement: engagementQueue,
};

/**
 * Queue names
 */
export type QueueName = keyof typeof queues;
