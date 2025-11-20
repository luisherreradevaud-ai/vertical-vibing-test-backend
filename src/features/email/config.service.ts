import type { SystemConfig, ConfigValidationRules } from '@vertical-vibing/shared-types';
import { eq } from 'drizzle-orm';
import { db } from '../../shared/db/index.js';
import { systemConfig } from '../../shared/db/schema/email.schema.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Configuration Service
 *
 * Manages system configuration with three-tier precedence:
 * 1. Database (highest priority) - Admin UI editable
 * 2. Environment variables (middle) - Deployment specific
 * 3. Framework defaults (fallback) - Hardcoded safe defaults
 *
 * This allows maximum flexibility:
 * - Developers can set env vars for deployment-specific config
 * - Admins can override via UI without code changes
 * - Framework provides safe defaults
 */
export class ConfigService {
  /**
   * Default framework configuration
   * These are safe defaults that work out of the box
   */
  private static readonly FRAMEWORK_DEFAULTS: Record<string, any> = {
    // Email Service
    EMAIL_FROM_ADDRESS: 'noreply@example.com',
    EMAIL_FROM_NAME: 'Vertical Vibing',
    EMAIL_REPLY_TO: '',
    EMAIL_QUEUE_ENABLED: 'true',
    EMAIL_QUEUE_NAME: 'email-queue',
    EMAIL_MAX_RETRIES: '3',
    EMAIL_RETRY_DELAY_MS: '60000', // 1 minute

    // AWS SES
    AWS_REGION: 'us-east-1',
    AWS_SES_API_VERSION: 'latest',
    AWS_SES_CONFIGURATION_SET: '',

    // AWS SQS
    AWS_SQS_API_VERSION: 'latest',
    AWS_SQS_WAIT_TIME_SECONDS: '20',
    AWS_SQS_VISIBILITY_TIMEOUT: '300', // 5 minutes
    AWS_SQS_MAX_MESSAGES: '10',

    // Email Logging
    EMAIL_LOG_RETENTION_DAYS: '90',
    EMAIL_BOUNCE_RETENTION_DAYS: '365',

    // Rate Limiting
    EMAIL_RATE_LIMIT_PER_SECOND: '14', // AWS SES sandbox limit
    EMAIL_RATE_LIMIT_PER_DAY: '200', // AWS SES sandbox limit

    // Template Settings
    TEMPLATE_CACHE_ENABLED: 'true',
    TEMPLATE_CACHE_TTL_SECONDS: '3600', // 1 hour

    // Worker Settings
    WORKER_ENABLED: 'false',
    WORKER_CONCURRENCY: '5',
    WORKER_POLL_INTERVAL_MS: '1000',

    // Feature Flags
    EMAIL_SYSTEM_ENABLED: 'true',
    EMAIL_SANDBOX_MODE: 'true', // Start in sandbox for safety
  };

  /**
   * Get configuration value with precedence: DB > Env > Default
   */
  async get(key: string): Promise<string | null> {
    try {
      // 1. Try database first (highest priority)
      const dbConfig = await db.query.systemConfig.findFirst({
        where: eq(systemConfig.key, key),
      });

      if (dbConfig) {
        // Check if environment variable override is allowed
        if (dbConfig.allowEnvOverride && dbConfig.envVarName) {
          const envValue = process.env[dbConfig.envVarName];
          if (envValue !== undefined) {
            logger.debug({ key, source: 'environment' }, 'Using environment variable override');
            return envValue;
          }
        }

        logger.debug({ key, source: 'database' }, 'Using database config');
        return dbConfig.value;
      }

      // 2. Try environment variable (middle priority)
      const envValue = process.env[key];
      if (envValue !== undefined) {
        logger.debug({ key, source: 'environment' }, 'Using environment variable');
        return envValue;
      }

      // 3. Use framework default (fallback)
      const defaultValue = ConfigService.FRAMEWORK_DEFAULTS[key];
      if (defaultValue !== undefined) {
        logger.debug({ key, source: 'default' }, 'Using framework default');
        return String(defaultValue);
      }

      logger.warn({ key }, 'Configuration key not found in any source');
      return null;
    } catch (error) {
      logger.error({ error, key }, 'Error getting configuration');
      throw error;
    }
  }

  /**
   * Get configuration as specific type
   */
  async getString(key: string, defaultValue: string = ''): Promise<string> {
    const value = await this.get(key);
    return value ?? defaultValue;
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.get(key);
    if (value === null) return defaultValue;

    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return defaultValue;

    const lowercaseValue = value.toLowerCase().trim();
    return lowercaseValue === 'true' || lowercaseValue === '1' || lowercaseValue === 'yes';
  }

