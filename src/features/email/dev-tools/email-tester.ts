#!/usr/bin/env node
/**
 * Email Tester CLI
 *
 * Interactive CLI to send test emails during development.
 * Supports dry-run mode (render without sending) and sending to test addresses.
 *
 * Usage:
 *   npm run email:test
 *   npm run email:test -- --template welcome --dry-run
 *   npm run email:test -- --to test@example.com
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { render } from '@react-email/render';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Available templates
const AVAILABLE_TEMPLATES = [
  'welcome',
  'password-reset',
  'email-verification',
  'team-invitation',
  'user-level-assignment',
  'permission-changes',
];

interface TestEmailConfig {
  templateName: string;
  toAddress: string;
  templateData: Record<string, any>;
  dryRun: boolean;
  saveOutput: boolean;
}

/**
 * Load template component
 */
async function loadTemplate(templateName: string) {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.tsx`);
  try {
    const module = await import(templatePath);
    return module.default || module[Object.keys(module)[0]];
  } catch (error) {
    throw new Error(`Failed to load template: ${templateName}`);
  }
}

/**
 * Load sample data for template
 */
function loadSampleData(templateName: string): Record<string, any> | null {
  const samplePath = path.join(__dirname, '../templates', `${templateName}.sample.json`);
  try {
    if (fs.existsSync(samplePath)) {
      const content = fs.readFileSync(samplePath, 'utf-8');
      const parsed = JSON.parse(content);
      return parsed.sampleData || {};
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not load sample data for ${templateName}`));
  }

  // Fallback sample data
  const fallbackData: Record<string, Record<string, any>> = {
    welcome: {
      userName: 'Test User',
      companyName: 'Test Company',
      loginUrl: 'https://app.example.com/login',
    },
    'password-reset': {
      userName: 'Test User',
      resetUrl: 'https://app.example.com/reset?token=test123',
      expiresIn: '24 hours',
      companyName: 'Test Company',
    },
    'email-verification': {
      userName: 'Test User',
      verificationUrl: 'https://app.example.com/verify?token=test123',
      expiresIn: '7 days',
      companyName: 'Test Company',
    },
    'team-invitation': {
      inviteeName: 'Test User',
      inviterName: 'Admin User',
      companyName: 'Test Company',
      roleName: 'Developer',
      invitationUrl: 'https://app.example.com/accept?token=test123',
      expiresIn: '7 days',
    },
    'user-level-assignment': {
      userName: 'Test User',
      levelName: 'Admin',
      assignedBy: 'Super Admin',
      companyName: 'Test Company',
      loginUrl: 'https://app.example.com/login',
      permissions: ['Manage users', 'View reports', 'Edit settings'],
    },
    'permission-changes': {
      userName: 'Test User',
      changedBy: 'Admin',
      companyName: 'Test Company',
      loginUrl: 'https://app.example.com/login',
      permissionsAdded: ['Create projects', 'Manage billing'],
      permissionsRemoved: ['Delete users'],
    },
  };

  return fallbackData[templateName] || {};
}

/**
 * Render template to HTML
 */
async function renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
  const TemplateComponent = await loadTemplate(templateName);
  return await render(TemplateComponent(data));
}

/**
 * Send email using EmailService
 */
async function sendEmail(config: TestEmailConfig): Promise<void> {
  // Import EmailService dynamically to avoid initialization issues
  const { EmailService } = await import('../email.service.js');
  const emailService = new EmailService();

  await emailService.sendEmail({
    templateName: config.templateName,
    toAddress: config.toAddress,
    templateData: config.templateData,
  });
}

/**
 * Save rendered HTML to file
 */
