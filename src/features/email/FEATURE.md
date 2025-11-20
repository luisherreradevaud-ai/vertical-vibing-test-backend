# Email System Feature

Production-ready, self-administrable transactional email system built on AWS SES + SQS.

## Overview

Complete email framework for SaaS applications with:
- React Email templates (code + database)
- Configuration management (DB > Env > Default precedence)
- Queue-based async processing with 3 worker deployment patterns
- Admin API for full self-service management
- IAM integration for permission-based access
- Comprehensive logging and retry logic

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│   API/App   │────>│ Email Service│────>│ AWS SES │
└─────────────┘     └──────────────┘     └─────────┘
                           │
                           ├─> Template Service (DB → Code)
                           ├─> Config Service (DB > Env > Default)
                           └─> SQS Queue
                                  │
                                  v
                    ┌──────────────────────────┐
                    │   Worker (3 patterns)    │
                    ├──────────────────────────┤
                    │ 1. Standalone Process    │
                    │ 2. Embedded in Main App  │
                    │ 3. AWS Lambda Function   │
                    └──────────────────────────┘
```

## Database Tables

- `email_templates` - System + custom templates with versioning
- `email_template_versions` - Version history for rollback
- `system_config` - Self-administrable configuration
- `email_logs` - Comprehensive email tracking
- `email_bounces` - Bounce list management

## API Endpoints

### Email Sending
```
POST   /api/email/send           - Send single email
POST   /api/email/send/bulk      - Send bulk emails
GET    /api/email/health         - Health check
```

### Template Management
```
GET    /api/email/templates               - List all templates
GET    /api/email/templates/:id           - Get template by ID
POST   /api/email/templates               - Create template
PUT    /api/email/templates/:id           - Update template
POST   /api/email/templates/:id/publish   - Publish template
POST   /api/email/templates/:id/archive   - Archive template
POST   /api/email/templates/:id/clone     - Clone template
GET    /api/email/templates/:id/versions  - Get versions
POST   /api/email/templates/:id/rollback  - Rollback version
POST   /api/email/templates/preview       - Preview template
```

### Email Logs
```
GET    /api/email/logs            - List email logs
GET    /api/email/logs/:id        - Get log by ID
POST   /api/email/logs/:id/retry  - Retry failed email
GET    /api/email/stats           - Get statistics
DELETE /api/email/logs/:id        - Delete log (admin)
```

### Configuration
```
GET    /api/email/config            - List all configuration
GET    /api/email/config/:key       - Get specific config
POST   /api/email/config            - Create configuration
PUT    /api/email/config/:key       - Update configuration
DELETE /api/email/config/:key       - Delete configuration
POST   /api/email/config/initialize - Initialize defaults
GET    /api/email/config/meta/categories - Get categories
```

## Code Structure

```
email/
├── FEATURE.md                     # This file
├── email.route.ts                 # Main router + send endpoints
├── email-templates.route.ts       # Template management API
├── email-logs.route.ts            # Email log API
├── email-config.route.ts          # Configuration API
├── email.service.ts               # Core email service
├── template.service.ts            # Template rendering service
├── config.service.ts              # Configuration service
├── email.permissions.ts           # IAM permission definitions
├── templates/                     # React Email templates
│   ├── welcome.tsx
│   ├── password-reset.tsx
│   ├── email-verification.tsx
│   ├── team-invitation.tsx
│   ├── user-level-assignment.tsx
│   ├── permission-changes.tsx
│   └── index.ts
└── queue/                         # Queue processing
    ├── sqs-queue.service.ts       # SQS operations
    ├── email-worker.ts            # Base worker class
    ├── standalone-worker.ts       # Standalone process
    ├── embedded-worker.ts         # Embedded in app
    ├── lambda-handler.ts          # Lambda function
    └── index.ts
```

## Usage Examples

### Send Email Programmatically

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

### Send Email via API

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "welcome",
    "toAddress": "user@example.com",
    "templateData": {
      "userName": "John Doe",
      "companyName": "Acme Corp",
      "loginUrl": "https://app.example.com/login"
    }
  }'
```

### Run Worker (Standalone)

```bash
# Set environment variables
export WORKER_ENABLED=true
export WORKER_CONCURRENCY=5
export EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123/email-queue
export AWS_REGION=us-east-1

# Start worker
npm run worker:start
```

### Run Worker (Embedded)

```typescript
// In src/index.ts
import { embeddedEmailWorker } from './features/email/queue';

// After Express server starts
await embeddedEmailWorker.start();

// In shutdown handler
await embeddedEmailWorker.stop();
```

