/**
 * OCR Provider Types
 * Supported OCR providers for extracting text from images
 */

/**
 * Supported OCR providers
 */
export enum OCRProvider {
  GOOGLE_VISION = 'google-vision',
  TESSERACT = 'tesseract',
  AWS_REKOGNITION = 'aws-rekognition',
  AZURE_VISION = 'azure-vision',
  NONE = 'none',
}

/**
 * OCR result for a single image
 */
export interface OCRResult {
  text: string;
  confidence: number; // 0-1
  language?: string;
  blocks?: TextBlock[];
}

/**
 * Text block detected in image
 */
export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox?: BoundingBox;
  type?: 'LINE' | 'WORD' | 'PARAGRAPH' | 'PAGE';
}

/**
 * Bounding box coordinates
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * OCR processing options
 */
export interface OCROptions {
  language?: string; // Language hint (e.g., 'en', 'es')
  detectOrientation?: boolean;
  enhanceImage?: boolean;
}
