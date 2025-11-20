# Email System - Complete Guide

Production-ready, self-administrable transactional email system built on AWS SES + SQS.

**Version:** 1.0
**Last Updated:** 2025-11-21
**Status:** Production Ready

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Installation & Setup](#installation--setup)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Template Development](#template-development)
8. [Queue & Workers](#queue--workers)
9. [IAM Integration](#iam-integration)
10. [Admin UI](#admin-ui)
11. [Developer Tools](#developer-tools)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Monitoring & Logging](#monitoring--logging)
15. [Troubleshooting](#troubleshooting)
16. [Best Practices](#best-practices)
17. [Examples & Tutorials](#examples--tutorials)
18. [FAQ](#faq)

---

## Introduction

### What is the Email System?

The Email System is a comprehensive, production-ready email infrastructure for SaaS applications that provides:

- **Transactional Emails** - Send emails programmatically via API or service calls
- **Template Management** - Hybrid system with code-based and database-stored templates
- **Queue-Based Processing** - Async email delivery with retry logic
- **Admin Interface** - Self-service management UI for non-developers
- **IAM Integration** - Permission-based access control
- **Developer Tools** - CLI and web tools for rapid development
- **Comprehensive Testing** - 200+ tests with >85% coverage

### Why This System?

**Before:**
- Hard-coded email templates scattered across codebase
- No template versioning or rollback
- Manual configuration changes requiring deployments
- No visibility into email delivery
- No retry logic for failures
- Developers required for template changes

**After:**
- Centralized template management with version control
- Self-service admin UI for template editing
- Database-driven configuration (change without deploy)
- Comprehensive logging and statistics
- Automatic retry with exponential backoff
- Non-developers can manage email system

### Key Features

- **React Email Templates** - Beautiful, responsive emails with React components
- **3-Tier Configuration** - Database > Environment > Default precedence
- **Queue Workers** - 3 deployment patterns (standalone, embedded, Lambda)
- **Admin API** - 26 REST endpoints for complete management
- **IAM Permissions** - 4 feature areas with granular action control
- **Bounce Management** - Automatic suppression list handling
- **Rate Limiting** - Per-second and per-day limits
- **Template Versioning** - Full history with one-click rollback
- **Preview System** - Test templates before sending
- **Statistics** - Email analytics and metrics
- **Compliance** - Unsubscribe management and bounce handling
- **Developer Tools** - 5 CLI/web tools for productivity

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Email System                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Backend    │  │   Frontend   │  │     AWS      │     │
│  │   (Express)  │  │  (Next.js)   │  │  (SES+SQS)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                  │              │
│         │                 │                  │              │
│  ┌──────▼─────────────────▼──────────────────▼──────┐     │
│  │                                                    │     │
│  │  • Email Service (send, queue, retry)            │     │
│  │  • Template Service (render, version)            │     │
│  │  • Config Service (3-tier precedence)            │     │
│  │  • Compliance Service (bounce, unsubscribe)      │     │
│  │  • IAM Integration (permissions)                 │     │
│  │  • Admin API (26 endpoints)                      │     │
│  │  • Queue Workers (3 patterns)                    │     │
│  │                                                    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- Express.js - Web framework
- TypeScript - Type safety
- Drizzle ORM - Database access
- Zod - Validation
- Vitest - Testing
- React Email - Template rendering
- AWS SDK - SES + SQS integration

**Frontend:**
- Next.js 14+ (App Router)
- React 19
- Tailwind CSS 4
- Zustand - State management

**Infrastructure:**
- PostgreSQL - Database
- AWS SES - Email delivery
- AWS SQS - Queue processing
- AWS Lambda - Serverless workers (optional)

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- AWS Account with SES and SQS access
- AWS credentials configured

### 5-Minute Setup

#### 1. Install Dependencies

```bash
cd repos/backend
npm install
```

#### 2. Configure Environment

Create `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/yourdb

# Email System
EMAIL_SYSTEM_ENABLED=true
EMAIL_SANDBOX_MODE=true
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Your App Name"

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Queue (optional for quick start)
EMAIL_QUEUE_ENABLED=false
```

#### 3. Run Database Migrations

```bash
npm run db:migrate
```

#### 4. Seed Email Features (IAM)

```bash
npx tsx src/features/email/seed-email-features.ts seed
```

#### 5. Start Backend

```bash
npm run dev
```

#### 6. Test Email Sending

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "welcome",
    "toAddress": "test@example.com",
    "templateData": {
      "userName": "John Doe",
      "companyName": "Acme Corp",
      "loginUrl": "https://app.example.com"
    }
  }'
```

### Next Steps

- [Configure AWS SES](#aws-ses-setup)
- [Set up Queue Workers](#queue--workers)
- [Explore Admin UI](#admin-ui)
- [Create Custom Templates](#template-development)

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Your App → EmailService.sendEmail() → Email System             │
│                                                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Email System Core                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐    ┌────────────────┐   ┌───────────────┐ │
│  │ Email Service  │───>│ Template Svc   │   │  Config Svc   │ │
│  │                │    │                │   │               │ │
│  │ • Validation   │    │ • Rendering    │   │ • DB > Env >  │ │
│  │ • Rate Limit   │    │ • Versioning   │   │   Default     │ │
│  │ • Retry Logic  │    │ • Variables    │   │ • Categories  │ │
│  └────────┬───────┘    └────────────────┘   └───────────────┘ │
│           │                                                     │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │  Direct Send?   │                                           │
│  └────┬────────┬───┘                                           │
│       │ Yes    │ No                                            │
│       │        │                                               │
│       ▼        ▼                                               │
│   ┌──────┐  ┌──────┐                                          │
│   │ SES  │  │ SQS  │                                          │
│   └──────┘  └───┬──┘                                          │
│                 │                                              │
└─────────────────┼──────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Queue Workers                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │   Standalone     │  │    Embedded      │  │    Lambda    │ │
│  │   Process        │  │   in Main App    │  │   Function   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│           │                     │                     │         │
│           └─────────────────────┴─────────────────────┘         │
│                                 │                                │
│                                 ▼                                │
│                      Process Messages from SQS                  │
│                      Send via SES                               │
│                      Log Results                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Compliance & Logging                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  • Email Logs (delivery status, timestamps)                    │
│  • Bounce Management (automatic suppression)                   │
│  • Complaint Handling (spam reports)                           │
│  • Unsubscribe Management                                      │
│  • Statistics & Analytics                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Details

#### Email Service (`email.service.ts`)

Core orchestrator for email operations:

- **Validation** - Input validation with Zod schemas
- **Rate Limiting** - Per-second and per-day limits
- **Direct Send** - Immediate delivery via SES
- **Queued Send** - Async delivery via SQS
- **Retry Logic** - Exponential backoff for failures
- **Bounce Checking** - Prevents sending to bounced addresses
- **Logging** - Comprehensive delivery tracking

#### Template Service (`template.service.ts`)

Manages email templates:

- **Hybrid System** - Code templates + DB templates
- **Rendering** - React Email to HTML conversion
- **Variable Substitution** - Dynamic data injection
- **Versioning** - Full history with rollback
- **Cloning** - Duplicate templates
- **Publishing** - Draft → Published workflow
- **Archiving** - Soft delete

#### Config Service (`config.service.ts`)

3-tier configuration management:

- **Database** (Highest priority) - Runtime config via Admin UI
- **Environment** (Medium priority) - `.env` variables
- **Defaults** (Lowest priority) - Code-level defaults

```typescript
// Resolution order:
const value = await configService.get('EMAIL_FROM_ADDRESS');
// 1. Check database
// 2. Check process.env
// 3. Use default
```

#### Compliance Service (`compliance.service.ts`)

Handles email compliance:

- **Bounce Processing** - Parse SES bounce notifications
- **Suppression List** - Automatic bounce list management
- **Complaint Handling** - Process spam reports
- **Unsubscribe Management** - Honor opt-out requests
- **Webhook Processing** - Handle SES SNS notifications

### Database Schema

```sql
-- Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft',
  is_system BOOLEAN DEFAULT false,
  template_code TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template Versions (History)
CREATE TABLE email_template_versions (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES email_templates(id),
  version INTEGER NOT NULL,
  subject VARCHAR(500),
  template_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email Logs
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  template_name VARCHAR(255),
  to_address VARCHAR(255) NOT NULL,
  from_address VARCHAR(255),
  subject VARCHAR(500),
  status VARCHAR(50),
  ses_message_id VARCHAR(255),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bounce Management
CREATE TABLE email_bounces (
  id UUID PRIMARY KEY,
  email_address VARCHAR(255) UNIQUE NOT NULL,
  bounce_type VARCHAR(50),
  bounce_subtype VARCHAR(50),
  diagnostic_code TEXT,
  bounced_at TIMESTAMP DEFAULT NOW()
);

-- System Configuration
CREATE TABLE system_config (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Data Flow

#### Sending Email (Direct)

```
1. API Request → POST /api/email/send
2. Authentication → JWT validation
3. Authorization → IAM permission check
4. Validation → Zod schema validation
5. Rate Limit → Check per-second/per-day limits
6. Bounce Check → Verify not in suppression list
7. Template Load → Get template (code or DB)
8. Render → React Email → HTML
9. Send → AWS SES
10. Log → Write to email_logs table
11. Response → Return message_id
```

#### Sending Email (Queued)

```
1. API Request → POST /api/email/send
2-6. Same as Direct
7. Queue → Push message to SQS
8. Log → Write to email_logs (status: queued)
9. Response → Return queue_id

Worker Process:
10. Poll → Read message from SQS
11. Template Load → Get template
12. Render → React Email → HTML
13. Send → AWS SES
14. Log → Update email_logs (status: sent/failed)
15. Delete → Remove from SQS
```

### Security Model

#### Authentication

All API endpoints require JWT authentication:

```typescript
// Middleware chain
router.post('/send',
  authenticate,              // JWT validation
  emailPermissions.send(),   // IAM check
  sendEmailHandler           // Business logic
);
```

#### Authorization (IAM)

Permission-based access control:

```typescript
// IAM Features
feature_email_send         → Send, SendBulk
feature_email_templates    → Create, Read, Update, Delete, Publish, Archive, Clone
feature_email_logs         → Read, Retry, Delete
feature_email_config       → Read, Update, Delete
```

#### Tenant Isolation

Company-scoped permissions:

```typescript
// User belongs to company_id: abc123
// Permission check includes tenant context
await permissionsService.canPerformAction(
  userId,
  'feature_email_send',
  'Send',
  'abc123'  // Tenant context
);
```

---

## Installation & Setup

### Prerequisites Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL 15+ running
- [ ] AWS Account created
- [ ] AWS SES verified (at least one email/domain)
- [ ] AWS SQS queue created (optional for queue mode)
- [ ] AWS credentials configured locally

### Step 1: Clone & Install

```bash
# Navigate to backend
cd repos/backend

# Install dependencies
npm install
```

### Step 2: Database Setup

```bash
# Create database
createdb vertical_vibing

# Run migrations
npm run db:migrate

# Verify tables created
npm run db:studio
```

### Step 3: AWS Setup

#### AWS SES Setup

1. **Verify Email Address (Sandbox)**
   ```bash
   aws ses verify-email-identity --email-address noreply@yourdomain.com
   ```

2. **Check Verification Status**
   ```bash
   aws ses get-identity-verification-attributes \
     --identities noreply@yourdomain.com
   ```

3. **Request Production Access** (Optional)
   - Go to AWS SES Console
   - Request production access (removes sandbox restrictions)
   - Wait for approval (24-48 hours)

#### AWS SQS Setup (Optional)

```bash
# Create queue
aws sqs create-queue --queue-name email-queue

# Get queue URL
aws sqs get-queue-url --queue-name email-queue

# Configure dead letter queue (recommended)
aws sqs create-queue --queue-name email-queue-dlq
```

### Step 4: Environment Configuration

Create `.env` file:

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://user:password@localhost:5432/vertical_vibing

# ============================================
# EMAIL SYSTEM
# ============================================
EMAIL_SYSTEM_ENABLED=true
EMAIL_SANDBOX_MODE=true  # Set to false in production

# Sender Information
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Your App Name"
EMAIL_REPLY_TO=support@yourdomain.com

# Rate Limiting
EMAIL_RATE_LIMIT_PER_SECOND=14
EMAIL_RATE_LIMIT_PER_DAY=50000

# Retry Configuration
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY_MS=1000

# ============================================
# AWS CONFIGURATION
# ============================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# ============================================
# QUEUE CONFIGURATION (Optional)
# ============================================
EMAIL_QUEUE_ENABLED=false  # Enable for async processing
EMAIL_QUEUE_NAME=email-queue
EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/email-queue

# ============================================
# WORKER CONFIGURATION (If using workers)
# ============================================
WORKER_ENABLED=false
WORKER_CONCURRENCY=5
WORKER_POLL_INTERVAL_MS=1000
WORKER_WAIT_TIME_SECONDS=20

# ============================================
# JWT (from main app)
# ============================================
JWT_SECRET=your_jwt_secret_here
```

### Step 5: Seed IAM Features

```bash
# Seed email features into IAM database
npx tsx src/features/email/seed-email-features.ts seed

# Verify seeding
npx tsx src/features/email/seed-email-features.ts list
```

Expected output:
```
Email Features in Database:
✓ feature_email_send (Email Sending)
✓ feature_email_templates (Email Templates)
✓ feature_email_logs (Email Logs)
✓ feature_email_config (Email Configuration)
```

### Step 6: Initialize Configuration

```bash
# Start backend
npm run dev

# Initialize default configuration (in another terminal)
curl -X POST http://localhost:3000/api/email/config/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 7: Verify Installation

```bash
# Health check
curl http://localhost:3000/api/email/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-21T...",
  "service": "email"
}
```

### Step 8: Send Test Email

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "welcome",
    "toAddress": "your-verified-email@example.com",
    "templateData": {
      "userName": "Test User",
      "companyName": "Test Company",
      "loginUrl": "https://app.example.com"
    }
  }'
```

### Troubleshooting Installation

**Issue: Database connection fails**
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
psql $DATABASE_URL
```

**Issue: AWS SES returns "Email address not verified"**
```bash
# Verify email in SES
aws ses verify-email-identity --email-address noreply@yourdomain.com

# Check verification status
aws ses get-identity-verification-attributes \
  --identities noreply@yourdomain.com
```

**Issue: IAM features not found**
```bash
# Re-run seeding
npx tsx src/features/email/seed-email-features.ts unseed
npx tsx src/features/email/seed-email-features.ts seed
```

---

## Configuration

### Configuration Precedence

The system uses a 3-tier configuration precedence:

```
1. Database (Highest Priority)
   ↓ If not found, check...
2. Environment Variables
   ↓ If not found, check...
3. Code Defaults (Lowest Priority)
```

### Configuration Keys

#### Email System

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `EMAIL_SYSTEM_ENABLED` | boolean | `true` | Enable/disable email system |
| `EMAIL_SANDBOX_MODE` | boolean | `true` | Sandbox mode (dev/test only) |
| `EMAIL_FROM_ADDRESS` | string | - | Default sender email |
| `EMAIL_FROM_NAME` | string | - | Default sender name |
| `EMAIL_REPLY_TO` | string | - | Reply-to address |

#### Rate Limiting

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `EMAIL_RATE_LIMIT_PER_SECOND` | number | `14` | Max emails per second |
| `EMAIL_RATE_LIMIT_PER_DAY` | number | `50000` | Max emails per day |

#### Queue Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `EMAIL_QUEUE_ENABLED` | boolean | `false` | Enable queue mode |
| `EMAIL_QUEUE_NAME` | string | `email-queue` | SQS queue name |
| `EMAIL_QUEUE_URL` | string | - | Full SQS queue URL |

#### Retry Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `EMAIL_MAX_RETRIES` | number | `3` | Max retry attempts |
| `EMAIL_RETRY_DELAY_MS` | number | `1000` | Initial retry delay (ms) |

#### Worker Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `WORKER_ENABLED` | boolean | `false` | Enable worker process |
| `WORKER_CONCURRENCY` | number | `5` | Concurrent messages |
| `WORKER_POLL_INTERVAL_MS` | number | `1000` | Poll interval (ms) |
| `WORKER_WAIT_TIME_SECONDS` | number | `20` | SQS long polling time |

### Managing Configuration

#### Via Environment Variables

Edit `.env` file:

```bash
EMAIL_FROM_ADDRESS=noreply@newdomain.com
EMAIL_RATE_LIMIT_PER_SECOND=20
```

Restart backend:
```bash
npm run dev
```

#### Via Admin API

**List all configuration:**
```bash
curl http://localhost:3000/api/email/config \
  -H "Authorization: Bearer $TOKEN"
```

**Get specific config:**
```bash
curl http://localhost:3000/api/email/config/EMAIL_FROM_ADDRESS \
  -H "Authorization: Bearer $TOKEN"
```

**Create/Update config:**
```bash
curl -X PUT http://localhost:3000/api/email/config/EMAIL_FROM_ADDRESS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "noreply@newdomain.com",
    "category": "email",
    "description": "Primary sender email address"
  }'
```

**Delete config (revert to env/default):**
```bash
curl -X DELETE http://localhost:3000/api/email/config/EMAIL_FROM_ADDRESS \
  -H "Authorization: Bearer $TOKEN"
```

#### Via Admin UI

Navigate to `/email/settings` in frontend:

1. View all configuration with effective values
2. See which tier is providing each value (DB/Env/Default)
3. Create new database overrides
4. Update existing overrides
5. Delete overrides to revert to env/default

### Configuration Categories

Configurations are organized into categories:

- `email` - Email system settings
- `aws` - AWS service configuration
- `queue` - Queue/worker settings
- `limits` - Rate limiting
- `retry` - Retry logic
- `compliance` - Bounce/complaint handling

### Best Practices

**Development:**
- Use environment variables for local dev
- Keep `.env` in `.gitignore`
- Use different configs per developer

**Staging:**
- Use database config for rapid testing
- Test configuration changes before production
- Keep sandbox mode enabled

**Production:**
- Use database config for runtime changes
- Monitor configuration changes (audit log)
- Use restrictive IAM permissions for config management
- Back up database config regularly

---

## API Reference

### Authentication

All endpoints require JWT authentication via `Authorization` header:

```bash
Authorization: Bearer <your_jwt_token>
```

### Permissions

Each endpoint requires specific IAM permissions (see [IAM Integration](#iam-integration)).

---

### Email Sending Endpoints

#### Send Single Email

```
POST /api/email/send
```

Send a single transactional email.

**Permission:** `feature_email_send:Send`

**Request Body:**
```typescript
{
  templateName: string;        // Template to use
  toAddress: string;           // Recipient email
  templateData: object;        // Template variables
  fromAddress?: string;        // Override sender (optional)
  replyTo?: string;           // Override reply-to (optional)
  cc?: string[];              // CC recipients (optional)
  bcc?: string[];             // BCC recipients (optional)
}
```

**Example:**
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

**Response (Success):**
```json
{
  "success": true,
  "messageId": "01000193...",
  "logId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (Error):**
```json
{
  "error": "Template not found: welcome"
}
```

---

#### Send Bulk Emails

```
POST /api/email/send/bulk
```

Send multiple emails in a batch.

**Permission:** `feature_email_send:SendBulk`

**Request Body:**
```typescript
{
  emails: Array<{
    templateName: string;
    toAddress: string;
    templateData: object;
    fromAddress?: string;
    replyTo?: string;
  }>;
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/email/send/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      {
        "templateName": "welcome",
        "toAddress": "user1@example.com",
        "templateData": {"userName": "User 1"}
      },
      {
        "templateName": "welcome",
        "toAddress": "user2@example.com",
        "templateData": {"userName": "User 2"}
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "results": [
    {"success": true, "messageId": "...", "logId": "..."},
    {"success": true, "messageId": "...", "logId": "..."}
  ],
  "total": 2,
  "succeeded": 2,
  "failed": 0
}
```

---

#### Health Check

```
GET /api/email/health
```

Check email system health.

**Permission:** None (public)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-21T12:00:00Z",
  "service": "email"
}
```

---

### Template Management Endpoints

#### List Templates

```
GET /api/email/templates
```

List all email templates.

**Permission:** `feature_email_templates:Read`

**Query Parameters:**
- `status` (optional) - Filter by status (`draft`, `published`, `archived`)
- `category` (optional) - Filter by category
- `limit` (optional) - Max results (default: 100)
- `offset` (optional) - Pagination offset

**Example:**
```bash
curl http://localhost:3000/api/email/templates?status=published \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "templates": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "welcome",
      "subject": "Welcome to {{companyName}}!",
      "category": "onboarding",
      "status": "published",
      "isSystem": true,
      "version": 1,
      "createdAt": "2025-11-01T12:00:00Z",
      "updatedAt": "2025-11-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

---

#### Get Template by ID

```
GET /api/email/templates/:id
```

Get a specific template with full details.

**Permission:** `feature_email_templates:Read`

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "welcome",
  "subject": "Welcome to {{companyName}}!",
  "category": "onboarding",
  "status": "published",
  "isSystem": true,
  "templateCode": "import { Html, ... } ...",
  "version": 2,
  "createdAt": "2025-11-01T12:00:00Z",
  "updatedAt": "2025-11-10T15:30:00Z"
}
```

---

#### Create Template

```
POST /api/email/templates
```

Create a new custom template.

**Permission:** `feature_email_templates:Create`

**Request Body:**
```typescript
{
  name: string;              // Unique template name (kebab-case)
  subject: string;           // Email subject line
  templateCode: string;      // React Email TSX code
  category?: string;         // Category (default: 'custom')
  status?: string;           // Status (default: 'draft')
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/email/templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "product-launch",
    "subject": "New Product: {{productName}}",
    "category": "marketing",
    "templateCode": "import { Html, Head, Body, Container, Text } from \"@react-email/components\";\n\nexport default function ProductLaunch({ productName }: { productName: string }) {\n  return (\n    <Html>\n      <Head />\n      <Body>\n        <Container>\n          <Text>Check out our new product: {productName}!</Text>\n        </Container>\n      </Body>\n    </Html>\n  );\n}"
  }'
```

**Response:**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "name": "product-launch",
  "version": 1
}
```

---

#### Update Template

```
PUT /api/email/templates/:id
```

Update an existing template (creates new version).

**Permission:** `feature_email_templates:Update`

**Request Body:**
```typescript
{
  subject?: string;
  templateCode?: string;
  category?: string;
}
```

---

#### Publish Template

```
POST /api/email/templates/:id/publish
```

Publish a draft template (makes it available for sending).

**Permission:** `feature_email_templates:Publish`

**Response:**
```json
{
  "success": true,
  "template": {
    "id": "...",
    "status": "published"
  }
}
```

---

#### Archive Template

```
POST /api/email/templates/:id/archive
```

Archive a template (soft delete, keeps history).

**Permission:** `feature_email_templates:Archive`

---

#### Clone Template

```
POST /api/email/templates/:id/clone
```

Create a copy of an existing template.

**Permission:** `feature_email_templates:Clone`

**Request Body:**
```typescript
{
  newName: string;  // Name for cloned template
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/email/templates/550e8400.../clone \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newName": "welcome-variant-2"}'
```

---

#### Get Template Versions

```
GET /api/email/templates/:id/versions
```

Get version history for a template.

**Permission:** `feature_email_templates:Read`

**Response:**
```json
{
  "versions": [
    {
      "id": "...",
      "templateId": "550e8400...",
      "version": 2,
      "subject": "Welcome to {{companyName}}!",
      "templateCode": "...",
      "createdAt": "2025-11-10T15:30:00Z"
    },
    {
      "id": "...",
      "templateId": "550e8400...",
      "version": 1,
      "subject": "Welcome!",
      "templateCode": "...",
      "createdAt": "2025-11-01T12:00:00Z"
    }
  ]
}
```

---

#### Rollback Template

```
POST /api/email/templates/:id/rollback
```

Rollback template to a previous version.

**Permission:** `feature_email_templates:Update`

**Request Body:**
```typescript
{
  version: number;  // Version number to rollback to
}
```

---

#### Preview Template

```
POST /api/email/templates/preview
```

Preview a template with sample data (does not send).

**Permission:** `feature_email_templates:Read`

**Request Body:**
```typescript
{
  templateName: string;
  templateData: object;
}
```

**Response:**
```json
{
  "html": "<html>...</html>",
  "subject": "Welcome to Acme Corp!"
}
```

---

### Email Logs Endpoints

#### List Email Logs

```
GET /api/email/logs
```

List email delivery logs.

**Permission:** `feature_email_logs:Read`

**Query Parameters:**
- `status` (optional) - Filter by status (`sent`, `failed`, `queued`, `bounced`)
- `templateName` (optional) - Filter by template
- `toAddress` (optional) - Filter by recipient
- `limit` (optional) - Max results (default: 100)
- `offset` (optional) - Pagination offset
- `startDate` (optional) - Filter by date range start
- `endDate` (optional) - Filter by date range end

**Example:**
```bash
curl "http://localhost:3000/api/email/logs?status=failed&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "logs": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440000",
      "templateName": "welcome",
      "toAddress": "user@example.com",
      "fromAddress": "noreply@yourdomain.com",
      "subject": "Welcome to Acme Corp!",
      "status": "sent",
      "sesMessageId": "01000193...",
      "errorMessage": null,
      "retryCount": 0,
      "sentAt": "2025-11-21T12:00:00Z",
      "createdAt": "2025-11-21T11:59:55Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

#### Get Email Log by ID

```
GET /api/email/logs/:id
```

Get detailed log for a specific email.

**Permission:** `feature_email_logs:Read`

---

#### Retry Failed Email

```
POST /api/email/logs/:id/retry
```

Retry a failed email delivery.

**Permission:** `feature_email_logs:Retry`

**Response:**
```json
{
  "success": true,
  "messageId": "01000194...",
  "logId": "750e8400-e29b-41d4-a716-446655440000"
}
```

---

#### Delete Email Log

```
DELETE /api/email/logs/:id
```

Delete an email log (admin only).

**Permission:** `feature_email_logs:Delete`

---

#### Get Email Statistics

```
GET /api/email/stats
```

Get email delivery statistics.

**Permission:** `feature_email_logs:Read`

**Query Parameters:**
- `startDate` (optional) - Start of date range
- `endDate` (optional) - End of date range

**Response:**
```json
{
  "total": 10000,
  "sent": 9500,
  "failed": 300,
  "queued": 100,
  "bounced": 100,
  "successRate": 0.95,
  "period": {
    "start": "2025-11-01T00:00:00Z",
    "end": "2025-11-21T23:59:59Z"
  }
}
```

---

### Configuration Endpoints

#### List All Configuration

```
GET /api/email/config
```

List all configuration keys with effective values.

**Permission:** `feature_email_config:Read`

**Response:**
```json
{
  "configs": [
    {
      "key": "EMAIL_FROM_ADDRESS",
      "value": "noreply@yourdomain.com",
      "source": "database",
      "category": "email",
      "description": "Default sender email address"
    },
    {
      "key": "EMAIL_RATE_LIMIT_PER_SECOND",
      "value": "14",
      "source": "environment",
      "category": "limits"
    }
  ]
}
```

---

#### Get Configuration by Key

```
GET /api/email/config/:key
```

Get a specific configuration value.

**Permission:** `feature_email_config:Read`

**Response:**
```json
{
  "key": "EMAIL_FROM_ADDRESS",
  "value": "noreply@yourdomain.com",
  "source": "database",
  "category": "email",
  "description": "Default sender email address"
}
```

---

#### Create/Update Configuration

```
POST /api/email/config
PUT /api/email/config/:key
```

Create or update configuration in database.

**Permission:** `feature_email_config:Update`

**Request Body:**
```typescript
{
  key?: string;          // Required for POST
  value: string;         // New value
  category?: string;     // Optional category
  description?: string;  // Optional description
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/email/config/EMAIL_FROM_ADDRESS \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "noreply@newdomain.com",
    "category": "email",
    "description": "Updated sender address"
  }'
```

---

#### Delete Configuration

```
DELETE /api/email/config/:key
```

Delete configuration from database (reverts to env/default).

**Permission:** `feature_email_config:Delete`

---

#### Initialize Default Configuration

```
POST /api/email/config/initialize
```

Initialize all default configuration values in database.

**Permission:** `feature_email_config:Update`

**Response:**
```json
{
  "success": true,
  "initialized": 15
}
```

---

#### Get Configuration Categories

```
GET /api/email/config/meta/categories
```

Get list of configuration categories.

**Permission:** `feature_email_config:Read`

**Response:**
```json
{
  "categories": [
    "email",
    "aws",
    "queue",
    "limits",
    "retry",
    "compliance"
  ]
}
```

---

## Template Development

### Template Structure

Email templates use React Email components:

```typescript
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Link,
  Img,
} from '@react-email/components';

// Define props interface
interface WelcomeEmailProps {
  userName: string;
  companyName: string;
  loginUrl: string;
}

// Export default function
export default function WelcomeEmail({
  userName,
  companyName,
  loginUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Welcome to {companyName}!</Text>
            <Text style={paragraph}>
              Hi {userName},
            </Text>
            <Text style={paragraph}>
              We're excited to have you on board.
            </Text>
            <Button href={loginUrl} style={button}>
              Get Started
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
};

const paragraph = {
  fontSize: '18px',
  lineHeight: '1.4',
  color: '#484848',
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};
```

### Creating Templates (3 Methods)

#### Method 1: Using Template Generator CLI (Recommended)

```bash
npm run email:generate-template
```

Interactive prompts guide you through:
1. Template name
2. Category
3. Description
4. Variables (name, type, description, required)

Generates:
- `templates/{name}.tsx` - React Email template
- `templates/{name}.sample.json` - Sample data
- Updates `templates/index.ts` - Export registry

#### Method 2: Manual Creation

1. Create template file:
   ```bash
   touch src/features/email/templates/my-template.tsx
   ```

2. Write React Email template (see structure above)

3. Export from index:
   ```typescript
   // templates/index.ts
   export { default as MyTemplate } from './my-template';
   ```

4. Create sample data:
   ```bash
   echo '{"userName": "John", "message": "Hello"}' > templates/my-template.sample.json
   ```

#### Method 3: Clone Existing Template

```bash
curl -X POST http://localhost:3000/api/email/templates/{id}/clone \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newName": "my-custom-template"}'
```

### Template Variables

Use TypeScript props for type-safe variables:

```typescript
interface MyTemplateProps {
  // String
  userName: string;

  // Number
  orderAmount: number;

  // Boolean
  isPremium: boolean;

  // Array
  items: string[];

  // Object
  user: {
    name: string;
    email: string;
  };

  // Date (as string)
  expiryDate: string;

  // Optional
  companyLogo?: string;
}
```

Use in template:
```typescript
<Text>Hello {userName}!</Text>
<Text>Order total: ${orderAmount}</Text>
{isPremium && <Text>You're a premium member!</Text>}
{items.map(item => <Text key={item}>{item}</Text>)}
<Text>Contact: {user.email}</Text>
```

### Testing Templates

#### Preview Server (Visual Testing)

```bash
# Start preview server
npm run email:preview

# Opens at http://localhost:3050
```

Features:
- Visual gallery of all templates
- Click to preview with sample data
- Toggle HTML source view
- Hot-reload on template changes

#### Email Tester CLI (Render Testing)

```bash
# Interactive mode
npm run email:test

# Select template
# Edit data
# Choose action (dry-run, send, save HTML)
```

Quick dry-run:
```bash
npm run email:test -- --template welcome --dry-run
```

#### Template Validator (Quality Assurance)

```bash
# Validate all templates
npm run email:validate-templates

# Validate specific template
npm run email:validate-templates -- --template my-template
```

13 validation checks:
- File structure validity
- Required imports
- Props interface definition
- Default export presence
- Sample data existence
- Variable matching
- Render success
- HTML structure
- Link validation (HTTPS)
- Image validation
- Size check (<100KB)
- Style validation
- Performance metrics

### Template Best Practices

**Structure:**
- Always include `<Html>`, `<Head>`, and `<Body>`
- Use `<Container>` for max-width content
- Use `<Section>` for logical groupings
- Define TypeScript interfaces for props

**Styling:**
- Use inline styles (CSS-in-JS objects)
- Avoid external stylesheets
- Use email-safe fonts
- Test in multiple email clients

**Content:**
- Keep subject lines under 50 characters
- Use clear call-to-action buttons
- Include plain text alternative
- Add unsubscribe link (required)

**Variables:**
- Use descriptive variable names
- Provide default values for optionals
- Validate data in template
- Create comprehensive sample data

**Performance:**
- Keep total size under 100KB
- Optimize images (use CDN)
- Minimize inline styles
- Test render performance

**Accessibility:**
- Use semantic HTML
- Include alt text for images
- Ensure sufficient color contrast
- Use heading hierarchy

---

## Queue & Workers

### Queue Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│ Email Service│────>│  SQS Queue  │────>│    Worker    │
└──────────────┘     └─────────────┘     └──────────────┘
                            │                     │
                            │                     ▼
                            │              ┌──────────────┐
                            │              │   Send via   │
                            │              │   AWS SES    │
                            │              └──────────────┘
                            │                     │
                            │                     ▼
                            │              ┌──────────────┐
                            │              │  Update Log  │
                            │              │   (DB)       │
                            │              └──────────────┘
                            │                     │
                            │                     ▼
                            │              ┌──────────────┐
                            └──────────────│ Delete Msg   │
                                           │  from SQS    │
                                           └──────────────┘
```

### Why Use Queue Mode?

**Direct Send (No Queue):**
- ✅ Simple setup
- ✅ Immediate delivery
- ❌ Blocks API response
- ❌ No horizontal scaling
- ❌ Limited retry logic

**Queue Mode:**
- ✅ Non-blocking API responses
- ✅ Horizontal scaling (multiple workers)
- ✅ Better retry logic
- ✅ Rate limiting across workers
- ✅ Decoupled architecture
- ✅ Dead letter queue support

### Worker Deployment Patterns

#### Pattern 1: Standalone Process

Separate Node.js process running worker.

**Pros:**
- Independent scaling
- Dedicated resources
- Easy to monitor
- Can run on different instances

**Cons:**
- Additional deployment
- More infrastructure

**Setup:**

1. Create worker script:
   ```typescript
   // worker.ts
   import { standaloneEmailWorker } from './features/email/queue';

   async function main() {
     await standaloneEmailWorker.start();

     // Graceful shutdown
     process.on('SIGTERM', async () => {
       await standaloneEmailWorker.stop();
       process.exit(0);
     });
   }

   main();
   ```

2. Configure environment:
   ```bash
   WORKER_ENABLED=true
   WORKER_CONCURRENCY=10
   EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123/email-queue
   ```

3. Run worker:
   ```bash
   node dist/worker.js
   ```

4. Deploy (example with PM2):
   ```bash
   pm2 start dist/worker.js --name email-worker --instances 2
   ```

---

#### Pattern 2: Embedded in Main App

Worker runs in same process as Express app.

**Pros:**
- Single deployment
- Simpler infrastructure
- Shared resources

**Cons:**
- Competes with API for resources
- Scaling affects both API and worker

**Setup:**

1. Update `src/index.ts`:
   ```typescript
   import express from 'express';
   import { embeddedEmailWorker } from './features/email/queue';

   const app = express();

   // ... Express setup ...

   const server = app.listen(3000, async () => {
     console.log('Server started on port 3000');

     // Start embedded worker
     if (process.env.WORKER_ENABLED === 'true') {
       await embeddedEmailWorker.start();
       console.log('Email worker started');
     }
   });

   // Graceful shutdown
   process.on('SIGTERM', async () => {
     await embeddedEmailWorker.stop();
     server.close();
   });
   ```

2. Configure environment:
   ```bash
   WORKER_ENABLED=true
   WORKER_CONCURRENCY=5  # Lower for shared resources
   EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123/email-queue
   ```

3. Deploy normally:
   ```bash
   npm run build
   npm start
   ```

---

#### Pattern 3: AWS Lambda Function

Serverless function triggered by SQS.

**Pros:**
- Auto-scaling
- Pay per execution
- No infrastructure management
- Built-in retry/DLQ

**Cons:**
- Cold starts
- AWS-specific
- More complex debugging

**Setup:**

1. Lambda handler is ready at:
   ```
   src/features/email/queue/lambda-handler.ts
   ```

2. Create SAM template:
   ```yaml
   # template.yml
   AWSTemplateFormatVersion: '2010-09-09'
   Transform: AWS::Serverless-2016-10-31

   Resources:
     EmailQueue:
       Type: AWS::SQS::Queue
       Properties:
         QueueName: email-queue
         VisibilityTimeout: 180
         RedrivePolicy:
           deadLetterTargetArn: !GetAtt EmailDLQ.Arn
           maxReceiveCount: 3

     EmailDLQ:
       Type: AWS::SQS::Queue
       Properties:
         QueueName: email-queue-dlq

     EmailWorkerFunction:
       Type: AWS::Serverless::Function
       Properties:
         CodeUri: ./
         Handler: dist/features/email/queue/lambda-handler.handler
         Runtime: nodejs20.x
         MemorySize: 512
         Timeout: 30
         Environment:
           Variables:
             DATABASE_URL: !Ref DatabaseUrl
             AWS_REGION: us-east-1
         Events:
           SQSTrigger:
             Type: SQS
             Properties:
               Queue: !GetAtt EmailQueue.Arn
               BatchSize: 10
               MaximumBatchingWindowInSeconds: 5
   ```

3. Deploy:
   ```bash
   sam build
   sam deploy --guided
   ```

4. Monitor:
   ```bash
   sam logs --tail --name EmailWorkerFunction
   ```

---

### Worker Configuration

**Environment Variables:**

```bash
# Enable worker
WORKER_ENABLED=true

# Concurrency (parallel messages)
WORKER_CONCURRENCY=5

# Poll interval (milliseconds)
WORKER_POLL_INTERVAL_MS=1000

# SQS long polling (seconds, 0-20)
WORKER_WAIT_TIME_SECONDS=20

# Queue URL
EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/email-queue
```

**Concurrency Guidelines:**

- **Low traffic (<1000/day):** 1-3 concurrent
- **Medium traffic (1000-10000/day):** 5-10 concurrent
- **High traffic (>10000/day):** 10-20+ concurrent per worker instance

**Scaling Workers:**

Horizontal scaling (multiple instances):
```bash
# Pattern 1 (Standalone) - Run multiple processes
pm2 start worker.js --instances 4

# Pattern 2 (Embedded) - Scale app replicas
docker-compose up --scale api=3

# Pattern 3 (Lambda) - Auto-scales automatically
```

---

### Dead Letter Queue (DLQ)

Handle persistent failures:

1. Create DLQ:
   ```bash
   aws sqs create-queue --queue-name email-queue-dlq
   ```

2. Configure redrive policy:
   ```bash
   aws sqs set-queue-attributes \
     --queue-url https://sqs.us-east-1.amazonaws.com/123/email-queue \
     --attributes '{
       "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123:email-queue-dlq\",\"maxReceiveCount\":\"3\"}"
     }'
   ```

3. Monitor DLQ:
   ```bash
   aws sqs get-queue-attributes \
     --queue-url https://sqs.us-east-1.amazonaws.com/123/email-queue-dlq \
     --attribute-names ApproximateNumberOfMessages
   ```

4. Process DLQ messages:
   ```bash
   # Receive messages
   aws sqs receive-message \
     --queue-url https://sqs.us-east-1.amazonaws.com/123/email-queue-dlq \
     --max-number-of-messages 10

   # Investigate and fix issue

   # Re-queue to main queue
   aws sqs send-message \
     --queue-url https://sqs.us-east-1.amazonaws.com/123/email-queue \
     --message-body '...'
   ```

---

### Monitoring Workers

**CloudWatch Metrics (AWS):**
- `ApproximateNumberOfMessagesVisible` - Queue depth
- `ApproximateAgeOfOldestMessage` - Processing lag
- `NumberOfMessagesSent` - Throughput
- `NumberOfMessagesDeleted` - Processed

**Application Logs:**
```typescript
// Worker logs include:
- Message received
- Processing started
- Email sent successfully
- Processing failed (with error)
- Message deleted from queue
```

**Database Queries:**
```sql
-- Failed emails in last hour
SELECT COUNT(*) FROM email_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Average processing time
SELECT AVG(sent_at - created_at) as avg_processing_time
FROM email_logs
WHERE sent_at IS NOT NULL;

-- Queue backlog
SELECT COUNT(*) FROM email_logs
WHERE status = 'queued';
```

---

## IAM Integration

### IAM Features

The email system defines 4 IAM features:

```typescript
feature_email_send         // Email sending operations
feature_email_templates    // Template management
feature_email_logs         // Log viewing and management
feature_email_config       // Configuration management
```

### IAM Actions

Each feature has specific actions:

**feature_email_send:**
- `Send` - Send individual emails
- `SendBulk` - Send bulk emails

**feature_email_templates:**
- `Create` - Create new templates
- `Read` - View templates
- `Update` - Edit templates
- `Delete` - Delete templates
- `Publish` - Publish draft templates
- `Archive` - Archive templates
- `Clone` - Clone templates

**feature_email_logs:**
- `Read` - View email logs
- `Retry` - Retry failed emails
- `Delete` - Delete logs (admin)

**feature_email_config:**
- `Read` - View configuration
- `Update` - Modify configuration
- `Delete` - Delete config overrides

### Permission Resolution

Permissions are resolved via `PermissionsService`:

```typescript
// Permission check
const hasPermission = await permissionsService.canPerformAction(
  userId,           // User ID
  'feature_email_send',  // Feature key
  'Send',           // Action
  companyId         // Tenant context
);

if (!hasPermission) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### Authorization Flow

```
1. User makes API request
   ↓
2. authenticate middleware validates JWT
   ↓
3. emailPermissions.send() middleware called
   ↓
4. Permission mapped to IAM feature + action
   ↓
5. PermissionsService.canPerformAction() resolves:
   - User's levels (company, workspace, etc.)
   - Each level's permission sets
   - Effective permission based on hierarchy
   ↓
6. If authorized: proceed to handler
   If denied: 403 Forbidden
```

### Seeding Email Features

IAM features must be registered in database:

```bash
# Seed features (idempotent, safe to re-run)
npx tsx src/features/email/seed-email-features.ts seed

# List features
npx tsx src/features/email/seed-email-features.ts list

# Remove features (cleanup)
npx tsx src/features/email/seed-email-features.ts unseed
```

**Programmatic seeding:**
```typescript
import { seedEmailFeatures } from './features/email/seed-email-features';

// In your initialization code
await seedEmailFeatures();
```

### Assigning Permissions

**Via IAM API:**
```bash
# Create permission set with email permissions
curl -X POST http://localhost:3000/api/iam/permission-sets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email Administrator",
    "description": "Full email system access",
    "permissions": [
      {
        "featureKey": "feature_email_send",
        "actions": ["Send", "SendBulk"]
      },
      {
        "featureKey": "feature_email_templates",
        "actions": ["Create", "Read", "Update", "Delete", "Publish", "Archive", "Clone"]
      },
      {
        "featureKey": "feature_email_logs",
        "actions": ["Read", "Retry", "Delete"]
      },
      {
        "featureKey": "feature_email_config",
        "actions": ["Read", "Update", "Delete"]
      }
    ]
  }'

# Assign to user level
curl -X POST http://localhost:3000/api/iam/levels/{levelId}/permission-sets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionSetId": "email-admin-set-id"
  }'
```

**Common Permission Sets:**

**Email Administrator (Full Access):**
- All actions on all features

**Email Manager (Management Only):**
- `feature_email_templates`: Create, Read, Update, Publish, Archive, Clone
- `feature_email_logs`: Read, Retry
- `feature_email_config`: Read, Update

**Email Viewer (Read Only):**
- `feature_email_templates`: Read
- `feature_email_logs`: Read
- `feature_email_config`: Read

**Email Sender (Send Only):**
- `feature_email_send`: Send, SendBulk

### Super Admin Bypass

Super admins automatically bypass all permission checks:

```typescript
// In middleware
if (req.user?.isSuperAdmin) {
  return next();  // Skip permission check
}
```

### Tenant Isolation

All permission checks include tenant (company) context:

```typescript
// User belongs to company ABC
// Cannot access resources for company XYZ

await permissionsService.canPerformAction(
  userId,
  'feature_email_send',
  'Send',
  'ABC'  // Tenant context enforced
);
```

---

## Admin UI

### Overview

The email system includes a complete Next.js-based Admin UI accessible at:

```
http://localhost:3001/email
```

### UI Pages

#### Email Dashboard (`/email`)

**Route:** `/email`
**Permission:** `feature_email_logs:Read`

**Features:**
- Statistics overview (sent, failed, queued, bounced, success rate)
- Charts and graphs (last 7 days, last 30 days)
- Recent email activity table (last 20 emails)
- Quick action links to all management pages
- Real-time refresh

**Metrics Displayed:**
- Total emails sent
- Failed deliveries
- Queued emails
- Bounced emails
- Success rate (percentage)
- Average daily volume

---

#### Templates Manager (`/email/templates`)

**Route:** `/email/templates`
**Permission:** `feature_email_templates:Read`

**Features:**
- List all templates (system + custom)
- Filter by status (draft, published, archived)
- Filter by category
- Search by name
- Create new templates
- Edit template code and subject
- Publish/archive templates
- Clone templates
- View version history
- Rollback to previous versions
- Preview templates with sample data

**Template Editor:**
- Syntax-highlighted code editor
- Subject line editing
- Category selection
- Status management
- Variable documentation
- Sample data testing

**Version Control:**
- View all versions
- Compare versions (diff view)
- One-click rollback
- Version annotations

---

#### Email Logs Viewer (`/email/logs`)

**Route:** `/email/logs`
**Permission:** `feature_email_logs:Read`

**Features:**
- Browse all email delivery history
- Filter by status (sent, failed, queued, bounced)
- Filter by template name
- Filter by recipient email
- Date range filtering
- Search functionality
- Pagination (configurable page size)
- Sort by any column
- View detailed log information
- Retry failed emails
- Delete logs (admin only)
- Export to CSV

**Log Details Modal:**
- Full email metadata
- Template used
- Template data (variables)
- Delivery timestamps
- Error messages (if failed)
- SES message ID
- Retry count
- Delivery status

**Retry Functionality:**
- One-click retry for failed emails
- Bulk retry for multiple failures
- Retry with same or updated data

---

#### Settings Manager (`/email/settings`)

**Route:** `/email/settings`
**Permission:** `feature_email_config:Read`

**Features:**
- View all configuration keys
- See effective values (DB > Env > Default)
- Source indicator (which tier provides value)
- Category-based organization
- Create database overrides
- Update existing overrides
- Delete overrides (revert to env/default)
- Configuration validation
- Real-time preview of changes

**Configuration Display:**
```
KEY                           VALUE                    SOURCE      CATEGORY
EMAIL_FROM_ADDRESS            noreply@domain.com       Database    email
EMAIL_RATE_LIMIT_PER_SECOND   14                       Env         limits
EMAIL_MAX_RETRIES             3                        Default     retry
```

**Override Management:**
- Create: Add new database config
- Update: Modify existing config
- Delete: Remove override (revert to env/default)
- Validate: Check value format before saving

---

### UI Components

**Frontend Structure:**
```
frontend/src/features/email/
├── api/
│   └── emailApi.ts               # API client (~650 lines)
├── ui/
│   ├── EmailDashboard.tsx        # Dashboard component (~345 lines)
│   ├── EmailTemplatesManager.tsx # Templates UI (~757 lines)
│   ├── EmailLogsViewer.tsx       # Logs viewer (~490 lines)
│   └── EmailSettingsManager.tsx  # Settings UI (~665 lines)
└── index.ts                      # Public exports
```

**API Client (`emailApi.ts`):**
- Type-safe API calls
- Error handling
- Request/response transformation
- Authentication header injection

**Component Features:**
- React Server Components
- Client-side state with Zustand
- Optimistic updates
- Error boundaries
- Loading states
- Responsive design (Tailwind CSS)
- Accessibility (ARIA labels)

### IAM Integration in UI

All pages use `<Gate>` component for permission checks:

```typescript
<Gate
  feature="feature_email_templates"
  action="Read"
  fallback={
    <div className="p-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-900 mb-2">
          Access Denied
        </h2>
        <p className="text-yellow-800">
          You do not have permission to manage Email Templates.
        </p>
        <p className="text-yellow-700 text-sm mt-2">
          Please contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  }
>
  <EmailTemplatesManager />
</Gate>
```

### UI Error Handling

**Network Errors:**
- Retry button
- Error message display
- Fallback UI

**Validation Errors:**
- Inline field validation
- Error messages below inputs
- Prevent form submission

**Permission Errors:**
- Access denied page
- Clear explanation
- Contact admin message

### Responsive Design

**Mobile:**
- Stacked layouts
- Touch-friendly buttons
- Simplified tables (card view)
- Mobile menu

**Tablet:**
- Two-column layouts
- Condensed tables
- Side drawer navigation

**Desktop:**
- Full table views
- Multi-column layouts
- Advanced filters visible
- Keyboard shortcuts

---

## Developer Tools

### Overview

5 CLI and web tools for enhanced productivity:

1. **Email Template Preview Server** - Visual template gallery
2. **Template Generator CLI** - Interactive scaffolding
3. **Email Tester CLI** - Test without sending
4. **Template Validator** - 13 validation checks
5. **Template Lister** - List all templates

### Tool 1: Email Template Preview Server

**Command:** `npm run email:preview`

Web UI at `http://localhost:3050` for visual template preview.

**Features:**
- Template gallery with thumbnails
- Click to preview any template
- Visual rendering with sample data
- Toggle HTML source view
- Hot-reload (works with file watchers)
- API endpoint for custom rendering
- Configurable port via `--port` flag

**Usage:**
```bash
# Start server
npm run email:preview

# Custom port
npm run email:preview -- --port 4000

# Access in browser
open http://localhost:3050
```

**API Endpoint:**
```bash
# Render custom template
curl -X POST http://localhost:3050/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "welcome",
    "data": {"userName": "John", "companyName": "Acme"}
  }'
```

**Workflow:**
1. Keep preview server running in terminal
2. Edit templates in your editor
3. Refresh browser to see changes
4. Iterate quickly

---

### Tool 2: Template Generator CLI

**Command:** `npm run email:generate-template`

Interactive CLI to scaffold new templates.

**Features:**
- Step-by-step prompts
- Auto-generates React Email template
- Creates TypeScript interfaces
- Generates sample data JSON
- Updates template registry
- Input validation
- 6 variable types supported
- Professional terminal output

**Usage:**
```bash
npm run email:generate-template
```

**Prompts:**
1. Template name (kebab-case validation)
2. Category (email, iam, onboarding, marketing, notifications, transactional)
3. Description
4. Variables:
   - Name (camelCase validation)
   - Type (string, number, boolean, array, object, date)
   - Description
   - Required? (yes/no)
5. Add another variable? (yes/no)

**Generated Files:**
```
templates/
├── my-template.tsx           # React Email template
├── my-template.sample.json   # Sample data
└── index.ts                  # Updated with export
```

**Example:**
```bash
$ npm run email:generate-template

? Template name: product-launch
? Category: marketing
? Description: Announce new product launches
? Variable name: productName
? Variable type: string
? Description: Name of the product
? Required? Yes
? Add another variable? Yes
? Variable name: launchDate
? Variable type: date
? Description: Product launch date
? Required? Yes
? Add another variable? No

✓ Generated templates/product-launch.tsx
✓ Generated templates/product-launch.sample.json
✓ Updated templates/index.ts

Your template is ready to use!
```

---

### Tool 3: Email Tester CLI

**Command:** `npm run email:test`

CLI to test email templates during development.

**Features:**
- Interactive template selection
- Auto-loads sample data
- Edit template data:
  - Edit individual fields
  - Paste JSON data
- Dry-run mode (render without sending)
- Send to test email addresses
- Save rendered HTML to file
- Command-line arguments support
- Detailed output with metrics

**Usage:**
```bash
# Interactive mode
npm run email:test

# Quick dry-run
npm run email:test -- --template welcome --dry-run

# Send to email
npm run email:test -- --template welcome --to test@example.com

# Save HTML
npm run email:test -- --template welcome --dry-run --save
```

**Interactive Flow:**
```bash
$ npm run email:test

? Select template: welcome
Loaded sample data for 'welcome'

? What do you want to do?
  > Dry-run (render without sending)
    Send to email address
    Edit template data
    Save HTML to file

? Choice: Dry-run

✓ Rendered successfully!
  Size: 12.5 KB
  Render time: 45ms

Preview:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: Welcome to Acme Corp!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<html>...</html>
```

---

### Tool 4: Template Validator

**Command:** `npm run email:validate-templates`

Comprehensive validation tool with 13 checks.

**Features:**
- Validates all or specific templates
- 13 validation checks
- Exit codes for CI/CD
- Verbose mode for details
- Performance metrics
- Color-coded issues (error/warning/info)

**13 Validation Checks:**
1. File structure validity
2. Required imports (Html, Head, Body)
3. Props interface defined
4. Default export present
5. Sample data exists
6. Variables match between template and sample
7. Template renders successfully
8. HTML structure valid
9. Links use HTTPS (not HTTP)
10. Images have alt text
11. Email size under 100KB
12. Style tags vs inline styles
13. Performance metrics (render time)

**Usage:**
```bash
# Validate all templates
npm run email:validate-templates

# Validate specific template
npm run email:validate-templates -- --template welcome

# Verbose output
npm run email:validate-templates -- --verbose
```

**Output:**
```bash
$ npm run email:validate-templates

Validating Email Templates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ welcome
  ✓ File structure valid
  ✓ Required imports present
  ✓ Props interface defined
  ✓ Default export present
  ✓ Sample data exists
  ✓ Variables match
  ✓ Renders successfully
  ✓ HTML structure valid
  ⚠ Contains HTTP links (should use HTTPS)
  ✓ Images have alt text
  ✓ Size: 11.2 KB (under 100KB)
  ✓ Uses inline styles
  ⚠ Render time: 85ms (consider optimization)

✓ password-reset
  [Similar checks...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Results: 6 templates validated
✓ 5 passed
⚠ 1 with warnings
✗ 0 failed

Exit code: 0 (success)
```

**CI/CD Integration:**
```yaml
# .github/workflows/validate-templates.yml
name: Validate Email Templates

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run email:validate-templates
```

**Exit Codes:**
- `0` - All valid (warnings OK)
- `1` - Has errors

---

### Tool 5: Template Lister

**Command:** `npm run email:list-templates`

List all templates with metadata.

**Features:**
- Organized table output
- Shows category, variables, file size
- Indicates sample data availability
- Detailed descriptions
- JSON output option

**Usage:**
```bash
# Table format
npm run email:list-templates

# JSON output
npm run email:list-templates -- --json
```

**Output:**
```bash
$ npm run email:list-templates

Email Templates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NAME                  CATEGORY        VARIABLES    SIZE     SAMPLE
welcome               onboarding      3            11.2 KB  ✓
password-reset        email           2            8.5 KB   ✓
email-verification    email           2            7.8 KB   ✓
team-invitation       iam             4            13.1 KB  ✓
user-level-assignment iam             5            14.3 KB  ✓
permission-changes    iam             6            15.7 KB  ✓

Total: 6 templates
```

---

### Common Workflows

#### Creating a New Template
```bash
# 1. Generate scaffold
npm run email:generate-template

# 2. Preview while editing
npm run email:preview

# 3. Test render
npm run email:test -- --template my-template --dry-run

# 4. Validate
npm run email:validate-templates -- --template my-template

# 5. Send test email
npm run email:test -- --template my-template --to dev@test.com
```

#### Daily Development
```bash
# Terminal 1: Keep preview server running
npm run email:preview

# Terminal 2: Edit templates, auto-refreshes in browser

# Terminal 2: Test changes
npm run email:test -- --template my-template --dry-run
```

#### Pre-Deployment
```bash
# List all templates
npm run email:list-templates

# Validate everything
npm run email:validate-templates --verbose

# Fix any issues

# Commit changes
git add .
git commit -m "feat: add new email templates"
```

---

## Testing

### Test Coverage

**Total:** 200+ test cases, ~2,900 lines of test code

**Coverage:** >85% overall (services >90%, routes >85%)

### Test Structure

```
__tests__/
├── helpers/
│   └── test-fixtures.ts                          # Shared mocks
├── integration/
│   ├── email.route.integration.test.ts          # /api/email/*
│   └── email-admin-routes.integration.test.ts   # Admin routes
├── config.service.test.ts                        # 70+ tests
├── template.service.test.ts                      # 50+ tests
├── email.service.test.ts                         # 45+ tests
├── compliance.service.test.ts                    # 40+ tests
├── email-permission.middleware.test.ts           # 25+ tests
└── TEST-SUMMARY.md                               # Detailed docs
```

### Running Tests

```bash
# All email tests
npm test -- email

# Specific test file
npm test -- config.service.test.ts

# Watch mode
npm test -- --watch email

# Coverage
npm run test:coverage -- src/features/email

# CI mode
npm run test:ci
```

### Test Categories

#### Unit Tests (Services)

**config.service.test.ts (70+ tests):**
- 3-tier precedence (DB > Env > Default)
- Type conversion (string, number, boolean, JSON)
- Category filtering
- CRUD operations
- Initialization

**template.service.test.ts (50+ tests):**
- Template rendering
- Variable substitution
- Version management
- Rollback functionality
- Cloning
- Publishing/archiving

**email.service.test.ts (45+ tests):**
- Direct send
- Queued send
- Retry logic with exponential backoff
- Rate limiting (per-second, per-day)
- Bounce checking
- Logging

**compliance.service.test.ts (40+ tests):**
- Bounce processing
- Suppression list management
- Complaint handling
- Unsubscribe workflows

#### Middleware Tests

**email-permission.middleware.test.ts (25+ tests):**
- IAM permission checking
- Super admin bypass
- Tenant validation
- Permission mapping
- Error handling

#### Integration Tests

**email.route.integration.test.ts (30+ tests):**
- POST /api/email/send
- POST /api/email/send/bulk
- GET /api/email/health
- Authentication
- Authorization

**email-admin-routes.integration.test.ts (60+ tests):**
- Template CRUD
- Log viewing/retry/delete
- Configuration management
- Health checks
- Pagination/filtering

### Test Helpers

**test-fixtures.ts:**
- Mock users (admin, regular, super admin)
- Mock emails
- Mock templates
- Mock SES responses
- Mock SQS responses
- Mock database data
- Helper functions (createMockRequest, createMockResponse)

### Best Practices

**Test Structure:**
- Arrange-Act-Assert pattern
- Descriptive test names ("should X when Y")
- One assertion per test (where possible)
- Clear describe blocks for organization

**Mocking:**
- Mock external dependencies (AWS SDK, database)
- Use test fixtures for consistency
- Reset mocks between tests
- Verify mock calls with `expect(mock).toHaveBeenCalledWith(...)`

**Coverage Goals:**
- Services: >90%
- Routes: >85%
- Middleware: >90%
- Overall: >85%

**Continuous Integration:**
- Run tests on every commit
- Fail build if tests fail
- Generate coverage reports
- Track coverage trends

---

## Deployment

### Prerequisites

- [ ] Database (PostgreSQL) provisioned
- [ ] AWS SES verified and in production mode
- [ ] AWS SQS queue created
- [ ] Environment variables configured
- [ ] IAM features seeded
- [ ] SSL certificate (for production)
- [ ] Domain configured (for emails)

### Deployment Checklist

#### 1. Environment Configuration

Create production `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@db.example.com:5432/prod_db

# Email
EMAIL_SYSTEM_ENABLED=true
EMAIL_SANDBOX_MODE=false  # IMPORTANT: Disable sandbox in production
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME="Your App"
EMAIL_REPLY_TO=support@yourdomain.com

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=production_key
AWS_SECRET_ACCESS_KEY=production_secret

# Queue
EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123/prod-email-queue

# Rate Limits (production values)
EMAIL_RATE_LIMIT_PER_SECOND=14  # SES limit
EMAIL_RATE_LIMIT_PER_DAY=50000  # Adjust based on SES quota

# Worker (if using standalone worker)
WORKER_ENABLED=true
WORKER_CONCURRENCY=10
```

#### 2. Database Migration

```bash
# Run migrations
npm run db:migrate

# Verify tables
npm run db:studio
```

#### 3. Seed IAM Features

```bash
npx tsx src/features/email/seed-email-features.ts seed
```

#### 4. Build Application

```bash
# Build backend
cd repos/backend
npm run build

# Build frontend
cd repos/frontend
npm run build
```

#### 5. Deploy Backend

**Docker Deployment:**

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy built files
COPY dist ./dist

# Copy templates (needed for React Email)
COPY src/features/email/templates ./src/features/email/templates

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```bash
# Build image
docker build -t email-backend:latest .

# Run container
docker run -d \
  --name email-backend \
  -p 3000:3000 \
  --env-file .env \
  email-backend:latest
```

**PM2 Deployment:**

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start dist/index.js --name email-backend

# Start with environment
pm2 start dist/index.js \
  --name email-backend \
  --env production

# Scale
pm2 scale email-backend 4

# Save configuration
pm2 save

# Auto-restart on boot
pm2 startup
```

**Kubernetes Deployment:**

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: email-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: email-backend
  template:
    metadata:
      labels:
        app: email-backend
    spec:
      containers:
      - name: email-backend
        image: email-backend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: email-backend-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

#### 6. Deploy Worker

**Standalone Worker (Docker):**

```dockerfile
# worker.Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist
COPY src/features/email/templates ./src/features/email/templates

CMD ["node", "dist/features/email/queue/standalone-worker.js"]
```

```bash
docker run -d \
  --name email-worker \
  --env-file .env \
  email-worker:latest
```

**Lambda Worker:**

```bash
# Build and deploy with SAM
sam build
sam deploy --guided
```

#### 7. Configure Monitoring

**CloudWatch Alarms:**

```bash
# Queue depth alarm
aws cloudwatch put-metric-alarm \
  --alarm-name email-queue-depth \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold

# Failed emails alarm
# (Create custom metric from application logs)
```

**Application Monitoring:**

```typescript
// Add monitoring middleware
import { logger } from './shared/utils/logger';

app.use((req, res, next) => {
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: res.get('X-Response-Time'),
    });
  });
  next();
});
```

#### 8. Health Checks

Configure load balancer health checks:

```
Endpoint: GET /api/email/health
Expected: 200 OK
Interval: 30 seconds
Timeout: 5 seconds
Unhealthy threshold: 3
Healthy threshold: 2
```

#### 9. DNS Configuration

```
# MX records for bounce/complaint notifications
yourdomain.com.  MX 10 inbound-smtp.us-east-1.amazonaws.com

# SPF record
yourdomain.com.  TXT "v=spf1 include:amazonses.com ~all"

# DKIM (from SES console)
xyz._domainkey.yourdomain.com  TXT "p=MIGfMA0GCSq..."

# DMARC
_dmarc.yourdomain.com.  TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

#### 10. SSL/TLS

```bash
# Let's Encrypt with Certbot
certbot --nginx -d api.yourdomain.com

# Or use load balancer SSL termination (recommended)
```

### Post-Deployment

#### Verify Deployment

```bash
# Health check
curl https://api.yourdomain.com/api/email/health

# Send test email
curl -X POST https://api.yourdomain.com/api/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "welcome",
    "toAddress": "test@example.com",
    "templateData": {"userName": "Test"}
  }'

# Check logs
tail -f /var/log/email-backend/app.log

# Monitor queue
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123/prod-email-queue \
  --attribute-names All
```

#### Initialize Configuration

```bash
curl -X POST https://api.yourdomain.com/api/email/config/initialize \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Create Admin User

```bash
# Assign email admin permissions to user
curl -X POST https://api.yourdomain.com/api/iam/users/{userId}/permission-sets \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissionSetId": "email-admin-set-id"}'
```

### Scaling Considerations

**Backend Scaling:**
- Horizontal: Add more app instances (stateless)
- Vertical: Increase instance resources (memory, CPU)
- Database: Use connection pooling, read replicas

**Worker Scaling:**
- Standalone: Add more worker processes
- Lambda: Auto-scales automatically
- Concurrency: Increase per-worker concurrency

**Database Scaling:**
- Use connection pooling
- Add indexes on frequently queried columns
- Archive old logs to separate table
- Use database read replicas for analytics

**SES Scaling:**
- Request higher sending limits from AWS
- Use multiple AWS accounts for very high volume
- Monitor sending quota and adjust rate limits

---

## Monitoring & Logging

### Application Logs

**Log Levels:**
- `error` - Errors requiring attention
- `warn` - Warnings and anomalies
- `info` - Important events
- `debug` - Detailed debugging (dev only)

**Log Structure:**
```json
{
  "level": "info",
  "time": "2025-11-21T12:00:00.000Z",
  "msg": "Email sent successfully",
  "templateName": "welcome",
  "toAddress": "user@example.com",
  "messageId": "01000193...",
  "logId": "550e8400..."
}
```

**Key Events Logged:**
- Email sent (success/failure)
- Queue operations (enqueue, dequeue)
- Template rendering
- Configuration changes
- Permission checks
- Retry attempts
- Bounce/complaint processing

### Database Monitoring

**Important Queries:**

```sql
-- Failed emails in last hour
SELECT COUNT(*) FROM email_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Success rate (last 24h)
SELECT
  COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*) as success_rate
FROM email_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Queue backlog
SELECT COUNT(*) FROM email_logs
WHERE status = 'queued';

-- Top failing templates
SELECT
  template_name,
  COUNT(*) as fail_count
FROM email_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY template_name
ORDER BY fail_count DESC
LIMIT 10;

-- Bounce rate
SELECT
  COUNT(*) FILTER (WHERE status = 'bounced') * 100.0 / COUNT(*) as bounce_rate
FROM email_logs
WHERE created_at > NOW() - INTERVAL '30 days';
```

### AWS CloudWatch Metrics

**SES Metrics:**
- `Send` - Emails sent
- `Delivery` - Successful deliveries
- `Bounce` - Bounced emails
- `Complaint` - Spam complaints
- `Reject` - Rejected by SES

**SQS Metrics:**
- `ApproximateNumberOfMessagesVisible` - Queue depth
- `ApproximateAgeOfOldestMessage` - Processing lag
- `NumberOfMessagesSent` - Enqueue rate
- `NumberOfMessagesDeleted` - Process rate

**Custom Metrics:**

```typescript
// Publish custom metric
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({});

await cloudwatch.putMetricData({
  Namespace: 'EmailSystem',
  MetricData: [
    {
      MetricName: 'EmailsSent',
      Value: 1,
      Unit: 'Count',
      Timestamp: new Date(),
    },
  ],
});
```

### Alerting

**CloudWatch Alarms:**

```bash
# High queue depth
aws cloudwatch put-metric-alarm \
  --alarm-name email-queue-high-depth \
  --metric-name ApproximateNumberOfMessagesVisible \
  --namespace AWS/SQS \
  --statistic Average \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123:email-alerts

# High failure rate
# (Custom metric based on database query)

# Old messages in queue
aws cloudwatch put-metric-alarm \
  --alarm-name email-queue-old-messages \
  --metric-name ApproximateAgeOfOldestMessage \
  --namespace AWS/SQS \
  --statistic Maximum \
  --period 300 \
  --threshold 900 \
  --comparison-operator GreaterThanThreshold
```

**Application Alerts:**

```typescript
// Alert on high failure rate
const failureRate = failedCount / totalCount;
if (failureRate > 0.05) {  // 5% threshold
  await sendAlert({
    type: 'high_failure_rate',
    rate: failureRate,
    period: 'last_hour',
  });
}
```

### Performance Monitoring

**Key Metrics:**
- Email send latency (API response time)
- Template render time
- Queue processing time (enqueue to send)
- Database query performance
- Worker throughput (emails/minute)

**APM Tools:**
- New Relic
- Datadog
- AWS X-Ray
- Custom instrumentation

**Example Instrumentation:**

```typescript
import { logger } from './shared/utils/logger';

async function sendEmail(...) {
  const startTime = Date.now();

  try {
    // ... send email ...

    const duration = Date.now() - startTime;
    logger.info({
      msg: 'Email sent',
      duration,
      template: templateName,
    });

    // Track metric
    await trackMetric('email.send.duration', duration);
  } catch (error) {
    // ... error handling ...
  }
}
```

---

## Troubleshooting

### Common Issues

#### Issue: Email not sending

**Symptoms:**
- API returns success but email not received
- No errors in logs

**Diagnosis:**
```bash
# 1. Check email logs
curl http://localhost:3000/api/email/logs/{logId} \
  -H "Authorization: Bearer $TOKEN"

# 2. Check SES sending statistics
aws ses get-send-statistics

# 3. Check bounce list
SELECT * FROM email_bounces WHERE email_address = 'user@example.com';
```

**Solutions:**
- Verify SES email/domain is verified
- Check if recipient is in bounce list
- Verify AWS credentials are correct
- Check SES is not in sandbox mode (or recipient is verified)
- Review SES sending quota

---

#### Issue: High failure rate

**Symptoms:**
- Many emails failing
- Error messages in logs

**Diagnosis:**
```sql
-- Get recent failures with errors
SELECT
  template_name,
  error_message,
  COUNT(*) as count
FROM email_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY template_name, error_message
ORDER BY count DESC;
```

**Common Causes:**
- Invalid template syntax (check error_message)
- Missing template variables
- AWS credentials expired
- SES rate limit exceeded
- Invalid email addresses

**Solutions:**
- Fix template syntax errors
- Validate template data before sending
- Rotate AWS credentials
- Adjust rate limiting
- Validate email addresses with Zod

---

#### Issue: Queue backlog growing

**Symptoms:**
- Messages accumulating in SQS
- Slow email delivery

**Diagnosis:**
```bash
# Check queue depth
aws sqs get-queue-attributes \
  --queue-url $EMAIL_QUEUE_URL \
  --attribute-names ApproximateNumberOfMessagesVisible

# Check worker status
pm2 status  # If using PM2
kubectl get pods  # If using Kubernetes
```

**Solutions:**
- Increase worker concurrency
- Add more worker instances
- Check for worker crashes (restart)
- Review slow database queries
- Increase SES rate limit

---

#### Issue: Template rendering fails

**Symptoms:**
- Error: "Failed to render template"
- Specific template always fails

**Diagnosis:**
```bash
# Test template rendering
npm run email:test -- --template problematic-template --dry-run

# Validate template
npm run email:validate-templates -- --template problematic-template --verbose
```

**Common Causes:**
- TypeScript syntax errors
- Missing React Email imports
- Invalid JSX
- Missing template data
- Circular dependencies

**Solutions:**
- Fix syntax errors
- Import required components
- Validate JSX structure
- Provide all required template data
- Check template dependencies

---

#### Issue: Permission denied

**Symptoms:**
- 403 Forbidden responses
- "Access Denied" in Admin UI

**Diagnosis:**
```bash
# Check user's IAM permissions
curl http://localhost:3000/api/iam/users/{userId}/effective-permissions \
  -H "Authorization: Bearer $TOKEN"

# Check if email features are seeded
npx tsx src/features/email/seed-email-features.ts list
```

**Solutions:**
- Seed email features if missing
- Assign appropriate permission sets to user
- Verify user belongs to correct company
- Check super admin status if applicable

---

#### Issue: Configuration not taking effect

**Symptoms:**
- Changed config but no effect
- Wrong value being used

**Diagnosis:**
```bash
# Check effective configuration
curl http://localhost:3000/api/email/config/{KEY} \
  -H "Authorization: Bearer $TOKEN"

# Check all tiers
curl http://localhost:3000/api/email/config \
  -H "Authorization: Bearer $TOKEN"
```

**Solutions:**
- Verify config tier precedence (DB > Env > Default)
- Restart backend if changed env vars
- Check database config overrides
- Clear config cache (if implemented)

---

#### Issue: Worker not processing messages

**Symptoms:**
- Messages stuck in queue
- Worker running but no activity

**Diagnosis:**
```bash
# Check worker logs
pm2 logs email-worker  # PM2
kubectl logs deployment/email-worker  # Kubernetes
docker logs email-worker  # Docker

# Check SQS visibility timeout
aws sqs get-queue-attributes \
  --queue-url $EMAIL_QUEUE_URL \
  --attribute-names VisibilityTimeout
```

**Common Causes:**
- Worker crashed/stopped
- Database connection lost
- AWS credentials expired
- Network issues
- Visibility timeout too low

**Solutions:**
- Restart worker process
- Check database connectivity
- Refresh AWS credentials
- Verify network connectivity
- Increase visibility timeout (180s recommended)

---

### Debug Mode

Enable debug logging:

```bash
# Environment variable
LOG_LEVEL=debug npm run dev

# Or in code
logger.level = 'debug';
```

Debug logs include:
- Detailed request/response data
- AWS SDK calls
- Database queries
- Template rendering steps
- Permission checks

### Getting Help

1. **Check logs** - Application and AWS CloudWatch
2. **Review metrics** - Database queries and CloudWatch
3. **Test components** - Use developer tools
4. **Consult docs** - This guide and code comments
5. **Open issue** - GitHub repository (if applicable)

---

## Best Practices

### Template Development

- Use TypeScript for type safety
- Define clear prop interfaces
- Provide comprehensive sample data
- Keep templates under 100KB
- Use semantic HTML
- Add alt text to images
- Test in multiple email clients
- Use HTTPS for all links
- Include unsubscribe link
- Validate with `email:validate-templates`

### Sending Emails

- Always validate input with Zod schemas
- Check bounce list before sending
- Use queue mode for bulk sending
- Include reply-to address
- Set appropriate from name
- Use descriptive subjects
- Monitor send rate
- Log all sends for audit
- Handle errors gracefully
- Implement retry logic

### Configuration Management

- Use database config for production runtime changes
- Use environment variables for deployment-specific values
- Use defaults for development
- Document all configuration keys
- Validate config values before use
- Monitor config changes (audit log)
- Back up database config
- Test config changes in staging first

### Security

- Always require authentication
- Use IAM for authorization
- Validate all input data
- Sanitize user-provided content
- Use parameterized database queries
- Rotate AWS credentials regularly
- Use least-privilege IAM policies
- Enable SES DKIM/SPF
- Monitor for unauthorized access
- Audit permission changes

### Performance

- Use queue mode for high volume
- Scale workers horizontally
- Use database connection pooling
- Add indexes on frequently queried columns
- Archive old logs periodically
- Monitor database query performance
- Cache frequently accessed config
- Optimize template render performance
- Use CDN for email images
- Monitor SES sending quota

### Monitoring

- Log all significant events
- Set up CloudWatch alarms
- Monitor queue depth
- Track failure rates
- Alert on high bounce rates
- Monitor database performance
- Track worker throughput
- Review logs regularly
- Set up dashboards
- Test alerting systems

### Maintenance

- Archive logs older than 90 days
- Clean up bounce list periodically
- Review and update templates
- Audit IAM permissions quarterly
- Update dependencies regularly
- Back up database
- Test disaster recovery
- Review and update documentation
- Monitor AWS service limits
- Plan for scaling needs

---

## Examples & Tutorials

### Example 1: Send Welcome Email on User Registration

```typescript
// src/features/users/users.service.ts
import { EmailService } from '../email/email.service';

export class UsersService {
  private emailService = new EmailService();

  async createUser(userData: CreateUserDto) {
    // Create user
    const user = await db.users.create(userData);

    // Send welcome email
    await this.emailService.sendEmail({
      templateName: 'welcome',
      toAddress: user.email,
      templateData: {
        userName: user.name,
        companyName: user.company.name,
        loginUrl: `${process.env.APP_URL}/login`,
      },
    });

    return user;
  }
}
```

---

### Example 2: Send Password Reset Email

```typescript
// src/features/auth/auth.service.ts
import { EmailService } from '../email/email.service';
import { generateResetToken } from './utils';

export class AuthService {
  private emailService = new EmailService();

  async requestPasswordReset(email: string) {
    // Find user
    const user = await db.users.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = generateResetToken();
    await db.passwordResetTokens.create({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    });

    // Send reset email
    await this.emailService.sendEmail({
      templateName: 'password-reset',
      toAddress: user.email,
      templateData: {
        userName: user.name,
        resetUrl: `${process.env.APP_URL}/reset-password?token=${resetToken}`,
        expiryTime: '1 hour',
      },
    });
  }
}
```

---

### Example 3: Send Bulk Notification Emails

```typescript
// src/features/notifications/notifications.service.ts
import { EmailService } from '../email/email.service';

export class NotificationsService {
  private emailService = new EmailService();

  async sendProductLaunchNotification(productId: string) {
    // Get product details
    const product = await db.products.findById(productId);

    // Get all active users
    const users = await db.users.findActive();

    // Prepare bulk emails
    const emails = users.map(user => ({
      templateName: 'product-launch',
      toAddress: user.email,
      templateData: {
        userName: user.name,
        productName: product.name,
        productDescription: product.description,
        productUrl: `${process.env.APP_URL}/products/${product.id}`,
        launchDate: product.launchDate.toISOString(),
      },
    }));

    // Send in batches
    const batchSize = 100;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await this.emailService.sendBulkEmail({ emails: batch });

      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

---

### Example 4: Create Custom Template Programmatically

```typescript
// src/features/marketing/marketing.service.ts
import { TemplateService } from '../email/template.service';

export class MarketingService {
  private templateService = new TemplateService();

  async createCampaignTemplate(campaignName: string) {
    // Template code
    const templateCode = `
import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

interface ${campaignName}EmailProps {
  userName: string;
  campaignTitle: string;
  campaignUrl: string;
}

export default function ${campaignName}Email({
  userName,
  campaignTitle,
  campaignUrl,
}: ${campaignName}EmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc' }}>
        <Container>
          <Text>Hi {userName},</Text>
          <Text>{campaignTitle}</Text>
          <Button href={campaignUrl}>Learn More</Button>
        </Container>
      </Body>
    </Html>
  );
}
`;

    // Create template
    const template = await this.templateService.createTemplate({
      name: campaignName.toLowerCase().replace(/\s+/g, '-'),
      subject: `${campaignName} - Special Offer`,
      category: 'marketing',
      templateCode,
      status: 'draft',
    });

    return template;
  }
}
```

---

### Example 5: Monitor Email Delivery

```typescript
// src/features/analytics/email-analytics.service.ts
import { db } from '../../shared/db';

export class EmailAnalyticsService {
  async getDeliveryStats(startDate: Date, endDate: Date) {
    const logs = await db.emailLogs.findByDateRange(startDate, endDate);

    const stats = {
      total: logs.length,
      sent: logs.filter(l => l.status === 'sent').length,
      failed: logs.filter(l => l.status === 'failed').length,
      queued: logs.filter(l => l.status === 'queued').length,
      bounced: logs.filter(l => l.status === 'bounced').length,
    };

    stats.successRate = stats.sent / stats.total;
    stats.failureRate = stats.failed / stats.total;
    stats.bounceRate = stats.bounced / stats.total;

    return stats;
  }

  async getTemplatePerformance() {
    const results = await db.query(`
      SELECT
        template_name,
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE status = 'sent') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
        AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_delivery_time
      FROM email_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY template_name
      ORDER BY total_sent DESC
    `);

    return results;
  }
}
```

---

### Example 6: Handle Email Bounces

```typescript
// src/features/email/webhooks/ses-webhook.handler.ts
import { ComplianceService } from '../compliance.service';

export class SESWebhookHandler {
  private complianceService = new ComplianceService();

  async handleBounce(notification: any) {
    const bounce = notification.bounce;

    for (const recipient of bounce.bouncedRecipients) {
      await this.complianceService.processBounce({
        emailAddress: recipient.emailAddress,
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
        diagnosticCode: recipient.diagnosticCode,
        timestamp: new Date(notification.mail.timestamp),
      });
    }
  }

  async handleComplaint(notification: any) {
    const complaint = notification.complaint;

    for (const recipient of complaint.complainedRecipients) {
      await this.complianceService.processComplaint({
        emailAddress: recipient.emailAddress,
        complaintFeedbackType: complaint.complaintFeedbackType,
        timestamp: new Date(notification.mail.timestamp),
      });
    }
  }
}
```

---

## FAQ

### General Questions

**Q: Can I use this with non-AWS email providers?**
A: The system is built for AWS SES, but you could adapt the `email.service.ts` to use other providers (SendGrid, Mailgun, etc.) by implementing a provider interface.

**Q: Is this production-ready?**
A: Yes. The system has 200+ tests, comprehensive error handling, IAM integration, and is designed for production use.

**Q: Can I customize the Admin UI?**
A: Yes. The frontend is built with React and Tailwind CSS. You can modify components in `repos/frontend/src/features/email/ui/`.

**Q: How do I migrate from another email system?**
A: Export your templates to React Email format, import historical logs to the database, and update your application code to use the new EmailService API.

---

### Configuration Questions

**Q: What's the configuration precedence order?**
A: Database (highest) > Environment Variables > Code Defaults (lowest)

**Q: Can I change configuration without restarting?**
A: Yes, for database-level configuration. Environment variable changes require a restart.

**Q: How do I reset configuration to defaults?**
A: Delete the database override using the DELETE /api/email/config/:key endpoint or Admin UI.

---

### Template Questions

**Q: Can I use HTML templates instead of React Email?**
A: No, the system uses React Email for type safety and component reusability. You can convert HTML to React Email components.

**Q: How do I add custom styles?**
A: Use inline styles (CSS-in-JS objects) in your React Email templates. External stylesheets are not supported by most email clients.

**Q: Can I use custom fonts?**
A: Yes, but use web-safe fonts or import from Google Fonts with `@import` in `<Head>`.

**Q: How do I version templates?**
A: Versions are created automatically when you update a template. Use the rollback feature to revert.

---

### Sending Questions

**Q: What's the difference between direct and queued sending?**
A: Direct send blocks the API response until SES responds. Queued send returns immediately and processes async via workers.

**Q: How do I send to multiple recipients?**
A: Use the bulk send endpoint or loop through recipients and call send for each (respecting rate limits).

**Q: Can I send attachments?**
A: Not currently supported. AWS SES supports attachments via raw email, but this system focuses on transactional templates.

**Q: How do I handle unsubscribes?**
A: Implement an unsubscribe link in templates that calls your unsubscribe endpoint, which adds to suppression list.

---

### Queue Questions

**Q: Which worker pattern should I use?**
A:
- Standalone: Best for high volume, dedicated resources
- Embedded: Best for low/medium volume, simpler deployment
- Lambda: Best for variable load, serverless architecture

**Q: How many workers should I run?**
A: Start with 1-2 and scale based on queue depth and throughput requirements.

**Q: What happens if a worker crashes?**
A: Messages remain in SQS and will be processed by other workers or when the crashed worker restarts.

**Q: How do I handle poison messages?**
A: Configure a Dead Letter Queue (DLQ) with maxReceiveCount. Failed messages move to DLQ after max retries.

---

### IAM Questions

**Q: Can regular users send emails?**
A: Only if they have the `feature_email_send:Send` permission via their IAM level.

**Q: How do I give someone admin access?**
A: Assign them a permission set with all email feature actions.

**Q: What's the difference between super admin and email admin?**
A: Super admin bypasses ALL permission checks. Email admin has permissions for email features specifically.

**Q: Can I create custom permission combinations?**
A: Yes, create custom permission sets with any combination of email features and actions.

---

### Performance Questions

**Q: What's the maximum sending rate?**
A: Limited by AWS SES quota (default 14 emails/second, 50,000/day). Request increases from AWS.

**Q: How do I optimize for high volume?**
A: Use queue mode, scale workers horizontally, increase SES quota, use database connection pooling.

**Q: Can I send millions of emails per day?**
A: Yes, with proper scaling: multiple workers, database optimization, increased SES quota.

**Q: What's the average email delivery time?**
A: Direct send: ~500ms. Queued send: 5-30 seconds depending on queue depth and worker count.

---

### Troubleshooting Questions

**Q: Why are my emails going to spam?**
A: Configure SPF, DKIM, and DMARC records. Avoid spam trigger words. Maintain low bounce/complaint rates.

**Q: Why can't I send to certain addresses?**
A: Check if addresses are in bounce list. In sandbox mode, only verified addresses work.

**Q: How do I debug failed emails?**
A: Check email logs via API or Admin UI. Review error_message field for details.

**Q: Why is my queue growing?**
A: Workers may be slow or crashed. Check worker status and scale if needed.

---

## Appendix

### Email Templates Reference

| Template | Category | Variables | Purpose |
|----------|----------|-----------|---------|
| `welcome` | onboarding | userName, companyName, loginUrl | Welcome new users |
| `password-reset` | email | userName, resetUrl, expiryTime | Password reset |
| `email-verification` | email | userName, verificationUrl, code | Email verification |
| `team-invitation` | iam | inviterName, inviteeName, teamName, acceptUrl | Team invitations |
| `user-level-assignment` | iam | userName, levelName, assignedBy, permissionSummary | Level changes |
| `permission-changes` | iam | userName, changes[], changedBy, effectiveDate | Permission updates |

### Configuration Keys Reference

See [Configuration](#configuration) section for complete list.

### API Endpoints Quick Reference

**Email Sending:**
- `POST /api/email/send` - Send single
- `POST /api/email/send/bulk` - Send bulk
- `GET /api/email/health` - Health check

**Templates:**
- `GET /api/email/templates` - List
- `GET /api/email/templates/:id` - Get by ID
- `POST /api/email/templates` - Create
- `PUT /api/email/templates/:id` - Update
- `POST /api/email/templates/:id/publish` - Publish
- `POST /api/email/templates/:id/archive` - Archive
- `POST /api/email/templates/:id/clone` - Clone
- `GET /api/email/templates/:id/versions` - Versions
- `POST /api/email/templates/:id/rollback` - Rollback
- `POST /api/email/templates/preview` - Preview

**Logs:**
- `GET /api/email/logs` - List
- `GET /api/email/logs/:id` - Get by ID
- `POST /api/email/logs/:id/retry` - Retry
- `DELETE /api/email/logs/:id` - Delete
- `GET /api/email/stats` - Statistics

**Config:**
- `GET /api/email/config` - List all
- `GET /api/email/config/:key` - Get by key
- `POST /api/email/config` - Create
- `PUT /api/email/config/:key` - Update
- `DELETE /api/email/config/:key` - Delete
- `POST /api/email/config/initialize` - Initialize
- `GET /api/email/config/meta/categories` - Categories

### Glossary

- **React Email** - Framework for building email templates with React
- **SES** - Amazon Simple Email Service
- **SQS** - Amazon Simple Queue Service
- **IAM** - Identity and Access Management
- **DLQ** - Dead Letter Queue
- **Bounce** - Failed delivery (hard/soft)
- **Complaint** - Spam report
- **Template** - Email design with variables
- **Queue Mode** - Async email processing
- **Direct Send** - Immediate delivery
- **Worker** - Process that sends queued emails
- **Suppression List** - Emails to avoid (bounces)

---

## Conclusion

The Email System is a comprehensive, production-ready solution for transactional email in SaaS applications. With 200+ tests, IAM integration, comprehensive Admin UI, and powerful developer tools, it provides everything needed for reliable email delivery at scale.

**Key Takeaways:**

- **Flexible Configuration** - 3-tier precedence for runtime changes
- **Scalable Workers** - 3 deployment patterns for any architecture
- **Type-Safe Templates** - React Email with full TypeScript support
- **Complete Monitoring** - Comprehensive logging and CloudWatch integration
- **Self-Service Admin** - Non-developers can manage templates and config
- **Developer Productivity** - 5 tools for 10x faster development
- **Production Ready** - Battle-tested with comprehensive test coverage

**Next Steps:**

1. Complete [installation](#installation--setup)
2. Send your first email
3. Create custom templates
4. Set up queue workers
5. Configure monitoring
6. Deploy to production

For issues or questions, consult the [Troubleshooting](#troubleshooting) section or review the [FAQ](#faq).

---

**Document Version:** 1.0
**Last Updated:** 2025-11-21
**Maintained By:** Engineering Team