### Deploy Worker (Lambda)

```yaml
# serverless.yml or SAM template
EmailWorker:
  Type: AWS::Serverless::Function
  Properties:
    Runtime: nodejs20.x
    Handler: src/features/email/queue/lambda-handler.handler
    MemorySize: 512
    Timeout: 30
    Events:
      SQSTrigger:
        Type: SQS
        Properties:
          Queue: !GetAtt EmailQueue.Arn
          BatchSize: 10
```

## Configuration

### Environment Variables

```bash
# Email System
EMAIL_SYSTEM_ENABLED=true
EMAIL_SANDBOX_MODE=true
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME="Your App"
EMAIL_REPLY_TO=support@example.com
EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_NAME=email-queue
EMAIL_MAX_RETRIES=3

# AWS
AWS_REGION=us-east-1
EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123/email-queue

# Worker
WORKER_ENABLED=true
WORKER_CONCURRENCY=5
WORKER_POLL_INTERVAL_MS=1000
```

### Database Configuration

All configuration can be managed via Admin API or database:

```bash
# Initialize default configuration
curl -X POST http://localhost:3000/api/email/config/initialize \
  -H "Authorization: Bearer $TOKEN"

# Update configuration
curl -X PUT http://localhost:3000/api/email/config/EMAIL_FROM_ADDRESS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "noreply@yourdomain.com"}'
```

## IAM Permissions

Required permissions for email system access:

- `email:send` - Send individual emails
- `email:send:bulk` - Send bulk emails
- `email:templates:read` - View templates
- `email:templates:write` - Create/edit templates
- `email:templates:publish` - Publish templates
- `email:templates:delete` - Delete templates
- `email:logs:read` - View email logs
- `email:logs:retry` - Retry failed emails
- `email:config:read` - View configuration
- `email:config:write` - Modify configuration

See `email.permissions.ts` for complete list and permission groups.

## Templates

### System Templates (Code-based)

1. **welcome** - New user welcome email
2. **password-reset** - Password reset request
3. **email-verification** - Email address verification
4. **team-invitation** - Team invitation (IAM)
5. **user-level-assignment** - User level changes (IAM)
6. **permission-changes** - Permission updates (IAM)

### Custom Templates (Database)

Admin can create custom templates via API:
- Clone system templates
- Create from scratch
- Edit via admin UI (Phase 6)
- Version control with rollback

## Features

✅ **Send Emails** - Direct or queued, with full error handling
✅ **Template System** - Hybrid (code defaults + DB customs)
✅ **Configuration** - 3-tier precedence (DB > Env > Default)
✅ **Queue Workers** - 3 deployment patterns
✅ **Admin API** - Full REST API for management
✅ **Logging** - Comprehensive email tracking
✅ **Retry Logic** - Exponential backoff
✅ **Bounce Management** - Automatic bounce list
✅ **Rate Limiting** - Per second & per day
✅ **IAM Integration** - Permission-based access
✅ **Versioning** - Template version control with rollback
✅ **Preview** - Test templates before sending
✅ **Statistics** - Email analytics

## Dependencies

- `react-email` - Email template rendering
- `@react-email/components` - React Email components
- `@react-email/render` - Render React to HTML
- `@aws-sdk/client-ses` - AWS SES integration
- `@aws-sdk/client-sqs` - AWS SQS integration
- `@types/aws-lambda` - Lambda types (dev)

## IAM Integration (Phase 9)

The email system is fully integrated with the IAM (Identity and Access Management) system for permission-based authorization.

### IAM Features

Four email features registered in IAM database:
- **feature_email_send** - Email Sending (Send, SendBulk actions)
- **feature_email_templates** - Email Templates (Create, Read, Update, Delete, Publish, Archive, Clone)
- **feature_email_logs** - Email Logs (Read, Retry, Delete actions)
- **feature_email_config** - Email Configuration (Read, Update, Delete actions)

### Permission Resolution

Email endpoints use `PermissionsService.canPerformAction()` for authorization:

```typescript
// Permission check via IAM
const hasPermission = await permissionsService.canPerformAction(
  userId,
  'feature_email_send',  // Feature key
  'Send',                 // Action
  companyId              // Tenant context
);
```

### Seeding Email Features

Initialize email features in IAM database:

```typescript
import { seedEmailFeatures } from './features/email/seed-email-features';

// Seed features (idempotent)
await seedEmailFeatures();
```

Or via command line:
```bash
npx tsx src/features/email/seed-email-features.ts seed
```

