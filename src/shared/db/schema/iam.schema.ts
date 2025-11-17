/**
 * IAM Database Schema (Drizzle ORM)
 *
 * Production-ready PostgreSQL schema for IAM entities
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ----- Core IAM Entities -----

/**
 * Views - Pages/screens in the application
 */
export const views = pgTable('views', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 500 }).notNull().unique(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  requiresAuth: boolean('requires_auth').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    urlIdx: index('views_url_idx').on(table.url),
  };
});

/**
 * Modules - High-level feature groups
 */
export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  enabled: boolean('enabled').default(true).notNull(),
  priority: varchar('priority', { length: 20 }).default('standard').notNull(), // 'standard' | 'optional' | 'premium'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    codeIdx: index('modules_code_idx').on(table.code),
  };
});

/**
 * Features - Granular permission units
 */
export const features = pgTable('features', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 255 }).unique(), // e.g., 'feature_users_manage'
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  resourceType: varchar('resource_type', { length: 100 }), // e.g., 'users', 'companies'
  actions: text('actions'), // JSON array of supported actions
  category: varchar('category', { length: 100 }),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    keyIdx: index('features_key_idx').on(table.key),
  };
});

/**
 * User Levels - Permission roles (multi-tenant)
 */
export const userLevels = pgTable('user_levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(), // Tenant isolation
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    companyIdx: index('user_levels_company_idx').on(table.companyId),
    companyNameIdx: index('user_levels_company_name_idx').on(table.companyId, table.name),
  };
});

// ----- Relation Tables -----

/**
 * Feature to View mapping
 */
export const feature2Views = pgTable('feature2views', {
  featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  viewId: uuid('view_id').notNull().references(() => views.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.featureId, table.viewId] }),
    featureIdx: index('feature2views_feature_idx').on(table.featureId),
    viewIdx: index('feature2views_view_idx').on(table.viewId),
  };
});

/**
 * Module to View mapping
 */
export const module2Views = pgTable('module2views', {
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  viewId: uuid('view_id').notNull().references(() => views.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.moduleId, table.viewId] }),
    moduleIdx: index('module2views_module_idx').on(table.moduleId),
    viewIdx: index('module2views_view_idx').on(table.viewId),
  };
});

/**
 * Company to Module mapping (module access control)
 */
export const company2Modules = pgTable('company2modules', {
  companyId: uuid('company_id').notNull(),
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.companyId, table.moduleId] }),
    companyIdx: index('company2modules_company_idx').on(table.companyId),
    moduleIdx: index('company2modules_module_idx').on(table.moduleId),
  };
});

/**
 * Module to Feature mapping
 */
export const module2Features = pgTable('module2features', {
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.moduleId, table.featureId] }),
    moduleIdx: index('module2features_module_idx').on(table.moduleId),
    featureIdx: index('module2features_feature_idx').on(table.featureId),
  };
});

// ----- Permission Tables -----

/**
 * User Level View Permissions
 */
export const userLevelViewPermissions = pgTable('user_level_view_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  userLevelId: uuid('user_level_id').notNull().references(() => userLevels.id, { onDelete: 'cascade' }),
  viewId: uuid('view_id').notNull().references(() => views.id, { onDelete: 'cascade' }),
  state: varchar('state', { length: 20 }).notNull(), // 'allow' | 'deny' | 'inherit'
  modifiable: boolean('modifiable').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    companyUserLevelViewIdx: index('ulvp_company_level_view_idx').on(table.companyId, table.userLevelId, table.viewId),
    companyUserLevelViewUnique: uniqueIndex('ulvp_unique_idx').on(table.companyId, table.userLevelId, table.viewId),
    userLevelIdx: index('ulvp_user_level_idx').on(table.userLevelId),
    viewIdx: index('ulvp_view_idx').on(table.viewId),
  };
});

/**
 * User Level Feature Permissions
 */
export const userLevelFeaturePermissions = pgTable('user_level_feature_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  userLevelId: uuid('user_level_id').notNull().references(() => userLevels.id, { onDelete: 'cascade' }),
  featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(), // 'Create', 'Read', 'Update', 'Delete', 'Export', 'Approve'
  value: boolean('value').notNull(), // true = allowed, false = denied
  scope: varchar('scope', { length: 20 }).notNull(), // 'own' | 'team' | 'company' | 'any'
  modifiable: boolean('modifiable').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    companyUserLevelFeatureActionIdx: index('ulfp_company_level_feature_action_idx').on(
      table.companyId,
      table.userLevelId,
      table.featureId,
      table.action
    ),
    companyUserLevelFeatureActionUnique: uniqueIndex('ulfp_unique_idx').on(
      table.companyId,
      table.userLevelId,
      table.featureId,
      table.action
    ),
    userLevelIdx: index('ulfp_user_level_idx').on(table.userLevelId),
    featureIdx: index('ulfp_feature_idx').on(table.featureId),
  };
});

/**
 * User to User Level assignments (many-to-many)
 */
export const userUserLevels = pgTable('user_user_levels', {
  userId: uuid('user_id').notNull(),
  userLevelId: uuid('user_level_id').notNull().references(() => userLevels.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.userLevelId] }),
    userIdx: index('user_user_levels_user_idx').on(table.userId),
    levelIdx: index('user_user_levels_level_idx').on(table.userLevelId),
  };
});

