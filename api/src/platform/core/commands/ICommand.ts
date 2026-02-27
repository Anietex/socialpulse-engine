import { Result } from '../types';

/**
 * Command execution context
 * Provides access to services and dependencies
 */
export interface CommandContext {
  /**
   * User ID executing the command (for authorization)
   */
  userId?: string;

  /**
   * Correlation ID for tracking (useful for logging)
   */
  correlationId?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Command execution result
 */
export interface CommandResult<T = any> {
  /**
   * Whether command executed successfully
   */
  success: boolean;

  /**
   * Result data (if successful)
   */
  data?: T;

  /**
   * Error information (if failed)
   */
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  /**
   * Execution metadata
   */
  metadata?: {
    executionTimeMs?: number;
    timestamp?: Date;
    [key: string]: any;
  };
}

/**
 * Base command interface
 * Follows Command Pattern - encapsulates operations as objects
 *
 * Benefits:
 * - Operations can be queued, logged, and tracked
 * - Easy to implement undo/redo
 * - Decouples invoker from executor
 * - Commands can be serialized and sent over network
 */
export interface ICommand<TInput = any, TOutput = any> {
  /**
   * Unique command name/type
   * Used for routing and logging
   */
  readonly name: string;

  /**
   * Execute the command
   * @param input Command input parameters
   * @param context Execution context
   * @returns Result with output or error
   */
  execute(input: TInput, context?: CommandContext): Promise<CommandResult<TOutput>>;

  /**
   * Validate command input before execution
   * @param input Input to validate
   * @returns Result indicating if input is valid
   */
  validate(input: TInput): Result<true, string>;

  /**
   * Optional: Undo the command (if applicable)
   * Not all commands can be undone
   */
  undo?(context?: CommandContext): Promise<CommandResult<void>>;
}

/**
 * Abstract base class for commands
 * Provides common functionality and error handling
 */
export abstract class BaseCommand<TInput = any, TOutput = any>
  implements ICommand<TInput, TOutput>
{
  abstract readonly name: string;

  /**
   * Execute with built-in timing and error handling
   */
  async execute(input: TInput, context?: CommandContext): Promise<CommandResult<TOutput>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validationResult = this.validate(input);
      if (!validationResult.success) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationResult.error,
          },
          metadata: {
            executionTimeMs: Date.now() - startTime,
            timestamp: new Date(),
          },
        };
      }

      // Execute command logic
      const data = await this.executeImpl(input, context);

      return {
        success: true,
        data,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'COMMAND_EXECUTION_ERROR',
          message: error.message,
          details: error,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Implement command-specific logic here
   */
  protected abstract executeImpl(input: TInput, context?: CommandContext): Promise<TOutput>;

  /**
   * Implement command-specific validation here
   */
  abstract validate(input: TInput): Result<true, string>;
}
