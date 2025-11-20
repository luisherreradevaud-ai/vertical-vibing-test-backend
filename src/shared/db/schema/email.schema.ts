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
 * Email Bounces table schema (DEPRECATED - use emailSuppressions)
 *
 * Tracks email addresses that have bounced or complained
 * Prevents sending to problematic addresses
 *
 * @deprecated Use emailSuppressions table for new implementations
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
 * Email Suppressions table schema
 *
 * Comprehensive suppression list for email addresses that should not receive emails
 * Includes bounces, complaints, and unsubscribes with proper compliance tracking
 */
export const emailSuppressions = pgTable('email_suppressions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Email address being suppressed
  emailAddress: varchar('email_address', { length: 255 }).notNull().unique(),

  // Suppression reason
  reason: varchar('reason', { length: 50 }).notNull(), // 'bounce_hard', 'bounce_soft', 'complaint', 'unsubscribe', 'manual'
  reasonDetails: text('reason_details'), // Additional details about the suppression

  // Bounce-specific fields
  bounceType: varchar('bounce_type', { length: 50 }), // 'Permanent', 'Transient', 'Undetermined'
  bounceSubType: varchar('bounce_sub_type', { length: 50 }), // 'General', 'NoEmail', 'Suppressed', 'MailboxFull', etc.

  // Complaint-specific fields
  complaintFeedbackType: varchar('complaint_feedback_type', { length: 50 }), // 'abuse', 'fraud', 'virus', etc.

  // Source tracking
  sourceType: varchar('source_type', { length: 50 }).notNull().default('ses'), // 'ses', 'user_request', 'admin', 'api'
  sourceMessageId: varchar('source_message_id', { length: 255 }), // SES message ID that triggered this

  // Status
  isActive: boolean('is_active').notNull().default(true), // Can be manually reactivated

  // Counts for soft bounces (auto-suppress after threshold)
  bounceCount: integer('bounce_count').notNull().default(1),
  lastBounceAt: timestamp('last_bounce_at'),

  // SES notification data
  sesNotification: jsonb('ses_notification'), // Full SNS notification from SES

  // Metadata
  userAgent: varchar('user_agent', { length: 500 }), // For unsubscribe requests
  ipAddress: varchar('ip_address', { length: 45 }), // For unsubscribe requests

  // Timestamps
  suppressedAt: timestamp('suppressed_at').defaultNow().notNull(),
  reactivatedAt: timestamp('reactivated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Email Unsubscribe Preferences table schema
 *
 * Granular unsubscribe preferences per email category
 * Allows users to opt-out of specific email types while receiving others
 */
export const emailUnsubscribePreferences = pgTable('email_unsubscribe_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Email address
  emailAddress: varchar('email_address', { length: 255 }).notNull(),

  // Category-specific unsubscribe
  category: varchar('category', { length: 50 }).notNull(), // 'marketing', 'notifications', 'billing', 'auth', 'all'
  isUnsubscribed: boolean('is_unsubscribed').notNull().default(true),

  // Unsubscribe source
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'email_link', 'preference_center', 'admin', 'api'
  unsubscribeToken: varchar('unsubscribe_token', { length: 255 }), // Token from email link (for audit)

  // Tracking
  userAgent: varchar('user_agent', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),

  // Timestamps
  unsubscribedAt: timestamp('unsubscribed_at').defaultNow().notNull(),
  resubscribedAt: timestamp('resubscribed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Email Compliance Events table schema
 *
 * Audit log of all compliance-related events for regulatory compliance
 * Tracks bounces, complaints, unsubscribes, and list-unsubscribe header clicks
 */
export const emailComplianceEvents = pgTable('email_compliance_events', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Event type
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'bounce', 'complaint', 'unsubscribe', 'list_unsubscribe', 'resubscribe'

  // Email and message tracking
  emailAddress: varchar('email_address', { length: 255 }).notNull(),
  emailLogId: uuid('email_log_id').references(() => emailLogs.id), // Link to original email
  messageId: varchar('message_id', { length: 255 }), // SES message ID

  // Event details
  eventData: jsonb('event_data').notNull(), // Full event payload (SES notification, form data, etc.)

  // Processing status
  processed: boolean('processed').notNull().default(false), // Whether this event has been acted upon
  processedAt: timestamp('processed_at'),

  // Timestamps
  occurredAt: timestamp('occurred_at').notNull(), // When the event actually happened
  receivedAt: timestamp('received_at').defaultNow().notNull(), // When we received the notification
  createdAt: timestamp('created_at').defaultNow().notNull(),
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

export type EmailSuppression = typeof emailSuppressions.$inferSelect;
export type NewEmailSuppression = typeof emailSuppressions.$inferInsert;

export type EmailUnsubscribePreference = typeof emailUnsubscribePreferences.$inferSelect;
export type NewEmailUnsubscribePreference = typeof emailUnsubscribePreferences.$inferInsert;

export type EmailComplianceEvent = typeof emailComplianceEvents.$inferSelect;
export type NewEmailComplianceEvent = typeof emailComplianceEvents.$inferInsert;
