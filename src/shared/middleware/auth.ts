import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiResponse } from '../utils/response';
import type { JWTPayload } from '@vertical-vibing/shared-types';

/**
 * Extend Express Request type to include user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authenticate JWT Middleware
 *
 * Verifies JWT token from Authorization header and attaches user data to request
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      ApiResponse.unauthorized(res, 'No token provided');
      return;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      ApiResponse.unauthorized(res, 'Invalid token format. Use: Bearer <token>');
      return;
    }

    const token = parts[1];

    // Verify token
    const payload = verifyToken(token);

    // Attach user data to request
    req.user = payload;

    next();
  } catch (error) {
    console.error('JWT authentication error:', error);

    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        ApiResponse.unauthorized(res, 'Token expired');
        return;
      }
      if (error.message === 'Invalid token') {
        ApiResponse.unauthorized(res, 'Invalid token');
        return;
      }
    }

    ApiResponse.unauthorized(res, 'Authentication failed');
  }
}

/**
 * Optional JWT Authentication Middleware
 *
 * Similar to authenticateJWT but doesn't fail if no token is provided.
 * Useful for endpoints that work with or without authentication.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function optionalAuthenticateJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without user
      next();
      return;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without user
      next();
      return;
    }

    const token = parts[1];

    // Verify token
    const payload = verifyToken(token);

    // Attach user data to request
    req.user = payload;

    next();
  } catch (error) {
    // Token verification failed, continue without user
    console.error('Optional JWT authentication error:', error);
    next();
  }
}
