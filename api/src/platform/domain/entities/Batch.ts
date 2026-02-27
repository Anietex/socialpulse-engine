/**
 * Batch Entity
 * Represents a batch of tweets being processed through the pipeline
 */

/**
 * Batch processing stage
 */
export enum BatchStage {
  CLEANUP = 'cleanup',
  CATEGORIZATION = 'categorization',
  RANKING = 'ranking',
  ENGAGEMENT = 'engagement',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Batch Entity
 * Tracks a batch of tweets through the processing pipeline
 */
export class Batch {
  constructor(
    public readonly id: string,
    public readonly batchId: string,
    public readonly userId: string,
    public readonly totalTweets: number,
    public readonly currentStage: BatchStage,
    public readonly processedTweets: number,
    public readonly failedTweets: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Create a new batch builder
   */
  static builder(): BatchBuilder {
    return new BatchBuilder();
  }

  /**
   * Convert to plain object
   */
  toPlain() {
    return {
      id: this.id,
      batchId: this.batchId,
      userId: this.userId,
      totalTweets: this.totalTweets,
      currentStage: this.currentStage,
      processedTweets: this.processedTweets,
      failedTweets: this.failedTweets,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Update stage
   */
  updateStage(stage: BatchStage): Batch {
    return new Batch(
      this.id,
      this.batchId,
      this.userId,
      this.totalTweets,
      stage,
      this.processedTweets,
      this.failedTweets,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update progress
   */
  updateProgress(processed: number, failed: number): Batch {
    return new Batch(
      this.id,
      this.batchId,
      this.userId,
      this.totalTweets,
      this.currentStage,
      processed,
      failed,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Check if batch is complete
   */
  isComplete(): boolean {
    return (
      this.currentStage === BatchStage.COMPLETED ||
      this.currentStage === BatchStage.FAILED ||
      this.processedTweets + this.failedTweets >= this.totalTweets
    );
  }
}

/**
 * Batch Builder
 */
export class BatchBuilder {
  private _id?: string;
  private _batchId?: string;
  private _userId?: string;
  private _totalTweets?: number;
  private _currentStage: BatchStage = BatchStage.CLEANUP;
  private _processedTweets: number = 0;
  private _failedTweets: number = 0;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  id(id: string): BatchBuilder {
    this._id = id;
    return this;
  }

  batchId(batchId: string): BatchBuilder {
    this._batchId = batchId;
    return this;
  }

  userId(userId: string): BatchBuilder {
    this._userId = userId;
    return this;
  }

  totalTweets(total: number): BatchBuilder {
    this._totalTweets = total;
    return this;
  }

  currentStage(stage: BatchStage): BatchBuilder {
    this._currentStage = stage;
    return this;
  }

  processedTweets(processed: number): BatchBuilder {
    this._processedTweets = processed;
    return this;
  }

  failedTweets(failed: number): BatchBuilder {
    this._failedTweets = failed;
    return this;
  }

  createdAt(date: Date): BatchBuilder {
    this._createdAt = date;
    return this;
  }

  updatedAt(date: Date): BatchBuilder {
    this._updatedAt = date;
    return this;
  }

  build(): Batch {
    if (!this._id) throw new Error('Batch ID is required');
    if (!this._batchId) throw new Error('Batch ID string is required');
    if (!this._userId) throw new Error('User ID is required');
    if (this._totalTweets === undefined) throw new Error('Total tweets is required');

    return new Batch(
      this._id,
      this._batchId,
      this._userId,
      this._totalTweets,
      this._currentStage,
      this._processedTweets,
      this._failedTweets,
      this._createdAt || new Date(),
      this._updatedAt || new Date()
    );
  }
}
