/**
 * Content lifecycle status
 * Tracks content as it moves through the automation pipeline
 */
export enum ContentStatus {
  /**
   * Content has been cleaned and is awaiting OCR processing
   */
  PENDING_OCR = 'pending_ocr',

  /**
   * Content has completed OCR and is awaiting image captioning
   */
  PENDING_IMAGE_CAPTIONING = 'pending_image_captioning',

  /**
   * Content has been scraped but not yet categorized
   */
  PENDING_CATEGORIZATION = 'pending_categorization',

  /**
   * Content has been categorized and is awaiting ranking
   */
  PENDING_RANKING = 'pending_ranking',

  /**
   * Content has been ranked and is ready for action determination
   */
  PENDING_ACTION = 'pending_action',

  /**
   * Content has been selected for engagement and is queued
   */
  QUEUED_FOR_ENGAGEMENT = 'queued_for_engagement',

  /**
   * Action is currently being executed on this content
   */
  ENGAGING = 'engaging',

  /**
   * Action was successfully executed
   */
  ENGAGED = 'engaged',

  /**
   * Content was processed but no action was taken
   */
  SKIPPED = 'skipped',

  /**
   * An error occurred during processing
   */
  ERROR = 'error',

  /**
   * Content was archived (old or no longer relevant)
   */
  ARCHIVED = 'archived',
}

/**
 * Content status utility functions
 */
export class ContentStatusUtils {
  /**
   * Check if status is valid
   */
  static isValid(status: string): status is ContentStatus {
    return Object.values(ContentStatus).includes(status as ContentStatus);
  }

  /**
   * Parse string to ContentStatus
   * @throws Error if invalid status
   */
  static fromString(status: string): ContentStatus {
    const normalized = status.toLowerCase();
    if (!this.isValid(normalized)) {
      throw new Error(
        `Invalid content status: ${status}. Valid statuses: ${Object.values(ContentStatus).join(
          ', '
        )}`
      );
    }
    return normalized as ContentStatus;
  }

  /**
   * Get all statuses
   */
  static all(): ContentStatus[] {
    return Object.values(ContentStatus);
  }

  /**
   * Check if status is a pending state
   */
  static isPending(status: ContentStatus): boolean {
    return [
      ContentStatus.PENDING_OCR,
      ContentStatus.PENDING_IMAGE_CAPTIONING,
      ContentStatus.PENDING_CATEGORIZATION,
      ContentStatus.PENDING_RANKING,
      ContentStatus.PENDING_ACTION,
    ].includes(status);
  }

  /**
   * Check if status is an active/processing state
   */
  static isActive(status: ContentStatus): boolean {
    return [ContentStatus.QUEUED_FOR_ENGAGEMENT, ContentStatus.ENGAGING].includes(status);
  }

  /**
   * Check if status is a terminal state (no more processing)
   */
  static isTerminal(status: ContentStatus): boolean {
    return [
      ContentStatus.ENGAGED,
      ContentStatus.SKIPPED,
      ContentStatus.ERROR,
      ContentStatus.ARCHIVED,
    ].includes(status);
  }

  /**
   * Check if content can have OCR performed
   */
  static canPerformOCR(status: ContentStatus): boolean {
    return status === ContentStatus.PENDING_OCR;
  }

  /**
   * Check if content can have image captioning performed
   */
  static canPerformImageCaptioning(status: ContentStatus): boolean {
    return status === ContentStatus.PENDING_IMAGE_CAPTIONING;
  }

  /**
   * Check if content can be categorized
   */
  static canCategorize(status: ContentStatus): boolean {
    return status === ContentStatus.PENDING_CATEGORIZATION;
  }

  /**
   * Check if content can be ranked
   */
  static canRank(status: ContentStatus): boolean {
    return status === ContentStatus.PENDING_RANKING;
  }

  /**
   * Check if content can have actions determined
   */
  static canDetermineAction(status: ContentStatus): boolean {
    return status === ContentStatus.PENDING_ACTION;
  }

  /**
   * Check if content can be engaged with
   */
  static canEngage(status: ContentStatus): boolean {
    return status === ContentStatus.QUEUED_FOR_ENGAGEMENT;
  }

  /**
   * Get the next status in the pipeline
   */
  static getNextStatus(current: ContentStatus): ContentStatus | null {
    const pipeline: Record<ContentStatus, ContentStatus | null> = {
      [ContentStatus.PENDING_OCR]: ContentStatus.PENDING_IMAGE_CAPTIONING,
      [ContentStatus.PENDING_IMAGE_CAPTIONING]: ContentStatus.PENDING_CATEGORIZATION,
      [ContentStatus.PENDING_CATEGORIZATION]: ContentStatus.PENDING_RANKING,
      [ContentStatus.PENDING_RANKING]: ContentStatus.PENDING_ACTION,
      [ContentStatus.PENDING_ACTION]: ContentStatus.QUEUED_FOR_ENGAGEMENT,
      [ContentStatus.QUEUED_FOR_ENGAGEMENT]: ContentStatus.ENGAGING,
      [ContentStatus.ENGAGING]: ContentStatus.ENGAGED,
      [ContentStatus.ENGAGED]: null,
      [ContentStatus.SKIPPED]: null,
      [ContentStatus.ERROR]: null,
      [ContentStatus.ARCHIVED]: null,
    };
    return pipeline[current];
  }

  /**
   * Get human-readable status name
   */
  static toDisplayName(status: ContentStatus): string {
    const displayNames: Record<ContentStatus, string> = {
      [ContentStatus.PENDING_OCR]: 'Pending OCR',
      [ContentStatus.PENDING_IMAGE_CAPTIONING]: 'Pending Image Captioning',
      [ContentStatus.PENDING_CATEGORIZATION]: 'Pending Categorization',
      [ContentStatus.PENDING_RANKING]: 'Pending Ranking',
      [ContentStatus.PENDING_ACTION]: 'Pending Action',
      [ContentStatus.QUEUED_FOR_ENGAGEMENT]: 'Queued for Engagement',
      [ContentStatus.ENGAGING]: 'Engaging',
      [ContentStatus.ENGAGED]: 'Engaged',
      [ContentStatus.SKIPPED]: 'Skipped',
      [ContentStatus.ERROR]: 'Error',
      [ContentStatus.ARCHIVED]: 'Archived',
    };
    return displayNames[status];
  }
}
