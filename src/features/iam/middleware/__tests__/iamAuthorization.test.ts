/**
 * IAM Authorization Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  requireUserLevelManagement,
  requirePermissionManagement,
  requireUserAssignment,
  requireIAMRead,
} from '../iamAuthorization';
import { permissionsService } from '../../permissions.service';

// Mock the permissions service
vi.mock('../../permissions.service', () => ({
  permissionsService: {
    canPerformAction: vi.fn(),
  },
}));

describe('IAM Authorization Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let consoleErrorSpy: any;

  beforeEach(() => {
    req = {
      user: {
        userId: 'user-123',
        companyId: 'company-456',
      },
      tenantId: 'company-456',
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();

    // Suppress console.error in tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('requireUserLevelManagement', () => {
    it('should allow when user has permission', async () => {
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);

      await requireUserLevelManagement(req as Request, res as Response, next);

      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_user_levels',
        'Update',
        'company-456'
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny when user lacks permission', async () => {
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(false);

      await requireUserLevelManagement(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'ERR_AUTH_003',
          message: 'You do not have permission to manage user levels',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 with clear message when denied', async () => {
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(false);

      await requireUserLevelManagement(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You do not have permission to manage user levels',
        })
      );
    });

    it('should handle permission service errors', async () => {
      vi.mocked(permissionsService.canPerformAction).mockRejectedValue(
        new Error('Database error')
      );

      await requireUserLevelManagement(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Authorization check failed',
        })
      );
      expect(next).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'User level authorization error:',
        expect.any(Error)
      );
    });

    it('should use tenantId if user.companyId is missing', async () => {
      req.user = { userId: 'user-123' };
      req.tenantId = 'company-789';
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);

      await requireUserLevelManagement(req as Request, res as Response, next);

      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_user_levels',
        'Update',
        'company-789'
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requirePermissionManagement', () => {
    it('should allow when user has permission', async () => {
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);

      await requirePermissionManagement(req as Request, res as Response, next);

      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_permissions',
        'Update',
        'company-456'
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny when user lacks permission', async () => {
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(false);

      await requirePermissionManagement(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'ERR_AUTH_003',
          message: 'You do not have permission to manage permissions',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should check Update action on feature_iam_permissions', async () => {
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);

      await requirePermissionManagement(req as Request, res as Response, next);

      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_permissions',
        'Update',
        'company-456'
      );
    });

    it('should handle permission service errors', async () => {
      vi.mocked(permissionsService.canPerformAction).mockRejectedValue(
        new Error('Database error')
      );

      await requirePermissionManagement(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Authorization check failed',
        })
      );
      expect(next).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Permission authorization error:',
        expect.any(Error)
      );
    });
  });

  describe('requireUserAssignment', () => {
    it('should allow when user has permission', async () => {
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(true);

      await requireUserAssignment(req as Request, res as Response, next);

      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_user_levels',
        'Update',
        'company-456'
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny when user lacks permission', async () => {
      vi.mocked(permissionsService.canPerformAction).mockResolvedValue(false);

      await requireUserAssignment(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'ERR_AUTH_003',
          message: 'You do not have permission to assign user levels',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle permission service errors', async () => {
      vi.mocked(permissionsService.canPerformAction).mockRejectedValue(
        new Error('Database error')
      );

      await requireUserAssignment(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Authorization check failed',
        })
      );
      expect(next).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'User assignment authorization error:',
        expect.any(Error)
      );
    });
  });

  describe('requireIAMRead', () => {
    it('should allow when user has Read permission on user_levels', async () => {
      vi.mocked(permissionsService.canPerformAction)
        .mockResolvedValueOnce(true)  // canReadLevels
        .mockResolvedValueOnce(false); // canReadPerms

      await requireIAMRead(req as Request, res as Response, next);

      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_user_levels',
        'Read',
        'company-456'
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow when user has Read permission on permissions', async () => {
      vi.mocked(permissionsService.canPerformAction)
        .mockResolvedValueOnce(false) // canReadLevels
        .mockResolvedValueOnce(true);  // canReadPerms

      await requireIAMRead(req as Request, res as Response, next);

      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_permissions',
        'Read',
        'company-456'
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow when user has Read permission on both', async () => {
      vi.mocked(permissionsService.canPerformAction)
        .mockResolvedValueOnce(true)  // canReadLevels
        .mockResolvedValueOnce(true);  // canReadPerms

      await requireIAMRead(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny when user has neither permission', async () => {
      vi.mocked(permissionsService.canPerformAction)
        .mockResolvedValueOnce(false) // canReadLevels
        .mockResolvedValueOnce(false); // canReadPerms

      await requireIAMRead(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'ERR_AUTH_003',
          message: 'You do not have permission to view IAM data',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should check both permissions in parallel', async () => {
      vi.mocked(permissionsService.canPerformAction)
        .mockResolvedValueOnce(true)  // canReadLevels
        .mockResolvedValueOnce(true);  // canReadPerms

      await requireIAMRead(req as Request, res as Response, next);

      // Both should be called
      expect(permissionsService.canPerformAction).toHaveBeenCalledTimes(2);
      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_user_levels',
        'Read',
        'company-456'
      );
      expect(permissionsService.canPerformAction).toHaveBeenCalledWith(
        'user-123',
        'feature_iam_permissions',
        'Read',
        'company-456'
      );
    });

    it('should handle permission service errors', async () => {
      vi.mocked(permissionsService.canPerformAction).mockRejectedValue(
        new Error('Database error')
      );

      await requireIAMRead(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Authorization check failed',
        })
      );
      expect(next).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'IAM read authorization error:',
        expect.any(Error)
      );
    });
  });
});
