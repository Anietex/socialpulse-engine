/**
 * User Entity
 * Domain entity representing a user in the system
 */

import { UserRole } from '../../../shared/constants/roles.js';
import { UserStatus } from '../../../shared/constants/statuses.js';

// Re-export for convenience
export { UserRole, UserStatus };

/**
 * User Settings Value Object
 */
export class UserSettings {
  constructor(
    public readonly automation: {
      enabled: boolean;
      maxEngagementsPerDay: number;
      targetCategories: string[];
    },
    public readonly notifications: {
      email: boolean;
      inApp: boolean;
    }
  ) {}

  static default(): UserSettings {
    return new UserSettings(
      {
        enabled: false,
        maxEngagementsPerDay: 10,
        targetCategories: [],
      },
      {
        email: true,
        inApp: true,
      }
    );
  }

  update(
    updates: Partial<{
      automation: Partial<UserSettings['automation']>;
      notifications: Partial<UserSettings['notifications']>;
    }>
  ): UserSettings {
    return new UserSettings(
      {
        ...this.automation,
        ...updates.automation,
      },
      {
        ...this.notifications,
        ...updates.notifications,
      }
    );
  }

  toPlain() {
    return {
      automation: { ...this.automation },
      notifications: { ...this.notifications },
    };
  }
}

/**
 * User Entity
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly name: string,
    public readonly role: UserRole,
    public readonly status: UserStatus,
    public readonly twitterHandle: string | undefined,
    public readonly settings: UserSettings,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Create User builder
   */
  static builder(): UserBuilder {
    return new UserBuilder();
  }

  /**
   * Check if user is active
   */
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if automation is enabled
   */
  isAutomationEnabled(): boolean {
    return this.settings.automation.enabled;
  }

  /**
   * Update user properties
   */
  update(
    updates: Partial<{ name: string; twitterHandle: string | undefined; status: UserStatus }>
  ): User {
    return new User(
      this.id,
      this.email,
      this.password,
      updates.name !== undefined ? updates.name : this.name,
      this.role,
      updates.status !== undefined ? updates.status : this.status,
      updates.twitterHandle !== undefined ? updates.twitterHandle : this.twitterHandle,
      this.settings,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update user settings
   */
  updateSettings(settings: UserSettings): User {
    return new User(
      this.id,
      this.email,
      this.password,
      this.name,
      this.role,
      this.status,
      this.twitterHandle,
      settings,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Convert to plain object
   */
  toPlain() {
    return {
      id: this.id,
      email: this.email,
      password: this.password,
      name: this.name,
      role: this.role,
      status: this.status,
      twitterHandle: this.twitterHandle,
      settings: this.settings.toPlain(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Convert to public object (without password)
   */
  toPublic() {
    const plain = this.toPlain();
    const { password, ...publicData } = plain;
    return publicData;
  }
}

/**
 * User Builder
 */
class UserBuilder {
  private _id?: string;
  private _email?: string;
  private _password?: string;
  private _name?: string;
  private _role: UserRole = UserRole.USER;
  private _status: UserStatus = UserStatus.ACTIVE;
  private _twitterHandle?: string;
  private _settings: UserSettings = UserSettings.default();
  private _createdAt: Date = new Date();
  private _updatedAt: Date = new Date();

  id(id: string): this {
    this._id = id;
    return this;
  }

  email(email: string): this {
    this._email = email.toLowerCase().trim();
    return this;
  }

  password(password: string): this {
    this._password = password;
    return this;
  }

  name(name: string): this {
    this._name = name.trim();
    return this;
  }

  role(role: UserRole): this {
    this._role = role;
    return this;
  }

  status(status: UserStatus): this {
    this._status = status;
    return this;
  }

  twitterHandle(handle: string | undefined): this {
    this._twitterHandle = handle?.trim();
    return this;
  }

  settings(settings: UserSettings): this {
    this._settings = settings;
    return this;
  }

  createdAt(date: Date): this {
    this._createdAt = date;
    return this;
  }

  updatedAt(date: Date): this {
    this._updatedAt = date;
    return this;
  }

  build(): User {
    if (!this._id) throw new Error('User id is required');
    if (!this._email) throw new Error('User email is required');
    if (!this._password) throw new Error('User password is required');
    if (!this._name) throw new Error('User name is required');

    return new User(
      this._id,
      this._email,
      this._password,
      this._name,
      this._role,
      this._status,
      this._twitterHandle,
      this._settings,
      this._createdAt,
      this._updatedAt
    );
  }
}
