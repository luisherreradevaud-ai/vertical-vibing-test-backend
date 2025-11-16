import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from './auth.types';
import { validateBody } from './auth.validator';
import { ApiResponse } from '../../shared/utils/response';

/**
 * Create Auth Router
 *
 * Factory function that creates and configures the authentication routes
 */
export function createAuthRouter(): Router {
  const router = Router();
  const service = new AuthService();

  /**
   * POST /api/auth/register
   *
   * Register a new user account
   *
   * @body RegisterDTO
   * @returns {status: 'success', data: {user: PublicUser, token: string}}
   */
  router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
    try {
      const result = await service.register(req.body);

      return ApiResponse.created(res, result);
    } catch (error) {
      console.error('Registration error:', error);

      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Email already registered') {
          return ApiResponse.conflict(res, error.message);
        }
      }

      return ApiResponse.error(res, 'Registration failed', 500, 'ERR_INTERNAL_001');
    }
  });

  /**
   * POST /api/auth/login
   *
   * Login with email and password
   *
   * @body LoginDTO
   * @returns {status: 'success', data: {user: PublicUser, token: string}}
   */
  router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
    try {
      const result = await service.login(req.body);

      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Login error:', error);

      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'Invalid credentials') {
          return ApiResponse.unauthorized(res, error.message);
        }
      }

      return ApiResponse.error(res, 'Login failed', 500, 'ERR_INTERNAL_001');
    }
  });

  return router;
}
