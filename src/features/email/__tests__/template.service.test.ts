/**
 * Template Service Unit Tests
 *
 * Tests the TemplateService rendering, caching, and variable replacement functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TemplateService } from '../template.service';
import { testTemplates } from './helpers/test-fixtures';

// Mock dependencies
vi.mock('../../../shared/db/index', () => ({
  db: {
    query: {
      emailTemplates: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      emailTemplateVersions: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
  },
}));

vi.mock('@react-email/render', () => ({
  render: vi.fn((component) => '<html>Rendered Email</html>'),
}));

vi.mock('../templates/index', () => ({
  EMAIL_TEMPLATES: {
    welcome: vi.fn(() => Promise.resolve({ default: (data: any) => '<div>Welcome</div>' })),
  },
}));

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { db } from '../../../shared/db/index';

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
    vi.clearAllMocks();
  });

  describe('getTemplate()', () => {
    it('should return published template from database', async () => {
      // Arrange
      const mockTemplate = { ...testTemplates.customDraft, status: 'published' };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.getTemplate('custom-template');

      // Assert
      expect(result).toEqual(mockTemplate);
      expect(db.query.emailTemplates.findFirst).toHaveBeenCalled();
    });

    it('should fallback to code-based template', async () => {
      // Arrange
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(null);

      // Act
      const result = await templateService.getTemplate('welcome');

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe('welcome');
      expect(result?.isSystemTemplate).toBe(true);
    });

    it('should return null for non-existent template', async () => {
      // Arrange
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(null);

      // Act
      const result = await templateService.getTemplate('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      vi.mocked(db.query.emailTemplates.findFirst).mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(templateService.getTemplate('test')).rejects.toThrow('DB Error');
    });
  });

  describe('renderTemplate()', () => {
    it('should render HTML template with variable substitution', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        contentType: 'html' as const,
        content: '<html><body>Hello {{name}}!</body></html>',
        subjectTemplate: 'Welcome {{name}}',
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.renderTemplate('custom-template', { name: 'John' });

      // Assert
      expect(result.html).toContain('Hello John!');
      expect(result.subject).toBe('Welcome John');
    });

    it('should render React Email template', async () => {
      // Arrange
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(null);

      // Act
      const result = await templateService.renderTemplate('welcome', {
        userName: 'John',
        companyName: 'Acme',
        loginUrl: 'https://example.com',
      });

      // Assert
      expect(result.html).toContain('Rendered Email');
    });

    it('should throw error for missing template', async () => {
      // Arrange
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        templateService.renderTemplate('non-existent', {})
      ).rejects.toThrow('not found');
    });

    it('should throw error for missing required variables', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        variables: [
          { name: 'requiredVar', type: 'string', required: true },
        ],
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(
        templateService.renderTemplate('custom-template', {})
      ).rejects.toThrow('Missing required template variables');
    });

    it('should replace multiple occurrences of same variable', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        content: '<html>{{name}} and {{name}} again</html>',
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.renderTemplate('custom-template', { name: 'John' });

      // Assert
      expect(result.html).toBe('<html>John and John again</html>');
    });

    it('should handle variables with special characters', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        content: '<html>{{message}}</html>',
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.renderTemplate('custom-template', {
        message: 'Hello <world> & "friends"',
      });

      // Assert
      expect(result.html).toContain('Hello <world> & "friends"');
    });

    it('should convert HTML to plain text', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        content: '<html><body><p>Hello World!</p></body></html>',
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.renderTemplate('custom-template', { name: 'John' });

      // Assert
      expect(result.text).toBeDefined();
      expect(result.text).not.toContain('<');
      expect(result.text).toContain('Hello World');
    });

    it('should handle empty template data', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        content: '<html>No variables here</html>',
        variables: [],
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.renderTemplate('custom-template', {});

      // Assert
      expect(result.html).toBe('<html>No variables here</html>');
    });
  });

  describe('upsertTemplate()', () => {
    it('should create new template', async () => {
      // Arrange
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(null);
      const mockCreated = { ...testTemplates.customDraft, id: 'new-template-id' };
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreated]),
        }),
      } as any);

      // Act
      const result = await templateService.upsertTemplate({
        name: 'new-template',
        displayName: 'New Template',
        category: 'marketing',
        status: 'draft',
        contentType: 'html',
        content: '<html>Content</html>',
        variables: [],
        subjectTemplate: 'Subject',
        version: 1,
        isSystemTemplate: false,
        parentTemplateId: null,
        createdBy: 'user-123',
        updatedBy: 'user-123',
      });

      // Assert
      expect(result).toEqual(mockCreated);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should update existing template and create version', async () => {
      // Arrange
      const existing = { ...testTemplates.customDraft };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(existing);
      const mockUpdated = { ...existing, version: 2 };
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      } as any);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      // Act
      const result = await templateService.upsertTemplate({
        name: 'custom-template',
        displayName: 'Updated Template',
        category: 'marketing',
        status: 'draft',
        contentType: 'html',
        content: '<html>New Content</html>',
        variables: [],
        subjectTemplate: 'Subject',
        version: 1,
        isSystemTemplate: false,
        parentTemplateId: null,
        createdBy: 'user-123',
        updatedBy: 'user-123',
      });

      // Assert
      expect(result.version).toBe(2);
      expect(db.insert).toHaveBeenCalled(); // Version created
      expect(db.update).toHaveBeenCalled(); // Template updated
    });
  });

  describe('publishTemplate()', () => {
    it('should publish draft template', async () => {
      // Arrange
      const draftTemplate = { ...testTemplates.customDraft, status: 'draft' };
      const publishedTemplate = { ...draftTemplate, status: 'published', publishedAt: new Date() };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(draftTemplate);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([publishedTemplate]),
          }),
        }),
      } as any);

      // Act
      const result = await templateService.publishTemplate('template-id', 'user-123');

      // Assert
      expect(result.status).toBe('published');
      expect(result.publishedAt).toBeDefined();
    });

    it('should not publish system templates', async () => {
      // Arrange
      const systemTemplate = { ...testTemplates.welcome, isSystemTemplate: true };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(systemTemplate);

      // Act & Assert
      await expect(
        templateService.publishTemplate('template-id', 'user-123')
      ).rejects.toThrow('Cannot publish system templates');
    });

    it('should handle already published templates', async () => {
      // Arrange
      const publishedTemplate = { ...testTemplates.customDraft, status: 'published' };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(publishedTemplate);

      // Act
      const result = await templateService.publishTemplate('template-id', 'user-123');

      // Assert
      expect(result.status).toBe('published');
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('archiveTemplate()', () => {
    it('should archive template', async () => {
      // Arrange
      const activeTemplate = { ...testTemplates.customDraft, status: 'published' };
      const archivedTemplate = { ...activeTemplate, status: 'archived' };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(activeTemplate);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([archivedTemplate]),
          }),
        }),
      } as any);

      // Act
      const result = await templateService.archiveTemplate('template-id');

      // Assert
      expect(result.status).toBe('archived');
    });

    it('should not archive system templates', async () => {
      // Arrange
      const systemTemplate = { ...testTemplates.welcome, isSystemTemplate: true };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(systemTemplate);

      // Act & Assert
      await expect(
        templateService.archiveTemplate('template-id')
      ).rejects.toThrow('Cannot archive system templates');
    });
  });

  describe('cloneTemplate()', () => {
    it('should clone template with new name', async () => {
      // Arrange
      const sourceTemplate = { ...testTemplates.customDraft };
      vi.mocked(db.query.emailTemplates.findFirst)
        .mockResolvedValueOnce(sourceTemplate) // Source lookup
        .mockResolvedValueOnce(null); // Name availability check
      const clonedTemplate = {
        ...sourceTemplate,
        id: 'cloned-id',
        name: 'cloned-template',
        displayName: 'Custom Template (Copy)',
        version: 1,
        status: 'draft',
      };
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([clonedTemplate]),
        }),
      } as any);

      // Act
      const result = await templateService.cloneTemplate('template-id', 'cloned-template', 'user-123');

      // Assert
      expect(result.name).toBe('cloned-template');
      expect(result.displayName).toContain('(Copy)');
      expect(result.status).toBe('draft');
      expect(result.isSystemTemplate).toBe(false);
    });

    it('should throw error if new name already exists', async () => {
      // Arrange
      const sourceTemplate = { ...testTemplates.customDraft };
      const existingTemplate = { ...testTemplates.customDraft, name: 'existing-name' };
      vi.mocked(db.query.emailTemplates.findFirst)
        .mockResolvedValueOnce(sourceTemplate)
        .mockResolvedValueOnce(existingTemplate);

      // Act & Assert
      await expect(
        templateService.cloneTemplate('template-id', 'existing-name', 'user-123')
      ).rejects.toThrow('already exists');
    });
  });

  describe('listTemplates()', () => {
    it('should list templates with pagination', async () => {
      // Arrange
      const mockTemplates = [
        { ...testTemplates.welcome },
        { ...testTemplates.customDraft },
      ];
      vi.mocked(db.query.emailTemplates.findMany).mockResolvedValue(mockTemplates);

      // Act
      const result = await templateService.listTemplates({
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.templates).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      // Arrange
      const publishedTemplate = { ...testTemplates.welcome, status: 'published' };
      vi.mocked(db.query.emailTemplates.findMany).mockResolvedValue([publishedTemplate]);

      // Act
      const result = await templateService.listTemplates({
        status: 'published',
      });

      // Assert
      expect(result.templates.every(t => t.status === 'published')).toBe(true);
    });

    it('should search by name and description', async () => {
      // Arrange
      const mockTemplates = [
        { ...testTemplates.welcome, name: 'welcome', displayName: 'Welcome Email' },
      ];
      vi.mocked(db.query.emailTemplates.findMany).mockResolvedValue(mockTemplates);

      // Act
      const result = await templateService.listTemplates({
        search: 'welcome',
      });

      // Assert
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].name).toContain('welcome');
    });
  });

  describe('getTemplateVersions()', () => {
    it('should return all versions of a template', async () => {
      // Arrange
      const mockVersions = [
        { templateId: 'template-id', version: 2, content: 'v2' },
        { templateId: 'template-id', version: 1, content: 'v1' },
      ];
      vi.mocked(db.query.emailTemplateVersions.findMany).mockResolvedValue(mockVersions);

      // Act
      const result = await templateService.getTemplateVersions('template-id');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2); // Latest first
    });
  });

  describe('rollbackTemplate()', () => {
    it('should rollback to previous version', async () => {
      // Arrange
      const targetVersion = {
        templateId: 'template-id',
        version: 1,
        content: 'old-content',
        variables: [],
        subjectTemplate: 'Old Subject',
      };
      const currentTemplate = { ...testTemplates.customDraft, version: 2 };
      vi.mocked(db.query.emailTemplateVersions.findFirst).mockResolvedValue(targetVersion);
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(currentTemplate);
      const rolledBackTemplate = { ...currentTemplate, version: 3, content: 'old-content' };
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([rolledBackTemplate]),
          }),
        }),
      } as any);

      // Act
      const result = await templateService.rollbackTemplate('template-id', 1);

      // Assert
      expect(result.version).toBe(3); // New version created
      expect(result.content).toBe('old-content'); // Content restored
    });

    it('should throw error if target version not found', async () => {
      // Arrange
      vi.mocked(db.query.emailTemplateVersions.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        templateService.rollbackTemplate('template-id', 99)
      ).rejects.toThrow('Version 99 not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle template with no variables', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        variables: [],
        content: '<html>Static content</html>',
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.renderTemplate('custom-template', {});

      // Assert
      expect(result.html).toBe('<html>Static content</html>');
    });

    it('should handle undefined variable values', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        content: '<html>{{optionalVar}}</html>',
        variables: [{ name: 'optionalVar', type: 'string', required: false }],
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.renderTemplate('custom-template', { optionalVar: undefined });

      // Assert
      expect(result.html).toBe('<html></html>');
    });

    it('should handle null template data values', async () => {
      // Arrange
      const mockTemplate = {
        ...testTemplates.customDraft,
        content: '<html>{{value}}</html>',
        variables: [{ name: 'value', type: 'string', required: false }],
      };
      vi.mocked(db.query.emailTemplates.findFirst).mockResolvedValue(mockTemplate);

      // Act
      const result = await templateService.renderTemplate('custom-template', { value: null });

      // Assert
      expect(result.html).toBe('<html></html>');
    });
  });
});
