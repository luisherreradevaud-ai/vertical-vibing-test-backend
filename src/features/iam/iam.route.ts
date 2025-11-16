/**
 * IAM API Routes
 *
 * Provides endpoints for IAM management and permission queries
 */

import { Router } from 'express';
import crypto from 'crypto';
import { authenticateJWT } from '../../shared/middleware/auth';
import { enforceTenant } from '../../shared/middleware/tenantValidation';
import { ApiResponse } from '../../shared/utils/response';
import { permissionsService } from './permissions.service';
import { auditService } from './audit.service';
import { db } from '../../shared/db/client';
import type { NavigationMenuItem } from '@vertical-vibing/shared-types';
import {
  requireUserLevelManagement,
  requirePermissionManagement,
  requireUserAssignment,
  requireIAMRead,
} from './middleware/iamAuthorization';

const router = Router();

// Cache for navigation ETags
const navigationCache = new Map<string, { etag: string; data: any; timestamp: number }>();
const NAVIGATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/iam/navigation
 * Get permission-filtered navigation menu for the current user
 * Implements ETag caching for performance
 */
router.get('/navigation', authenticateJWT, enforceTenant, async (req, res) => {
  try {
    const { userId } = req.user!;
    const companyId = req.tenantId!;

    // Generate cache key
    const cacheKey = `${userId}:${companyId}`;

    // Check cache
    const cached = navigationCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < NAVIGATION_CACHE_TTL) {
      // Check if client has the same ETag
      const clientETag = req.headers['if-none-match'];
      if (clientETag === cached.etag) {
        return res.status(304).end(); // Not Modified
      }

      // Return cached data with ETag
      res.setHeader('ETag', cached.etag);
      res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
      return ApiResponse.success(res, cached.data);
    }

    // Get all menu items
    const menuItems = await db.iam.menuItems.findAll(null); // null = global menu
    const navigation: NavigationMenuItem[] = [];

    for (const item of menuItems) {
      // Check if user can access this menu item's view
      if (item.viewId) {
        const canAccess = await permissionsService.canAccessView(userId, item.viewId, companyId);
        if (!canAccess) continue;
      }

      // Check if user has the required feature
      if (item.featureId) {
        const canPerform = await permissionsService.canPerformAction(
          userId,
          item.featureId,
          'Read',
          companyId
        );
        if (!canPerform) continue;
      }

      // Get sub-menu items
      const allSubItems = await db.iam.subMenuItems.findByMenuId(item.id);
      const accessibleSubItems = [];

      for (const subItem of allSubItems) {
        // Check view access
        if (subItem.viewId) {
          const canAccess = await permissionsService.canAccessView(
            userId,
            subItem.viewId,
            companyId
          );
          if (!canAccess) continue;
        }

        // Check feature access
        if (subItem.featureId) {
          const canPerform = await permissionsService.canPerformAction(
            userId,
            subItem.featureId,
            'Read',
            companyId
          );
          if (!canPerform) continue;
        }

        // Get the view to extract URL
        const view = subItem.viewId ? await db.iam.views.findById(subItem.viewId) : null;

        accessibleSubItems.push({
          id: subItem.id,
          label: subItem.label,
          url: view?.url || null,
        });
      }

      // Only include menu item if it has accessible sub-items or is directly accessible
      if (accessibleSubItems.length > 0 || item.viewId) {
        const view = item.viewId ? await db.iam.views.findById(item.viewId) : null;

        navigation.push({
          id: item.id,
          label: item.label,
          icon: item.icon,
          url: view?.url || null,
          isEntrypoint: item.isEntrypoint,
          subItems: accessibleSubItems,
        });
      }
    }

    // Find first entrypoint
    const entrypoint = navigation.find((item) => item.isEntrypoint && item.url);

    const responseData = {
      menu: navigation,
      entrypoint: entrypoint?.url || null,
    };

    // Generate ETag from navigation content
    const etag = `"${crypto.createHash('md5').update(JSON.stringify(responseData)).digest('hex')}"`;

    // Cache the response
    navigationCache.set(cacheKey, {
      etag,
      data: responseData,
      timestamp: now,
    });

    // Set cache headers
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes

    return ApiResponse.success(res, responseData);
  } catch (error) {
    console.error('Navigation API error:', error);
    return ApiResponse.error(res, 'Failed to load navigation', 500);
  }
});

