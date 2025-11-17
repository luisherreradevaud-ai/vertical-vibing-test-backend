/**
 * Permission Resolution Service
 *
 * Resolves effective permissions for users based on their assigned user levels
 * Implements the permission hierarchy: deny > allow > inherit
 * Merges permissions across multiple user levels
 */

import crypto from 'crypto';
import { db } from '../../shared/db/client';
import type { PermissionState, ActionScope } from '@vertical-vibing/shared-types';

/**
 * Resolved view permission for a user
 */
export interface ResolvedViewPermission {
  viewId: string;
  allowed: boolean;
  reason: string; // For debugging/auditing
}

/**
 * Resolved feature permission for a user
 */
export interface ResolvedFeaturePermission {
  featureId: string;
  action: string;
  allowed: boolean;
  scope: ActionScope;
  reason: string;
}

/**
 * Permission resolution service
 */
export class PermissionsService {
  /**
   * Check if a user can access a specific view
   *
   * Resolution logic:
   * 1. Get all user levels for the user
   * 2. Get view permissions for each level
   * 3. Apply tri-state resolution: deny > allow > inherit
   * 4. Check module gating (user's company must own the module containing the view)
   */
  async canAccessView(userId: string, viewId: string, companyId: string): Promise<boolean> {
    const resolution = await this.resolveViewPermission(userId, viewId, companyId);
    return resolution.allowed;
  }

