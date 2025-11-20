/**
 * Email System IAM Permissions
 *
 * Defines all permissions needed for the email system.
 * These should be integrated with the IAM system's permission registry.
 *
 * Usage:
 *   1. Register these permissions in the IAM system
 *   2. Assign permissions to user levels
 *   3. Use in route middleware: checkPermission('email:send')
 */

export const EMAIL_PERMISSIONS = {
  // Email Sending
  SEND_EMAIL: 'email:send',
  SEND_BULK_EMAIL: 'email:send:bulk',

  // Template Management
  READ_TEMPLATES: 'email:templates:read',
  WRITE_TEMPLATES: 'email:templates:write',
  PUBLISH_TEMPLATES: 'email:templates:publish',
  DELETE_TEMPLATES: 'email:templates:delete',

  // Email Logs
  READ_LOGS: 'email:logs:read',
  RETRY_LOGS: 'email:logs:retry',
  DELETE_LOGS: 'email:logs:delete',

  // Configuration
  READ_CONFIG: 'email:config:read',
  WRITE_CONFIG: 'email:config:write',
  DELETE_CONFIG: 'email:config:delete',
} as const;

/**
 * Permission groups for common roles
 */
export const EMAIL_PERMISSION_GROUPS = {
  /**
   * Basic user - can only send emails
   */
  USER: [EMAIL_PERMISSIONS.SEND_EMAIL],

  /**
   * Email operator - can send emails and view logs
   */
  OPERATOR: [
    EMAIL_PERMISSIONS.SEND_EMAIL,
    EMAIL_PERMISSIONS.SEND_BULK_EMAIL,
    EMAIL_PERMISSIONS.READ_LOGS,
    EMAIL_PERMISSIONS.READ_TEMPLATES,
  ],

  /**
   * Email admin - full template and log management
   */
  ADMIN: [
    EMAIL_PERMISSIONS.SEND_EMAIL,
    EMAIL_PERMISSIONS.SEND_BULK_EMAIL,
    EMAIL_PERMISSIONS.READ_TEMPLATES,
    EMAIL_PERMISSIONS.WRITE_TEMPLATES,
    EMAIL_PERMISSIONS.PUBLISH_TEMPLATES,
    EMAIL_PERMISSIONS.READ_LOGS,
    EMAIL_PERMISSIONS.RETRY_LOGS,
  ],

  /**
   * Super admin - full access including configuration
   */
  SUPER_ADMIN: Object.values(EMAIL_PERMISSIONS),
} as const;

/**
 * Permission descriptions for IAM UI
 */
export const EMAIL_PERMISSION_DESCRIPTIONS = {
  [EMAIL_PERMISSIONS.SEND_EMAIL]: 'Send individual emails',
  [EMAIL_PERMISSIONS.SEND_BULK_EMAIL]: 'Send bulk emails to multiple recipients',
  [EMAIL_PERMISSIONS.READ_TEMPLATES]: 'View email templates',
  [EMAIL_PERMISSIONS.WRITE_TEMPLATES]: 'Create and edit email templates',
  [EMAIL_PERMISSIONS.PUBLISH_TEMPLATES]: 'Publish email templates to production',
  [EMAIL_PERMISSIONS.DELETE_TEMPLATES]: 'Delete or archive email templates',
  [EMAIL_PERMISSIONS.READ_LOGS]: 'View email logs and statistics',
  [EMAIL_PERMISSIONS.RETRY_LOGS]: 'Retry failed emails',
  [EMAIL_PERMISSIONS.DELETE_LOGS]: 'Delete email logs',
  [EMAIL_PERMISSIONS.READ_CONFIG]: 'View email system configuration',
  [EMAIL_PERMISSIONS.WRITE_CONFIG]: 'Modify email system configuration',
  [EMAIL_PERMISSIONS.DELETE_CONFIG]: 'Delete email system configuration',
} as const;

/**
 * Helper function to check if user has permission
 * TODO: Integrate with IAM system's permission checking
 */
export function hasEmailPermission(userPermissions: string[], required: string): boolean {
  return userPermissions.includes(required) || userPermissions.includes('*');
}

/**
 * Helper to check multiple permissions (OR logic)
 */
export function hasAnyEmailPermission(userPermissions: string[], required: string[]): boolean {
  return required.some((perm) => hasEmailPermission(userPermissions, perm));
}

/**
 * Helper to check multiple permissions (AND logic)
 */
export function hasAllEmailPermissions(userPermissions: string[], required: string[]): boolean {
  return required.every((perm) => hasEmailPermission(userPermissions, perm));
}