/**
 * GET /api/iam/permissions/current
 * Get current user's effective permissions
 */
router.get('/permissions/current', authenticateJWT, enforceTenant, async (req, res) => {
  try {
    const { userId } = req.user!;
    const companyId = req.tenantId!;

    // Get accessible views
    const accessibleViewIds = await permissionsService.getAccessibleViews(userId, companyId);

    // Convert to a map
    const views: Record<string, boolean> = {};
    const allViews = await db.iam.views.findAll();
    for (const view of allViews) {
      views[view.id] = accessibleViewIds.includes(view.id);
    }

    // Get all feature permissions
    const featurePermissions = await permissionsService.getAllFeaturePermissions(
      userId,
      companyId
    );

    return ApiResponse.success(res, {
      views,
      features: featurePermissions,
    });
  } catch (error) {
    console.error('Current permissions API error:', error);
    return ApiResponse.error(res, 'Failed to load permissions', 500);
  }
});

/**
 * GET /api/iam/user-levels
 * Get all user levels for the company (Client Admin)
 */
router.get('/user-levels', authenticateJWT, enforceTenant, requireIAMRead, async (req, res) => {
  try {
    const companyId = req.tenantId!;

    const userLevels = await db.iam.userLevels.findAll(companyId);

    return ApiResponse.success(res, { userLevels });
  } catch (error) {
    console.error('User levels list error:', error);
    return ApiResponse.error(res, 'Failed to load user levels', 500);
  }
});

/**
 * POST /api/iam/user-levels
 * Create a new user level (Client Admin)
 */
router.post('/user-levels', authenticateJWT, enforceTenant, requireUserLevelManagement, async (req, res) => {
  try {
    const { userId } = req.user!;
    const companyId = req.tenantId!;
    const { name, description } = req.body;

    if (!name) {
      return ApiResponse.badRequest(res, 'Name is required');
    }

    // Check if name already exists
    const existing = await db.iam.userLevels.findByName(name, companyId);
    if (existing) {
      return ApiResponse.conflict(res, 'A user level with this name already exists');
    }

    const userLevel = await db.iam.userLevels.create({
      id: crypto.randomUUID(),
      companyId,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
    });

    // Audit log
    await auditService.logUserLevelCreated(userId, companyId, userLevel.id, {
      name,
      description,
    });

    return ApiResponse.created(res, { userLevel });
  } catch (error) {
    console.error('Create user level error:', error);
    return ApiResponse.error(res, 'Failed to create user level', 500);
  }
});

/**
 * GET /api/iam/user-levels/:id
 * Get a specific user level (Client Admin)
 */
router.get('/user-levels/:id', authenticateJWT, enforceTenant, requireIAMRead, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.tenantId!;

    const userLevel = await db.iam.userLevels.findById(id, companyId);

    if (!userLevel) {
      return ApiResponse.notFound(res, 'User level not found');
    }

    return ApiResponse.success(res, { userLevel });
  } catch (error) {
    console.error('Get user level error:', error);
    return ApiResponse.error(res, 'Failed to load user level', 500);
  }
});

/**
 * PATCH /api/iam/user-levels/:id
 * Update a user level (Client Admin)
 */
router.patch('/user-levels/:id', authenticateJWT, enforceTenant, requireUserLevelManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const companyId = req.tenantId!;
    const { name, description } = req.body;

    // Check if name is being changed to an existing name
    if (name) {
      const existing = await db.iam.userLevels.findByName(name, companyId);
      if (existing && existing.id !== id) {
        return ApiResponse.conflict(res, 'A user level with this name already exists');
      }
    }

    const updated = await db.iam.userLevels.update(id, companyId, {
      name,
      description,
    });

    if (!updated) {
      return ApiResponse.notFound(res, 'User level not found');
    }

    // Audit log
    await auditService.logUserLevelUpdated(userId, companyId, id, { name, description });

    return ApiResponse.success(res, { userLevel: updated });
  } catch (error) {
    console.error('Update user level error:', error);
    return ApiResponse.error(res, 'Failed to update user level', 500);
  }
});

