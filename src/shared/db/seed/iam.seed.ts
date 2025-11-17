/**
 * IAM Seed Data
 *
 * Populates the database with baseline Views, Features, Modules, and default configurations
 */

import { db } from '../client';
import type { View, Feature, Module, MenuItem, SubMenuItem, UserLevel } from '@vertical-vibing/shared-types';
import { randomUUID } from 'crypto';

// Helper to get or create IDs
let VIEW_IDS: Record<string, string>;
let FEATURE_IDS: Record<string, string>;
let MODULE_IDS: Record<string, string>;
let MENU_IDS: Record<string, string>;
let SUBMENU_IDS: Record<string, string>;

async function initializeIds() {
  // Fetch existing views and map by URL
  const existingViews = await db.iam.views.findAll();
  const viewsByUrl: Record<string, string> = {};
  existingViews.forEach(v => {
    const key = v.url.replace(/^\//, '').replace(/\//g, '_').replace(/:/g, '') || 'home';
    viewsByUrl[key] = v.id;
  });

  VIEW_IDS = {
    dashboard: viewsByUrl['dashboard'] || randomUUID(),
    home: viewsByUrl['home'] || randomUUID(),
    companies_list: viewsByUrl['companies'] || randomUUID(),
    company_detail: viewsByUrl['companies_id'] || randomUUID(),
    users_list: viewsByUrl['users'] || randomUUID(),
    user_profile: viewsByUrl['profile'] || randomUUID(),
    subscription: viewsByUrl['subscription'] || randomUUID(),
    subscription_plans: viewsByUrl['subscription_plans'] || randomUUID(),
    user_levels: viewsByUrl['user_levels'] || randomUUID(),
    permissions_matrix: viewsByUrl['permissions_matrix'] || randomUUID(),
    settings: viewsByUrl['settings'] || randomUUID(),
    risks: viewsByUrl['risks'] || randomUUID(),
    compliance: viewsByUrl['compliance'] || randomUUID(),
    audit: viewsByUrl['audit'] || randomUUID(),
  };

  // Fetch existing features and map by key
  const existingFeatures = await db.iam.features.findAll();
  const featuresByKey: Record<string, string> = {};
  existingFeatures.forEach(f => {
    if (f.key) {
      const key = f.key.replace(/\./g, '_');
      featuresByKey[key] = f.id;
    }
  });

  FEATURE_IDS = {
    create: featuresByKey['general_create'] || randomUUID(),
    read: featuresByKey['general_read'] || randomUUID(),
    update: featuresByKey['general_update'] || randomUUID(),
    delete: featuresByKey['general_delete'] || randomUUID(),
    export: featuresByKey['general_export'] || randomUUID(),
    company_create: featuresByKey['company_create'] || randomUUID(),
    company_manage: featuresByKey['company_manage'] || randomUUID(),
    company_delete: featuresByKey['company_delete'] || randomUUID(),
    user_invite: featuresByKey['user_invite'] || randomUUID(),
    user_manage: featuresByKey['user_manage'] || randomUUID(),
    user_remove: featuresByKey['user_remove'] || randomUUID(),
    subscription_manage: featuresByKey['subscription_manage'] || randomUUID(),
    subscription_billing: featuresByKey['subscription_billing'] || randomUUID(),
    iam_manage_levels: featuresByKey['iam_manage_levels'] || randomUUID(),
    iam_assign_permissions: featuresByKey['iam_assign_permissions'] || randomUUID(),
    risks_create: featuresByKey['risks_create'] || randomUUID(),
    risks_edit: featuresByKey['risks_edit'] || randomUUID(),
    risks_delete: featuresByKey['risks_delete'] || randomUUID(),
    risks_approve: featuresByKey['risks_approve'] || randomUUID(),
  };

  // Fetch existing modules and map by code
  const existingModules = await db.iam.modules.findAll();
  const modulesByCode: Record<string, string> = {};
  existingModules.forEach(m => {
    modulesByCode[m.code] = m.id;
  });

  MODULE_IDS = {
    core: modulesByCode['core'] || randomUUID(),
    risks: modulesByCode['risks'] || randomUUID(),
    compliance: modulesByCode['compliance'] || randomUUID(),
    audit: modulesByCode['audit'] || randomUUID(),
  };

  // Fetch existing menu items (global menu items have companyId = null)
  const existingMenuItems = await db.iam.menuItems.findAll(null);
  const menusByLabel: Record<string, string> = {};
  existingMenuItems.forEach(m => {
    const key = m.label.toLowerCase().replace(/\s+/g, '_');
    menusByLabel[key] = m.id;
  });

  MENU_IDS = {
    dashboard: menusByLabel['dashboard'] || randomUUID(),
    companies: menusByLabel['companies'] || randomUUID(),
    users: menusByLabel['users'] || randomUUID(),
    modules: menusByLabel['modules'] || randomUUID(),
    admin: menusByLabel['admin'] || randomUUID(),
    settings: menusByLabel['settings'] || randomUUID(),
  };

  // For submenu items, we'll just generate new UUIDs if they don't exist
  // (they'll be fetched when needed during the seed)
  SUBMENU_IDS = {
    risks: randomUUID(),
    compliance: randomUUID(),
    audit: randomUUID(),
    user_levels: randomUUID(),
    permissions: randomUUID(),
    subscription: randomUUID(),
  };
}

/**
 * Seed baseline Views (pages/routes)
 */
async function seedViews(): Promise<void> {
  // Check if views already exist
  const existingViews = await db.iam.views.findAll();
  if (existingViews.length > 0) {
    console.log(`⏭️  Skipping views seed (${existingViews.length} already exist)`);
    return;
  }

  const views: View[] = [
    // Dashboard & Home
    {
      id: VIEW_IDS.dashboard,
      name: 'Dashboard',
      url: '/dashboard',
      createdAt: new Date(),
    },
    {
      id: VIEW_IDS.home,
      name: 'Home',
      url: '/home',
      createdAt: new Date(),
    },

    // Companies Management
    {
      id: VIEW_IDS.companies_list,
      name: 'Companies List',
      url: '/companies',
      createdAt: new Date(),
    },
    {
      id: VIEW_IDS.company_detail,
      name: 'Company Detail',
      url: '/companies/:id',
      createdAt: new Date(),
    },

    // User Management
    {
      id: VIEW_IDS.users_list,
      name: 'Users List',
      url: '/users',
      createdAt: new Date(),
    },
    {
      id: VIEW_IDS.user_profile,
      name: 'User Profile',
      url: '/profile',
      createdAt: new Date(),
    },

    // Subscription Management
    {
      id: VIEW_IDS.subscription,
      name: 'Subscription',
      url: '/subscription',
      createdAt: new Date(),
    },
    {
      id: VIEW_IDS.subscription_plans,
      name: 'Subscription Plans',
      url: '/subscription/plans',
      createdAt: new Date(),
    },

    // IAM Management (Client Admin)
    {
      id: VIEW_IDS.user_levels,
      name: 'User Levels',
      url: '/admin/user-levels',
      createdAt: new Date(),
    },
    {
      id: VIEW_IDS.permissions_matrix,
      name: 'Permissions Matrix',
      url: '/admin/permissions',
      createdAt: new Date(),
    },

    // Settings
    {
      id: VIEW_IDS.settings,
      name: 'Settings',
      url: '/settings',
      createdAt: new Date(),
    },

    // Example Module Views (for use cases from the roadmap)
    {
      id: VIEW_IDS.risks,
      name: 'Risks',
      url: '/modules/risks',
      createdAt: new Date(),
    },
    {
      id: VIEW_IDS.compliance,
      name: 'Compliance',
      url: '/modules/compliance',
      createdAt: new Date(),
    },
    {
      id: VIEW_IDS.audit,
      name: 'Audit',
      url: '/modules/audit',
      createdAt: new Date(),
    },
  ];

  for (const view of views) {
    await db.iam.views.create(view);
  }

  console.log(`✅ Seeded ${views.length} views`);
}

/**
 * Seed baseline Features (actions/capabilities)
 */
async function seedFeatures(): Promise<void> {
  // Check if features already exist
  const existingFeatures = await db.iam.features.findAll();
  if (existingFeatures.length > 0) {
    console.log(`⏭️  Skipping features seed (${existingFeatures.length} already exist)`);
    return;
  }

  const features: Feature[] = [
    // General CRUD features
    {
      id: FEATURE_IDS.create,
      name: 'Create',
      key: 'general.create',
      description: 'Create new records',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.read,
      name: 'Read',
      key: 'general.read',
      description: 'View records',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.update,
      name: 'Update',
      key: 'general.update',
      description: 'Edit existing records',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.delete,
      name: 'Delete',
      key: 'general.delete',
      description: 'Delete records',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.export,
      name: 'Export',
      key: 'general.export',
      description: 'Export data',
      createdAt: new Date(),
    },

    // Company-specific features
    {
      id: FEATURE_IDS.company_create,
      name: 'Create Company',
      key: 'companies.create',
      description: 'Create new companies',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.company_manage,
      name: 'Manage Company',
      key: 'companies.manage',
      description: 'Edit company details',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.company_delete,
      name: 'Delete Company',
      key: 'companies.delete',
      description: 'Delete companies',
      createdAt: new Date(),
    },

    // User management features
    {
      id: FEATURE_IDS.user_invite,
      name: 'Invite Users',
      key: 'users.invite',
      description: 'Invite new users to the company',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.user_manage,
      name: 'Manage Users',
      key: 'users.manage',
      description: 'Edit user details and roles',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.user_remove,
      name: 'Remove Users',
      key: 'users.remove',
      description: 'Remove users from the company',
      createdAt: new Date(),
    },

    // Subscription features
    {
      id: FEATURE_IDS.subscription_manage,
      name: 'Manage Subscription',
      key: 'subscription.manage',
      description: 'Change subscription plan',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.subscription_billing,
      name: 'View Billing',
      key: 'subscription.billing',
      description: 'View billing information',
      createdAt: new Date(),
    },

    // IAM features
    {
      id: FEATURE_IDS.iam_manage_levels,
      name: 'Manage User Levels',
      key: 'iam.manage_levels',
      description: 'Create and edit user levels/roles',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.iam_assign_permissions,
      name: 'Assign Permissions',
      key: 'iam.assign_permissions',
      description: 'Configure permissions for user levels',
      createdAt: new Date(),
    },

    // Module-specific features (Risks example)
    {
      id: FEATURE_IDS.risks_create,
      name: 'Create Risks',
      key: 'risks.create',
      description: 'Create new risk entries',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.risks_edit,
      name: 'Edit Risks',
      key: 'risks.edit',
      description: 'Edit risk entries',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.risks_delete,
      name: 'Delete Risks',
      key: 'risks.delete',
      description: 'Delete risk entries',
      createdAt: new Date(),
    },
    {
      id: FEATURE_IDS.risks_approve,
      name: 'Approve Risks',
      key: 'risks.approve',
      description: 'Approve risk assessments',
      createdAt: new Date(),
    },
  ];

  for (const feature of features) {
    await db.iam.features.create(feature);
  }

  console.log(`✅ Seeded ${features.length} features`);
}

/**
 * Seed baseline Modules
 */
async function seedModules(): Promise<void> {
  // Check if modules already exist
  const existingModules = await db.iam.modules.findAll();
  if (existingModules.length > 0) {
    console.log(`⏭️  Skipping modules seed (${existingModules.length} already exist)`);
    return;
  }

  const modules: Module[] = [
    {
      id: MODULE_IDS.core,
      name: 'Core Platform',
      code: 'core',
      description: 'Essential platform features - always included',
      createdAt: new Date(),
    },
    {
      id: MODULE_IDS.risks,
      name: 'Risk Management',
      code: 'risks',
      description: 'Risk assessment and tracking module',
      createdAt: new Date(),
    },
    {
      id: MODULE_IDS.compliance,
      name: 'Compliance Management',
      code: 'compliance',
      description: 'Regulatory compliance tracking',
      createdAt: new Date(),
    },
    {
      id: MODULE_IDS.audit,
      name: 'Audit Management',
      code: 'audit',
      description: 'Internal and external audit tracking',
      createdAt: new Date(),
    },
  ];

  for (const module of modules) {
    await db.iam.modules.create(module);
  }

  console.log(`✅ Seeded ${modules.length} modules`);
}

/**
 * Create Feature-View mappings
 */
async function seedFeatureViewMappings(): Promise<void> {
  // Check if mappings already exist by checking if any feature has views
  const features = await db.iam.features.findAll();
  if (features.length > 0) {
    const viewsForFirstFeature = await db.iam.feature2Views.getViewsByFeature(features[0].id);
    if (viewsForFirstFeature.length > 0) {
      console.log(`⏭️  Skipping feature-view mappings seed (mappings already exist)`);
      return;
    }
  }

  const mappings: Array<{ featureId: string; viewId: string }> = [
    // General CRUD features apply to most views
    { featureId: FEATURE_IDS.create, viewId: VIEW_IDS.companies_list },
    { featureId: FEATURE_IDS.read, viewId: VIEW_IDS.companies_list },
    { featureId: FEATURE_IDS.update, viewId: VIEW_IDS.company_detail },
    { featureId: FEATURE_IDS.delete, viewId: VIEW_IDS.company_detail },

    // Company-specific features
    { featureId: FEATURE_IDS.company_create, viewId: VIEW_IDS.companies_list },
    { featureId: FEATURE_IDS.company_manage, viewId: VIEW_IDS.company_detail },
    { featureId: FEATURE_IDS.company_delete, viewId: VIEW_IDS.company_detail },

    // User management features
    { featureId: FEATURE_IDS.user_invite, viewId: VIEW_IDS.users_list },
    { featureId: FEATURE_IDS.user_manage, viewId: VIEW_IDS.users_list },
    { featureId: FEATURE_IDS.user_remove, viewId: VIEW_IDS.users_list },

    // IAM features
    { featureId: FEATURE_IDS.iam_manage_levels, viewId: VIEW_IDS.user_levels },
    { featureId: FEATURE_IDS.iam_assign_permissions, viewId: VIEW_IDS.permissions_matrix },

    // Risks features
    { featureId: FEATURE_IDS.risks_create, viewId: VIEW_IDS.risks },
    { featureId: FEATURE_IDS.risks_edit, viewId: VIEW_IDS.risks },
    { featureId: FEATURE_IDS.risks_delete, viewId: VIEW_IDS.risks },
    { featureId: FEATURE_IDS.risks_approve, viewId: VIEW_IDS.risks },
  ];

  for (const { featureId, viewId } of mappings) {
    await db.iam.feature2Views.add(featureId, viewId);
  }

  console.log(`✅ Created ${mappings.length} feature-view mappings`);
}

/**
 * Create Module-View mappings
 */
async function seedModuleViewMappings(): Promise<void> {
  // Check if mappings already exist by checking if any module has views
  const modules = await db.iam.modules.findAll();
  if (modules.length > 0) {
    const viewsForFirstModule = await db.iam.module2Views.getViewsByModule(modules[0].id);
    if (viewsForFirstModule.length > 0) {
      console.log(`⏭️  Skipping module-view mappings seed (mappings already exist)`);
      return;
    }
  }

  const mappings: Array<{ moduleId: string; viewId: string }> = [
    // Core module - essential views
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.dashboard },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.home },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.companies_list },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.company_detail },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.users_list },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.user_profile },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.subscription },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.subscription_plans },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.user_levels },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.permissions_matrix },
    { moduleId: MODULE_IDS.core, viewId: VIEW_IDS.settings },

    // Risks module
    { moduleId: MODULE_IDS.risks, viewId: VIEW_IDS.risks },

    // Compliance module
    { moduleId: MODULE_IDS.compliance, viewId: VIEW_IDS.compliance },

    // Audit module
    { moduleId: MODULE_IDS.audit, viewId: VIEW_IDS.audit },
  ];

  for (const { moduleId, viewId } of mappings) {
    await db.iam.module2Views.add(moduleId, viewId);
  }

  console.log(`✅ Created ${mappings.length} module-view mappings`);
}

