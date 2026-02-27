import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../shared/utils/errors.js';
import { AuthenticationService } from '../platform/application/services/AuthenticationService.js';
import { MongoUserRepository } from '../platform/infrastructure/persistence/MongoUserRepository.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        name: string;
        role: string;
        status: string;
      };
    }
  }
}

// Initialize authentication service
const userRepository = new MongoUserRepository();
const authService = new AuthenticationService(userRepository);

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = authService.verifyToken(token);

    // Get user from database
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive()) {
      throw new UnauthorizedError('Account is suspended');
    }

    // Attach user to request
    req.user = {
      _id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};
