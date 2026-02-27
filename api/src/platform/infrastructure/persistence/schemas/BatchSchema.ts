/**
 * Batch MongoDB Schema
 */

import { Schema, Document } from 'mongoose';
import { BatchStage } from '../../../domain/entities/Batch';

export interface BatchDocument extends Document {
  batchId: string;
  userId: string;
  totalTweets: number;
  currentStage: BatchStage;
  processedTweets: number;
  failedTweets: number;
  createdAt: Date;
  updatedAt: Date;
}

export const BatchSchema = new Schema<BatchDocument>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    totalTweets: { type: Number, required: true },
    currentStage: {
      type: String,
      enum: Object.values(BatchStage),
      default: BatchStage.CLEANUP,
    },
    processedTweets: { type: Number, default: 0 },
    failedTweets: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'batches',
  }
);
