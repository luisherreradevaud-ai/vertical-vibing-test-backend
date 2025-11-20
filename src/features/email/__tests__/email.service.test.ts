/**
 * Email Service Unit Tests
 *
 * Tests the EmailService sending logic, queue integration, and retry mechanisms.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailService } from '../email.service';
import { TemplateService } from '../template.service';
import { ConfigService } from '../config.service';
import { ComplianceService } from '../compliance.service';
import { testEmails, mockSESResponse, mockSQSResponse } from './helpers/test-fixtures';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { SendMessageCommand } from '@aws-sdk/client-sqs';

// Mock dependencies
vi.mock('@aws-sdk/client-ses');
vi.mock('@aws-sdk/client-sqs');
vi.mock('../../../shared/db/index', () => ({
  db: {
    query: {
      emailLogs: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));
vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { db } from '../../../shared/db/index';

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTemplateService: TemplateService;
  let mockConfigService: ConfigService;
  let mockComplianceService: ComplianceService;
  let mockSESClient: any;
  let mockSQSClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock template service
    mockTemplateService = {
      renderTemplate: vi.fn().mockResolvedValue({
        html: '<html>Test Email</html>',
        subject: 'Test Subject',
        text: 'Test Email',
      }),
    } as any;

    // Mock config service
    mockConfigService = {
      getBoolean: vi.fn().mockResolvedValue(true),
      getEmailConfig: vi.fn().mockResolvedValue({
        fromAddress: 'from@example.com',
        fromName: 'Test Sender',
        replyTo: 'reply@example.com',
        queueEnabled: false,
        maxRetries: 3,
        retryDelayMs: 60000,
        rateLimitPerSecond: 14,
        rateLimitPerDay: 200,
      }),
      getAWSConfig: vi.fn().mockResolvedValue({
        region: 'us-east-1',
        ses: { apiVersion: 'latest', configurationSet: '' },
        sqs: { apiVersion: 'latest', waitTimeSeconds: 20, visibilityTimeout: 300, maxMessages: 10 },
      }),
    } as any;

    // Mock compliance service
    mockComplianceService = {
      canSendEmail: vi.fn().mockResolvedValue({ canSend: true }),
    } as any;

    // Mock AWS clients
    mockSESClient = {
      send: vi.fn().mockResolvedValue(mockSESResponse),
    };

    mockSQSClient = {
      send: vi.fn().mockResolvedValue(mockSQSResponse),
    };

    emailService = new EmailService(mockTemplateService, mockConfigService, mockComplianceService);
    emailService['sesClient'] = mockSESClient;
    emailService['sqsClient'] = mockSQSClient;

    // Mock email log creation
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 'email-log-123',
          templateName: 'welcome',
          toAddress: 'test@example.com',
          status: 'queued',
          maxRetries: 3,
          retryCount: 0,
        }]),
      }),
    } as any);
  });

  describe('sendEmail()', () => {
    it('should send email directly when queue disabled', async () => {
      // Arrange
      const emailData = testEmails.basic;

      // Act
      const result = await emailService.sendEmail(emailData);

      // Assert
      expect(result).toBe('email-log-123');
      expect(mockTemplateService.renderTemplate).toHaveBeenCalledWith(
        emailData.templateName,
        emailData.templateData
      );
      expect(mockSESClient.send).toHaveBeenCalled();
    });

    it('should queue email when queue enabled', async () => {
      // Arrange
      mockConfigService.getEmailConfig = vi.fn().mockResolvedValue({
        fromAddress: 'from@example.com',
        fromName: 'Test',
        queueEnabled: true,
        queueName: 'email-queue',
        maxRetries: 3,
      });
      const emailData = testEmails.basic;

      // Act
      const result = await emailService.sendEmail(emailData);

      // Assert
      expect(result).toBe('email-log-123');
      expect(mockSQSClient.send).toHaveBeenCalled();
    });

    it('should reject email if system disabled', async () => {
      // Arrange
      mockConfigService.getBoolean = vi.fn().mockResolvedValue(false);

      // Act & Assert
      await expect(emailService.sendEmail(testEmails.basic)).rejects.toThrow('Email system is disabled');
    });

    it('should reject suppressed emails', async () => {
      // Arrange
      mockComplianceService.canSendEmail = vi.fn().mockResolvedValue({
        canSend: false,
        reason: 'Email address is suppressed',
      });

      // Act & Assert
      await expect(emailService.sendEmail(testEmails.basic)).rejects.toThrow('Cannot send email');
    });

    it('should enforce rate limits', async () => {
      // Arrange
      mockConfigService.getEmailConfig = vi.fn().mockResolvedValue({
        fromAddress: 'from@example.com',
        queueEnabled: false,
        maxRetries: 3,
        rateLimitPerSecond: 1,
        rateLimitPerDay: 200,
      });

      // Act - Send multiple emails rapidly
      await emailService.sendEmail(testEmails.basic);

      // Assert - Second email should fail
      await expect(emailService.sendEmail(testEmails.basic)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('sendEmailDirect()', () => {
    it('should send email via SES', async () => {
      // Arrange
      const emailData = testEmails.basic;

      // Act
      const result = await emailService.sendEmailDirect(emailData);

      // Assert
      expect(result).toBe('email-log-123');
      expect(mockSESClient.send).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled(); // Status update
    });

    it('should include CC and BCC addresses', async () => {
      // Arrange
      const emailData = testEmails.withCCBCC;

      // Act
      await emailService.sendEmailDirect(emailData);

      // Assert
      const sendCall = mockSESClient.send.mock.calls[0][0];
      expect(sendCall.input.Destination.CcAddresses).toEqual(emailData.ccAddresses);
      expect(sendCall.input.Destination.BccAddresses).toEqual(emailData.bccAddresses);
    });

    it('should include unsubscribe headers', async () => {
      // Arrange
      const emailData = testEmails.basic;

      // Act
      await emailService.sendEmailDirect(emailData);

      // Assert
      const sendCall = mockSESClient.send.mock.calls[0][0];
      expect(sendCall.input.Tags).toBeDefined();
      expect(sendCall.input.Tags.some((t: any) => t.Name === 'List-Unsubscribe')).toBe(true);
    });

    it('should update log on failure', async () => {
      // Arrange
      mockSESClient.send = vi.fn().mockRejectedValue(new Error('SES Error'));
      const emailData = testEmails.basic;

      // Act & Assert
      await expect(emailService.sendEmailDirect(emailData)).rejects.toThrow('SES Error');
      expect(db.update).toHaveBeenCalled(); // Failed status update
    });
  });

  describe('queueEmail()', () => {
    beforeEach(() => {
      mockConfigService.getEmailConfig = vi.fn().mockResolvedValue({
        fromAddress: 'from@example.com',
        queueName: 'email-queue',
        maxRetries: 3,
      });
    });

    it('should queue email to SQS', async () => {
      // Arrange
      const emailData = testEmails.basic;

      // Act
      const result = await emailService.queueEmail(emailData);

      // Assert
      expect(result).toBe('email-log-123');
      expect(mockSQSClient.send).toHaveBeenCalled();
    });

    it('should schedule email with delay', async () => {
      // Arrange
      const emailData = testEmails.scheduled;

      // Act
      await emailService.queueEmail(emailData);

      // Assert
      const sendCall = mockSQSClient.send.mock.calls[0][0];
      expect(sendCall.input.DelaySeconds).toBeGreaterThan(0);
    });

    it('should validate template before queuing', async () => {
      // Arrange
      mockTemplateService.renderTemplate = vi.fn().mockRejectedValue(new Error('Template not found'));

      // Act & Assert
      await expect(emailService.queueEmail(testEmails.basic)).rejects.toThrow('Template not found');
    });
  });

  describe('processQueuedEmail()', () => {
    beforeEach(() => {
      vi.mocked(db.query.emailLogs.findFirst).mockResolvedValue({
        id: 'email-log-123',
        status: 'queued',
        retryCount: 0,
        maxRetries: 3,
      });
    });

    it('should process queued email successfully', async () => {
      // Arrange
      const queueMessage = {
        templateName: 'welcome',
        toAddress: 'test@example.com',
        templateData: { userName: 'John' },
        metadata: { emailLogId: 'email-log-123' },
        priority: 'normal' as const,
      };

      // Act
      await emailService.processQueuedEmail(queueMessage);

      // Assert
      expect(mockSESClient.send).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled(); // Status to sent
    });

    it('should skip already sent emails', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findFirst).mockResolvedValue({
        id: 'email-log-123',
        status: 'sent',
        retryCount: 0,
        maxRetries: 3,
      });
      const queueMessage = {
        templateName: 'welcome',
        toAddress: 'test@example.com',
        templateData: {},
        metadata: { emailLogId: 'email-log-123' },
        priority: 'normal' as const,
      };

      // Act
      await emailService.processQueuedEmail(queueMessage);

      // Assert
      expect(mockSESClient.send).not.toHaveBeenCalled();
    });

    it('should retry on failure with backoff', async () => {
      // Arrange
      mockSESClient.send = vi.fn().mockRejectedValue(new Error('SES Error'));
      const queueMessage = {
        templateName: 'welcome',
        toAddress: 'test@example.com',
        templateData: {},
        metadata: { emailLogId: 'email-log-123' },
        priority: 'normal' as const,
      };

      // Act & Assert
      await expect(emailService.processQueuedEmail(queueMessage)).rejects.toThrow('SES Error');
      expect(db.update).toHaveBeenCalled(); // Retry count incremented
      expect(mockSQSClient.send).toHaveBeenCalled(); // Re-queued
    });

    it('should mark as failed after max retries', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findFirst).mockResolvedValue({
        id: 'email-log-123',
        status: 'queued',
        retryCount: 3,
        maxRetries: 3,
      });
      mockSESClient.send = vi.fn().mockRejectedValue(new Error('SES Error'));
      const queueMessage = {
        templateName: 'welcome',
        toAddress: 'test@example.com',
        templateData: {},
        metadata: { emailLogId: 'email-log-123' },
        priority: 'normal' as const,
      };

      // Act & Assert
      await expect(emailService.processQueuedEmail(queueMessage)).rejects.toThrow('SES Error');
      expect(mockSQSClient.send).not.toHaveBeenCalled(); // Not re-queued
    });
  });

  describe('retryFailedEmail()', () => {
    it('should retry failed email', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findFirst).mockResolvedValue({
        id: 'email-log-123',
        status: 'failed',
        retryCount: 1,
        maxRetries: 3,
        templateName: 'welcome',
        toAddress: 'test@example.com',
        templateData: { userName: 'John' },
      });

      // Act
      await emailService.retryFailedEmail('email-log-123');

      // Assert
      expect(mockSESClient.send).toHaveBeenCalled();
    });

    it('should allow force retry beyond max retries', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findFirst).mockResolvedValue({
        id: 'email-log-123',
        status: 'failed',
        retryCount: 3,
        maxRetries: 3,
        templateName: 'welcome',
        toAddress: 'test@example.com',
        templateData: {},
      });

      // Act
      await emailService.retryFailedEmail('email-log-123', true);

      // Assert
      expect(mockSESClient.send).toHaveBeenCalled();
    });

    it('should reject retry of non-failed email', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findFirst).mockResolvedValue({
        id: 'email-log-123',
        status: 'sent',
        retryCount: 0,
        maxRetries: 3,
      });

      // Act & Assert
      await expect(emailService.retryFailedEmail('email-log-123')).rejects.toThrow('not in failed state');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce per-second rate limit', async () => {
      // Arrange
      mockConfigService.getEmailConfig = vi.fn().mockResolvedValue({
        fromAddress: 'from@example.com',
        queueEnabled: false,
        maxRetries: 3,
        rateLimitPerSecond: 2,
        rateLimitPerDay: 200,
      });

      // Act
      await emailService.sendEmail(testEmails.basic);
      await emailService.sendEmail(testEmails.basic);

      // Assert - Third email should fail
      await expect(emailService.sendEmail(testEmails.basic)).rejects.toThrow('per second limit');
    });

    it('should reset rate limit counter after time window', async () => {
      // Arrange
      mockConfigService.getEmailConfig = vi.fn().mockResolvedValue({
        fromAddress: 'from@example.com',
        queueEnabled: false,
        maxRetries: 3,
        rateLimitPerSecond: 1,
        rateLimitPerDay: 200,
      });

      // Act
      await emailService.sendEmail(testEmails.basic);

      // Wait for rate limit window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Assert - Should succeed after reset
      await expect(emailService.sendEmail(testEmails.basic)).resolves.toBeDefined();
    });
  });

  describe('getStatistics()', () => {
    it('should return email statistics', async () => {
      // Arrange
      vi.mocked(db.query.emailLogs.findMany).mockResolvedValue([
        { status: 'sent' },
        { status: 'sent' },
        { status: 'failed' },
        { status: 'queued' },
      ] as any);

      // Act
      const stats = await emailService.getStatistics(new Date('2024-01-01'), new Date('2024-01-31'));

      // Assert
      expect(stats.total).toBe(4);
      expect(stats.sent).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.queued).toBe(1);
    });
  });
});
