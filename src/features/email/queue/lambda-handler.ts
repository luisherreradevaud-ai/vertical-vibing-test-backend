/**
 * AWS Lambda Email Worker Handler
 *
 * Processes SQS email queue messages in AWS Lambda.
 *
 * Benefits:
 * - ✅ Serverless - no infrastructure management
 * - ✅ Auto-scaling based on queue depth
 * - ✅ Pay only for execution time
 * - ✅ Built-in retry and DLQ support
 * - ✅ Perfect for variable workloads
 *
 * Setup:
 * 1. Deploy this function to AWS Lambda
 * 2. Configure SQS trigger for email queue
 * 3. Set environment variables:
 *    - DATABASE_URL
 *    - AWS_REGION (auto-provided by Lambda)
 *    - EMAIL_FROM_ADDRESS
 *    - etc.
 *
 * Lambda Configuration:
 * - Runtime: Node.js 20.x
 * - Memory: 512 MB - 1024 MB
 * - Timeout: 30 seconds
 * - Concurrency: 10-100 (based on volume)
 * - Batch size: 10 messages
 * - Batch window: 5 seconds
 * - Max concurrency: 10
 *
 * IAM Permissions needed:
 * - SQS: ReceiveMessage, DeleteMessage, GetQueueAttributes
 * - SES: SendEmail
 * - CloudWatch: CreateLogGroup, CreateLogStream, PutLogEvents
 */

import type { SQSEvent, SQSRecord, SQSHandler, Context } from 'aws-lambda';
import { logger } from '../../../shared/utils/logger.js';
import { EmailService } from '../email.service.js';
import type { EmailQueueMessage } from '@vertical-vibing/shared-types';

// Singleton instances for Lambda container reuse
let emailService: EmailService | null = null;

/**
 * Lambda handler function
 */
export const handler: SQSHandler = async (event: SQSEvent, context: Context) => {
  try {
    logger.info(
      {
        messageCount: event.Records.length,
        functionName: context.functionName,
        requestId: context.requestId,
      },
      'Processing SQS batch in Lambda',
    );

    // Initialize email service (reused across invocations in same container)
    if (!emailService) {
      emailService = new EmailService();
      logger.info('Initialized email service in Lambda container');
    }

    // Process all messages in parallel
    const results = await Promise.allSettled(
      event.Records.map((record) => processRecord(record)),
    );

    // Count successes and failures
    const successes = results.filter((r) => r.status === 'fulfilled').length;
    const failures = results.filter((r) => r.status === 'rejected').length;

    logger.info(
      {
        total: event.Records.length,
        successes,
        failures,
      },
      'Completed SQS batch processing in Lambda',
    );

    // If any failures, report them (Lambda will handle retries)
    if (failures > 0) {
      const failedRecords = results
        .map((result, index) => {
          if (result.status === 'rejected') {
            return {
              messageId: event.Records[index].messageId,
              error: result.reason,
            };
          }
          return null;
        })
        .filter((r) => r !== null);

      logger.error(
        { failedRecords },
        'Some messages failed to process',
      );

      // Throw error to trigger Lambda retry for failed messages
      // Note: With proper SQS configuration, only failed messages will be retried
      throw new Error(`${failures} message(s) failed to process`);
    }
  } catch (error) {
    logger.error({ error, event }, 'Error in Lambda handler');
    throw error;
  }
};

/**
 * Process single SQS record
 */
async function processRecord(record: SQSRecord): Promise<void> {
  try {
    logger.info(
      {
        messageId: record.messageId,
        receiptHandle: record.receiptHandle,
      },
      'Processing SQS record',
    );

    // Parse message
    const queueMessage: EmailQueueMessage = JSON.parse(record.body);

    logger.info(
      {
        messageId: record.messageId,
        toAddress: queueMessage.toAddress,
        templateName: queueMessage.templateName,
      },
      'Parsed email queue message',
    );

    // Process email
    await emailService!.processQueuedEmail(queueMessage);

    logger.info(
      {
        messageId: record.messageId,
        toAddress: queueMessage.toAddress,
      },
      'Successfully processed email',
    );
  } catch (error) {
    logger.error(
      {
        error,
        messageId: record.messageId,
      },
      'Error processing SQS record',
    );
    throw error;
  }
}

/**
 * Health check function (separate Lambda or ALB target)
 */
export const healthCheck = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'healthy',
      service: 'email-lambda-worker',
      timestamp: new Date().toISOString(),
    }),
  };
};

/**
 * Warm-up function to keep Lambda container warm
 * Can be triggered by CloudWatch Events every 5 minutes
 */
export const warmUp = async () => {
  logger.info('Lambda warm-up invocation');

  // Initialize service to keep container warm
  if (!emailService) {
    emailService = new EmailService();
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'warm',
      timestamp: new Date().toISOString(),
    }),
  };
};

// Export for local testing
export { emailService };
