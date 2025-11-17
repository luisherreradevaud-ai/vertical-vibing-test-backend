/**
 * IAM PostgreSQL Repository
 *
 * Production PostgreSQL implementation using Drizzle ORM
 */

import { eq, and, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
  View,
  Module,
  Feature,
  UserLevel,
  MenuItem,
  SubMenuItem,
  NavTrailEntry,
  UserLevelViewPermission,
  UserLevelFeaturePermission,
  UserUserLevel,
  EffectiveViewPermission,
  EffectiveFeaturePermission,
} from '@vertical-vibing/shared-types';
import * as schema from '../schema/iam.schema';
import type { IAMDatabase } from './iam.repository';

/**
 * PostgreSQL IAM Database Implementation
 */
export class PostgreSQLIAMDatabase implements IAMDatabase {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  // ----- Views -----
  views = {
    findAll: async (): Promise<View[]> => {
      const results = await this.db.select().from(schema.views);
      return results.map(this.mapViewFromDb);
    },

    findById: async (id: string): Promise<View | null> => {
      const results = await this.db
        .select()
        .from(schema.views)
        .where(eq(schema.views.id, id))
        .limit(1);

      return results[0] ? this.mapViewFromDb(results[0]) : null;
    },

    findByUrl: async (url: string): Promise<View | null> => {
      const results = await this.db
        .select()
        .from(schema.views)
        .where(eq(schema.views.url, url))
        .limit(1);

      return results[0] ? this.mapViewFromDb(results[0]) : null;
    },

    create: async (view: View): Promise<View> => {
      const results = await this.db
        .insert(schema.views)
        .values({
          id: view.id,
          name: view.name,
          url: view.url,
          category: view.category ?? null,
          description: view.description ?? null,
          icon: view.icon ?? null,
          requiresAuth: view.requiresAuth,
          createdAt: view.createdAt,
          updatedAt: view.updatedAt,
        } as any)
        .returning();

      return this.mapViewFromDb(results[0]);
    },

    update: async (id: string, data: Partial<View>): Promise<View | null> => {
      const updateData: any = { ...data, updatedAt: new Date() };
      delete updateData.id; // Don't update ID
      delete updateData.createdAt; // Don't update createdAt

      const results = await this.db
        .update(schema.views)
        .set(updateData)
        .where(eq(schema.views.id, id))
        .returning();

      return results[0] ? this.mapViewFromDb(results[0]) : null;
    },

    delete: async (id: string): Promise<boolean> => {
      const results = await this.db
        .delete(schema.views)
        .where(eq(schema.views.id, id))
        .returning();

      return results.length > 0;
    },
  };