// ----- Menu & Navigation Tables -----

/**
 * Menu Items
 */
export const menuItems = pgTable('menu_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id'), // null = global menu
  label: varchar('label', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 100 }),
  priority: varchar('priority', { length: 20 }).default('standard').notNull(),
  requiredPermissions: text('required_permissions'), // JSON array
  sortOrder: varchar('sort_order', { length: 50 }),
  viewId: uuid('view_id').references(() => views.id, { onDelete: 'set null' }), // Optional direct link to view
  featureId: uuid('feature_id').references(() => features.id, { onDelete: 'set null' }), // Optional feature for permissions
  isEntrypoint: boolean('is_entrypoint').default(true).notNull(), // Whether to show in navigation
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    companyIdx: index('menu_items_company_idx').on(table.companyId),
    viewIdx: index('menu_items_view_idx').on(table.viewId),
  };
});

/**
 * Sub-Menu Items
 */
export const subMenuItems = pgTable('sub_menu_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 255 }).notNull(),
  viewId: uuid('view_id').references(() => views.id, { onDelete: 'set null' }),
  featureId: uuid('feature_id').references(() => features.id, { onDelete: 'set null' }), // Optional feature for permissions
  icon: varchar('icon', { length: 100 }),
  sortOrder: varchar('sort_order', { length: 50 }),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    menuItemIdx: index('sub_menu_items_menu_item_idx').on(table.menuItemId),
    viewIdx: index('sub_menu_items_view_idx').on(table.viewId),
  };
});

// ----- Navigation Trail -----

/**
 * Navigation Trail (breadcrumb tracking)
 */
export const navTrail = pgTable('nav_trail', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  viewId: uuid('view_id').references(() => views.id, { onDelete: 'set null' }),
  url: varchar('url', { length: 500 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  depth: varchar('depth', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    userSessionIdx: index('nav_trail_user_session_idx').on(table.userId, table.sessionId),
    userIdx: index('nav_trail_user_idx').on(table.userId),
  };
});

// ----- Effective Permissions Cache -----

/**
 * Effective View Permissions (computed/cached)
 */
export const effectiveViewPermissions = pgTable('effective_view_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  companyId: uuid('company_id').notNull(),
  viewId: uuid('view_id').notNull().references(() => views.id, { onDelete: 'cascade' }),
  hasAccess: boolean('has_access').notNull(),
  computedAt: timestamp('computed_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(), // Cache TTL
}, (table) => {
  return {
    userCompanyViewIdx: index('evp_user_company_view_idx').on(table.userId, table.companyId, table.viewId),
    userCompanyViewUnique: uniqueIndex('evp_unique_idx').on(table.userId, table.companyId, table.viewId),
    expiresIdx: index('evp_expires_idx').on(table.expiresAt), // For cleanup
  };
});

/**
 * Effective Feature Permissions (computed/cached)
 */
export const effectiveFeaturePermissions = pgTable('effective_feature_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  companyId: uuid('company_id').notNull(),
  featureId: uuid('feature_id').notNull().references(() => features.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  allowed: boolean('allowed').notNull(),
  scope: varchar('scope', { length: 20 }).notNull(),
  computedAt: timestamp('computed_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(), // Cache TTL
}, (table) => {
  return {
    userCompanyFeatureActionIdx: index('efp_user_company_feature_action_idx').on(
      table.userId,
      table.companyId,
      table.featureId,
      table.action
    ),
    userCompanyFeatureActionUnique: uniqueIndex('efp_unique_idx').on(
      table.userId,
      table.companyId,
      table.featureId,
      table.action
    ),
    expiresIdx: index('efp_expires_idx').on(table.expiresAt), // For cleanup
  };
});

// ----- Audit Logs -----

/**
 * IAM Audit Logs
 */
export const iamAuditLogs = pgTable('iam_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(), // e.g., 'user_level.created'
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'user-level' | 'permission' | 'assignment'
  entityId: uuid('entity_id').notNull(),
  changes: text('changes'), // JSON
  metadata: text('metadata'), // JSON
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => {
  return {
    companyTimestampIdx: index('iam_audit_company_timestamp_idx').on(table.companyId, table.timestamp),
    entityIdx: index('iam_audit_entity_idx').on(table.entityType, table.entityId),
    userIdx: index('iam_audit_user_idx').on(table.userId),
    timestampIdx: index('iam_audit_timestamp_idx').on(table.timestamp),
  };
});

// ----- Drizzle Relations (for joins) -----

export const userLevelsRelations = relations(userLevels, ({ many }) => ({
  viewPermissions: many(userLevelViewPermissions),
  featurePermissions: many(userLevelFeaturePermissions),
  userAssignments: many(userUserLevels),
}));

export const viewsRelations = relations(views, ({ many }) => ({
  viewPermissions: many(userLevelViewPermissions),
  feature2Views: many(feature2Views),
  module2Views: many(module2Views),
  subMenuItems: many(subMenuItems),
}));

export const featuresRelations = relations(features, ({ many }) => ({
  featurePermissions: many(userLevelFeaturePermissions),
  feature2Views: many(feature2Views),
  module2Features: many(module2Features),
}));

export const modulesRelations = relations(modules, ({ many }) => ({
  module2Views: many(module2Views),
  module2Features: many(module2Features),
  company2Modules: many(company2Modules),
}));
