import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { SendEmailDTO, EmailQueueMessage } from '@vertical-vibing/shared-types';
import { eq, and, or, lt } from 'drizzle-orm';
import { db } from '../../shared/db/index.js';
import { emailLogs, emailBounces } from '../../shared/db/schema/email.schema.js';
import { logger } from '../../shared/utils/logger.js';
import { TemplateService } from './template.service.js';
import { ConfigService } from './config.service.js';
import { ComplianceService } from './compliance.service.js';
import { generateUnsubscribeToken } from './email-unsubscribe.route.js';

/**
 * Email Service
 *
 * Core email orchestration service that:
 * - Renders templates via TemplateService
 * - Sends emails via AWS SES
 * - Queues emails via AWS SQS (optional)
 * - Logs all operations
 * - Handles retries and failures
 * - Checks bounce list
 * - Rate limiting
 */
export class EmailService {
  private templateService: TemplateService;
  private configService: ConfigService;
  private complianceService: ComplianceService;
  private sesClient: SESClient | null = null;
  private sqsClient: SQSClient | null = null;

  constructor(
    templateService?: TemplateService,
    configService?: ConfigService,
    complianceService?: ComplianceService,
  ) {
    this.templateService = templateService ?? new TemplateService();
    this.configService = configService ?? new ConfigService();
    this.complianceService = complianceService ?? new ComplianceService();
  }

  /**
   * Initialize AWS clients
   */
  private async initializeAWSClients(): Promise<void> {
    if (this.sesClient && this.sqsClient) return;

    const awsConfig = await this.configService.getAWSConfig();

    this.sesClient = new SESClient({
      region: awsConfig.region,
      apiVersion: awsConfig.ses.apiVersion,
    });

    this.sqsClient = new SQSClient({
      region: awsConfig.region,
      apiVersion: awsConfig.sqs.apiVersion,
    });

    logger.info({ region: awsConfig.region }, 'AWS clients initialized');
  }

  /**
   * Send email (main entry point)
   */
  async sendEmail(emailData: SendEmailDTO): Promise<string> {
    try {
      const emailConfig = await this.configService.getEmailConfig();

      // Check if email system is enabled
      const systemEnabled = await this.configService.getBoolean('EMAIL_SYSTEM_ENABLED');
      if (!systemEnabled) {
        throw new Error('Email system is disabled');
      }

      // Check compliance (suppressions and unsubscribes)
      const canSend = await this.complianceService.canSendEmail(
        emailData.toAddress,
        emailData.templateData?.category as string | undefined
      );

      if (!canSend.canSend) {
        logger.warn(
          { email: emailData.toAddress, reason: canSend.reason },
          'Email blocked by compliance check'
        );
        throw new Error(`Cannot send email: ${canSend.reason}`);
      }

      // Check rate limits
      await this.checkRateLimit();

      // Queue or send directly based on configuration
      if (emailConfig.queueEnabled) {
        return await this.queueEmail(emailData);
      } else {
        return await this.sendEmailDirect(emailData);
      }
    } catch (error) {
      logger.error({ error, emailData }, 'Error sending email');
      throw error;
    }
  }

