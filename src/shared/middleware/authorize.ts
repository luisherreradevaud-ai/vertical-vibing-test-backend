/**
 * Authorization Middleware
 *
 * Provides middleware functions to protect routes based on IAM permissions
 * Uses the PermissionsService to resolve effective permissions
 */

import type { Request, Response, NextFunction } from 'express';
import { permissionsService } from '../../features/iam/permissions.service';

/**
 * Authorization options
 */
interface AuthorizeOptions {
  view?: string; // View ID to check access for
  feature?: string; // Feature ID to check permission for
  action?: string; // Action to check (only with feature)
}

// Note: Express Request.user type is defined in auth.ts middleware

/**
 * Main authorization middleware factory
 *
 * Usage:
 * - authorize({ view: 'view_dashboard' })
 * - authorize({ feature: 'feature_create', action: 'Create' })
 * - authorize({ view: 'view_users', feature: 'feature_user_manage', action: 'Update' })
 */
export function authorize(options: AuthorizeOptions) {
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
        console.log(`🦸 Super admin bypass: ${req.user.email} accessing ${req.path}`);
        next();
        return;
      }

      const { userId } = req.user;
      const companyId = req.tenantId || getCompanyIdFromRequest(req);

      if (!companyId) {
        res.status(400).json({
          status: 'error',
          code: 'ERR_AUTH_002',
          message: 'Company context required',
        });
        return;
      }

      // Check view access
      if (options.view) {
        const canAccess = await permissionsService.canAccessView(userId, options.view, companyId);

        if (!canAccess) {
          res.status(403).json({
            status: 'error',
            code: 'ERR_AUTH_003',
            message: 'Forbidden: You do not have access to this view',
            details: {
              viewId: options.view,
            },
          });
          return;
        }
      }

      // Check feature permission
      if (options.feature && options.action) {
        const canPerform = await permissionsService.canPerformAction(
          userId,
          options.feature,
          options.action,
          companyId
        );

        if (!canPerform) {
          res.status(403).json({
            status: 'error',
            code: 'ERR_AUTH_004',
            message: `Forbidden: You cannot perform '${options.action}' on this feature`,
            details: {
              featureId: options.feature,
              action: options.action,
            },
          });
          return;
        }
      }

      // Authorization successful
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        status: 'error',
        code: 'ERR_AUTH_005',
        message: 'Internal authorization error',
      });
    }
  };
}

/**
 * Shorthand: Authorize view access only
 *
 * Usage: authorizeView('view_dashboard')
 */
export function authorizeView(viewId: string) {
  return authorize({ view: viewId });
}

/**
 * Shorthand: Authorize feature action
 *
 * Usage: authorizeFeature('feature_user_manage', 'Update')
 */
export function authorizeFeature(featureId: string, action: string) {
  return authorize({ feature: featureId, action });
}

/**
 * Check if user can perform action on own resources
 * Useful for routes like /users/:id where users can only update their own profile
 */
export function authorizeOwn(featureId: string, action: string, resourceUserIdParam = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
        console.log(`🦸 Super admin bypass: ${req.user.email} accessing own resource`);
        next();
        return;
      }

      const { userId } = req.user;
      const resourceUserId = req.params[resourceUserIdParam];

      // Check if accessing own resource
      if (resourceUserId !== userId) {
        res.status(403).json({
          status: 'error',
          code: 'ERR_AUTH_006',
          message: 'Forbidden: You can only access your own resources',
        });
        return;
      }

      const companyId = req.tenantId || getCompanyIdFromRequest(req);

      if (!companyId) {
        res.status(400).json({
          status: 'error',
          code: 'ERR_AUTH_002',
          message: 'Company context required',
        });
        return;
      }

      // Check if user has permission with at least 'own' scope
      const resolution = await permissionsService.resolveFeaturePermission(
        userId,
        featureId,
        action,
        companyId
      );

      if (!resolution.allowed) {
        res.status(403).json({
          status: 'error',
          code: 'ERR_AUTH_004',
          message: `Forbidden: You cannot perform '${action}' on this feature`,
          details: {
            featureId,
            action,
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        status: 'error',
        code: 'ERR_AUTH_005',
        message: 'Internal authorization error',
      });
    }
  };
}

