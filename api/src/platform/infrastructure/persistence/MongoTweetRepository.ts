/**
 * MongoDB Tweet Repository Implementation
 */

import { model, Model } from 'mongoose';
import { ITweetRepository, TweetSearchParams } from '../../domain/repositories/ITweetRepository';
import { Tweet, TweetStatus } from '../../domain/entities/Tweet';
import { TweetSchema, TweetDocument } from './schemas/TweetSchema';
import { TweetMapper } from './mappers/TweetMapper';
import { logger } from '../../../config/logger';

const TweetModel: Model<TweetDocument> = model<TweetDocument>('Tweet', TweetSchema);

export class MongoTweetRepository implements ITweetRepository {
  async save(tweet: Tweet): Promise<Tweet> {
    try {
      const persistence = TweetMapper.toPersistence(tweet);

      const doc = await TweetModel.findByIdAndUpdate(tweet.id, persistence, {
        new: true,
        upsert: true,
      });

      if (!doc) {
        throw new Error('Failed to save tweet');
      }

      return TweetMapper.toDomain(doc);
    } catch (error) {
      logger.error('Error saving tweet', { tweetId: tweet.id, error });
      throw error;
    }
  }

  async saveBulk(tweets: Tweet[]): Promise<Tweet[]> {
    try {
      const operations = tweets.map((tweet) => ({
        insertOne: {
          document: {
            _id: tweet.id,
            ...TweetMapper.toPersistence(tweet),
          },
        },
      }));

      const result = await TweetModel.bulkWrite(operations, { ordered: false });

      logger.info(`Bulk inserted ${result.insertedCount} tweets`);

      // Return saved tweets
      const ids = tweets.map((t) => t.id);
      const docs = await TweetModel.find({ _id: { $in: ids } });

      return docs.map((doc) => TweetMapper.toDomain(doc));
    } catch (error: any) {
      // Handle bulk write errors
      if (error.name === 'MongoBulkWriteError') {
        const insertedCount = error.result?.nInserted || 0;
        logger.warn(`Bulk write completed with errors: ${insertedCount} inserted`);

        // Return successfully inserted tweets
        const ids = tweets.map((t) => t.id);
        const docs = await TweetModel.find({ _id: { $in: ids } });
        return docs.map((doc) => TweetMapper.toDomain(doc));
      }

      logger.error('Error bulk saving tweets', { error });
      throw error;
    }
  }

  async findById(id: string): Promise<Tweet | null> {
    const doc = await TweetModel.findById(id);
    return doc ? TweetMapper.toDomain(doc) : null;
  }

  async findByInjectedId(injectedId: string): Promise<Tweet | null> {
    const doc = await TweetModel.findOne({ injectedId });
    return doc ? TweetMapper.toDomain(doc) : null;
  }

  async existsByInjectedId(injectedId: string): Promise<boolean> {
    const count = await TweetModel.countDocuments({ injectedId });
    return count > 0;
  }

  async existsByInjectedIds(injectedIds: string[]): Promise<Set<string>> {
    const docs = await TweetModel.find(
      { injectedId: { $in: injectedIds } },
      { injectedId: 1 }
    ).lean();

    return new Set(docs.map((doc) => doc.injectedId));
  }

  async findByUserId(userId: string, limit: number = 100): Promise<Tweet[]> {
    const docs = await TweetModel.find({ userId }).sort({ createdAt: -1 }).limit(limit);

    return docs.map((doc) => TweetMapper.toDomain(doc));
  }

  async findByBatchId(batchId: string): Promise<Tweet[]> {
    const docs = await TweetModel.find({ batchId }).sort({ createdAt: -1 });
    return docs.map((doc) => TweetMapper.toDomain(doc));
  }

  async findByStatus(status: TweetStatus, limit: number = 100): Promise<Tweet[]> {
    const docs = await TweetModel.find({ status }).sort({ createdAt: -1 }).limit(limit);

    return docs.map((doc) => TweetMapper.toDomain(doc));
  }

  async countByUserId(userId: string): Promise<number> {
    return TweetModel.countDocuments({ userId });
  }

  async countByStatus(userId: string): Promise<Record<string, number>> {
    const result = await TweetModel.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return result.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  async delete(id: string): Promise<void> {
    await TweetModel.findByIdAndDelete(id);
  }

  async search(params: TweetSearchParams): Promise<Tweet[]> {
    const query: any = {};

    if (params.userId) {
      query.userId = params.userId;
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.category) {
      query.category = params.category;
    }

    if (params.minRank !== undefined || params.maxRank !== undefined) {
      query.rank = {};
      if (params.minRank !== undefined) {
        query.rank.$gte = params.minRank;
      }
      if (params.maxRank !== undefined) {
        query.rank.$lte = params.maxRank;
      }
    }

    if (params.search) {
      query.$or = [
        { text: { $regex: params.search, $options: 'i' } },
        { 'user.name': { $regex: params.search, $options: 'i' } },
        { 'user.handle': { $regex: params.search, $options: 'i' } },
      ];
    }

    const limit = params.limit || 100;
    const offset = params.offset || 0;

    const docs = await TweetModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit);

    return docs.map((doc) => TweetMapper.toDomain(doc));
  }

  async countSearch(params: TweetSearchParams): Promise<number> {
    const query: any = {};

    if (params.userId) {
      query.userId = params.userId;
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.category) {
      query.category = params.category;
    }

    if (params.minRank !== undefined || params.maxRank !== undefined) {
      query.rank = {};
      if (params.minRank !== undefined) {
        query.rank.$gte = params.minRank;
      }
      if (params.maxRank !== undefined) {
        query.rank.$lte = params.maxRank;
      }
    }

    if (params.search) {
      query.$or = [
        { text: { $regex: params.search, $options: 'i' } },
        { 'user.name': { $regex: params.search, $options: 'i' } },
        { 'user.handle': { $regex: params.search, $options: 'i' } },
      ];
    }

    return TweetModel.countDocuments(query);
  }
}
