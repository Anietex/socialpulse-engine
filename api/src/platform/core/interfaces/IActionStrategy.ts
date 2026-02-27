/**
 * Execution context for actions
 * Provides platform-agnostic access to browser/API resources
 */
export interface ActionContext {
  page?: any; // Playwright Page (for browser-based actions)
  apiClient?: any; // HTTP client (for API-based actions)
  platformData?: Record<string, any>; // Platform-specific context
}

/**
 * Strategy interface for individual platform actions
 * Each action type (like, comment, retweet) implements this
 *
 * Follows Strategy Pattern and Open/Closed Principle
 * - New actions can be added without modifying existing code
 * - Each strategy encapsulates one action's behavior
 */
export interface IActionStrategy {
  /**
   * The action type this strategy handles
   * @example 'like', 'comment', 'retweet', 'quote'
   */
  readonly actionType: string;

  /**
   * Check if this action can be executed in the current context
   * @param context Execution context (page, API client, etc.)
   * @param contentId Platform-specific content identifier
   * @returns true if action can be executed
   */
  canExecute(context: ActionContext, contentId: string): Promise<boolean>;

  /**
   * Execute the action
   * @param context Execution context
   * @param contentId Platform-specific content identifier
   * @param data Optional data for the action (e.g., comment text)
   * @throws ActionExecutionError if execution fails
   */
  execute(context: ActionContext, contentId: string, data?: any): Promise<void>;

  /**
   * Validate that the provided data is correct for this action
   * @param data The data to validate
   * @returns true if data is valid
   * @example For 'comment' action, validates that text is provided
   */
  validateData(data?: any): boolean;
}
