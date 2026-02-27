/**
 * Data Transfer Objects for Automation API
 */

import { ActionType } from '../../core/types/ActionType';

/**
 * Request DTO for executing automation
 */
export interface ExecuteAutomationRequestDto {
  platformId: string;
  limit?: number;
  actionType?: ActionType;
}

/**
 * Request DTO for executing automation across multiple platforms
 */
export interface ExecuteMultiPlatformAutomationRequestDto {
  platformIds: string[];
  limitPerPlatform?: number;
}

/**
 * Request DTO for executing specific action batch
 */
export interface ExecuteActionBatchRequestDto {
  platformId: string;
  actionType: ActionType;
  limit?: number;
}

/**
 * Request DTO for previewing automation
 */
export interface PreviewAutomationRequestDto {
  limit?: number;
}

/**
 * Response DTO for single automation result
 */
export interface AutomationResultDto {
  contentId: string;
  platformContentId: string;
  action: ActionType;
  success: boolean;
  error?: string;
  executedAt: Date;
}

/**
 * Response DTO for automation batch execution
 */
export interface AutomationBatchResponseDto {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  results: AutomationResultDto[];
  errors: string[];
}

/**
 * Response DTO for multi-platform automation
 */
export interface MultiPlatformAutomationResponseDto {
  results: Record<string, AutomationBatchResponseDto>;
  summary: {
    totalPlatforms: number;
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    totalSkipped: number;
  };
}

/**
 * Response DTO for automation preview
 */
export interface AutomationPreviewResponseDto {
  totalReady: number;
  byAction: Record<ActionType, number>;
  content: Array<{
    id: string;
    text: string;
    action: ActionType;
    platformId: string;
  }>;
}
