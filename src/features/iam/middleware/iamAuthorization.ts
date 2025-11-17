/**
 * IAM Authorization Middleware
 *
 * Checks if users have permission to perform IAM management actions
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/utils/response';
import { permissionsService } from '../permissions.service';

/**
 * Require permission to manage user levels
 */
export async function requireUserLevelManagement(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.userId;
    const companyId = req.tenantId || '';

    const canManage = await permissionsService.canPerformAction(
      userId,
      'feature_iam_user_levels',
      'Update',
      companyId
    );

    if (!canManage) {
      return ApiResponse.forbidden(res, 'You do not have permission to manage user levels');
    }

    next();
  } catch (error) {
    console.error('User level authorization error:', error);
    return ApiResponse.error(res, 'Authorization check failed', 500);
  }
}

/**
 * Require permission to manage permissions
 */
export async function requirePermissionManagement(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.userId;
    const companyId = req.tenantId || '';

    const canManage = await permissionsService.canPerformAction(
      userId,
      'feature_iam_permissions',
      'Update',
      companyId
    );

    if (!canManage) {
      return ApiResponse.forbidden(res, 'You do not have permission to manage permissions');
    }

    next();
  } catch (error) {
    console.error('Permission authorization error:', error);
    return ApiResponse.error(res, 'Authorization check failed', 500);
  }
}

/**
 * Require permission to manage user assignments
 */
export async function requireUserAssignment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.userId;
    const companyId = req.tenantId || '';

    const canManage = await permissionsService.canPerformAction(
      userId,
      'feature_iam_user_levels',
      'Update',
      companyId
    );

    if (!canManage) {
      return ApiResponse.forbidden(res, 'You do not have permission to assign user levels');
    }

    next();
  } catch (error) {
    console.error('User assignment authorization error:', error);
    return ApiResponse.error(res, 'Authorization check failed', 500);
  }
}

/**
 * Require permission to view IAM data (Read access)
 */
export async function requireIAMRead(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.userId;
    const companyId = req.tenantId || '';

    // Check if user can read either user levels or permissions
    const [canReadLevels, canReadPerms] = await Promise.all([
      permissionsService.canPerformAction(
        userId,
        'feature_iam_user_levels',
        'Read',
        companyId
      ),
      permissionsService.canPerformAction(
        userId,
        'feature_iam_permissions',
        'Read',
        companyId
      ),
    ]);

    if (!canReadLevels && !canReadPerms) {
      return ApiResponse.forbidden(res, 'You do not have permission to view IAM data');
    }

    next();
  } catch (error) {
    console.error('IAM read authorization error:', error);
    return ApiResponse.error(res, 'Authorization check failed', 500);
  }
}
