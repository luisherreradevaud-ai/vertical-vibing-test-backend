# Email System Documentation

**Production-Ready Transactional Email System for SaaS Applications**

A comprehensive, self-administrable email framework built on AWS SES + SQS with React Email templates, database-backed configuration, and flexible worker deployment.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Sending Emails](#sending-emails)
- [Email Templates](#email-templates)
- [Worker Deployment](#worker-deployment)
- [Admin API](#admin-api)
- [IAM Permissions](#iam-permissions)
- [Troubleshooting](#troubleshooting)
- [Production Checklist](#production-checklist)

---

## Overview

### Features

✅ **React Email Templates** - Beautiful, responsive emails with JSX
✅ **Hybrid Template System** - Code defaults + database customs
✅ **3-Tier Configuration** - Database > Environment > Framework defaults
✅ **Queue-Based Processing** - Async email sending with SQS
✅ **3 Worker Patterns** - Standalone, embedded, or Lambda
✅ **Admin REST API** - 30 endpoints for complete self-service management
✅ **IAM Integration** - Permission-based access control
✅ **Template Versioning** - Git-like version control with rollback
✅ **Comprehensive Logging** - Full email audit trail
✅ **Retry Logic** - Exponential backoff for failed emails
✅ **Bounce Management** - Automatic bounce list tracking
✅ **Rate Limiting** - Per-second and per-day limits

### Tech Stack

- **Email Rendering**: React Email + `@react-email/components`
- **Queue**: AWS SQS
- **Email Provider**: AWS SES
- **Database**: PostgreSQL (via Drizzle ORM)
- **Validation**: Zod schemas
- **Backend**: Express.js + TypeScript

---

## Architecture

```
┌─────────────┐
│  Your App   │
│  (Express)  │
└──────┬──────┘
       │
       ├─> Email Service ──┬─> AWS SES (send directly)
       │                   │
       │                   └─> AWS SQS Queue
       │                              │
       │                              v
       │                   ┌──────────────────┐
       │                   │  Email Worker    │
       │                   │  (3 patterns)    │
       │                   └────────┬─────────┘
       │                            │
       │                            └─> AWS SES
       │
       ├─> Template Service
       │      ├─> Database (custom templates)
       │      └─> Code (system templates)
       │
       └─> Config Service
              ├─> Database (highest priority)
              ├─> Environment variables
              └─> Framework defaults
```

### Database Schema

**5 Core Tables:**
1. `email_templates` - System + custom templates
2. `email_template_versions` - Version history
3. `email_logs` - Comprehensive email tracking
4. `email_bounces` - Bounce list management
5. `system_config` - Runtime configuration

---

## Quick Start

### 1. Install Dependencies

```bash
cd repos/backend
npm install @react-email/components @react-email/render
npm install @aws-sdk/client-ses @aws-sdk/client-sqs
```

### 2. Set Environment Variables

```bash
# .env
EMAIL_SYSTEM_ENABLED=true
EMAIL_SANDBOX_MODE=true
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Your App"
EMAIL_QUEUE_ENABLED=true

# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456/email-queue
```

### 3. Run Database Migrations

```bash
npm run db:generate  # Generate migration
npm run db:migrate   # Apply migration
```

### 4. Start the Server

The email system is already integrated into the main Express app. Just start your server:

```bash
npm run dev
```

The embedded worker will auto-start if `WORKER_ENABLED=true`.

### 5. Send Your First Email

```typescript
import { EmailService } from './features/email/email.service';

const emailService = new EmailService();

await emailService.sendEmail({
  templateName: 'welcome',
  toAddress: 'user@example.com',
  templateData: {
    userName: 'John Doe',
    companyName: 'Acme Corp',
    loginUrl: 'https://app.example.com/login',
  },
});
```

---

## Configuration

### Configuration Hierarchy

The system uses a **3-tier precedence** for all configuration:

1. **Database** (highest priority) - Admin-configurable via API
2. **Environment Variables** - Deployment-specific
3. **Framework Defaults** (fallback) - Built-in sensible defaults

### Core Configuration Keys

#### Email System

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `EMAIL_SYSTEM_ENABLED` | boolean | `true` | Master switch for email system |
| `EMAIL_SANDBOX_MODE` | boolean | `true` | Enable sandbox mode (limits recipients) |
| `EMAIL_FROM_ADDRESS` | string | `noreply@example.com` | Default sender email |
| `EMAIL_FROM_NAME` | string | `Vertical Vibing` | Default sender name |
| `EMAIL_REPLY_TO` | string | - | Reply-to address |

#### Queue Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `EMAIL_QUEUE_ENABLED` | boolean | `true` | Use queue for async processing |
| `EMAIL_QUEUE_NAME` | string | `email-queue` | SQS queue name |
| `EMAIL_QUEUE_URL` | string | - | Full SQS queue URL |
| `EMAIL_MAX_RETRIES` | number | `3` | Max retry attempts for failed emails |

#### Worker Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `WORKER_ENABLED` | boolean | `false` | Enable embedded worker |
| `WORKER_CONCURRENCY` | number | `5` | Concurrent message processing |
| `WORKER_POLL_INTERVAL_MS` | number | `1000` | Polling interval (ms) |

#### Rate Limiting

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `EMAIL_RATE_LIMIT_PER_SECOND` | number | `14` | Max emails per second |
| `EMAIL_RATE_LIMIT_PER_DAY` | number | `50000` | Max emails per day |

### Managing Configuration

#### Via Admin API

```bash
# List all configuration
curl http://localhost:3000/api/email/config \
  -H "Authorization: Bearer $TOKEN"

# Update configuration
curl -X PUT http://localhost:3000/api/email/config/EMAIL_FROM_ADDRESS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "hello@yourdomain.com"}'

# Initialize default configuration in database
curl -X POST http://localhost:3000/api/email/config/initialize \
  -H "Authorization: Bearer $TOKEN"
```

#### Via Environment Variables

```bash
# .env
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_RATE_LIMIT_PER_SECOND=20
```

#### Programmatically

```typescript
import { ConfigService } from './features/email/config.service';

const configService = new ConfigService();

// Get configuration (respects hierarchy)
const fromAddress = await configService.get('EMAIL_FROM_ADDRESS');

// Set configuration in database
await configService.set('EMAIL_FROM_ADDRESS', 'noreply@yourdomain.com');

// Get typed values
const isEnabled = await configService.getBoolean('EMAIL_SYSTEM_ENABLED');
const rateLimit = await configService.getNumber('EMAIL_RATE_LIMIT_PER_SECOND');
```

---

## Sending Emails

### Programmatic Usage

#### Send Single Email

```typescript
import { EmailService } from './features/email/email.service';

const emailService = new EmailService();

const emailLogId = await emailService.sendEmail({
  templateName: 'welcome',
  toAddress: 'user@example.com',
  templateData: {
    userName: 'John Doe',
    companyName: 'Acme Corp',
    loginUrl: 'https://app.example.com/login',
  },
  priority: 'high', // 'low' | 'normal' | 'high'
  metadata: {
    userId: 'user-123',
    trigger: 'signup',
  },
});

console.log(`Email queued with ID: ${emailLogId}`);
```

#### Send Bulk Emails

```typescript
const emailLogIds = await Promise.all(
  users.map(user =>
    emailService.sendEmail({
      templateName: 'newsletter',
      toAddress: user.email,
      templateData: {
        userName: user.name,
        content: newsletterContent,
      },
    })
  )
);
```

### Via REST API

#### Send Email Endpoint

```bash
POST /api/email/send
Content-Type: application/json
Authorization: Bearer {token}

{
  "templateName": "welcome",
  "toAddress": "user@example.com",
  "templateData": {
    "userName": "John Doe",
    "companyName": "Acme Corp",
    "loginUrl": "https://app.example.com/login"
  },
  "priority": "normal",
  "metadata": {
    "userId": "user-123"
  }
}
```

**Response:**

```json
{
  "success": true,
  "emailLogId": "uuid-here",
  "message": "Email queued for delivery"
}
```

#### Bulk Send Endpoint

```bash
POST /api/email/send/bulk
Content-Type: application/json
Authorization: Bearer {token}

{
  "templateName": "welcome",
  "recipients": [
    {
      "toAddress": "user1@example.com",
      "templateData": { "userName": "John" }
    },
    {
      "toAddress": "user2@example.com",
      "templateData": { "userName": "Jane" }
    }
  ],
  "priority": "normal"
}
```

---

## Email Templates

### System Templates

Six production-ready templates included:

1. **welcome** - New user welcome email
2. **password-reset** - Password reset request
3. **email-verification** - Email address verification
4. **team-invitation** - Team invitation (IAM)
5. **user-level-assignment** - User level changes (IAM)
6. **permission-changes** - Permission updates (IAM)

### Template Structure

Templates are React components using `@react-email/components`:

```typescript
// src/features/email/templates/welcome.tsx
import {
  Html, Head, Preview, Body, Container,
  Text, Button, Hr, Section
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  companyName?: string;
  loginUrl: string;
}

export const WelcomeEmail = ({
  userName,
  companyName = 'Vertical Vibing',
  loginUrl,
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {companyName} - Let's get started!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Welcome to {companyName}!</Text>
          <Text style={paragraph}>Hi {userName},</Text>
          <Text style={paragraph}>
            Your account has been created. Click below to access your dashboard:
          </Text>
          <Button href={loginUrl} style={button}>
            Access Dashboard
          </Button>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

// Styles
const main = { backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' };
const container = { margin: '0 auto', padding: '20px', maxWidth: '600px' };
// ... more styles
```

### Creating Custom Templates

#### Via Admin API

```bash
# Create custom template
POST /api/email/templates
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "custom-welcome",
  "displayName": "Custom Welcome Email",
  "subject": "Welcome to {{companyName}}!",
  "contentType": "react-email",
  "content": "<Html>...</Html>",
  "variables": [
    {
      "name": "userName",
      "type": "string",
      "required": true,
      "description": "Recipient's name"
    }
  ],
  "category": "onboarding"
}
```

#### Clone System Template

```bash
POST /api/email/templates/{templateId}/clone
Content-Type: application/json
Authorization: Bearer {token}

{
  "newName": "custom-welcome",
  "newDisplayName": "Custom Welcome"
}
```

### Template Management

```bash
# List templates
GET /api/email/templates?status=published&category=onboarding

# Get template
GET /api/email/templates/{id}

# Update template
PUT /api/email/templates/{id}
{ "subject": "Updated subject", "content": "..." }

# Publish template
POST /api/email/templates/{id}/publish

# Archive template
POST /api/email/templates/{id}/archive

# Preview template
POST /api/email/templates/preview
{
  "templateName": "welcome",
  "templateData": { "userName": "Test User" }
}
```

### Template Versioning

Every template update creates a new version with automatic rollback support:

```bash
# Get all versions
GET /api/email/templates/{id}/versions

# Rollback to previous version
POST /api/email/templates/{id}/rollback
{ "targetVersion": 3 }
```

---

## Worker Deployment

The email system supports **3 worker deployment patterns**. Choose based on your infrastructure:

### 1. Embedded Worker (Simplest)

**Best for**: Development, small-scale apps, simple deployments

The worker runs inside your main Express process.

**Enable:**

```bash
# .env
WORKER_ENABLED=true
WORKER_CONCURRENCY=5
```

**How it works**: Already integrated in `src/index.ts`. Worker auto-starts with your app.

**Pros**:
- Zero additional infrastructure
- Simple deployment
- Good for development

**Cons**:
- Worker stops when app restarts
- Limited scalability
- Shared resources with web server

---

### 2. Standalone Worker (Recommended for Production)

**Best for**: Production deployments, high-volume applications

The worker runs as a separate process/service.

**Start the worker:**

```bash
# Set environment variables
export WORKER_ENABLED=true
export WORKER_CONCURRENCY=10
export EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123/email-queue
export AWS_REGION=us-east-1

# Start standalone worker
npm run worker:start
```

**Deploy as systemd service:**

```ini
# /etc/systemd/system/email-worker.service
[Unit]
Description=Email Worker Service
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/app/backend
EnvironmentFile=/app/backend/.env
ExecStart=/usr/bin/node dist/features/email/queue/standalone-worker.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Deploy with Docker:**

```dockerfile
# Dockerfile.worker
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "dist/features/email/queue/standalone-worker.js"]
```

```yaml
# docker-compose.yml
services:
  email-worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      - WORKER_ENABLED=true
      - WORKER_CONCURRENCY=10
      - EMAIL_QUEUE_URL=${EMAIL_QUEUE_URL}
    restart: always
    deploy:
      replicas: 3  # Scale horizontally
```

**Pros**:
- Independent scaling
- Fault isolation
- Easy horizontal scaling
- Production-ready

**Cons**:
- Additional deployment complexity
- Requires process management

---

### 3. AWS Lambda (Serverless)

**Best for**: Auto-scaling, cost optimization, serverless architectures

The worker runs as an AWS Lambda function triggered by SQS.

**Deploy with AWS SAM:**

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  EmailQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: email-queue
      VisibilityTimeout: 60
      MessageRetentionPeriod: 1209600  # 14 days

  EmailWorkerFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs20.x
      Handler: dist/features/email/queue/lambda-handler.handler
      MemorySize: 512
      Timeout: 30
      Environment:
        Variables:
          EMAIL_SYSTEM_ENABLED: true
          AWS_REGION: us-east-1
      Events:
        SQSTrigger:
          Type: SQS
          Properties:
            Queue: !GetAtt EmailQueue.Arn
            BatchSize: 10
            MaximumBatchingWindowInSeconds: 5
      Policies:
        - SQSSendMessagePolicy:
            QueueName: !GetAtt EmailQueue.QueueName
        - SESCrudPolicy:
            IdentityName: "*"
```

**Deploy:**

```bash
sam build
sam deploy --guided
```

**With Serverless Framework:**

```yaml
# serverless.yml
service: email-worker

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    EMAIL_SYSTEM_ENABLED: true
  iamRoleStatements:
    - Effect: Allow
      Action:
        - ses:SendEmail
        - ses:SendRawEmail
      Resource: "*"
    - Effect: Allow
      Action:
        - sqs:ReceiveMessage
        - sqs:DeleteMessage
      Resource: !GetAtt EmailQueue.Arn

functions:
  emailWorker:
    handler: dist/features/email/queue/lambda-handler.handler
    timeout: 30
    memorySize: 512
    events:
      - sqs:
          arn: !GetAtt EmailQueue.Arn
          batchSize: 10

resources:
  Resources:
    EmailQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: email-queue
```

**Pros**:
- Auto-scaling
- Pay per use
- Zero infrastructure management
- Built-in fault tolerance

**Cons**:
- Cold start latency
- AWS Lambda limits
- More complex debugging

---

## Admin API

### Complete API Reference

30 REST endpoints for full email system management.

#### Email Sending (2 endpoints)

```bash
# Send single email
POST /api/email/send

# Send bulk emails
POST /api/email/send/bulk

# Health check
GET /api/email/health
```

#### Template Management (10 endpoints)

```bash
# List templates
GET /api/email/templates
  ?status=published
  &category=onboarding
  &search=welcome
  &page=1
  &limit=20

# Get template
GET /api/email/templates/:id

# Create template
POST /api/email/templates

# Update template
PUT /api/email/templates/:id

# Publish template
POST /api/email/templates/:id/publish

# Archive template
POST /api/email/templates/:id/archive

# Clone template
POST /api/email/templates/:id/clone

# Get template versions
GET /api/email/templates/:id/versions

# Rollback template
POST /api/email/templates/:id/rollback

# Preview template
POST /api/email/templates/preview
```

#### Email Logs (5 endpoints)

```bash
# List email logs
GET /api/email/logs
  ?status=failed
  &templateName=welcome
  &startDate=2024-01-01
  &endDate=2024-12-31
  &page=1
  &limit=20

# Get log details
GET /api/email/logs/:id

# Retry failed email
POST /api/email/logs/:id/retry

# Get email statistics
GET /api/email/stats
  ?startDate=2024-01-01
  &endDate=2024-12-31
  &groupBy=day

# Delete log (admin only)
DELETE /api/email/logs/:id
```

#### Configuration (7 endpoints)

```bash
# List all configuration
GET /api/email/config
  ?category=email
  &search=RATE
  &showSensitive=false

# Get specific config
GET /api/email/config/:key

# Create configuration
POST /api/email/config

# Update configuration
PUT /api/email/config/:key

# Delete configuration
DELETE /api/email/config/:key

# Initialize defaults (super admin only)
POST /api/email/config/initialize

# Get categories
GET /api/email/config/meta/categories
```

---

## IAM Permissions

### Permission Hierarchy

The email system uses **12 granular permissions**:

| Permission | Description | Required For |
|------------|-------------|--------------|
| `email:send` | Send individual emails | Basic email sending |
| `email:send:bulk` | Send bulk emails | Mass email campaigns |
| `email:templates:read` | View templates | Template browsing, preview |
| `email:templates:write` | Create/edit templates | Template management |
| `email:templates:publish` | Publish templates | Making templates live |
| `email:templates:delete` | Archive templates | Template cleanup |
| `email:logs:read` | View email logs | Monitoring, debugging |
| `email:logs:retry` | Retry failed emails | Error recovery |
| `email:logs:delete` | Delete logs | Log cleanup (admin) |
| `email:config:read` | View configuration | System inspection |
| `email:config:write` | Modify configuration | System administration |
| `email:config:delete` | Delete configuration | Advanced administration |

### Permission Groups

Pre-defined groups for common roles:

```typescript
// USER - Basic email sending
['email:send']

// OPERATOR - Sending + monitoring
['email:send', 'email:send:bulk', 'email:logs:read', 'email:templates:read']

// ADMIN - Full template and log management
['email:send', 'email:send:bulk', 'email:templates:*', 'email:logs:*']

// SUPER_ADMIN - Full system access
['email:*']
```

### Integrating Permissions

#### Check Permissions in Routes

Permissions are automatically checked via middleware:

```typescript
// Already applied to all routes
router.post('/send', authenticate, emailPermissions.send(), handler);
router.get('/templates', authenticate, emailPermissions.readTemplates(), handler);
```

#### Check Permissions Programmatically

```typescript
import { checkEmailPermission } from './features/email/email-permission.middleware';

// In route handler
const { allowed, reason } = await checkEmailPermission(req, 'email:send');
if (!allowed) {
  return res.status(403).json({ error: reason });
}
```

#### Super Admin Bypass

Super admins automatically have full access to all email endpoints:

```typescript
// Automatically handled by middleware
if (req.user.isSuperAdmin) {
  // Full access granted
}
```

---

## Troubleshooting

### Email Not Sending

**Symptom**: Emails are not being delivered

**Check:**

1. **System enabled?**
   ```bash
   curl http://localhost:3000/api/email/health
   ```

2. **Worker running?**
   ```bash
   # If using standalone worker
   ps aux | grep email-worker

   # Check worker logs
   tail -f /var/log/email-worker.log
   ```

3. **Queue accessible?**
   ```bash
   aws sqs get-queue-attributes \
     --queue-url $EMAIL_QUEUE_URL \
     --attribute-names ApproximateNumberOfMessages
   ```

4. **SES sandbox mode?**
   - In sandbox, only verified email addresses can receive emails
   - Verify recipients in AWS SES console
   - Request production access

5. **Check email logs:**
   ```bash
   GET /api/email/logs?status=failed&limit=10
   ```

### Rate Limit Exceeded

**Symptom**: `Rate limit exceeded` error

**Solutions:**

1. **Increase limits** (if your SES supports it):
   ```bash
   curl -X PUT http://localhost:3000/api/email/config/EMAIL_RATE_LIMIT_PER_SECOND \
     -d '{"value": "50"}'
   ```

2. **Check current limits:**
   ```bash
   aws ses get-send-quota
   ```

3. **Request limit increase** from AWS Support

### Template Not Found

**Symptom**: `Email template not found` error

**Check:**

1. **Template exists in code?**
   ```bash
   ls src/features/email/templates/
   ```

2. **Template registered?**
   ```typescript
   // Check templates/index.ts
   export { WelcomeEmail } from './welcome';
   ```

3. **Database template published?**
   ```bash
   GET /api/email/templates?status=published
   ```

### Worker Crashes

**Symptom**: Worker process exits unexpectedly

**Debug:**

1. **Check logs:**
   ```bash
   tail -f /var/log/email-worker.log
   ```

2. **Check environment variables:**
   ```bash
   env | grep EMAIL
   env | grep WORKER
   env | grep AWS
   ```

3. **Test AWS credentials:**
   ```bash
   aws sts get-caller-identity
   ```

4. **Check queue permissions:**
   ```bash
   aws sqs get-queue-attributes \
     --queue-url $EMAIL_QUEUE_URL \
     --attribute-names Policy
   ```

### Database Connection Issues

**Symptom**: `Failed to connect to database` error

**Solutions:**

1. **Check DATABASE_URL:**
   ```bash
   echo $DATABASE_URL
   ```

2. **Test connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

---

## Production Checklist

### Before Going Live

- [ ] **AWS SES Production Access** - Request from AWS Support
- [ ] **Domain Verification** - Verify sending domain in SES
- [ ] **DKIM/SPF/DMARC** - Configure DNS records for deliverability
- [ ] **Environment Variables** - All production values set
- [ ] **Database Migrations** - Applied to production database
- [ ] **Worker Deployment** - Choose and deploy worker pattern
- [ ] **SQS Queue** - Created with appropriate settings
- [ ] **IAM Permissions** - Configured for all user roles
- [ ] **Rate Limits** - Set appropriate for your SES limits
- [ ] **Monitoring** - Set up alerts for failed emails
- [ ] **Error Handling** - Test retry logic and error scenarios
- [ ] **Template Testing** - Test all templates with real data
- [ ] **Bounce Handling** - Configure SNS notifications (optional)
- [ ] **Load Testing** - Test with expected email volume

### AWS SES Setup

1. **Verify Domain:**
   ```bash
   aws ses verify-domain-identity --domain yourdomain.com
   ```

2. **Configure DNS Records** (provided by AWS after verification)

3. **Request Production Access** (if sending to unverified emails)

4. **Set up DKIM** (recommended):
   ```bash
   aws ses verify-domain-dkim --domain yourdomain.com
   ```

### Security Best Practices

1. **Rotate AWS credentials** regularly
2. **Use IAM roles** instead of access keys (when possible)
3. **Enable SES sending authorization** for shared accounts
4. **Implement rate limiting** at application level
5. **Validate all email addresses** before sending
6. **Sanitize template data** to prevent injection
7. **Use HTTPS** for all Admin API calls
8. **Enable audit logging** for sensitive operations
9. **Restrict Admin API access** to authorized IPs (firewall)
10. **Regular backup** of email templates and configuration

### Monitoring & Alerts

Set up monitoring for:

- **Failed email rate** - Alert if > 5%
- **Queue depth** - Alert if > 1000 messages
- **Worker health** - Alert if worker stops
- **Bounce rate** - Alert if > 2%
- **SES reputation** - Monitor bounce/complaint rates
- **API error rate** - Alert if > 1%

---

## Support

### Documentation

- **FEATURE.md** - Quick reference in `src/features/email/FEATURE.md`
- **API Schemas** - TypeScript types in `shared-types/src/api/email.types.ts`
- **Code Comments** - Inline documentation in all source files

### Common Resources

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [React Email Documentation](https://react.email/)
- [AWS SQS Best Practices](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)

---

**Built with ❤️ for SaaS Applications**

Version: 1.0.0
Last Updated: 2025-01-20
