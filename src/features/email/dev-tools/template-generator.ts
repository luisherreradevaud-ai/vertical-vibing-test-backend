#!/usr/bin/env node
/**
 * Email Template Generator CLI
 *
 * Interactive CLI tool to scaffold new email templates with proper structure.
 * Automatically generates React Email template files, adds exports, and creates sample data.
 *
 * Usage:
 *   npm run email:generate-template
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template categories
const TEMPLATE_CATEGORIES = [
  'transactional',
  'marketing',
  'notification',
  'system',
  'other',
];

// Variable types
const VARIABLE_TYPES = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'date',
];

interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

interface TemplateConfig {
  name: string;
  fileName: string;
  componentName: string;
  category: string;
  description: string;
  subject: string;
  variables: TemplateVariable[];
}

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Generate TypeScript interface for props
 */
function generatePropsInterface(componentName: string, variables: TemplateVariable[]): string {
  const props = variables.map(v => {
    const optional = v.required ? '' : '?';
    let type = v.type;
    if (v.type === 'array') type = 'string[]';
    if (v.type === 'object') type = 'Record<string, any>';
    if (v.type === 'date') type = 'string';
    return `  ${v.name}${optional}: ${type};`;
  });

  return `interface ${componentName}Props {
${props.join('\n')}
}`;
}

/**
 * Generate default values for props
 */
function generateDefaultProps(variables: TemplateVariable[]): string {
  const defaults = variables
    .filter(v => !v.required && v.defaultValue)
    .map(v => {
      const value = v.type === 'string' ? `'${v.defaultValue}'` : v.defaultValue;
      return `  ${v.name} = ${value}`;
    });

  if (defaults.length === 0) return '';

  return `,\n${defaults.join(',\n')},`;
}

/**
 * Generate sample template data
 */
