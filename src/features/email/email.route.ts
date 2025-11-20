import { Router, type Request, type Response } from 'express';
import { EmailService } from './email.service.js';
import { sendEmailDTOSchema, bulkSendEmailDTOSchema } from '@vertical-vibing/shared-types';
import { logger } from '../../shared/utils/logger.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { createEmailTemplatesRouter } from './email-templates.route.js';
import { createEmailLogsRouter } from './email-logs.route.js';
import { createEmailConfigRouter } from './email-config.route.js';

/**
 * Main Email Router
 *
 * Combines all email-related routers:
 * - /api/email/send - Send emails
 * - /api/email/templates - Template management
 * - /api/email/logs - Email log management
 * - /api/email/config - Configuration management
 */
export function createEmailRouter(): Router {
  const router = Router();
  const emailService = new EmailService();

  /**
   * POST /api/email/send
   * Send a single email
   */
  router.post('/send', authenticate, async (req: Request, res: Response) => {
    try {
      // TODO: Check IAM permission: 'email:send'

      const emailData = sendEmailDTOSchema.parse(req.body);

      const emailLogId = await emailService.sendEmail(emailData);

      logger.info(
        {
          emailLogId,
          toAddress: emailData.toAddress,
          templateName: emailData.templateName,
        },
        'Email sent/queued successfully',
      );

      res.status(202).json({
        success: true,
        emailLogId,
        message: 'Email queued for delivery',
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error sending email');

      if (error instanceof Error) {
        if (error.message.includes('disabled')) {
          return res.status(503).json({ error: 'Email system is currently disabled' });
        }
        if (error.message.includes('bounce list')) {
          return res.status(400).json({ error: 'Recipient is on the bounce list' });
        }
        if (error.message.includes('rate limit')) {
          return res.status(429).json({ error: 'Rate limit exceeded' });
        }
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: 'Email template not found' });
        }
        if (error.message.includes('Missing required')) {
          return res.status(400).json({ error: error.message });
        }
      }

      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  /**
   * POST /api/email/send/bulk
   * Send multiple emails in bulk
   */
  router.post('/send/bulk', authenticate, async (req: Request, res: Response) => {
    try {
      // TODO: Check IAM permission: 'email:send:bulk'

      const bulkData = bulkSendEmailDTOSchema.parse(req.body);

      const results = await Promise.allSettled(
        bulkData.recipients.map((recipient) =>
          emailService.sendEmail({
            templateName: bulkData.templateName,
            toAddress: recipient.toAddress,
            templateData: recipient.templateData,
            metadata: bulkData.metadata,
            priority: bulkData.priority,
          }),
        ),
      );

      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      logger.info(
        {
          templateName: bulkData.templateName,
          total: bulkData.recipients.length,
          successful: successful.length,
          failed: failed.length,
        },
        'Bulk email send completed',
      );

      res.status(202).json({
        success: failed.length === 0,
        totalQueued: successful.length,
        totalFailed: failed.length,
        emailLogIds: successful.map((r) => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean),
        errors: failed.map((r) => (r.status === 'rejected' ? String(r.reason) : null)).filter(Boolean),
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error sending bulk emails');
      res.status(500).json({ error: 'Failed to send bulk emails' });
    }
  });

  /**
   * GET /api/email/health
   * Health check for email system
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      // Check if email system is enabled
      const systemEnabled = await emailService['configService'].getBoolean('EMAIL_SYSTEM_ENABLED');

      res.json({
        status: systemEnabled ? 'healthy' : 'disabled',
        systemEnabled,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ error }, 'Error checking email system health');
      res.status(503).json({
        status: 'unhealthy',
        error: 'Failed to check email system health',
      });
    }
  });

  // Mount sub-routers
  router.use('/templates', createEmailTemplatesRouter());
  router.use('/logs', createEmailLogsRouter());
  router.use('/config', createEmailConfigRouter());

  return router;
}
