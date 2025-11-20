import { render } from '@react-email/render';
import type { EmailTemplate, EmailTemplateVariable } from '@vertical-vibing/shared-types';
import { eq, and } from 'drizzle-orm';
import { db } from '../../shared/db/index.js';
import { emailTemplates, emailTemplateVersions } from '../../shared/db/schema/email.schema.js';
import { EMAIL_TEMPLATES, type TemplateKey } from './templates/index.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Template Service
 *
 * Manages email templates with hybrid approach:
 * 1. Code-based system templates (default, fallback)
 * 2. Database-backed custom templates (admin-editable)
 *
 * Template Resolution Priority:
 * 1. Published custom template in DB (if exists)
 * 2. Code-based system template (fallback)
 */
export class TemplateService {
  /**
   * Get template by name with database fallback
   */
  async getTemplate(templateName: string): Promise<EmailTemplate | null> {
    try {
      // Try to get published template from database first
      const dbTemplate = await db.query.emailTemplates.findFirst({
        where: and(
          eq(emailTemplates.name, templateName),
          eq(emailTemplates.status, 'published'),
        ),
      });

      if (dbTemplate) {
        logger.info({ templateName, source: 'database' }, 'Using database template');
        return dbTemplate;
      }

      // Fallback to code-based template metadata
      if (templateName in EMAIL_TEMPLATES) {
        logger.info({ templateName, source: 'code' }, 'Using code-based template');
        return this.getCodeTemplateMetadata(templateName as TemplateKey);
      }

      logger.warn({ templateName }, 'Template not found');
      return null;
    } catch (error) {
      logger.error({ error, templateName }, 'Error getting template');
      throw error;
    }
  }

  /**
   * Render template with provided data
   */
  async renderTemplate(
    templateName: string,
    data: Record<string, any>,
  ): Promise<{ html: string; subject: string; text?: string }> {
    try {
      const template = await this.getTemplate(templateName);

      if (!template) {
        throw new Error(`Template "${templateName}" not found`);
      }

      // Validate required variables
      this.validateTemplateData(template.variables, data);

      let html: string;
      let text: string | undefined;

      // Render based on content type
      if (template.contentType === 'react-email') {
        html = await this.renderReactEmailTemplate(templateName, template.content, data);
        text = await this.renderPlainText(html);
      } else if (template.contentType === 'html') {
        html = this.renderHTMLTemplate(template.content, data);
        text = await this.renderPlainText(html);
      } else if (template.contentType === 'visual-builder') {
        // Visual builder stores JSON structure
        html = this.renderVisualBuilderTemplate(template.content, data);
        text = await this.renderPlainText(html);
      } else {
        throw new Error(`Unsupported content type: ${template.contentType}`);
      }

      // Render subject line with variables
      const subject = this.renderSubject(template.subjectTemplate, data);

      return { html, subject, text };
    } catch (error) {
      logger.error({ error, templateName }, 'Error rendering template');
      throw error;
    }
  }

  /**
   * Render React Email template (code or database)
   */
  private async renderReactEmailTemplate(
    templateName: string,
    content: string,
    data: Record<string, any>,
  ): Promise<string> {
    try {
      // If template is in code, use dynamic import
      if (templateName in EMAIL_TEMPLATES) {
        const templateModule = await EMAIL_TEMPLATES[templateName as TemplateKey]();
        const TemplateComponent = templateModule.default;
        return render(TemplateComponent(data));
      }

      // Otherwise, it's a custom template stored in DB as JSX string
      // For custom templates, we'd need to compile JSX at runtime (advanced use case)
      // For now, we'll use a simpler approach with eval (security consideration in production)
      // TODO: Implement safe JSX compilation for custom templates
      throw new Error('Custom React Email templates not yet supported');
    } catch (error) {
      logger.error({ error, templateName }, 'Error rendering React Email template');
      throw error;
    }
  }

