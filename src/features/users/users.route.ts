import { Router, type Request, type Response } from 'express';
import { UsersService } from './users.service';
import { UsersRepository } from '../../shared/db/repositories/users.repository';
import { db } from '../../shared/db/client';
import { authenticateJWT } from '../../shared/middleware/auth';
import { ApiResponse } from '../../shared/utils/response';
import { updateProfileSchema, changePasswordSchema } from '@vertical-vibing/shared-types';

/**
 * Create Users Router
 *
 * Factory function to create the users router with all dependencies
 */
export function createUsersRouter(): Router {
  const router = Router();
  const usersRepository = new UsersRepository(db);
  const usersService = new UsersService(usersRepository);

  /**
   * GET /api/users/me
   * Get current user profile
   */
  router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      const user = await usersService.getProfile(userId);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(res, { user });
    } catch (error) {
      console.error('Get profile error:', error);
      return ApiResponse.error(res, 'Failed to get profile', 500, 'ERR_INTERNAL_001');
    }
  });

  /**
   * PATCH /api/users/me
   * Update current user profile
   */
  router.patch('/me', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Validate request body
      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'ERR_VALIDATION_003',
        }));
        return ApiResponse.validationError(res, errors);
      }

      const user = await usersService.updateProfile(userId, validation.data);

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.success(res, { user });
    } catch (error) {
      console.error('Update profile error:', error);

      if (error instanceof Error && error.message === 'Email already in use') {
        return ApiResponse.conflict(res, 'Email already in use');
      }

      return ApiResponse.error(res, 'Failed to update profile', 500, 'ERR_INTERNAL_001');
    }
  });

  /**
   * POST /api/users/me/change-password
   * Change user password
   */
  router.post('/me/change-password', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Validate request body
      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'ERR_VALIDATION_003',
        }));
        return ApiResponse.validationError(res, errors);
      }

      await usersService.changePassword(userId, validation.data);

      return ApiResponse.success(res, { message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);

      if (error instanceof Error && error.message === 'Current password is incorrect') {
        return ApiResponse.error(res, 'Current password is incorrect', 400, 'ERR_AUTH_002');
      }

      if (error instanceof Error && error.message === 'User not found') {
        return ApiResponse.notFound(res, 'User not found');
      }

      return ApiResponse.error(res, 'Failed to change password', 500, 'ERR_INTERNAL_001');
    }
  });

  return router;
}
