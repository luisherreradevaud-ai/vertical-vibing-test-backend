import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiResponse } from '../../shared/utils/response';

/**
 * Validate Request Body
 *
 * Middleware factory that validates request body against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        // Format Zod errors
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'ERR_VALIDATION_003',
        }));

        ApiResponse.validationError(res, errors);
        return;
      }

      // Replace req.body with parsed and validated data
      req.body = result.data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      ApiResponse.error(res, 'Validation failed', 400, 'ERR_VALIDATION_003');
    }
  };
}
