# Email Compliance System

## Overview

The Email Compliance System provides comprehensive email delivery compliance including bounce/complaint handling, unsubscribe management, and email suppression to ensure regulatory compliance and maintain sender reputation.

**Key Features:**
- ✅ Automated bounce and complaint processing (SES webhooks)
- ✅ Category-based unsubscribe preferences
- ✅ RFC 8058 one-click unsubscribe support
- ✅ Email suppression list management
- ✅ Complete audit trail for regulatory compliance
- ✅ HMAC-signed unsubscribe tokens
- ✅ Hard/soft bounce classification
- ✅ CAN-SPAM Act compliance

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Email Send Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EmailService.sendEmail()                                       │
│         │                                                       │
│         ├─→ ComplianceService.canSendEmail()                   │
│         │       ├─→ Check suppressions (bounces/complaints)    │
│         │       └─→ Check unsubscribe preferences              │
│         │                                                       │
│         ├─→ Generate unsubscribe token                         │
│         ├─→ Add List-Unsubscribe headers                       │
│         └─→ Send via SES                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Bounce/Complaint Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SES → SNS Topic → Webhook Endpoint                            │
│                         │                                       │
│                         ├─→ Bounce notification                │
│                         │      ├─→ Hard bounce → Suppress now  │
│                         │      └─→ Soft bounce → Count (3x)    │
│                         │                                       │
│                         └─→ Complaint notification             │
│                                └─→ Suppress immediately        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Unsubscribe Flow                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User clicks link in email                                      │
│         │                                                       │
│         ├─→ GET /api/email/unsubscribe/:token                  │
│         │      └─→ Show HTML confirmation page                 │
│         │                                                       │
│         ├─→ POST /api/email/unsubscribe/:token                 │
│         │      ├─→ Verify HMAC signature                       │
│         │      ├─→ Update preferences                          │
│         │      └─→ Show success page                           │
│         │                                                       │
│         └─→ POST /api/email/unsubscribe/list-unsubscribe/:token│
│                └─→ RFC 8058 one-click (no confirmation)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### email_suppressions

Centralized suppression list for all types of email delivery issues.

