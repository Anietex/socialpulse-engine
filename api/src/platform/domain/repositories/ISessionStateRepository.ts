/**
 * SessionState Repository Interface
 */

import { SessionState } from '../entities/SessionState';

export interface ISessionStateRepository {
  /**
   * Save session state
   */
  save(sessionState: SessionState): Promise<SessionState>;

  /**
   * Find session state by user ID
   */
  findByUserId(userId: string): Promise<SessionState | null>;

  /**
   * Delete session state
   */
  delete(id: string): Promise<void>;
}
