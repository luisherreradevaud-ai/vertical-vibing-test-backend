/**
 * Email System IAM Feature Definitions
 *
 * Defines features and actions for the email system to be registered in the IAM database.
 * These features are used by the IAM PermissionsService for authorization.
 *
 * Feature ID Format: feature_email_{resource}
 * Actions: Create, Read, Update, Delete, Send, Retry, Publish
 */

import crypto from 'crypto';

export interface EmailFeatureDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  resourceType: string;
  actions: string[];
  category: string;
}

/**
 * Email System Features for IAM Registration
 * Note: IDs will be generated during seeding to avoid duplicates
 */
export const EMAIL_IAM_FEATURES: Omit<EmailFeatureDefinition, 'id'>[] = [
  {
    key: 'feature_email_send',
    name: 'Email Sending',
    description: 'Send transactional emails to users',
    resourceType: 'email_messages',
    actions: ['Send', 'SendBulk'],
    category: 'email',
  },
  {
    key: 'feature_email_templates',
    name: 'Email Templates',
    description: 'Manage email templates',
    resourceType: 'email_templates',
    actions: ['Create', 'Read', 'Update', 'Delete', 'Publish', 'Archive', 'Clone'],
    category: 'email',
  },
  {
    key: 'feature_email_logs',
    name: 'Email Logs',
    description: 'View and manage email delivery logs',
    resourceType: 'email_logs',
    actions: ['Read', 'Retry', 'Delete'],
    category: 'email',
  },
  {
    key: 'feature_email_config',
    name: 'Email Configuration',
    description: 'Manage email system configuration',
    resourceType: 'email_config',
    actions: ['Read', 'Update', 'Delete'],
    category: 'email',
  },
];

/**
 * Map from old permission format to new IAM format
 *
 * Old format: 'email:send'
 * New format: { featureKey: 'feature_email_send', action: 'Send' }
 */
export const EMAIL_PERMISSION_MAPPING: Record<string, { featureKey: string; action: string }> = {
  // Email sending
  'email:send': { featureKey: 'feature_email_send', action: 'Send' },
  'email:send:bulk': { featureKey: 'feature_email_send', action: 'SendBulk' },

  // Template management
  'email:templates:read': { featureKey: 'feature_email_templates', action: 'Read' },
  'email:templates:write': { featureKey: 'feature_email_templates', action: 'Create' },
  'email:templates:publish': { featureKey: 'feature_email_templates', action: 'Publish' },
  'email:templates:delete': { featureKey: 'feature_email_templates', action: 'Delete' },

  // Email logs
  'email:logs:read': { featureKey: 'feature_email_logs', action: 'Read' },
  'email:logs:retry': { featureKey: 'feature_email_logs', action: 'Retry' },
  'email:logs:delete': { featureKey: 'feature_email_logs', action: 'Delete' },

  // Configuration
  'email:config:read': { featureKey: 'feature_email_config', action: 'Read' },
  'email:config:write': { featureKey: 'feature_email_config', action: 'Update' },
  'email:config:delete': { featureKey: 'feature_email_config', action: 'Delete' },
};

/**
 * Get IAM feature + action for an old-style permission string
 */
export function getIAMFeatureForPermission(permission: string): { featureKey: string; action: string } | null {
  return EMAIL_PERMISSION_MAPPING[permission] || null;
}