```typescript
{
  id: uuid                        // Primary key
  emailAddress: string            // Normalized email (lowercase, trimmed)
  reason: string                  // 'bounce_hard', 'bounce_soft', 'complaint', 'manual'
  bounceType: string?             // 'Permanent', 'Transient', 'Undetermined' (SES)
  bounceSubType: string?          // Detailed bounce reason from SES
  complaintFeedbackType: string?  // Spam report type
  isActive: boolean               // Whether suppression is active
  bounceCount: number             // Count for soft bounces (threshold: 3)
  lastBounceAt: timestamp?        // Last bounce occurrence
  sourceType: string              // 'ses', 'manual'
  sourceMessageId: string?        // SES message ID
  reasonDetails: string?          // Human-readable reason
  sesNotification: jsonb?         // Full SES notification payload
  suppressedAt: timestamp         // When suppression was created
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Suppression Logic:**
- **Hard bounce** (Permanent): Immediate suppression, `isActive = true`
- **Soft bounce** (Transient): Count-based suppression
  - 1st soft bounce: Record created, `isActive = false`, `bounceCount = 1`
  - 2nd soft bounce: Update, `isActive = false`, `bounceCount = 2`
  - 3rd soft bounce: Update, `isActive = true`, `bounceCount = 3` (SUPPRESSED)
- **Complaint** (spam report): Immediate suppression, `isActive = true`

### email_unsubscribe_preferences

Category-based unsubscribe preferences for granular control.

```typescript
{
  id: uuid
  emailAddress: string            // Normalized email
  category: string                // 'marketing', 'notifications', 'billing', 'auth', 'all'
  isUnsubscribed: boolean         // true = unsubscribed, false = resubscribed
  sourceType: string              // 'email_link', 'preference_center', 'list_unsubscribe', 'manual'
  unsubscribeToken: string?       // Token used (for audit)
  userAgent: string?              // Browser/client (for audit)
  ipAddress: string?              // IP address (for audit)
  unsubscribedAt: timestamp?      // When unsubscribed
  resubscribedAt: timestamp?      // When resubscribed (if applicable)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Category Logic:**
- **Category-specific**: User can unsubscribe from "marketing" but still receive "billing"
- **Global ("all")**: Unsubscribe from all email categories
- Check order: Check "all" first, then check specific category

### email_compliance_events

Complete audit trail for all compliance events (regulatory requirement).

```typescript
{
  id: uuid
  eventType: string               // 'bounce', 'complaint', 'unsubscribe', 'resubscribe'
  emailAddress: string
  emailLogId: uuid?               // Link to email_logs
  messageId: string?              // SES message ID
  eventData: jsonb                // Full event payload
  processed: boolean              // Whether event was processed
  occurredAt: timestamp           // When event occurred
  receivedAt: timestamp           // When webhook received event
  createdAt: timestamp
}
```

## API Endpoints

### Webhook Endpoints (Public)

These endpoints are called by AWS SNS and do not require authentication.

#### POST /api/email/webhooks/ses-notifications

Main SNS notification endpoint for all SES events (bounces, complaints, deliveries).

**Request Headers:**
```
x-amz-sns-message-type: SubscriptionConfirmation | Notification
```

**SNS Subscription Confirmation:**
```json
{
  "Type": "SubscriptionConfirmation",
  "TopicArn": "arn:aws:sns:us-east-1:123456789012:ses-notifications",
  "SubscribeURL": "https://sns.amazonaws.com/..."
}
```

**Response:** `200 OK` - Auto-confirms subscription by calling SubscribeURL

**SNS Notification:**
```json
{
  "Type": "Notification",
  "Message": "{\"notificationType\":\"Bounce\",\"bounce\":{...}}"
}
```

**Supported Notification Types:**
- `Bounce` - Routes to `ComplianceService.processBounce()`
- `Complaint` - Routes to `ComplianceService.processComplaint()`
- `Delivery` - Logged (optional tracking)
- `Send` - Logged (optional tracking)
- `Reject` - Logged (SES rejected email)

#### POST /api/email/webhooks/bounce

Direct bounce webhook (alternative to SNS).

**Request Body:**
```json
{
  "notificationType": "Bounce",
  "bounce": {
    "bounceType": "Permanent",
    "bounceSubType": "General",
    "bouncedRecipients": [
      {
        "emailAddress": "bounced@example.com",
        "diagnosticCode": "smtp; 550 5.1.1 user unknown"
      }
    ],
    "timestamp": "2025-01-20T12:00:00.000Z",
    "feedbackId": "..."
  },
  "mail": {
    "messageId": "...",
    "source": "noreply@example.com",
    "destination": ["bounced@example.com"]
  }
}
```

**Response:** `200 OK { "message": "Bounce processed" }`

#### POST /api/email/webhooks/complaint

Direct complaint webhook (alternative to SNS).

**Request Body:**
```json
{
  "notificationType": "Complaint",
  "complaint": {
    "complainedRecipients": [
      { "emailAddress": "user@example.com" }
    ],
    "timestamp": "2025-01-20T12:00:00.000Z",
    "complaintFeedbackType": "abuse"
  },
  "mail": {
    "messageId": "...",
    "source": "noreply@example.com"
  }
}
```

**Response:** `200 OK { "message": "Complaint processed" }`

### Unsubscribe Endpoints (Public)

These endpoints are accessed via links in emails and do not require authentication. Security is provided by HMAC-signed tokens.

#### GET /api/email/unsubscribe/:token

Shows HTML confirmation page for unsubscribe.

**URL:** `/api/email/unsubscribe/eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJjYXRlZ29yeSI6Im1hcmtldGluZyIsImV4cCI6MTcwNjEwMDAwMDAwMH0.4xV...`

**Response:** HTML page with:
- Email address
- Category being unsubscribed from
- Confirmation button (submits POST to same URL)

#### POST /api/email/unsubscribe/:token

Processes unsubscribe request (requires confirmation from GET page).

**Request:** Form submission from confirmation page

**Response:** HTML success page confirming unsubscribe

**Side Effects:**
- Creates/updates record in `email_unsubscribe_preferences`
- Logs event in `email_compliance_events`
- Records IP address, user agent for audit

#### POST /api/email/unsubscribe/preference-center/update

Update multiple category preferences at once (for preference center UI).

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "eyJ...",
  "categories": [
    { "name": "marketing", "unsubscribed": true },
    { "name": "notifications", "unsubscribed": false },
    { "name": "billing", "unsubscribed": false }
  ]
}
```

**Response:** `200 OK { "success": true, "message": "Preferences updated" }`

#### POST /api/email/unsubscribe/list-unsubscribe/:token

RFC 8058 one-click unsubscribe (no confirmation required).

**Used by:** Email clients that support List-Unsubscribe header

**Request:** `POST` with no body (as per RFC 8058)

**Response:** `200 OK` (empty body)

**Side Effects:** Same as regular unsubscribe but with `sourceType: 'list_unsubscribe'`

## Unsubscribe Token Security

### Token Generation

Tokens are HMAC-signed to prevent tampering and forgery.

```typescript
function generateUnsubscribeToken(email: string, category?: string): string {
  const SECRET = process.env.UNSUBSCRIBE_SECRET; // Must be set in production

  const payload = JSON.stringify({
    email: "user@example.com",
    category: "marketing",
    exp: Date.now() + 90 * 24 * 60 * 60 * 1000 // 90 days
  });

  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');

  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}