  /**
   * Send email directly (bypass queue)
   */
  async sendEmailDirect(emailData: SendEmailDTO): Promise<string> {
    try {
      await this.initializeAWSClients();
      const emailConfig = await this.configService.getEmailConfig();

      // Render template
      const { html, subject, text } = await this.templateService.renderTemplate(
        emailData.templateName,
        emailData.templateData,
      );

      // Create email log entry
      const [emailLog] = await db
        .insert(emailLogs)
        .values({
          templateName: emailData.templateName,
          toAddress: emailData.toAddress,
          ccAddresses: emailData.ccAddresses ?? null,
          bccAddresses: emailData.bccAddresses ?? null,
          subject,
          htmlContent: html,
          status: 'sending',
          templateData: emailData.templateData,
          metadata: emailData.metadata ?? null,
          queuedAt: new Date(),
          maxRetries: emailConfig.maxRetries,
        })
        .returning();

      try {
        // Generate unsubscribe token and URLs
        const unsubscribeToken = generateUnsubscribeToken(
          emailData.toAddress,
          emailData.templateData?.category as string | undefined
        );
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe/${unsubscribeToken}`;
        const listUnsubscribeUrl = `${baseUrl}/api/email/unsubscribe/list-unsubscribe/${unsubscribeToken}`;

        // Send via SES
        const command = new SendEmailCommand({
          Source: `${emailConfig.fromName} <${emailConfig.fromAddress}>`,
          Destination: {
            ToAddresses: [emailData.toAddress],
            CcAddresses: emailData.ccAddresses,
            BccAddresses: emailData.bccAddresses,
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: html,
                Charset: 'UTF-8',
              },
              Text: text
                ? {
                    Data: text,
                    Charset: 'UTF-8',
                  }
                : undefined,
            },
          },
          ReplyToAddresses: emailConfig.replyTo ? [emailConfig.replyTo] : undefined,
          // Compliance headers (RFC 8058)
          Tags: [
            {
              Name: 'List-Unsubscribe',
              Value: `<${unsubscribeUrl}>`,
            },
            {
              Name: 'List-Unsubscribe-Post',
              Value: 'List-Unsubscribe=One-Click',
            },
          ],
        });

        const response = await this.sesClient!.send(command);

        // Update log as sent
        await db
          .update(emailLogs)
          .set({
            status: 'sent',
            messageId: response.MessageId,
            sesResponse: response as any,
            sentAt: new Date(),
          })
          .where(eq(emailLogs.id, emailLog.id));

        logger.info(
          {
            emailLogId: emailLog.id,
            messageId: response.MessageId,
            toAddress: emailData.toAddress,
          },
          'Email sent successfully',
        );

        return emailLog.id;
      } catch (error) {
        // Update log as failed
        await db
          .update(emailLogs)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            failedAt: new Date(),
            nextRetryAt: this.calculateNextRetry(0, emailConfig.retryDelayMs),
          })
          .where(eq(emailLogs.id, emailLog.id));

        throw error;
      }
    } catch (error) {
      logger.error({ error, emailData }, 'Error sending email directly');
      throw error;
    }
  }

  /**
   * Queue email for async processing
   */
  async queueEmail(emailData: SendEmailDTO): Promise<string> {
    try {
      await this.initializeAWSClients();
      const emailConfig = await this.configService.getEmailConfig();

      // Render template to validate
      const { subject } = await this.templateService.renderTemplate(
        emailData.templateName,
        emailData.templateData,
      );

      // Create email log entry in queued state
      const [emailLog] = await db
        .insert(emailLogs)
        .values({
          templateName: emailData.templateName,
          toAddress: emailData.toAddress,
          ccAddresses: emailData.ccAddresses ?? null,
          bccAddresses: emailData.bccAddresses ?? null,
          subject,
          status: 'queued',
          templateData: emailData.templateData,
          metadata: emailData.metadata ?? null,
          queuedAt: new Date(),
          maxRetries: emailConfig.maxRetries,
        })
        .returning();

      // Send to SQS queue
      const queueMessage: EmailQueueMessage = {
        templateName: emailData.templateName,
        toAddress: emailData.toAddress,
        ccAddresses: emailData.ccAddresses,
        bccAddresses: emailData.bccAddresses,
        templateData: emailData.templateData,
        metadata: {
          ...emailData.metadata,
          emailLogId: emailLog.id,
        },
        priority: emailData.priority ?? 'normal',
        scheduledFor: emailData.scheduledFor,
      };

      const command = new SendMessageCommand({
        QueueUrl: await this.getQueueUrl(emailConfig.queueName),
        MessageBody: JSON.stringify(queueMessage),
        DelaySeconds: emailData.scheduledFor
          ? Math.max(0, Math.floor((emailData.scheduledFor.getTime() - Date.now()) / 1000))
          : 0,
      });

      await this.sqsClient!.send(command);

      logger.info(
        {
          emailLogId: emailLog.id,
          toAddress: emailData.toAddress,
          queueName: emailConfig.queueName,
        },
        'Email queued successfully',
      );

      return emailLog.id;
    } catch (error) {
      logger.error({ error, emailData }, 'Error queuing email');
      throw error;
    }
  }

  /**
   * Process queued email (called by worker)
   */
  async processQueuedEmail(queueMessage: EmailQueueMessage): Promise<void> {
    try {
      await this.initializeAWSClients();
      const emailConfig = await this.configService.getEmailConfig();

      const emailLogId = queueMessage.metadata?.emailLogId;
      if (!emailLogId) {
        throw new Error('Email log ID not found in queue message');
      }

      // Get email log
      const emailLog = await db.query.emailLogs.findFirst({
        where: eq(emailLogs.id, emailLogId),
      });

      if (!emailLog) {
        throw new Error(`Email log ${emailLogId} not found`);
      }

      // Check if already sent or being processed
      if (emailLog.status === 'sent') {
        logger.info({ emailLogId }, 'Email already sent, skipping');
        return;
      }

      // Update status to sending
      await db
        .update(emailLogs)
        .set({ status: 'sending' })
        .where(eq(emailLogs.id, emailLogId));

      try {
        // Render template
        const { html, subject, text } = await this.templateService.renderTemplate(
          queueMessage.templateName,
          queueMessage.templateData,
        );

        // Send via SES
        const command = new SendEmailCommand({
          Source: `${emailConfig.fromName} <${emailConfig.fromAddress}>`,
          Destination: {
            ToAddresses: [queueMessage.toAddress],
            CcAddresses: queueMessage.ccAddresses,
            BccAddresses: queueMessage.bccAddresses,
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: html,
                Charset: 'UTF-8',
              },
              Text: text
                ? {
                    Data: text,
                    Charset: 'UTF-8',
                  }
                : undefined,
            },
          },
          ReplyToAddresses: emailConfig.replyTo ? [emailConfig.replyTo] : undefined,
        });

        const response = await this.sesClient!.send(command);

        // Update log as sent
        await db
          .update(emailLogs)
          .set({
            status: 'sent',
            messageId: response.MessageId,
            sesResponse: response as any,
            htmlContent: html,
            subject,
            sentAt: new Date(),
          })
          .where(eq(emailLogs.id, emailLogId));

        logger.info(
          {
            emailLogId,
            messageId: response.MessageId,
            toAddress: queueMessage.toAddress,
          },
          'Queued email sent successfully',
        );
      } catch (error) {
        // Check if we should retry
        const shouldRetry = emailLog.retryCount < emailLog.maxRetries;

        if (shouldRetry) {
          // Update for retry
          await db
            .update(emailLogs)
            .set({
              status: 'queued',
              errorMessage: error instanceof Error ? error.message : String(error),
              retryCount: emailLog.retryCount + 1,
              nextRetryAt: this.calculateNextRetry(emailLog.retryCount + 1, emailConfig.retryDelayMs),
            })
            .where(eq(emailLogs.id, emailLogId));

          logger.warn(
            {
              emailLogId,
              retryCount: emailLog.retryCount + 1,
              maxRetries: emailLog.maxRetries,
              error,
            },
            'Email send failed, will retry',
          );

          // Re-queue the email
          await this.requeueEmail(queueMessage, emailConfig.retryDelayMs);
        } else {
          // Max retries reached, mark as failed
          await db
            .update(emailLogs)
            .set({
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : String(error),
              failedAt: new Date(),
            })
            .where(eq(emailLogs.id, emailLogId));

          logger.error(
            {
              emailLogId,
              retryCount: emailLog.retryCount,
              maxRetries: emailLog.maxRetries,
              error,
            },
            'Email send failed, max retries reached',
          );
        }

        throw error;
      }
    } catch (error) {
      logger.error({ error, queueMessage }, 'Error processing queued email');
      throw error;
    }
  }

  /**
   * Retry failed email
   */
  async retryFailedEmail(emailLogId: string, force: boolean = false): Promise<void> {
    try {
      const emailLog = await db.query.emailLogs.findFirst({
        where: eq(emailLogs.id, emailLogId),
      });

      if (!emailLog) {
        throw new Error(`Email log ${emailLogId} not found`);
      }

      if (emailLog.status !== 'failed' && !force) {
        throw new Error(`Email ${emailLogId} is not in failed state`);
      }

      if (emailLog.retryCount >= emailLog.maxRetries && !force) {
        throw new Error(`Email ${emailLogId} has reached max retries`);
      }

      // Re-send the email
      await this.sendEmailDirect({
        templateName: emailLog.templateName!,
        toAddress: emailLog.toAddress,
        ccAddresses: emailLog.ccAddresses ?? undefined,
        bccAddresses: emailLog.bccAddresses ?? undefined,
        templateData: emailLog.templateData as Record<string, any>,
        metadata: emailLog.metadata as Record<string, any> | undefined,
      });

      logger.info({ emailLogId }, 'Failed email retried successfully');
    } catch (error) {
      logger.error({ error, emailLogId }, 'Error retrying failed email');
      throw error;
    }
  }

  /**
   * Check if email is on bounce list
   */
  private async isEmailBounced(email: string): Promise<boolean> {
    const bounce = await db.query.emailBounces.findFirst({
      where: eq(emailBounces.emailAddress, email),
    });
    return bounce !== undefined;
  }

  /**
   * Add email to bounce list
   */
  async addEmailBounce(
    email: string,
    bounceType: 'hard' | 'soft' | 'complaint',
    reason?: string,
    sesNotification?: any,
  ): Promise<void> {
    try {
      await db.insert(emailBounces).values({
        emailAddress: email,
        bounceType,
        bounceReason: reason ?? null,
        sesNotification: sesNotification ?? null,
      });

      logger.info({ email, bounceType }, 'Email added to bounce list');
    } catch (error) {
      logger.error({ error, email }, 'Error adding email to bounce list');
      throw error;
    }
  }

  /**
   * Remove email from bounce list
   */
  async removeEmailBounce(email: string): Promise<void> {
    try {
      await db.delete(emailBounces).where(eq(emailBounces.emailAddress, email));
      logger.info({ email }, 'Email removed from bounce list');
    } catch (error) {
      logger.error({ error, email }, 'Error removing email from bounce list');
      throw error;
    }
  }

  /**
   * Check rate limits (simple in-memory implementation)
   */
  private rateLimitCounts = {
    second: { count: 0, resetAt: Date.now() + 1000 },
    day: { count: 0, resetAt: Date.now() + 86400000 },
  };

  private async checkRateLimit(): Promise<void> {
    const emailConfig = await this.configService.getEmailConfig();
    const now = Date.now();

    // Reset counters if time windows expired
    if (now >= this.rateLimitCounts.second.resetAt) {
      this.rateLimitCounts.second = { count: 0, resetAt: now + 1000 };
    }
    if (now >= this.rateLimitCounts.day.resetAt) {
      this.rateLimitCounts.day = { count: 0, resetAt: now + 86400000 };
    }

    // Check limits
    if (this.rateLimitCounts.second.count >= emailConfig.rateLimitPerSecond) {
      throw new Error('Rate limit exceeded: per second limit reached');
    }
    if (this.rateLimitCounts.day.count >= emailConfig.rateLimitPerDay) {
      throw new Error('Rate limit exceeded: daily limit reached');
    }

    // Increment counters
    this.rateLimitCounts.second.count++;
    this.rateLimitCounts.day.count++;
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  private calculateNextRetry(retryCount: number, baseDelayMs: number): Date {
    const delayMs = baseDelayMs * Math.pow(2, retryCount);
    return new Date(Date.now() + delayMs);
  }

  /**
   * Re-queue email with delay
   */
  private async requeueEmail(queueMessage: EmailQueueMessage, delayMs: number): Promise<void> {
    const emailConfig = await this.configService.getEmailConfig();

    const command = new SendMessageCommand({
      QueueUrl: await this.getQueueUrl(emailConfig.queueName),
      MessageBody: JSON.stringify(queueMessage),
      DelaySeconds: Math.floor(delayMs / 1000),
    });

    await this.sqsClient!.send(command);
  }

  /**
   * Get SQS queue URL (cached or fetched)
   */
  private queueUrlCache: Map<string, string> = new Map();

  private async getQueueUrl(queueName: string): Promise<string> {
    if (this.queueUrlCache.has(queueName)) {
      return this.queueUrlCache.get(queueName)!;
    }

    // In production, use AWS SDK to get queue URL
    // For now, assume it's in env vars or config
    const queueUrl = process.env.EMAIL_QUEUE_URL ?? `https://sqs.us-east-1.amazonaws.com/123456789/${queueName}`;
    this.queueUrlCache.set(queueName, queueUrl);
    return queueUrl;
  }

  /**
   * Get email statistics
   */
  async getStatistics(startDate: Date, endDate: Date) {
    try {
      const logs = await db.query.emailLogs.findMany({
        where: and(
          eq(emailLogs.createdAt, startDate), // Note: This should use gte/lte operators
          eq(emailLogs.createdAt, endDate),
        ),
      });

      const stats = {
        total: logs.length,
        sent: logs.filter((l) => l.status === 'sent').length,
        failed: logs.filter((l) => l.status === 'failed').length,
        queued: logs.filter((l) => l.status === 'queued').length,
        bounced: logs.filter((l) => l.status === 'bounced').length,
      };

      return stats;
    } catch (error) {
      logger.error({ error, startDate, endDate }, 'Error getting email statistics');
      throw error;
    }
  }
}
