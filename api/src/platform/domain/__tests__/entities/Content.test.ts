import { Content } from '../../entities/Content';
import { Author } from '../../entities/Author';
import { Metrics } from '../../../core/value-objects/Metrics';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { ActionType } from '../../../core/types/ActionType';

describe('Content', () => {
  const createValidAuthor = () => {
    return new Author('author123', 'John Doe', 'johndoe', undefined, undefined, true, 15000);
  };

  const createValidContentData = (): any => ({
    id: 'twitter:12345',
    platformId: 'twitter',
    platformContentId: '12345',
    text: 'This is a test tweet about TypeScript',
    author: createValidAuthor().toPlain(),
    url: 'https://twitter.com/johndoe/status/12345',
    createdAt: new Date('2025-01-01T12:00:00Z').toISOString(),
    metrics: { likes: 50, comments: 10, shares: 5, views: 1000 },
    status: ContentStatus.PENDING_CATEGORIZATION,
    media: [],
    isReply: false,
    isRepost: false,
    isQuote: false,
  });

  describe('construction', () => {
    it('should create content with all fields', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);

      expect(content.id.toString()).toBe(data.id);
      expect(content.platformId.toString()).toBe(data.platformId);
      expect(content.text).toBe(data.text);
      expect(content.status).toBe(data.status);
    });

    it('should throw error for empty text', () => {
      const data = createValidContentData();
      data.text = '';

      expect(() => Content.fromPlain(data)).toThrow('Content text is required');
    });

    it('should throw error for whitespace-only text', () => {
      const data = createValidContentData();
      data.text = '   ';

      expect(() => Content.fromPlain(data)).toThrow('Content text is required');
    });

    it('should throw error for empty URL', () => {
      const data = createValidContentData();
      data.url = '';

      expect(() => Content.fromPlain(data)).toThrow('Content URL is required');
    });

    it('should throw error for future created date', () => {
      const data = createValidContentData();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      data.createdAt = futureDate.toISOString();

      expect(() => Content.fromPlain(data)).toThrow('Content created date cannot be in the future');
    });
  });

  describe('canBeCategorized', () => {
    it('should return true when status is PENDING_CATEGORIZATION with cleaned text', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_CATEGORIZATION;
      data.cleanedText = 'Cleaned text';
      const content = Content.fromPlain(data);

      expect(content.canBeCategorized()).toBe(true);
    });

    it('should return true when status is PENDING_CATEGORIZATION with original text only', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_CATEGORIZATION;
      const content = Content.fromPlain(data);

      expect(content.canBeCategorized()).toBe(true);
    });

    it('should return false for other statuses', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_RANKING;
      const content = Content.fromPlain(data);

      expect(content.canBeCategorized()).toBe(false);
    });
  });

  describe('canBeRanked', () => {
    it('should return true when status is PENDING_RANKING with category', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_RANKING;
      data.category = 'educational';
      const content = Content.fromPlain(data);

      expect(content.canBeRanked()).toBe(true);
    });

    it('should return false when status is PENDING_RANKING without category', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_RANKING;
      const content = Content.fromPlain(data);

      expect(content.canBeRanked()).toBe(false);
    });

    it('should return false for other statuses', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_CATEGORIZATION;
      data.category = 'educational';
      const content = Content.fromPlain(data);

      expect(content.canBeRanked()).toBe(false);
    });
  });

  describe('canDetermineEngagement', () => {
    it('should return true when status is PENDING_ACTION with rank score', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_ACTION;
      data.rankScore = 75;
      const content = Content.fromPlain(data);

      expect(content.canDetermineEngagement()).toBe(true);
    });

    it('should return false when status is PENDING_ACTION without rank score', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_ACTION;
      const content = Content.fromPlain(data);

      expect(content.canDetermineEngagement()).toBe(false);
    });

    it('should return false for other statuses', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_RANKING;
      data.rankScore = 75;
      const content = Content.fromPlain(data);

      expect(content.canDetermineEngagement()).toBe(false);
    });
  });

  describe('shouldAutomate', () => {
    it('should return true when status is QUEUED_FOR_ENGAGEMENT with action', () => {
      const data = createValidContentData();
      data.status = ContentStatus.QUEUED_FOR_ENGAGEMENT;
      data.engagementAction = ActionType.LIKE;
      const content = Content.fromPlain(data);

      expect(content.shouldAutomate()).toBe(true);
    });

    it('should return false when action is VIEW (passive)', () => {
      const data = createValidContentData();
      data.status = ContentStatus.QUEUED_FOR_ENGAGEMENT;
      data.engagementAction = ActionType.VIEW;
      const content = Content.fromPlain(data);

      expect(content.shouldAutomate()).toBe(false);
    });

    it('should return false when no engagement action', () => {
      const data = createValidContentData();
      data.status = ContentStatus.QUEUED_FOR_ENGAGEMENT;
      const content = Content.fromPlain(data);

      expect(content.shouldAutomate()).toBe(false);
    });

    it('should return false for other statuses', () => {
      const data = createValidContentData();
      data.status = ContentStatus.PENDING_ACTION;
      data.engagementAction = ActionType.LIKE;
      const content = Content.fromPlain(data);

      expect(content.shouldAutomate()).toBe(false);
    });
  });

  describe('hasHighEngagement', () => {
    it('should return true when total engagement exceeds default threshold', () => {
      const data = createValidContentData();
      data.metrics = { likes: 500, comments: 300, shares: 250, views: 5000 }; // Total: 1050
      const content = Content.fromPlain(data);

      expect(content.hasHighEngagement()).toBe(true);
    });

    it('should return false when below default threshold', () => {
      const data = createValidContentData();
      data.metrics = { likes: 50, comments: 10, shares: 5, views: 1000 }; // Total: 65
      const content = Content.fromPlain(data);

      expect(content.hasHighEngagement()).toBe(false);
    });

    it('should support custom threshold', () => {
      const data = createValidContentData();
      data.metrics = { likes: 50, comments: 10, shares: 5, views: 1000 }; // Total: 65
      const content = Content.fromPlain(data);

      expect(content.hasHighEngagement(60)).toBe(true);
      expect(content.hasHighEngagement(70)).toBe(false);
    });
  });

  describe('isInGrowthSweetSpot', () => {
    it('should return true for likes in sweet spot (5-100)', () => {
      const data = createValidContentData();
      data.metrics = { likes: 50, comments: 10, shares: 5, views: 1000 };
      const content = Content.fromPlain(data);

      expect(content.isInGrowthSweetSpot()).toBe(true);
    });

    it('should return false for likes below sweet spot', () => {
      const data = createValidContentData();
      data.metrics = { likes: 3, comments: 10, shares: 5, views: 1000 };
      const content = Content.fromPlain(data);

      expect(content.isInGrowthSweetSpot()).toBe(false);
    });

    it('should return false for likes above sweet spot', () => {
      const data = createValidContentData();
      data.metrics = { likes: 150, comments: 10, shares: 5, views: 1000 };
      const content = Content.fromPlain(data);

      expect(content.isInGrowthSweetSpot()).toBe(false);
    });

    it('should include boundary values', () => {
      const data1 = createValidContentData();
      data1.metrics = { likes: 5, comments: 1, shares: 0, views: 100 };
      const content1 = Content.fromPlain(data1);

      const data2 = createValidContentData();
      data2.metrics = { likes: 100, comments: 1, shares: 0, views: 100 };
      const content2 = Content.fromPlain(data2);

      expect(content1.isInGrowthSweetSpot()).toBe(true);
      expect(content2.isInGrowthSweetSpot()).toBe(true);
    });
  });

  describe('isViral', () => {
    it('should return true for high engagement rate', () => {
      const data = createValidContentData();
      data.metrics = { likes: 50, comments: 30, shares: 20, views: 100 }; // 100% engagement
      const content = Content.fromPlain(data);

      expect(content.isViral()).toBe(true);
    });

    it('should return false for low engagement rate', () => {
      const data = createValidContentData();
      data.metrics = { likes: 5, comments: 3, shares: 2, views: 1000 }; // 1% engagement
      const content = Content.fromPlain(data);

      expect(content.isViral()).toBe(false);
    });

    it('should support custom threshold', () => {
      const data = createValidContentData();
      data.metrics = { likes: 10, comments: 5, shares: 5, views: 100 }; // 20% engagement
      const content = Content.fromPlain(data);

      expect(content.isViral(0.1)).toBe(true);
      expect(content.isViral(0.3)).toBe(false);
    });
  });

  describe('hasMedia', () => {
    it('should return true when media array has items', () => {
      const data = createValidContentData();
      data.media = [{ type: 'image', url: 'https://example.com/image.jpg' }];
      const content = Content.fromPlain(data);

      expect(content.hasMedia()).toBe(true);
    });

    it('should return false when media array is empty', () => {
      const data = createValidContentData();
      data.media = [];
      const content = Content.fromPlain(data);

      expect(content.hasMedia()).toBe(false);
    });
  });

  describe('getTextForProcessing', () => {
    it('should prefer textWithDescriptions', () => {
      const data = createValidContentData();
      data.text = 'Original text';
      data.cleanedText = 'Cleaned text';
      data.textWithDescriptions = 'Text with descriptions';
      const content = Content.fromPlain(data);

      expect(content.getTextForProcessing()).toBe('Text with descriptions');
    });

    it('should fallback to cleanedText', () => {
      const data = createValidContentData();
      data.text = 'Original text';
      data.cleanedText = 'Cleaned text';
      const content = Content.fromPlain(data);

      expect(content.getTextForProcessing()).toBe('Cleaned text');
    });

    it('should fallback to original text', () => {
      const data = createValidContentData();
      data.text = 'Original text';
      const content = Content.fromPlain(data);

      expect(content.getTextForProcessing()).toBe('Original text');
    });
  });

  describe('hasInfluentialAuthor', () => {
    it('should return true for verified author', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);

      expect(content.hasInfluentialAuthor()).toBe(true); // Author is verified
    });

    it('should return true for large follower count', () => {
      const data = createValidContentData();
      data.author = new Author('a1', 'Jane', 'jane', undefined, undefined, false, 60000).toPlain();
      const content = Content.fromPlain(data);

      expect(content.hasInfluentialAuthor()).toBe(true);
    });

    it('should return false for small unverified author', () => {
      const data = createValidContentData();
      data.author = new Author('a1', 'Jane', 'jane', undefined, undefined, false, 1000).toPlain();
      const content = Content.fromPlain(data);

      expect(content.hasInfluentialAuthor()).toBe(false);
    });
  });

  describe('getAgeInHours', () => {
    it('should calculate age correctly', () => {
      const data = createValidContentData();
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      data.createdAt = oneDayAgo.toISOString();
      const content = Content.fromPlain(data);

      const age = content.getAgeInHours();
      expect(age).toBeGreaterThanOrEqual(23.9);
      expect(age).toBeLessThanOrEqual(24.1);
    });
  });

  describe('isFresh', () => {
    it('should return true for recent content', () => {
      const data = createValidContentData();
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      data.createdAt = oneHourAgo.toISOString();
      const content = Content.fromPlain(data);

      expect(content.isFresh()).toBe(true);
    });

    it('should return false for old content', () => {
      const data = createValidContentData();
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
      data.createdAt = twoDaysAgo.toISOString();
      const content = Content.fromPlain(data);

      expect(content.isFresh()).toBe(false);
    });

    it('should support custom max age', () => {
      const data = createValidContentData();
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
      data.createdAt = sixHoursAgo.toISOString();
      const content = Content.fromPlain(data);

      expect(content.isFresh(12)).toBe(true);
      expect(content.isFresh(4)).toBe(false);
    });
  });

  describe('immutable updates', () => {
    it('withMetrics should return new instance', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);
      const newMetrics = Metrics.create(100, 20, 10, 2000);

      const updated = content.withMetrics(newMetrics);

      expect(updated).not.toBe(content);
      expect(updated.metrics).toBe(newMetrics);
      expect(content.metrics).not.toBe(newMetrics);
    });

    it('withStatus should return new instance', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);

      const updated = content.withStatus(ContentStatus.PENDING_RANKING);

      expect(updated).not.toBe(content);
      expect(updated.status).toBe(ContentStatus.PENDING_RANKING);
      expect(content.status).toBe(ContentStatus.PENDING_CATEGORIZATION);
    });

    it('withCategory should return new instance', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);

      const updated = content.withCategory('educational');

      expect(updated).not.toBe(content);
      expect(updated.category).toBe('educational');
      expect(content.category).toBeUndefined();
    });

    it('withRankScore should return new instance', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);

      const updated = content.withRankScore(85);

      expect(updated).not.toBe(content);
      expect(updated.rankScore).toBe(85);
      expect(content.rankScore).toBeUndefined();
    });

    it('withEngagementAction should return new instance', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);

      const updated = content.withEngagementAction(ActionType.COMMENT);

      expect(updated).not.toBe(content);
      expect(updated.engagementAction).toBe(ActionType.COMMENT);
      expect(content.engagementAction).toBeUndefined();
    });
  });

  describe('serialization', () => {
    it('toPlain should preserve all fields', () => {
      const data = createValidContentData();
      data.category = 'educational';
      data.rankScore = 75;
      data.engagementAction = ActionType.LIKE;
      data.cleanedText = 'Cleaned text';
      const content = Content.fromPlain(data);

      const plain = content.toPlain();

      expect(plain.id).toBe(data.id);
      expect(plain.platformId).toBe(data.platformId);
      expect(plain.text).toBe(data.text);
      expect(plain.category).toBe('educational');
      expect(plain.rankScore).toBe(75);
    });

    it('should be reversible with fromPlain', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);
      const plain = content.toPlain();
      const reconstructed = Content.fromPlain(plain);

      expect(reconstructed.toPlain()).toEqual(plain);
    });
  });

  describe('ContentBuilder', () => {
    it('should build valid content', () => {
      const author = createValidAuthor();
      const content = Content.builder()
        .id('twitter:123')
        .platformId('twitter')
        .platformContentId('123')
        .text('Test content')
        .author(author.toPlain())
        .url('https://twitter.com/test/123')
        .createdAt(new Date())
        .metrics({ likes: 10, comments: 5, shares: 2, views: 100 })
        .status(ContentStatus.PENDING_CATEGORIZATION)
        .media([])
        .isReply(false)
        .isRepost(false)
        .isQuote(false)
        .build();

      expect(content.text).toBe('Test content');
      expect(content.status).toBe(ContentStatus.PENDING_CATEGORIZATION);
    });

    it('should throw error for missing required fields', () => {
      expect(() => {
        Content.builder().text('Test').build();
      }).toThrow('Content ID is required');
    });

    it('should set defaults for optional fields', () => {
      const author = createValidAuthor();
      const content = Content.builder()
        .id('twitter:123')
        .platformId('twitter')
        .platformContentId('123')
        .text('Test')
        .author(author.toPlain())
        .url('https://example.com')
        .createdAt(new Date())
        .metrics({ likes: 0, comments: 0, shares: 0, views: 0 })
        .status(ContentStatus.PENDING_CATEGORIZATION)
        .build();

      expect(content.media).toEqual([]);
      expect(content.isReply).toBe(false);
      expect(content.isRepost).toBe(false);
      expect(content.isQuote).toBe(false);
    });
  });

  describe('toString', () => {
    it('should provide readable string representation', () => {
      const data = createValidContentData();
      const content = Content.fromPlain(data);
      const str = content.toString();

      expect(str).toContain('twitter:12345');
      expect(str).toContain('twitter');
      expect(str).toContain(ContentStatus.PENDING_CATEGORIZATION);
      expect(str).toContain('johndoe');
    });
  });
});
