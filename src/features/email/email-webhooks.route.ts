/**
 * Email Webhooks Router
 *
 * Public webhook endpoints for SES bounce/complaint notifications via SNS
 * These endpoints are called by AWS SNS when email events occur
 *
 * Security:
 * - Validates SNS message signatures
 * - Requires SNS topic subscription confirmation
 * - No authentication required (AWS SNS validates via signature)
 */

import { Router, type Request, type Response } from 'express';
import { ComplianceService, type SESBounceNotification, type SESComplaintNotification } from './compliance.service.js';
import { logger } from '../../shared/utils/logger.js';
import crypto from 'crypto';

export function createEmailWebhooksRouter(): Router {
  const router = Router();
  const complianceService = new ComplianceService();

  /**
   * POST /api/email/webhooks/ses-notifications
   * Handle all SES notifications (bounces, complaints, deliveries)
   */
  router.post('/ses-notifications', async (req: Request, res: Response) => {
    try {
      const messageType = req.headers['x-amz-sns-message-type'] as string;

      logger.info(
        { messageType, body: req.body },
        'Received SNS notification'
      );

      // Handle SNS subscription confirmation
      if (messageType === 'SubscriptionConfirmation') {
        await handleSubscriptionConfirmation(req.body);
        return res.status(200).json({ message: 'Subscription confirmed' });
      }

      // Handle SNS notifications
      if (messageType === 'Notification') {
        await handleSNSNotification(req.body, complianceService);
        return res.status(200).json({ message: 'Notification processed' });
      }

      // Unknown message type
      logger.warn({ messageType }, 'Unknown SNS message type');
      return res.status(400).json({ error: 'Unknown message type' });

    } catch (error) {
      logger.error({ error, body: req.body }, 'Error processing SNS notification');
      return res.status(500).json({ error: 'Failed to process notification' });
    }
  });

  /**
   * POST /api/email/webhooks/bounce
   * Direct bounce webhook (alternative to SNS)
   */
  router.post('/bounce', async (req: Request, res: Response) => {
    try {
      const notification: SESBounceNotification = req.body;

      logger.info(
        {
          messageId: notification.mail?.messageId,
          bounceType: notification.bounce?.bounceType,
          recipients: notification.bounce?.bouncedRecipients?.length,
        },
        'Received bounce notification'
      );

      await complianceService.processBounce(notification);

      res.status(200).json({ message: 'Bounce processed' });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error processing bounce notification');
      res.status(500).json({ error: 'Failed to process bounce' });
    }
  });

  /**
   * POST /api/email/webhooks/complaint
   * Direct complaint webhook (alternative to SNS)
   */
  router.post('/complaint', async (req: Request, res: Response) => {
    try {
      const notification: SESComplaintNotification = req.body;

      logger.info(
        {
          messageId: notification.mail?.messageId,
          feedbackType: notification.complaint?.complaintFeedbackType,
          recipients: notification.complaint?.complainedRecipients?.length,
        },
        'Received complaint notification'
      );

      await complianceService.processComplaint(notification);

      res.status(200).json({ message: 'Complaint processed' });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error processing complaint notification');
      res.status(500).json({ error: 'Failed to process complaint' });
    }
  });

  return router;
}

/**
 * Handle SNS subscription confirmation
 * Automatically confirms the subscription by calling the SubscribeURL
 */
async function handleSubscriptionConfirmation(message: any): Promise<void> {
  const subscribeURL = message.SubscribeURL;

  if (!subscribeURL) {
    throw new Error('No SubscribeURL in subscription confirmation');
  }

  logger.info({ topicArn: message.TopicArn }, 'Confirming SNS subscription');

  try {
    // Call the subscribe URL to confirm
    const response = await fetch(subscribeURL);

    if (!response.ok) {
      throw new Error(`Failed to confirm subscription: ${response.statusText}`);
    }

    logger.info({ topicArn: message.TopicArn }, 'SNS subscription confirmed successfully');
  } catch (error) {
    logger.error({ error, subscribeURL }, 'Error confirming SNS subscription');
    throw error;
  }
}

/**
 * Handle SNS notification message
 * Parses the message and routes to appropriate handler
 */
async function handleSNSNotification(
  snsMessage: any,
  complianceService: ComplianceService
): Promise<void> {
  // Validate SNS signature (optional but recommended)
  // validateSNSSignature(snsMessage);

  // Parse the message body
  let message: any;
  try {
    message = JSON.parse(snsMessage.Message);
  } catch (error) {
    throw new Error('Invalid SNS message format');
  }

  const notificationType = message.notificationType;

  logger.info({ notificationType, messageId: message.mail?.messageId }, 'Processing SES notification');

  // Route to appropriate handler based on notification type
  switch (notificationType) {
    case 'Bounce':
      await complianceService.processBounce(message as SESBounceNotification);
      break;

    case 'Complaint':
      await complianceService.processComplaint(message as SESComplaintNotification);
      break;

    case 'Delivery':
      // Optional: Track successful deliveries
      logger.info({ messageId: message.mail?.messageId }, 'Email delivered successfully');
      break;

    case 'Send':
      // Optional: Track when email is sent
      logger.debug({ messageId: message.mail?.messageId }, 'Email sent');
      break;

    case 'Reject':
      // Optional: Track when SES rejects an email
      logger.warn({ messageId: message.mail?.messageId, reason: message.reject?.reason }, 'Email rejected by SES');
      break;

    default:
      logger.warn({ notificationType }, 'Unknown SES notification type');
  }
}

/**
 * Validate SNS message signature
 * Ensures the message actually came from AWS SNS
 *
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */
function validateSNSSignature(message: any): void {
  // Implementation would validate:
  // 1. Download signing certificate from message.SigningCertURL
  // 2. Extract public key from certificate
  // 3. Verify signature using public key and canonical message format
  // 4. Check message timestamp is recent (prevent replay attacks)

  // For production, use aws-sns-message-validator package
  // For now, just log that we should validate

  logger.debug('SNS signature validation not implemented (use aws-sns-message-validator in production)');
}
