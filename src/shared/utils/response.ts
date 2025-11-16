import type { Response } from 'express';

/**
 * API Response Helper
 *
 * Standardized response formats following API-CONTRACTS.md
 */
export class ApiResponse {
  /**
   * Success response (200)
   */
  static success<T>(res: Response, data: T, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      data,
    });
  }

  /**
   * Created response (201)
   */
  static created<T>(res: Response, data: T) {
    return res.status(201).json({
      status: 'success',
      data,
    });
  }

  /**
   * No content response (204)
   */
  static noContent(res: Response) {
    return res.status(204).send();
  }

  /**
   * Error response
   */
  static error(res: Response, message: string, statusCode = 400, code?: string) {
    return res.status(statusCode).json({
      status: 'error',
      code,
      message,
    });
  }

  /**
   * Validation error response
   */
  static validationError(res: Response, errors: Array<{ field: string; message: string; code?: string }>) {
    return res.status(400).json({
      status: 'error',
      code: 'ERR_VALIDATION_003',
      message: 'Validation failed',
      errors,
    });
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(res: Response, message = 'Unauthorized') {
    return res.status(401).json({
      status: 'error',
      code: 'ERR_AUTH_001',
      message,
    });
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(res: Response, message = 'Forbidden') {
    return res.status(403).json({
      status: 'error',
      code: 'ERR_AUTH_003',
      message,
    });
  }

  /**
   * Not found response (404)
   */
  static notFound(res: Response, message = 'Resource not found') {
    return res.status(404).json({
      status: 'error',
      code: 'ERR_RESOURCE_001',
      message,
    });
  }

  /**
   * Conflict response (409)
   */
  static conflict(res: Response, message: string) {
    return res.status(409).json({
      status: 'error',
      code: 'ERR_RESOURCE_002',
      message,
    });
  }
}