function saveHtmlToFile(templateName: string, html: string): string {
  const outputDir = path.join(__dirname, '../../../temp/email-previews');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${templateName}-${timestamp}.html`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, html, 'utf-8');
  return filepath;
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<TestEmailConfig> {
  const args = process.argv.slice(2);
  const config: Partial<TestEmailConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--template' && args[i + 1]) {
      config.templateName = args[i + 1];
      i++;
    } else if (arg === '--to' && args[i + 1]) {
      config.toAddress = args[i + 1];
      i++;
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--save') {
      config.saveOutput = true;
    }
  }

  return config;
}

/**
 * Validate email address
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Interactive template data editor
 */
async function editTemplateData(data: Record<string, any>): Promise<Record<string, any>> {
  console.log('\n' + chalk.cyan('Current template data:'));
  console.log(chalk.gray(JSON.stringify(data, null, 2)));

  const { shouldEdit } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldEdit',
      message: 'Would you like to edit the template data?',
      default: false,
    },
  ]);

  if (!shouldEdit) {
    return data;
  }

  const { editMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'editMethod',
      message: 'How would you like to edit the data?',
      choices: [
        { name: 'Edit individual fields', value: 'fields' },
        { name: 'Paste JSON', value: 'json' },
        { name: 'Keep current data', value: 'keep' },
      ],
    },
  ]);

  if (editMethod === 'keep') {
    return data;
  }

  if (editMethod === 'json') {
    const { jsonData } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'jsonData',
        message: 'Enter template data as JSON:',
        default: JSON.stringify(data, null, 2),
        validate: (input: string) => {
          try {
            JSON.parse(input);
            return true;
          } catch {
            return 'Invalid JSON';
          }
        },
      },
    ]);

    return JSON.parse(jsonData);
  }

  // Edit individual fields
  const editedData = { ...data };
  const keys = Object.keys(data);

  for (const key of keys) {
    const currentValue = data[key];
    const valueType = Array.isArray(currentValue) ? 'array' : typeof currentValue;

    let newValue;

    if (valueType === 'array') {
      const { arrayValue } = await inquirer.prompt([
        {
          type: 'input',
          name: 'arrayValue',
          message: `${key} (comma-separated):`,
          default: currentValue.join(', '),
        },
      ]);
      newValue = arrayValue.split(',').map((v: string) => v.trim());
    } else {
      const { fieldValue } = await inquirer.prompt([
        {
          type: 'input',
          name: 'fieldValue',
          message: `${key}:`,
          default: String(currentValue),
        },
      ]);
      newValue = fieldValue;
    }

    editedData[key] = newValue;
  }

  return editedData;
}

/**
 * Main interactive flow
 */
async function testEmail() {
  console.log('\n');
  console.log(chalk.bold.cyan('📧 Email Tester'));
  console.log(chalk.gray('Test email templates by rendering or sending them\n'));

  try {
    const cliArgs = parseArgs();

    // Step 1: Select template
    let templateName = cliArgs.templateName;

    if (!templateName) {
      const { selectedTemplate } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTemplate',
          message: 'Select email template to test:',
          choices: AVAILABLE_TEMPLATES.map(t => ({
            name: t.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: t,
          })),
        },
      ]);
      templateName = selectedTemplate;
    }

    // Step 2: Load sample data
    const spinner = ora('Loading template data...').start();
    let templateData = loadSampleData(templateName);
    spinner.succeed('Template data loaded');

    // Step 3: Edit template data
    templateData = await editTemplateData(templateData || {});

    // Step 4: Choose test mode
    let dryRun = cliArgs.dryRun ?? false;
    let toAddress = cliArgs.toAddress;
    let saveOutput = cliArgs.saveOutput ?? false;

    if (dryRun === undefined) {
      const { mode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'mode',
          message: 'Test mode:',
          choices: [
            { name: 'Dry run (render only, no email sent)', value: 'dry-run' },
            { name: 'Send test email', value: 'send' },
          ],
        },
      ]);
      dryRun = mode === 'dry-run';
    }

    // Step 5: Get recipient email if sending
    if (!dryRun && !toAddress) {
      const { email } = await inquirer.prompt([
        {
          type: 'input',
          name: 'email',
          message: 'Recipient email address:',
          validate: (input: string) => {
            if (!input) return 'Email is required';
            if (!isValidEmail(input)) return 'Invalid email address';
            return true;
          },
        },
      ]);
      toAddress = email;
    }

    // Step 6: Ask about saving output
    if (dryRun && saveOutput === undefined) {
      const { shouldSave } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldSave',
          message: 'Save rendered HTML to file?',
          default: true,
        },
      ]);
      saveOutput = shouldSave;
    }

    // Step 7: Render template
    const renderSpinner = ora('Rendering template...').start();
    const html = await renderTemplate(templateName, templateData);
    renderSpinner.succeed('Template rendered successfully');

    // Step 8: Execute test
    if (dryRun) {
      console.log('\n' + chalk.bold.green('✓ Dry Run Complete\n'));
      console.log(chalk.cyan('Template:'), templateName);
      console.log(chalk.cyan('HTML Size:'), `${html.length} bytes`);

      if (saveOutput) {
        const filepath = saveHtmlToFile(templateName, html);
        console.log(chalk.cyan('Saved to:'), filepath);
        console.log(chalk.gray(`  Open in browser: file://${filepath}`));
      }

      console.log('\n' + chalk.gray('Preview first 500 characters:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(chalk.gray(html.substring(0, 500) + '...'));
      console.log(chalk.gray('─'.repeat(50)));
    } else {
      const sendSpinner = ora(`Sending email to ${toAddress}...`).start();

      try {
        await sendEmail({
          templateName,
          toAddress: toAddress!,
          templateData,
          dryRun: false,
          saveOutput: false,
        });

        sendSpinner.succeed(chalk.green('Email sent successfully!'));

        console.log('\n' + chalk.bold.green('✓ Email Sent\n'));
        console.log(chalk.cyan('Template:'), templateName);
        console.log(chalk.cyan('To:'), toAddress);
        console.log(chalk.cyan('Size:'), `${html.length} bytes`);
      } catch (error) {
        sendSpinner.fail(chalk.red('Failed to send email'));
        throw error;
      }
    }

    console.log('\n');
  } catch (error) {
    console.error('\n' + chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    console.log('\n');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmail();
}

export { testEmail };
