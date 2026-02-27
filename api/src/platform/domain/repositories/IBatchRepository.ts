/**
 * Batch Repository Interface
 */

import { Batch } from '../entities/Batch';

export interface IBatchRepository {
  /**
   * Save a batch
   */
  save(batch: Batch): Promise<Batch>;

  /**
   * Find batch by ID
   */
  findById(id: string): Promise<Batch | null>;

  /**
   * Find batch by batch ID
   */
  findByBatchId(batchId: string): Promise<Batch | null>;

  /**
   * Find batches by user ID
   */
  findByUserId(userId: string, limit?: number): Promise<Batch[]>;

  /**
   * Delete batch
   */
  delete(id: string): Promise<void>;
}
