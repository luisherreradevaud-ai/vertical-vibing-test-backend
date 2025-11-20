# Email System Developer Tools

Comprehensive developer tools for the Email System that enhance the email template development experience.

## Overview

This directory contains 5 production-ready developer tools for working with email templates:

1. **Preview Server** - Hot-reloading browser preview of email templates
2. **Template Generator** - Interactive CLI to scaffold new templates
3. **Email Tester** - Send test emails or dry-run with rendering only
4. **Template Validator** - Validate templates for common issues
5. **Template Lister** - List all available templates with metadata

## Tools

### 1. Email Template Preview Server

Interactive web-based preview server for testing email templates in real-time.

**Features:**
- Hot-reloading development server
- Visual preview of all templates
- Interactive template selector
- Live variable editing (coming soon)
- View HTML source
- Support for all system templates
- Beautiful UI with gradient design

**Usage:**

```bash
# Start preview server (default port 3050)
npm run email:preview

# Custom port
npm run email:preview -- --port 3100
```

**Access:**
- Open browser: `http://localhost:3050`
- Select template from grid
- View rendered email
- Toggle between visual and HTML source views

**Preview URLs:**
```
http://localhost:3050/                          # Template gallery
http://localhost:3050/preview/welcome           # Preview welcome template
http://localhost:3050/preview/password-reset    # Preview password-reset template
```

**API Endpoints:**
```bash
# Render template with custom data
curl -X POST http://localhost:3050/api/render/welcome \
  -H "Content-Type: application/json" \
  -d '{"userName": "John", "companyName": "Acme", "loginUrl": "https://app.com"}'
```

**Screenshot:**
```
┌─────────────────────────────────────────────────────┐
│   📧 Email Template Preview                         │
│   Click on any template to preview it               │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Welcome  │  │ Password │  │  Email   │          │
│  │  Email   │  │  Reset   │  │Verification│        │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │   Team   │  │   User   │  │Permission│          │
│  │Invitation│  │  Level   │  │ Changes  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

---

### 2. Template Generator CLI

Interactive CLI tool to scaffold new email templates with proper structure.

**Features:**
- Interactive prompts for all template metadata
- Auto-generates React Email template file
- Creates TypeScript interfaces
- Adds template to index.ts exports
- Generates sample data file (.sample.json)
- Validates input (kebab-case naming, etc.)
- Supports multiple variable types
- Professional terminal UI with colors

**Usage:**

```bash
# Start interactive generator
npm run email:generate-template
```

**Interactive Flow:**

1. **Basic Info:**
   - Template name (kebab-case)
   - Category (transactional, marketing, notification, system, other)
   - Description
   - Subject line

2. **Variables:**
   - Variable name
   - Type (string, number, boolean, array, object, date)
   - Required or optional
   - Description
   - Default value (for optional variables)
   - Repeat for all variables

3. **Confirmation:**
   - Review summary
   - Confirm to generate

**Example Session:**

```
📧 Email Template Generator
Create a new React Email template with proper structure

? Template name (use kebab-case): order-confirmation
? Template category: transactional
? Brief description: Order confirmation email with receipt
? Email subject line: Your order has been confirmed

Now let's define the template variables...

? Variable name (1): customerName
? Variable type: string
? Is this variable required? Yes
? Variable description: Customer's full name
? Add another variable? Yes

? Variable name (2): orderNumber
? Variable type: string
? Is this variable required? Yes
? Variable description: Unique order number
? Add another variable? Yes

? Variable name (3): orderTotal
? Variable type: number
? Is this variable required: Yes
? Variable description: Total order amount
? Add another variable? No

Summary:
──────────────────────────────────────────────────────
Name: order-confirmation
Category: transactional
Description: Order confirmation email with receipt
Subject: Your order has been confirmed
Variables: 3
  1. customerName (string)* - Customer's full name
  2. orderNumber (string)* - Unique order number
  3. orderTotal (number)* - Total order amount
──────────────────────────────────────────────────────

? Generate template with these settings? Yes

✓ Template files generated successfully!

✓ Template Created

Files created:
  - templates/order-confirmation.tsx
  - templates/order-confirmation.sample.json
  - templates/index.ts (updated)

Next steps:
  1. Edit templates/order-confirmation.tsx to customize the template
  2. Test the template: npm run email:preview
  3. Preview at: http://localhost:3050/preview/order-confirmation