  // ----- Modules -----
  modules = {
    findAll: async (): Promise<Module[]> => {
      const results = await this.db.select().from(schema.modules);
      return results.map(this.mapModuleFromDb);
    },

    findById: async (id: string): Promise<Module | null> => {
      const results = await this.db
        .select()
        .from(schema.modules)
        .where(eq(schema.modules.id, id))
        .limit(1);

      return results[0] ? this.mapModuleFromDb(results[0]) : null;
    },

    findByCode: async (code: string): Promise<Module | null> => {
      const results = await this.db
        .select()
        .from(schema.modules)
        .where(eq(schema.modules.code, code))
        .limit(1);

      return results[0] ? this.mapModuleFromDb(results[0]) : null;
    },

    create: async (module: Module): Promise<Module> => {
      const results = await this.db
        .insert(schema.modules)
        .values({
          code: module.code,
          name: module.name,
          description: module.description ?? null,
          icon: module.icon ?? null,
          enabled: module.enabled,
          priority: module.priority,
        })
        .returning();

      return this.mapModuleFromDb(results[0]);
    },

    update: async (id: string, data: Partial<Module>): Promise<Module | null> => {
      const updateData: any = { ...data, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.createdAt;

      const results = await this.db
        .update(schema.modules)
        .set(updateData)
        .where(eq(schema.modules.id, id))
        .returning();

      return results[0] ? this.mapModuleFromDb(results[0]) : null;
    },

    delete: async (id: string): Promise<boolean> => {
      const results = await this.db
        .delete(schema.modules)
        .where(eq(schema.modules.id, id))
        .returning();

      return results.length > 0;
    },
  };

  // ----- Features -----
  features = {
    findAll: async (): Promise<Feature[]> => {
      const results = await this.db.select().from(schema.features);
      return results.map(this.mapFeatureFromDb);
    },

    findById: async (id: string): Promise<Feature | null> => {
      const results = await this.db
        .select()
        .from(schema.features)
        .where(eq(schema.features.id, id))
        .limit(1);

      return results[0] ? this.mapFeatureFromDb(results[0]) : null;
    },

    findByKey: async (key: string): Promise<Feature | null> => {
      const results = await this.db
        .select()
        .from(schema.features)
        .where(eq(schema.features.key, key))
        .limit(1);

      return results[0] ? this.mapFeatureFromDb(results[0]) : null;
    },

    create: async (feature: Feature): Promise<Feature> => {
      const results = await this.db
        .insert(schema.features)
        .values({
          id: feature.id,
          key: feature.key ?? null,
          name: feature.name,
          description: feature.description ?? null,
          resourceType: feature.resourceType ?? null,
          actions: feature.actions ? JSON.stringify(feature.actions) : null,
          category: feature.category ?? null,
          enabled: feature.enabled,
          createdAt: feature.createdAt,
          updatedAt: feature.updatedAt,
        } as any)
        .returning();

      return this.mapFeatureFromDb(results[0]);
    },

    update: async (id: string, data: Partial<Feature>): Promise<Feature | null> => {
      const updateData: any = { ...data, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.createdAt;

      // Handle actions array
      if (updateData.actions) {
        updateData.actions = JSON.stringify(updateData.actions);
      }

      const results = await this.db
        .update(schema.features)
        .set(updateData)
        .where(eq(schema.features.id, id))
        .returning();

      return results[0] ? this.mapFeatureFromDb(results[0]) : null;
    },

    delete: async (id: string): Promise<boolean> => {
      const results = await this.db
        .delete(schema.features)
        .where(eq(schema.features.id, id))
        .returning();

      return results.length > 0;
    },
  };

  // ----- User Levels (Multi-tenant) -----
  userLevels = {
    findAll: async (companyId: string): Promise<UserLevel[]> => {
      const results = await this.db
        .select()
        .from(schema.userLevels)
        .where(eq(schema.userLevels.companyId, companyId));

      return results.map(this.mapUserLevelFromDb);
    },

    findById: async (id: string, companyId: string): Promise<UserLevel | null> => {
      const results = await this.db
        .select()
        .from(schema.userLevels)
        .where(and(
          eq(schema.userLevels.id, id),
          eq(schema.userLevels.companyId, companyId)
        ))
        .limit(1);

      return results[0] ? this.mapUserLevelFromDb(results[0]) : null;
    },

    findByName: async (name: string, companyId: string): Promise<UserLevel | null> => {
      const results = await this.db
        .select()
        .from(schema.userLevels)
        .where(and(
          eq(schema.userLevels.name, name),
          eq(schema.userLevels.companyId, companyId)
        ))
        .limit(1);

      return results[0] ? this.mapUserLevelFromDb(results[0]) : null;
    },

    create: async (userLevel: UserLevel): Promise<UserLevel> => {
      const results = await this.db
        .insert(schema.userLevels)
        .values({
          id: userLevel.id,
          companyId: userLevel.companyId,
          name: userLevel.name,
          description: userLevel.description ?? null,
          isDefault: userLevel.isDefault,
          createdAt: userLevel.createdAt,
          updatedAt: userLevel.updatedAt,
        } as any)
        .returning();

      return this.mapUserLevelFromDb(results[0]);
    },

    update: async (id: string, companyId: string, data: Partial<UserLevel>): Promise<UserLevel | null> => {
      const updateData: any = { ...data, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.companyId; // Don't update companyId
      delete updateData.createdAt;

      const results = await this.db
        .update(schema.userLevels)
        .set(updateData)
        .where(and(
          eq(schema.userLevels.id, id),
          eq(schema.userLevels.companyId, companyId)
        ))
        .returning();

      return results[0] ? this.mapUserLevelFromDb(results[0]) : null;
    },

    delete: async (id: string, companyId: string): Promise<boolean> => {
      const results = await this.db
        .delete(schema.userLevels)
        .where(and(
          eq(schema.userLevels.id, id),
          eq(schema.userLevels.companyId, companyId)
        ))
        .returning();

      return results.length > 0;
    },
  };

  // ----- Feature to View Mapping -----
  feature2Views = {
    getViewsByFeature: async (featureId: string): Promise<View[]> => {
      const results = await this.db
        .select({
          view: schema.views,
        })
        .from(schema.feature2Views)
        .innerJoin(schema.views, eq(schema.feature2Views.viewId, schema.views.id))
        .where(eq(schema.feature2Views.featureId, featureId));

      return results.map(r => this.mapViewFromDb(r.view));
    },

    getFeaturesByView: async (viewId: string): Promise<Feature[]> => {
      const results = await this.db
        .select({
          feature: schema.features,
        })
        .from(schema.feature2Views)
        .innerJoin(schema.features, eq(schema.feature2Views.featureId, schema.features.id))
        .where(eq(schema.feature2Views.viewId, viewId));

      return results.map(r => this.mapFeatureFromDb(r.feature));
    },

    add: async (featureId: string, viewId: string): Promise<void> => {
      await this.db
        .insert(schema.feature2Views)
        .values({
          featureId,
          viewId,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    },

    remove: async (featureId: string, viewId: string): Promise<void> => {
      await this.db
        .delete(schema.feature2Views)
        .where(and(
          eq(schema.feature2Views.featureId, featureId),
          eq(schema.feature2Views.viewId, viewId)
        ));
    },

    replaceForFeature: async (featureId: string, viewIds: string[]): Promise<void> => {
      // Delete existing
      await this.db
        .delete(schema.feature2Views)
        .where(eq(schema.feature2Views.featureId, featureId));

      // Insert new
      if (viewIds.length > 0) {
        await this.db
          .insert(schema.feature2Views)
          .values(viewIds.map(viewId => ({
            featureId,
            viewId,
            createdAt: new Date(),
          })));
      }
    },
  };

  // ----- Module to View Mapping -----
  module2Views = {
    getViewsByModule: async (moduleId: string): Promise<View[]> => {
      const results = await this.db
        .select({
          view: schema.views,
        })
        .from(schema.module2Views)
        .innerJoin(schema.views, eq(schema.module2Views.viewId, schema.views.id))
        .where(eq(schema.module2Views.moduleId, moduleId));

      return results.map(r => this.mapViewFromDb(r.view));
    },

    getModulesByView: async (viewId: string): Promise<Module[]> => {
      const results = await this.db
        .select({
          module: schema.modules,
        })
        .from(schema.module2Views)
        .innerJoin(schema.modules, eq(schema.module2Views.moduleId, schema.modules.id))
        .where(eq(schema.module2Views.viewId, viewId));

      return results.map(r => this.mapModuleFromDb(r.module));
    },

    add: async (moduleId: string, viewId: string): Promise<void> => {
      await this.db
        .insert(schema.module2Views)
        .values({
          moduleId,
          viewId,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    },

    remove: async (moduleId: string, viewId: string): Promise<void> => {
      await this.db
        .delete(schema.module2Views)
        .where(and(
          eq(schema.module2Views.moduleId, moduleId),
          eq(schema.module2Views.viewId, viewId)
        ));
    },

    replaceForModule: async (moduleId: string, viewIds: string[]): Promise<void> => {
      // Delete existing
      await this.db
        .delete(schema.module2Views)
        .where(eq(schema.module2Views.moduleId, moduleId));

      // Insert new
      if (viewIds.length > 0) {
        await this.db
          .insert(schema.module2Views)
          .values(viewIds.map(viewId => ({
            moduleId,
            viewId,
            createdAt: new Date(),
          })));
      }
    },
  };

  // ----- Company to Module Mapping -----
  company2Modules = {
    getModulesByCompany: async (companyId: string): Promise<Module[]> => {
      const results = await this.db
        .select({
          module: schema.modules,
        })
        .from(schema.company2Modules)
        .innerJoin(schema.modules, eq(schema.company2Modules.moduleId, schema.modules.id))
        .where(and(
          eq(schema.company2Modules.companyId, companyId),
          eq(schema.company2Modules.enabled, true)
        ));

      return results.map(r => this.mapModuleFromDb(r.module));
    },

    getCompaniesByModule: async (moduleId: string): Promise<string[]> => {
      const results = await this.db
        .select({
          companyId: schema.company2Modules.companyId,
        })
        .from(schema.company2Modules)
        .where(eq(schema.company2Modules.moduleId, moduleId));

      return results.map(r => r.companyId);
    },

    add: async (companyId: string, moduleId: string): Promise<void> => {
      await this.db
        .insert(schema.company2Modules)
        .values({
          companyId,
          moduleId,
          enabled: true,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    },

    remove: async (companyId: string, moduleId: string): Promise<void> => {
      await this.db
        .delete(schema.company2Modules)
        .where(and(
          eq(schema.company2Modules.companyId, companyId),
          eq(schema.company2Modules.moduleId, moduleId)
        ));
    },

    replaceForCompany: async (companyId: string, moduleIds: string[]): Promise<void> => {
      // Delete existing
      await this.db
        .delete(schema.company2Modules)
        .where(eq(schema.company2Modules.companyId, companyId));

      // Insert new
      if (moduleIds.length > 0) {
        await this.db
          .insert(schema.company2Modules)
          .values(moduleIds.map(moduleId => ({
            companyId,
            moduleId,
            enabled: true,
            createdAt: new Date(),
          })));
      }
    },
  };

  // ----- Module to Feature Mapping -----
  module2Features = {
    getFeaturesByModule: async (moduleId: string): Promise<Feature[]> => {
      const results = await this.db
        .select({
          feature: schema.features,
        })
        .from(schema.module2Features)
        .innerJoin(schema.features, eq(schema.module2Features.featureId, schema.features.id))
        .where(eq(schema.module2Features.moduleId, moduleId));

      return results.map(r => this.mapFeatureFromDb(r.feature));
    },

    getModulesByFeature: async (featureId: string): Promise<Module[]> => {
      const results = await this.db
        .select({
          module: schema.modules,
        })
        .from(schema.module2Features)
        .innerJoin(schema.modules, eq(schema.module2Features.moduleId, schema.modules.id))
        .where(eq(schema.module2Features.featureId, featureId));

      return results.map(r => this.mapModuleFromDb(r.module));
    },

    add: async (moduleId: string, featureId: string): Promise<void> => {
      await this.db
        .insert(schema.module2Features)
        .values({
          moduleId,
          featureId,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    },

    remove: async (moduleId: string, featureId: string): Promise<void> => {
      await this.db
        .delete(schema.module2Features)
        .where(and(
          eq(schema.module2Features.moduleId, moduleId),
          eq(schema.module2Features.featureId, featureId)
        ));
    },
  };

  // ----- User Level View Permissions -----
  userLevelViewPermissions = {
    findByUserLevel: async (userLevelId: string, companyId: string): Promise<UserLevelViewPermission[]> => {
      const results = await this.db
        .select()
        .from(schema.userLevelViewPermissions)
        .where(and(
          eq(schema.userLevelViewPermissions.userLevelId, userLevelId),
          eq(schema.userLevelViewPermissions.companyId, companyId)
        ));

      return results.map(this.mapUserLevelViewPermissionFromDb);
    },

    findByView: async (viewId: string, companyId: string): Promise<UserLevelViewPermission[]> => {
      const results = await this.db
        .select()
        .from(schema.userLevelViewPermissions)
        .where(and(
          eq(schema.userLevelViewPermissions.viewId, viewId),
          eq(schema.userLevelViewPermissions.companyId, companyId)
        ));

      return results.map(this.mapUserLevelViewPermissionFromDb);
    },

    find: async (
      userLevelId: string,
      viewId: string,
      companyId: string
    ): Promise<UserLevelViewPermission | null> => {
      const results = await this.db
        .select()
        .from(schema.userLevelViewPermissions)
        .where(and(
          eq(schema.userLevelViewPermissions.userLevelId, userLevelId),
          eq(schema.userLevelViewPermissions.viewId, viewId),
          eq(schema.userLevelViewPermissions.companyId, companyId)
        ))
        .limit(1);

      return results[0] ? this.mapUserLevelViewPermissionFromDb(results[0]) : null;
    },

    upsert: async (permission: UserLevelViewPermission): Promise<void> => {
      await this.db
        .insert(schema.userLevelViewPermissions)
        .values({
          companyId: permission.companyId,
          userLevelId: permission.userLevelId,
          viewId: permission.viewId,
          state: permission.state,
          modifiable: permission.modifiable,
        })
        .onConflictDoUpdate({
          target: [
            schema.userLevelViewPermissions.companyId,
            schema.userLevelViewPermissions.userLevelId,
            schema.userLevelViewPermissions.viewId,
          ],
          set: {
            state: permission.state,
            modifiable: permission.modifiable,
            updatedAt: new Date(),
          },
        });
    },

    delete: async (userLevelId: string, viewId: string, companyId: string): Promise<boolean> => {
      const results = await this.db
        .delete(schema.userLevelViewPermissions)
        .where(and(
          eq(schema.userLevelViewPermissions.userLevelId, userLevelId),
          eq(schema.userLevelViewPermissions.viewId, viewId),
          eq(schema.userLevelViewPermissions.companyId, companyId)
        ))
        .returning();

      return results.length > 0;
    },

    replaceForUserLevel: async (
      userLevelId: string,
      companyId: string,
      permissions: UserLevelViewPermission[]
    ): Promise<void> => {
      // Delete existing
      await this.db
        .delete(schema.userLevelViewPermissions)
        .where(and(
          eq(schema.userLevelViewPermissions.userLevelId, userLevelId),
          eq(schema.userLevelViewPermissions.companyId, companyId)
        ));

      // Insert new
      if (permissions.length > 0) {
        await this.db
          .insert(schema.userLevelViewPermissions)
          .values(permissions.map(p => ({
            companyId: p.companyId,
            userLevelId: p.userLevelId,
            viewId: p.viewId,
            state: p.state,
            modifiable: p.modifiable,
          })));
      }
    },
  };

  // ----- User Level Feature Permissions -----
  userLevelFeaturePermissions = {
    findByUserLevel: async (userLevelId: string, companyId: string): Promise<UserLevelFeaturePermission[]> => {
      const results = await this.db
        .select()
        .from(schema.userLevelFeaturePermissions)
        .where(and(
          eq(schema.userLevelFeaturePermissions.userLevelId, userLevelId),
          eq(schema.userLevelFeaturePermissions.companyId, companyId)
        ));

      return results.map(this.mapUserLevelFeaturePermissionFromDb);
    },

    findByFeature: async (featureId: string, companyId: string): Promise<UserLevelFeaturePermission[]> => {
      const results = await this.db
        .select()
        .from(schema.userLevelFeaturePermissions)
        .where(and(
          eq(schema.userLevelFeaturePermissions.featureId, featureId),
          eq(schema.userLevelFeaturePermissions.companyId, companyId)
        ));

      return results.map(this.mapUserLevelFeaturePermissionFromDb);
    },

    find: async (
      userLevelId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<UserLevelFeaturePermission | null> => {
      const results = await this.db
        .select()
        .from(schema.userLevelFeaturePermissions)
        .where(and(
          eq(schema.userLevelFeaturePermissions.userLevelId, userLevelId),
          eq(schema.userLevelFeaturePermissions.featureId, featureId),
          eq(schema.userLevelFeaturePermissions.action, action),
          eq(schema.userLevelFeaturePermissions.companyId, companyId)
        ))
        .limit(1);

      return results[0] ? this.mapUserLevelFeaturePermissionFromDb(results[0]) : null;
    },

    upsert: async (permission: UserLevelFeaturePermission): Promise<void> => {
      await this.db
        .insert(schema.userLevelFeaturePermissions)
        .values({
          companyId: permission.companyId,
          userLevelId: permission.userLevelId,
          featureId: permission.featureId,
          action: permission.action,
          value: permission.value,
          scope: permission.scope,
          modifiable: permission.modifiable,
        })
        .onConflictDoUpdate({
          target: [
            schema.userLevelFeaturePermissions.companyId,
            schema.userLevelFeaturePermissions.userLevelId,
            schema.userLevelFeaturePermissions.featureId,
            schema.userLevelFeaturePermissions.action,
          ],
          set: {
            value: permission.value,
            scope: permission.scope,
            modifiable: permission.modifiable,
            updatedAt: new Date(),
          },
        });
    },

    delete: async (
      userLevelId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<boolean> => {
      const results = await this.db
        .delete(schema.userLevelFeaturePermissions)
        .where(and(
          eq(schema.userLevelFeaturePermissions.userLevelId, userLevelId),
          eq(schema.userLevelFeaturePermissions.featureId, featureId),
          eq(schema.userLevelFeaturePermissions.action, action),
          eq(schema.userLevelFeaturePermissions.companyId, companyId)
        ))
        .returning();

      return results.length > 0;
    },

    replaceForUserLevel: async (
      userLevelId: string,
      companyId: string,
      permissions: UserLevelFeaturePermission[]
    ): Promise<void> => {
      // Delete existing
      await this.db
        .delete(schema.userLevelFeaturePermissions)
        .where(and(
          eq(schema.userLevelFeaturePermissions.userLevelId, userLevelId),
          eq(schema.userLevelFeaturePermissions.companyId, companyId)
        ));

      // Insert new
      if (permissions.length > 0) {
        await this.db
          .insert(schema.userLevelFeaturePermissions)
          .values(permissions.map(p => ({
            companyId: p.companyId,
            userLevelId: p.userLevelId,
            featureId: p.featureId,
            action: p.action,
            value: p.value,
            scope: p.scope,
            modifiable: p.modifiable,
          })));
      }
    },
  };

  // ----- User to UserLevel Assignments -----
  userUserLevels = {
    getUserLevels: async (userId: string): Promise<string[]> => {
      const results = await this.db
        .select({
          userLevelId: schema.userUserLevels.userLevelId,
        })
        .from(schema.userUserLevels)
        .where(eq(schema.userUserLevels.userId, userId));

      return results.map(r => r.userLevelId);
    },

    getUsers: async (userLevelId: string): Promise<string[]> => {
      const results = await this.db
        .select({
          userId: schema.userUserLevels.userId,
        })
        .from(schema.userUserLevels)
        .where(eq(schema.userUserLevels.userLevelId, userLevelId));

      return results.map(r => r.userId);
    },

    add: async (userId: string, userLevelId: string): Promise<void> => {
      await this.db
        .insert(schema.userUserLevels)
        .values({
          userId,
          userLevelId,
          assignedBy: null,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    },

    remove: async (userId: string, userLevelId: string): Promise<boolean> => {
      const results = await this.db
        .delete(schema.userUserLevels)
        .where(and(
          eq(schema.userUserLevels.userId, userId),
          eq(schema.userUserLevels.userLevelId, userLevelId)
        ))
        .returning();

      return results.length > 0;
    },

    replaceForUser: async (userId: string, userLevelIds: string[]): Promise<void> => {
      // Delete existing
      await this.db
        .delete(schema.userUserLevels)
        .where(eq(schema.userUserLevels.userId, userId));

      // Insert new
      if (userLevelIds.length > 0) {
        await this.db
          .insert(schema.userUserLevels)
          .values(userLevelIds.map(userLevelId => ({
            userId,
            userLevelId,
            assignedBy: null,
            createdAt: new Date(),
          })));
      }
    },
  };

  // ----- Menu Items -----
  menuItems = {
    findAll: async (companyId: string | null): Promise<MenuItem[]> => {
      const query = companyId
        ? this.db.select().from(schema.menuItems).where(eq(schema.menuItems.companyId, companyId))
        : this.db.select().from(schema.menuItems).where(sql`${schema.menuItems.companyId} IS NULL`);

      const results = await query;
      return results.map(this.mapMenuItemFromDb);
    },

    findById: async (id: string): Promise<MenuItem | null> => {
      const results = await this.db
        .select()
        .from(schema.menuItems)
        .where(eq(schema.menuItems.id, id))
        .limit(1);

      return results[0] ? this.mapMenuItemFromDb(results[0]) : null;
    },

    create: async (menuItem: MenuItem): Promise<MenuItem> => {
      const results = await this.db
        .insert(schema.menuItems)
        .values({
          companyId: menuItem.companyId ?? null,
          label: menuItem.label,
          icon: menuItem.icon ?? null,
          priority: menuItem.priority,
          requiredPermissions: menuItem.requiredPermissions ? JSON.stringify(menuItem.requiredPermissions) : null,
          sortOrder: menuItem.sortOrder ?? null,
          viewId: menuItem.viewId ?? null,
          featureId: menuItem.featureId ?? null,
          isEntrypoint: menuItem.isEntrypoint,
        })
        .returning();

      return this.mapMenuItemFromDb(results[0]);
    },

    update: async (id: string, data: Partial<MenuItem>): Promise<MenuItem | null> => {
      const updateData: any = { ...data, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.createdAt;

      if (updateData.requiredPermissions) {
        updateData.requiredPermissions = JSON.stringify(updateData.requiredPermissions);
      }

      const results = await this.db
        .update(schema.menuItems)
        .set(updateData)
        .where(eq(schema.menuItems.id, id))
        .returning();

      return results[0] ? this.mapMenuItemFromDb(results[0]) : null;
    },

    delete: async (id: string): Promise<boolean> => {
      const results = await this.db
        .delete(schema.menuItems)
        .where(eq(schema.menuItems.id, id))
        .returning();

      return results.length > 0;
    },
  };

  // ----- Sub-Menu Items -----
  subMenuItems = {
    findByMenuId: async (menuItemId: string): Promise<SubMenuItem[]> => {
      const results = await this.db
        .select()
        .from(schema.subMenuItems)
        .where(eq(schema.subMenuItems.menuItemId, menuItemId));

      return results.map(this.mapSubMenuItemFromDb);
    },

    findById: async (id: string): Promise<SubMenuItem | null> => {
      const results = await this.db
        .select()
        .from(schema.subMenuItems)
        .where(eq(schema.subMenuItems.id, id))
        .limit(1);

      return results[0] ? this.mapSubMenuItemFromDb(results[0]) : null;
    },

    create: async (subMenuItem: SubMenuItem): Promise<SubMenuItem> => {
      const results = await this.db
        .insert(schema.subMenuItems)
        .values({
          menuItemId: subMenuItem.menuItemId,
          label: subMenuItem.label,
          viewId: subMenuItem.viewId ?? null,
          featureId: subMenuItem.featureId ?? null,
          icon: subMenuItem.icon ?? null,
          sortOrder: subMenuItem.sortOrder ?? null,
          enabled: subMenuItem.enabled,
        })
        .returning();

      return this.mapSubMenuItemFromDb(results[0]);
    },

    update: async (id: string, data: Partial<SubMenuItem>): Promise<SubMenuItem | null> => {
      const updateData: any = { ...data, updatedAt: new Date() };
      delete updateData.id;
      delete updateData.createdAt;

      const results = await this.db
        .update(schema.subMenuItems)
        .set(updateData)
        .where(eq(schema.subMenuItems.id, id))
        .returning();

      return results[0] ? this.mapSubMenuItemFromDb(results[0]) : null;
    },

    delete: async (id: string): Promise<boolean> => {
      const results = await this.db
        .delete(schema.subMenuItems)
        .where(eq(schema.subMenuItems.id, id))
        .returning();

      return results.length > 0;
    },
  };

  // ----- Navigation Trail -----
  navTrail = {
    findBySession: async (userId: string, sessionId: string): Promise<NavTrailEntry[]> => {
      const results = await this.db
        .select()
        .from(schema.navTrail)
        .where(and(
          eq(schema.navTrail.userId, userId),
          eq(schema.navTrail.sessionId, sessionId)
        ))
        .orderBy(schema.navTrail.createdAt);

      return results.map(this.mapNavTrailEntryFromDb);
    },

    findRecent: async (userId: string, limit: number): Promise<NavTrailEntry[]> => {
      const results = await this.db
        .select()
        .from(schema.navTrail)
        .where(eq(schema.navTrail.userId, userId))
        .orderBy(sql`${schema.navTrail.createdAt} DESC`)
        .limit(limit);

      return results.map(this.mapNavTrailEntryFromDb);
    },

    track: async (entry: NavTrailEntry): Promise<void> => {
      await this.db
        .insert(schema.navTrail)
        .values({
          userId: entry.userId,
          sessionId: entry.sessionId,
          viewId: entry.viewId ?? null,
          url: entry.url,
          label: entry.label,
          depth: entry.depth,
        });
    },

    clear: async (userId: string, sessionId: string): Promise<void> => {
      await this.db
        .delete(schema.navTrail)
        .where(and(
          eq(schema.navTrail.userId, userId),
          eq(schema.navTrail.sessionId, sessionId)
        ));
    },
  };

  // ----- Effective View Permissions (Cache) -----
  effectiveViewPermissions = {
    find: async (
      userId: string,
      viewId: string,
      companyId: string
    ): Promise<EffectiveViewPermission | null> => {
      const results = await this.db
        .select()
        .from(schema.effectiveViewPermissions)
        .where(and(
          eq(schema.effectiveViewPermissions.userId, userId),
          eq(schema.effectiveViewPermissions.viewId, viewId),
          eq(schema.effectiveViewPermissions.companyId, companyId),
          sql`${schema.effectiveViewPermissions.expiresAt} > NOW()`
        ))
        .limit(1);

      return results[0] ? this.mapEffectiveViewPermissionFromDb(results[0]) : null;
    },

    upsert: async (permission: EffectiveViewPermission): Promise<void> => {
      await this.db
        .insert(schema.effectiveViewPermissions)
        .values({
          id: permission.id,
          userId: permission.userId,
          companyId: permission.companyId,
          viewId: permission.viewId,
          hasAccess: permission.hasAccess,
          computedAt: permission.computedAt,
          expiresAt: permission.expiresAt,
        } as any)
        .onConflictDoUpdate({
          target: [
            schema.effectiveViewPermissions.userId,
            schema.effectiveViewPermissions.companyId,
            schema.effectiveViewPermissions.viewId,
          ],
          set: {
            hasAccess: permission.hasAccess,
            computedAt: permission.computedAt as any,
            expiresAt: permission.expiresAt as any,
          },
        });
    },

    deleteForUser: async (userId: string, companyId: string): Promise<void> => {
      await this.db
        .delete(schema.effectiveViewPermissions)
        .where(and(
          eq(schema.effectiveViewPermissions.userId, userId),
          eq(schema.effectiveViewPermissions.companyId, companyId)
        ));
    },
  };

  // ----- Effective Feature Permissions (Cache) -----
  effectiveFeaturePermissions = {
    find: async (
      userId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<EffectiveFeaturePermission | null> => {
      const results = await this.db
        .select()
        .from(schema.effectiveFeaturePermissions)
        .where(and(
          eq(schema.effectiveFeaturePermissions.userId, userId),
          eq(schema.effectiveFeaturePermissions.featureId, featureId),
          eq(schema.effectiveFeaturePermissions.action, action),
          eq(schema.effectiveFeaturePermissions.companyId, companyId),
          sql`${schema.effectiveFeaturePermissions.expiresAt} > NOW()`
        ))
        .limit(1);

      return results[0] ? this.mapEffectiveFeaturePermissionFromDb(results[0]) : null;
    },

    upsert: async (permission: EffectiveFeaturePermission): Promise<void> => {
      await this.db
        .insert(schema.effectiveFeaturePermissions)
        .values({
          id: permission.id,
          userId: permission.userId,
          companyId: permission.companyId,
          featureId: permission.featureId,
          action: permission.action,
          allowed: permission.allowed,
          scope: permission.scope,
          computedAt: permission.computedAt,
          expiresAt: permission.expiresAt,
        } as any)
        .onConflictDoUpdate({
          target: [
            schema.effectiveFeaturePermissions.userId,
            schema.effectiveFeaturePermissions.companyId,
            schema.effectiveFeaturePermissions.featureId,
            schema.effectiveFeaturePermissions.action,
          ],
          set: {
            allowed: permission.allowed,
            scope: permission.scope,
            computedAt: permission.computedAt as any,
            expiresAt: permission.expiresAt as any,
          },
        });
    },

    deleteForUser: async (userId: string, companyId: string): Promise<void> => {
      await this.db
        .delete(schema.effectiveFeaturePermissions)
        .where(and(
          eq(schema.effectiveFeaturePermissions.userId, userId),
          eq(schema.effectiveFeaturePermissions.companyId, companyId)
        ));
    },
  };

  // ----- Mappers (DB -> Domain) -----
  private mapViewFromDb = (row: any): View => ({
    id: row.id,
    name: row.name,
    url: row.url,
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    requiresAuth: row.requiresAuth,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapModuleFromDb = (row: any): Module => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    enabled: row.enabled,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapFeatureFromDb = (row: any): Feature => ({
    id: row.id,
    key: row.key ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    resourceType: row.resourceType ?? undefined,
    actions: row.actions ? JSON.parse(row.actions) : undefined,
    category: row.category ?? undefined,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapUserLevelFromDb = (row: any): UserLevel => ({
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    description: row.description ?? undefined,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapUserLevelViewPermissionFromDb = (row: any): UserLevelViewPermission => ({
    id: row.id,
    companyId: row.companyId,
    userLevelId: row.userLevelId,
    viewId: row.viewId,
    state: row.state,
    modifiable: row.modifiable,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapUserLevelFeaturePermissionFromDb = (row: any): UserLevelFeaturePermission => ({
    id: row.id,
    companyId: row.companyId,
    userLevelId: row.userLevelId,
    featureId: row.featureId,
    action: row.action,
    value: row.value,
    scope: row.scope,
    modifiable: row.modifiable,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapMenuItemFromDb = (row: any): MenuItem => ({
    id: row.id,
    companyId: row.companyId ?? undefined,
    label: row.label,
    icon: row.icon ?? undefined,
    priority: row.priority,
    requiredPermissions: row.requiredPermissions ? JSON.parse(row.requiredPermissions) : undefined,
    sortOrder: row.sortOrder ?? undefined,
    viewId: row.viewId ?? undefined,
    featureId: row.featureId ?? undefined,
    isEntrypoint: row.isEntrypoint,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapSubMenuItemFromDb = (row: any): SubMenuItem => ({
    id: row.id,
    menuItemId: row.menuItemId,
    label: row.label,
    viewId: row.viewId ?? undefined,
    featureId: row.featureId ?? undefined,
    icon: row.icon ?? undefined,
    sortOrder: row.sortOrder ?? undefined,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapNavTrailEntryFromDb = (row: any): NavTrailEntry => ({
    id: row.id,
    userId: row.userId,
    sessionId: row.sessionId,
    viewId: row.viewId ?? undefined,
    url: row.url,
    label: row.label,
    depth: row.depth,
    createdAt: row.createdAt,
  });

  private mapEffectiveViewPermissionFromDb = (row: any): EffectiveViewPermission => ({
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    viewId: row.viewId,
    hasAccess: row.hasAccess,
    computedAt: row.computedAt,
    expiresAt: row.expiresAt,
  });

  private mapEffectiveFeaturePermissionFromDb = (row: any): EffectiveFeaturePermission => ({
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    featureId: row.featureId,
    action: row.action,
    allowed: row.allowed,
    scope: row.scope,
    computedAt: row.computedAt,
    expiresAt: row.expiresAt,
  });
}
