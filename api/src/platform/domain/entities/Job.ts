/**
 * Job Entity
 * Represents a background job in the queue system
 */

/**
 * Job type enum
 */
export enum JobType {
  CLEANUP = 'cleanup',
  OCR = 'ocr',
  IMAGE_CAPTIONING = 'image_captioning',
  CATEGORIZATION = 'categorization',
  RANKING = 'ranking',
  ENGAGEMENT = 'engagement',
}

/**
 * Job status enum
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

/**
 * Job Entity
 * Tracks background jobs through the queue system
 */
export class Job {
  constructor(
    public readonly id: string,
    public readonly tweetId: string,
    public readonly type: JobType,
    public readonly status: JobStatus,
    public readonly attempts: number,
    public readonly maxAttempts: number,
    public readonly error: string | undefined,
    public readonly result: any,
    public readonly startedAt: Date | undefined,
    public readonly completedAt: Date | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Create a new job builder
   */
  static builder(): JobBuilder {
    return new JobBuilder();
  }

  /**
   * Convert to plain object
   */
  toPlain() {
    return {
      id: this.id,
      tweetId: this.tweetId,
      type: this.type,
      status: this.status,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      error: this.error,
      result: this.result,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Mark as processing
   */
  markAsProcessing(): Job {
    return new Job(
      this.id,
      this.tweetId,
      this.type,
      JobStatus.PROCESSING,
      this.attempts,
      this.maxAttempts,
      this.error,
      this.result,
      new Date(),
      this.completedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Mark as completed
   */
  markAsCompleted(result?: any): Job {
    return new Job(
      this.id,
      this.tweetId,
      this.type,
      JobStatus.COMPLETED,
      this.attempts,
      this.maxAttempts,
      undefined,
      result,
      this.startedAt,
      new Date(),
      this.createdAt,
      new Date()
    );
  }

  /**
   * Mark as failed
   */
  markAsFailed(error: string): Job {
    const newAttempts = this.attempts + 1;
    const status = newAttempts >= this.maxAttempts ? JobStatus.FAILED : JobStatus.RETRYING;

    return new Job(
      this.id,
      this.tweetId,
      this.type,
      status,
      newAttempts,
      this.maxAttempts,
      error,
      this.result,
      this.startedAt,
      status === JobStatus.FAILED ? new Date() : this.completedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Check if job can be retried
   */
  canRetry(): boolean {
    return this.attempts < this.maxAttempts;
  }

  /**
   * Check if job is terminal (completed or failed with no retries left)
   */
  isTerminal(): boolean {
    return (
      this.status === JobStatus.COMPLETED || (this.status === JobStatus.FAILED && !this.canRetry())
    );
  }
}

/**
 * Job Builder
 */
export class JobBuilder {
  private _id?: string;
  private _tweetId?: string;
  private _type?: JobType;
  private _status: JobStatus = JobStatus.PENDING;
  private _attempts: number = 0;
  private _maxAttempts: number = 3;
  private _error?: string;
  private _result?: any;
  private _startedAt?: Date;
  private _completedAt?: Date;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  id(id: string): JobBuilder {
    this._id = id;
    return this;
  }

  tweetId(tweetId: string): JobBuilder {
    this._tweetId = tweetId;
    return this;
  }

  type(type: JobType): JobBuilder {
    this._type = type;
    return this;
  }

  status(status: JobStatus): JobBuilder {
    this._status = status;
    return this;
  }

  attempts(attempts: number): JobBuilder {
    this._attempts = attempts;
    return this;
  }

  maxAttempts(max: number): JobBuilder {
    this._maxAttempts = max;
    return this;
  }

  error(error: string | undefined): JobBuilder {
    this._error = error;
    return this;
  }

  result(result: any): JobBuilder {
    this._result = result;
    return this;
  }

  startedAt(date: Date | undefined): JobBuilder {
    this._startedAt = date;
    return this;
  }

  completedAt(date: Date | undefined): JobBuilder {
    this._completedAt = date;
    return this;
  }

  createdAt(date: Date): JobBuilder {
    this._createdAt = date;
    return this;
  }

  updatedAt(date: Date): JobBuilder {
    this._updatedAt = date;
    return this;
  }

  build(): Job {
    if (!this._id) throw new Error('Job ID is required');
    if (!this._tweetId) throw new Error('Tweet ID is required');
    if (!this._type) throw new Error('Job type is required');

    return new Job(
      this._id,
      this._tweetId,
      this._type,
      this._status,
      this._attempts,
      this._maxAttempts,
      this._error,
      this._result,
      this._startedAt,
      this._completedAt,
      this._createdAt || new Date(),
      this._updatedAt || new Date()
    );
  }
}
