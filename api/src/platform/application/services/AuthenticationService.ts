/**
 * Authentication Service
 * Handles user authentication, registration, and JWT token management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserSettings } from '../../domain/entities/User';
import { UserRole } from '../../../shared/constants/roles.js';
import { UserStatus } from '../../../shared/constants/statuses.js';
import { logger } from '../../../config/logger.js';

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Registration data
 */
export interface RegisterUserData {
  email: string;
  password: string;
  name: string;
  twitterHandle?: string;
}

/**
 * Login result
 */
export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication Service
 */
export class AuthenticationService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpiresIn: string | number;
  private readonly jwtRefreshExpiresIn: string | number;
  private readonly saltRounds: number = 10;

  constructor(private readonly userRepository: IUserRepository) {
    // Get JWT secret from environment
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.jwtRefreshSecret =
      process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access token
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Long-lived refresh token

    if (this.jwtSecret === 'default-secret-change-in-production') {
      logger.warn('Using default JWT secret - CHANGE THIS IN PRODUCTION!');
    }
    if (this.jwtRefreshSecret === 'default-refresh-secret-change-in-production') {
      logger.warn('Using default JWT refresh secret - CHANGE THIS IN PRODUCTION!');
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterUserData): Promise<User> {
    try {
      // Check if email already exists
      const emailExists = await this.userRepository.emailExists(data.email);
      if (emailExists) {
        throw new Error('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, this.saltRounds);

      // Create user entity
      const user = User.builder()
        .id(this.generateUserId())
        .email(data.email)
        .password(hashedPassword)
        .name(data.name)
        .role(UserRole.USER)
        .status(UserStatus.ACTIVE)
        .twitterHandle(data.twitterHandle)
        .settings(UserSettings.default())
        .createdAt(new Date())
        .updatedAt(new Date())
        .build();

      // Save to repository
      const savedUser = await this.userRepository.save(user);

      logger.info('User registered successfully', {
        userId: savedUser.id,
        email: savedUser.email,
      });

      return savedUser;
    } catch (error) {
      logger.error('Error registering user', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive()) {
        throw new Error('Account is suspended');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT tokens
      const accessToken = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      return { user, accessToken, refreshToken };
    } catch (error) {
      logger.error('Error during login', { email, error });
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return payload;
    } catch (error) {
      logger.error('Invalid token', { error });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.jwtRefreshSecret) as JWTPayload;
      return payload;
    } catch (error) {
      logger.error('Invalid refresh token', { error });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<LoginResult> {
    try {
      // Verify refresh token
      const payload = this.verifyRefreshToken(refreshToken);

      // Get user from database
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is active
      if (!user.isActive()) {
        throw new Error('Account is suspended');
      }

      // Generate new tokens
      const accessToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      logger.info('Access token refreshed', {
        userId: user.id,
        email: user.email,
      });

      return { user, accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      logger.error('Error refreshing token', { error });
      throw error;
    }
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as jwt.SignOptions);
  }

  /**
   * Generate refresh token for user
   */
  private generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Hash password (utility method for password updates)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
