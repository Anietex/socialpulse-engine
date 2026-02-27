/**
 * User MongoDB Schema
 * Defines the persistence schema for User entity
 */

import { Schema, model, Model, Document } from 'mongoose';
import { UserRole } from '../../../../shared/constants/roles.js';
import { UserStatus } from '../../../../shared/constants/statuses.js';

/**
 * User document interface
 */
export interface UserDocument extends Document {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  twitterHandle?: string;
  settings: {
    automation: {
      enabled: boolean;
      maxEngagementsPerDay: number;
      targetCategories: string[];
    };
    notifications: {
      email: boolean;
      inApp: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User MongoDB Schema
 */
const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      index: true,
    },
    twitterHandle: {
      type: String,
      trim: true,
      sparse: true,
    },
    settings: {
      automation: {
        enabled: {
          type: Boolean,
          default: false,
        },
        maxEngagementsPerDay: {
          type: Number,
          default: 10,
          min: 1,
          max: 100,
        },
        targetCategories: {
          type: [String],
          default: [],
        },
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        inApp: {
          type: Boolean,
          default: true,
        },
      },
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes for faster queries
UserSchema.index({ email: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ twitterHandle: 1 }, { sparse: true });

// Compound indexes
UserSchema.index({ status: 1, role: 1 });

/**
 * User Model
 */
export const UserModel: Model<UserDocument> = model<UserDocument>('User', UserSchema);
