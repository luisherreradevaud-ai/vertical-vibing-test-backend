/**
 * IAM Seed Data
 *
 * Populates the database with baseline Views, Features, Modules, and default configurations
 */

import { db } from '../client';
import type { View, Feature, Module, MenuItem, SubMenuItem, UserLevel } from '@vertical-vibing/shared-types';

/**
 * Seed baseline Views (pages/routes)
 */
async function seedViews(): Promise<void> {
  const views: View[] = [
    // Dashboard & Home
    {
      id: 'view_dashboard',
      name: 'Dashboard',
      url: '/dashboard',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'view_home',
      name: 'Home',
      url: '/home',
      createdAt: new Date().toISOString(),
    },

    // Companies Management
    {
      id: 'view_companies_list',
      name: 'Companies List',
      url: '/companies',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'view_company_detail',
      name: 'Company Detail',
      url: '/companies/:id',
      createdAt: new Date().toISOString(),
    },

    // User Management
    {
      id: 'view_users_list',
      name: 'Users List',
      url: '/users',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'view_user_profile',
      name: 'User Profile',
      url: '/profile',
      createdAt: new Date().toISOString(),
    },

    // Subscription Management
    {
      id: 'view_subscription',
      name: 'Subscription',
      url: '/subscription',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'view_subscription_plans',
      name: 'Subscription Plans',
      url: '/subscription/plans',
      createdAt: new Date().toISOString(),
    },

    // IAM Management (Client Admin)
    {
      id: 'view_user_levels',
      name: 'User Levels',
      url: '/admin/user-levels',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'view_permissions_matrix',
      name: 'Permissions Matrix',
      url: '/admin/permissions',
      createdAt: new Date().toISOString(),
    },

    // Settings
    {
      id: 'view_settings',
      name: 'Settings',
      url: '/settings',
      createdAt: new Date().toISOString(),
    },

    // Example Module Views (for use cases from the roadmap)
    {
      id: 'view_risks',
      name: 'Risks',
      url: '/modules/risks',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'view_compliance',
      name: 'Compliance',
      url: '/modules/compliance',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'view_audit',
      name: 'Audit',
      url: '/modules/audit',
      createdAt: new Date().toISOString(),
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
  const features: Feature[] = [
    // General CRUD features
    {
      id: 'feature_create',
      name: 'Create',
      key: 'general.create',
      description: 'Create new records',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_read',
      name: 'Read',
      key: 'general.read',
      description: 'View records',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_update',
      name: 'Update',
      key: 'general.update',
      description: 'Edit existing records',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_delete',
      name: 'Delete',
      key: 'general.delete',
      description: 'Delete records',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_export',
      name: 'Export',
      key: 'general.export',
      description: 'Export data',
      createdAt: new Date().toISOString(),
    },

    // Company-specific features
    {
      id: 'feature_company_create',
      name: 'Create Company',
      key: 'companies.create',
      description: 'Create new companies',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_company_manage',
      name: 'Manage Company',
      key: 'companies.manage',
      description: 'Edit company details',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_company_delete',
      name: 'Delete Company',
      key: 'companies.delete',
      description: 'Delete companies',
      createdAt: new Date().toISOString(),
    },

    // User management features
    {
      id: 'feature_user_invite',
      name: 'Invite Users',
      key: 'users.invite',
      description: 'Invite new users to the company',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_user_manage',
      name: 'Manage Users',
      key: 'users.manage',
      description: 'Edit user details and roles',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_user_remove',
      name: 'Remove Users',
      key: 'users.remove',
      description: 'Remove users from the company',
      createdAt: new Date().toISOString(),
    },

    // Subscription features
    {
      id: 'feature_subscription_manage',
      name: 'Manage Subscription',
      key: 'subscription.manage',
      description: 'Change subscription plan',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_subscription_billing',
      name: 'View Billing',
      key: 'subscription.billing',
      description: 'View billing information',
      createdAt: new Date().toISOString(),
    },

    // IAM features
    {
      id: 'feature_iam_manage_levels',
      name: 'Manage User Levels',
      key: 'iam.manage_levels',
      description: 'Create and edit user levels/roles',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_iam_assign_permissions',
      name: 'Assign Permissions',
      key: 'iam.assign_permissions',
      description: 'Configure permissions for user levels',
      createdAt: new Date().toISOString(),
    },

    // Module-specific features (Risks example)
    {
      id: 'feature_risks_create',
      name: 'Create Risks',
      key: 'risks.create',
      description: 'Create new risk entries',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_risks_edit',
      name: 'Edit Risks',
      key: 'risks.edit',
      description: 'Edit risk entries',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_risks_delete',
      name: 'Delete Risks',
      key: 'risks.delete',
      description: 'Delete risk entries',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'feature_risks_approve',
      name: 'Approve Risks',
      key: 'risks.approve',
      description: 'Approve risk assessments',
      createdAt: new Date().toISOString(),
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
  const modules: Module[] = [
    {
      id: 'module_core',
      name: 'Core Platform',
      code: 'core',
      description: 'Essential platform features - always included',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'module_risks',
      name: 'Risk Management',
      code: 'risks',
      description: 'Risk assessment and tracking module',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'module_compliance',
      name: 'Compliance Management',
      code: 'compliance',
      description: 'Regulatory compliance tracking',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'module_audit',
      name: 'Audit Management',
      code: 'audit',
      description: 'Internal and external audit tracking',
      createdAt: new Date().toISOString(),
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
  const mappings: Array<{ featureId: string; viewId: string }> = [
    // General CRUD features apply to most views
    { featureId: 'feature_create', viewId: 'view_companies_list' },
    { featureId: 'feature_read', viewId: 'view_companies_list' },
    { featureId: 'feature_update', viewId: 'view_company_detail' },
    { featureId: 'feature_delete', viewId: 'view_company_detail' },

    // Company-specific features
    { featureId: 'feature_company_create', viewId: 'view_companies_list' },
    { featureId: 'feature_company_manage', viewId: 'view_company_detail' },
    { featureId: 'feature_company_delete', viewId: 'view_company_detail' },

    // User management features
    { featureId: 'feature_user_invite', viewId: 'view_users_list' },
    { featureId: 'feature_user_manage', viewId: 'view_users_list' },
    { featureId: 'feature_user_remove', viewId: 'view_users_list' },

    // IAM features
    { featureId: 'feature_iam_manage_levels', viewId: 'view_user_levels' },
    { featureId: 'feature_iam_assign_permissions', viewId: 'view_permissions_matrix' },

    // Risks features
    { featureId: 'feature_risks_create', viewId: 'view_risks' },
    { featureId: 'feature_risks_edit', viewId: 'view_risks' },
    { featureId: 'feature_risks_delete', viewId: 'view_risks' },
    { featureId: 'feature_risks_approve', viewId: 'view_risks' },
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
  const mappings: Array<{ moduleId: string; viewId: string }> = [
    // Core module - essential views
    { moduleId: 'module_core', viewId: 'view_dashboard' },
    { moduleId: 'module_core', viewId: 'view_home' },
    { moduleId: 'module_core', viewId: 'view_companies_list' },
    { moduleId: 'module_core', viewId: 'view_company_detail' },
    { moduleId: 'module_core', viewId: 'view_users_list' },
    { moduleId: 'module_core', viewId: 'view_user_profile' },
    { moduleId: 'module_core', viewId: 'view_subscription' },
    { moduleId: 'module_core', viewId: 'view_subscription_plans' },
    { moduleId: 'module_core', viewId: 'view_user_levels' },
    { moduleId: 'module_core', viewId: 'view_permissions_matrix' },
    { moduleId: 'module_core', viewId: 'view_settings' },

    // Risks module
    { moduleId: 'module_risks', viewId: 'view_risks' },

    // Compliance module
    { moduleId: 'module_compliance', viewId: 'view_compliance' },

    // Audit module
    { moduleId: 'module_audit', viewId: 'view_audit' },
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
  const menuItems: MenuItem[] = [
    {
      id: 'menu_dashboard',
      companyId: null, // Global menu
      label: 'Dashboard',
      sequenceIndex: 0,
      viewId: 'view_dashboard',
      featureId: null,
      isEntrypoint: true,
      icon: 'dashboard',
    },
    {
      id: 'menu_companies',
      companyId: null,
      label: 'Companies',
      sequenceIndex: 1,
      viewId: 'view_companies_list',
      featureId: null,
      isEntrypoint: false,
      icon: 'business',
    },
    {
      id: 'menu_users',
      companyId: null,
      label: 'Users',
      sequenceIndex: 2,
      viewId: 'view_users_list',
      featureId: null,
      isEntrypoint: false,
      icon: 'people',
    },
    {
      id: 'menu_modules',
      companyId: null,
      label: 'Modules',
      sequenceIndex: 3,
      viewId: null,
      featureId: null,
      isEntrypoint: false,
      icon: 'apps',
    },
    {
      id: 'menu_admin',
      companyId: null,
      label: 'Administration',
      sequenceIndex: 4,
      viewId: null,
      featureId: null,
      isEntrypoint: false,
      icon: 'admin_panel_settings',
    },
    {
      id: 'menu_settings',
      companyId: null,
      label: 'Settings',
      sequenceIndex: 5,
      viewId: 'view_settings',
      featureId: null,
      isEntrypoint: false,
      icon: 'settings',
    },
  ];

  const subMenuItems: SubMenuItem[] = [
    // Modules sub-menu
    {
      id: 'submenu_risks',
      companyId: null,
      menuItemId: 'menu_modules',
      label: 'Risks',
      sequenceIndex: 0,
      viewId: 'view_risks',
      featureId: null,
    },
    {
      id: 'submenu_compliance',
      companyId: null,
      menuItemId: 'menu_modules',
      label: 'Compliance',
      sequenceIndex: 1,
      viewId: 'view_compliance',
      featureId: null,
    },
    {
      id: 'submenu_audit',
      companyId: null,
      menuItemId: 'menu_modules',
      label: 'Audit',
      sequenceIndex: 2,
      viewId: 'view_audit',
      featureId: null,
    },

    // Administration sub-menu
    {
      id: 'submenu_user_levels',
      companyId: null,
      menuItemId: 'menu_admin',
      label: 'User Levels',
      sequenceIndex: 0,
      viewId: 'view_user_levels',
      featureId: 'feature_iam_manage_levels',
    },
    {
      id: 'submenu_permissions',
      companyId: null,
      menuItemId: 'menu_admin',
      label: 'Permissions',
      sequenceIndex: 1,
      viewId: 'view_permissions_matrix',
      featureId: 'feature_iam_assign_permissions',
    },
    {
      id: 'submenu_subscription',
      companyId: null,
      menuItemId: 'menu_settings',
      label: 'Subscription',
      sequenceIndex: 0,
      viewId: 'view_subscription',
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
      createdAt: new Date().toISOString(),
    },
    {
      companyId,
      name: 'Member',
      description: 'Standard user with create, read, and update permissions',
      createdAt: new Date().toISOString(),
    },
    {
      companyId,
      name: 'Visitor',
      description: 'Read-only access - can view but not edit or delete',
      createdAt: new Date().toISOString(),
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
