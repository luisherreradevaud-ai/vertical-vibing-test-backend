#!/usr/bin/env node
/**
 * Email Template Validator
 *
 * Validates all email templates for common issues:
 * - Missing variables
 * - Invalid email structure
 * - Broken links/images
 * - Required components (subject, body, etc.)
 * - Rendering errors
 *
 * Usage:
 *   npm run email:validate-templates
 *   npm run email:validate-templates -- --template welcome
 *   npm run email:validate-templates -- --verbose
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { render } from '@react-email/render';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  location?: string;
}

interface ValidationResult {
  templateName: string;
  valid: boolean;
  issues: ValidationIssue[];
  renderTime?: number;
  htmlSize?: number;
}

/**
 * Get all template files
 */
function getTemplateFiles(): string[] {
  const templatesDir = path.join(__dirname, '../templates');
  const files = fs.readdirSync(templatesDir);

  return files
    .filter(f => f.endsWith('.tsx') && f !== 'index.ts')
    .map(f => f.replace('.tsx', ''));
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
    throw new Error(`Failed to load template: ${error instanceof Error ? error.message : String(error)}`);
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
      return parsed.sampleData || null;
    }
  } catch (error) {
    // Sample data is optional
  }
  return null;
}

/**
 * Extract variables from template file
 */