/**
 * Seed default menu structure (global)
 */
async function seedDefaultMenu(): Promise<void> {
  // Check if menu items already exist
  const existingMenuItems = await db.iam.menuItems.findAll();
  if (existingMenuItems.length > 0) {
    console.log(`⏭️  Skipping menu seed (${existingMenuItems.length} already exist)`);
    return;
  }

  const menuItems: MenuItem[] = [
    {
      id: MENU_IDS.dashboard,
      companyId: null, // Global menu
      label: 'Dashboard',
      sequenceIndex: 0,
      viewId: VIEW_IDS.dashboard,
      featureId: null,
      isEntrypoint: true,
      icon: 'dashboard',
    },
    {
      id: MENU_IDS.companies,
      companyId: null,
      label: 'Companies',
      sequenceIndex: 1,
      viewId: VIEW_IDS.companies_list,
      featureId: null,
      isEntrypoint: false,
      icon: 'business',
    },
    {
      id: MENU_IDS.users,
      companyId: null,
      label: 'Users',
      sequenceIndex: 2,
      viewId: VIEW_IDS.users_list,
      featureId: null,
      isEntrypoint: false,
      icon: 'people',
    },
    {
      id: MENU_IDS.modules,
      companyId: null,
      label: 'Modules',
      sequenceIndex: 3,
      viewId: null,
      featureId: null,
      isEntrypoint: false,
      icon: 'apps',
    },
    {
      id: MENU_IDS.admin,
      companyId: null,
      label: 'Administration',
      sequenceIndex: 4,
      viewId: null,
      featureId: null,
      isEntrypoint: false,
      icon: 'admin_panel_settings',
    },
    {
      id: MENU_IDS.settings,
      companyId: null,
      label: 'Settings',
      sequenceIndex: 5,
      viewId: VIEW_IDS.settings,
      featureId: null,
      isEntrypoint: false,
      icon: 'settings',
    },
  ];

  const subMenuItems: SubMenuItem[] = [
    // Modules sub-menu
    {
      id: SUBMENU_IDS.risks,
      companyId: null,
      menuItemId: MENU_IDS.modules,
      label: 'Risks',
      sequenceIndex: 0,
      viewId: VIEW_IDS.risks,
      featureId: null,
    },
    {
      id: SUBMENU_IDS.compliance,
      companyId: null,
      menuItemId: MENU_IDS.modules,
      label: 'Compliance',
      sequenceIndex: 1,
      viewId: VIEW_IDS.compliance,
      featureId: null,
    },
    {
      id: SUBMENU_IDS.audit,
      companyId: null,
      menuItemId: MENU_IDS.modules,
      label: 'Audit',
      sequenceIndex: 2,
      viewId: VIEW_IDS.audit,
      featureId: null,
    },

    // Administration sub-menu
    {
      id: SUBMENU_IDS.user_levels,
      companyId: null,
      menuItemId: MENU_IDS.admin,
      label: 'User Levels',
      sequenceIndex: 0,
      viewId: VIEW_IDS.user_levels,
      featureId: FEATURE_IDS.iam_manage_levels,
    },
    {
      id: SUBMENU_IDS.permissions,
      companyId: null,
      menuItemId: MENU_IDS.admin,
      label: 'Permissions',
      sequenceIndex: 1,
      viewId: VIEW_IDS.permissions_matrix,
      featureId: FEATURE_IDS.iam_assign_permissions,
    },
    {
      id: SUBMENU_IDS.subscription,
      companyId: null,
      menuItemId: MENU_IDS.settings,
      label: 'Subscription',
      sequenceIndex: 0,
      viewId: VIEW_IDS.subscription,
      featureId: null,
    },
  ];

  for (const item of menuItems) {
    await db.iam.menuItems.create(item);
  }

  for (const subItem of subMenuItems) {
    await db.iam.subMenuItems.create(subItem);
  }

  console.log(`✅ Seeded ${menuItems.length} menu items and ${subMenuItems.length} sub-menu items`);
}

