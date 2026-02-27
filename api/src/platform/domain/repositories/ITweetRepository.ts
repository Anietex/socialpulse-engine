/**
 * Tweet Repository Interface
 */

import { Tweet, TweetStatus } from '../entities/Tweet';

export interface TweetSearchParams {
  userId?: string;
  status?: TweetStatus;
  category?: string;
  minRank?: number;
  maxRank?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ITweetRepository {
  /**
   * Save a tweet
   */
  save(tweet: Tweet): Promise<Tweet>;

  /**
   * Save multiple tweets in bulk
   */
  saveBulk(tweets: Tweet[]): Promise<Tweet[]>;

  /**
   * Find tweet by ID
   */
  findById(id: string): Promise<Tweet | null>;

  /**
   * Find tweet by injected ID
   */
  findByInjectedId(injectedId: string): Promise<Tweet | null>;

  /**
   * Check if tweet exists by injected ID
   */
  existsByInjectedId(injectedId: string): Promise<boolean>;

  /**
   * Check multiple tweets exist by injected IDs
   */
  existsByInjectedIds(injectedIds: string[]): Promise<Set<string>>;

  /**
   * Find tweets by user ID
   */
  findByUserId(userId: string, limit?: number): Promise<Tweet[]>;

  /**
   * Find tweets by batch ID
   */
  findByBatchId(batchId: string): Promise<Tweet[]>;

  /**
   * Find tweets by status
   */
  findByStatus(status: TweetStatus, limit?: number): Promise<Tweet[]>;

  /**
   * Count tweets by user ID
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * Count tweets by status
   */
  countByStatus(userId: string): Promise<Record<string, number>>;

  /**
   * Delete tweet
   */
  delete(id: string): Promise<void>;

  /**
   * Search tweets with filters
   */
  search(params: TweetSearchParams): Promise<Tweet[]>;

  /**
   * Count tweets matching search params
   */
  countSearch(params: TweetSearchParams): Promise<number>;
}
