/**
 * Email Compliance Service
 *
 * Handles email compliance requirements including:
 * - Bounce and complaint processing from SES webhooks
 * - Email suppression management
 * - Unsubscribe preference management
 * - DKIM/SPF validation helpers
 */

import { and, eq, isNull, or } from 'drizzle-orm';
import { getPostgresClient } from '../../shared/db/postgres.js';
import {
  emailSuppressions,
  emailUnsubscribePreferences,
  emailComplianceEvents,
  emailLogs,
  type EmailSuppression,
  type NewEmailSuppression,
  type EmailUnsubscribePreference,
  type NewEmailUnsubscribePreference,
  type NewEmailComplianceEvent,
} from '../../shared/db/schema/email.schema.js';
import { logger } from '../../shared/utils/logger.js';

const db = getPostgresClient();

export class ComplianceService {
  /**
   * Check if an email address is suppressed
   * Used before sending emails to prevent delivery issues
   */
  async isEmailSuppressed(emailAddress: string): Promise<boolean> {
    const normalized = this.normalizeEmail(emailAddress);

    const suppression = await db.query.emailSuppressions.findFirst({
      where: and(
        eq(emailSuppressions.emailAddress, normalized),
        eq(emailSuppressions.isActive, true)
      ),
    });

    if (suppression) {
      logger.debug(
        { emailAddress: normalized, reason: suppression.reason },
        'Email address is suppressed'
      );
      return true;
    }

    return false;
  }

  /**
   * Check if an email address has unsubscribed from a category
   */
  async isEmailUnsubscribed(emailAddress: string, category: string): Promise<boolean> {
    const normalized = this.normalizeEmail(emailAddress);

    // Check for 'all' category unsubscribe
    const allUnsubscribe = await db.query.emailUnsubscribePreferences.findFirst({
      where: and(
        eq(emailUnsubscribePreferences.emailAddress, normalized),
        eq(emailUnsubscribePreferences.category, 'all'),
        eq(emailUnsubscribePreferences.isUnsubscribed, true)
      ),
    });

    if (allUnsubscribe) {
      return true;
    }

    // Check category-specific unsubscribe
    const categoryUnsubscribe = await db.query.emailUnsubscribePreferences.findFirst({
      where: and(
        eq(emailUnsubscribePreferences.emailAddress, normalized),
        eq(emailUnsubscribePreferences.category, category),
        eq(emailUnsubscribePreferences.isUnsubscribed, true)
      ),
    });

    return !!categoryUnsubscribe;
  }

  /**
   * Check if email can be sent (combines suppression and unsubscribe checks)
   */
  async canSendEmail(emailAddress: string, category?: string): Promise<{
    canSend: boolean;
    reason?: string;
  }> {
    const normalized = this.normalizeEmail(emailAddress);

    // Check suppression first
    const isSuppressed = await this.isEmailSuppressed(normalized);
    if (isSuppressed) {
      return {
        canSend: false,
        reason: 'Email address is suppressed (bounced or complained)',
      };
    }

    // Check unsubscribe if category provided
    if (category) {
      const isUnsubscribed = await this.isEmailUnsubscribed(normalized, category);
      if (isUnsubscribed) {
        return {
          canSend: false,
          reason: `Email address has unsubscribed from '${category}' emails`,
        };
      }
    }

    return { canSend: true };
  }