/**
 * Create default User Levels for a company
 * This should be called when a new company is created
 */
export async function seedDefaultUserLevelsForCompany(companyId: string): Promise<void> {
  const userLevels: Omit<UserLevel, 'id'>[] = [
    {
      companyId,
      name: 'Admin',
      description: 'Full access to all features and settings',
      createdAt: new Date(),
    },
    {
      companyId,
      name: 'Member',
      description: 'Standard user with create, read, and update permissions',
      createdAt: new Date(),
    },
    {
      companyId,
      name: 'Visitor',
      description: 'Read-only access - can view but not edit or delete',
      createdAt: new Date(),
    },
  ];

  for (const level of userLevels) {
    const id = crypto.randomUUID();
    await db.iam.userLevels.create({
      id,
      ...level,
    });

    // Set default permissions for each level
    if (level.name === 'Admin') {
      // Admin gets all permissions
      await setAdminPermissions(id, companyId);
    } else if (level.name === 'Member') {
      // Member gets create/read/update but not delete
      await setMemberPermissions(id, companyId);
    } else if (level.name === 'Visitor') {
      // Visitor gets read-only
      await setVisitorPermissions(id, companyId);
    }
  }

  console.log(`✅ Created ${userLevels.length} default user levels for company ${companyId}`);
}

