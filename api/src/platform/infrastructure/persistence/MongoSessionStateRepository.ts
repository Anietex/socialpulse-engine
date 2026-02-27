/**
 * MongoDB SessionState Repository Implementation
 */

import { model, Model } from 'mongoose';
import { ISessionStateRepository } from '../../domain/repositories/ISessionStateRepository';
import { SessionState } from '../../domain/entities/SessionState';
import { SessionStateSchema, SessionStateDocument } from './schemas/SessionStateSchema';

const SessionStateModel: Model<SessionStateDocument> = model<SessionStateDocument>(
  'SessionState',
  SessionStateSchema
);

export class MongoSessionStateRepository implements ISessionStateRepository {
  async save(sessionState: SessionState): Promise<SessionState> {
    const doc = await SessionStateModel.findOneAndUpdate(
      { userId: sessionState.userId },
      {
        userId: sessionState.userId,
        canStartSession: sessionState.canStartSession,
        lastSessionAt: sessionState.lastSessionAt,
        nextSessionAt: sessionState.nextSessionAt,
      },
      { new: true, upsert: true }
    );

    if (!doc) throw new Error('Failed to save session state');

    return SessionState.builder()
      .id(doc._id.toString())
      .userId(doc.userId)
      .canStartSession(doc.canStartSession)
      .lastSessionAt(doc.lastSessionAt)
      .nextSessionAt(doc.nextSessionAt)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }

  async findByUserId(userId: string): Promise<SessionState | null> {
    const doc = await SessionStateModel.findOne({ userId });
    if (!doc) return null;

    return SessionState.builder()
      .id(doc._id.toString())
      .userId(doc.userId)
      .canStartSession(doc.canStartSession)
      .lastSessionAt(doc.lastSessionAt)
      .nextSessionAt(doc.nextSessionAt)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }

  async delete(id: string): Promise<void> {
    await SessionStateModel.findByIdAndDelete(id);
  }
}
