/**
 * Automation API Controller
 * Exposes AutomationOrchestrator through REST endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { AutomationOrchestrator } from '../../application/services/AutomationOrchestrator';
import { PlatformService } from '../../application/services/PlatformService';
import { ActionType } from '../../core/types/ActionType';
import {
  ExecuteAutomationRequestDto,
  ExecuteMultiPlatformAutomationRequestDto,
  ExecuteActionBatchRequestDto,
  PreviewAutomationRequestDto,
  AutomationBatchResponseDto,
  MultiPlatformAutomationResponseDto,
  AutomationPreviewResponseDto,
} from '../dto';

/**
 * AutomationController class
 */
export class AutomationController {
  constructor(
    private readonly orchestrator: AutomationOrchestrator,
    private readonly platformService: PlatformService
  ) {}

  /**
   * Execute automation for a single platform
   * POST /api/platform/automation/execute
   */
  async executeAutomation(
    req: Request<{}, {}, ExecuteAutomationRequestDto>,
    res: Response<AutomationBatchResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId, limit = 50, actionType } = req.body;

      // Get platform adapter
      const adapter = this.platformService.getPlatform(platformId);

      // Execute automation
      const result = await this.orchestrator.executeAutomation(
        adapter,
        limit,
        actionType as ActionType | undefined
      );

      // Convert to DTO
      const response: AutomationBatchResponseDto = {
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        results: result.results.map((r) => ({
          contentId: r.contentId,
          platformContentId: r.platformContentId,
          action: r.action,
          success: r.success,
          error: r.error,
          executedAt: r.executedAt,
        })),
        errors: result.errors,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute automation across multiple platforms
   * POST /api/platform/automation/execute-multiple
   */
  async executeMultiPlatformAutomation(
    req: Request<{}, {}, ExecuteMultiPlatformAutomationRequestDto>,
    res: Response<MultiPlatformAutomationResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformIds, limitPerPlatform = 50 } = req.body;

      // Get platform adapters
      const adapters = platformIds.map((id) => this.platformService.getPlatform(id));

      // Execute automation
      const resultsMap = await this.orchestrator.executeMultiPlatformAutomation(
        adapters,
        limitPerPlatform
      );

      // Convert Map to object for JSON response
      const results: Record<string, AutomationBatchResponseDto> = {};
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      let totalSkipped = 0;

      for (const [platformId, result] of resultsMap) {
        results[platformId] = {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          skipped: result.skipped,
          results: result.results.map((r) => ({
            contentId: r.contentId,
            platformContentId: r.platformContentId,
            action: r.action,
            success: r.success,
            error: r.error,
            executedAt: r.executedAt,
          })),
          errors: result.errors,
        };

        totalProcessed += result.totalProcessed;
        totalSuccessful += result.successful;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
      }

      const response: MultiPlatformAutomationResponseDto = {
        results,
        summary: {
          totalPlatforms: platformIds.length,
          totalProcessed,
          totalSuccessful,
          totalFailed,
          totalSkipped,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute specific action type batch
   * POST /api/platform/automation/execute-action
   */
  async executeActionBatch(
    req: Request<{}, {}, ExecuteActionBatchRequestDto>,
    res: Response<AutomationBatchResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { platformId, actionType, limit = 20 } = req.body;

      // Get platform adapter
      const adapter = this.platformService.getPlatform(platformId);

      // Execute action batch
      const result = await this.orchestrator.executeActionBatch(
        adapter,
        actionType as ActionType,
        limit
      );

      // Convert to DTO
      const response: AutomationBatchResponseDto = {
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        results: result.results.map((r) => ({
          contentId: r.contentId,
          platformContentId: r.platformContentId,
          action: r.action,
          success: r.success,
          error: r.error,
          executedAt: r.executedAt,
        })),
        errors: result.errors,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview automation (dry run)
   * GET /api/platform/automation/preview
   */
  async previewAutomation(
    req: Request<{}, {}, {}, PreviewAutomationRequestDto>,
    res: Response<AutomationPreviewResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const limitParam = req.query.limit;
      const limit = limitParam ? parseInt(limitParam.toString(), 10) : 50;

      // Preview automation
      const preview = await this.orchestrator.previewAutomation(limit);

      // Convert Map to object
      const byAction: Record<ActionType, number> = {} as Record<ActionType, number>;
      for (const [action, count] of preview.byAction) {
        byAction[action] = count;
      }

      const response: AutomationPreviewResponseDto = {
        totalReady: preview.totalReady,
        byAction,
        content: preview.content.map((c) => ({
          id: c.id.toString(),
          text: c.text.substring(0, 100) + (c.text.length > 100 ? '...' : ''),
          action: c.engagementAction as ActionType,
          platformId: c.platformId.toString(),
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
