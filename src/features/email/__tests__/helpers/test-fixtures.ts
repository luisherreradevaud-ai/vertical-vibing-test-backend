/**
 * Test Fixtures and Helpers for Email System Tests
 *
 * Provides reusable test data and utility functions for email system testing.
 */

import type { Request, Response, NextFunction } from 'express';
import type { SendEmailDTO, EmailTemplate, EmailQueueMessage } from '@vertical-vibing/shared-types';

/**
 * Mock user objects for testing
 */
export const testUsers = {
  superAdmin: {
    userId: 'user-super-admin',
    email: 'super@example.com',
    companyId: 'company-123',
    isSuperAdmin: true,
  },
  regularUser: {
    userId: 'user-regular',
    email: 'user@example.com',
    companyId: 'company-123',
    isSuperAdmin: false,
  },
  adminUser: {
    userId: 'user-admin',
    email: 'admin@example.com',
    companyId: 'company-123',
    isSuperAdmin: false,
  },
  otherCompanyUser: {
    userId: 'user-other',
    email: 'other@example.com',
    companyId: 'company-456',
    isSuperAdmin: false,
  },
};

/**
 * Mock companies for testing
 */
export const testCompanies = {
  company1: { id: 'company-123', name: 'Company A' },
  company2: { id: 'company-456', name: 'Company B' },
};

/**
 * Mock email data for testing
 */
export const testEmails = {
  basic: {
    templateName: 'welcome',
    toAddress: 'test@example.com',
    templateData: {
      userName: 'John Doe',
      companyName: 'Acme Corp',
      loginUrl: 'https://example.com/login',
    },
  } as SendEmailDTO,

  withCCBCC: {
    templateName: 'welcome',
    toAddress: 'test@example.com',
    ccAddresses: ['cc@example.com'],
    bccAddresses: ['bcc@example.com'],
    templateData: {
      userName: 'Jane Doe',
      companyName: 'Acme Corp',
      loginUrl: 'https://example.com/login',
    },
  } as SendEmailDTO,

  scheduled: {
    templateName: 'welcome',
    toAddress: 'test@example.com',
    templateData: {
      userName: 'Bob Smith',
      companyName: 'Acme Corp',
      loginUrl: 'https://example.com/login',
    },
    scheduledFor: new Date(Date.now() + 60000), // 1 minute from now
  } as SendEmailDTO,

  highPriority: {
    templateName: 'password-reset',
    toAddress: 'urgent@example.com',
    templateData: {
      userName: 'Alice Johnson',
      resetUrl: 'https://example.com/reset/token123',
      expiryHours: 24,
      companyName: 'Acme Corp',
    },
    priority: 'high' as const,
  } as SendEmailDTO,
};

/**
 * Mock template data for testing
 */
export const testTemplates = {
  welcome: {
    id: 'template-welcome',
    name: 'welcome',
    displayName: 'Welcome Email',
    description: 'Sent to new users',
    category: 'auth',
    status: 'published',
    contentType: 'react-email',
    content: '<html><body>Welcome {{userName}}!</body></html>',
    variables: [
      { name: 'userName', type: 'string', required: true },
      { name: 'companyName', type: 'string', required: false },
      { name: 'loginUrl', type: 'url', required: true },
    ],
    subjectTemplate: 'Welcome to {{companyName}}!',
    version: 1,
    isSystemTemplate: true,
    parentTemplateId: null,
    createdBy: null,
    createdAt: new Date('2024-01-01'),
    updatedBy: null,
    updatedAt: new Date('2024-01-01'),
    publishedBy: null,
    publishedAt: new Date('2024-01-01'),
  } as EmailTemplate,

  customDraft: {
    id: 'template-custom-draft',
    name: 'custom-template',
    displayName: 'Custom Template',
    description: 'A custom template',
    category: 'marketing',
    status: 'draft',
    contentType: 'html',
    content: '<html><body>Hello {{name}}</body></html>',
    variables: [
      { name: 'name', type: 'string', required: true },
    ],
    subjectTemplate: 'Hello {{name}}',
    version: 1,
    isSystemTemplate: false,
    parentTemplateId: null,
    createdBy: 'user-admin',
    createdAt: new Date('2024-01-15'),
    updatedBy: 'user-admin',
    updatedAt: new Date('2024-01-15'),
    publishedBy: null,
    publishedAt: null,
  } as EmailTemplate,
};