```

**Token Format:** `{base64url(payload)}.{hmac-sha256-signature}`

**Example:** `eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJjYXRlZ29yeSI6Im1hcmtldGluZyIsImV4cCI6MTcwNjEwMDAwMDAwMH0.4xVh2K8...`

### Token Verification

```typescript
function verifyUnsubscribeToken(token: string): { email: string; category?: string } | null {
  const [payloadB64, signature] = token.split('.');

  // 1. Verify signature
  const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
  const expectedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null; // Invalid signature
  }

  // 2. Check expiration
  const data = JSON.parse(payload);
  if (data.exp && data.exp < Date.now()) {
    return null; // Expired
  }

  return { email: data.email, category: data.category };
}
```

**Security Properties:**
- ✅ Cannot be forged without secret key
- ✅ Cannot be modified without invalidating signature
- ✅ Time-limited (90 day expiration)
- ✅ No database lookup required for validation
- ✅ Includes email + category in signed payload

**Environment Variables:**
```bash
# .env
UNSUBSCRIBE_SECRET=your-256-bit-secret-here  # REQUIRED for production
```

⚠️ **Security Warning:** The default secret `'change-me-in-production'` is only for development. Production deployments MUST set a strong random secret.

## Email Service Integration

### Pre-Send Compliance Check

Before every email send, the system checks:
1. **Suppressions:** Is email on bounce/complaint list?
2. **Unsubscribes:** Has user opted out of this category?

```typescript
async sendEmail(emailData: SendEmailDTO): Promise<string> {
  // 1. Check compliance
  const canSend = await this.complianceService.canSendEmail(
    emailData.toAddress,
    emailData.templateData?.category as string | undefined
  );

  if (!canSend.canSend) {
    throw new Error(`Cannot send email: ${canSend.reason}`);
    // Example reasons:
    // - "Email address is suppressed (bounced or complained)"
    // - "Email address has unsubscribed from 'marketing' emails"
  }

  // 2. Generate unsubscribe token
  const unsubscribeToken = generateUnsubscribeToken(
    emailData.toAddress,
    emailData.templateData?.category
  );

  // 3. Build unsubscribe URLs
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe/${unsubscribeToken}`;
  const listUnsubscribeUrl = `${baseUrl}/api/email/unsubscribe/list-unsubscribe/${unsubscribeToken}`;

  // 4. Add List-Unsubscribe headers (RFC 8058)
  const command = new SendEmailCommand({
    // ... email content
    Tags: [
      { Name: 'List-Unsubscribe', Value: `<${unsubscribeUrl}>` },
      { Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' },
    ],
  });

  // 5. Send email
  await sesClient.send(command);
}
```

### Error Handling

The email route handles compliance errors with appropriate HTTP status codes:

```typescript
// In email.route.ts
try {
  await emailService.sendEmail(emailData);
} catch (error) {
  if (error.message.includes('suppressed')) {
    return res.status(400).json({
      error: 'Recipient email address is suppressed (bounced or complained)'
    });
  }

  if (error.message.includes('unsubscribed')) {
    return res.status(400).json({
      error: 'Recipient has unsubscribed from this category of emails'
    });
  }

  // ... other error handling
}
```

## Webhook Setup (AWS)

### SNS Topic Configuration

1. **Create SNS Topic** (in Terraform):
```hcl
resource "aws_sns_topic" "email_notifications" {
  name = "ses-email-notifications-${var.environment}"
}
```

2. **Configure SES to publish to SNS**:
```hcl
resource "aws_ses_configuration_set" "main" {
  name = "email-config-set-${var.environment}"
}

resource "aws_ses_event_destination" "bounce_complaint" {
  name                   = "bounce-complaint-destination"
  configuration_set_name = aws_ses_configuration_set.main.name
  enabled                = true
  matching_types         = ["bounce", "complaint"]

  sns_destination {
    topic_arn = aws_sns_topic.email_notifications.arn
  }
}
```

3. **Subscribe webhook endpoint to SNS**:
```hcl
resource "aws_sns_topic_subscription" "webhook" {
  topic_arn = aws_sns_topic.email_notifications.arn
  protocol  = "https"
  endpoint  = "https://api.example.com/api/email/webhooks/ses-notifications"
}
```

4. **Subscription Confirmation:**
   - SNS sends `SubscriptionConfirmation` to webhook
   - Webhook automatically calls `SubscribeURL` to confirm
   - Subscription status changes to "Confirmed"

### Testing Webhooks Locally

**Option 1: ngrok**
```bash
# Start backend
npm run dev

# In another terminal, expose local server
ngrok http 3000

# Use ngrok URL for SNS subscription
# https://abc123.ngrok.io/api/email/webhooks/ses-notifications
```

**Option 2: AWS SNS Console (Manual Testing)**
```bash
# Send test bounce notification
curl -X POST http://localhost:3000/api/email/webhooks/bounce \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "Bounce",
    "bounce": {
      "bounceType": "Permanent",
      "bouncedRecipients": [
        { "emailAddress": "test@example.com" }
      ],
      "timestamp": "2025-01-20T12:00:00.000Z"
    },
    "mail": {
      "messageId": "test-message-id",
      "source": "noreply@example.com",
      "destination": ["test@example.com"]
    }
  }'
```

## Regulatory Compliance

### CAN-SPAM Act (United States)

✅ **Requirements Met:**
- Unsubscribe mechanism in every email (List-Unsubscribe header)
- Unsubscribe requests processed within 10 business days (immediate in our system)
- Unsubscribe option valid for at least 30 days (90 days in our system)
- No charge for unsubscribe
- Clear identification of sender (from address in SES configuration)

### RFC 8058 (List-Unsubscribe)

✅ **Requirements Met:**
- `List-Unsubscribe` header with HTTPS URL
- `List-Unsubscribe-Post` header for one-click
- POST endpoint returns 200 OK
- No confirmation required for one-click (separate endpoint)

### GDPR (European Union)

✅ **Compliance Support:**
- Audit trail via `email_compliance_events` (who, when, how)
- IP address and user agent tracking for unsubscribes
- Granular consent via category-based preferences
- Right to withdraw consent (unsubscribe)
- Data retention tracking (timestamps)

**Note:** Full GDPR compliance requires additional measures beyond email (privacy policy, data processing agreements, etc.)

## Testing Guide

### Unit Tests

```typescript
// compliance.service.test.ts
describe('ComplianceService', () => {
  describe('canSendEmail', () => {
    it('should block suppressed emails', async () => {
      // Setup: Add email to suppression list
      await complianceService.processBounce({
        bounce: { bounceType: 'Permanent', ... },
        mail: { messageId: '...', ... }
      });

      // Test
      const result = await complianceService.canSendEmail('test@example.com');

      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('suppressed');
    });

    it('should block unsubscribed emails by category', async () => {
      // Setup
      await complianceService.unsubscribe({
        emailAddress: 'test@example.com',
        category: 'marketing',
        sourceType: 'manual'
      });

      // Test
      const result = await complianceService.canSendEmail('test@example.com', 'marketing');

      expect(result.canSend).toBe(false);
      expect(result.reason).toContain('unsubscribed');
    });

    it('should suppress after 3 soft bounces', async () => {
      // Process 3 soft bounces
      for (let i = 0; i < 3; i++) {
        await complianceService.processBounce({
          bounce: { bounceType: 'Transient', ... },
          mail: { ... }
        });
      }

      // Check suppression
      const result = await complianceService.canSendEmail('test@example.com');
      expect(result.canSend).toBe(false);
    });
  });
});
```

### Integration Tests

```typescript
// email-webhooks.route.test.ts
describe('POST /api/email/webhooks/ses-notifications', () => {
  it('should process bounce notification', async () => {
    const response = await request(app)
      .post('/api/email/webhooks/ses-notifications')
      .set('x-amz-sns-message-type', 'Notification')
      .send({
        Type: 'Notification',
        Message: JSON.stringify({
          notificationType: 'Bounce',
          bounce: {
            bounceType: 'Permanent',
            bouncedRecipients: [{ emailAddress: 'bounce@example.com' }],
            timestamp: new Date().toISOString()
          },
          mail: {
            messageId: 'test-id',
            source: 'noreply@example.com',
            destination: ['bounce@example.com']
          }
        })
      });

    expect(response.status).toBe(200);

    // Verify suppression was added
    const canSend = await complianceService.canSendEmail('bounce@example.com');
    expect(canSend.canSend).toBe(false);
  });
});
```

### Manual Testing

**Test Bounce Processing:**
```bash
curl -X POST http://localhost:3000/api/email/webhooks/bounce \
  -H "Content-Type: application/json" \
  -d @test-data/bounce-notification.json

# Verify in database
psql $DATABASE_URL -c "SELECT * FROM email_suppressions WHERE email_address = 'test@example.com';"
```

**Test Unsubscribe Flow:**
```bash
# 1. Generate token (in Node REPL)
node
> const crypto = require('crypto');
> const generateToken = (email, category) => {
    const payload = JSON.stringify({ email, category, exp: Date.now() + 90*24*60*60*1000 });
    const sig = crypto.createHmac('sha256', 'change-me-in-production').update(payload).digest('base64url');
    return Buffer.from(payload).toString('base64url') + '.' + sig;
  };
> const token = generateToken('test@example.com', 'marketing');
> console.log(token);

# 2. Test GET (confirmation page)
curl http://localhost:3000/api/email/unsubscribe/TOKEN_HERE

# 3. Test POST (process unsubscribe)
curl -X POST http://localhost:3000/api/email/unsubscribe/TOKEN_HERE

# 4. Verify in database
psql $DATABASE_URL -c "SELECT * FROM email_unsubscribe_preferences WHERE email_address = 'test@example.com';"
```

## Monitoring and Alerts

### Key Metrics to Track

1. **Bounce Rate:**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE reason = 'bounce_hard') as hard_bounces,
     COUNT(*) FILTER (WHERE reason = 'bounce_soft' AND is_active = true) as soft_bounces_suppressed,
     COUNT(*) as total_suppressions
   FROM email_suppressions
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Complaint Rate:**
   ```sql
   SELECT COUNT(*) as complaints_last_24h
   FROM email_suppressions
   WHERE reason = 'complaint'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Unsubscribe Rate:**
   ```sql
   SELECT
     category,
     COUNT(*) as unsubscribes_last_24h
   FROM email_unsubscribe_preferences
   WHERE is_unsubscribed = true
     AND unsubscribed_at > NOW() - INTERVAL '24 hours'
   GROUP BY category;
   ```

### Recommended Alerts

- **High bounce rate:** > 5% of sent emails in 24h
- **High complaint rate:** > 0.1% of sent emails in 24h
- **Webhook failures:** SNS delivery failures in CloudWatch

## Troubleshooting

### Common Issues

**Issue: Emails not being suppressed after bounce**
- Check: Is the webhook endpoint receiving notifications?
  ```bash
  tail -f logs/app.log | grep "Received SNS notification"
  ```
- Check: Is the email address normalized correctly? (lowercase, trimmed)
- Check: View `email_compliance_events` table for raw events

**Issue: Unsubscribe link shows "Invalid token"**
- Check: Is `UNSUBSCRIBE_SECRET` the same on all servers?
- Check: Has the token expired? (90 day limit)
- Check: Was the token URL-encoded correctly?

**Issue: SNS subscription not confirming**
- Check: Is the webhook endpoint publicly accessible?
- Check: Are there any errors in the webhook logs?
- Check: CloudWatch Logs for SNS delivery failures

**Issue: Soft bounces not counting correctly**
- Check: `email_suppressions` table for `bounce_count` field
- Check: Are bounces for the same email address being processed?

### Debug Queries

```sql
-- View all suppressions for an email
SELECT * FROM email_suppressions
WHERE email_address = 'user@example.com';