/**
 * Check if user's company has access to a specific module
 *
 * Usage: requireModule('module_risks')
 */
export function requireModule(moduleCode: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          code: 'ERR_AUTH_001',
          message: 'Authentication required',
        });
        return;
      }

      // Super admin bypass: Grant access to all modules
      if (req.user.isSuperAdmin) {
        console.log(`🦸 Super admin bypass: ${req.user.email} accessing module ${moduleCode}`);
        next();
        return;
      }

      const companyId = req.tenantId || getCompanyIdFromRequest(req);

      if (!companyId) {
        res.status(400).json({
          status: 'error',
          code: 'ERR_AUTH_002',
          message: 'Company context required',
        });
        return;
      }

      // Get module by code
      const { iam } = await import('../../shared/db/client').then((m) => m.db);
      const module = await iam.modules.findByCode(moduleCode);

      if (!module) {
        res.status(404).json({
          status: 'error',
          code: 'ERR_MODULE_001',
          message: 'Module not found',
        });
        return;
      }

      // Check if company has this module
      const companyModules = await iam.company2Modules.getModulesByCompany(companyId);
      const hasModule = companyModules.some((m) => m.id === module.id);

      if (!hasModule) {
        res.status(403).json({
          status: 'error',
          code: 'ERR_MODULE_002',
          message: 'Your company does not have access to this module',
          details: {
            moduleCode,
            moduleName: module.name,
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Module authorization error:', error);
      res.status(500).json({
        status: 'error',
        code: 'ERR_AUTH_005',
        message: 'Internal authorization error',
      });
    }
  };
}

/**
 * Superadmin-only middleware
 * Checks if user has super admin privileges
 */
export function requireSuperadmin() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          code: 'ERR_AUTH_001',
          message: 'Authentication required',
        });
        return;
      }

      // Check super admin flag from JWT
      if (!req.user.isSuperAdmin) {
        res.status(403).json({
          status: 'error',
          code: 'ERR_AUTH_007',
          message: 'Forbidden: Superadmin access required',
        });
        return;
      }

      console.log(`🦸 Super admin access granted: ${req.user.email}`);
      next();
    } catch (error) {
      console.error('Superadmin authorization error:', error);
      res.status(500).json({
        status: 'error',
        code: 'ERR_AUTH_005',
        message: 'Internal authorization error',
      });
    }
  };
}

/**
 * Helper: Extract company ID from request
 * Tries to get from user context, query params, or body
 */
function getCompanyIdFromRequest(req: Request): string | undefined {
  return (
    (req.query.companyId as string) ||
    (req.body?.companyId as string) ||
    undefined
  );
}

/**
 * Permission check utility (non-middleware)
 * Useful for inline permission checks in route handlers
 */
export async function checkPermission(
  req: Request,
  options: AuthorizeOptions
): Promise<{ allowed: boolean; reason: string }> {
  if (!req.user) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  // Super admin bypass: Always allowed
  if (req.user.isSuperAdmin) {
    return { allowed: true, reason: 'Super admin access' };
  }

  const { userId } = req.user;
  const companyId = req.tenantId || getCompanyIdFromRequest(req);

  if (!companyId) {
    return { allowed: false, reason: 'No company context' };
  }

  // Check view access
  if (options.view) {
    const resolution = await permissionsService.resolveViewPermission(
      userId,
      options.view,
      companyId
    );
    if (!resolution.allowed) {
      return { allowed: false, reason: resolution.reason };
    }
  }

  // Check feature permission
  if (options.feature && options.action) {
    const resolution = await permissionsService.resolveFeaturePermission(
      userId,
      options.feature,
      options.action,
      companyId
    );
    if (!resolution.allowed) {
      return { allowed: false, reason: resolution.reason };
    }
  }

  return { allowed: true, reason: 'Authorized' };
}
