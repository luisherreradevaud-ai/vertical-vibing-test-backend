/**
 * IAM Repository
 *
 * In-memory storage for IAM entities (Views, Modules, Features, User Levels, etc.)
 * For production, migrate to proper database tables
 */

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
  Feature2View,
  Module2View,
  Company2Module,
  Module2Feature,
  EffectiveViewPermission,
  EffectiveFeaturePermission,
} from '@vertical-vibing/shared-types';

/**
 * IAM Database Interface
 */
export interface IAMDatabase {
  views: {
    findAll(): Promise<View[]>;
    findById(id: string): Promise<View | null>;
    findByUrl(url: string): Promise<View | null>;
    create(view: View): Promise<View>;
    update(id: string, data: Partial<View>): Promise<View | null>;
    delete(id: string): Promise<boolean>;
  };

  modules: {
    findAll(): Promise<Module[]>;
    findById(id: string): Promise<Module | null>;
    findByCode(code: string): Promise<Module | null>;
    create(module: Module): Promise<Module>;
    update(id: string, data: Partial<Module>): Promise<Module | null>;
    delete(id: string): Promise<boolean>;
  };

  features: {
    findAll(): Promise<Feature[]>;
    findById(id: string): Promise<Feature | null>;
    findByKey(key: string): Promise<Feature | null>;
    create(feature: Feature): Promise<Feature>;
    update(id: string, data: Partial<Feature>): Promise<Feature | null>;
    delete(id: string): Promise<boolean>;
  };

  userLevels: {
    findAll(companyId: string): Promise<UserLevel[]>;
    findById(id: string, companyId: string): Promise<UserLevel | null>;
    findByName(name: string, companyId: string): Promise<UserLevel | null>;
    create(userLevel: UserLevel): Promise<UserLevel>;
    update(id: string, companyId: string, data: Partial<UserLevel>): Promise<UserLevel | null>;
    delete(id: string, companyId: string): Promise<boolean>;
  };

  // Relation tables
  feature2Views: {
    getViewsByFeature(featureId: string): Promise<View[]>;
    getFeaturesByView(viewId: string): Promise<Feature[]>;
    add(featureId: string, viewId: string): Promise<void>;
    remove(featureId: string, viewId: string): Promise<void>;
    replaceForFeature(featureId: string, viewIds: string[]): Promise<void>;
  };

  module2Views: {
    getViewsByModule(moduleId: string): Promise<View[]>;
    getModulesByView(viewId: string): Promise<Module[]>;
    add(moduleId: string, viewId: string): Promise<void>;
    remove(moduleId: string, viewId: string): Promise<void>;
    replaceForModule(moduleId: string, viewIds: string[]): Promise<void>;
  };

  company2Modules: {
    getModulesByCompany(companyId: string): Promise<Module[]>;
    getCompaniesByModule(moduleId: string): Promise<string[]>;
    add(companyId: string, moduleId: string): Promise<void>;
    remove(companyId: string, moduleId: string): Promise<void>;
    replaceForCompany(companyId: string, moduleIds: string[]): Promise<void>;
  };

  module2Features: {
    getFeaturesByModule(moduleId: string): Promise<Feature[]>;
    getModulesByFeature(featureId: string): Promise<Module[]>;
    add(moduleId: string, featureId: string): Promise<void>;
    remove(moduleId: string, featureId: string): Promise<void>;
  };

  // User Level Permissions
  userLevelViewPermissions: {
    findByUserLevel(userLevelId: string, companyId: string): Promise<UserLevelViewPermission[]>;
    findByView(viewId: string, companyId: string): Promise<UserLevelViewPermission[]>;
    find(
      userLevelId: string,
      viewId: string,
      companyId: string
    ): Promise<UserLevelViewPermission | null>;
    upsert(permission: UserLevelViewPermission): Promise<void>;
    delete(userLevelId: string, viewId: string, companyId: string): Promise<boolean>;
    replaceForUserLevel(userLevelId: string, companyId: string, permissions: UserLevelViewPermission[]): Promise<void>;
  };