-- View compliance event history
SELECT * FROM email_compliance_events
WHERE email_address = 'user@example.com'
ORDER BY occurred_at DESC;

-- View unsubscribe preferences
SELECT * FROM email_unsubscribe_preferences
WHERE email_address = 'user@example.com';

-- Count emails sent vs blocked
SELECT
  status,
  COUNT(*) as count
FROM email_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## Future Enhancements

- [ ] **SNS Signature Validation:** Implement full signature verification using `aws-sns-message-validator` package
- [ ] **Preference Center UI:** Build frontend for users to manage all email preferences
- [ ] **Resubscribe Workflow:** Allow users to resubscribe via preference center
- [ ] **Email Engagement Tracking:** Track opens/clicks to identify inactive subscribers
- [ ] **Automated List Cleaning:** Periodic removal of old soft bounce records
- [ ] **Admin Dashboard:** View suppression lists, metrics, and manage manual suppressions
- [ ] **Rate Limiting:** Protect webhook endpoints from abuse
- [ ] **DKIM/SPF Validation:** Implement domain verification helpers (placeholders exist)
- [ ] **Suppression Import/Export:** Bulk operations for suppression list management
- [ ] **Webhook Retry Logic:** Handle transient failures with exponential backoff

## References

- [AWS SES Bounce and Complaint Notifications](https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html)
- [RFC 8058: List-Unsubscribe](https://datatracker.ietf.org/doc/html/rfc8058)
- [CAN-SPAM Act Compliance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [AWS SNS Message Signature Verification](https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html)
