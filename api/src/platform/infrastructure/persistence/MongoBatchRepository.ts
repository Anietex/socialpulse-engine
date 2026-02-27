/**
 * MongoDB Batch Repository Implementation
 */

import { model, Model } from 'mongoose';
import { IBatchRepository } from '../../domain/repositories/IBatchRepository';
import { Batch } from '../../domain/entities/Batch';
import { BatchSchema, BatchDocument } from './schemas/BatchSchema';

const BatchModel: Model<BatchDocument> = model<BatchDocument>('Batch', BatchSchema);

export class MongoBatchRepository implements IBatchRepository {
  async save(batch: Batch): Promise<Batch> {
    const doc = await BatchModel.findByIdAndUpdate(
      batch.id,
      {
        batchId: batch.batchId,
        userId: batch.userId,
        totalTweets: batch.totalTweets,
        currentStage: batch.currentStage,
        processedTweets: batch.processedTweets,
        failedTweets: batch.failedTweets,
      },
      { new: true, upsert: true }
    );

    if (!doc) throw new Error('Failed to save batch');

    return Batch.builder()
      .id(doc._id.toString())
      .batchId(doc.batchId)
      .userId(doc.userId)
      .totalTweets(doc.totalTweets)
      .currentStage(doc.currentStage)
      .processedTweets(doc.processedTweets)
      .failedTweets(doc.failedTweets)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }

  async findById(id: string): Promise<Batch | null> {
    const doc = await BatchModel.findById(id);
    if (!doc) return null;

    return Batch.builder()
      .id(doc._id.toString())
      .batchId(doc.batchId)
      .userId(doc.userId)
      .totalTweets(doc.totalTweets)
      .currentStage(doc.currentStage)
      .processedTweets(doc.processedTweets)
      .failedTweets(doc.failedTweets)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }

  async findByBatchId(batchId: string): Promise<Batch | null> {
    const doc = await BatchModel.findOne({ batchId });
    if (!doc) return null;

    return Batch.builder()
      .id(doc._id.toString())
      .batchId(doc.batchId)
      .userId(doc.userId)
      .totalTweets(doc.totalTweets)
      .currentStage(doc.currentStage)
      .processedTweets(doc.processedTweets)
      .failedTweets(doc.failedTweets)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }

  async findByUserId(userId: string, limit: number = 10): Promise<Batch[]> {
    const docs = await BatchModel.find({ userId }).sort({ createdAt: -1 }).limit(limit);

    return docs.map((doc) =>
      Batch.builder()
        .id(doc._id.toString())
        .batchId(doc.batchId)
        .userId(doc.userId)
        .totalTweets(doc.totalTweets)
        .currentStage(doc.currentStage)
        .processedTweets(doc.processedTweets)
        .failedTweets(doc.failedTweets)
        .createdAt(doc.createdAt)
        .updatedAt(doc.updatedAt)
        .build()
    );
  }

  async delete(id: string): Promise<void> {
    await BatchModel.findByIdAndDelete(id);
  }
}
