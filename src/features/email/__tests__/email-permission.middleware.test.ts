/**
 * Email Permission Middleware Unit Tests
 *
 * Tests IAM integration, super admin bypass, and tenant validation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireEmailPermission, emailPermissions } from '../email-permission.middleware';
import { testUsers, createMockRequest, createMockResponse, createMockNext } from './helpers/test-fixtures';

// Mock dependencies
vi.mock('../../iam/permissions.service', () => ({
  permissionsService: {
    canPerformAction: vi.fn(),
  },
}));

vi.mock('../email-iam-features', () => ({
  getIAMFeatureForPermission: vi.fn((permission) => ({
    featureKey: 'feature_email_send',
    action: 'Create',
  })),
}));

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { permissionsService } from '../../iam/permissions.service';

describe('Email Permission Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  describe('requireEmailPermission()', () => {
    it('should allow authenticated user with permission', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = 'company-123';
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated user', async () => {
      // Arrange
      req.user = undefined;
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'ERR_AUTH_001',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should bypass permission check for super admin', async () => {
      // Arrange
      req.user = testUsers.superAdmin;
      req.tenantId = 'company-123';
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(permissionsService.canPerformAction).not.toHaveBeenCalled();
    });

    it('should deny user without permission', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = 'company-123';
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(false);
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'ERR_EMAIL_PERM_001',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should require tenant context', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = undefined;
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ERR_EMAIL_PERM_003',
          message: expect.stringContaining('Tenant context required'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle permission service errors', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = 'company-123';
      vi.mocked(permissionsService.canPerformAction).mockRejectedValue(new Error('DB Error'));
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ERR_EMAIL_PERM_002',
          message: expect.stringContaining('authorization error'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call IAM with correct parameters', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = 'company-123';
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-regular',
        'feature_email_send',
        'Create',
        'company-123'
      );
    });
  });

  describe('emailPermissions shortcuts', () => {
    it('should create send permission middleware', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = 'company-123';
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);
      const middleware = emailPermissions.send();

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('should create readTemplates permission middleware', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = 'company-123';
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);
      const middleware = emailPermissions.readTemplates();

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    it('should create writeConfig permission middleware', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = 'company-123';
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);
      const middleware = emailPermissions.writeConfig();

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user without companyId', async () => {
      // Arrange
      req.user = { ...testUsers.regularUser, companyId: undefined };
      req.tenantId = 'company-123';
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'company-123' // Should use tenantId
      );
    });

    it('should handle empty tenant ID', async () => {
      // Arrange
      req.user = testUsers.regularUser;
      req.tenantId = '';
      const middleware = requireEmailPermission('email:send');

      // Act
      await middleware(req as Request, res as Response, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