/**
 * DELETE /api/iam/user-levels/:id
 * Delete a user level (Client Admin)
 */
router.delete('/user-levels/:id', authenticateJWT, enforceTenant, requireUserLevelManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const companyId = req.tenantId!;

    // Check if any users are assigned to this level
    const assignedUsers = await db.iam.userUserLevels.getUsers(id);
    if (assignedUsers.length > 0) {
      return ApiResponse.badRequest(
        res,
        `Cannot delete user level: ${assignedUsers.length} user(s) are assigned to it`
      );
    }

    const deleted = await db.iam.userLevels.delete(id, companyId);

    if (!deleted) {
      return ApiResponse.notFound(res, 'User level not found');
    }

    // Audit log
    await auditService.logUserLevelDeleted(userId, companyId, id, {
      assignedUsersCount: 0,
    });

    return ApiResponse.success(res, { message: 'User level deleted successfully' });
  } catch (error) {
    console.error('Delete user level error:', error);
    return ApiResponse.error(res, 'Failed to delete user level', 500);
  }
});

/**
 * GET /api/iam/user-levels/:id/permissions/views
 * Get view permissions for a user level (Client Admin)
 */
router.get('/user-levels/:id/permissions/views', authenticateJWT, enforceTenant, requireIAMRead, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.tenantId!;

    const permissions = await db.iam.userLevelViewPermissions.findByUserLevel(id, companyId);

    return ApiResponse.success(res, { permissions });
  } catch (error) {
    console.error('Get view permissions error:', error);
    return ApiResponse.error(res, 'Failed to load view permissions', 500);
  }
});

/**
 * PUT /api/iam/user-levels/:id/permissions/views
 * Replace all view permissions for a user level (Client Admin)
 */
router.put('/user-levels/:id/permissions/views', authenticateJWT, enforceTenant, requirePermissionManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const companyId = req.tenantId!;
    const { views } = req.body;

    if (!Array.isArray(views)) {
      return ApiResponse.badRequest(res, 'views must be an array');
    }

    // Validate and format permissions
    const permissions = views.map((v) => ({
      companyId,
      userLevelId: id,
      viewId: v.viewId,
      state: v.state || 'inherit',
      modifiable: v.modifiable !== false,
    }));

    await db.iam.userLevelViewPermissions.replaceForUserLevel(id, companyId, permissions);

    // Audit log
    await auditService.logViewPermissionsUpdated(userId, companyId, id, permissions);

    // Invalidate navigation cache for all users with this level
    const usersWithLevel = await db.iam.userUserLevels.getUsers(id);
    for (const targetUserId of usersWithLevel) {
      navigationCache.delete(`${targetUserId}:${companyId}`);
    }

    return ApiResponse.success(res, { message: 'View permissions updated successfully' });
  } catch (error) {
    console.error('Update view permissions error:', error);
    return ApiResponse.error(res, 'Failed to update view permissions', 500);
  }
});

/**
 * GET /api/iam/user-levels/:id/permissions/features
 * Get feature permissions for a user level (Client Admin)
 */
router.get('/user-levels/:id/permissions/features', authenticateJWT, enforceTenant, requireIAMRead, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.tenantId!;

    const permissions = await db.iam.userLevelFeaturePermissions.findByUserLevel(id, companyId);

    return ApiResponse.success(res, { permissions });
  } catch (error) {
    console.error('Get feature permissions error:', error);
    return ApiResponse.error(res, 'Failed to load feature permissions', 500);
  }
});

/**
 * PUT /api/iam/user-levels/:id/permissions/features
 * Replace all feature permissions for a user level (Client Admin)
 */
