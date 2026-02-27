/**
 * Credentials interface for authentication
 * Platform-specific implementations can extend this
 */
export interface ICredentials {
  [key: string]: any;
}

/**
 * Session information after authentication
 */
export interface SessionInfo {
  userId: string;
  username: string;
  expiresAt?: Date;
  platformData?: Record<string, any>;
}

/**
 * Interface for platform authentication
 * Handles login, session management, and auth verification
 */
export interface IAuthenticator {
  /**
   * Authenticate with the platform
   * @param credentials Platform-specific credentials
   * @throws AuthenticationError if authentication fails
   */
  authenticate(credentials: ICredentials): Promise<void>;

  /**
   * Check if currently authenticated
   * @returns true if session is valid
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Logout from the platform
   */
  logout(): Promise<void>;

  /**
   * Get current session info
   */
  getSessionInfo(): Promise<SessionInfo | null>;
}