  /**
   * Process a bounce notification from SES
   * Called by webhook handler
   */
  async processBounce(notification: SESBounceNotification): Promise<void> {
    const { bounce, mail } = notification;

    logger.info(
      {
        messageId: mail.messageId,
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
        recipients: bounce.bouncedRecipients.length,
      },
      'Processing bounce notification'
    );

    // Determine suppression reason based on bounce type
    const isPermanent = bounce.bounceType === 'Permanent';
    const reason = isPermanent ? 'bounce_hard' : 'bounce_soft';

    for (const recipient of bounce.bouncedRecipients) {
      const emailAddress = this.normalizeEmail(recipient.emailAddress);

      try {
        // Log compliance event
        await this.logComplianceEvent({
          eventType: 'bounce',
          emailAddress,
          messageId: mail.messageId,
          eventData: notification as any,
          occurredAt: new Date(bounce.timestamp),
        });

        // Handle based on bounce type
        if (isPermanent) {
          // Permanent bounce - suppress immediately
          await this.addSuppression({
            emailAddress,
            reason,
            bounceType: bounce.bounceType,
            bounceSubType: bounce.bounceSubType,
            reasonDetails: recipient.diagnosticCode || recipient.action || 'Permanent bounce',
            sourceType: 'ses',
            sourceMessageId: mail.messageId,
            sesNotification: notification as any,
          });

          logger.info({ emailAddress, bounceType: bounce.bounceType }, 'Email suppressed due to permanent bounce');
        } else {
          // Soft bounce - increment count, suppress after threshold
          await this.handleSoftBounce({
            emailAddress,
            bounceType: bounce.bounceType,
            bounceSubType: bounce.bounceSubType,
            reasonDetails: recipient.diagnosticCode || recipient.action || 'Transient bounce',
            sourceMessageId: mail.messageId,
            sesNotification: notification as any,
          });
        }

        // Update email log status
        await this.updateEmailLogStatus(mail.messageId, 'bounced');
      } catch (error) {
        logger.error(
          { error, emailAddress, messageId: mail.messageId },
          'Error processing bounce for recipient'
        );
      }
    }
  }

  /**
   * Process a complaint notification from SES
   * Called by webhook handler
   */
  async processComplaint(notification: SESComplaintNotification): Promise<void> {
    const { complaint, mail } = notification;

    logger.info(
      {
        messageId: mail.messageId,
        feedbackType: complaint.complaintFeedbackType,
        recipients: complaint.complainedRecipients.length,
      },
      'Processing complaint notification'
    );

    for (const recipient of complaint.complainedRecipients) {
      const emailAddress = this.normalizeEmail(recipient.emailAddress);

      try {
        // Log compliance event
        await this.logComplianceEvent({
          eventType: 'complaint',
          emailAddress,
          messageId: mail.messageId,
          eventData: notification as any,
          occurredAt: new Date(complaint.timestamp),
        });

        // Suppress immediately - complaints are serious
        await this.addSuppression({
          emailAddress,
          reason: 'complaint',
          complaintFeedbackType: complaint.complaintFeedbackType,
          reasonDetails: `User marked email as spam (${complaint.complaintFeedbackType || 'unspecified'})`,
          sourceType: 'ses',
          sourceMessageId: mail.messageId,
          sesNotification: notification as any,
        });

        logger.warn({ emailAddress, feedbackType: complaint.complaintFeedbackType }, 'Email suppressed due to complaint');

        // Update email log status
        await this.updateEmailLogStatus(mail.messageId, 'complained');
      } catch (error) {
        logger.error(
          { error, emailAddress, messageId: mail.messageId },
          'Error processing complaint for recipient'
        );
      }
    }
  }

