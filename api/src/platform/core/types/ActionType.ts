/**
 * Supported action types across platforms
 * Not all platforms support all actions
 */
export enum ActionType {
  /**
   * Like/favorite/upvote content
   * Supported: Twitter, LinkedIn, Reddit, Instagram
   */
  LIKE = 'like',

  /**
   * Comment/reply on content
   * Supported: Twitter, LinkedIn, Reddit, Instagram
   */
  COMMENT = 'comment',

  /**
   * Share/retweet content
   * Supported: Twitter, LinkedIn, Reddit
   */
  SHARE = 'share',

  /**
   * Quote tweet/quote post with added commentary
   * Supported: Twitter
   */
  QUOTE = 'quote',

  /**
   * Bookmark/save content for later
   * Supported: Twitter, LinkedIn, Instagram
   */
  BOOKMARK = 'bookmark',

  /**
   * Follow the content author
   * Supported: Twitter, LinkedIn, Instagram
   */
  FOLLOW = 'follow',

  /**
   * View/read content (tracking only, no interaction)
   * Supported: All platforms
   */
  VIEW = 'view',
}

/**
 * Action type utility functions
 */
export class ActionTypeUtils {
  /**
   * Check if action type is valid
   */
  static isValid(actionType: string): actionType is ActionType {
    return Object.values(ActionType).includes(actionType as ActionType);
  }

  /**
   * Parse string to ActionType
   * @throws Error if invalid action type
   */
  static fromString(actionType: string): ActionType {
    const normalized = actionType.toLowerCase();
    if (!this.isValid(normalized)) {
      throw new Error(
        `Invalid action type: ${actionType}. Valid types: ${Object.values(ActionType).join(', ')}`
      );
    }
    return normalized as ActionType;
  }

  /**
   * Get all action types
   */
  static all(): ActionType[] {
    return Object.values(ActionType);
  }

  /**
   * Get engagement action types (excludes view, bookmark, follow)
   */
  static engagementActions(): ActionType[] {
    return [ActionType.LIKE, ActionType.COMMENT, ActionType.SHARE, ActionType.QUOTE];
  }

  /**
   * Get action types that require additional data
   * (e.g., comment needs text, quote needs text)
   */
  static requiresData(actionType: ActionType): boolean {
    return [ActionType.COMMENT, ActionType.QUOTE].includes(actionType);
  }

  /**
   * Get human-readable action name
   */
  static toDisplayName(actionType: ActionType): string {
    const displayNames: Record<ActionType, string> = {
      [ActionType.LIKE]: 'Like',
      [ActionType.COMMENT]: 'Comment',
      [ActionType.SHARE]: 'Share',
      [ActionType.QUOTE]: 'Quote',
      [ActionType.BOOKMARK]: 'Bookmark',
      [ActionType.FOLLOW]: 'Follow',
      [ActionType.VIEW]: 'View',
    };
    return displayNames[actionType];
  }
}
