/**
 * SessionState MongoDB Schema
 */

import { Schema, Document } from 'mongoose';

export interface SessionStateDocument extends Document {
  userId: string;
  canStartSession: boolean;
  lastSessionAt?: Date;
  nextSessionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const SessionStateSchema = new Schema<SessionStateDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    canStartSession: { type: Boolean, default: true },
    lastSessionAt: { type: Date },
    nextSessionAt: { type: Date },
  },
  {
    timestamps: true,
    collection: 'session_states',
  }
);
