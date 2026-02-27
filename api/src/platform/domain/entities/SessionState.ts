/**
 * SessionState Entity
 * Manages user session cooldown to prevent overlapping scraping sessions
 */

/**
 * SessionState Entity
 * Prevents users from starting multiple scraping sessions simultaneously
 */
export class SessionState {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly canStartSession: boolean,
    public readonly lastSessionAt: Date | undefined,
    public readonly nextSessionAt: Date | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Create a new session state builder
   */
  static builder(): SessionStateBuilder {
    return new SessionStateBuilder();
  }

  /**
   * Convert to plain object
   */
  toPlain() {
    return {
      id: this.id,
      userId: this.userId,
      canStartSession: this.canStartSession,
      lastSessionAt: this.lastSessionAt,
      nextSessionAt: this.nextSessionAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Start session (disable new sessions)
   */
  startSession(nextSessionAt?: Date): SessionState {
    return new SessionState(
      this.id,
      this.userId,
      false,
      new Date(),
      nextSessionAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Reset session (allow new sessions)
   */
  resetSession(): SessionState {
    return new SessionState(
      this.id,
      this.userId,
      true,
      this.lastSessionAt,
      undefined,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Get minutes until next session
   */
  getMinutesUntilNextSession(): number {
    if (this.canStartSession || !this.nextSessionAt) {
      return 0;
    }

    const now = new Date();
    const diff = this.nextSessionAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / 60000));
  }
}

/**
 * SessionState Builder
 */
export class SessionStateBuilder {
  private _id?: string;
  private _userId?: string;
  private _canStartSession: boolean = true;
  private _lastSessionAt?: Date;
  private _nextSessionAt?: Date;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  id(id: string): SessionStateBuilder {
    this._id = id;
    return this;
  }

  userId(userId: string): SessionStateBuilder {
    this._userId = userId;
    return this;
  }

  canStartSession(can: boolean): SessionStateBuilder {
    this._canStartSession = can;
    return this;
  }

  lastSessionAt(date: Date | undefined): SessionStateBuilder {
    this._lastSessionAt = date;
    return this;
  }

  nextSessionAt(date: Date | undefined): SessionStateBuilder {
    this._nextSessionAt = date;
    return this;
  }

  createdAt(date: Date): SessionStateBuilder {
    this._createdAt = date;
    return this;
  }

  updatedAt(date: Date): SessionStateBuilder {
    this._updatedAt = date;
    return this;
  }

  build(): SessionState {
    if (!this._id) throw new Error('SessionState ID is required');
    if (!this._userId) throw new Error('User ID is required');

    return new SessionState(
      this._id,
      this._userId,
      this._canStartSession,
      this._lastSessionAt,
      this._nextSessionAt,
      this._createdAt || new Date(),
      this._updatedAt || new Date()
    );
  }
}
