/**
 * MongoDB Job Repository Implementation
 */

import { model, Model } from 'mongoose';
import { IJobRepository } from '../../domain/repositories/IJobRepository';
import { Job, JobType, JobStatus } from '../../domain/entities/Job';
import { JobSchema, JobDocument } from './schemas/JobSchema';

const JobModel: Model<JobDocument> = model<JobDocument>('Job', JobSchema);

export class MongoJobRepository implements IJobRepository {
  async save(job: Job): Promise<Job> {
    const doc = await JobModel.findByIdAndUpdate(
      job.id,
      {
        tweetId: job.tweetId,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: job.error,
        result: job.result,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
      { new: true, upsert: true }
    );

    if (!doc) throw new Error('Failed to save job');

    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Job | null> {
    const doc = await JobModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findByTweetId(tweetId: string): Promise<Job[]> {
    const docs = await JobModel.find({ tweetId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByType(type: JobType, limit: number = 100): Promise<Job[]> {
    const docs = await JobModel.find({ type }).sort({ createdAt: -1 }).limit(limit);
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByStatus(status: JobStatus, limit: number = 100): Promise<Job[]> {
    const docs = await JobModel.find({ status }).sort({ createdAt: -1 }).limit(limit);
    return docs.map((doc) => this.toDomain(doc));
  }

  async findRetryableJobs(limit: number = 100): Promise<Job[]> {
    const docs = await JobModel.find({
      status: JobStatus.RETRYING,
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    })
      .sort({ updatedAt: 1 })
      .limit(limit);
    return docs.map((doc) => this.toDomain(doc));
  }

  async countByStatus(): Promise<Record<string, number>> {
    const result = await JobModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

    return result.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  async delete(id: string): Promise<void> {
    await JobModel.findByIdAndDelete(id);
  }

  /**
   * Map document to domain entity
   */
  private toDomain(doc: JobDocument): Job {
    return Job.builder()
      .id(doc._id.toString())
      .tweetId(doc.tweetId)
      .type(doc.type)
      .status(doc.status)
      .attempts(doc.attempts)
      .maxAttempts(doc.maxAttempts)
      .error(doc.error)
      .result(doc.result)
      .startedAt(doc.startedAt)
      .completedAt(doc.completedAt)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }
}
