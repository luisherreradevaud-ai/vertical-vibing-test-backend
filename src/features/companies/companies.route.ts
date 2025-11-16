import { Router } from 'express';
import { authenticateJWT } from '../../shared/middleware/auth';
import { ApiResponse } from '../../shared/utils/response';
import { CompaniesService } from './companies.service';
import type { CreateCompanyDTO, UpdateCompanyDTO, AddCompanyMemberDTO, UpdateCompanyMemberDTO } from '@vertical-vibing/shared-types';

export function createCompaniesRouter(): Router {
  const router = Router();
  const companiesService = new CompaniesService();

  /**
   * GET /api/companies - Get user's companies
   */
  router.get('/', authenticateJWT, async (req, res) => {
    try {
      const companies = await companiesService.getUserCompanies(req.user!.userId);
      return ApiResponse.success(res, { companies });
    } catch (error) {
      console.error('Get companies error:', error);
      return ApiResponse.error(res, 'Failed to get companies', 500);
    }
  });

  /**
   * POST /api/companies - Create a new company
   */
  router.post('/', authenticateJWT, async (req, res) => {
    try {
      const data = req.body as CreateCompanyDTO;

      if (!data.name || !data.slug) {
        return ApiResponse.error(res, 'Name and slug are required', 400);
      }

      const company = await companiesService.createCompany({
        name: data.name,
        slug: data.slug,
        ownerId: req.user!.userId,
      });

      return ApiResponse.created(res, { company });
    } catch (error) {
      console.error('Create company error:', error);
      if (error instanceof Error && error.message === 'Company slug already exists') {
        return ApiResponse.conflict(res, error.message);
      }
      return ApiResponse.error(res, 'Failed to create company', 500);
    }
  });

  /**
   * GET /api/companies/:id - Get company by ID
   */
  router.get('/:id', authenticateJWT, async (req, res) => {
    try {
      const company = await companiesService.getCompanyWithMembers(req.params.id);
      if (!company) {
        return ApiResponse.notFound(res, 'Company not found');
      }

      return ApiResponse.success(res, { company });
    } catch (error) {
      console.error('Get company error:', error);
      return ApiResponse.error(res, 'Failed to get company', 500);
    }
  });

  /**
   * PATCH /api/companies/:id - Update company
   */
  router.patch('/:id', authenticateJWT, async (req, res) => {
    try {
      const data = req.body as UpdateCompanyDTO;

      const company = await companiesService.updateCompany(
        req.params.id,
        req.user!.userId,
        data
      );

      return ApiResponse.success(res, { company });
    } catch (error) {
      console.error('Update company error:', error);
      if (error instanceof Error) {
        if (error.message === 'Insufficient permissions') {
          return ApiResponse.forbidden(res, error.message);
        }
        if (error.message === 'Company slug already exists') {
          return ApiResponse.conflict(res, error.message);
        }
        if (error.message === 'Company not found') {
          return ApiResponse.notFound(res, error.message);
        }
      }
      return ApiResponse.error(res, 'Failed to update company', 500);
    }
  });

  /**
   * DELETE /api/companies/:id - Delete company
   */
  router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
      await companiesService.deleteCompany(req.params.id, req.user!.userId);
      return ApiResponse.success(res, { message: 'Company deleted successfully' });
    } catch (error) {
      console.error('Delete company error:', error);
      if (error instanceof Error) {
        if (error.message.includes('owner')) {
          return ApiResponse.forbidden(res, error.message);
        }
        if (error.message === 'Company not found') {
          return ApiResponse.notFound(res, error.message);
        }
      }
      return ApiResponse.error(res, 'Failed to delete company', 500);
    }
  });

  /**
   * GET /api/companies/:id/members - Get company members
   */
  router.get('/:id/members', authenticateJWT, async (req, res) => {
    try {
      const members = await companiesService.getMembers(req.params.id, req.user!.userId);
      return ApiResponse.success(res, { members });
    } catch (error) {
      console.error('Get members error:', error);
      if (error instanceof Error && error.message.includes('Not a member')) {
        return ApiResponse.forbidden(res, error.message);
      }
      return ApiResponse.error(res, 'Failed to get members', 500);
    }
  });

  /**
   * POST /api/companies/:id/members - Add a member
   */
  router.post('/:id/members', authenticateJWT, async (req, res) => {
    try {
      const data = req.body as AddCompanyMemberDTO;

      if (!data.email || !data.role) {
        return ApiResponse.error(res, 'Email and role are required', 400);
      }

      const member = await companiesService.addMember(
        req.params.id,
        req.user!.userId,
        data
      );

      return ApiResponse.created(res, { member });
    } catch (error) {
      console.error('Add member error:', error);
      if (error instanceof Error) {
        if (error.message === 'Insufficient permissions') {
          return ApiResponse.forbidden(res, error.message);
        }
        if (error.message === 'User not found') {
          return ApiResponse.notFound(res, error.message);
        }
        if (error.message.includes('already a member')) {
          return ApiResponse.conflict(res, error.message);
        }
      }
      return ApiResponse.error(res, 'Failed to add member', 500);
    }
  });

  /**
   * PATCH /api/companies/:id/members/:userId - Update member role
   */
  router.patch('/:id/members/:userId', authenticateJWT, async (req, res) => {
    try {
      const data = req.body as UpdateCompanyMemberDTO;

      if (!data.role) {
        return ApiResponse.error(res, 'Role is required', 400);
      }

      const member = await companiesService.updateMemberRole(
        req.params.id,
        req.user!.userId,
        req.params.userId,
        data.role
      );

      return ApiResponse.success(res, { member });
    } catch (error) {
      console.error('Update member role error:', error);
      if (error instanceof Error) {
        if (error.message.includes('permissions') || error.message.includes('owner')) {
          return ApiResponse.forbidden(res, error.message);
        }
        if (error.message === 'Member not found') {
          return ApiResponse.notFound(res, error.message);
        }
      }
      return ApiResponse.error(res, 'Failed to update member role', 500);
    }
  });

  /**
   * DELETE /api/companies/:id/members/:userId - Remove member
   */
  router.delete('/:id/members/:userId', authenticateJWT, async (req, res) => {
    try {
      await companiesService.removeMember(
        req.params.id,
        req.user!.userId,
        req.params.userId
      );

      return ApiResponse.success(res, { message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove member error:', error);
      if (error instanceof Error) {
        if (error.message.includes('permissions') || error.message.includes('owner')) {
          return ApiResponse.forbidden(res, error.message);
        }
        if (error.message === 'Member not found') {
          return ApiResponse.notFound(res, error.message);
        }
      }
      return ApiResponse.error(res, 'Failed to remove member', 500);
    }
  });

  return router;
}
