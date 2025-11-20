/**
 * Email Unsubscribe Router
 *
 * Public unsubscribe endpoints accessed via email links
 * No authentication required - uses signed tokens for security
 */

import { Router, type Request, type Response } from 'express';
import { ComplianceService } from './compliance.service.js';
import { logger } from '../../shared/utils/logger.js';
import crypto from 'crypto';

export function createEmailUnsubscribeRouter(): Router {
  const router = Router();
  const complianceService = new ComplianceService();

  /**
   * GET /api/email/unsubscribe/:token
   * Show unsubscribe confirmation page (HTML response)
   */
  router.get('/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      // Verify and decode token
      const decoded = verifyUnsubscribeToken(token);

      if (!decoded) {
        return res.status(400).send(renderErrorPage('Invalid or expired unsubscribe link'));
      }

      // Render unsubscribe confirmation page
      const html = renderUnsubscribePage({
        email: decoded.email,
        category: decoded.category || 'all emails',
        token,
      });

      res.status(200).send(html);
    } catch (error) {
      logger.error({ error, token: req.params.token }, 'Error showing unsubscribe page');
      res.status(500).send(renderErrorPage('An error occurred'));
    }
  });

  /**
   * POST /api/email/unsubscribe/:token
   * Process unsubscribe request
   */
  router.post('/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      // Verify and decode token
      const decoded = verifyUnsubscribeToken(token);

      if (!decoded) {
        return res.status(400).send(renderErrorPage('Invalid or expired unsubscribe link'));
      }

      // Get user agent and IP for audit trail
      const userAgent = req.headers['user-agent'];
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;

      // Process unsubscribe
      await complianceService.unsubscribe({
        emailAddress: decoded.email,
        category: decoded.category,
        sourceType: 'email_link',
        unsubscribeToken: token,
        userAgent,
        ipAddress,
      });

      logger.info(
        { email: decoded.email, category: decoded.category, ipAddress },
        'User unsubscribed via email link'
      );

      // Render success page
      const html = renderSuccessPage({
        email: decoded.email,
        category: decoded.category || 'all emails',
      });

      res.status(200).send(html);
    } catch (error) {
      logger.error({ error, token: req.params.token }, 'Error processing unsubscribe');
      res.status(500).send(renderErrorPage('An error occurred while processing your request'));
    }
  });

  /**
   * POST /api/email/unsubscribe/preference-center
   * Public API for preference center unsubscribe
   * Requires email + token in body
   */
  router.post('/preference-center/update', async (req: Request, res: Response) => {
    try {
      const { email, token, categories } = req.body;

      if (!email || !token || !Array.isArray(categories)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify token for this email
      const decoded = verifyUnsubscribeToken(token);
      if (!decoded || decoded.email !== email) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;

      // Process each category preference
      for (const category of categories) {
        if (category.unsubscribed) {
          await complianceService.unsubscribe({
            emailAddress: email,
            category: category.name,
            sourceType: 'preference_center',
            unsubscribeToken: token,
            userAgent,
            ipAddress,
          });
        } else {
          await complianceService.resubscribe(email, category.name);
        }
      }

      logger.info({ email, categories: categories.length }, 'User updated email preferences');

      res.status(200).json({ success: true, message: 'Preferences updated' });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error updating preferences');
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  /**
   * GET /api/email/unsubscribe/list-unsubscribe/:token
   * RFC 8058 List-Unsubscribe (one-click unsubscribe)
   * POST endpoint for email clients that support one-click
   */
  router.post('/list-unsubscribe/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      // Verify and decode token
      const decoded = verifyUnsubscribeToken(token);

      if (!decoded) {
        return res.status(400).json({ error: 'Invalid token' });
      }

      // Process unsubscribe (no confirmation needed for list-unsubscribe)
      await complianceService.unsubscribe({
        emailAddress: decoded.email,
        category: decoded.category,
        sourceType: 'list_unsubscribe',
        unsubscribeToken: token,
      });

      logger.info(
        { email: decoded.email, category: decoded.category },
        'User unsubscribed via List-Unsubscribe header'
      );

      // Return 200 OK as per RFC 8058
      res.status(200).send();
    } catch (error) {
      logger.error({ error, token: req.params.token }, 'Error processing list-unsubscribe');
      res.status(500).json({ error: 'Failed to process unsubscribe' });
    }
  });

  return router;
}

/**
 * Generate an unsubscribe token for an email address
 * Used when sending emails to create unsubscribe links
 */
export function generateUnsubscribeToken(email: string, category?: string): string {
  const SECRET = process.env.UNSUBSCRIBE_SECRET || 'change-me-in-production';
  const payload = JSON.stringify({
    email,
    category,
    exp: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
  });

  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');

  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

/**
 * Verify and decode an unsubscribe token
 */
function verifyUnsubscribeToken(token: string): { email: string; category?: string } | null {
  try {
    const SECRET = process.env.UNSUBSCRIBE_SECRET || 'change-me-in-production';
    const [payloadB64, signature] = token.split('.');

    if (!payloadB64 || !signature) {
      return null;
    }

    // Verify signature
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('base64url');

    if (signature !== expectedSignature) {
      logger.warn('Invalid unsubscribe token signature');
      return null;
    }

    // Parse payload
    const data = JSON.parse(payload);

    // Check expiration
    if (data.exp && data.exp < Date.now()) {
      logger.warn({ email: data.email }, 'Expired unsubscribe token');
      return null;
    }

    return {
      email: data.email,
      category: data.category,
    };
  } catch (error) {
    logger.error({ error }, 'Error verifying unsubscribe token');
    return null;
  }
}

/**
 * Render unsubscribe confirmation page
 */
function renderUnsubscribePage(data: { email: string; category: string; token: string }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-top: 0;
    }
    p {
      color: #555;
    }
    .email {
      background: #f5f5f5;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      display: inline-block;
    }
    button {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 20px;
    }
    button:hover {
      background: #c0392b;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 14px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Unsubscribe from Emails</h1>
    <p>You are about to unsubscribe <span class="email">${data.email}</span> from receiving <strong>${data.category}</strong>.</p>
    <p>If you no longer wish to receive these emails, click the button below.</p>

    <form method="POST" action="/api/email/unsubscribe/${data.token}">
      <button type="submit">Confirm Unsubscribe</button>
    </form>

    <div class="footer">
      <p>If you clicked this link by mistake, simply close this page and no changes will be made.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Render unsubscribe success page
 */
function renderSuccessPage(data: { email: string; category: string }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #27ae60;
      margin-top: 0;
    }
    .checkmark {
      color: #27ae60;
      font-size: 48px;
      text-align: center;
      margin-bottom: 20px;
    }
    p {
      color: #555;
    }
    .email {
      background: #f5f5f5;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="checkmark">✓</div>
    <h1>You've Been Unsubscribed</h1>
    <p><span class="email">${data.email}</span> has been successfully unsubscribed from <strong>${data.category}</strong>.</p>
    <p>You will no longer receive these emails. This may take up to 48 hours to take effect.</p>
    <p style="margin-top: 32px; font-size: 14px; color: #888;">If you change your mind, you can update your preferences by contacting support.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Render error page
 */
function renderErrorPage(message: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .card {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #e74c3c;
      margin-top: 0;
    }
    p {
      color: #555;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Error</h1>
    <p>${message}</p>
    <p style="margin-top: 32px; font-size: 14px; color: #888;">If you continue to experience issues, please contact support.</p>
  </div>
</body>
</html>
  `;
}
