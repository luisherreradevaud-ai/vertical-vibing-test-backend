/**
 * Email Permission Middleware
 *
 * Permission checking middleware for email system routes.
 * Fully integrated with IAM PermissionsService for feature-based authorization.
 *
 * Phase 9: Complete IAM integration
 */

import type { Request, Response, NextFunction } from 'express';
import { EMAIL_PERMISSIONS } from './email.permissions';
import { permissionsService } from '../iam/permissions.service';
import { getIAMFeatureForPermission } from './email-iam-features';
import { logger } from '../../shared/utils/logger';

/**
 * Check if user has email permission using IAM PermissionsService
 *
 * Permission resolution (in order):
 * 1. Super admin: Always allowed
 * 2. IAM feature-based permission check via PermissionsService
 * 3. Fallback to old permission format for backwards compatibility
 */
export function requireEmailPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check authentication first
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          code: 'ERR_AUTH_001',
          message: 'Authentication required',
        });
        return;
      }

      // Super admin bypass: Grant full access
      if (req.user.isSuperAdmin) {
        logger.debug({
          userId: req.user.userId,
          email: req.user.email,
          permission,
        }, 'Super admin bypass for email permission');
        next();
        return;
      }

      // Get company ID for tenant-based permission check
      const companyId = req.tenantId || '';
      if (!companyId) {
        logger.warn({ userId: req.user.userId, permission }, 'No tenant ID found for email permission check');
        res.status(403).json({
          status: 'error',
          code: 'ERR_EMAIL_PERM_003',
          message: 'Tenant context required for this operation',
        });
        return;
      }

      // Convert old permission format to IAM feature + action
      const iamMapping = getIAMFeatureForPermission(permission);

      if (!iamMapping) {
        logger.error({ permission }, 'Unknown email permission requested');
        res.status(500).json({
          status: 'error',
          code: 'ERR_EMAIL_PERM_004',
          message: 'Invalid permission configuration',
        });
        return;
      }

      // Check permission via IAM PermissionsService
      const hasPermission = await permissionsService.canPerformAction(
        req.user.userId,
        iamMapping.featureKey,
        iamMapping.action,
        companyId
      );

      if (!hasPermission) {
        logger.warn({
          userId: req.user.userId,
          email: req.user.email,
          permission,
          featureKey: iamMapping.featureKey,
          action: iamMapping.action,
          companyId,
        }, 'Email permission denied');

        res.status(403).json({
          status: 'error',
          code: 'ERR_EMAIL_PERM_001',
          message: 'Forbidden: You do not have permission to perform this action',
          details: {
            required: permission,
            feature: iamMapping.featureKey,
            action: iamMapping.action,
          },
        });
        return;
      }

      // Permission check successful
      logger.debug({
        userId: req.user.userId,
        permission,
        featureKey: iamMapping.featureKey,
        action: iamMapping.action,
      }, 'Email permission granted');

      next();
    } catch (error) {
      logger.error({ error, permission }, 'Email permission check error');
      res.status(500).json({
        status: 'error',
        code: 'ERR_EMAIL_PERM_002',
        message: 'Internal authorization error',
      });
    }
  };
}

/**
 * Shorthand helpers for common email permissions
 */
export const emailPermissions = {
  /**
   * Send individual emails
   */
  send: () => requireEmailPermission(EMAIL_PERMISSIONS.SEND_EMAIL),

  /**
   * Send bulk emails
   */
  sendBulk: () => requireEmailPermission(EMAIL_PERMISSIONS.SEND_BULK_EMAIL),

  /**
   * Read email templates
   */
  readTemplates: () => requireEmailPermission(EMAIL_PERMISSIONS.READ_TEMPLATES),

  /**
   * Write (create/edit) email templates
   */
  writeTemplates: () => requireEmailPermission(EMAIL_PERMISSIONS.WRITE_TEMPLATES),

  /**
   * Publish email templates
   */
  publishTemplates: () => requireEmailPermission(EMAIL_PERMISSIONS.PUBLISH_TEMPLATES),

  /**
   * Delete email templates
   */
  deleteTemplates: () => requireEmailPermission(EMAIL_PERMISSIONS.DELETE_TEMPLATES),

  /**
   * Read email logs
   */
  readLogs: () => requireEmailPermission(EMAIL_PERMISSIONS.READ_LOGS),

  /**
   * Retry failed emails
   */
  retryLogs: () => requireEmailPermission(EMAIL_PERMISSIONS.RETRY_LOGS),

  /**
   * Delete email logs
   */
  deleteLogs: () => requireEmailPermission(EMAIL_PERMISSIONS.DELETE_LOGS),

  /**
   * Read email configuration
   */
  readConfig: () => requireEmailPermission(EMAIL_PERMISSIONS.READ_CONFIG),

  /**
   * Write email configuration
   */
  writeConfig: () => requireEmailPermission(EMAIL_PERMISSIONS.WRITE_CONFIG),

  /**
   * Delete email configuration
   */
  deleteConfig: () => requireEmailPermission(EMAIL_PERMISSIONS.DELETE_CONFIG),
};

/**
 * Non-middleware permission check utility
 * Useful for inline permission checks in route handlers
 * Uses IAM PermissionsService for authorization
 */
export async function checkEmailPermission(
  req: Request,
  permission: string
): Promise<{ allowed: boolean; reason: string }> {
  if (!req.user) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  // Super admin bypass
  if (req.user.isSuperAdmin) {
    return { allowed: true, reason: 'Super admin access' };
  }

  // Get company ID
  const companyId = req.tenantId || '';
  if (!companyId) {
    return { allowed: false, reason: 'Tenant context required' };
  }

  // Convert permission to IAM feature + action
  const iamMapping = getIAMFeatureForPermission(permission);
  if (!iamMapping) {
    return { allowed: false, reason: 'Invalid permission format' };
  }

  try {
    // Check via IAM PermissionsService
    const hasPermission = await permissionsService.canPerformAction(
      req.user.userId,
      iamMapping.featureKey,
      iamMapping.action,
      companyId
    );

    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Missing permission: ${permission} (${iamMapping.featureKey}:${iamMapping.action})`,
      };
    }

    return { allowed: true, reason: 'Permission granted' };
  } catch (error) {
    logger.error({ error, permission }, 'Error checking email permission');
    return { allowed: false, reason: 'Permission check failed' };
  }
}
