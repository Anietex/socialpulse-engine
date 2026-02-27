/**
 * Job MongoDB Schema
 */

import { Schema, Document } from 'mongoose';
import { JobType, JobStatus } from '../../../domain/entities/Job';

export interface JobDocument extends Document {
  tweetId: string;
  type: JobType;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  error?: string;
  result?: any;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const JobSchema = new Schema<JobDocument>(
  {
    tweetId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: Object.values(JobType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.PENDING,
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    error: { type: String },
    result: { type: Schema.Types.Mixed },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'jobs',
  }
);

// Indexes for performance
JobSchema.index({ type: 1, status: 1 });
JobSchema.index({ tweetId: 1, type: 1 });
