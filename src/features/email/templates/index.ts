/**
 * Email Templates Index
 *
 * Exports all React Email templates for use throughout the application.
 * These templates serve as the default system templates and can be
 * overridden via the database-backed template system.
 */

export { WelcomeEmail, default as WelcomeEmailComponent } from './welcome';
export { PasswordResetEmail, default as PasswordResetEmailComponent } from './password-reset';
export { EmailVerificationEmail, default as EmailVerificationEmailComponent } from './email-verification';
export { TeamInvitationEmail, default as TeamInvitationEmailComponent } from './team-invitation';
export { UserLevelAssignmentEmail, default as UserLevelAssignmentEmailComponent } from './user-level-assignment';
export { PermissionChangesEmail, default as PermissionChangesEmailComponent } from './permission-changes';

/**
 * Template registry for dynamic template loading
 */
export const EMAIL_TEMPLATES = {
  welcome: () => import('./welcome'),
  'password-reset': () => import('./password-reset'),
  'email-verification': () => import('./email-verification'),
  'team-invitation': () => import('./team-invitation'),
  'user-level-assignment': () => import('./user-level-assignment'),
  'permission-changes': () => import('./permission-changes'),
} as const;

export type TemplateKey = keyof typeof EMAIL_TEMPLATES;
