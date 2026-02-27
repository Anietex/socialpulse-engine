/**
 * Tweet Mapper
 * Maps between Tweet domain entity and MongoDB document
 */

import { Tweet } from '../../../domain/entities/Tweet';
import { TweetDocument } from '../schemas/TweetSchema';

export class TweetMapper {
  /**
   * Map from MongoDB document to domain entity
   */
  static toDomain(doc: TweetDocument): Tweet {
    return Tweet.builder()
      .id(doc._id.toString())
      .userId(doc.userId)
      .batchId(doc.batchId)
      .injectedId(doc.injectedId)
      .text(doc.text)
      .user(doc.user)
      .url(doc.url)
      .media(doc.media)
      .metrics(doc.metrics)
      .status(doc.status)
      .category(doc.category)
      .rank(doc.rank)
      .automationAttempts(doc.automationAttempts)
      .timestamps(doc.timestamps)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }

  /**
   * Map from domain entity to MongoDB document
   */
  static toPersistence(tweet: Tweet): Partial<TweetDocument> {
    return {
      userId: tweet.userId,
      batchId: tweet.batchId,
      injectedId: tweet.injectedId,
      text: tweet.text,
      user: tweet.user,
      url: tweet.url,
      media: tweet.media,
      metrics: tweet.metrics,
      status: tweet.status,
      category: tweet.category,
      rank: tweet.rank,
      automationAttempts: tweet.automationAttempts,
      timestamps: tweet.timestamps,
    };
  }
}
