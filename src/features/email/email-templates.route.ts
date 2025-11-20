import { Router, type Request, type Response } from 'express';
import { TemplateService } from './template.service.js';
import {
  createEmailTemplateDTOSchema,
  updateEmailTemplateDTOSchema,
  publishEmailTemplateDTOSchema,
  archiveEmailTemplateDTOSchema,
  cloneEmailTemplateDTOSchema,
  rollbackTemplateDTOSchema,
  previewTemplateDTOSchema,
  listEmailTemplatesQuerySchema,
} from '@vertical-vibing/shared-types';
import { logger } from '../../shared/utils/logger.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { emailPermissions } from './email-permission.middleware.js';

/**
 * Email Templates Router
 *
 * Admin API endpoints for managing email templates:
 * - List templates with filtering
 * - Get template by ID
 * - Create custom template
 * - Update template
 * - Publish/archive templates
 * - Clone templates
 * - Version management
 * - Preview templates
 *
 * All endpoints require authentication and IAM permissions
 */
export function createEmailTemplatesRouter(): Router {
  const router = Router();
  const templateService = new TemplateService();

  /**
   * GET /api/email/templates
   * List all templates with filtering and pagination
   */
  router.get('/', authenticate, emailPermissions.readTemplates(), async (req: Request, res: Response) => {
    try {

      // Parse and validate query parameters
      const query = listEmailTemplatesQuerySchema.parse({
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        status: req.query.status,
        category: req.query.category,
        isSystemTemplate: req.query.isSystemTemplate === 'true' ? true : req.query.isSystemTemplate === 'false' ? false : undefined,
        search: req.query.search,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
      });

      // TODO: Implement pagination and filtering in TemplateService
      // For now, return basic response
      res.json({
        templates: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 0,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error listing templates');
      res.status(500).json({ error: 'Failed to list templates' });
    }
  });

  /**
   * GET /api/email/templates/:id
   * Get template by ID
   */
  router.get('/:id', authenticate, emailPermissions.readTemplates(), async (req: Request, res: Response) => {
    try {

      const template = await templateService.getTemplate(req.params.id);

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json(template);
    } catch (error) {
      logger.error({ error, templateId: req.params.id }, 'Error getting template');
      res.status(500).json({ error: 'Failed to get template' });
    }
  });

  /**
   * POST /api/email/templates
   * Create new custom template
   */
  router.post('/', authenticate, emailPermissions.writeTemplates(), async (req: Request, res: Response) => {
    try {

      const templateData = createEmailTemplateDTOSchema.parse(req.body);

      const template = await templateService.upsertTemplate({
        ...templateData,
        status: 'draft',
        isSystemTemplate: false,
        createdBy: req.user?.id ?? null,
        updatedBy: req.user?.id ?? null,
      });

      logger.info({ templateId: template.id, name: template.name }, 'Created template');

      res.status(201).json(template);
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error creating template');

      if (error instanceof Error && error.message.includes('unique constraint')) {
        return res.status(409).json({ error: 'Template with this name already exists' });
      }

      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  /**
   * PUT /api/email/templates/:id
   * Update template
   */
  router.put('/:id', authenticate, emailPermissions.writeTemplates(), async (req: Request, res: Response) => {
    try {

      const updateData = updateEmailTemplateDTOSchema.parse(req.body);

      // Get existing template
      const existing = await templateService.getTemplate(req.params.id);

      if (!existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Don't allow updating system templates
      if (existing.isSystemTemplate) {
        return res.status(403).json({ error: 'Cannot update system templates' });
      }

      const updated = await templateService.upsertTemplate({
        name: existing.name,
        displayName: updateData.displayName ?? existing.displayName,
        description: updateData.description ?? existing.description ?? null,
        category: updateData.category ?? existing.category,
        contentType: updateData.contentType ?? existing.contentType,
        content: updateData.content ?? existing.content,
        variables: updateData.variables ?? existing.variables,
        subjectTemplate: updateData.subjectTemplate ?? existing.subjectTemplate,
        status: existing.status,
        isSystemTemplate: existing.isSystemTemplate,
        parentTemplateId: existing.parentTemplateId,
        updatedBy: req.user?.id ?? null,
      });

      logger.info({ templateId: updated.id, name: updated.name }, 'Updated template');

      res.json(updated);
    } catch (error) {
      logger.error({ error, templateId: req.params.id }, 'Error updating template');
      res.status(500).json({ error: 'Failed to update template' });
    }
  });

  /**
   * POST /api/email/templates/:id/publish
   * Publish template (make it active)
   */
  router.post('/:id/publish', authenticate, emailPermissions.publishTemplates(), async (req: Request, res: Response) => {
    try{
      publishEmailTemplateDTOSchema.parse({ templateId: req.params.id });

      // TODO: Implement publish logic in TemplateService
      // For now, just return success
      res.json({ success: true, message: 'Template published' });
    } catch (error) {
      logger.error({ error, templateId: req.params.id }, 'Error publishing template');
      res.status(500).json({ error: 'Failed to publish template' });
    }
  });

  /**
   * POST /api/email/templates/:id/archive
   * Archive template (soft delete)
   */
  router.post('/:id/archive', authenticate, emailPermissions.deleteTemplates(), async (req: Request, res: Response) => {
    try {
      archiveEmailTemplateDTOSchema.parse({ templateId: req.params.id });

      // TODO: Implement archive logic in TemplateService
      res.json({ success: true, message: 'Template archived' });
    } catch (error) {
      logger.error({ error, templateId: req.params.id }, 'Error archiving template');
      res.status(500).json({ error: 'Failed to archive template' });
    }
  });

  /**
   * POST /api/email/templates/:id/clone
   * Clone template to create a new one
   */
  router.post('/:id/clone', authenticate, emailPermissions.writeTemplates(), async (req: Request, res: Response) => {
    try {
      const cloneData = cloneEmailTemplateDTOSchema.parse({
        templateId: req.params.id,
        ...req.body,
      });

      // TODO: Implement clone logic in TemplateService
      res.json({ success: true, message: 'Template cloned' });
    } catch (error) {
      logger.error({ error, templateId: req.params.id }, 'Error cloning template');
      res.status(500).json({ error: 'Failed to clone template' });
    }
  });

  /**
   * GET /api/email/templates/:id/versions
   * Get all versions of a template
   */
  router.get('/:id/versions', authenticate, emailPermissions.readTemplates(), async (req: Request, res: Response) => {
    try {

      const versions = await templateService.getTemplateVersions(req.params.id);

      res.json({
        templateId: req.params.id,
        currentVersion: versions[0]?.version ?? 1,
        versions,
      });
    } catch (error) {
      logger.error({ error, templateId: req.params.id }, 'Error getting template versions');
      res.status(500).json({ error: 'Failed to get template versions' });
    }
  });

  /**
   * POST /api/email/templates/:id/rollback
   * Rollback template to previous version
   */
  router.post('/:id/rollback', authenticate, emailPermissions.writeTemplates(), async (req: Request, res: Response) => {
    try {
      const rollbackData = rollbackTemplateDTOSchema.parse({
        templateId: req.params.id,
        ...req.body,
      });

      const updated = await templateService.rollbackTemplate(
        rollbackData.templateId,
        rollbackData.targetVersion,
      );

      logger.info(
        {
          templateId: updated.id,
          targetVersion: rollbackData.targetVersion,
          newVersion: updated.version,
        },
        'Rolled back template',
      );

      res.json(updated);
    } catch (error) {
      logger.error({ error, templateId: req.params.id }, 'Error rolling back template');
      res.status(500).json({ error: 'Failed to rollback template' });
    }
  });

  /**
   * POST /api/email/templates/preview
   * Preview template with sample data
   */
  router.post('/preview', authenticate, emailPermissions.readTemplates(), async (req: Request, res: Response) => {
    try {
      const previewData = previewTemplateDTOSchema.parse(req.body);

      let templateName: string;

      if (previewData.templateName) {
        templateName = previewData.templateName;
      } else if (previewData.templateId) {
        const template = await templateService.getTemplate(previewData.templateId);
        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }
        templateName = template.name;
      } else if (previewData.content) {
        // TODO: Support rendering arbitrary content
        return res.status(501).json({ error: 'Rendering arbitrary content not yet supported' });
      } else {
        return res.status(400).json({ error: 'Must provide templateName, templateId, or content' });
      }

      const rendered = await templateService.renderTemplate(templateName, previewData.templateData);

      res.json(rendered);
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error previewing template');
      res.status(500).json({ error: 'Failed to preview template' });
    }
  });

  return router;
}
