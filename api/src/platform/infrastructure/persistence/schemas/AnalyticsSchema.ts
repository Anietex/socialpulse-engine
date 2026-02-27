/**
 * Analytics MongoDB Schema
 */

import { Schema, Document } from 'mongoose';
import { AnalyticsMetrics } from '../../../domain/entities/Analytics';

export interface AnalyticsDocument extends Document {
  userId?: string;
  date: Date;
  metrics: AnalyticsMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export const AnalyticsSchema = new Schema<AnalyticsDocument>(
  {
    userId: {
      type: String,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    metrics: {
      tweetsIngested: { type: Number, default: 0 },
      tweetsProcessed: { type: Number, default: 0 },
      tweetsAutomated: { type: Number, default: 0 },
      avgProcessingTime: { type: Number, default: 0 },
      categoryBreakdown: [
        {
          category: String,
          count: Number,
        },
      ],
    },
  },
  {
    timestamps: true,
    collection: 'analytics',
  }
);

// Indexes
AnalyticsSchema.index({ userId: 1, date: -1 });
AnalyticsSchema.index({ date: -1 });