/**
 * Mock SES response for testing
 */
export const mockSESResponse = {
  MessageId: 'ses-msg-id-123456',
  $metadata: {
    httpStatusCode: 200,
    requestId: 'req-123',
  },
};

/**
 * Mock SQS response for testing
 */
export const mockSQSResponse = {
  MessageId: 'sqs-msg-id-123456',
  $metadata: {
    httpStatusCode: 200,
    requestId: 'req-123',
  },
};

/**
 * Mock SES Bounce Notification for testing
 */
export const mockBounceNotification = {
  notificationType: 'Bounce' as const,
  bounce: {
    bounceType: 'Permanent' as const,
    bounceSubType: 'General',
    bouncedRecipients: [
      {
        emailAddress: 'bounce@example.com',
        action: 'failed',
        status: '5.1.1',
        diagnosticCode: 'smtp; 550 5.1.1 user unknown',
      },
    ],
    timestamp: new Date().toISOString(),
    feedbackId: 'feedback-123',
    remoteMtaIp: '192.0.2.1',
    reportingMTA: 'dsn; mail.example.com',
  },
  mail: {
    timestamp: new Date().toISOString(),
    source: 'sender@example.com',
    sourceArn: 'arn:aws:ses:us-east-1:123456789:identity/example.com',
    sendingAccountId: '123456789',
    messageId: 'msg-123',
    destination: ['bounce@example.com'],
    headersTruncated: false,
    headers: [],
    commonHeaders: {
      from: ['sender@example.com'],
      to: ['bounce@example.com'],
      messageId: 'msg-123',
      subject: 'Test Email',
    },
  },
};

/**
 * Mock SES Complaint Notification for testing
 */
export const mockComplaintNotification = {
  notificationType: 'Complaint' as const,
  complaint: {
    complainedRecipients: [
      {
        emailAddress: 'complaint@example.com',
      },
    ],
    timestamp: new Date().toISOString(),
    feedbackId: 'feedback-456',
    userAgent: 'ExampleCorp Feedback Loop (V0.01)',
    complaintFeedbackType: 'abuse',
    arrivalDate: new Date().toISOString(),
  },
  mail: {
    timestamp: new Date().toISOString(),
    source: 'sender@example.com',
    sourceArn: 'arn:aws:ses:us-east-1:123456789:identity/example.com',
    sendingAccountId: '123456789',
    messageId: 'msg-456',
    destination: ['complaint@example.com'],
    headersTruncated: false,
    headers: [],
    commonHeaders: {
      from: ['sender@example.com'],
      to: ['complaint@example.com'],
      messageId: 'msg-456',
      subject: 'Test Email',
    },
  },
};

/**
 * Create mock Express request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    user: testUsers.regularUser,
    tenantId: 'company-123',
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  };
}

/**
 * Create mock Express response object
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Create mock Next function
 */
export function createMockNext(): NextFunction {
  return vi.fn();
}

/**
 * Mock email log for testing
 */
export function createMockEmailLog(overrides: any = {}) {
  return {
    id: 'log-123',
    templateName: 'welcome',
    toAddress: 'test@example.com',
    ccAddresses: null,
    bccAddresses: null,
    subject: 'Welcome to Acme Corp!',
    htmlContent: '<html><body>Welcome!</body></html>',
    status: 'sent',
    messageId: 'msg-123',
    templateData: { userName: 'John Doe' },
    metadata: null,
    queuedAt: new Date('2024-01-01T10:00:00Z'),
    sentAt: new Date('2024-01-01T10:00:05Z'),
    bouncedAt: null,
    failedAt: null,
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: null,
    errorMessage: null,
    sesResponse: mockSESResponse,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:05Z'),
    ...overrides,
  };
}

/**
 * Mock system config for testing
 */
export function createMockSystemConfig(key: string, value: string, overrides: any = {}) {
  return {
    id: `config-${key}`,
    key,
    value,
    valueType: 'string',
    category: 'email',
    description: `Test config for ${key}`,
    isSensitive: false,
    allowEnvOverride: true,
    envVarName: key,
    validationRules: null,
    updatedBy: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 10): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock database query result
 */
export function createMockDbQueryResult<T>(data: T[]) {
  return {
    findFirst: vi.fn().mockResolvedValue(data[0] || null),
    findMany: vi.fn().mockResolvedValue(data),
  };
}