  userLevelFeaturePermissions: {
    findByUserLevel(userLevelId: string, companyId: string): Promise<UserLevelFeaturePermission[]>;
    findByFeature(featureId: string, companyId: string): Promise<UserLevelFeaturePermission[]>;
    find(
      userLevelId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<UserLevelFeaturePermission | null>;
    upsert(permission: UserLevelFeaturePermission): Promise<void>;
    delete(
      userLevelId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<boolean>;
    replaceForUserLevel(userLevelId: string, companyId: string, permissions: UserLevelFeaturePermission[]): Promise<void>;
  };

  // User - UserLevel assignments
  userUserLevels: {
    getUserLevels(userId: string): Promise<string[]>; // Returns userLevelIds
    getUsers(userLevelId: string): Promise<string[]>; // Returns userIds
    add(userId: string, userLevelId: string): Promise<void>;
    remove(userId: string, userLevelId: string): Promise<boolean>;
    replaceForUser(userId: string, userLevelIds: string[]): Promise<void>;
  };

  // Menus
  menuItems: {
    findAll(companyId: string | null): Promise<MenuItem[]>;
    findById(id: string): Promise<MenuItem | null>;
    create(menuItem: MenuItem): Promise<MenuItem>;
    update(id: string, data: Partial<MenuItem>): Promise<MenuItem | null>;
    delete(id: string): Promise<boolean>;
  };

  subMenuItems: {
    findByMenuId(menuItemId: string): Promise<SubMenuItem[]>;
    findById(id: string): Promise<SubMenuItem | null>;
    create(subMenuItem: SubMenuItem): Promise<SubMenuItem>;
    update(id: string, data: Partial<SubMenuItem>): Promise<SubMenuItem | null>;
    delete(id: string): Promise<boolean>;
  };

  // Navigation Trail
  navTrail: {
    findBySession(userId: string, sessionId: string): Promise<NavTrailEntry[]>;
    findRecent(userId: string, limit: number): Promise<NavTrailEntry[]>;
    track(entry: NavTrailEntry): Promise<void>;
    clear(userId: string, sessionId: string): Promise<void>;
  };

  // Effective Permissions (cached/computed)
  effectiveViewPermissions: {
    find(userId: string, viewId: string, companyId: string): Promise<EffectiveViewPermission | null>;
    upsert(permission: EffectiveViewPermission): Promise<void>;
    deleteForUser(userId: string, companyId: string): Promise<void>;
  };

  effectiveFeaturePermissions: {
    find(
      userId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<EffectiveFeaturePermission | null>;
    upsert(permission: EffectiveFeaturePermission): Promise<void>;
    deleteForUser(userId: string, companyId: string): Promise<void>;
  };
}

/**
 * In-Memory IAM Database Implementation
 */
export class InMemoryIAMDatabase implements IAMDatabase {
  // Stores
  private viewsStore: Map<string, View> = new Map();
  private viewUrlIndex: Map<string, string> = new Map(); // url -> viewId

  private modulesStore: Map<string, Module> = new Map();
  private moduleCodeIndex: Map<string, string> = new Map(); // code -> moduleId

  private featuresStore: Map<string, Feature> = new Map();
  private featureKeyIndex: Map<string, string> = new Map(); // key -> featureId

  private userLevelsStore: Map<string, UserLevel> = new Map(); // id -> UserLevel
  private userLevelCompanyIndex: Map<string, Set<string>> = new Map(); // companyId -> Set<userLevelId>
  private userLevelNameIndex: Map<string, string> = new Map(); // `${companyId}:${name}` -> userLevelId

  // Relation stores
  private feature2ViewsStore: Map<string, Set<string>> = new Map(); // featureId -> Set<viewId>
  private view2FeaturesStore: Map<string, Set<string>> = new Map(); // viewId -> Set<featureId>

  private module2ViewsStore: Map<string, Set<string>> = new Map(); // moduleId -> Set<viewId>
  private view2ModulesStore: Map<string, Set<string>> = new Map(); // viewId -> Set<moduleId>

  private company2ModulesStore: Map<string, Set<string>> = new Map(); // companyId -> Set<moduleId>
  private module2CompaniesStore: Map<string, Set<string>> = new Map(); // moduleId -> Set<companyId>

  private module2FeaturesStore: Map<string, Set<string>> = new Map(); // moduleId -> Set<featureId>
  private feature2ModulesStore: Map<string, Set<string>> = new Map(); // featureId -> Set<moduleId>

  // Permission stores
  private userLevelViewPermissionsStore: Map<string, UserLevelViewPermission> = new Map(); // `${companyId}:${userLevelId}:${viewId}` -> permission
  private userLevelFeaturePermissionsStore: Map<string, UserLevelFeaturePermission> = new Map(); // `${companyId}:${userLevelId}:${featureId}:${action}` -> permission

  // User-UserLevel assignments
  private userUserLevelsStore: Map<string, Set<string>> = new Map(); // userId -> Set<userLevelId>
  private userLevelUsersStore: Map<string, Set<string>> = new Map(); // userLevelId -> Set<userId>

  // Menu stores
  private menuItemsStore: Map<string, MenuItem> = new Map();
  private subMenuItemsStore: Map<string, SubMenuItem> = new Map();
  private menuItemSubItemsIndex: Map<string, Set<string>> = new Map(); // menuItemId -> Set<subMenuItemId>

  // Navigation trail
  private navTrailStore: Map<string, NavTrailEntry> = new Map(); // id -> entry
  private navTrailSessionIndex: Map<string, Set<string>> = new Map(); // `${userId}:${sessionId}` -> Set<entryId>

  // Effective permissions (cached)
  private effectiveViewPermissionsStore: Map<string, EffectiveViewPermission> = new Map(); // `${userId}:${companyId}:${viewId}` -> permission
  private effectiveFeaturePermissionsStore: Map<string, EffectiveFeaturePermission> = new Map(); // `${userId}:${companyId}:${featureId}:${action}` -> permission

  // Helper methods
  private getOrCreateSet<K>(map: Map<K, Set<string>>, key: K): Set<string> {
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    return map.get(key)!;
  }

  // Views implementation
  views = {
    findAll: async (): Promise<View[]> => {
      return Array.from(this.viewsStore.values());
    },

    findById: async (id: string): Promise<View | null> => {
      return this.viewsStore.get(id) || null;
    },

    findByUrl: async (url: string): Promise<View | null> => {
      const viewId = this.viewUrlIndex.get(url);
      return viewId ? this.viewsStore.get(viewId) || null : null;
    },

    create: async (view: View): Promise<View> => {
      this.viewsStore.set(view.id, view);
      this.viewUrlIndex.set(view.url, view.id);
      return view;
    },

    update: async (id: string, data: Partial<View>): Promise<View | null> => {
      const existing = this.viewsStore.get(id);
      if (!existing) return null;

      // Update URL index if URL changed
      if (data.url && data.url !== existing.url) {
        this.viewUrlIndex.delete(existing.url);
        this.viewUrlIndex.set(data.url, id);
      }

      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      this.viewsStore.set(id, updated);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      const existing = this.viewsStore.get(id);
      if (!existing) return false;

      this.viewUrlIndex.delete(existing.url);
      this.viewsStore.delete(id);
      return true;
    },
  };

  // Modules implementation
  modules = {
    findAll: async (): Promise<Module[]> => {
      return Array.from(this.modulesStore.values());
    },

    findById: async (id: string): Promise<Module | null> => {
      return this.modulesStore.get(id) || null;
    },

    findByCode: async (code: string): Promise<Module | null> => {
      const moduleId = this.moduleCodeIndex.get(code);
      return moduleId ? this.modulesStore.get(moduleId) || null : null;
    },

    create: async (module: Module): Promise<Module> => {
      this.modulesStore.set(module.id, module);
      this.moduleCodeIndex.set(module.code, module.id);
      return module;
    },

    update: async (id: string, data: Partial<Module>): Promise<Module | null> => {
      const existing = this.modulesStore.get(id);
      if (!existing) return null;

      // Update code index if code changed
      if (data.code && data.code !== existing.code) {
        this.moduleCodeIndex.delete(existing.code);
        this.moduleCodeIndex.set(data.code, id);
      }

      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      this.modulesStore.set(id, updated);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      const existing = this.modulesStore.get(id);
      if (!existing) return false;

      this.moduleCodeIndex.delete(existing.code);
      this.modulesStore.delete(id);
      return true;
    },
  };

  // Features implementation
  features = {
    findAll: async (): Promise<Feature[]> => {
      return Array.from(this.featuresStore.values());
    },

    findById: async (id: string): Promise<Feature | null> => {
      return this.featuresStore.get(id) || null;
    },

    findByKey: async (key: string): Promise<Feature | null> => {
      const featureId = this.featureKeyIndex.get(key);
      return featureId ? this.featuresStore.get(featureId) || null : null;
    },

    create: async (feature: Feature): Promise<Feature> => {
      this.featuresStore.set(feature.id, feature);
      if (feature.key) {
        this.featureKeyIndex.set(feature.key, feature.id);
      }
      return feature;
    },

    update: async (id: string, data: Partial<Feature>): Promise<Feature | null> => {
      const existing = this.featuresStore.get(id);
      if (!existing) return null;

      // Update key index if key changed
      if (data.key && data.key !== existing.key) {
        if (existing.key) {
          this.featureKeyIndex.delete(existing.key);
        }
        this.featureKeyIndex.set(data.key, id);
      }

      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      this.featuresStore.set(id, updated);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      const existing = this.featuresStore.get(id);
      if (!existing) return false;

      if (existing.key) {
        this.featureKeyIndex.delete(existing.key);
      }
      this.featuresStore.delete(id);
      return true;
    },
  };

  // User Levels implementation
  userLevels = {
    findAll: async (companyId: string): Promise<UserLevel[]> => {
      const userLevelIds = this.userLevelCompanyIndex.get(companyId) || new Set();
      return Array.from(userLevelIds)
        .map((id) => this.userLevelsStore.get(id))
        .filter((ul): ul is UserLevel => ul !== undefined);
    },

    findById: async (id: string, companyId: string): Promise<UserLevel | null> => {
      const userLevel = this.userLevelsStore.get(id);
      if (!userLevel || userLevel.companyId !== companyId) return null;
      return userLevel;
    },

    findByName: async (name: string, companyId: string): Promise<UserLevel | null> => {
      const key = `${companyId}:${name}`;
      const userLevelId = this.userLevelNameIndex.get(key);
      return userLevelId ? this.userLevelsStore.get(userLevelId) || null : null;
    },

    create: async (userLevel: UserLevel): Promise<UserLevel> => {
      this.userLevelsStore.set(userLevel.id, userLevel);
      this.getOrCreateSet(this.userLevelCompanyIndex, userLevel.companyId).add(userLevel.id);
      this.userLevelNameIndex.set(`${userLevel.companyId}:${userLevel.name}`, userLevel.id);
      return userLevel;
    },

    update: async (id: string, companyId: string, data: Partial<UserLevel>): Promise<UserLevel | null> => {
      const existing = this.userLevelsStore.get(id);
      if (!existing || existing.companyId !== companyId) return null;

      // Update name index if name changed
      if (data.name && data.name !== existing.name) {
        this.userLevelNameIndex.delete(`${companyId}:${existing.name}`);
        this.userLevelNameIndex.set(`${companyId}:${data.name}`, id);
      }

      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      this.userLevelsStore.set(id, updated);
      return updated;
    },

    delete: async (id: string, companyId: string): Promise<boolean> => {
      const existing = this.userLevelsStore.get(id);
      if (!existing || existing.companyId !== companyId) return false;

      const companyUserLevels = this.userLevelCompanyIndex.get(companyId);
      if (companyUserLevels) {
        companyUserLevels.delete(id);
      }

      this.userLevelNameIndex.delete(`${companyId}:${existing.name}`);
      this.userLevelsStore.delete(id);
      return true;
    },
  };

  // ... Continue with relation implementations in next part due to length
  // For brevity, I'll include the interface definitions. Full implementations follow the same pattern.

  feature2Views = {
    getViewsByFeature: async (featureId: string): Promise<View[]> => {
      const viewIds = this.feature2ViewsStore.get(featureId) || new Set();
      return Array.from(viewIds)
        .map((id) => this.viewsStore.get(id))
        .filter((v): v is View => v !== undefined);
    },

    getFeaturesByView: async (viewId: string): Promise<Feature[]> => {
      const featureIds = this.view2FeaturesStore.get(viewId) || new Set();
      return Array.from(featureIds)
        .map((id) => this.featuresStore.get(id))
        .filter((f): f is Feature => f !== undefined);
    },

    add: async (featureId: string, viewId: string): Promise<void> => {
      this.getOrCreateSet(this.feature2ViewsStore, featureId).add(viewId);
      this.getOrCreateSet(this.view2FeaturesStore, viewId).add(featureId);
    },

    remove: async (featureId: string, viewId: string): Promise<void> => {
      this.feature2ViewsStore.get(featureId)?.delete(viewId);
      this.view2FeaturesStore.get(viewId)?.delete(featureId);
    },

    replaceForFeature: async (featureId: string, viewIds: string[]): Promise<void> => {
      // Remove old mappings
      const oldViewIds = this.feature2ViewsStore.get(featureId) || new Set();
      for (const viewId of oldViewIds) {
        this.view2FeaturesStore.get(viewId)?.delete(featureId);
      }

      // Add new mappings
      const newViewIds = new Set(viewIds);
      this.feature2ViewsStore.set(featureId, newViewIds);
      for (const viewId of viewIds) {
        this.getOrCreateSet(this.view2FeaturesStore, viewId).add(featureId);
      }
    },
  };

  module2Views = {
    getViewsByModule: async (moduleId: string): Promise<View[]> => {
      const viewIds = this.module2ViewsStore.get(moduleId) || new Set();
      return Array.from(viewIds)
        .map((id) => this.viewsStore.get(id))
        .filter((v): v is View => v !== undefined);
    },

    getModulesByView: async (viewId: string): Promise<Module[]> => {
      const moduleIds = this.view2ModulesStore.get(viewId) || new Set();
      return Array.from(moduleIds)
        .map((id) => this.modulesStore.get(id))
        .filter((m): m is Module => m !== undefined);
    },

    add: async (moduleId: string, viewId: string): Promise<void> => {
      this.getOrCreateSet(this.module2ViewsStore, moduleId).add(viewId);
      this.getOrCreateSet(this.view2ModulesStore, viewId).add(moduleId);
    },

    remove: async (moduleId: string, viewId: string): Promise<void> => {
      this.module2ViewsStore.get(moduleId)?.delete(viewId);
      this.view2ModulesStore.get(viewId)?.delete(moduleId);
    },

    replaceForModule: async (moduleId: string, viewIds: string[]): Promise<void> => {
      // Remove old mappings
      const oldViewIds = this.module2ViewsStore.get(moduleId) || new Set();
      for (const viewId of oldViewIds) {
        this.view2ModulesStore.get(viewId)?.delete(moduleId);
      }

      // Add new mappings
      const newViewIds = new Set(viewIds);
      this.module2ViewsStore.set(moduleId, newViewIds);
      for (const viewId of viewIds) {
        this.getOrCreateSet(this.view2ModulesStore, viewId).add(moduleId);
      }
    },
  };

  company2Modules = {
    getModulesByCompany: async (companyId: string): Promise<Module[]> => {
      const moduleIds = this.company2ModulesStore.get(companyId) || new Set();
      return Array.from(moduleIds)
        .map((id) => this.modulesStore.get(id))
        .filter((m): m is Module => m !== undefined);
    },

    getCompaniesByModule: async (moduleId: string): Promise<string[]> => {
      return Array.from(this.module2CompaniesStore.get(moduleId) || new Set());
    },

    add: async (companyId: string, moduleId: string): Promise<void> => {
      this.getOrCreateSet(this.company2ModulesStore, companyId).add(moduleId);
      this.getOrCreateSet(this.module2CompaniesStore, moduleId).add(companyId);
    },

    remove: async (companyId: string, moduleId: string): Promise<void> => {
      this.company2ModulesStore.get(companyId)?.delete(moduleId);
      this.module2CompaniesStore.get(moduleId)?.delete(companyId);
    },

    replaceForCompany: async (companyId: string, moduleIds: string[]): Promise<void> => {
      // Remove old mappings
      const oldModuleIds = this.company2ModulesStore.get(companyId) || new Set();
      for (const moduleId of oldModuleIds) {
        this.module2CompaniesStore.get(moduleId)?.delete(companyId);
      }

      // Add new mappings
      const newModuleIds = new Set(moduleIds);
      this.company2ModulesStore.set(companyId, newModuleIds);
      for (const moduleId of moduleIds) {
        this.getOrCreateSet(this.module2CompaniesStore, moduleId).add(companyId);
      }
    },
  };

  module2Features = {
    getFeaturesByModule: async (moduleId: string): Promise<Feature[]> => {
      const featureIds = this.module2FeaturesStore.get(moduleId) || new Set();
      return Array.from(featureIds)
        .map((id) => this.featuresStore.get(id))
        .filter((f): f is Feature => f !== undefined);
    },

    getModulesByFeature: async (featureId: string): Promise<Module[]> => {
      const moduleIds = this.feature2ModulesStore.get(featureId) || new Set();
      return Array.from(moduleIds)
        .map((id) => this.modulesStore.get(id))
        .filter((m): m is Module => m !== undefined);
    },

    add: async (moduleId: string, featureId: string): Promise<void> => {
      this.getOrCreateSet(this.module2FeaturesStore, moduleId).add(featureId);
      this.getOrCreateSet(this.feature2ModulesStore, featureId).add(moduleId);
    },

    remove: async (moduleId: string, featureId: string): Promise<void> => {
      this.module2FeaturesStore.get(moduleId)?.delete(featureId);
      this.feature2ModulesStore.get(featureId)?.delete(moduleId);
    },
  };

  // Permission implementations
  userLevelViewPermissions = {
    findByUserLevel: async (
      userLevelId: string,
      companyId: string
    ): Promise<UserLevelViewPermission[]> => {
      const permissions: UserLevelViewPermission[] = [];
      for (const [key, perm] of this.userLevelViewPermissionsStore.entries()) {
        if (key.startsWith(`${companyId}:${userLevelId}:`)) {
          permissions.push(perm);
        }
      }
      return permissions;
    },

    findByView: async (viewId: string, companyId: string): Promise<UserLevelViewPermission[]> => {
      const permissions: UserLevelViewPermission[] = [];
      for (const [key, perm] of this.userLevelViewPermissionsStore.entries()) {
        if (perm.viewId === viewId && perm.companyId === companyId) {
          permissions.push(perm);
        }
      }
      return permissions;
    },

    find: async (
      userLevelId: string,
      viewId: string,
      companyId: string
    ): Promise<UserLevelViewPermission | null> => {
      const key = `${companyId}:${userLevelId}:${viewId}`;
      return this.userLevelViewPermissionsStore.get(key) || null;
    },

    upsert: async (permission: UserLevelViewPermission): Promise<void> => {
      const key = `${permission.companyId}:${permission.userLevelId}:${permission.viewId}`;
      this.userLevelViewPermissionsStore.set(key, permission);
    },

    delete: async (userLevelId: string, viewId: string, companyId: string): Promise<boolean> => {
      const key = `${companyId}:${userLevelId}:${viewId}`;
      return this.userLevelViewPermissionsStore.delete(key);
    },

    replaceForUserLevel: async (
      userLevelId: string,
      companyId: string,
      permissions: UserLevelViewPermission[]
    ): Promise<void> => {
      // Delete old permissions
      const keysToDelete: string[] = [];
      for (const key of this.userLevelViewPermissionsStore.keys()) {
        if (key.startsWith(`${companyId}:${userLevelId}:`)) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        this.userLevelViewPermissionsStore.delete(key);
      }

      // Add new permissions
      for (const perm of permissions) {
        await this.userLevelViewPermissions.upsert(perm);
      }
    },
  };

  userLevelFeaturePermissions = {
    findByUserLevel: async (
      userLevelId: string,
      companyId: string
    ): Promise<UserLevelFeaturePermission[]> => {
      const permissions: UserLevelFeaturePermission[] = [];
      for (const [key, perm] of this.userLevelFeaturePermissionsStore.entries()) {
        if (key.startsWith(`${companyId}:${userLevelId}:`)) {
          permissions.push(perm);
        }
      }
      return permissions;
    },

    findByFeature: async (
      featureId: string,
      companyId: string
    ): Promise<UserLevelFeaturePermission[]> => {
      const permissions: UserLevelFeaturePermission[] = [];
      for (const [key, perm] of this.userLevelFeaturePermissionsStore.entries()) {
        if (perm.featureId === featureId && perm.companyId === companyId) {
          permissions.push(perm);
        }
      }
      return permissions;
    },

    find: async (
      userLevelId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<UserLevelFeaturePermission | null> => {
      const key = `${companyId}:${userLevelId}:${featureId}:${action}`;
      return this.userLevelFeaturePermissionsStore.get(key) || null;
    },

    upsert: async (permission: UserLevelFeaturePermission): Promise<void> => {
      const key = `${permission.companyId}:${permission.userLevelId}:${permission.featureId}:${permission.action}`;
      this.userLevelFeaturePermissionsStore.set(key, permission);
    },

    delete: async (
      userLevelId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<boolean> => {
      const key = `${companyId}:${userLevelId}:${featureId}:${action}`;
      return this.userLevelFeaturePermissionsStore.delete(key);
    },

    replaceForUserLevel: async (
      userLevelId: string,
      companyId: string,
      permissions: UserLevelFeaturePermission[]
    ): Promise<void> => {
      // Delete old permissions
      const keysToDelete: string[] = [];
      for (const key of this.userLevelFeaturePermissionsStore.keys()) {
        if (key.startsWith(`${companyId}:${userLevelId}:`)) {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        this.userLevelFeaturePermissionsStore.delete(key);
      }

      // Add new permissions
      for (const perm of permissions) {
        await this.userLevelFeaturePermissions.upsert(perm);
      }
    },
  };

  // User-UserLevel assignments
  userUserLevels = {
    getUserLevels: async (userId: string): Promise<string[]> => {
      return Array.from(this.userUserLevelsStore.get(userId) || new Set());
    },

    getUsers: async (userLevelId: string): Promise<string[]> => {
      return Array.from(this.userLevelUsersStore.get(userLevelId) || new Set());
    },

    add: async (userId: string, userLevelId: string): Promise<void> => {
      this.getOrCreateSet(this.userUserLevelsStore, userId).add(userLevelId);
      this.getOrCreateSet(this.userLevelUsersStore, userLevelId).add(userId);
    },

    remove: async (userId: string, userLevelId: string): Promise<boolean> => {
      const userLevels = this.userUserLevelsStore.get(userId);
      const users = this.userLevelUsersStore.get(userLevelId);

      if (!userLevels?.has(userLevelId)) return false;

      userLevels.delete(userLevelId);
      users?.delete(userId);
      return true;
    },

    replaceForUser: async (userId: string, userLevelIds: string[]): Promise<void> => {
      // Remove old assignments
      const oldUserLevels = this.userUserLevelsStore.get(userId) || new Set();
      for (const userLevelId of oldUserLevels) {
        this.userLevelUsersStore.get(userLevelId)?.delete(userId);
      }

      // Add new assignments
      const newUserLevels = new Set(userLevelIds);
      this.userUserLevelsStore.set(userId, newUserLevels);
      for (const userLevelId of userLevelIds) {
        this.getOrCreateSet(this.userLevelUsersStore, userLevelId).add(userId);
      }
    },
  };

  // Menu Items
  menuItems = {
    findAll: async (companyId: string | null): Promise<MenuItem[]> => {
      return Array.from(this.menuItemsStore.values()).filter(
        (item) => item.companyId === companyId
      );
    },

    findById: async (id: string): Promise<MenuItem | null> => {
      return this.menuItemsStore.get(id) || null;
    },

    create: async (menuItem: MenuItem): Promise<MenuItem> => {
      this.menuItemsStore.set(menuItem.id, menuItem);
      return menuItem;
    },

    update: async (id: string, data: Partial<MenuItem>): Promise<MenuItem | null> => {
      const existing = this.menuItemsStore.get(id);
      if (!existing) return null;

      const updated = { ...existing, ...data };
      this.menuItemsStore.set(id, updated);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      return this.menuItemsStore.delete(id);
    },
  };

  // Sub-Menu Items
  subMenuItems = {
    findByMenuId: async (menuItemId: string): Promise<SubMenuItem[]> => {
      const subItemIds = this.menuItemSubItemsIndex.get(menuItemId) || new Set();
      return Array.from(subItemIds)
        .map((id) => this.subMenuItemsStore.get(id))
        .filter((item): item is SubMenuItem => item !== undefined);
    },

    findById: async (id: string): Promise<SubMenuItem | null> => {
      return this.subMenuItemsStore.get(id) || null;
    },

    create: async (subMenuItem: SubMenuItem): Promise<SubMenuItem> => {
      this.subMenuItemsStore.set(subMenuItem.id, subMenuItem);
      this.getOrCreateSet(this.menuItemSubItemsIndex, subMenuItem.menuItemId).add(subMenuItem.id);
      return subMenuItem;
    },

    update: async (id: string, data: Partial<SubMenuItem>): Promise<SubMenuItem | null> => {
      const existing = this.subMenuItemsStore.get(id);
      if (!existing) return null;

      const updated = { ...existing, ...data };
      this.subMenuItemsStore.set(id, updated);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      const existing = this.subMenuItemsStore.get(id);
      if (!existing) return false;

      this.menuItemSubItemsIndex.get(existing.menuItemId)?.delete(id);
      return this.subMenuItemsStore.delete(id);
    },
  };

  // Navigation Trail
  navTrail = {
    findBySession: async (userId: string, sessionId: string): Promise<NavTrailEntry[]> => {
      const key = `${userId}:${sessionId}`;
      const entryIds = this.navTrailSessionIndex.get(key) || new Set();
      const entries = Array.from(entryIds)
        .map((id) => this.navTrailStore.get(id))
        .filter((e): e is NavTrailEntry => e !== undefined);

      return entries.sort((a, b) => a.depth - b.depth);
    },

    findRecent: async (userId: string, limit: number): Promise<NavTrailEntry[]> => {
      const entries = Array.from(this.navTrailStore.values())
        .filter((e) => e.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return entries.slice(0, limit);
    },

    track: async (entry: NavTrailEntry): Promise<void> => {
      this.navTrailStore.set(entry.id, entry);
      const key = `${entry.userId}:${entry.sessionId}`;
      this.getOrCreateSet(this.navTrailSessionIndex, key).add(entry.id);
    },

    clear: async (userId: string, sessionId: string): Promise<void> => {
      const key = `${userId}:${sessionId}`;
      const entryIds = this.navTrailSessionIndex.get(key) || new Set();

      for (const id of entryIds) {
        this.navTrailStore.delete(id);
      }

      this.navTrailSessionIndex.delete(key);
    },
  };

  // Effective View Permissions (cached)
  effectiveViewPermissions = {
    find: async (
      userId: string,
      viewId: string,
      companyId: string
    ): Promise<EffectiveViewPermission | null> => {
      const key = `${userId}:${companyId}:${viewId}`;
      return this.effectiveViewPermissionsStore.get(key) || null;
    },

    upsert: async (permission: EffectiveViewPermission): Promise<void> => {
      const key = `${permission.userId}:${permission.companyId}:${permission.viewId}`;
      this.effectiveViewPermissionsStore.set(key, permission);
    },

    deleteForUser: async (userId: string, companyId: string): Promise<void> => {
      const keysToDelete: string[] = [];
      for (const key of this.effectiveViewPermissionsStore.keys()) {
        if (key.startsWith(`${userId}:${companyId}:`)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.effectiveViewPermissionsStore.delete(key);
      }
    },
  };

  // Effective Feature Permissions (cached)
  effectiveFeaturePermissions = {
    find: async (
      userId: string,
      featureId: string,
      action: string,
      companyId: string
    ): Promise<EffectiveFeaturePermission | null> => {
      const key = `${userId}:${companyId}:${featureId}:${action}`;
      return this.effectiveFeaturePermissionsStore.get(key) || null;
    },

    upsert: async (permission: EffectiveFeaturePermission): Promise<void> => {
      const key = `${permission.userId}:${permission.companyId}:${permission.featureId}:${permission.action}`;
      this.effectiveFeaturePermissionsStore.set(key, permission);
    },

    deleteForUser: async (userId: string, companyId: string): Promise<void> => {
      const keysToDelete: string[] = [];
      for (const key of this.effectiveFeaturePermissionsStore.keys()) {
        if (key.startsWith(`${userId}:${companyId}:`)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.effectiveFeaturePermissionsStore.delete(key);
      }
    },
  };
}

/**
 * Create IAM Database instance (PostgreSQL only)
 */
function createIAMDatabase(): IAMDatabase {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is required. Please set it in your .env file.\n' +
      'Example: DATABASE_URL=postgresql://user:password@localhost:5432/vertical_vibing'
    );
  }

  console.log('[IAM Database] Using PostgreSQL persistence');

  // Import PostgreSQL implementation
  const { getPostgresClient } = require('../postgres');
  const { PostgreSQLIAMDatabase } = require('./iam-postgres.repository');

  const db = getPostgresClient();
  return new PostgreSQLIAMDatabase(db);
}

// Export singleton instance (PostgreSQL only)
export const iamDb = createIAMDatabase();

// Export InMemoryIAMDatabase for testing purposes only
export { InMemoryIAMDatabase };
