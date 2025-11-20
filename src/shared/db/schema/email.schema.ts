import { pgTable, uuid, varchar, boolean, timestamp, jsonb, integer, text } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

/**
 * Email Templates table schema
 *
 * Stores custom email templates that can be edited via admin UI
 * Code-based templates serve as defaults and fallback
 */
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Template identification
  name: varchar('name', { length: 100 }).notNull().unique(), // e.g., 'welcome', 'password-reset'
  displayName: varchar('display_name', { length: 255 }).notNull(), // e.g., 'Welcome Email'
  description: text('description'),
  category: varchar('category', { length: 50 }), // 'auth', 'billing', 'notifications', 'iam'

  // Version control
  version: integer('version').notNull().default(1),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft', 'published', 'archived'

  // Template content
  contentType: varchar('content_type', { length: 20 }).notNull().default('react-email'), // 'react-email', 'html', 'visual-builder'
  content: text('content').notNull(), // JSX, HTML, or JSON depending on contentType

  // Template variables (for form generation and validation)
  variables: jsonb('variables').notNull().$type<EmailTemplateVariable[]>(), // [{name: 'userName', type: 'string', required: true}]

  // Subject line (can use template variables with {{variable}} syntax)
  subjectTemplate: varchar('subject_template', { length: 500 }).notNull(), // "Welcome {{userName}}!"

  // System vs custom templates
  isSystemTemplate: boolean('is_system_template').notNull().default(false), // System templates can't be deleted

  // Parent template (if cloned from another template)
  parentTemplateId: uuid('parent_template_id').references(() => emailTemplates.id),

  // Audit fields
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedBy: uuid('published_by').references(() => users.id),
  publishedAt: timestamp('published_at'),
});

/**
 * Email Template Versions table schema
 *
 * Stores historical versions of email templates for rollback capability
 */
export const emailTemplateVersions = pgTable('email_template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => emailTemplates.id).notNull(),
  version: integer('version').notNull(),

  // Snapshot of template content at this version
  content: text('content').notNull(),
  variables: jsonb('variables').notNull().$type<EmailTemplateVariable[]>(),
  subjectTemplate: varchar('subject_template', { length: 500 }).notNull(),

  // Version metadata
  changeDescription: text('change_description'), // What changed in this version
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * System Configuration table schema
 *
 * Stores application configuration with environment variable fallback
 * Allows admin UI to update config without code changes
 */
export const systemConfig = pgTable('system_config', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Configuration key-value
  key: varchar('key', { length: 100 }).notNull().unique(), // 'email_from_address', 'email_queue_enabled'
  value: text('value').notNull(), // The configuration value (stored as string, parsed by type)
  valueType: varchar('value_type', { length: 20 }).notNull().default('string'), // 'string', 'number', 'boolean', 'json'

  // Organization
  category: varchar('category', { length: 50 }), // 'email', 'billing', 'general', 'feature-flags'
  description: text('description'), // What this config does

  // Security
  isSensitive: boolean('is_sensitive').notNull().default(false), // Hide value in admin UI

  // Environment variable override
  allowEnvOverride: boolean('allow_env_override').notNull().default(true), // If true, env var takes precedence
  envVarName: varchar('env_var_name', { length: 100 }), // Name of env variable (e.g., 'EMAIL_FROM_ADDRESS')

  // Validation rules (JSON schema-like)
  validationRules: jsonb('validation_rules').$type<ConfigValidationRules>(), // {pattern: '^[a-z@.]+$', min: 5, max: 255}

  // Audit
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Email Logs table schema
 *
 * Comprehensive logging of all sent emails for debugging and compliance
 */
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Template information
  templateName: varchar('template_name', { length: 100 }), // Which template was used
  templateVersion: integer('template_version'), // Version of template at send time

  // Recipients
  toAddress: varchar('to_address', { length: 255 }).notNull(),
  ccAddresses: text('cc_addresses').array(), // Array of CC addresses
  bccAddresses: text('bcc_addresses').array(), // Array of BCC addresses

  // Email content
  subject: varchar('subject', { length: 500 }).notNull(),
  htmlContent: text('html_content'), // Rendered HTML (for debugging/resending)

  // Status tracking
  status: varchar('status', { length: 50 }).notNull().default('queued'), // 'queued', 'sending', 'sent', 'failed', 'bounced', 'complained'

  // AWS SES tracking
  messageId: varchar('message_id', { length: 255 }), // SES message ID
  sesResponse: jsonb('ses_response'), // Full SES API response

  // Error handling
  errorMessage: text('error_message'), // Error details if failed
  retryCount: integer('retry_count').notNull().default(0), // Number of retry attempts
  maxRetries: integer('max_retries').notNull().default(3), // Maximum retry attempts
  nextRetryAt: timestamp('next_retry_at'), // When to retry next

  // Template data (for retry/debugging)
  templateData: jsonb('template_data'), // Data used to render template

  // Metadata
  metadata: jsonb('metadata'), // Additional metadata (user agent, IP, etc.)

  // Timestamps
  queuedAt: timestamp('queued_at'),
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  bouncedAt: timestamp('bounced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Email Bounces table schema
 *
 * Tracks email addresses that have bounced or complained
 * Prevents sending to problematic addresses
 */
export const emailBounces = pgTable('email_bounces', {
  id: uuid('id').primaryKey().defaultRandom(),
  emailAddress: varchar('email_address', { length: 255 }).notNull().unique(),
  bounceType: varchar('bounce_type', { length: 50 }), // 'hard', 'soft', 'complaint'
  bounceReason: text('bounce_reason'), // Reason for bounce
  bouncedAt: timestamp('bounced_at').defaultNow().notNull(),

  // Metadata from SES
  sesNotification: jsonb('ses_notification'), // Full SNS notification from SES
});

/**
 * Type definitions
 */
export interface EmailTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'url';
  required: boolean;
  description?: string;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[]; // For enum-like fields
  };
}

export interface ConfigValidationRules {
  pattern?: string; // Regex pattern
  min?: number; // Min value/length
  max?: number; // Max value/length
  required?: boolean;
  options?: string[]; // Valid options (enum)
}

/**
 * Drizzle inferred types
 */
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;

export type EmailTemplateVersion = typeof emailTemplateVersions.$inferSelect;
export type NewEmailTemplateVersion = typeof emailTemplateVersions.$inferInsert;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;

export type EmailBounce = typeof emailBounces.$inferSelect;
export type NewEmailBounce = typeof emailBounces.$inferInsert;
