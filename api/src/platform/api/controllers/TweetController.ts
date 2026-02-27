/**
 * Tweet Controller
 * Handles tweet search and retrieval HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { ITweetRepository } from '../../domain/repositories/ITweetRepository';
import { TweetStatus } from '../../domain/entities/Tweet';
import { logger } from '../../../config/logger';

/**
 * Tweet Controller
 */
export class TweetController {
  constructor(private readonly tweetRepository: ITweetRepository) {}

  /**
   * Search tweets
   * GET /tweets/search
   */
  async searchTweets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?._id || (req.query.userId as string);
      const status = req.query.status as TweetStatus | undefined;
      const category = req.query.category as string | undefined;
      const minRank = req.query.minRank ? parseInt(req.query.minRank as string) : undefined;
      const maxRank = req.query.maxRank ? parseInt(req.query.maxRank as string) : undefined;
      const search = req.query.q as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const tweets = await this.tweetRepository.search({
        userId,
        status,
        category,
        minRank,
        maxRank,
        search,
        limit,
        offset,
      });

      const total = await this.tweetRepository.countSearch({
        userId,
        status,
        category,
        minRank,
        maxRank,
        search,
      });

      res.status(200).json({
        success: true,
        data: {
          tweets: tweets.map((t) => t.toPlain()),
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + tweets.length < total,
          },
        },
      });
    } catch (error) {
      logger.error('Search tweets failed', { error });
      next(error);
    }
  }

  /**
   * Get tweet by ID
   * GET /tweets/:id
   */
  async getTweetById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const tweet = await this.tweetRepository.findById(id);

      if (!tweet) {
        res.status(404).json({
          success: false,
          message: 'Tweet not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: tweet.toPlain(),
      });
    } catch (error) {
      logger.error('Get tweet by ID failed', { error });
      next(error);
    }
  }
}