/**
 * Set Admin permissions (full access)
 */
async function setAdminPermissions(userLevelId: string, companyId: string): Promise<void> {
  // Grant access to all views
  const views = await db.iam.views.findAll();
  for (const view of views) {
    await db.iam.userLevelViewPermissions.upsert({
      companyId,
      userLevelId,
      viewId: view.id,
      state: 'allow',
      modifiable: true,
    });
  }

  // Grant all feature permissions with 'any' scope
  const features = await db.iam.features.findAll();
  for (const feature of features) {
    const actions = ['Create', 'Read', 'Update', 'Delete', 'Export', 'Approve'];
    for (const action of actions) {
      await db.iam.userLevelFeaturePermissions.upsert({
        companyId,
        userLevelId,
        featureId: feature.id,
        action,
        value: true,
        scope: 'any',
        modifiable: true,
      });
    }
  }
}

/**
 * Set Member permissions (create/read/update, company scope)
 */
async function setMemberPermissions(userLevelId: string, companyId: string): Promise<void> {
  // Grant access to most views (exclude admin views)
  const views = await db.iam.views.findAll();
  for (const view of views) {
    const isAdminView = view.url.startsWith('/admin');
    await db.iam.userLevelViewPermissions.upsert({
      companyId,
      userLevelId,
      viewId: view.id,
      state: isAdminView ? 'deny' : 'allow',
      modifiable: true,
    });
  }

  // Grant create/read/update with company scope, deny delete
  const features = await db.iam.features.findAll();
  for (const feature of features) {
    // Read permission for all
    await db.iam.userLevelFeaturePermissions.upsert({
      companyId,
      userLevelId,
      featureId: feature.id,
      action: 'Read',
      value: true,
      scope: 'company',
      modifiable: true,
    });

    // Create and Update for most features
    if (!feature.key?.includes('iam.')) {
      await db.iam.userLevelFeaturePermissions.upsert({
        companyId,
        userLevelId,
        featureId: feature.id,
        action: 'Create',
        value: true,
        scope: 'company',
        modifiable: true,
      });

      await db.iam.userLevelFeaturePermissions.upsert({
        companyId,
        userLevelId,
        featureId: feature.id,
        action: 'Update',
        value: true,
        scope: 'company',
        modifiable: true,
      });
    }

    // Deny Delete and Admin actions
    await db.iam.userLevelFeaturePermissions.upsert({
      companyId,
      userLevelId,
      featureId: feature.id,
      action: 'Delete',
      value: false,
      scope: 'company',
      modifiable: true,
    });
  }
}

