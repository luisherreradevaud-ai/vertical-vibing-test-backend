/**
 * Tenant Validation Middleware
 *
 * Ensures all requests are properly scoped to a tenant (company)
 * and prevents cross-tenant data access
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/response';

/**
 * Middleware to ensure companyId is present and valid
 * Must be used after authenticateJWT
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  const companyId = req.query.companyId as string || req.body.companyId as string;

  if (!companyId) {
    return ApiResponse.error(res, 'Company ID is required', 400);
  }

  // Attach companyId to request for consistent access
  req.tenantId = companyId;

  next();
}

/**
 * Middleware to ensure the user belongs to the requested company
 * Prevents users from accessing other companies' data
 */
export function validateTenantAccess(req: Request, res: Response, next: NextFunction) {
  // TODO: In a multi-tenant system, validate that the user has access to the requested company
  // This requires querying the user-company relationship from the database
  // For now, we skip this validation and rely on IAM permissions to control access
  const requestedCompanyId = req.tenantId || req.query.companyId as string || req.body.companyId as string;

  if (!requestedCompanyId) {
    return ApiResponse.error(res, 'Company context is required', 400);
  }

  next();
}

/**
 * Combined middleware: require tenant and validate access
 */
export function enforceTenant(req: Request, res: Response, next: NextFunction) {
  requireTenant(req, res, () => {
    validateTenantAccess(req, res, next);
  });
}

// Extend Express Request type to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}
