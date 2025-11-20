#!/usr/bin/env node
/**
 * List Email Templates
 *
 * Displays all available email templates with metadata.
 *
 * Usage:
 *   npm run email:list-templates
 *   npm run email:list-templates -- --json
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TemplateInfo {
  name: string;
  fileName: string;
  description?: string;
  category?: string;
  variables: number;
  hasSampleData: boolean;
  fileSize: number;
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
 * Extract variables from template file
 */
function extractTemplateVariables(templateName: string): number {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.tsx`);
  const content = fs.readFileSync(templatePath, 'utf-8');

  // Extract interface properties
  const interfaceMatch = content.match(/interface\s+\w+Props\s*\{([^}]+)\}/);
  if (!interfaceMatch) return 0;

  const propsContent = interfaceMatch[1];
  const propRegex = /(\w+)(\?)?:\s*[\w\[\]<>,\s]+;/g;
  const matches = propsContent.match(propRegex);

  return matches ? matches.length : 0;
}

/**
 * Extract description from template file
 */
function extractDescription(templateName: string): string | undefined {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.tsx`);
  const content = fs.readFileSync(templatePath, 'utf-8');

  // Try to find JSDoc comment
  const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+)\s*\n/);
  if (jsdocMatch) {
    return jsdocMatch[1].trim();
  }

  // Try to find Preview content
  const previewMatch = content.match(/<Preview>(.+)<\/Preview>/);
  if (previewMatch) {
    return previewMatch[1];
  }

  return undefined;
}

/**
 * Load sample data metadata
 */
function loadSampleDataMetadata(templateName: string): { category?: string } | null {
  const samplePath = path.join(__dirname, '../templates', `${templateName}.sample.json`);
  try {
    if (fs.existsSync(samplePath)) {
      const content = fs.readFileSync(samplePath, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        category: parsed.category,
      };
    }
  } catch (error) {
    // Ignore
  }
  return null;
}

/**
 * Get file size
 */
function getFileSize(templateName: string): number {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.tsx`);
  const stats = fs.statSync(templatePath);
  return stats.size;
}

/**
 * Get template info
 */
function getTemplateInfo(templateName: string): TemplateInfo {
  const samplePath = path.join(__dirname, '../templates', `${templateName}.sample.json`);
  const metadata = loadSampleDataMetadata(templateName);

  return {
    name: templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    fileName: templateName,
    description: extractDescription(templateName),
    category: metadata?.category,
    variables: extractTemplateVariables(templateName),
    hasSampleData: fs.existsSync(samplePath),
    fileSize: getFileSize(templateName),
  };
}

/**
 * Format as table
 */
function formatAsTable(templates: TemplateInfo[]): void {
  console.log('\n');
  console.log(chalk.bold.cyan('📧 Available Email Templates\n'));

  // Header
  console.log(
    chalk.bold('Name').padEnd(30) +
    chalk.bold('Category').padEnd(18) +
    chalk.bold('Vars').padEnd(8) +
    chalk.bold('Sample').padEnd(10) +
    chalk.bold('Size')
  );
  console.log(chalk.gray('─'.repeat(80)));

  // Rows
  templates.forEach(template => {
    const name = template.name.substring(0, 28).padEnd(30);
    const category = (template.category || 'N/A').padEnd(18);
    const vars = String(template.variables).padEnd(8);
    const sample = (template.hasSampleData ? chalk.green('Yes') : chalk.red('No')).padEnd(10);
    const size = `${(template.fileSize / 1024).toFixed(1)}KB`;

    console.log(`${name}${category}${vars}${sample}${size}`);
  });

  console.log(chalk.gray('─'.repeat(80)));
  console.log(chalk.gray(`Total: ${templates.length} templates\n`));

  // Legend
  console.log(chalk.bold('Details:\n'));
  templates.forEach(template => {
    console.log(chalk.cyan(`${template.fileName}:`));
    if (template.description) {
      console.log(chalk.gray(`  ${template.description}`));
    }
    console.log(chalk.gray(`  File: templates/${template.fileName}.tsx`));
    if (template.hasSampleData) {
      console.log(chalk.gray(`  Sample: templates/${template.fileName}.sample.json`));
    }
    console.log('');
  });
}

/**
 * Format as JSON
 */
function formatAsJson(templates: TemplateInfo[]): void {
  console.log(JSON.stringify(templates, null, 2));
}

/**
 * Main function
 */
function listTemplates() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');

  try {
    const templateNames = getTemplateFiles();
    const templates = templateNames.map(name => getTemplateInfo(name));

    // Sort by name
    templates.sort((a, b) => a.fileName.localeCompare(b.fileName));

    if (jsonOutput) {
      formatAsJson(templates);
    } else {
      formatAsTable(templates);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  listTemplates();
}

export { listTemplates };