  /**
   * Handle soft bounce with count-based suppression
   */
  private async handleSoftBounce(data: {
    emailAddress: string;
    bounceType: string;
    bounceSubType?: string;
    reasonDetails?: string;
    sourceMessageId?: string;
    sesNotification?: any;
  }): Promise<void> {
    const existing = await db.query.emailSuppressions.findFirst({
      where: and(
        eq(emailSuppressions.emailAddress, data.emailAddress),
        eq(emailSuppressions.reason, 'bounce_soft')
      ),
    });

    const SOFT_BOUNCE_THRESHOLD = 3;

    if (existing) {
      // Increment bounce count
      const newCount = (existing.bounceCount || 0) + 1;
      const shouldSuppress = newCount >= SOFT_BOUNCE_THRESHOLD;

      await db
        .update(emailSuppressions)
        .set({
          bounceCount: newCount,
          lastBounceAt: new Date(),
          isActive: shouldSuppress ? true : existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(emailSuppressions.id, existing.id));

      if (shouldSuppress && !existing.isActive) {
        logger.warn(
          { emailAddress: data.emailAddress, bounceCount: newCount },
          'Email suppressed after exceeding soft bounce threshold'
        );
      }
    } else {
      // First soft bounce - create suppression record but don't activate yet
      await this.addSuppression({
        emailAddress: data.emailAddress,
        reason: 'bounce_soft',
        bounceType: data.bounceType,
        bounceSubType: data.bounceSubType,
        reasonDetails: data.reasonDetails || 'Soft bounce',
        sourceType: 'ses',
        sourceMessageId: data.sourceMessageId,
        sesNotification: data.sesNotification,
        isActive: false, // Don't suppress on first soft bounce
        bounceCount: 1,
        lastBounceAt: new Date(),
      });

      logger.info(
        { emailAddress: data.emailAddress },
        'Soft bounce recorded (1/3 threshold)'
      );
    }
  }

  /**
   * Add an email to the suppression list
   */
  private async addSuppression(data: Partial<NewEmailSuppression> & {
    emailAddress: string;
    reason: string;
  }): Promise<EmailSuppression> {
    const normalized = this.normalizeEmail(data.emailAddress);

    // Check if already exists
    const existing = await db.query.emailSuppressions.findFirst({
      where: eq(emailSuppressions.emailAddress, normalized),
    });

    if (existing) {
      // Update existing suppression
      const [updated] = await db
        .update(emailSuppressions)
        .set({
          ...data,
          emailAddress: normalized,
          updatedAt: new Date(),
        })
        .where(eq(emailSuppressions.id, existing.id))
        .returning();

      return updated;
    }

    // Insert new suppression
    const [suppression] = await db
      .insert(emailSuppressions)
      .values({
        ...data,
        emailAddress: normalized,
        isActive: data.isActive ?? true,
        bounceCount: data.bounceCount ?? 1,
        suppressedAt: new Date(),
      })
      .returning();

    return suppression;
  }

  /**
   * Handle unsubscribe request
   */
  async unsubscribe(data: {
    emailAddress: string;
    category?: string;
    sourceType: string;
    unsubscribeToken?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<EmailUnsubscribePreference> {
    const normalized = this.normalizeEmail(data.emailAddress);
    const category = data.category || 'all';

    logger.info(
      { emailAddress: normalized, category, sourceType: data.sourceType },
      'Processing unsubscribe request'
    );

    // Log compliance event
    await this.logComplianceEvent({
      eventType: 'unsubscribe',
      emailAddress: normalized,
      eventData: {
        category,
        sourceType: data.sourceType,
        unsubscribeToken: data.unsubscribeToken,
      } as any,
      occurredAt: new Date(),
    });

    // Check if preference already exists
    const existing = await db.query.emailUnsubscribePreferences.findFirst({
      where: and(
        eq(emailUnsubscribePreferences.emailAddress, normalized),
        eq(emailUnsubscribePreferences.category, category)
      ),
    });

    if (existing) {
      // Update existing preference
      const [updated] = await db
        .update(emailUnsubscribePreferences)
        .set({
          isUnsubscribed: true,
          sourceType: data.sourceType,
          unsubscribeToken: data.unsubscribeToken,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          unsubscribedAt: new Date(),
          resubscribedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(emailUnsubscribePreferences.id, existing.id))
        .returning();

      return updated;
    }

    // Create new unsubscribe preference
    const [preference] = await db
      .insert(emailUnsubscribePreferences)
      .values({
        emailAddress: normalized,
        category,
        isUnsubscribed: true,
        sourceType: data.sourceType,
        unsubscribeToken: data.unsubscribeToken,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        unsubscribedAt: new Date(),
      })
      .returning();

    return preference;
  }

  /**
   * Handle resubscribe request
   */
  async resubscribe(emailAddress: string, category?: string): Promise<void> {
    const normalized = this.normalizeEmail(emailAddress);
    const targetCategory = category || 'all';

    logger.info(
      { emailAddress: normalized, category: targetCategory },
      'Processing resubscribe request'
    );

    // Log compliance event
    await this.logComplianceEvent({
      eventType: 'resubscribe',
      emailAddress: normalized,
      eventData: { category: targetCategory } as any,
      occurredAt: new Date(),
    });

    await db
      .update(emailUnsubscribePreferences)
      .set({
        isUnsubscribed: false,
        resubscribedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailUnsubscribePreferences.emailAddress, normalized),
          eq(emailUnsubscribePreferences.category, targetCategory)
        )
      );
  }

  /**
   * Log a compliance event for audit trail
   */
  private async logComplianceEvent(data: Omit<NewEmailComplianceEvent, 'eventData'> & {
    eventData: any;
  }): Promise<void> {
    try {
      await db.insert(emailComplianceEvents).values({
        ...data,
        receivedAt: new Date(),
        processed: false,
      });
    } catch (error) {
      logger.error({ error, eventType: data.eventType }, 'Error logging compliance event');
    }
  }

  /**
   * Update email log status
   */
  private async updateEmailLogStatus(messageId: string, status: string): Promise<void> {
    try {
      const statusField = status === 'bounced' ? 'bouncedAt' : status === 'complained' ? 'bouncedAt' : null;

      if (statusField) {
        await db
          .update(emailLogs)
          .set({
            status,
            [statusField]: new Date(),
          })
          .where(eq(emailLogs.messageId, messageId));
      }
    } catch (error) {
      logger.error({ error, messageId, status }, 'Error updating email log status');
    }
  }

  /**
   * Normalize email address (lowercase, trim)
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Validate DKIM setup for a domain
   * Returns DKIM token status
   */
  async validateDKIMSetup(domain: string): Promise<{
    isValid: boolean;
    tokens: Array<{ token: string; status: 'success' | 'pending' | 'failed'; details?: string }>;
  }> {
    // This would typically use AWS SDK to check SES domain identity
    // For now, returning a placeholder structure
    logger.info({ domain }, 'Validating DKIM setup');

    return {
      isValid: false,
      tokens: [],
    };
  }

  /**
   * Validate SPF record for a domain
   */
  async validateSPFSetup(domain: string): Promise<{
    isValid: boolean;
    record?: string;
    details?: string;
  }> {
    // This would typically use DNS lookups to check SPF record
    logger.info({ domain }, 'Validating SPF setup');

    return {
      isValid: false,
      details: 'SPF validation not implemented',
    };
  }
}

/**
 * SES Notification Type Definitions
 */
export interface SESBounceNotification {
  notificationType: 'Bounce';
  bounce: {
    bounceType: 'Undetermined' | 'Permanent' | 'Transient';
    bounceSubType?: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp: string;
    feedbackId: string;
    remoteMtaIp?: string;
    reportingMTA?: string;
  };
  mail: {
    timestamp: string;
    source: string;
    sourceArn: string;
    sendingAccountId: string;
    messageId: string;
    destination: string[];
    headersTruncated?: boolean;
    headers?: Array<{ name: string; value: string }>;
    commonHeaders?: {
      from?: string[];
      to?: string[];
      messageId?: string;
      subject?: string;
    };
  };
}

export interface SESComplaintNotification {
  notificationType: 'Complaint';
  complaint: {
    complainedRecipients: Array<{
      emailAddress: string;
    }>;
    timestamp: string;
    feedbackId: string;
    userAgent?: string;
    complaintFeedbackType?: string;
    arrivalDate?: string;
  };
  mail: {
    timestamp: string;
    source: string;
    sourceArn: string;
    sendingAccountId: string;
    messageId: string;
    destination: string[];
    headersTruncated?: boolean;
    headers?: Array<{ name: string; value: string }>;
    commonHeaders?: {
      from?: string[];
      to?: string[];
      messageId?: string;
      subject?: string;
    };
  };
}
