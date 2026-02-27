import { Queue } from 'bullmq';
import { redisConnection, defaultJobOptions } from './queue.config.js';
import {
  CleanupJobData,
  OcrJobData,
  CategorizationJobData,
  RankingJobData,
  EngagementJobData,
  AutomationJobData,
} from '../types/queue.types.js';
import { SessionResetJobData } from '../types/session.types.js';

export const QUEUE_NAMES = {
  CLEANUP: 'cleanup-queue',
  OCR: 'ocr-queue',
  CATEGORIZATION: 'categorization-queue',
  RANKING: 'ranking-queue',
  ENGAGEMENT: 'engagement-queue',
  AUTOMATION: 'automation-queue',
  SESSION_RESET: 'session-reset-queue',
} as const;

export const cleanupQueue = new Queue<CleanupJobData>(QUEUE_NAMES.CLEANUP, {
  connection: redisConnection,
  defaultJobOptions,
});

export const ocrQueue = new Queue<OcrJobData>(QUEUE_NAMES.OCR, {
  connection: redisConnection,
  defaultJobOptions,
});

export const categorizationQueue = new Queue<CategorizationJobData>(QUEUE_NAMES.CATEGORIZATION, {
  connection: redisConnection,
  defaultJobOptions,
});

export const rankingQueue = new Queue<RankingJobData>(QUEUE_NAMES.RANKING, {
  connection: redisConnection,
  defaultJobOptions,
});

export const engagementQueue = new Queue<EngagementJobData>(QUEUE_NAMES.ENGAGEMENT, {
  connection: redisConnection,
  defaultJobOptions,
});

export const automationQueue = new Queue<AutomationJobData>(QUEUE_NAMES.AUTOMATION, {
  connection: redisConnection,
  defaultJobOptions,
});

export const sessionResetQueue = new Queue<SessionResetJobData>(QUEUE_NAMES.SESSION_RESET, {
  connection: redisConnection,
  defaultJobOptions,
});

export const queues = {
  cleanup: cleanupQueue,
  ocr: ocrQueue,
  categorization: categorizationQueue,
  ranking: rankingQueue,
  engagement: engagementQueue,
  automation: automationQueue,
  sessionReset: sessionResetQueue,
};
