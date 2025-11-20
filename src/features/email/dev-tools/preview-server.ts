#!/usr/bin/env node
/**
 * Email Template Preview Server
 *
 * Hot-reloading development server for testing email templates in browser.
 * Provides interactive UI to switch templates and modify data in real-time.
 *
 * Usage:
 *   npm run email:preview
 *   npm run email:preview -- --port 3050
 */

import express from 'express';
import { render } from '@react-email/render';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template registry with sample data
const TEMPLATE_SAMPLES = {
  welcome: {
    name: 'Welcome Email',
    category: 'transactional',
    description: 'New user welcome email',
    sampleData: {
      userName: 'John Doe',
      companyName: 'Acme Corp',
      loginUrl: 'https://app.example.com/login',
    },
    variables: [
      { name: 'userName', type: 'string', required: true, description: 'User full name' },
      { name: 'companyName', type: 'string', required: false, description: 'Company name' },
      { name: 'loginUrl', type: 'string', required: true, description: 'Login URL' },
    ],
  },
  'password-reset': {
    name: 'Password Reset',
    category: 'transactional',
    description: 'Password reset request email',
    sampleData: {
      userName: 'Jane Smith',
      resetUrl: 'https://app.example.com/reset-password?token=abc123',
      expiresIn: '24 hours',
      companyName: 'Acme Corp',
    },
    variables: [
      { name: 'userName', type: 'string', required: true, description: 'User full name' },
      { name: 'resetUrl', type: 'string', required: true, description: 'Password reset URL' },
      { name: 'expiresIn', type: 'string', required: true, description: 'Token expiration time' },
      { name: 'companyName', type: 'string', required: false, description: 'Company name' },
    ],
  },
  'email-verification': {
    name: 'Email Verification',
    category: 'transactional',
    description: 'Email address verification',
    sampleData: {
      userName: 'Alex Johnson',
      verificationUrl: 'https://app.example.com/verify-email?token=xyz789',
      expiresIn: '7 days',
      companyName: 'Acme Corp',
    },
    variables: [
      { name: 'userName', type: 'string', required: true, description: 'User full name' },
      { name: 'verificationUrl', type: 'string', required: true, description: 'Verification URL' },
      { name: 'expiresIn', type: 'string', required: true, description: 'Token expiration time' },
      { name: 'companyName', type: 'string', required: false, description: 'Company name' },
    ],
  },
  'team-invitation': {
    name: 'Team Invitation',
    category: 'transactional',
    description: 'Team invitation email',
    sampleData: {
      inviteeName: 'Sarah Williams',
      inviterName: 'Michael Brown',
      companyName: 'Acme Corp',
      roleName: 'Developer',
      invitationUrl: 'https://app.example.com/accept-invite?token=inv456',
      expiresIn: '7 days',
    },
    variables: [
      { name: 'inviteeName', type: 'string', required: true, description: 'Invitee name' },
      { name: 'inviterName', type: 'string', required: true, description: 'Inviter name' },
      { name: 'companyName', type: 'string', required: true, description: 'Company name' },
      { name: 'roleName', type: 'string', required: true, description: 'Role name' },
      { name: 'invitationUrl', type: 'string', required: true, description: 'Invitation URL' },
      { name: 'expiresIn', type: 'string', required: true, description: 'Expiration time' },
    ],
  },
  'user-level-assignment': {
    name: 'User Level Assignment',
    category: 'transactional',
    description: 'User level assignment notification',
    sampleData: {
      userName: 'Chris Anderson',
      levelName: 'Admin',
      assignedBy: 'Emily Davis',
      companyName: 'Acme Corp',
      loginUrl: 'https://app.example.com/login',
      permissions: [
        'Manage users',
        'View reports',
        'Edit settings',
      ],
    },
    variables: [
      { name: 'userName', type: 'string', required: true, description: 'User name' },
      { name: 'levelName', type: 'string', required: true, description: 'Level name' },
      { name: 'assignedBy', type: 'string', required: true, description: 'Who assigned the level' },
      { name: 'companyName', type: 'string', required: true, description: 'Company name' },
      { name: 'loginUrl', type: 'string', required: true, description: 'Login URL' },
      { name: 'permissions', type: 'array', required: true, description: 'List of permissions' },
    ],
  },
  'permission-changes': {
    name: 'Permission Changes',
    category: 'transactional',
    description: 'Permission changes notification',
    sampleData: {
      userName: 'Taylor Martinez',
      changedBy: 'Admin Team',
      companyName: 'Acme Corp',
      loginUrl: 'https://app.example.com/login',
      permissionsAdded: [
        'Create projects',
        'Manage billing',
      ],
      permissionsRemoved: [
        'Delete users',
      ],
    },
    variables: [
      { name: 'userName', type: 'string', required: true, description: 'User name' },
      { name: 'changedBy', type: 'string', required: true, description: 'Who changed permissions' },
      { name: 'companyName', type: 'string', required: true, description: 'Company name' },
      { name: 'loginUrl', type: 'string', required: true, description: 'Login URL' },
      { name: 'permissionsAdded', type: 'array', required: true, description: 'Added permissions' },
      { name: 'permissionsRemoved', type: 'array', required: true, description: 'Removed permissions' },
    ],
  },
};