```

**Generated Files:**

1. **Template File** (`templates/order-confirmation.tsx`):
   - React Email component with proper structure
   - TypeScript interface for props
   - Default values for optional props
   - Professional email styles
   - TODO comments for customization

2. **Sample Data** (`templates/order-confirmation.sample.json`):
   - JSON file with sample data for all variables
   - Used by preview server and tester
   - Includes metadata (description, category, variables)

3. **Updated Index** (`templates/index.ts`):
   - Added export for new template
   - Added to EMAIL_TEMPLATES registry

---

### 3. Email Tester CLI

Interactive CLI to send test emails or render templates without sending.

**Features:**
- Interactive template selection
- Load sample data automatically
- Edit template data before sending
- Dry-run mode (render without sending)
- Send to test email addresses
- Save rendered HTML to file
- Support for command-line arguments
- JSON data editor

**Usage:**

```bash
# Interactive mode
npm run email:test

# Dry run with specific template
npm run email:test -- --template welcome --dry-run

# Send to specific email
npm run email:test -- --template welcome --to test@example.com

# Dry run and save HTML
npm run email:test -- --template password-reset --dry-run --save
```

**Interactive Flow:**

1. **Select Template:**
   - Choose from available templates

2. **Review Sample Data:**
   - View loaded sample data
   - Choose to edit or keep

3. **Edit Data (Optional):**
   - Edit individual fields
   - Paste JSON
   - Keep current data

4. **Choose Test Mode:**
   - Dry run (render only)
   - Send test email

5. **Configure (if sending):**
   - Enter recipient email address

6. **Execute:**
   - Render template
   - Send email (if not dry-run)
   - Display results

**Example Session:**

```
📧 Email Tester
Test email templates by rendering or sending them

? Select email template to test: Welcome Email

✓ Template data loaded

Current template data:
{
  "userName": "John Doe",
  "companyName": "Acme Corp",
  "loginUrl": "https://app.example.com/login"
}

? Would you like to edit the template data? Yes
? How would you like to edit the data? Edit individual fields

? userName: Jane Smith
? companyName: Test Company
? loginUrl: https://test.example.com/login

? Test mode: Send test email
? Recipient email address: developer@test.com

✓ Template rendered successfully
✓ Email sent successfully!

✓ Email Sent

Template: welcome
To: developer@test.com
Size: 3.2KB
```

**Dry Run Example:**

```
📧 Email Tester

? Select email template to test: Password Reset
✓ Template data loaded
? Would you like to edit the template data? No
? Test mode: Dry run (render only, no email sent)
? Save rendered HTML to file? Yes

✓ Template rendered successfully

✓ Dry Run Complete

Template: password-reset
HTML Size: 4156 bytes
Saved to: /temp/email-previews/password-reset-2025-11-20T10-30-45-123Z.html
  Open in browser: file:///temp/email-previews/password-reset-2025-11-20T10-30-45-123Z.html

Preview first 500 characters:
──────────────────────────────────────────────────────
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Password Reset</title></head><body>...
──────────────────────────────────────────────────────
```

**Command-Line Arguments:**

```bash
--template <name>    # Skip template selection
--dry-run            # Render only, don't send
--to <email>         # Recipient email address
--save               # Save HTML to file (dry-run only)
```

---

### 4. Template Validator

Validate all email templates for common issues and best practices.

**Features:**
- Validates all templates or specific template
- Checks for required components (Html, Head, Body)
- Validates TypeScript interfaces
- Checks for missing variables
- Renders templates to catch errors
- Validates HTML structure
- Detects broken links and images
- Checks email best practices
- Performance warnings (file size)
- Detailed validation report
- Exit codes for CI/CD integration

**Usage:**

```bash
# Validate all templates
npm run email:validate-templates

# Validate specific template
npm run email:validate-templates -- --template welcome

# Verbose output
npm run email:validate-templates -- --verbose
```

**Validation Checks:**

1. **File Structure:**
   - Template file exists
   - TypeScript syntax valid
   - Required imports present

2. **Code Quality:**
   - Props interface defined
   - Default export present
   - Variable definitions

3. **Sample Data:**
   - Sample data file exists
   - All variables have sample values

4. **Rendering:**
   - Template renders without errors
   - HTML output is not empty
   - Render time tracking

5. **HTML Structure:**
   - DOCTYPE declaration
   - Required HTML tags (html, head, body)
   - Valid HTML syntax

6. **Links & Images:**
   - HTTP links (should be HTTPS)
   - Localhost URLs
   - Example domain links
   - Relative image URLs

7. **Best Practices:**
   - Email size (< 100KB recommended)
   - Inline styles vs style tags
   - Mobile responsiveness hints

**Example Output:**

```
📧 Email Template Validator
Validating email templates for common issues

Validating templates: 6

📋 Validation Results

Summary:
────────────────────────────────────────────────────────────
Total Templates: 6
Valid Templates: 5
Invalid Templates: 1
Errors: 2
Warnings: 4
Info: 3
────────────────────────────────────────────────────────────

