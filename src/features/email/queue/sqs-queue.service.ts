import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import type { EmailQueueMessage } from '@vertical-vibing/shared-types';
import { logger } from '../../../shared/utils/logger.js';
import { ConfigService } from '../config.service.js';

/**
 * SQS Queue Service
 *
 * Handles SQS queue operations:
 * - Polling messages from queue
 * - Deleting processed messages
 * - Managing queue URLs
 * - Connection management
 */
export class SQSQueueService {
  private sqsClient: SQSClient | null = null;
  private configService: ConfigService;
  private queueUrlCache: Map<string, string> = new Map();

  constructor(configService?: ConfigService) {
    this.configService = configService ?? new ConfigService();
  }

  /**
   * Initialize SQS client
   */
  async initialize(): Promise<void> {
    if (this.sqsClient) return;

    const awsConfig = await this.configService.getAWSConfig();

    this.sqsClient = new SQSClient({
      region: awsConfig.region,
      apiVersion: awsConfig.sqs.apiVersion,
    });

    logger.info({ region: awsConfig.region }, 'SQS client initialized');
  }

  /**
   * Poll messages from queue
   */
  async pollMessages(queueName: string): Promise<Message[]> {
    try {
      await this.initialize();

      const awsConfig = await this.configService.getAWSConfig();
      const queueUrl = await this.getQueueUrl(queueName);

      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: awsConfig.sqs.maxMessages,
        WaitTimeSeconds: awsConfig.sqs.waitTimeSeconds,
        VisibilityTimeout: awsConfig.sqs.visibilityTimeout,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient!.send(command);

      if (response.Messages && response.Messages.length > 0) {
        logger.debug(
          { queueName, messageCount: response.Messages.length },
          'Received messages from queue',
        );
      }

      return response.Messages ?? [];
    } catch (error) {
      logger.error({ error, queueName }, 'Error polling messages from queue');
      throw error;
    }
  }

  /**
   * Delete message from queue (after successful processing)
   */
  async deleteMessage(queueName: string, receiptHandle: string): Promise<void> {
    try {
      await this.initialize();

      const queueUrl = await this.getQueueUrl(queueName);

      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient!.send(command);

      logger.debug({ queueName }, 'Deleted message from queue');
    } catch (error) {
      logger.error({ error, queueName }, 'Error deleting message from queue');
      throw error;
    }
  }

  /**
   * Parse SQS message to EmailQueueMessage
   */
  parseMessage(message: Message): EmailQueueMessage | null {
    try {
      if (!message.Body) {
        logger.warn({ messageId: message.MessageId }, 'Message has no body');
        return null;
      }

      const parsed = JSON.parse(message.Body) as EmailQueueMessage;
      return parsed;
    } catch (error) {
      logger.error({ error, messageId: message.MessageId }, 'Error parsing message');
      return null;
    }
  }

  /**
   * Get queue URL (cached or fetched)
   */
  private async getQueueUrl(queueName: string): Promise<string> {
    // Check cache first
    if (this.queueUrlCache.has(queueName)) {
      return this.queueUrlCache.get(queueName)!;
    }

    // Check environment variable
    const envQueueUrl = process.env.EMAIL_QUEUE_URL;
    if (envQueueUrl) {
      this.queueUrlCache.set(queueName, envQueueUrl);
      return envQueueUrl;
    }

    // Fetch from AWS
    try {
      await this.initialize();

      const command = new GetQueueUrlCommand({
        QueueName: queueName,
      });

      const response = await this.sqsClient!.send(command);

      if (!response.QueueUrl) {
        throw new Error(`Queue URL not found for queue: ${queueName}`);
      }

      this.queueUrlCache.set(queueName, response.QueueUrl);
      logger.info({ queueName, queueUrl: response.QueueUrl }, 'Fetched queue URL from AWS');

      return response.QueueUrl;
    } catch (error) {
      logger.error({ error, queueName }, 'Error getting queue URL');
      throw error;
    }
  }

  /**
   * Health check - verify queue is accessible
   */
  async healthCheck(queueName: string): Promise<boolean> {
    try {
      await this.getQueueUrl(queueName);
      return true;
    } catch (error) {
      logger.error({ error, queueName }, 'Queue health check failed');
      return false;
    }
  }

  /**
   * Close SQS client connection
   */
  async close(): Promise<void> {
    if (this.sqsClient) {
      this.sqsClient.destroy();
      this.sqsClient = null;
      logger.info('SQS client closed');
    }
  }
}
