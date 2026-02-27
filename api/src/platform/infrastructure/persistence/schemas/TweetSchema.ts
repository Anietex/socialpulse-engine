/**
 * Tweet MongoDB Schema
 */

import { Schema, Document } from 'mongoose';
import { TweetStatus } from '../../../domain/entities/Tweet';

export interface TweetDocument extends Document {
  userId: string;
  batchId: string;
  injectedId: string;
  text: string;
  user: {
    name: string;
    handle: string;
    avatar?: string;
  };
  url: string;
  media: {
    images: string[];
    videos: string[];
    gifs: string[];
  };
  metrics: {
    likes: number;
    replies: number;
    reposts: number;
    views: number;
  };
  status: TweetStatus;
  category?: string;
  rank?: number;
  automationAttempts: number;
  timestamps: {
    scrapedAt: Date;
    ingestedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const TweetSchema = new Schema<TweetDocument>(
  {
    userId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    injectedId: { type: String, required: true, unique: true, index: true },
    text: { type: String, required: true },
    user: {
      name: { type: String, required: true },
      handle: { type: String, required: true },
      avatar: { type: String },
    },
    url: { type: String, required: true },
    media: {
      images: { type: [String], default: [] },
      videos: { type: [String], default: [] },
      gifs: { type: [String], default: [] },
    },
    metrics: {
      likes: { type: Number, default: 0 },
      replies: { type: Number, default: 0 },
      reposts: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: Object.values(TweetStatus),
      default: TweetStatus.INGESTED,
      index: true,
    },
    category: { type: String, index: true },
    rank: { type: Number },
    automationAttempts: { type: Number, default: 0 },
    timestamps: {
      scrapedAt: { type: Date, required: true },
      ingestedAt: { type: Date, required: true },
    },
  },
  {
    timestamps: true,
    collection: 'tweets',
  }
);

// Indexes for performance
TweetSchema.index({ userId: 1, status: 1 });
TweetSchema.index({ batchId: 1, status: 1 });
TweetSchema.index({ userId: 1, createdAt: -1 });