  /**
   * Resolve view permission with detailed reasoning
   */
  async resolveViewPermission(
    userId: string,
    viewId: string,
    companyId: string
  ): Promise<ResolvedViewPermission> {
    try {
      // Check module gating first
      const hasModuleAccess = await this.hasModuleAccessForView(companyId, viewId);
      if (!hasModuleAccess) {
        return {
          viewId,
          allowed: false,
          reason: 'Company does not have access to the module containing this view',
        };
      }

      // Get user's levels
      const userLevelIds = await db.iam.userUserLevels.getUserLevels(userId);

      if (userLevelIds.length === 0) {
        return {
          viewId,
          allowed: false,
          reason: 'User has no assigned user levels',
        };
      }

      // Collect permissions from all levels
      const permissions: PermissionState[] = [];
      for (const levelId of userLevelIds) {
        const perm = await db.iam.userLevelViewPermissions.find(levelId, viewId, companyId);
        if (perm) {
          permissions.push(perm.state);
        }
      }

      // Apply tri-state resolution: deny > allow > inherit
      if (permissions.includes('deny')) {
        return {
          viewId,
          allowed: false,
          reason: 'Explicitly denied by one or more user levels',
        };
      }

      if (permissions.includes('allow')) {
        return {
          viewId,
          allowed: true,
          reason: 'Explicitly allowed by one or more user levels',
        };
      }

      // All inherit or no specific permissions
      // Default policy: deny by default
      return {
        viewId,
        allowed: false,
        reason: 'No explicit allow permission (inherit or no permission)',
      };
    } catch (error) {
      console.error('Error resolving view permission:', error);
      return {
        viewId,
        allowed: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if a user can perform a specific action on a feature
   *
   * Resolution logic:
   * 1. Get all user levels for the user
   * 2. Get feature permissions for each level + action
   * 3. If any level denies (value: false), deny
   * 4. If any level allows (value: true), allow with most permissive scope
   * 5. Scope hierarchy: any > team > company > own
   */
  async canPerformAction(
    userId: string,
    featureId: string,
    action: string,
    companyId: string
  ): Promise<boolean> {
    const resolution = await this.resolveFeaturePermission(userId, featureId, action, companyId);
    return resolution.allowed;
  }

  /**
   * Resolve feature permission with scope and detailed reasoning
   */
  async resolveFeaturePermission(
    userId: string,
    featureId: string,
    action: string,
    companyId: string
  ): Promise<ResolvedFeaturePermission> {
    try {
      // Get user's levels
      const userLevelIds = await db.iam.userUserLevels.getUserLevels(userId);

      if (userLevelIds.length === 0) {
        return {
          featureId,
          action,
          allowed: false,
          scope: 'own',
          reason: 'User has no assigned user levels',
        };
      }

      // Collect permissions from all levels
      const permissions: Array<{ value: boolean; scope: ActionScope }> = [];
      for (const levelId of userLevelIds) {
        const perm = await db.iam.userLevelFeaturePermissions.find(
          levelId,
          featureId,
          action,
          companyId
        );
        if (perm) {
          permissions.push({ value: perm.value, scope: perm.scope });
        }
      }

      if (permissions.length === 0) {
        return {
          featureId,
          action,
          allowed: false,
          scope: 'own',
          reason: 'No permissions defined for this action',
        };
      }

      // Check for explicit denies
      const hasDeny = permissions.some((p) => p.value === false);
      if (hasDeny) {
        return {
          featureId,
          action,
          allowed: false,
          scope: 'own',
          reason: 'Explicitly denied by one or more user levels',
        };
      }

      // Check for allows and find most permissive scope
      const allows = permissions.filter((p) => p.value === true);
      if (allows.length === 0) {
        return {
          featureId,
          action,
          allowed: false,
          scope: 'own',
          reason: 'No explicit allow permission',
        };
      }

      // Find most permissive scope: any > team > company > own
      const scopeHierarchy: ActionScope[] = ['any', 'team', 'company', 'own'];
      let mostPermissiveScope: ActionScope = 'own';

      for (const scope of scopeHierarchy) {
        if (allows.some((p) => p.scope === scope)) {
          mostPermissiveScope = scope;
          break;
        }
      }

      return {
        featureId,
        action,
        allowed: true,
        scope: mostPermissiveScope,
        reason: `Allowed with '${mostPermissiveScope}' scope`,
      };
    } catch (error) {
      console.error('Error resolving feature permission:', error);
      return {
        featureId,
        action,
        allowed: false,
        scope: 'own',
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get all views a user can access
   */
  async getAccessibleViews(userId: string, companyId: string): Promise<string[]> {
    try {
      // Get all views
      const allViews = await db.iam.views.findAll();

      // Filter to accessible views
      const accessible: string[] = [];
      for (const view of allViews) {
        const canAccess = await this.canAccessView(userId, view.id, companyId);
        if (canAccess) {
          accessible.push(view.id);
        }
      }

      return accessible;
    } catch (error) {
      console.error('Error getting accessible views:', error);
      return [];
    }
  }

  /**
   * Get all feature permissions for a user
   * Returns a map of featureId -> action -> { allowed, scope }
   */
  async getAllFeaturePermissions(
    userId: string,
    companyId: string
  ): Promise<Record<string, Record<string, { allowed: boolean; scope: ActionScope }>>> {
    try {
      const result: Record<string, Record<string, { allowed: boolean; scope: ActionScope }>> = {};

      // Get all features
      const allFeatures = await db.iam.features.findAll();

      // Standard actions to check
      const actions = ['Create', 'Read', 'Update', 'Delete', 'Export', 'Approve'];

      for (const feature of allFeatures) {
        result[feature.id] = {};

        for (const action of actions) {
          const resolution = await this.resolveFeaturePermission(
            userId,
            feature.id,
            action,
            companyId
          );

          result[feature.id][action] = {
            allowed: resolution.allowed,
            scope: resolution.scope,
          };
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting all feature permissions:', error);
      return {};
    }
  }

  /**
   * Check module gating: Does the company have access to the module containing this view?
   */
  private async hasModuleAccessForView(companyId: string, viewId: string): Promise<boolean> {
    try {
      // Get modules that contain this view
      const modulesForView = await db.iam.module2Views.getModulesByView(viewId);

      if (modulesForView.length === 0) {
        // View not associated with any module - allow access by default
        return true;
      }

      // Get modules the company has access to
      const companyModules = await db.iam.company2Modules.getModulesByCompany(companyId);
      const companyModuleIds = new Set(companyModules.map((m) => m.id));

      // Check if company has at least one of the required modules
      for (const module of modulesForView) {
        if (companyModuleIds.has(module.id)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking module access:', error);
      // Fail open for errors
      return true;
    }
  }

  /**
   * Compute and cache effective permissions for a user
   * This can be called when a user logs in or when their permissions change
   */
  async computeAndCacheEffectivePermissions(
    userId: string,
    companyId: string
  ): Promise<void> {
    try {
      // Clear existing cached permissions
      await db.iam.effectiveViewPermissions.deleteForUser(userId, companyId);
      await db.iam.effectiveFeaturePermissions.deleteForUser(userId, companyId);

      // Compute and cache view permissions
      const allViews = await db.iam.views.findAll();
      for (const view of allViews) {
        const resolution = await this.resolveViewPermission(userId, view.id, companyId);
        await db.iam.effectiveViewPermissions.upsert({
          id: crypto.randomUUID(),
          userId,
          companyId,
          viewId: view.id,
          hasAccess: resolution.allowed,
          computedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes cache
        });
      }

      // Compute and cache feature permissions
      const allFeatures = await db.iam.features.findAll();
      const actions = ['Create', 'Read', 'Update', 'Delete', 'Export', 'Approve'];

      for (const feature of allFeatures) {
        for (const action of actions) {
          const resolution = await this.resolveFeaturePermission(
            userId,
            feature.id,
            action,
            companyId
          );

          await db.iam.effectiveFeaturePermissions.upsert({
            id: crypto.randomUUID(),
            userId,
            companyId,
            featureId: feature.id,
            action,
            allowed: resolution.allowed,
            scope: resolution.scope,
            computedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes cache
          });
        }
      }

      console.log(`✅ Computed and cached permissions for user ${userId} in company ${companyId}`);
    } catch (error) {
      console.error('Error computing effective permissions:', error);
      throw error;
    }
  }

  /**
   * Invalidate cached permissions for a user
   * Should be called when user levels or permissions are modified
   */
  async invalidateCachedPermissions(userId: string, companyId: string): Promise<void> {
    await db.iam.effectiveViewPermissions.deleteForUser(userId, companyId);
    await db.iam.effectiveFeaturePermissions.deleteForUser(userId, companyId);
    console.log(`✅ Invalidated cached permissions for user ${userId} in company ${companyId}`);
  }

  /**
   * Invalidate cached permissions for all users in a company
   * Should be called when company-wide permissions change
   */
  async invalidateCompanyPermissions(companyId: string): Promise<void> {
    // In a real database, this would be a bulk delete
    // For in-memory implementation, we'd need to track users by company
    console.log(`⚠️ Company-wide permission invalidation not fully implemented for ${companyId}`);
    // TODO: Implement when we have user->company mapping readily available
  }
}

// Export singleton instance
export const permissionsService = new PermissionsService();
