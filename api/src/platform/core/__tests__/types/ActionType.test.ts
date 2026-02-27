import { ActionType, ActionTypeUtils } from '../../types/ActionType';

describe('ActionType', () => {
  describe('ActionTypeUtils.isValid', () => {
    it('should return true for valid action types', () => {
      expect(ActionTypeUtils.isValid('like')).toBe(true);
      expect(ActionTypeUtils.isValid('comment')).toBe(true);
      expect(ActionTypeUtils.isValid('share')).toBe(true);
      expect(ActionTypeUtils.isValid('quote')).toBe(true);
      expect(ActionTypeUtils.isValid('bookmark')).toBe(true);
      expect(ActionTypeUtils.isValid('follow')).toBe(true);
      expect(ActionTypeUtils.isValid('view')).toBe(true);
    });

    it('should return false for invalid action types', () => {
      expect(ActionTypeUtils.isValid('invalid')).toBe(false);
      expect(ActionTypeUtils.isValid('LIKE')).toBe(false); // Case sensitive
      expect(ActionTypeUtils.isValid('')).toBe(false);
      expect(ActionTypeUtils.isValid('delete')).toBe(false);
    });
  });

  describe('ActionTypeUtils.fromString', () => {
    it('should parse valid action type strings', () => {
      expect(ActionTypeUtils.fromString('like')).toBe(ActionType.LIKE);
      expect(ActionTypeUtils.fromString('comment')).toBe(ActionType.COMMENT);
      expect(ActionTypeUtils.fromString('share')).toBe(ActionType.SHARE);
    });

    it('should handle uppercase input', () => {
      expect(ActionTypeUtils.fromString('LIKE')).toBe(ActionType.LIKE);
      expect(ActionTypeUtils.fromString('Comment')).toBe(ActionType.COMMENT);
    });

    it('should throw error for invalid action type', () => {
      expect(() => ActionTypeUtils.fromString('invalid')).toThrow(/Invalid action type: invalid/);
    });

    it('should list valid types in error message', () => {
      try {
        ActionTypeUtils.fromString('invalid');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('like');
        expect(error.message).toContain('comment');
        expect(error.message).toContain('share');
      }
    });
  });

  describe('ActionTypeUtils.all', () => {
    it('should return all action types', () => {
      const all = ActionTypeUtils.all();

      expect(all).toHaveLength(7);
      expect(all).toContain(ActionType.LIKE);
      expect(all).toContain(ActionType.COMMENT);
      expect(all).toContain(ActionType.SHARE);
      expect(all).toContain(ActionType.QUOTE);
      expect(all).toContain(ActionType.BOOKMARK);
      expect(all).toContain(ActionType.FOLLOW);
      expect(all).toContain(ActionType.VIEW);
    });
  });

  describe('ActionTypeUtils.engagementActions', () => {
    it('should return only engagement action types', () => {
      const engagement = ActionTypeUtils.engagementActions();

      expect(engagement).toContain(ActionType.LIKE);
      expect(engagement).toContain(ActionType.COMMENT);
      expect(engagement).toContain(ActionType.SHARE);
      expect(engagement).toContain(ActionType.QUOTE);
    });

    it('should exclude non-engagement actions', () => {
      const engagement = ActionTypeUtils.engagementActions();

      expect(engagement).not.toContain(ActionType.VIEW);
      expect(engagement).not.toContain(ActionType.BOOKMARK);
      expect(engagement).not.toContain(ActionType.FOLLOW);
    });

    it('should have exactly 4 engagement actions', () => {
      const engagement = ActionTypeUtils.engagementActions();

      expect(engagement).toHaveLength(4);
    });
  });

  describe('ActionTypeUtils.requiresData', () => {
    it('should return true for actions that require data', () => {
      expect(ActionTypeUtils.requiresData(ActionType.COMMENT)).toBe(true);
      expect(ActionTypeUtils.requiresData(ActionType.QUOTE)).toBe(true);
    });

    it('should return false for actions that do not require data', () => {
      expect(ActionTypeUtils.requiresData(ActionType.LIKE)).toBe(false);
      expect(ActionTypeUtils.requiresData(ActionType.SHARE)).toBe(false);
      expect(ActionTypeUtils.requiresData(ActionType.BOOKMARK)).toBe(false);
      expect(ActionTypeUtils.requiresData(ActionType.FOLLOW)).toBe(false);
      expect(ActionTypeUtils.requiresData(ActionType.VIEW)).toBe(false);
    });
  });

  describe('ActionTypeUtils.toDisplayName', () => {
    it('should return human-readable names', () => {
      expect(ActionTypeUtils.toDisplayName(ActionType.LIKE)).toBe('Like');
      expect(ActionTypeUtils.toDisplayName(ActionType.COMMENT)).toBe('Comment');
      expect(ActionTypeUtils.toDisplayName(ActionType.SHARE)).toBe('Share');
      expect(ActionTypeUtils.toDisplayName(ActionType.QUOTE)).toBe('Quote');
      expect(ActionTypeUtils.toDisplayName(ActionType.BOOKMARK)).toBe('Bookmark');
      expect(ActionTypeUtils.toDisplayName(ActionType.FOLLOW)).toBe('Follow');
      expect(ActionTypeUtils.toDisplayName(ActionType.VIEW)).toBe('View');
    });

    it('should capitalize display names', () => {
      const all = ActionTypeUtils.all();

      all.forEach((actionType) => {
        const displayName = ActionTypeUtils.toDisplayName(actionType);
        expect(displayName[0]).toBe(displayName[0].toUpperCase());
      });
    });
  });

  describe('ActionType enum values', () => {
    it('should have expected enum values', () => {
      expect(ActionType.LIKE).toBe('like');
      expect(ActionType.COMMENT).toBe('comment');
      expect(ActionType.SHARE).toBe('share');
      expect(ActionType.QUOTE).toBe('quote');
      expect(ActionType.BOOKMARK).toBe('bookmark');
      expect(ActionType.FOLLOW).toBe('follow');
      expect(ActionType.VIEW).toBe('view');
    });
  });
});
