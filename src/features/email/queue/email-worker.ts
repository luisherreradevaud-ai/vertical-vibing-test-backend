import type { Message } from '@aws-sdk/client-sqs';
import { logger } from '../../../shared/utils/logger.js';
import { EmailService } from '../email.service.js';
import { ConfigService } from '../config.service.js';
import { SQSQueueService } from './sqs-queue.service.js';

/**
 * Email Worker
 *
 * Base worker class that processes email queue messages.
 * Can be run in multiple deployment modes:
 * - Standalone process (worker.ts)
 * - Embedded in main app (embedded-worker.ts)
 * - AWS Lambda function (lambda-handler.ts)
 */
export class EmailWorker {
  private emailService: EmailService;
  private configService: ConfigService;
  private queueService: SQSQueueService;
  private isRunning: boolean = false;
  private processingCount: number = 0;
  private stats = {
    processed: 0,
    failed: 0,
    startedAt: new Date(),
  };

  constructor(
    emailService?: EmailService,
    configService?: ConfigService,
    queueService?: SQSQueueService,
  ) {
    this.emailService = emailService ?? new EmailService();
    this.configService = configService ?? new ConfigService();
    this.queueService = queueService ?? new SQSQueueService(this.configService);
  }

  /**
   * Start worker (continuous polling)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    this.stats.startedAt = new Date();

    logger.info('Email worker started');

    // Main worker loop
    while (this.isRunning) {
      try {
        await this.poll();
      } catch (error) {
        logger.error({ error }, 'Error in worker poll cycle');
      }

      // Wait before next poll
      const workerConfig = await this.configService.getWorkerConfig();
      await this.sleep(workerConfig.pollIntervalMs);
    }

    logger.info('Email worker stopped');
  }

  /**
   * Stop worker gracefully
   */
  async stop(): Promise<void> {
    logger.info('Stopping email worker...');
    this.isRunning = false;

    // Wait for in-flight messages to finish
    const maxWait = 30000; // 30 seconds
    const startWait = Date.now();

    while (this.processingCount > 0 && Date.now() - startWait < maxWait) {
      logger.info(
        { processingCount: this.processingCount },
        'Waiting for in-flight messages to finish...',
      );
      await this.sleep(1000);
    }

    if (this.processingCount > 0) {
      logger.warn(
        { processingCount: this.processingCount },
        'Worker stopped with messages still processing',
      );
    }

    await this.queueService.close();
    logger.info('Email worker stopped gracefully');
  }

  /**
   * Poll queue once and process messages
   */
  async poll(): Promise<void> {
    try {
      const emailConfig = await this.configService.getEmailConfig();
      const workerConfig = await this.configService.getWorkerConfig();

      // Poll messages from queue
      const messages = await this.queueService.pollMessages(emailConfig.queueName);

      if (messages.length === 0) {
        return;
      }

      logger.info({ messageCount: messages.length }, 'Processing messages from queue');

      // Process messages with concurrency limit
      const concurrency = workerConfig.concurrency;
      const chunks = this.chunkArray(messages, concurrency);

      for (const chunk of chunks) {
        await Promise.all(chunk.map((message) => this.processMessage(message, emailConfig.queueName)));
      }
    } catch (error) {
      logger.error({ error }, 'Error polling queue');
      throw error;
    }
  }

  /**
   * Process single message
   */
  private async processMessage(message: Message, queueName: string): Promise<void> {
    this.processingCount++;

    try {
      // Parse message
      const queueMessage = this.queueService.parseMessage(message);

      if (!queueMessage) {
        logger.error({ messageId: message.MessageId }, 'Failed to parse message, deleting');
        await this.queueService.deleteMessage(queueName, message.ReceiptHandle!);
        return;
      }

      logger.info(
        {
          messageId: message.MessageId,
          toAddress: queueMessage.toAddress,
          templateName: queueMessage.templateName,
        },
        'Processing email message',
      );

      // Process email
      await this.emailService.processQueuedEmail(queueMessage);

      // Delete message from queue (successful processing)
      await this.queueService.deleteMessage(queueName, message.ReceiptHandle!);

      this.stats.processed++;

      logger.info(
        {
          messageId: message.MessageId,
          toAddress: queueMessage.toAddress,
        },
        'Email message processed successfully',
      );
    } catch (error) {
      this.stats.failed++;

      logger.error(
        {
          error,
          messageId: message.MessageId,
        },
        'Error processing email message',
      );

      // Message will be retried automatically by SQS visibility timeout
      // or moved to DLQ after max retries
    } finally {
      this.processingCount--;
    }
  }

  /**
   * Get worker statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startedAt.getTime();

    return {
      ...this.stats,
      isRunning: this.isRunning,
      processingCount: this.processingCount,
      uptimeMs: uptime,
      uptimeSeconds: Math.floor(uptime / 1000),
      averageProcessingRate: this.stats.processed / (uptime / 1000 / 60), // per minute
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    queueAccessible: boolean;
    isRunning: boolean;
    stats: ReturnType<typeof this.getStats>;
  }> {
    const emailConfig = await this.configService.getEmailConfig();
    const queueAccessible = await this.queueService.healthCheck(emailConfig.queueName);

    return {
      healthy: this.isRunning && queueAccessible,
      queueAccessible,
      isRunning: this.isRunning,
      stats: this.getStats(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      processed: 0,
      failed: 0,
      startedAt: new Date(),
    };
  }

  /**
   * Helper: Sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
