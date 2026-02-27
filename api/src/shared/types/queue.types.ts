import { JobType } from '../constants/statuses.js';

export interface IQueueJob {
  tweetId: string;
  type: JobType;
  attempts?: number;
  priority?: number;
}

export interface CleanupJobData {
  tweetId: string;
  batchId: string;
}

export interface OcrJobData {
  tweetId: string;
  imageUrls: string[];
}

export interface CategorizationJobData {
  batchId: string;
  tweetIds: string[]; // Batch of tweet IDs (up to 12)
}

export interface RankingJobData {
  batchId: string;
  tweetIds: string[]; // Batch of tweet IDs (up to 12)
}

export interface EngagementJobData {
  batchId: string;
  tweetIds: string[]; // Batch of tweet IDs (up to 12 - top ranked tweets)
}

export interface AutomationJobData {
  tweetId: string;
  tweetUrl: string;
  category: string;
  rankScore: number;
  engagementAction: 'reply' | 'like' | 'quote' | 'repost' | 'ignore';
}
