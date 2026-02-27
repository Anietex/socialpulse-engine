import { IActionStrategy } from './IActionStrategy';

/**
 * Action execution result
 */
export interface ActionResult {
  success: boolean;
  actionType: string;
  contentId: string;
  executedAt: Date;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for executing platform-specific actions
 * Coordinates between strategies and the platform
 */
export interface IActionExecutor {
  /**
   * Get all supported action strategies for this platform
   * @returns Array of available action strategies
   */
  getSupportedActions(): IActionStrategy[];

  /**
   * Execute a specific action on content
   * @param actionType The type of action to execute
   * @param contentId Platform-specific content identifier
   * @param data Optional data needed for the action (e.g., comment text)
   * @returns Result of the action execution
   * @throws ActionExecutionError if action fails
   */
  executeAction(actionType: string, contentId: string, data?: any): Promise<ActionResult>;

  /**
   * Check if a specific action is supported
   * @param actionType The action type to check
   * @returns true if action is supported
   */
  supportsAction(actionType: string): boolean;

  /**
   * Get the platform this executor targets
   */
  readonly platformId: string;
}