function extractTemplateVariables(templateName: string): string[] {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.tsx`);
  const content = fs.readFileSync(templatePath, 'utf-8');

  // Extract interface properties
  const interfaceMatch = content.match(/interface\s+\w+Props\s*\{([^}]+)\}/);
  if (!interfaceMatch) return [];

  const propsContent = interfaceMatch[1];
  const variables: string[] = [];

  // Match property definitions (e.g., "userName: string;")
  const propRegex = /(\w+)(\?)?:\s*[\w\[\]<>,\s]+;/g;
  let match;

  while ((match = propRegex.exec(propsContent)) !== null) {
    variables.push(match[1]);
  }

  return variables;
}

/**
 * Validate template structure
 */
async function validateTemplate(templateName: string, verbose: boolean = false): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const startTime = Date.now();

  try {
    // 1. Check if template file exists
    const templatePath = path.join(__dirname, '../templates', `${templateName}.tsx`);
    if (!fs.existsSync(templatePath)) {
      issues.push({
        level: 'error',
        category: 'File',
        message: 'Template file not found',
        location: templatePath,
      });

      return {
        templateName,
        valid: false,
        issues,
      };
    }

    // 2. Read template content
    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    // 3. Check for required imports
    const requiredImports = ['Html', 'Head', 'Body'];
    requiredImports.forEach(imp => {
      if (!templateContent.includes(imp)) {
        issues.push({
          level: 'error',
          category: 'Structure',
          message: `Missing required component: ${imp}`,
        });
      }
    });

    // 4. Check for interface definition
    if (!templateContent.match(/interface\s+\w+Props/)) {
      issues.push({
        level: 'warning',
        category: 'TypeScript',
        message: 'No props interface defined',
      });
    }

    // 5. Check for export
    if (!templateContent.includes('export') || !templateContent.includes('default')) {
      issues.push({
        level: 'error',
        category: 'Export',
        message: 'Template must have a default export',
      });
    }

    // 6. Extract and validate variables
    const variables = extractTemplateVariables(templateName);
    const sampleData = loadSampleData(templateName);

    if (variables.length === 0) {
      issues.push({
        level: 'info',
        category: 'Variables',
        message: 'No template variables defined',
      });
    } else if (verbose) {
      issues.push({
        level: 'info',
        category: 'Variables',
        message: `Found ${variables.length} variables: ${variables.join(', ')}`,
      });
    }

    // 7. Check if sample data exists
    if (!sampleData) {
      issues.push({
        level: 'warning',
        category: 'Sample Data',
        message: 'No sample data file found (.sample.json)',
      });
    } else {
      // Validate sample data has all required variables
      const missingVars = variables.filter(v => !(v in sampleData));
      if (missingVars.length > 0) {
        issues.push({
          level: 'warning',
          category: 'Sample Data',
          message: `Missing variables in sample data: ${missingVars.join(', ')}`,
        });
      }
    }

    // 8. Try to render the template
    try {
      const TemplateComponent = await loadTemplate(templateName);

      // Use sample data or empty object
      const testData = sampleData || {};

      const html = await render(TemplateComponent(testData));
      const renderTime = Date.now() - startTime;

      // 9. Validate rendered HTML
      if (!html || html.length === 0) {
        issues.push({
          level: 'error',
          category: 'Rendering',
          message: 'Template rendered to empty HTML',
        });
      }

      // Check for common HTML issues
      if (!html.includes('<!DOCTYPE html>')) {
        issues.push({
          level: 'warning',
          category: 'HTML',
          message: 'Missing DOCTYPE declaration',
        });
      }

      if (!html.includes('<html')) {
        issues.push({
          level: 'error',
          category: 'HTML',
          message: 'Missing <html> tag',
        });
      }

      if (!html.includes('<head')) {
        issues.push({
          level: 'error',
          category: 'HTML',
          message: 'Missing <head> tag',
        });
      }

      if (!html.includes('<body')) {
        issues.push({
          level: 'error',
          category: 'HTML',
          message: 'Missing <body> tag',
        });
      }

      // 10. Check for broken links (basic check)
      const linkMatches = html.matchAll(/href=["']([^"']+)["']/g);
      for (const match of linkMatches) {
        const url = match[1];
        if (url.startsWith('http://')) {
          issues.push({
            level: 'warning',
            category: 'Links',
            message: `HTTP link detected (should be HTTPS): ${url}`,
          });
        }
        if (url.includes('localhost')) {
          issues.push({
            level: 'warning',
            category: 'Links',
            message: `Localhost URL detected: ${url}`,
          });
        }
        if (url.includes('example.com')) {
          issues.push({
            level: 'info',
            category: 'Links',
            message: `Example domain detected: ${url}`,
          });
        }
      }

      // 11. Check for images
      const imgMatches = html.matchAll(/src=["']([^"']+)["']/g);
      for (const match of imgMatches) {
        const url = match[1];
        if (url.startsWith('http://')) {
          issues.push({
            level: 'warning',
            category: 'Images',
            message: `HTTP image detected (should be HTTPS): ${url}`,
          });
        }
        if (!url.startsWith('http') && !url.startsWith('data:')) {
          issues.push({
            level: 'warning',
            category: 'Images',
            message: `Relative image URL detected: ${url}`,
          });
        }
      }

      // 12. Check email best practices
      if (html.length > 102400) { // 100KB
        issues.push({
          level: 'warning',
          category: 'Performance',
          message: `Large HTML size: ${(html.length / 1024).toFixed(2)}KB (recommended: <100KB)`,
        });
      }

      // 13. Check for inline styles (good for email)
      const styleTagCount = (html.match(/<style/g) || []).length;
      if (styleTagCount > 0) {
        issues.push({
          level: 'info',
          category: 'Styles',
          message: `Found ${styleTagCount} <style> tag(s). Consider inline styles for better compatibility.`,
        });
      }

      return {
        templateName,
        valid: issues.filter(i => i.level === 'error').length === 0,
        issues,
        renderTime,
        htmlSize: html.length,
      };
    } catch (error) {
      issues.push({
        level: 'error',
        category: 'Rendering',
        message: `Failed to render: ${error instanceof Error ? error.message : String(error)}`,
      });

      return {
        templateName,
        valid: false,
        issues,
      };
    }
  } catch (error) {
    issues.push({
      level: 'error',
      category: 'Validation',
      message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });

    return {
      templateName,
      valid: false,
      issues,
    };
  }
}

/**
 * Format validation results
 */
function formatResults(results: ValidationResult[], verbose: boolean): void {
  console.log('\n' + chalk.bold.cyan('📋 Validation Results\n'));

  let totalTemplates = results.length;
  let validTemplates = results.filter(r => r.valid).length;
  let totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  let errorCount = results.reduce((sum, r) => sum + r.issues.filter(i => i.level === 'error').length, 0);
  let warningCount = results.reduce((sum, r) => sum + r.issues.filter(i => i.level === 'warning').length, 0);

  // Summary
  console.log(chalk.bold('Summary:'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.cyan('Total Templates:'), totalTemplates);
  console.log(chalk.green('Valid Templates:'), validTemplates);
  console.log(chalk.red('Invalid Templates:'), totalTemplates - validTemplates);
  console.log(chalk.red('Errors:'), errorCount);
  console.log(chalk.yellow('Warnings:'), warningCount);
  console.log(chalk.blue('Info:'), totalIssues - errorCount - warningCount);
  console.log(chalk.gray('─'.repeat(60)) + '\n');

  // Detailed results
  results.forEach(result => {
    const statusIcon = result.valid ? chalk.green('✓') : chalk.red('✗');
    const templateTitle = `${statusIcon} ${result.templateName}`;

    if (result.valid && !verbose && result.issues.length === 0) {
      console.log(templateTitle);
      return;
    }

    console.log(chalk.bold(templateTitle));

    if (result.renderTime !== undefined) {
      console.log(chalk.gray(`  Render time: ${result.renderTime}ms`));
    }

    if (result.htmlSize !== undefined) {
      console.log(chalk.gray(`  HTML size: ${(result.htmlSize / 1024).toFixed(2)}KB`));
    }

    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        const levelColor = {
          error: chalk.red,
          warning: chalk.yellow,
          info: chalk.blue,
        }[issue.level];

        const levelIcon = {
          error: '✗',
          warning: '⚠',
          info: 'ℹ',
        }[issue.level];

        console.log(`  ${levelColor(levelIcon)} [${issue.category}] ${issue.message}`);

        if (issue.location && verbose) {
          console.log(chalk.gray(`    ${issue.location}`));
        }
      });
    }

    console.log('');
  });

  // Exit code
  if (errorCount > 0) {
    console.log(chalk.red('❌ Validation failed with errors\n'));
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(chalk.yellow('⚠ Validation passed with warnings\n'));
  } else {
    console.log(chalk.green('✓ All templates validated successfully!\n'));
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { template?: string; verbose: boolean } {
  const args = process.argv.slice(2);
  const config: { template?: string; verbose: boolean } = { verbose: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--template' && args[i + 1]) {
      config.template = args[i + 1];
      i++;
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    }
  }

  return config;
}

/**
 * Main validation flow
 */
async function validateTemplates() {
  console.log('\n');
  console.log(chalk.bold.cyan('📧 Email Template Validator'));
  console.log(chalk.gray('Validating email templates for common issues\n'));

  try {
    const { template: targetTemplate, verbose } = parseArgs();

    // Get templates to validate
    let templates: string[];
    if (targetTemplate) {
      templates = [targetTemplate];
      console.log(chalk.cyan('Validating template:'), targetTemplate);
    } else {
      templates = getTemplateFiles();
      console.log(chalk.cyan('Validating templates:'), templates.length);
    }

    console.log('');

    // Validate each template
    const results: ValidationResult[] = [];
    const spinner = ora('Validating templates...').start();

    for (const templateName of templates) {
      spinner.text = `Validating ${templateName}...`;
      const result = await validateTemplate(templateName, verbose);
      results.push(result);
    }

    spinner.stop();

    // Display results
    formatResults(results, verbose);
  } catch (error) {
    console.error('\n' + chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    console.log('\n');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateTemplates();
}

export { validateTemplates, validateTemplate };
