import { Router, type Request, type Response } from 'express';
import { ConfigService } from './config.service.js';
import {
  createSystemConfigDTOSchema,
  updateSystemConfigDTOSchema,
  listSystemConfigsQuerySchema,
} from '@vertical-vibing/shared-types';
import { logger } from '../../shared/utils/logger.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { emailPermissions } from './email-permission.middleware.js';
import { requireSuperadmin } from '../../shared/middleware/authorize.js';
import { db } from '../../shared/db/index.js';
import { systemConfig } from '../../shared/db/schema/email.schema.js';
import { eq, like, and } from 'drizzle-orm';

/**
 * Email Configuration Router
 *
 * Admin API endpoints for managing system configuration:
 * - List all configuration values
 * - Get specific config value
 * - Update configuration
 * - Delete custom configuration
 * - Initialize defaults
 *
 * All endpoints require authentication and IAM permissions
 */
export function createEmailConfigRouter(): Router {
  const router = Router();
  const configService = new ConfigService();

  /**
   * GET /api/email/config
   * List all configuration with effective values
   */
  router.get('/', authenticate, emailPermissions.readConfig(), async (req: Request, res: Response) => {
    try {

      // Parse and validate query parameters
      const query = listSystemConfigsQuerySchema.parse({
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        category: req.query.category,
        search: req.query.search,
        showSensitive: req.query.showSensitive === 'true',
      });

      // Build query conditions
      const conditions = [];

      if (query.category) {
        conditions.push(eq(systemConfig.category, query.category));
      }

      if (query.search) {
        conditions.push(like(systemConfig.key, `%${query.search}%`));
      }

      // Get configs from database
      const configs = await db.query.systemConfig.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
      });

      // Get all configs with effective values
      const allConfigs = await configService.getAll();

      // Filter and format
      let filteredConfigs = allConfigs;

      if (query.category) {
        filteredConfigs = filteredConfigs.filter((c) => c.dbConfig?.category === query.category);
      }

      if (query.search) {
        filteredConfigs = filteredConfigs.filter((c) =>
          c.key.toLowerCase().includes(query.search!.toLowerCase()),
        );
      }

      // Hide sensitive values unless requested
      const formattedConfigs = filteredConfigs.map((config) => {
        const isSensitive = config.dbConfig?.isSensitive ?? false;
        return {
          key: config.key,
          value: isSensitive && !query.showSensitive ? '***REDACTED***' : config.value,
          effectiveValue: isSensitive && !query.showSensitive ? '***REDACTED***' : config.effectiveValue,
          source: config.source,
          valueType: config.dbConfig?.valueType,
          category: config.dbConfig?.category,
          description: config.dbConfig?.description,
          isSensitive,
          allowEnvOverride: config.dbConfig?.allowEnvOverride,
          canEdit: config.source === 'database',
        };
      });

      // Paginate
      const offset = (query.page - 1) * query.limit;
      const paginatedConfigs = formattedConfigs.slice(offset, offset + query.limit);

      res.json({
        configs: paginatedConfigs,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: formattedConfigs.length,
          totalPages: Math.ceil(formattedConfigs.length / query.limit),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Error listing configuration');
      res.status(500).json({ error: 'Failed to list configuration' });
    }
  });

  /**
   * GET /api/email/config/:key
   * Get specific configuration value
   */
  router.get('/:key', authenticate, emailPermissions.readConfig(), async (req: Request, res: Response) => {
    try {

      const key = req.params.key;
      const value = await configService.get(key);

      if (value === null) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      // Get DB config if exists
      const dbConfig = await db.query.systemConfig.findFirst({
        where: eq(systemConfig.key, key),
      });

      const isSensitive = dbConfig?.isSensitive ?? false;
      const showSensitive = req.query.showSensitive === 'true';

      res.json({
        key,
        value: isSensitive && !showSensitive ? '***REDACTED***' : value,
        valueType: dbConfig?.valueType ?? 'string',
        category: dbConfig?.category,
        description: dbConfig?.description,
        isSensitive,
        allowEnvOverride: dbConfig?.allowEnvOverride,
        envVarName: dbConfig?.envVarName,
        validationRules: dbConfig?.validationRules,
        source: dbConfig ? 'database' : 'environment_or_default',
      });
    } catch (error) {
      logger.error({ error, key: req.params.key }, 'Error getting configuration');
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  });

  /**
   * POST /api/email/config
   * Create new configuration
   */
  router.post('/', authenticate, emailPermissions.writeConfig(), async (req: Request, res: Response) => {
    try {

      const configData = createSystemConfigDTOSchema.parse(req.body);

      const created = await configService.set(configData.key, configData.value, {
        valueType: configData.valueType,
        category: configData.category,
        description: configData.description,
        isSensitive: configData.isSensitive,
        allowEnvOverride: configData.allowEnvOverride,
        envVarName: configData.envVarName,
        validationRules: configData.validationRules,
        updatedBy: req.user?.id,
      });

      logger.info({ key: created.key }, 'Created configuration');

      res.status(201).json(created);
    } catch (error) {
      logger.error({ error, body: req.body }, 'Error creating configuration');

      if (error instanceof Error && error.message.includes('unique constraint')) {
        return res.status(409).json({ error: 'Configuration key already exists' });
      }

      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to create configuration' });
    }
  });

  /**
   * PUT /api/email/config/:key
   * Update configuration
   */
  router.put('/:key', authenticate, emailPermissions.writeConfig(), async (req: Request, res: Response) => {
    try {

      const updateData = updateSystemConfigDTOSchema.parse(req.body);

      const updated = await configService.set(req.params.key, updateData.value!, {
        valueType: updateData.valueType,
        category: updateData.category,
        description: updateData.description,
        isSensitive: updateData.isSensitive,
        allowEnvOverride: updateData.allowEnvOverride,
        validationRules: updateData.validationRules,
        updatedBy: req.user?.id,
      });

      logger.info({ key: updated.key }, 'Updated configuration');

      res.json(updated);
    } catch (error) {
      logger.error({ error, key: req.params.key }, 'Error updating configuration');

      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  /**
   * DELETE /api/email/config/:key
   * Delete configuration (remove from database, fall back to env/default)
   */
  router.delete('/:key', authenticate, emailPermissions.deleteConfig(), async (req: Request, res: Response) => {
    try {

      await configService.delete(req.params.key);

      logger.info({ key: req.params.key }, 'Deleted configuration');

      res.json({ success: true, message: 'Configuration deleted' });
    } catch (error) {
      logger.error({ error, key: req.params.key }, 'Error deleting configuration');
      res.status(500).json({ error: 'Failed to delete configuration' });
    }
  });

  /**
   * POST /api/email/config/initialize
   * Initialize default configuration in database
   */
  router.post('/initialize', authenticate, requireSuperadmin(), async (req: Request, res: Response) => {
    try {

      await configService.initializeDefaults();

      logger.info('Initialized default configuration');

      res.json({ success: true, message: 'Default configuration initialized' });
    } catch (error) {
      logger.error({ error }, 'Error initializing configuration');
      res.status(500).json({ error: 'Failed to initialize configuration' });
    }
  });

  /**
   * GET /api/email/config/categories
   * Get all configuration categories
   */
  router.get('/meta/categories', authenticate, emailPermissions.readConfig(), async (req: Request, res: Response) => {
    try {

      const categories = ['email', 'billing', 'general', 'feature-flags', 'integrations'];

      res.json({ categories });
    } catch (error) {
      logger.error({ error }, 'Error getting configuration categories');
      res.status(500).json({ error: 'Failed to get configuration categories' });
    }
  });

  return router;
}
