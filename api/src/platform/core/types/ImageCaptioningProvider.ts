/**
 * Image Captioning Provider Types
 * Types and interfaces for image captioning services
 */

/**
 * Supported image captioning providers
 */
export enum CaptioningProvider {
  BLIP = 'blip', // Local BLIP model via Transformers.js
  GOOGLE_VISION = 'google-vision', // Google Cloud Vision API
  OPENAI_VISION = 'openai-vision', // OpenAI GPT-4 Vision API
  SIMPLE = 'simple', // Simple local placeholder descriptions
  NONE = 'none', // Disabled
}

/**
 * Image caption result
 */
export interface ImageCaptionResult {
  /**
   * Generated caption/description
   */
  caption: string;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Detected labels/tags (optional)
   */
  labels?: string[];

  /**
   * Additional metadata
   */
  metadata?: {
    /**
     * Detected objects
     */
    objects?: Array<{
      name: string;
      confidence: number;
    }>;

    /**
     * Detected colors
     */
    colors?: string[];

    /**
     * Safe search annotations (adult, violence, etc.)
     */
    safeSearch?: {
      adult: string;
      violence: string;
      racy: string;
    };
  };
}

/**
 * Image captioning options
 */
export interface ImageCaptioningOptions {
  /**
   * Language for caption generation
   */
  language?: string;

  /**
   * Maximum caption length
   */
  maxLength?: number;

  /**
   * Whether to include labels/tags
   */
  includeLabels?: boolean;

  /**
   * Whether to include object detection
   */
  includeObjects?: boolean;

  /**
   * Minimum confidence threshold
   */
  minConfidence?: number;
}