/**
 * Load template component dynamically
 */
async function loadTemplate(templateName: string) {
  const templatePath = path.join(__dirname, '../templates', `${templateName}.tsx`);
  try {
    const module = await import(templatePath);
    return module.default || module[Object.keys(module)[0]];
  } catch (error) {
    console.error(`Failed to load template: ${templateName}`, error);
    throw new Error(`Template not found: ${templateName}`);
  }
}

/**
 * Start preview server
 */
export async function startPreviewServer(port: number = 3050) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Home page - template list
  app.get('/', (req, res) => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Template Preview</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            color: white;
          }
          .header h1 {
            font-size: 42px;
            margin-bottom: 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          .header p {
            font-size: 18px;
            opacity: 0.9;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 24px;
          }
          .card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
          }
          .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
          }
          .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
          }
          .card-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            color: white;
            font-size: 20px;
          }
          .card-title {
            font-size: 20px;
            font-weight: 600;
            color: #1a202c;
          }
          .card-category {
            display: inline-block;
            padding: 4px 12px;
            background: #edf2f7;
            border-radius: 12px;
            font-size: 12px;
            color: #4a5568;
            margin-bottom: 8px;
          }
          .card-description {
            color: #718096;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 16px;
          }
          .card-variables {
            font-size: 12px;
            color: #a0aec0;
          }
          .btn {
            display: inline-block;
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: opacity 0.2s;
          }
          .btn:hover {
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Email Template Preview</h1>
            <p>Click on any template to preview it with sample data</p>
          </div>
          <div class="grid">
            ${Object.entries(TEMPLATE_SAMPLES).map(([key, template]) => `
              <div class="card" onclick="window.location.href='/preview/${key}'">
                <div class="card-header">
                  <div class="card-icon">✉️</div>
                  <div class="card-title">${template.name}</div>
                </div>
                <div class="card-category">${template.category}</div>
                <div class="card-description">${template.description}</div>
                <div class="card-variables">
                  ${template.variables.length} variables • ${template.variables.filter(v => v.required).length} required
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  });

  // Preview specific template
  app.get('/preview/:templateName', async (req, res) => {
    const { templateName } = req.params;
    const templateInfo = TEMPLATE_SAMPLES[templateName as keyof typeof TEMPLATE_SAMPLES];

    if (!templateInfo) {
      return res.status(404).send('Template not found');
    }

    try {
      const TemplateComponent = await loadTemplate(templateName);
      const html = await render(TemplateComponent(templateInfo.sampleData));

      const previewHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${templateInfo.name} - Preview</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #f7fafc;
              min-height: 100vh;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header-content {
              max-width: 1200px;
              margin: 0 auto;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 600;
            }
            .back-btn {
              color: white;
              text-decoration: none;
              padding: 8px 16px;
              background: rgba(255,255,255,0.2);
              border-radius: 6px;
              transition: background 0.2s;
            }
            .back-btn:hover {
              background: rgba(255,255,255,0.3);
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .controls {
              background: white;
              border-radius: 12px;
              padding: 24px;
              margin-bottom: 24px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            .controls h2 {
              font-size: 18px;
              margin-bottom: 16px;
              color: #1a202c;
            }
            .variables-grid {
              display: grid;
              gap: 16px;
              grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            }
            .variable {
              display: flex;
              flex-direction: column;
            }
            .variable label {
              font-size: 14px;
              font-weight: 500;
              color: #4a5568;
              margin-bottom: 6px;
            }
            .variable input, .variable textarea {
              padding: 10px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              font-size: 14px;
              font-family: inherit;
            }
            .variable textarea {
              resize: vertical;
              min-height: 80px;
            }
            .preview-container {
              background: white;
              border-radius: 12px;
              padding: 24px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            .preview-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 16px;
              border-bottom: 2px solid #e2e8f0;
            }
            .preview-header h2 {
              font-size: 18px;
              color: #1a202c;
            }
            .mode-toggle {
              display: flex;
              gap: 8px;
            }
            .mode-btn {
              padding: 6px 12px;
              border: 1px solid #e2e8f0;
              background: white;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.2s;
            }
            .mode-btn.active {
              background: #667eea;
              color: white;
              border-color: #667eea;
            }
            .preview-content {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              overflow: hidden;
            }
            #code-view {
              display: none;
              padding: 20px;
              background: #1a202c;
              color: #e2e8f0;
              font-family: 'Monaco', 'Courier New', monospace;
              font-size: 12px;
              overflow-x: auto;
              max-height: 600px;
            }
            #code-view.active {
              display: block;
            }
          </style>
          <script>
            function toggleView(view) {
              const iframe = document.getElementById('email-preview');
              const code = document.getElementById('code-view');
              const htmlBtn = document.getElementById('html-btn');
              const codeBtn = document.getElementById('code-btn');

              if (view === 'html') {
                iframe.style.display = 'block';
                code.classList.remove('active');
                htmlBtn.classList.add('active');
                codeBtn.classList.remove('active');
              } else {
                iframe.style.display = 'none';
                code.classList.add('active');
                htmlBtn.classList.remove('active');
                codeBtn.classList.add('active');
              }
            }
          </script>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <h1>📧 ${templateInfo.name}</h1>
              <a href="/" class="back-btn">← Back to Templates</a>
            </div>
          </div>
          <div class="container">
            <div class="controls">
              <h2>Template Variables</h2>
              <div class="variables-grid">
                ${templateInfo.variables.map(variable => `
                  <div class="variable">
                    <label>
                      ${variable.name} ${variable.required ? '<span style="color: #e53e3e;">*</span>' : ''}
                      <span style="color: #a0aec0; font-weight: 400; font-size: 12px;">
                        (${variable.type})
                      </span>
                    </label>
                    ${variable.type === 'array'
                      ? `<textarea id="${variable.name}">${JSON.stringify(templateInfo.sampleData[variable.name], null, 2)}</textarea>`
                      : `<input type="text" id="${variable.name}" value="${templateInfo.sampleData[variable.name] || ''}" />`
                    }
                    <span style="color: #718096; font-size: 12px; margin-top: 4px;">
                      ${variable.description}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="preview-container">
              <div class="preview-header">
                <h2>Email Preview</h2>
                <div class="mode-toggle">
                  <button id="html-btn" class="mode-btn active" onclick="toggleView('html')">
                    Visual
                  </button>
                  <button id="code-btn" class="mode-btn" onclick="toggleView('code')">
                    HTML Source
                  </button>
                </div>
              </div>
              <div class="preview-content">
                <iframe
                  id="email-preview"
                  srcdoc="${html.replace(/"/g, '&quot;')}"
                  style="width: 100%; height: 600px; border: none;"
                ></iframe>
                <pre id="code-view">${html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      res.send(previewHtml);
    } catch (error) {
      console.error('Error rendering template:', error);
      res.status(500).send(`
        <h1>Error rendering template</h1>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
      `);
    }
  });

  // API endpoint to render template with custom data
  app.post('/api/render/:templateName', async (req, res) => {
    const { templateName } = req.params;
    const data = req.body;

    try {
      const TemplateComponent = await loadTemplate(templateName);
      const html = await render(TemplateComponent(data));
      res.json({ html, success: true });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Start server
  app.listen(port, () => {
    console.log('\n');
    console.log(chalk.bold.green('✓ Email Template Preview Server Started'));
    console.log('\n');
    console.log(chalk.cyan('  Preview URL:'), chalk.bold(`http://localhost:${port}`));
    console.log(chalk.cyan('  Templates:'), chalk.bold(Object.keys(TEMPLATE_SAMPLES).length));
    console.log('\n');
    console.log(chalk.gray('  Press Ctrl+C to stop'));
    console.log('\n');
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]) : 3050;

  startPreviewServer(port).catch(error => {
    console.error(chalk.red('Failed to start preview server:'), error);
    process.exit(1);
  });
}
