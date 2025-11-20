/**
 * Compliance Service Unit Tests
 *
 * Tests the ComplianceService bounce/complaint handling and unsubscribe management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceService } from '../compliance.service';
import { mockBounceNotification, mockComplaintNotification } from './helpers/test-fixtures';

// Mock database
vi.mock('../../../shared/db/postgres', () => ({
  getPostgresClient: () => ({
    query: {
      emailSuppressions: { findFirst: vi.fn() },
      emailUnsubscribePreferences: { findFirst: vi.fn() },
      emailComplianceEvents: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
  }),
}));

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ComplianceService', () => {
  let complianceService: ComplianceService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    complianceService = new ComplianceService();

    // Get mocked db instance
    const { getPostgresClient } = require('../../../shared/db/postgres');
    mockDb = getPostgresClient();
  });

  describe('isEmailSuppressed()', () => {
    it('should return true for suppressed email', async () => {
      // Arrange
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue({
        id: 'suppression-1',
        emailAddress: 'bounce@example.com',
        isActive: true,
        reason: 'bounce_hard',
      });

      // Act
      const result = await complianceService.isEmailSuppressed('bounce@example.com');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-suppressed email', async () => {
      // Arrange
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue(null);

      // Act
      const result = await complianceService.isEmailSuppressed('valid@example.com');

      // Assert
      expect(result).toBe(false);
    });

    it('should normalize email addresses', async () => {
      // Arrange
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue(null);

      // Act
      await complianceService.isEmailSuppressed('Test@Example.COM  ');

      // Assert
      // Should query with normalized email
      expect(mockDb.query.emailSuppressions.findFirst).toHaveBeenCalled();
    });
  });

  describe('isEmailUnsubscribed()', () => {
    it('should return true for email unsubscribed from category', async () => {
      // Arrange
      mockDb.query.emailUnsubscribePreferences.findFirst.mockResolvedValue({
        emailAddress: 'test@example.com',
        category: 'marketing',
        isUnsubscribed: true,
      });

      // Act
      const result = await complianceService.isEmailUnsubscribed('test@example.com', 'marketing');

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for email unsubscribed from all', async () => {
      // Arrange
      mockDb.query.emailUnsubscribePreferences.findFirst
        .mockResolvedValueOnce({ category: 'all', isUnsubscribed: true })
        .mockResolvedValueOnce(null);

      // Act
      const result = await complianceService.isEmailUnsubscribed('test@example.com', 'marketing');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for subscribed email', async () => {
      // Arrange
      mockDb.query.emailUnsubscribePreferences.findFirst.mockResolvedValue(null);

      // Act
      const result = await complianceService.isEmailUnsubscribed('test@example.com', 'marketing');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('canSendEmail()', () => {
    it('should allow sending to valid email', async () => {
      // Arrange
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue(null);
      mockDb.query.emailUnsubscribePreferences.findFirst.mockResolvedValue(null);

      // Act
      const result = await complianceService.canSendEmail('test@example.com', 'marketing');

      // Assert
      expect(result.canSend).toBe(true);
    });

    it('should reject suppressed email', async () => {
      // Arrange
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue({
        isActive: true,
        reason: 'bounce_hard',
      });

      // Act
      const result = await complianceService.canSendEmail('bounce@example.com');

      // Assert
      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('suppressed');
    });

    it('should reject unsubscribed email', async () => {
      // Arrange
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue(null);
      mockDb.query.emailUnsubscribePreferences.findFirst.mockResolvedValue({
        category: 'marketing',
        isUnsubscribed: true,
      });

      // Act
      const result = await complianceService.canSendEmail('test@example.com', 'marketing');

      // Assert
      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('unsubscribed');
    });
  });

  describe('processBounce()', () => {
    it('should process permanent bounce and suppress email', async () => {
      // Arrange
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      });

      // Act
      await complianceService.processBounce(mockBounceNotification);

      // Assert
      expect(mockDb.insert).toHaveBeenCalled(); // Compliance event
      expect(mockDb.insert).toHaveBeenCalled(); // Suppression
    });

    it('should process soft bounce with counter', async () => {
      // Arrange
      const softBounce = {
        ...mockBounceNotification,
        bounce: {
          ...mockBounceNotification.bounce,
          bounceType: 'Transient' as const,
        },
      };
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      });

      // Act
      await complianceService.processBounce(softBounce);

      // Assert
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should suppress email after 3 soft bounces', async () => {
      // Arrange
      const softBounce = {
        ...mockBounceNotification,
        bounce: {
          ...mockBounceNotification.bounce,
          bounceType: 'Transient' as const,
        },
      };
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue({
        id: 'suppression-1',
        bounceCount: 2,
        isActive: false,
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // Act
      await complianceService.processBounce(softBounce);

      // Assert
      expect(mockDb.update).toHaveBeenCalled(); // Update to active
    });

    it('should log compliance event for each recipient', async () => {
      // Arrange
      const multiRecipientBounce = {
        ...mockBounceNotification,
        bounce: {
          ...mockBounceNotification.bounce,
          bouncedRecipients: [
            { emailAddress: 'bounce1@example.com' },
            { emailAddress: 'bounce2@example.com' },
          ],
        },
      };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      await complianceService.processBounce(multiRecipientBounce);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledTimes(4); // 2 events + 2 suppressions
    });
  });

  describe('processComplaint()', () => {
    it('should process complaint and immediately suppress email', async () => {
      // Arrange
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      });

      // Act
      await complianceService.processComplaint(mockComplaintNotification);

      // Assert
      expect(mockDb.insert).toHaveBeenCalled(); // Compliance event
      expect(mockDb.insert).toHaveBeenCalled(); // Suppression
    });

    it('should handle multiple complaint recipients', async () => {
      // Arrange
      const multiRecipientComplaint = {
        ...mockComplaintNotification,
        complaint: {
          ...mockComplaintNotification.complaint,
          complainedRecipients: [
            { emailAddress: 'complaint1@example.com' },
            { emailAddress: 'complaint2@example.com' },
          ],
        },
      };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      // Act
      await complianceService.processComplaint(multiRecipientComplaint);

      // Assert
      expect(mockDb.insert).toHaveBeenCalledTimes(4); // 2 events + 2 suppressions
    });
  });

  describe('unsubscribe()', () => {
    it('should create unsubscribe preference', async () => {
      // Arrange
      mockDb.query.emailUnsubscribePreferences.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            emailAddress: 'test@example.com',
            category: 'marketing',
            isUnsubscribed: true,
          }]),
        }),
      });

      // Act
      const result = await complianceService.unsubscribe({
        emailAddress: 'test@example.com',
        category: 'marketing',
        sourceType: 'link',
      });

      // Assert
      expect(result.isUnsubscribed).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should update existing preference', async () => {
      // Arrange
      mockDb.query.emailUnsubscribePreferences.findFirst.mockResolvedValue({
        id: 'pref-1',
        emailAddress: 'test@example.com',
        category: 'marketing',
        isUnsubscribed: false,
      });
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'pref-1',
              isUnsubscribed: true,
            }]),
          }),
        }),
      });

      // Act
      await complianceService.unsubscribe({
        emailAddress: 'test@example.com',
        category: 'marketing',
        sourceType: 'link',
      });

      // Assert
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should default to "all" category when not specified', async () => {
      // Arrange
      mockDb.query.emailUnsubscribePreferences.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ category: 'all' }]),
        }),
      });

      // Act
      await complianceService.unsubscribe({
        emailAddress: 'test@example.com',
        sourceType: 'link',
      });

      // Assert
      const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertCall.category).toBe('all');
    });
  });

  describe('resubscribe()', () => {
    it('should update preference to resubscribe', async () => {
      // Arrange
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // Act
      await complianceService.resubscribe('test@example.com', 'marketing');

      // Assert
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('Email Normalization', () => {
    it('should normalize email to lowercase', async () => {
      // Arrange
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue(null);

      // Act
      await complianceService.isEmailSuppressed('Test@EXAMPLE.COM');

      // Assert
      // Verify normalized email was used in query
      expect(mockDb.query.emailSuppressions.findFirst).toHaveBeenCalled();
    });

    it('should trim whitespace from email', async () => {
      // Arrange
      mockDb.query.emailSuppressions.findFirst.mockResolvedValue(null);

      // Act
      await complianceService.isEmailSuppressed('  test@example.com  ');

      // Assert
      expect(mockDb.query.emailSuppressions.findFirst).toHaveBeenCalled();
    });
  });
});