function generateSampleData(variables: TemplateVariable[]): string {
  const data: Record<string, any> = {};

  variables.forEach(v => {
    switch (v.type) {
      case 'string':
        data[v.name] = v.defaultValue || `Sample ${v.name}`;
        break;
      case 'number':
        data[v.name] = v.defaultValue || 42;
        break;
      case 'boolean':
        data[v.name] = v.defaultValue === 'true' || false;
        break;
      case 'array':
        data[v.name] = ['Item 1', 'Item 2', 'Item 3'];
        break;
      case 'object':
        data[v.name] = { key: 'value' };
        break;
      case 'date':
        data[v.name] = new Date().toISOString();
        break;
    }
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Generate React Email template file
 */
function generateTemplateFile(config: TemplateConfig): string {
  const { componentName, variables, description, subject } = config;

  const propsInterface = generatePropsInterface(componentName, variables);
  const defaultProps = generateDefaultProps(variables);
  const propsDestructure = variables.map(v => v.name).join(',\n  ');

  return `import React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

/**
 * ${description}
 */
${propsInterface}

export const ${componentName} = ({
  ${propsDestructure}${defaultProps}
}: ${componentName}Props) => {
  return (
    <Html>
      <Head />
      <Preview>${subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={content}>
            <Text style={heading}>${subject}</Text>

            {/* TODO: Add your email content here */}
            <Text style={paragraph}>
              This is a template for: ${description}
            </Text>

            {/* Example usage of variables: */}
            ${variables.slice(0, 2).map(v => `<Text style={paragraph}>{${v.name}}</Text>`).join('\n            ')}

            <Hr style={hr} />

            <Text style={footer}>
              © {new Date().getFullYear()} Vertical Vibing. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ${componentName};

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

const content = {
  padding: '0 48px',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  marginBottom: '24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  marginBottom: '16px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '12px',
};
`;
}

/**
 * Update templates index.ts
 */
function updateTemplatesIndex(config: TemplateConfig): void {
  const indexPath = path.join(__dirname, '../templates/index.ts');
  const { fileName, componentName } = config;

  // Read current content
  let content = fs.readFileSync(indexPath, 'utf-8');

  // Find the export section
  const exportRegex = /export \{[\s\S]*?\} from '\.\/permission-changes';/;
  const exportMatch = content.match(exportRegex);

  if (exportMatch) {
    const newExport = `export { ${componentName}, default as ${componentName}Component } from './${fileName}';`;
    content = content.replace(exportMatch[0], `${exportMatch[0]}\n${newExport}`);
  }

  // Find the EMAIL_TEMPLATES object
  const templatesRegex = /export const EMAIL_TEMPLATES = \{[\s\S]*?'permission-changes': \(\) => import\('\.\/permission-changes'\),/;
  const templatesMatch = content.match(templatesRegex);

  if (templatesMatch) {
    const newTemplate = `  '${fileName}': () => import('./${fileName}'),`;
    content = content.replace(templatesMatch[0], `${templatesMatch[0]}\n${newTemplate}`);
  }

  // Write updated content
  fs.writeFileSync(indexPath, content, 'utf-8');
}

/**
 * Create sample data file
 */
function createSampleDataFile(config: TemplateConfig): void {
  const sampleDataPath = path.join(__dirname, `../templates/${config.fileName}.sample.json`);
  const sampleData = generateSampleData(config.variables);

  const fileContent = {
    templateName: config.fileName,
    description: config.description,
    category: config.category,
    subject: config.subject,
    variables: config.variables,
    sampleData: JSON.parse(sampleData),
  };

  fs.writeFileSync(sampleDataPath, JSON.stringify(fileContent, null, 2), 'utf-8');
}

/**
 * Main interactive flow
 */
async function generateTemplate() {
  console.log('\n');
  console.log(chalk.bold.cyan('📧 Email Template Generator'));
  console.log(chalk.gray('Create a new React Email template with proper structure\n'));

  try {
    // Step 1: Basic template info
    const basicInfo = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Template name (use kebab-case):',
        validate: (input: string) => {
          if (!input) return 'Template name is required';
          if (!/^[a-z0-9-]+$/.test(input)) return 'Use kebab-case (e.g., welcome-email)';
          return true;
        },
      },
      {
        type: 'list',
        name: 'category',
        message: 'Template category:',
        choices: TEMPLATE_CATEGORIES,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Brief description:',
        validate: (input: string) => input ? true : 'Description is required',
      },
      {
        type: 'input',
        name: 'subject',
        message: 'Email subject line:',
        validate: (input: string) => input ? true : 'Subject is required',
      },
    ]);

    // Step 2: Collect variables
    console.log('\n' + chalk.cyan('Now let\'s define the template variables...\n'));

    const variables: TemplateVariable[] = [];
    let addMore = true;

    while (addMore) {
      const variable = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: `Variable name (${variables.length + 1}):`,
          validate: (input: string) => {
            if (!input) return 'Variable name is required';
            if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(input)) return 'Invalid variable name';
            if (variables.some(v => v.name === input)) return 'Variable already exists';
            return true;
          },
        },
        {
          type: 'list',
          name: 'type',
          message: 'Variable type:',
          choices: VARIABLE_TYPES,
        },
        {
          type: 'confirm',
          name: 'required',
          message: 'Is this variable required?',
          default: true,
        },
        {
          type: 'input',
          name: 'description',
          message: 'Variable description:',
          validate: (input: string) => input ? true : 'Description is required',
        },
        {
          type: 'input',
          name: 'defaultValue',
          message: 'Default value (optional, press Enter to skip):',
          when: (answers) => !answers.required,
        },
      ]);

      variables.push(variable);

      const { continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAdding',
          message: 'Add another variable?',
          default: false,
        },
      ]);

      addMore = continueAdding;
    }

    // Step 3: Confirm and generate
    console.log('\n' + chalk.bold.yellow('Summary:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan('Name:'), basicInfo.name);
    console.log(chalk.cyan('Category:'), basicInfo.category);
    console.log(chalk.cyan('Description:'), basicInfo.description);
    console.log(chalk.cyan('Subject:'), basicInfo.subject);
    console.log(chalk.cyan('Variables:'), variables.length);
    variables.forEach((v, i) => {
      const required = v.required ? chalk.red('*') : '';
      console.log(chalk.gray(`  ${i + 1}. ${v.name} (${v.type})${required} - ${v.description}`));
    });
    console.log(chalk.gray('─'.repeat(50)) + '\n');

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Generate template with these settings?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\n✗ Template generation cancelled\n'));
      return;
    }

    // Generate files
    const spinner = ora('Generating template files...').start();

    const config: TemplateConfig = {
      name: basicInfo.name,
      fileName: basicInfo.name,
      componentName: toPascalCase(basicInfo.name),
      category: basicInfo.category,
      description: basicInfo.description,
      subject: basicInfo.subject,
      variables,
    };

    try {
      // Create template file
      const templatePath = path.join(__dirname, '../templates', `${config.fileName}.tsx`);
      const templateContent = generateTemplateFile(config);
      fs.writeFileSync(templatePath, templateContent, 'utf-8');

      // Update index.ts
      updateTemplatesIndex(config);

      // Create sample data file
      createSampleDataFile(config);

      spinner.succeed(chalk.green('Template files generated successfully!'));

      console.log('\n' + chalk.bold.green('✓ Template Created\n'));
      console.log(chalk.cyan('Files created:'));
      console.log(chalk.gray(`  - templates/${config.fileName}.tsx`));
      console.log(chalk.gray(`  - templates/${config.fileName}.sample.json`));
      console.log(chalk.gray(`  - templates/index.ts (updated)`));

      console.log('\n' + chalk.cyan('Next steps:'));
      console.log(chalk.gray(`  1. Edit templates/${config.fileName}.tsx to customize the template`));
      console.log(chalk.gray(`  2. Test the template: npm run email:preview`));
      console.log(chalk.gray(`  3. Preview at: http://localhost:3050/preview/${config.fileName}`));
      console.log('\n');
    } catch (error) {
      spinner.fail(chalk.red('Failed to generate template'));
      throw error;
    }
  } catch (error) {
    console.error('\n' + chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    console.log('\n');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTemplate();
}

export { generateTemplate };
