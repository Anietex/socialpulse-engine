import {
  IContentRepository,
  ContentCountCriteria,
} from '../../domain/repositories/IContentRepository';
import { Content } from '../../domain/entities/Content';
import { ContentId } from '../../core/value-objects/ContentId';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { ContentStatus } from '../../core/types/ContentStatus';
import { ActionType } from '../../core/types/ActionType';
import { ContentModel, ContentDocument } from './schemas/ContentSchema';

/**
 * MongoDB implementation of IContentRepository
 * Uses Mongoose for persistence layer
 *
 * Benefits:
 * - Implements domain repository interface (Dependency Inversion)
 * - Handles mapping between domain entities and MongoDB documents
 * - Provides optimized queries with proper indexing
 * - Separates persistence concerns from domain logic
 */
export class MongoContentRepository implements IContentRepository {
  /**
   * Find content by ID
   */
  async findById(id: ContentId): Promise<Content | null> {
    const doc = await ContentModel.findById(id.toString()).exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Find multiple content by IDs
   */
  async findByIds(ids: ContentId[]): Promise<Content[]> {
    const idStrings = ids.map((id) => id.toString());
    const docs = await ContentModel.find({ _id: { $in: idStrings } }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content by platform
   */
  async findByPlatform(platformId: PlatformId, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({ platformId: platformId.toString() })
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content by status
   */
  async findByStatus(status: ContentStatus, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({ status }).limit(limit).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content by platform and status
   */
  async findByPlatformAndStatus(
    platformId: PlatformId,
    status: ContentStatus,
    limit: number = 100
  ): Promise<Content[]> {
    const docs = await ContentModel.find({
      platformId: platformId.toString(),
      status,
    })
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content ready for specific action
   */
  async findReadyForAction(action: ActionType, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({
      status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
      engagementAction: action,
    })
      .limit(limit)
      .sort({ rankScore: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content in specific batch
   */
  async findByBatchId(batchId: string): Promise<Content[]> {
    const docs = await ContentModel.find({ batchId }).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content for ranking stage
   */
  async findForRanking(batchId: string, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({
      batchId,
      status: ContentStatus.PENDING_RANKING,
    })
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content for engagement determination stage
   */
  async findForEngagement(batchId: string, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({
      batchId,
      status: ContentStatus.PENDING_ACTION,
    })
      .limit(limit)
      .sort({ rankScore: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content for automation stage
   */
  async findForAutomation(batchId: string, limit: number = 100): Promise<Content[]> {
    const docs = await ContentModel.find({
      batchId,
      status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
    })
      .limit(limit)
      .sort({ rankScore: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find content in growth sweet spot
   * Growth sweet spot: content with good engagement potential
   */
  async findInGrowthSweetSpot(platformId?: PlatformId, limit: number = 100): Promise<Content[]> {
    const query: any = {
      status: { $in: [ContentStatus.PENDING_ACTION, ContentStatus.QUEUED_FOR_ENGAGEMENT] },
      rankScore: { $gte: 0.6 }, // High rank score
    };

    if (platformId) {
      query.platformId = platformId.toString();
    }

    const docs = await ContentModel.find(query).limit(limit).sort({ rankScore: -1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find fresh content (recently created)
   */
  async findFreshContent(
    maxAgeHours: number,
    platformId?: PlatformId,
    limit: number = 100
  ): Promise<Content[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

    const query: any = {
      createdAt: { $gte: cutoffDate.toISOString() },
    };

    if (platformId) {
      query.platformId = platformId.toString();
    }

    const docs = await ContentModel.find(query).limit(limit).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Save content (create or update)
   */
  async save(content: Content): Promise<Content> {
    const plain = content.toPlain();
    const doc = await ContentModel.findByIdAndUpdate(
      plain.id,
      { $set: plain },
      { upsert: true, new: true }
    ).exec();

    if (!doc) {
      throw new Error(`Failed to save content ${plain.id}`);
    }

    return this.toDomain(doc);
  }

  /**
   * Save multiple content items
   */
  async saveMany(contents: Content[]): Promise<Content[]> {
    const operations = contents.map((content) => {
      const plain = content.toPlain();
      return {
        updateOne: {
          filter: { _id: plain.id },
          update: { $set: plain },
          upsert: true,
        },
      };
    });

    await ContentModel.bulkWrite(operations);

    // Retrieve saved documents
    const ids = contents.map((c) => c.id.toString());
    const docs = await ContentModel.find({ _id: { $in: ids } }).exec();

    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Update content status
   */
  async updateStatus(id: ContentId, status: ContentStatus): Promise<void> {
    await ContentModel.findByIdAndUpdate(id.toString(), { $set: { status } }).exec();
  }

  /**
   * Update multiple statuses
   */
  async updateManyStatuses(ids: ContentId[], status: ContentStatus): Promise<void> {
    const idStrings = ids.map((id) => id.toString());
    await ContentModel.updateMany({ _id: { $in: idStrings } }, { $set: { status } }).exec();
  }

  /**
   * Delete content
   */
  async delete(id: ContentId): Promise<void> {
    await ContentModel.findByIdAndDelete(id.toString()).exec();
  }

  /**
   * Delete multiple content items
   */
  async deleteMany(ids: ContentId[]): Promise<void> {
    const idStrings = ids.map((id) => id.toString());
    await ContentModel.deleteMany({ _id: { $in: idStrings } }).exec();
  }

  /**
   * Count content by criteria
   */
  async count(criteria: ContentCountCriteria): Promise<number> {
    const query: any = {};

    if (criteria.platformId) {
      query.platformId = criteria.platformId.toString();
    }

    if (criteria.status) {
      query.status = criteria.status;
    }

    if (criteria.batchId) {
      query.batchId = criteria.batchId;
    }

    if (criteria.engagementAction) {
      query.engagementAction = criteria.engagementAction;
    }

    if (criteria.category) {
      query.category = criteria.category;
    }

    if (criteria.minRankScore !== undefined) {
      query.rankScore = { $gte: criteria.minRankScore };
    }

    if (criteria.maxAgeHours !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - criteria.maxAgeHours);
      query.createdAt = { $gte: cutoffDate.toISOString() };
    }

    return await ContentModel.countDocuments(query).exec();
  }

  /**
   * Check if content exists
   */
  async exists(id: ContentId): Promise<boolean> {
    const doc = await ContentModel.findById(id.toString()).select('_id').exec();
    return doc !== null;
  }

  /**
   * Find content by platform content ID (original ID from platform)
   */
  async findByPlatformContentId(
    platformId: PlatformId,
    platformContentId: string
  ): Promise<Content | null> {
    const doc = await ContentModel.findOne({
      platformId: platformId.toString(),
      platformContentId,
    }).exec();

    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Convert MongoDB document to domain entity
   */
  private toDomain(doc: ContentDocument): Content {
    return Content.fromPlain({
      id: doc._id,
      platformId: doc.platformId,
      platformContentId: doc.platformContentId,
      text: doc.text,
      author: doc.author,
      url: doc.url,
      createdAt: doc.createdAt,
      metrics: doc.metrics,
      status: doc.status,
      media: doc.media,
      isReply: doc.isReply,
      isRepost: doc.isRepost,
      isQuote: doc.isQuote,
      category: doc.category,
      rankScore: doc.rankScore,
      engagementAction: doc.engagementAction,
      cleanedText: doc.cleanedText,
      textWithDescriptions: doc.textWithDescriptions,
      platformData: doc.platformData,
      batchId: doc.batchId,
    });
  }
}
