import { Router, type Request, type Response } from 'express';
import { EmailService } from './email.service.js';
import {
  listEmailLogsQuerySchema,
  retryFailedEmailDTOSchema,
  emailStatisticsQuerySchema,
} from '@vertical-vibing/shared-types';
import { logger } from '../../shared/utils/logger.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { db } from '../../shared/db/index.js';
import { emailLogs } from '../../shared/db/schema/email.schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * Email Logs Router
 *
 * Admin API endpoints for viewing and managing email logs:
 * - List email logs with filtering
 * - Get log details by ID
 * - Retry failed emails
 * - Get email statistics
 *
 * All endpoints require authentication and IAM permissions
 */
export function createEmailLogsRouter(): Router {
  const router = Router();
  const emailService = new EmailService();

  // Apply authentication to all routes
  router.use(authenticate);

  /**
   * GET /api/email/logs
   * List all email logs with filtering and pagination
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      // TODO: Check IAM permission: 'email:logs:read'

      // Parse and validate query parameters
      const query = listEmailLogsQuerySchema.parse({
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        status: req.query.status,
        templateName: req.query.templateName,
        toAddress: req.query.toAddress,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
      });

      // Build query conditions
      const conditions = [];

      if (query.status) {
        conditions.push(eq(emailLogs.status, query.status));
      }

      if (query.templateName) {
        conditions.push(eq(emailLogs.templateName, query.templateName));
      }

      if (query.toAddress) {
        conditions.push(eq(emailLogs.toAddress, query.toAddress));
      }

      if (query.startDate) {
        conditions.push(gte(emailLogs.createdAt, query.startDate));
      }

      if (query.endDate) {
        conditions.push(lte(emailLogs.createdAt, query.endDate));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = Number(countResult[0]?.count ?? 0);

      // Get paginated logs
      const offset = (query.page - 1) * query.limit;
      const logs = await db.query.emailLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: query.limit,
        offset,
        orderBy: desc(emailLogs.createdAt),
      });

      // Get stats if requested
      let stats = undefined;
      if (conditions.length > 0) {
        const allLogs = await db.query.emailLogs.findMany({
          where: and(...conditions),
        });

        stats = {
          totalSent: allLogs.filter((l) => l.status === 'sent').length,
          totalFailed: allLogs.filter((l) => l.status === 'failed').length,
          totalQueued: allLogs.filter((l) => l.status === 'queued').length,
          totalBounced: allLogs.filter((l) => l.status === 'bounced').length,
        };
      }

      res.json({
        logs,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
        stats,
      });
    } catch (error) {
      logger.error({ error }, 'Error listing email logs');
      res.status(500).json({ error: 'Failed to list email logs' });
    }
  });

  /**
   * GET /api/email/logs/:id
   * Get email log by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      // TODO: Check IAM permission: 'email:logs:read'

      const log = await db.query.emailLogs.findFirst({
        where: eq(emailLogs.id, req.params.id),
      });

      if (!log) {
        return res.status(404).json({ error: 'Email log not found' });
      }

      res.json(log);
    } catch (error) {
      logger.error({ error, logId: req.params.id }, 'Error getting email log');
      res.status(500).json({ error: 'Failed to get email log' });
    }
  });

  /**
   * POST /api/email/logs/:id/retry
   * Retry failed email
   */
  router.post('/:id/retry', async (req: Request, res: Response) => {
    try {
      // TODO: Check IAM permission: 'email:logs:retry'

      const retryData = retryFailedEmailDTOSchema.parse({
        emailLogId: req.params.id,
        ...req.body,
      });

      await emailService.retryFailedEmail(retryData.emailLogId, retryData.force);

      logger.info({ emailLogId: retryData.emailLogId }, 'Retried failed email');

      res.json({ success: true, message: 'Email retry initiated' });
    } catch (error) {
      logger.error({ error, logId: req.params.id }, 'Error retrying email');

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: 'Email log not found' });
        }
        if (error.message.includes('not in failed state')) {
          return res.status(400).json({ error: 'Email is not in failed state' });
        }
        if (error.message.includes('max retries')) {
          return res.status(400).json({ error: 'Email has reached maximum retries' });
        }
      }

      res.status(500).json({ error: 'Failed to retry email' });
    }
  });

  /**
   * GET /api/email/stats
   * Get email statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      // TODO: Check IAM permission: 'email:logs:read'

      // Parse and validate query parameters
      const query = emailStatisticsQuerySchema.parse({
        startDate: new Date(req.query.startDate as string),
        endDate: new Date(req.query.endDate as string),
        groupBy: req.query.groupBy,
        templateName: req.query.templateName,
      });

      const stats = await emailService.getStatistics(query.startDate, query.endDate);

      // TODO: Implement groupBy and byTemplate stats
      res.json({
        period: {
          startDate: query.startDate,
          endDate: query.endDate,
        },
        totals: {
          sent: stats.sent,
          failed: stats.failed,
          bounced: stats.bounced,
          queued: stats.queued,
          successRate:
            stats.sent + stats.failed > 0
              ? (stats.sent / (stats.sent + stats.failed)) * 100
              : 0,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error getting email statistics');
      res.status(500).json({ error: 'Failed to get email statistics' });
    }
  });

  /**
   * DELETE /api/email/logs/:id
   * Delete email log (admin only)
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      // TODO: Check IAM permission: 'email:logs:delete'
      // TODO: Check if user is super admin

      await db.delete(emailLogs).where(eq(emailLogs.id, req.params.id));

      logger.info({ emailLogId: req.params.id }, 'Deleted email log');

      res.json({ success: true, message: 'Email log deleted' });
    } catch (error) {
      logger.error({ error, logId: req.params.id }, 'Error deleting email log');
      res.status(500).json({ error: 'Failed to delete email log' });
    }
  });

  return router;
}