  async getJSON<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) return defaultValue;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ error, key, value }, 'Error parsing JSON config');
      return defaultValue;
    }
  }

  /**
   * Get all configuration with effective values
   */
  async getAll(): Promise<
    Array<{
      key: string;
      value: string;
      effectiveValue: string;
      source: 'database' | 'environment' | 'default';
      dbConfig?: SystemConfig;
    }>
  > {
    try {
      // Get all DB configs
      const dbConfigs = await db.query.systemConfig.findMany();

      // Build result with all sources
      const allKeys = new Set([
        ...dbConfigs.map((c) => c.key),
        ...Object.keys(process.env),
        ...Object.keys(ConfigService.FRAMEWORK_DEFAULTS),
      ]);

      const results = [];

      for (const key of allKeys) {
        const effectiveValue = await this.get(key);
        if (effectiveValue === null) continue;

        const dbConfig = dbConfigs.find((c) => c.key === key);
        let source: 'database' | 'environment' | 'default';

        if (dbConfig && (!dbConfig.allowEnvOverride || !process.env[dbConfig.envVarName ?? ''])) {
          source = 'database';
        } else if (process.env[key] !== undefined || process.env[dbConfig?.envVarName ?? ''] !== undefined) {
          source = 'environment';
        } else {
          source = 'default';
        }

        results.push({
          key,
          value: dbConfig?.value ?? process.env[key] ?? ConfigService.FRAMEWORK_DEFAULTS[key] ?? '',
          effectiveValue,
          source,
          dbConfig,
        });
      }

      return results;
    } catch (error) {
      logger.error({ error }, 'Error getting all configuration');
      throw error;
    }
  }

  /**
   * Set configuration value in database
   */
  async set(
    key: string,
    value: string,
    options?: {
      valueType?: 'string' | 'number' | 'boolean' | 'json';
      category?: 'email' | 'billing' | 'general' | 'feature-flags' | 'integrations';
      description?: string;
      isSensitive?: boolean;
      allowEnvOverride?: boolean;
      envVarName?: string;
      validationRules?: ConfigValidationRules;
      updatedBy?: string;
    },
  ): Promise<SystemConfig> {
    try {
      // Validate value if rules are provided
      if (options?.validationRules) {
        this.validateValue(value, options.validationRules, options.valueType);
      }

      // Check if config exists
      const existing = await db.query.systemConfig.findFirst({
        where: eq(systemConfig.key, key),
      });

      if (existing) {
        // Update existing
        const [updated] = await db
          .update(systemConfig)
          .set({
            value,
            valueType: options?.valueType ?? existing.valueType,
            category: options?.category ?? existing.category,
            description: options?.description ?? existing.description,
            isSensitive: options?.isSensitive ?? existing.isSensitive,
            allowEnvOverride: options?.allowEnvOverride ?? existing.allowEnvOverride,
            validationRules: options?.validationRules ?? existing.validationRules,
            updatedBy: options?.updatedBy ?? null,
            updatedAt: new Date(),
          })
          .where(eq(systemConfig.id, existing.id))
          .returning();

        logger.info({ key, source: 'database' }, 'Updated configuration');
        return updated;
      } else {
        // Create new
        const [created] = await db
          .insert(systemConfig)
          .values({
            key,
            value,
            valueType: options?.valueType ?? 'string',
            category: options?.category ?? null,
            description: options?.description ?? null,
            isSensitive: options?.isSensitive ?? false,
            allowEnvOverride: options?.allowEnvOverride ?? true,
            envVarName: options?.envVarName ?? null,
            validationRules: options?.validationRules ?? null,
            updatedBy: options?.updatedBy ?? null,
          })
          .returning();

        logger.info({ key, source: 'database' }, 'Created configuration');
        return created;
      }
    } catch (error) {
      logger.error({ error, key }, 'Error setting configuration');
      throw error;
    }
  }

  /**
   * Delete configuration from database
   */
  async delete(key: string): Promise<void> {
    try {
      await db.delete(systemConfig).where(eq(systemConfig.key, key));
      logger.info({ key }, 'Deleted configuration');
    } catch (error) {
      logger.error({ error, key }, 'Error deleting configuration');
      throw error;
    }
  }

  /**
   * Bulk set configuration
   */
  async bulkSet(configs: Array<{ key: string; value: string; options?: any }>): Promise<void> {
    try {
      for (const config of configs) {
        await this.set(config.key, config.value, config.options);
      }
      logger.info({ count: configs.length }, 'Bulk set configuration');
    } catch (error) {
      logger.error({ error }, 'Error bulk setting configuration');
      throw error;
    }
  }

  /**
   * Validate configuration value against rules
   */
  private validateValue(
    value: string,
    rules: ConfigValidationRules,
    valueType: 'string' | 'number' | 'boolean' | 'json' = 'string',
  ): void {
    // Type validation
    if (valueType === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        throw new Error(`Invalid number value: ${value}`);
      }

      if (rules.min !== undefined && numValue < rules.min) {
        throw new Error(`Value ${numValue} is less than minimum ${rules.min}`);
      }

      if (rules.max !== undefined && numValue > rules.max) {
        throw new Error(`Value ${numValue} is greater than maximum ${rules.max}`);
      }
    }

    if (valueType === 'boolean') {
      const lowercaseValue = value.toLowerCase().trim();
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];
      if (!validBooleans.includes(lowercaseValue)) {
        throw new Error(`Invalid boolean value: ${value}`);
      }
    }

    if (valueType === 'json') {
      try {
        JSON.parse(value);
      } catch {
        throw new Error(`Invalid JSON value: ${value}`);
      }
    }

    // Pattern validation
    if (rules.pattern) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        throw new Error(`Value does not match pattern: ${rules.pattern}`);
      }
    }

    // String length validation
    if (valueType === 'string') {
      if (rules.min !== undefined && value.length < rules.min) {
        throw new Error(`Value length ${value.length} is less than minimum ${rules.min}`);
      }

      if (rules.max !== undefined && value.length > rules.max) {
        throw new Error(`Value length ${value.length} is greater than maximum ${rules.max}`);
      }
    }

    // Options validation (enum)
    if (rules.options && rules.options.length > 0) {
      if (!rules.options.includes(value)) {
        throw new Error(`Value must be one of: ${rules.options.join(', ')}`);
      }
    }

    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      throw new Error('Value is required');
    }
  }

  /**
   * Get email-specific configuration as a typed object
   */
  async getEmailConfig() {
    return {
      fromAddress: await this.getString('EMAIL_FROM_ADDRESS'),
      fromName: await this.getString('EMAIL_FROM_NAME'),
      replyTo: await this.getString('EMAIL_REPLY_TO'),
      queueEnabled: await this.getBoolean('EMAIL_QUEUE_ENABLED'),
      queueName: await this.getString('EMAIL_QUEUE_NAME'),
      maxRetries: await this.getNumber('EMAIL_MAX_RETRIES'),
      retryDelayMs: await this.getNumber('EMAIL_RETRY_DELAY_MS'),
      sandboxMode: await this.getBoolean('EMAIL_SANDBOX_MODE'),
      rateLimitPerSecond: await this.getNumber('EMAIL_RATE_LIMIT_PER_SECOND'),
      rateLimitPerDay: await this.getNumber('EMAIL_RATE_LIMIT_PER_DAY'),
    };
  }

  /**
   * Get AWS configuration
   */
  async getAWSConfig() {
    return {
      region: await this.getString('AWS_REGION'),
      ses: {
        apiVersion: await this.getString('AWS_SES_API_VERSION'),
        configurationSet: await this.getString('AWS_SES_CONFIGURATION_SET'),
      },
      sqs: {
        apiVersion: await this.getString('AWS_SQS_API_VERSION'),
        waitTimeSeconds: await this.getNumber('AWS_SQS_WAIT_TIME_SECONDS'),
        visibilityTimeout: await this.getNumber('AWS_SQS_VISIBILITY_TIMEOUT'),
        maxMessages: await this.getNumber('AWS_SQS_MAX_MESSAGES'),
      },
    };
  }

  /**
   * Get worker configuration
   */
  async getWorkerConfig() {
    return {
      enabled: await this.getBoolean('WORKER_ENABLED'),
      concurrency: await this.getNumber('WORKER_CONCURRENCY'),
      pollIntervalMs: await this.getNumber('WORKER_POLL_INTERVAL_MS'),
    };
  }

  /**
   * Initialize default configuration in database if not exists
   */
  async initializeDefaults(): Promise<void> {
    try {
      const existingConfigs = await db.query.systemConfig.findMany();
      const existingKeys = new Set(existingConfigs.map((c) => c.key));

      const defaultsToCreate = Object.entries(ConfigService.FRAMEWORK_DEFAULTS)
        .filter(([key]) => !existingKeys.has(key))
        .map(([key, value]) => ({
          key,
          value: String(value),
          valueType: this.inferValueType(value),
          category: this.inferCategory(key),
          description: `Default ${key} configuration`,
          isSensitive: key.toLowerCase().includes('secret') || key.toLowerCase().includes('password'),
          allowEnvOverride: true,
          envVarName: key,
          validationRules: null,
          updatedBy: null,
        }));

      if (defaultsToCreate.length > 0) {
        await db.insert(systemConfig).values(defaultsToCreate);
        logger.info({ count: defaultsToCreate.length }, 'Initialized default configuration');
      }
    } catch (error) {
      logger.error({ error }, 'Error initializing default configuration');
      throw error;
    }
  }

  private inferValueType(value: any): 'string' | 'number' | 'boolean' | 'json' {
    if (typeof value === 'boolean' || value === 'true' || value === 'false') return 'boolean';
    if (typeof value === 'number' || !isNaN(Number(value))) return 'number';
    try {
      JSON.parse(String(value));
      return 'json';
    } catch {
      return 'string';
    }
  }

  private inferCategory(key: string): 'email' | 'billing' | 'general' | 'feature-flags' | 'integrations' {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('email')) return 'email';
    if (keyLower.includes('billing') || keyLower.includes('stripe')) return 'billing';
    if (keyLower.includes('enabled') || keyLower.includes('feature')) return 'feature-flags';
    if (keyLower.includes('aws') || keyLower.includes('ses') || keyLower.includes('sqs')) return 'integrations';
    return 'general';
  }
}
