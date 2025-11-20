/**
 * Email Admin Routes Integration Tests
 *
 * Comprehensive integration tests for templates, logs, and config routes.
 * Tests all CRUD operations, pagination, filtering, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import express from 'express';
import { createEmailTemplatesRouter } from '../../email-templates.route';
import { createEmailLogsRouter } from '../../email-logs.route';
import { createEmailConfigRouter } from '../../email-config.route';
import { testUsers, testTemplates } from '../helpers/test-fixtures';

// Mock dependencies
vi.mock('../../template.service');
vi.mock('../../email.service');
vi.mock('../../config.service');
vi.mock('../../../../shared/middleware/authenticate', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { ...testUsers.regularUser, id: testUsers.regularUser.userId };
    req.tenantId = 'company-123';
    next();
  },
}));
vi.mock('../../../../shared/middleware/authorize', () => ({
  requireSuperadmin: () => (req: any, res: any, next: any) => next(),
}));
vi.mock('../../email-permission.middleware', () => ({
  emailPermissions: {
    readTemplates: () => (req: any, res: any, next: any) => next(),
    writeTemplates: () => (req: any, res: any, next: any) => next(),
    publishTemplates: () => (req: any, res: any, next: any) => next(),
    deleteTemplates: () => (req: any, res: any, next: any) => next(),
    readLogs: () => (req: any, res: any, next: any) => next(),
    retryLogs: () => (req: any, res: any, next: any) => next(),
    deleteLogs: () => (req: any, res: any, next: any) => next(),
    readConfig: () => (req: any, res: any, next: any) => next(),
    writeConfig: () => (req: any, res: any, next: any) => next(),
    deleteConfig: () => (req: any, res: any, next: any) => next(),
  },
}));
vi.mock('../../../../shared/db/index', () => ({
  db: {
    query: {
      emailLogs: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      systemConfig: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));
vi.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { TemplateService } from '../../template.service';
import { EmailService } from '../../email.service';
import { ConfigService } from '../../config.service';
import { db } from '../../../../shared/db/index';

describe('Email Templates Route Integration Tests', () => {
  let app: Express;
  let mockTemplateService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/email/templates', createEmailTemplatesRouter());
    mockTemplateService = TemplateService.prototype;
  });

  describe('GET /api/email/templates', () => {
    it('should list templates with pagination', async () => {
      // Arrange
      mockTemplateService.listTemplates = vi.fn().mockResolvedValue({
        templates: [testTemplates.welcome, testTemplates.customDraft],
        total: 2,
      });

      // Act
      const response = await request(app)
        .get('/api/email/templates')
        .query({ page: 1, limit: 20 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.templates).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
      });
    });

    it('should filter templates by status', async () => {
      // Arrange
      mockTemplateService.listTemplates = vi.fn().mockResolvedValue({
        templates: [testTemplates.welcome],
        total: 1,
      });

      // Act
      const response = await request(app)
        .get('/api/email/templates')
        .query({ status: 'published' });

      // Assert
      expect(response.status).toBe(200);
      expect(mockTemplateService.listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' })
      );
    });

    it('should search templates', async () => {
      // Arrange
      mockTemplateService.listTemplates = vi.fn().mockResolvedValue({
        templates: [testTemplates.welcome],
        total: 1,
      });

      // Act
      const response = await request(app)
        .get('/api/email/templates')
        .query({ search: 'welcome' });

      // Assert
      expect(response.status).toBe(200);
      expect(mockTemplateService.listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'welcome' })
      );
    });
  });

  describe('GET /api/email/templates/:id', () => {
    it('should return template by ID', async () => {
      // Arrange
      mockTemplateService.getTemplate = vi.fn().mockResolvedValue(testTemplates.welcome);

      // Act
      const response = await request(app).get('/api/email/templates/template-welcome');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('welcome');
    });

    it('should return 404 for non-existent template', async () => {
      // Arrange
      mockTemplateService.getTemplate = vi.fn().mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/email/templates/non-existent');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/email/templates', () => {
    it('should create template', async () => {
      // Arrange
      const newTemplate = {
        name: 'new-template',
        displayName: 'New Template',
        category: 'marketing',
        contentType: 'html',
        content: '<html>Test</html>',
        variables: [],
        subjectTemplate: 'Test Subject',
      };
      mockTemplateService.upsertTemplate = vi.fn().mockResolvedValue({
        ...newTemplate,
        id: 'new-id',
      });

      // Act
      const response = await request(app)
        .post('/api/email/templates')
        .send(newTemplate);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('new-template');
    });

    it('should return 409 for duplicate name', async () => {
      // Arrange
      mockTemplateService.upsertTemplate = vi.fn().mockRejectedValue(
        new Error('unique constraint')
      );

      // Act
      const response = await request(app)
        .post('/api/email/templates')
        .send({ name: 'duplicate' });

      // Assert
      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/email/templates/:id/publish', () => {
    it('should publish template', async () => {
      // Arrange
      const published = { ...testTemplates.customDraft, status: 'published' };
      mockTemplateService.publishTemplate = vi.fn().mockResolvedValue(published);

      // Act
      const response = await request(app)
        .post('/api/email/templates/template-id/publish');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.template.status).toBe('published');
    });

    it('should not publish system templates', async () => {
      // Arrange
      mockTemplateService.publishTemplate = vi.fn().mockRejectedValue(
        new Error('Cannot publish system templates')
      );

      // Act
      const response = await request(app)
        .post('/api/email/templates/system-template/publish');

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/email/templates/:id/clone', () => {
    it('should clone template', async () => {
      // Arrange
      const cloned = { ...testTemplates.customDraft, id: 'cloned-id', name: 'cloned' };
      mockTemplateService.cloneTemplate = vi.fn().mockResolvedValue(cloned);

      // Act
      const response = await request(app)
        .post('/api/email/templates/source-id/clone')
        .send({ newName: 'cloned' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.template.name).toBe('cloned');
    });
  });
});

describe('Email Logs Route Integration Tests', () => {
  let app: Express;
  let mockEmailService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/email/logs', createEmailLogsRouter());
    mockEmailService = EmailService.prototype;
  });

  describe('GET /api/email/logs', () => {
    it('should list email logs with pagination', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findMany).mockResolvedValue([
        { id: 'log-1', status: 'sent', toAddress: 'test@example.com' },
      ] as any);

      // Act
      const response = await request(app)
        .get('/api/email/logs')
        .query({ page: 1, limit: 20 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter logs by status', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findMany).mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/api/email/logs')
        .query({ status: 'failed' });

      // Assert
      expect(response.status).toBe(200);
    });

    it('should filter logs by date range', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findMany).mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/api/email/logs')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/email/logs/:id', () => {
    it('should return log by ID', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findFirst).mockResolvedValue({
        id: 'log-123',
        status: 'sent',
      } as any);

      // Act
      const response = await request(app).get('/api/email/logs/log-123');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('log-123');
    });

    it('should return 404 for non-existent log', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findFirst).mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/email/logs/non-existent');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/email/logs/:id/retry', () => {
    it('should retry failed email', async () => {
      // Arrange
      mockEmailService.retryFailedEmail = vi.fn().mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/api/email/logs/log-123/retry')
        .send({ force: false });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent log', async () => {
      // Arrange
      mockEmailService.retryFailedEmail = vi.fn().mockRejectedValue(
        new Error('Email log not found')
      );

      // Act
      const response = await request(app)
        .post('/api/email/logs/non-existent/retry');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/email/logs/:id', () => {
    it('should delete email log', async () => {
      // Act
      const response = await request(app).delete('/api/email/logs/log-123');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('Email Config Route Integration Tests', () => {
  let app: Express;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/email/config', createEmailConfigRouter());
    mockConfigService = ConfigService.prototype;
  });

  describe('GET /api/email/config', () => {
    it('should list all configuration', async () => {
      // Arrange
      mockConfigService.getAll = vi.fn().mockResolvedValue([
        {
          key: 'EMAIL_FROM_ADDRESS',
          value: 'from@example.com',
          effectiveValue: 'from@example.com',
          source: 'database',
        },
      ]);

      // Act
      const response = await request(app).get('/api/email/config');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.configs).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should hide sensitive values by default', async () => {
      // Arrange
      mockConfigService.getAll = vi.fn().mockResolvedValue([
        {
          key: 'SECRET_KEY',
          value: 'secret',
          effectiveValue: 'secret',
          source: 'database',
          dbConfig: { isSensitive: true },
        },
      ]);

      // Act
      const response = await request(app).get('/api/email/config');

      // Assert
      expect(response.status).toBe(200);
      const secretConfig = response.body.configs.find((c: any) => c.key === 'SECRET_KEY');
      expect(secretConfig?.value).toBe('***REDACTED***');
    });

    it('should show sensitive values when requested', async () => {
      // Arrange
      mockConfigService.getAll = vi.fn().mockResolvedValue([
        {
          key: 'SECRET_KEY',
          value: 'secret',
          effectiveValue: 'secret',
          source: 'database',
          dbConfig: { isSensitive: true },
        },
      ]);

      // Act
      const response = await request(app)
        .get('/api/email/config')
        .query({ showSensitive: 'true' });

      // Assert
      expect(response.status).toBe(200);
      const secretConfig = response.body.configs.find((c: any) => c.key === 'SECRET_KEY');
      expect(secretConfig?.value).toBe('secret');
    });
  });

  describe('GET /api/email/config/:key', () => {
    it('should return config by key', async () => {
      // Arrange
      mockConfigService.get = vi.fn().mockResolvedValue('from@example.com');
      vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue({
        key: 'EMAIL_FROM_ADDRESS',
        value: 'from@example.com',
      } as any);

      // Act
      const response = await request(app).get('/api/email/config/EMAIL_FROM_ADDRESS');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.key).toBe('EMAIL_FROM_ADDRESS');
      expect(response.body.value).toBe('from@example.com');
    });

    it('should return 404 for non-existent key', async () => {
      // Arrange
      mockConfigService.get = vi.fn().mockResolvedValue(null);

      // Act
      const response = await request(app).get('/api/email/config/NON_EXISTENT');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/email/config', () => {
    it('should create configuration', async () => {
      // Arrange
      mockConfigService.set = vi.fn().mockResolvedValue({
        key: 'NEW_KEY',
        value: 'new-value',
      });

      // Act
      const response = await request(app)
        .post('/api/email/config')
        .send({
          key: 'NEW_KEY',
          value: 'new-value',
          valueType: 'string',
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.key).toBe('NEW_KEY');
    });

    it('should return 409 for duplicate key', async () => {
      // Arrange
      mockConfigService.set = vi.fn().mockRejectedValue(
        new Error('unique constraint')
      );

      // Act
      const response = await request(app)
        .post('/api/email/config')
        .send({ key: 'EXISTING_KEY', value: 'value' });

      // Assert
      expect(response.status).toBe(409);
    });

    it('should return 400 for validation errors', async () => {
      // Arrange
      mockConfigService.set = vi.fn().mockRejectedValue(
        new Error('validation error: Value is required')
      );

      // Act
      const response = await request(app)
        .post('/api/email/config')
        .send({ key: 'TEST_KEY', value: '' });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/email/config/:key', () => {
    it('should update configuration', async () => {
      // Arrange
      mockConfigService.set = vi.fn().mockResolvedValue({
        key: 'EXISTING_KEY',
        value: 'updated-value',
      });

      // Act
      const response = await request(app)
        .put('/api/email/config/EXISTING_KEY')
        .send({ value: 'updated-value' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.value).toBe('updated-value');
    });
  });

  describe('DELETE /api/email/config/:key', () => {
    it('should delete configuration', async () => {
      // Arrange
      mockConfigService.delete = vi.fn().mockResolvedValue(undefined);

      // Act
      const response = await request(app).delete('/api/email/config/TEST_KEY');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