router.put('/user-levels/:id/permissions/features', authenticateJWT, enforceTenant, requirePermissionManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user!;
    const companyId = req.tenantId!;
    const { features } = req.body;

    if (!Array.isArray(features)) {
      return ApiResponse.badRequest(res, 'features must be an array');
    }

    // Validate and format permissions
    const permissions = features.map((f) => ({
      companyId,
      userLevelId: id,
      featureId: f.featureId,
      action: f.action,
      value: f.value !== false,
      scope: f.scope || 'any',
      modifiable: f.modifiable !== false,
    }));

    await db.iam.userLevelFeaturePermissions.replaceForUserLevel(id, companyId, permissions);

    // Audit log
    await auditService.logFeaturePermissionsUpdated(userId, companyId, id, permissions);

    // Invalidate cached permissions for users with this level
    const usersWithLevel = await db.iam.userUserLevels.getUsers(id);
    for (const targetUserId of usersWithLevel) {
      await permissionsService.invalidateCachedPermissions(targetUserId, companyId);
    }

    return ApiResponse.success(res, { message: 'Feature permissions updated successfully' });
  } catch (error) {
    console.error('Update feature permissions error:', error);
    return ApiResponse.error(res, 'Failed to update feature permissions', 500);
  }
});

/**
 * GET /api/iam/users/:userId/user-levels
 * Get user levels assigned to a user (Client Admin)
 */
router.get('/users/:userId/user-levels', authenticateJWT, enforceTenant, requireIAMRead, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const companyId = req.tenantId!;

    const userLevelIds = await db.iam.userUserLevels.getUserLevels(targetUserId);

    // Get full user level objects
    const userLevels = [];
    for (const levelId of userLevelIds) {
      const level = await db.iam.userLevels.findById(levelId, companyId);
      if (level) {
        userLevels.push(level);
      }
    }

    return ApiResponse.success(res, { userLevels });
  } catch (error) {
    console.error('Get user levels for user error:', error);
    return ApiResponse.error(res, 'Failed to load user levels', 500);
  }
});

/**
 * PUT /api/iam/users/:userId/user-levels
 * Replace user levels for a user (Client Admin)
 */
router.put('/users/:userId/user-levels', authenticateJWT, enforceTenant, requireUserAssignment, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const { userId } = req.user!;
    const companyId = req.tenantId!;
    const { userLevelIds } = req.body;

    if (!Array.isArray(userLevelIds)) {
      return ApiResponse.badRequest(res, 'userLevelIds must be an array');
    }

    // Get previous levels for audit log
    const previousLevelIds = await db.iam.userUserLevels.getUserLevels(targetUserId);

    await db.iam.userUserLevels.replaceForUser(targetUserId, userLevelIds);

    // Invalidate cached permissions and navigation
    await permissionsService.invalidateCachedPermissions(targetUserId, companyId);
    navigationCache.delete(`${targetUserId}:${companyId}`);

    // Audit log
    await auditService.logUserLevelsAssigned(
      userId,
      companyId,
      targetUserId,
      userLevelIds,
      previousLevelIds
    );

    return ApiResponse.success(res, { message: 'User levels updated successfully' });
  } catch (error) {
    console.error('Update user levels error:', error);
    return ApiResponse.error(res, 'Failed to update user levels', 500);
  }
});

/**
 * GET /api/iam/views
 * Get all views (for building permission matrices)
 */
router.get('/views', authenticateJWT, requireIAMRead, async (req, res) => {
  try {
    const views = await db.iam.views.findAll();
    return ApiResponse.success(res, { views });
  } catch (error) {
    console.error('Get views error:', error);
    return ApiResponse.error(res, 'Failed to load views', 500);
  }
});

/**
 * GET /api/iam/features
 * Get all features (for building permission matrices)
 */
router.get('/features', authenticateJWT, requireIAMRead, async (req, res) => {
  try {
    const features = await db.iam.features.findAll();
    return ApiResponse.success(res, { features });
  } catch (error) {
    console.error('Get features error:', error);
    return ApiResponse.error(res, 'Failed to load features', 500);
  }
});

export function createIAMRouter(): Router {
  return router;
}