/**
 * Set Visitor permissions (read-only)
 */
async function setVisitorPermissions(userLevelId: string, companyId: string): Promise<void> {
  // Grant access to views but deny admin views
  const views = await db.iam.views.findAll();
  for (const view of views) {
    const isAdminView = view.url.startsWith('/admin');
    await db.iam.userLevelViewPermissions.upsert({
      companyId,
      userLevelId,
      viewId: view.id,
      state: isAdminView ? 'deny' : 'allow',
      modifiable: true,
    });
  }

  // Only grant Read permission
  const features = await db.iam.features.findAll();
  for (const feature of features) {
    await db.iam.userLevelFeaturePermissions.upsert({
      companyId,
      userLevelId,
      featureId: feature.id,
      action: 'Read',
      value: true,
      scope: 'company',
      modifiable: true,
    });

    // Deny all other actions
    const denyActions = ['Create', 'Update', 'Delete', 'Export', 'Approve'];
    for (const action of denyActions) {
      await db.iam.userLevelFeaturePermissions.upsert({
        companyId,
        userLevelId,
        featureId: feature.id,
        action,
        value: false,
        scope: 'company',
        modifiable: true,
      });
    }
  }
}

/**
 * Main seed function - runs all seeders
 */
export async function seedIAMData(): Promise<void> {
  console.log('🌱 Starting IAM seed...');

  try {
    // Initialize IDs from existing data first
    await initializeIds();

    await seedViews();
    await seedFeatures();
    await seedModules();
    await seedFeatureViewMappings();
    await seedModuleViewMappings();
    await seedDefaultMenu();

    console.log('✅ IAM seed completed successfully!');
  } catch (error) {
    console.error('❌ IAM seed failed:', error);
    throw error;
  }
}