✓ welcome
  Render time: 145ms
  HTML size: 3.21KB

✓ password-reset
  Render time: 132ms
  HTML size: 4.15KB
  ⚠ [Links] Example domain detected: https://app.example.com/reset

✓ email-verification
  Render time: 128ms
  HTML size: 3.98KB

✗ team-invitation
  Render time: 0ms
  HTML size: 0KB
  ✗ [Structure] Missing required component: Body
  ✗ [Rendering] Template rendered to empty HTML
  ⚠ [Sample Data] No sample data file found (.sample.json)

✓ user-level-assignment
  Render time: 156ms
  HTML size: 5.43KB
  ⚠ [Performance] Large HTML size: 5.43KB (recommended: <100KB)

✓ permission-changes
  Render time: 149ms
  HTML size: 4.87KB
  ℹ [Variables] Found 6 variables: userName, changedBy, companyName, ...

❌ Validation failed with errors
```

**Verbose Mode:**

Includes additional details:
- Full file paths
- Complete variable lists
- All links and images found
- Detailed error traces

**Exit Codes:**

```
0 - All templates valid (warnings OK)
1 - One or more templates have errors
```

**CI/CD Integration:**

```yaml
# .github/workflows/validate-emails.yml
name: Validate Email Templates

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run email:validate-templates
```

---

### 5. Template Lister

Display all available email templates with metadata.

**Features:**
- Lists all templates in organized table
- Shows variables count
- Indicates sample data availability
- Displays file size
- Category information
- Detailed descriptions
- JSON output option

**Usage:**

```bash
# List all templates (table format)
npm run email:list-templates

# JSON output
npm run email:list-templates -- --json
```

**Example Output:**

```
📧 Available Email Templates

Name                          Category          Vars    Sample    Size
────────────────────────────────────────────────────────────────────────────────
Welcome                       transactional     3       Yes       2.7KB
Password Reset                transactional     4       Yes       3.4KB
Email Verification            transactional     4       Yes       4.0KB
Team Invitation              transactional     6       Yes       3.9KB
User Level Assignment         transactional     6       Yes       4.4KB
Permission Changes            transactional     6       Yes       5.4KB
────────────────────────────────────────────────────────────────────────────────
Total: 6 templates

Details:

welcome:
  Welcome to {companyName} - Let's get started!
  File: templates/welcome.tsx
  Sample: templates/welcome.sample.json

password-reset:
  Password reset request email
  File: templates/password-reset.tsx
  Sample: templates/password-reset.sample.json

email-verification:
  Email address verification
  File: templates/email-verification.tsx
  Sample: templates/email-verification.sample.json

team-invitation:
  Team invitation email
  File: templates/team-invitation.tsx
  Sample: templates/team-invitation.sample.json

user-level-assignment:
  User level assignment notification
  File: templates/user-level-assignment.tsx
  Sample: templates/user-level-assignment.sample.json

permission-changes:
  Permission changes notification
  File: templates/permission-changes.tsx
  Sample: templates/permission-changes.sample.json
```

**JSON Output:**

```bash
npm run email:list-templates -- --json
```

```json
[
  {
    "name": "Welcome",
    "fileName": "welcome",
    "description": "Welcome to {companyName} - Let's get started!",
    "category": "transactional",
    "variables": 3,
    "hasSampleData": true,
    "fileSize": 2716
  },
  {
    "name": "Password Reset",
    "fileName": "password-reset",
    "description": "Password reset request email",
    "category": "transactional",
    "variables": 4,
    "hasSampleData": true,
    "fileSize": 3408
  }
]
```

---

## File Structure

```
dev-tools/
├── README.md                   # This file
├── preview-server.ts           # Preview server (420 lines)
├── template-generator.ts       # Template generator CLI (450 lines)
├── email-tester.ts             # Email tester CLI (380 lines)
├── template-validator.ts       # Template validator (520 lines)
└── list-templates.ts           # Template lister (180 lines)
```

**Total:** ~2,000 lines of production-ready TypeScript

---

## Common Workflows

### Creating a New Template

```bash
# 1. Generate template scaffold
npm run email:generate-template

# Follow interactive prompts to create:
# - templates/my-template.tsx
# - templates/my-template.sample.json

# 2. Edit the generated template
# Open templates/my-template.tsx and customize

# 3. Preview in browser
npm run email:preview
# Navigate to http://localhost:3050/preview/my-template

# 4. Test with real data
npm run email:test
# Select your template and edit data

# 5. Validate
npm run email:validate-templates -- --template my-template

# 6. Send test email
npm run email:test
# Choose "Send test email" mode
```

### Daily Development

```bash
# Start preview server (keep running)
npm run email:preview