  /**
   * Render HTML template with variable substitution
   */
  private renderHTMLTemplate(content: string, data: Record<string, any>): string {
    let html = content;

    // Replace all {{variable}} placeholders with actual data
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value ?? ''));
    }

    return html;
  }

  /**
   * Render visual builder template (JSON to HTML)
   */
  private renderVisualBuilderTemplate(content: string, data: Record<string, any>): string {
    try {
      const jsonStructure = JSON.parse(content);
      // TODO: Implement visual builder JSON to HTML conversion
      // This would convert a JSON structure like:
      // { "type": "container", "children": [...] }
      // Into actual HTML
      throw new Error('Visual builder not yet implemented');
    } catch (error) {
      logger.error({ error }, 'Error rendering visual builder template');
      throw error;
    }
  }

  /**
   * Render subject line with variable substitution
   */
  private renderSubject(subjectTemplate: string, data: Record<string, any>): string {
    let subject = subjectTemplate;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value ?? ''));
    }

    return subject;
  }

  /**
   * Convert HTML to plain text
   */
  private async renderPlainText(html: string): Promise<string> {
    // Basic HTML to text conversion
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Validate that all required template variables are provided
   */
  private validateTemplateData(
    variables: EmailTemplateVariable[],
    data: Record<string, any>,
  ): void {
    const missingVars: string[] = [];

    for (const variable of variables) {
      if (variable.required && !(variable.name in data)) {
        missingVars.push(variable.name);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(`Missing required template variables: ${missingVars.join(', ')}`);
    }
  }

  /**
   * Get code-based template metadata
   */
  private getCodeTemplateMetadata(templateName: TemplateKey): EmailTemplate {
    // This returns metadata for code-based templates
    // In a real implementation, this metadata would be stored somewhere
    // For now, we'll return basic metadata
    const now = new Date();

    const metadataMap: Record<TemplateKey, Partial<EmailTemplate>> = {
      welcome: {
        name: 'welcome',
        displayName: 'Welcome Email',
        description: 'Sent to new users upon account creation',
        category: 'auth',
        subjectTemplate: 'Welcome to {{companyName}}!',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'companyName', type: 'string', required: false },
          { name: 'loginUrl', type: 'url', required: true },
        ],
      },
      'password-reset': {
        name: 'password-reset',
        displayName: 'Password Reset',
        description: 'Sent when a user requests a password reset',
        category: 'auth',
        subjectTemplate: 'Reset your {{companyName}} password',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'resetUrl', type: 'url', required: true },
          { name: 'expiryHours', type: 'number', required: false },
          { name: 'companyName', type: 'string', required: false },
        ],
      },
      'email-verification': {
        name: 'email-verification',
        displayName: 'Email Verification',
        description: 'Sent to verify a user\'s email address',
        category: 'auth',
        subjectTemplate: 'Verify your email for {{companyName}}',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'verificationUrl', type: 'url', required: true },
          { name: 'verificationCode', type: 'string', required: false },
          { name: 'expiryHours', type: 'number', required: false },
          { name: 'companyName', type: 'string', required: false },
        ],
      },
      'team-invitation': {
        name: 'team-invitation',
        displayName: 'Team Invitation',
        description: 'Sent when a user is invited to join a team',
        category: 'iam',
        subjectTemplate: 'You\'ve been invited to join {{companyName}}',
        variables: [
          { name: 'invitedEmail', type: 'string', required: true },
          { name: 'inviterName', type: 'string', required: true },
          { name: 'companyName', type: 'string', required: true },
          { name: 'roleName', type: 'string', required: true },
          { name: 'invitationUrl', type: 'url', required: true },
          { name: 'expiryDays', type: 'number', required: false },
          { name: 'appName', type: 'string', required: false },
        ],
      },
      'user-level-assignment': {
        name: 'user-level-assignment',
        displayName: 'User Level Assignment',
        description: 'Sent when a user\'s access level is assigned or updated',
        category: 'iam',
        subjectTemplate: 'Your access level has been updated in {{companyName}}',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'companyName', type: 'string', required: true },
          { name: 'oldLevelName', type: 'string', required: false },
          { name: 'newLevelName', type: 'string', required: true },
          { name: 'assignedBy', type: 'string', required: true },
          { name: 'levelDescription', type: 'string', required: false },
          { name: 'dashboardUrl', type: 'url', required: true },
          { name: 'appName', type: 'string', required: false },
        ],
      },
      'permission-changes': {
        name: 'permission-changes',
        displayName: 'Permission Changes',
        description: 'Sent when a user\'s permissions are updated',
        category: 'iam',
        subjectTemplate: 'Your permissions have been updated in {{companyName}}',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'companyName', type: 'string', required: true },
          { name: 'changedBy', type: 'string', required: true },
          { name: 'changes', type: 'string', required: true }, // array but simplified
          { name: 'reason', type: 'string', required: false },
          { name: 'dashboardUrl', type: 'url', required: true },
          { name: 'appName', type: 'string', required: false },
        ],
      },
    };

    const metadata = metadataMap[templateName];

    return {
      id: `system-${templateName}`,
      ...metadata,
      version: 1,
      status: 'published',
      contentType: 'react-email',
      content: '// Code-based template',
      isSystemTemplate: true,
      parentTemplateId: null,
      createdBy: null,
      createdAt: now,
      updatedBy: null,
      updatedAt: now,
      publishedBy: null,
      publishedAt: now,
    } as EmailTemplate;
  }

  /**
   * Create or update template in database
   */
  async upsertTemplate(
    templateData: Omit<typeof emailTemplates.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<EmailTemplate> {
    try {
      // Check if template exists
      const existing = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.name, templateData.name),
      });

      if (existing) {
        // Update existing template
        // Create new version first
        await db.insert(emailTemplateVersions).values({
          templateId: existing.id,
          version: existing.version + 1,
          content: templateData.content,
          variables: templateData.variables,
          subjectTemplate: templateData.subjectTemplate,
          createdBy: templateData.updatedBy,
        });

        // Update template
        const [updated] = await db
          .update(emailTemplates)
          .set({
            ...templateData,
            version: existing.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(emailTemplates.id, existing.id))
          .returning();

        return updated;
      } else {
        // Create new template
        const [created] = await db.insert(emailTemplates).values(templateData).returning();
        return created;
      }
    } catch (error) {
      logger.error({ error, templateData }, 'Error upserting template');
      throw error;
    }
  }

  /**
   * Get template versions
   */
  async getTemplateVersions(templateId: string) {
    try {
      return await db.query.emailTemplateVersions.findMany({
        where: eq(emailTemplateVersions.templateId, templateId),
        orderBy: (versions, { desc }) => [desc(versions.version)],
      });
    } catch (error) {
      logger.error({ error, templateId }, 'Error getting template versions');
      throw error;
    }
  }

  /**
   * Rollback template to previous version
   */
  async rollbackTemplate(templateId: string, targetVersion: number): Promise<EmailTemplate> {
    try {
      // Get the target version
      const targetVersionData = await db.query.emailTemplateVersions.findFirst({
        where: and(
          eq(emailTemplateVersions.templateId, templateId),
          eq(emailTemplateVersions.version, targetVersion),
        ),
      });

      if (!targetVersionData) {
        throw new Error(`Version ${targetVersion} not found for template ${templateId}`);
      }

      // Get current template
      const currentTemplate = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, templateId),
      });

      if (!currentTemplate) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Create new version with rolled back content
      const newVersion = currentTemplate.version + 1;

      await db.insert(emailTemplateVersions).values({
        templateId,
        version: newVersion,
        content: targetVersionData.content,
        variables: targetVersionData.variables,
        subjectTemplate: targetVersionData.subjectTemplate,
        changeDescription: `Rolled back to version ${targetVersion}`,
        createdBy: null, // TODO: Get from auth context
      });

      // Update template
      const [updated] = await db
        .update(emailTemplates)
        .set({
          content: targetVersionData.content,
          variables: targetVersionData.variables,
          subjectTemplate: targetVersionData.subjectTemplate,
          version: newVersion,
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.id, templateId))
        .returning();

      return updated;
    } catch (error) {
      logger.error({ error, templateId, targetVersion }, 'Error rolling back template');
      throw error;
    }
  }

  /**
   * List templates with pagination and filtering
   */
  async listTemplates(options: {
    page?: number;
    limit?: number;
    status?: 'draft' | 'published' | 'archived';
    category?: string;
    isSystemTemplate?: boolean;
    search?: string;
  }): Promise<{ templates: EmailTemplate[]; total: number }> {
    try {
      const { page = 1, limit = 20, status, category, isSystemTemplate, search } = options;
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [];

      if (status) {
        conditions.push(eq(emailTemplates.status, status));
      }

      if (category) {
        conditions.push(eq(emailTemplates.category, category));
      }

      if (isSystemTemplate !== undefined) {
        conditions.push(eq(emailTemplates.isSystemTemplate, isSystemTemplate));
      }

      // For search, we'd need to use sql operator for LIKE
      // For now, we'll get all and filter in memory (not optimal for large datasets)
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get templates
      let templates = await db.query.emailTemplates.findMany({
        where: whereClause,
        limit: limit + 1, // Fetch one extra to check if there are more
        offset,
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
      });

      // Search filter (in-memory for now)
      if (search) {
        const searchLower = search.toLowerCase();
        templates = templates.filter(
          (t) =>
            t.name.toLowerCase().includes(searchLower) ||
            t.displayName.toLowerCase().includes(searchLower) ||
            (t.description?.toLowerCase().includes(searchLower) ?? false)
        );
      }

      // Get total count (simplified - in production should be a separate count query)
      const allTemplates = await db.query.emailTemplates.findMany({
        where: whereClause,
      });

      let total = allTemplates.length;
      if (search) {
        const searchLower = search.toLowerCase();
        total = allTemplates.filter(
          (t) =>
            t.name.toLowerCase().includes(searchLower) ||
            t.displayName.toLowerCase().includes(searchLower) ||
            (t.description?.toLowerCase().includes(searchLower) ?? false)
        ).length;
      }

      // Trim to exact limit
      const hasMore = templates.length > limit;
      if (hasMore) {
        templates = templates.slice(0, limit);
      }

      return { templates, total };
    } catch (error) {
      logger.error({ error, options }, 'Error listing templates');
      throw error;
    }
  }

  /**
   * Publish a draft template (make it active)
   */
  async publishTemplate(templateId: string, publishedBy?: string | null): Promise<EmailTemplate> {
    try {
      const template = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, templateId),
      });

      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      if (template.isSystemTemplate) {
        throw new Error('Cannot publish system templates');
      }

      if (template.status === 'published') {
        logger.info({ templateId }, 'Template already published');
        return template;
      }

      // Update template to published status
      const [updated] = await db
        .update(emailTemplates)
        .set({
          status: 'published',
          publishedBy,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.id, templateId))
        .returning();

      logger.info({ templateId, name: updated.name }, 'Template published');
      return updated;
    } catch (error) {
      logger.error({ error, templateId }, 'Error publishing template');
      throw error;
    }
  }

  /**
   * Archive a template (soft delete)
   */
  async archiveTemplate(templateId: string): Promise<EmailTemplate> {
    try {
      const template = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, templateId),
      });

      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      if (template.isSystemTemplate) {
        throw new Error('Cannot archive system templates');
      }

      if (template.status === 'archived') {
        logger.info({ templateId }, 'Template already archived');
        return template;
      }

      // Update template to archived status
      const [updated] = await db
        .update(emailTemplates)
        .set({
          status: 'archived',
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.id, templateId))
        .returning();

      logger.info({ templateId, name: updated.name }, 'Template archived');
      return updated;
    } catch (error) {
      logger.error({ error, templateId }, 'Error archiving template');
      throw error;
    }
  }

  /**
   * Clone an existing template
   */
  async cloneTemplate(
    templateId: string,
    newName: string,
    createdBy?: string | null
  ): Promise<EmailTemplate> {
    try {
      const sourceTemplate = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, templateId),
      });

      if (!sourceTemplate) {
        throw new Error(`Source template ${templateId} not found`);
      }

      // Check if new name already exists
      const existingWithName = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.name, newName),
      });

      if (existingWithName) {
        throw new Error(`Template with name "${newName}" already exists`);
      }

      // Create cloned template
      const [cloned] = await db
        .insert(emailTemplates)
        .values({
          name: newName,
          displayName: `${sourceTemplate.displayName} (Copy)`,
          description: sourceTemplate.description,
          category: sourceTemplate.category,
          status: 'draft', // Always create as draft
          contentType: sourceTemplate.contentType,
          content: sourceTemplate.content,
          variables: sourceTemplate.variables,
          subjectTemplate: sourceTemplate.subjectTemplate,
          version: 1, // Start at version 1
          isSystemTemplate: false, // Clones are never system templates
          parentTemplateId: sourceTemplate.id, // Track the source
          createdBy,
          updatedBy: createdBy,
        })
        .returning();

      logger.info(
        { sourceTemplateId: templateId, clonedTemplateId: cloned.id, newName },
        'Template cloned'
      );
      return cloned;
    } catch (error) {
      logger.error({ error, templateId, newName }, 'Error cloning template');
      throw error;
    }
  }
}
