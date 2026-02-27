/**
 * Session Service
 * Manages user session cooldown to prevent overlapping scraping sessions
 */

import { ISessionStateRepository } from '../../domain/repositories/ISessionStateRepository';
import { SessionState } from '../../domain/entities/SessionState';
import { logger } from '../../../config/logger';
import { nanoid } from 'nanoid';

/**
 * Can start session response
 */
export interface CanStartSessionResponse {
  canStartSession: boolean;
  userId: string;
  lastSessionAt?: Date;
  nextSessionAt?: Date;
  minutesUntilNextSession?: number;
}

/**
 * Session Service
 */
export class SessionService {
  constructor(private readonly sessionStateRepository: ISessionStateRepository) {}

  /**
   * Check if user can start a new scraping session
   */
  async canStartSession(userId: string): Promise<CanStartSessionResponse> {
    let sessionState = await this.sessionStateRepository.findByUserId(userId);

    // Create session state if doesn't exist
    if (!sessionState) {
      const newState = SessionState.builder()
        .id(`session_${Date.now()}_${nanoid(8)}`)
        .userId(userId)
        .canStartSession(true)
        .createdAt(new Date())
        .updatedAt(new Date())
        .build();

      sessionState = await this.sessionStateRepository.save(newState);

      logger.info(`Created new session state for user ${userId}`);
    }

    const response: CanStartSessionResponse = {
      canStartSession: sessionState.canStartSession,
      userId: sessionState.userId,
      lastSessionAt: sessionState.lastSessionAt,
      nextSessionAt: sessionState.nextSessionAt,
    };

    // Calculate minutes until next session if not available
    if (!sessionState.canStartSession && sessionState.nextSessionAt) {
      response.minutesUntilNextSession = sessionState.getMinutesUntilNextSession();
    }

    return response;
  }

  /**
   * Start session - disables new sessions until automation completes
   */
  async startSession(userId: string, nextSessionAt?: Date): Promise<void> {
    let sessionState = await this.sessionStateRepository.findByUserId(userId);

    if (!sessionState) {
      // Create new session state
      sessionState = SessionState.builder()
        .id(`session_${Date.now()}_${nanoid(8)}`)
        .userId(userId)
        .canStartSession(false)
        .lastSessionAt(new Date())
        .nextSessionAt(nextSessionAt)
        .createdAt(new Date())
        .updatedAt(new Date())
        .build();
    } else {
      // Update existing session state
      sessionState = sessionState.startSession(nextSessionAt);
    }

    await this.sessionStateRepository.save(sessionState);

    logger.info(`Session started for user ${userId}. Will reset when automation completes`);
  }

  /**
   * Reset session - allows new sessions to start
   */
  async resetSession(userId: string): Promise<void> {
    const sessionState = await this.sessionStateRepository.findByUserId(userId);

    if (!sessionState) {
      logger.warn(`No session state found for user ${userId}`);
      return;
    }

    // Check if already reset
    if (sessionState.canStartSession) {
      logger.info(`Session for user ${userId} was already reset`);
      return;
    }

    // Reset session
    const updatedState = sessionState.resetSession();
    await this.sessionStateRepository.save(updatedState);

    logger.info(`✅ Session reset for user ${userId}, can start new session now`);
  }
}