# In another terminal, edit templates
# Browser auto-refreshes on save

# When ready to test:
npm run email:test -- --template my-template --dry-run

# Before committing:
npm run email:validate-templates
```

### Pre-Deployment Checks

```bash
# 1. List all templates
npm run email:list-templates

# 2. Validate all templates
npm run email:validate-templates --verbose

# 3. Test critical templates
npm run email:test -- --template welcome --dry-run
npm run email:test -- --template password-reset --dry-run

# 4. Check file sizes
npm run email:list-templates
```

---

## Best Practices

### Template Development

1. **Always use the generator** for new templates
   - Ensures consistent structure
   - Auto-generates TypeScript interfaces
   - Creates sample data

2. **Create sample data** for all templates
   - Required for preview server
   - Used by tester CLI
   - Helps with validation

3. **Validate frequently**
   - Run validator after changes
   - Fix warnings early
   - Check HTML output

4. **Preview in multiple clients**
   - Use preview server for quick checks
   - Test in actual email clients (Gmail, Outlook, etc.)
   - Check mobile rendering

### Variable Naming

- Use camelCase for variables
- Be descriptive: `userName` not `name`
- Match backend data structure
- Document in interface comments

### Sample Data

- Use realistic values
- Include edge cases (long names, etc.)
- Test with actual production-like data
- Update sample data when template changes

### Performance

- Keep HTML under 100KB
- Optimize images (use CDN)
- Use inline styles (better email client support)
- Avoid large base64 images

---

## Troubleshooting

### Preview Server Won't Start

```bash
# Check if port is in use
lsof -i :3050

# Use different port
npm run email:preview -- --port 3100
```

### Template Not Rendering

```bash
# Check for syntax errors
npm run email:validate-templates -- --template my-template

# Check sample data
cat templates/my-template.sample.json

# Try with minimal data
npm run email:test -- --template my-template --dry-run
```

### Validator Errors

**Error: Template file not found**
- Check file name matches
- Ensure .tsx extension
- File must be in templates/ directory

**Error: Missing required component**
- Add missing import from @react-email/components
- Ensure Html, Head, Body are used

**Error: Failed to render**
- Check for missing required variables
- Verify sample data exists
- Check console for detailed error

### Generator Issues

**Error: Template already exists**
- Use different name
- Delete existing template first
- Check templates/ directory

**Error: Invalid variable name**
- Use camelCase
- Start with letter
- No special characters

---

## Advanced Usage

### Custom Port for Preview Server

```typescript
import { startPreviewServer } from './dev-tools/preview-server';

await startPreviewServer(4000);
```

### Programmatic Validation

```typescript
import { validateTemplate } from './dev-tools/template-validator';

const result = await validateTemplate('welcome', true);

if (!result.valid) {
  console.log('Errors:', result.issues.filter(i => i.level === 'error'));
}
```

### Automated Testing

```typescript
import { testEmail } from './dev-tools/email-tester';

// Dry run for all templates
const templates = ['welcome', 'password-reset', 'email-verification'];

for (const template of templates) {
  await testEmail({
    templateName: template,
    dryRun: true,
    // ... config
  });
}
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Email Templates CI

on:
  pull_request:
    paths:
      - 'src/features/email/templates/**'

jobs:
  validate-templates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Validate templates
        run: npm run email:validate-templates

      - name: List templates
        run: npm run email:list-templates
```

---

## Dependencies

All tools use these dependencies (already installed):

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@react-email/render": "^2.0.0"
  },
  "devDependencies": {
    "inquirer": "^9.0.0",
    "chalk": "^5.0.0",
    "ora": "^7.0.0",
    "@types/inquirer": "^9.0.0"
  }
}
```

---

## Contributing

When adding new developer tools:

1. Follow existing patterns
2. Use TypeScript with strict typing
3. Add colorful CLI output with chalk
4. Include error handling
5. Write clear help text
6. Update this README
7. Add npm script to package.json

---

## Future Enhancements

Potential additions to the developer tools:

- [ ] Template diff viewer (compare versions)
- [ ] Template analytics (track usage)
- [ ] Bulk email sender for load testing
- [ ] Template performance profiler
- [ ] A/B testing framework
- [ ] Template screenshot generator
- [ ] Email client compatibility checker
- [ ] Dark mode support for preview server
- [ ] Live variable editing in preview server
- [ ] Template marketplace/sharing

---

## Support

For issues or questions about developer tools:

1. Check this README first
2. Run validator to diagnose issues
3. Check console output for errors
4. Review template files manually
5. Consult main email system documentation (FEATURE.md)

---

## License

Part of the Vertical Vibing Email System.
