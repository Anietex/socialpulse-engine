export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export enum TweetStatus {
  INGESTED = 'ingested',
  CLEANED = 'cleaned',
  OCR_PROCESSED = 'ocr_processed',
  CATEGORIZED = 'categorized',
  RANKED = 'ranked',
  ENGAGEMENT_DETERMINED = 'engagement_determined',
  AUTOMATED = 'automated',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum JobType {
  CLEANUP = 'cleanup',
  OCR = 'ocr',
  CATEGORIZATION = 'categorization',
  RANKING = 'ranking',
  ENGAGEMENT = 'engagement',
  AUTOMATION = 'automation',
}

export enum AutomationResult {
  SUCCESS = 'success',
  FAILED = 'failed',
}
