import { Schema, model, Model } from 'mongoose';

/**
 * MongoDB document interface for Content
 * Matches the ContentPlainObject structure from Content entity
 */
export interface ContentDocument {
  _id: string; // ContentId as string
  platformId: string;
  platformContentId: string;
  text: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
    isVerified: boolean;
    followerCount?: number;
  };
  url: string;
  createdAt: string; // ISO string
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  status: string; // ContentStatus
  media: Array<{
    type: 'image' | 'video' | 'gif';
    url: string;
    alt?: string;
    thumbnailUrl?: string;
  }>;
  isReply: boolean;
  isRepost: boolean;
  isQuote: boolean;
  category?: string;
  rankScore?: number;
  engagementAction?: string; // ActionType
  cleanedText?: string;
  textWithDescriptions?: string;
  platformData?: Record<string, any>;
  batchId?: string;

  // Timestamps
  updatedAt?: Date;
}

/**
 * Mongoose schema for Content
 */
const contentSchema = new Schema<ContentDocument>(
  {
    _id: { type: String, required: true },
    platformId: { type: String, required: true, index: true },
    platformContentId: { type: String, required: true },
    text: { type: String, required: true },
    author: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      handle: { type: String, required: true },
      avatarUrl: String,
      isVerified: { type: Boolean, default: false },
      followerCount: Number,
    },
    url: { type: String, required: true },
    createdAt: { type: String, required: true },
    metrics: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
    },
    status: { type: String, required: true, index: true },
    media: [
      {
        type: { type: String, enum: ['image', 'video', 'gif'], required: true },
        url: { type: String, required: true },
        alt: String,
        thumbnailUrl: String,
      },
    ],
    isReply: { type: Boolean, default: false },
    isRepost: { type: Boolean, default: false },
    isQuote: { type: Boolean, default: false },
    category: { type: String, index: true },
    rankScore: { type: Number, index: true },
    engagementAction: { type: String, index: true },
    cleanedText: String,
    textWithDescriptions: String,
    platformData: Schema.Types.Mixed,
    batchId: { type: String, index: true },
  },
  {
    timestamps: true,
    collection: 'contents',
  }
);

// Compound indexes for common queries
contentSchema.index({ platformId: 1, platformContentId: 1 }, { unique: true });
contentSchema.index({ platformId: 1, status: 1 });
contentSchema.index({ batchId: 1, status: 1 });
contentSchema.index({ status: 1, engagementAction: 1 });
contentSchema.index({ createdAt: 1 });
contentSchema.index({ rankScore: -1 });

/**
 * Content Mongoose Model
 */
export const ContentModel: Model<ContentDocument> = model<ContentDocument>(
  'Content',
  contentSchema
);
