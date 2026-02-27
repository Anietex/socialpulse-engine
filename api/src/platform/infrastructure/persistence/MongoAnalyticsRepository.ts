/**
 * MongoDB Analytics Repository Implementation
 */

import { model, Model } from 'mongoose';
import {
  IAnalyticsRepository,
  AnalyticsQueryParams,
} from '../../domain/repositories/IAnalyticsRepository';
import { Analytics } from '../../domain/entities/Analytics';
import { AnalyticsSchema, AnalyticsDocument } from './schemas/AnalyticsSchema';

const AnalyticsModel: Model<AnalyticsDocument> = model<AnalyticsDocument>(
  'Analytics',
  AnalyticsSchema
);

export class MongoAnalyticsRepository implements IAnalyticsRepository {
  async save(analytics: Analytics): Promise<Analytics> {
    const doc = await AnalyticsModel.findByIdAndUpdate(
      analytics.id,
      {
        userId: analytics.userId,
        date: analytics.date,
        metrics: analytics.metrics,
      },
      { new: true, upsert: true }
    );

    if (!doc) throw new Error('Failed to save analytics');

    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Analytics | null> {
    const doc = await AnalyticsModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findByUserAndDate(userId: string | undefined, date: Date): Promise<Analytics | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const doc = await AnalyticsModel.findOne({
      userId: userId || { $exists: false },
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    return doc ? this.toDomain(doc) : null;
  }

  async find(params: AnalyticsQueryParams): Promise<Analytics[]> {
    const query: any = {};

    if (params.userId !== undefined) {
      query.userId = params.userId;
    }

    if (params.startDate || params.endDate) {
      query.date = {};
      if (params.startDate) {
        query.date.$gte = params.startDate;
      }
      if (params.endDate) {
        query.date.$lte = params.endDate;
      }
    }

    const docs = await AnalyticsModel.find(query).sort({ date: -1 });
    return docs.map((doc) => this.toDomain(doc));
  }

  async getSystemAnalytics(startDate: Date, endDate: Date): Promise<Analytics[]> {
    const docs = await AnalyticsModel.find({
      userId: { $exists: false },
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    return docs.map((doc) => this.toDomain(doc));
  }

  async getUserAnalytics(userId: string, startDate: Date, endDate: Date): Promise<Analytics[]> {
    const docs = await AnalyticsModel.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: -1 });

    return docs.map((doc) => this.toDomain(doc));
  }

  async delete(id: string): Promise<void> {
    await AnalyticsModel.findByIdAndDelete(id);
  }

  /**
   * Map document to domain entity
   */
  private toDomain(doc: AnalyticsDocument): Analytics {
    return Analytics.builder()
      .id(doc._id.toString())
      .userId(doc.userId)
      .date(doc.date)
      .metrics(doc.metrics)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }
}
