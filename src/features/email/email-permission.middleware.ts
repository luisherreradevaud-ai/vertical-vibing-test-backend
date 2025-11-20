/**
 * Email Permission Middleware
 *
 * Permission checking middleware for email system routes.
 * Integrates with IAM system while supporting email-specific permissions.
 *
 * For Phase 9, this uses a simplified permission check.
 * Future enhancement: Fully integrate with IAM features/actions system.
 */

import type { Request, Response, NextFunction } from 'express';
import { EMAIL_PERMISSIONS } from './email.permissions';

/**
 * Check if user has email permission
 *
 * Permission resolution:
 * 1. Super admin: Always allowed
 * 2. Check if user has the required permission
 * 3. Future: Integrate with IAM permission resolution service
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
        console.log(`🦸 Super admin bypass: ${req.user.email} accessing email with permission ${permission}`);
        next();
        return;
      }

      // TODO Phase 9+: Integrate with IAM permission resolution
      // For now, check if user has the permission in their token/session
      // This is a simplified check - full IAM integration coming in Phase 9+

      const userPermissions = (req.user as any).permissions || [];

      // Check if user has the required permission or wildcard
      const hasPermission = userPermissions.includes(permission) ||
                          userPermissions.includes('email:*') ||
                          userPermissions.includes('*');

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          code: 'ERR_EMAIL_PERM_001',
          message: 'Forbidden: You do not have permission to perform this action',
          details: {
            required: permission,
          },
        });
        return;
      }

      // Permission check successful
      next();
    } catch (error) {
      console.error('Email permission check error:', error);
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

  // Check user permissions
  const userPermissions = (req.user as any).permissions || [];
  const hasPermission = userPermissions.includes(permission) ||
                       userPermissions.includes('email:*') ||
                       userPermissions.includes('*');

  if (!hasPermission) {
    return { allowed: false, reason: `Missing permission: ${permission}` };
  }

  return { allowed: true, reason: 'Permission granted' };
}
