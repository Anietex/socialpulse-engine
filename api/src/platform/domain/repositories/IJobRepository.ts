/**
 * Job Repository Interface
 */

import { Job, JobType, JobStatus } from '../entities/Job';

export interface IJobRepository {
  /**
   * Save a job
   */
  save(job: Job): Promise<Job>;

  /**
   * Find job by ID
   */
  findById(id: string): Promise<Job | null>;

  /**
   * Find jobs by tweet ID
   */
  findByTweetId(tweetId: string): Promise<Job[]>;

  /**
   * Find jobs by type
   */
  findByType(type: JobType, limit?: number): Promise<Job[]>;

  /**
   * Find jobs by status
   */
  findByStatus(status: JobStatus, limit?: number): Promise<Job[]>;

  /**
   * Find failed jobs that can be retried
   */
  findRetryableJobs(limit?: number): Promise<Job[]>;

  /**
   * Count jobs by status
   */
  countByStatus(): Promise<Record<string, number>>;

  /**
   * Delete job
   */
  delete(id: string): Promise<void>;
}