### Permission Mapping

Old permission format automatically maps to IAM features:

| Old Permission | IAM Feature | Action |
|---------------|-------------|---------|
| `email:send` | `feature_email_send` | Send |
| `email:send:bulk` | `feature_email_send` | SendBulk |
| `email:templates:read` | `feature_email_templates` | Read |
| `email:templates:write` | `feature_email_templates` | Create |
| `email:templates:publish` | `feature_email_templates` | Publish |
| `email:logs:read` | `feature_email_logs` | Read |
| `email:logs:retry` | `feature_email_logs` | Retry |
| `email:config:read` | `feature_email_config` | Read |
| `email:config:write` | `feature_email_config` | Update |

### Authorization Flow

1. User makes request to email endpoint
2. `authenticate` middleware validates JWT
3. `emailPermissions.*()` middleware checks IAM permission
4. Permission is mapped to IAM feature + action
5. `PermissionsService` resolves effective permission based on user levels
6. Request proceeds if authorized, otherwise 403 Forbidden

### Super Admin Bypass

Super admins automatically bypass all email permission checks for full system access.

## Admin UI (Phase 6)

The email system includes a complete Next.js-based Admin UI for managing all email operations.

### UI Components

#### Email Dashboard (`/email`)
- Statistics overview (sent, failed, queued, bounced, success rate)
- Recent email activity table
- Quick action links to all management pages
- Protected by `feature_email_logs:Read` permission

#### Templates Manager (`/email/templates`)
- Full CRUD for email templates
- Filter by status, category, and type
- Version control with rollback capability
- Clone, publish, archive, and preview actions
- Template editor with variables support
- Protected by `feature_email_templates:Read` permission

#### Email Logs Viewer (`/email/logs`)
- Browse all email delivery history
- Filter by status, template, recipient
- Retry failed emails
- View detailed log information
- Delete logs (admin only)
- Pagination and sorting
- Protected by `feature_email_logs:Read` permission

#### Settings Manager (`/email/settings`)
- Manage email system configuration
- 3-tier configuration precedence (DB > Env > Default)
- Show effective values and sources
- Create, update, and delete configurations
- Category-based organization
- Protected by `feature_email_config:Read` permission

### Frontend Structure

```
frontend/src/features/email/
├── index.ts                      # Public exports
├── api/
│   └── emailApi.ts               # API client (~650 lines)
├── ui/
│   ├── EmailDashboard.tsx        # Dashboard (~345 lines)
│   ├── EmailTemplatesManager.tsx # Templates UI (~757 lines)
│   ├── EmailLogsViewer.tsx       # Logs UI (~490 lines)
│   └── EmailSettingsManager.tsx  # Settings UI (~665 lines)
└── store/                        # Zustand stores (if needed)
```

### Page Routes

```
app/email/
├── page.tsx                      # Dashboard page
├── templates/page.tsx            # Templates page
├── logs/page.tsx                 # Logs page
└── settings/page.tsx             # Settings page
```

All pages use the `<Gate>` component for IAM-based permission checks with appropriate fallback UI.

### Features

✅ **Complete Admin UI** - Full-featured management interface
✅ **IAM Integration** - Permission-based access control on all pages
✅ **Responsive Design** - Tailwind CSS with mobile support
✅ **Real-time Updates** - Auto-refresh and loading states
✅ **Error Handling** - Comprehensive error messages and retry logic
✅ **Type Safety** - Full TypeScript with shared types
✅ **User Experience** - Modals, filters, pagination, and search

## Next Steps

- [ ] **Phase 7**: Developer tools (preview server, template generator CLI)
- [ ] **Phase 10**: Testing (unit + integration tests)
- [ ] **Phase 11**: Documentation (EMAIL-SYSTEM.md guide)

## Status

**Phase 6 Complete** - Admin UI (Frontend)

- ✅ Database schema
- ✅ Shared types
- ✅ Backend core services
- ✅ Queue system with 3 worker patterns
- ✅ Admin API endpoints
- ✅ Infrastructure (Terraform modules for SES + SQS + Lambda)
- ✅ Compliance system (bounce/complaint handling, unsubscribe management)
- ✅ IAM permission integration (fully integrated with PermissionsService)
- ✅ **Admin UI (Phase 6) - Complete Next.js UI with 4 management pages**
- ⏳ Developer tools (Phase 7)
- ⏳ Testing (Phase 10)
- ⏳ Documentation (Phase 11)

Total: ~10,400 lines of production-ready TypeScript (~7,500 backend + ~2,900 frontend)
