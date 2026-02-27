import { ContentStatus, ContentStatusUtils } from '../../types/ContentStatus';

describe('ContentStatus', () => {
  describe('ContentStatusUtils.isValid', () => {
    it('should return true for valid status strings', () => {
      expect(ContentStatusUtils.isValid('pending_categorization')).toBe(true);
      expect(ContentStatusUtils.isValid('pending_ranking')).toBe(true);
      expect(ContentStatusUtils.isValid('pending_action')).toBe(true);
      expect(ContentStatusUtils.isValid('queued_for_engagement')).toBe(true);
      expect(ContentStatusUtils.isValid('engaging')).toBe(true);
      expect(ContentStatusUtils.isValid('engaged')).toBe(true);
      expect(ContentStatusUtils.isValid('skipped')).toBe(true);
      expect(ContentStatusUtils.isValid('error')).toBe(true);
      expect(ContentStatusUtils.isValid('archived')).toBe(true);
    });

    it('should return false for invalid status strings', () => {
      expect(ContentStatusUtils.isValid('invalid')).toBe(false);
      expect(ContentStatusUtils.isValid('PENDING')).toBe(false); // Case sensitive
      expect(ContentStatusUtils.isValid('')).toBe(false);
    });
  });

  describe('ContentStatusUtils.fromString', () => {
    it('should parse valid status strings', () => {
      expect(ContentStatusUtils.fromString('pending_categorization')).toBe(
        ContentStatus.PENDING_CATEGORIZATION
      );
      expect(ContentStatusUtils.fromString('engaged')).toBe(ContentStatus.ENGAGED);
    });

    it('should handle uppercase input', () => {
      expect(ContentStatusUtils.fromString('ENGAGED')).toBe(ContentStatus.ENGAGED);
      expect(ContentStatusUtils.fromString('Error')).toBe(ContentStatus.ERROR);
    });

    it('should throw error for invalid status', () => {
      expect(() => ContentStatusUtils.fromString('invalid')).toThrow(
        /Invalid content status: invalid/
      );
    });

    it('should list valid statuses in error message', () => {
      try {
        ContentStatusUtils.fromString('invalid');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('pending_categorization');
        expect(error.message).toContain('engaged');
      }
    });
  });

  describe('ContentStatusUtils.all', () => {
    it('should return all status values', () => {
      const all = ContentStatusUtils.all();

      expect(all).toHaveLength(11);
      expect(all).toContain(ContentStatus.PENDING_OCR);
      expect(all).toContain(ContentStatus.PENDING_IMAGE_CAPTIONING);
      expect(all).toContain(ContentStatus.PENDING_CATEGORIZATION);
      expect(all).toContain(ContentStatus.PENDING_RANKING);
      expect(all).toContain(ContentStatus.PENDING_ACTION);
      expect(all).toContain(ContentStatus.QUEUED_FOR_ENGAGEMENT);
      expect(all).toContain(ContentStatus.ENGAGING);
      expect(all).toContain(ContentStatus.ENGAGED);
      expect(all).toContain(ContentStatus.SKIPPED);
      expect(all).toContain(ContentStatus.ERROR);
      expect(all).toContain(ContentStatus.ARCHIVED);
    });
  });

  describe('ContentStatusUtils.isPending', () => {
    it('should return true for pending statuses', () => {
      expect(ContentStatusUtils.isPending(ContentStatus.PENDING_CATEGORIZATION)).toBe(true);
      expect(ContentStatusUtils.isPending(ContentStatus.PENDING_RANKING)).toBe(true);
      expect(ContentStatusUtils.isPending(ContentStatus.PENDING_ACTION)).toBe(true);
    });

    it('should return false for non-pending statuses', () => {
      expect(ContentStatusUtils.isPending(ContentStatus.ENGAGING)).toBe(false);
      expect(ContentStatusUtils.isPending(ContentStatus.ENGAGED)).toBe(false);
      expect(ContentStatusUtils.isPending(ContentStatus.SKIPPED)).toBe(false);
    });
  });

  describe('ContentStatusUtils.isActive', () => {
    it('should return true for active statuses', () => {
      expect(ContentStatusUtils.isActive(ContentStatus.QUEUED_FOR_ENGAGEMENT)).toBe(true);
      expect(ContentStatusUtils.isActive(ContentStatus.ENGAGING)).toBe(true);
    });

    it('should return false for non-active statuses', () => {
      expect(ContentStatusUtils.isActive(ContentStatus.PENDING_CATEGORIZATION)).toBe(false);
      expect(ContentStatusUtils.isActive(ContentStatus.ENGAGED)).toBe(false);
      expect(ContentStatusUtils.isActive(ContentStatus.ERROR)).toBe(false);
    });
  });

  describe('ContentStatusUtils.isTerminal', () => {
    it('should return true for terminal statuses', () => {
      expect(ContentStatusUtils.isTerminal(ContentStatus.ENGAGED)).toBe(true);
      expect(ContentStatusUtils.isTerminal(ContentStatus.SKIPPED)).toBe(true);
      expect(ContentStatusUtils.isTerminal(ContentStatus.ERROR)).toBe(true);
      expect(ContentStatusUtils.isTerminal(ContentStatus.ARCHIVED)).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(ContentStatusUtils.isTerminal(ContentStatus.PENDING_CATEGORIZATION)).toBe(false);
      expect(ContentStatusUtils.isTerminal(ContentStatus.ENGAGING)).toBe(false);
    });
  });

  describe('ContentStatusUtils.canCategorize', () => {
    it('should return true only for PENDING_CATEGORIZATION', () => {
      expect(ContentStatusUtils.canCategorize(ContentStatus.PENDING_CATEGORIZATION)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(ContentStatusUtils.canCategorize(ContentStatus.PENDING_RANKING)).toBe(false);
      expect(ContentStatusUtils.canCategorize(ContentStatus.ENGAGED)).toBe(false);
    });
  });

  describe('ContentStatusUtils.canRank', () => {
    it('should return true only for PENDING_RANKING', () => {
      expect(ContentStatusUtils.canRank(ContentStatus.PENDING_RANKING)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(ContentStatusUtils.canRank(ContentStatus.PENDING_CATEGORIZATION)).toBe(false);
      expect(ContentStatusUtils.canRank(ContentStatus.ENGAGED)).toBe(false);
    });
  });

  describe('ContentStatusUtils.canDetermineAction', () => {
    it('should return true only for PENDING_ACTION', () => {
      expect(ContentStatusUtils.canDetermineAction(ContentStatus.PENDING_ACTION)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(ContentStatusUtils.canDetermineAction(ContentStatus.PENDING_RANKING)).toBe(false);
      expect(ContentStatusUtils.canDetermineAction(ContentStatus.ENGAGING)).toBe(false);
    });
  });

  describe('ContentStatusUtils.canEngage', () => {
    it('should return true only for QUEUED_FOR_ENGAGEMENT', () => {
      expect(ContentStatusUtils.canEngage(ContentStatus.QUEUED_FOR_ENGAGEMENT)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(ContentStatusUtils.canEngage(ContentStatus.PENDING_ACTION)).toBe(false);
      expect(ContentStatusUtils.canEngage(ContentStatus.ENGAGING)).toBe(false);
    });
  });

  describe('ContentStatusUtils.getNextStatus', () => {
    it('should return correct next status in pipeline', () => {
      expect(ContentStatusUtils.getNextStatus(ContentStatus.PENDING_CATEGORIZATION)).toBe(
        ContentStatus.PENDING_RANKING
      );

      expect(ContentStatusUtils.getNextStatus(ContentStatus.PENDING_RANKING)).toBe(
        ContentStatus.PENDING_ACTION
      );

      expect(ContentStatusUtils.getNextStatus(ContentStatus.PENDING_ACTION)).toBe(
        ContentStatus.QUEUED_FOR_ENGAGEMENT
      );

      expect(ContentStatusUtils.getNextStatus(ContentStatus.QUEUED_FOR_ENGAGEMENT)).toBe(
        ContentStatus.ENGAGING
      );

      expect(ContentStatusUtils.getNextStatus(ContentStatus.ENGAGING)).toBe(ContentStatus.ENGAGED);
    });

    it('should return null for terminal statuses', () => {
      expect(ContentStatusUtils.getNextStatus(ContentStatus.ENGAGED)).toBeNull();
      expect(ContentStatusUtils.getNextStatus(ContentStatus.SKIPPED)).toBeNull();
      expect(ContentStatusUtils.getNextStatus(ContentStatus.ERROR)).toBeNull();
      expect(ContentStatusUtils.getNextStatus(ContentStatus.ARCHIVED)).toBeNull();
    });

    it('should trace full pipeline', () => {
      let current: ContentStatus | null = ContentStatus.PENDING_CATEGORIZATION;
      const pipeline: ContentStatus[] = [current];

      while (current !== null) {
        const next = ContentStatusUtils.getNextStatus(current);
        if (next === null) break;
        pipeline.push(next);
        current = next;
      }

      expect(pipeline).toEqual([
        ContentStatus.PENDING_CATEGORIZATION,
        ContentStatus.PENDING_RANKING,
        ContentStatus.PENDING_ACTION,
        ContentStatus.QUEUED_FOR_ENGAGEMENT,
        ContentStatus.ENGAGING,
        ContentStatus.ENGAGED,
      ]);
    });
  });

  describe('ContentStatusUtils.toDisplayName', () => {
    it('should return human-readable names', () => {
      expect(ContentStatusUtils.toDisplayName(ContentStatus.PENDING_CATEGORIZATION)).toBe(
        'Pending Categorization'
      );

      expect(ContentStatusUtils.toDisplayName(ContentStatus.PENDING_RANKING)).toBe(
        'Pending Ranking'
      );

      expect(ContentStatusUtils.toDisplayName(ContentStatus.PENDING_ACTION)).toBe('Pending Action');

      expect(ContentStatusUtils.toDisplayName(ContentStatus.QUEUED_FOR_ENGAGEMENT)).toBe(
        'Queued for Engagement'
      );

      expect(ContentStatusUtils.toDisplayName(ContentStatus.ENGAGING)).toBe('Engaging');

      expect(ContentStatusUtils.toDisplayName(ContentStatus.ENGAGED)).toBe('Engaged');

      expect(ContentStatusUtils.toDisplayName(ContentStatus.SKIPPED)).toBe('Skipped');

      expect(ContentStatusUtils.toDisplayName(ContentStatus.ERROR)).toBe('Error');

      expect(ContentStatusUtils.toDisplayName(ContentStatus.ARCHIVED)).toBe('Archived');
    });

    it('should capitalize display names', () => {
      const all = ContentStatusUtils.all();

      all.forEach((status) => {
        const displayName = ContentStatusUtils.toDisplayName(status);
        expect(displayName[0]).toBe(displayName[0].toUpperCase());
      });
    });
  });

  describe('ContentStatus enum values', () => {
    it('should have expected enum values', () => {
      expect(ContentStatus.PENDING_CATEGORIZATION).toBe('pending_categorization');
      expect(ContentStatus.PENDING_RANKING).toBe('pending_ranking');
      expect(ContentStatus.PENDING_ACTION).toBe('pending_action');
      expect(ContentStatus.QUEUED_FOR_ENGAGEMENT).toBe('queued_for_engagement');
      expect(ContentStatus.ENGAGING).toBe('engaging');
      expect(ContentStatus.ENGAGED).toBe('engaged');
      expect(ContentStatus.SKIPPED).toBe('skipped');
      expect(ContentStatus.ERROR).toBe('error');
      expect(ContentStatus.ARCHIVED).toBe('archived');
    });
  });
});
