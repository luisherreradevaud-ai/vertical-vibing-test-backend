/**
 * Config Service Unit Tests
 *
 * Tests the ConfigService three-tier precedence system (DB > Env > Default),
 * type conversions, validation, and configuration management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigService } from '../config.service';
import { db } from '../../../shared/db/index';
import { systemConfig } from '../../../shared/db/schema/email.schema';
import { eq } from 'drizzle-orm';

// Mock database
vi.mock('../../../shared/db/index', () => ({
  db: {
    query: {
      systemConfig: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock logger
vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConfigService', () => {
  let configService: ConfigService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    configService = new ConfigService();
    vi.clearAllMocks();

    // Save and reset environment variables
    originalEnv = { ...process.env };
    delete process.env.TEST_KEY;
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
  });

  describe('Three-Tier Precedence System', () => {
    describe('get()', () => {
      it('should return database value (highest priority)', async () => {
        // Arrange
        const mockDbConfig = {
          id: 'config-1',
          key: 'TEST_KEY',
          value: 'db-value',
          allowEnvOverride: false,
          envVarName: null,
        };
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(mockDbConfig);
        process.env.TEST_KEY = 'env-value';

        // Act
        const result = await configService.get('TEST_KEY');

        // Assert
        expect(result).toBe('db-value');
        expect(db.query.systemConfig.findFirst).toHaveBeenCalledWith({
          where: expect.any(Function),
        });
      });

      it('should return environment variable when DB allows override', async () => {
        // Arrange
        const mockDbConfig = {
          id: 'config-1',
          key: 'TEST_KEY',
          value: 'db-value',
          allowEnvOverride: true,
          envVarName: 'TEST_KEY',
        };
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(mockDbConfig);
        process.env.TEST_KEY = 'env-value';

        // Act
        const result = await configService.get('TEST_KEY');

        // Assert
        expect(result).toBe('env-value');
      });

      it('should return environment variable (middle priority)', async () => {
        // Arrange
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);
        process.env.TEST_KEY = 'env-value';

        // Act
        const result = await configService.get('TEST_KEY');

        // Assert
        expect(result).toBe('env-value');
      });

      it('should return framework default (lowest priority)', async () => {
        // Arrange
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);
        delete process.env.EMAIL_FROM_ADDRESS;

        // Act
        const result = await configService.get('EMAIL_FROM_ADDRESS');

        // Assert
        expect(result).toBe('noreply@example.com');
      });

      it('should return null when no value found', async () => {
        // Arrange
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);
        delete process.env.UNKNOWN_KEY;

        // Act
        const result = await configService.get('UNKNOWN_KEY');

        // Assert
        expect(result).toBeNull();
      });

      it('should handle database errors gracefully', async () => {
        // Arrange
        vi.mocked(db.query.systemConfig.findFirst).mockRejectedValue(new Error('DB Error'));

        // Act & Assert
        await expect(configService.get('TEST_KEY')).rejects.toThrow('DB Error');
      });
    });

    describe('getAll()', () => {
      it('should return all configs with effective values', async () => {
        // Arrange
        const mockDbConfigs = [
          {
            id: 'config-1',
            key: 'DB_KEY',
            value: 'db-value',
            allowEnvOverride: false,
            envVarName: null,
          },
          {
            id: 'config-2',
            key: 'ENV_KEY',
            value: 'old-value',
            allowEnvOverride: true,
            envVarName: 'ENV_KEY',
          },
        ];
        vi.mocked(db.query.systemConfig.findMany).mockResolvedValue(mockDbConfigs);
        process.env.ENV_KEY = 'env-value';
        process.env.EXTRA_KEY = 'extra-value';

        // Mock the get() method to return proper values
        vi.spyOn(configService, 'get').mockImplementation(async (key: string) => {
          if (key === 'DB_KEY') return 'db-value';
          if (key === 'ENV_KEY') return 'env-value';
          if (key === 'EXTRA_KEY') return 'extra-value';
          if (key === 'EMAIL_FROM_ADDRESS') return 'noreply@example.com';
          return null;
        });

        // Act
        const result = await configService.getAll();

        // Assert
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((r) => r.key === 'DB_KEY' && r.effectiveValue === 'db-value')).toBe(true);
        expect(result.some((r) => r.key === 'ENV_KEY' && r.effectiveValue === 'env-value')).toBe(true);
      });

      it('should correctly identify source for each config', async () => {
        // Arrange
        const mockDbConfigs = [
          {
            id: 'config-1',
            key: 'DB_ONLY_KEY',
            value: 'db-value',
            allowEnvOverride: false,
            envVarName: null,
          },
        ];
        vi.mocked(db.query.systemConfig.findMany).mockResolvedValue(mockDbConfigs);
        process.env.ENV_ONLY_KEY = 'env-value';

        // Mock the get() method
        vi.spyOn(configService, 'get').mockImplementation(async (key: string) => {
          if (key === 'DB_ONLY_KEY') return 'db-value';
          if (key === 'ENV_ONLY_KEY') return 'env-value';
          if (key === 'EMAIL_FROM_ADDRESS') return 'noreply@example.com';
          return null;
        });

        // Act
        const result = await configService.getAll();

        // Assert
        const dbOnlyConfig = result.find((r) => r.key === 'DB_ONLY_KEY');
        const envOnlyConfig = result.find((r) => r.key === 'ENV_ONLY_KEY');
        const defaultConfig = result.find((r) => r.key === 'EMAIL_FROM_ADDRESS');

        expect(dbOnlyConfig?.source).toBe('database');
        expect(envOnlyConfig?.source).toBe('environment');
        expect(defaultConfig?.source).toBe('default');
      });
    });
  });

  describe('Type Conversions', () => {
    describe('getString()', () => {
      it('should return string value', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('test-value');

        // Act
        const result = await configService.getString('TEST_KEY');

        // Assert
        expect(result).toBe('test-value');
      });

      it('should return default value when config not found', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue(null);

        // Act
        const result = await configService.getString('TEST_KEY', 'default-value');

        // Assert
        expect(result).toBe('default-value');
      });

      it('should return empty string when no default provided', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue(null);

        // Act
        const result = await configService.getString('TEST_KEY');

        // Assert
        expect(result).toBe('');
      });
    });

    describe('getNumber()', () => {
      it('should convert string to number', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('42');

        // Act
        const result = await configService.getNumber('TEST_KEY');

        // Assert
        expect(result).toBe(42);
      });

      it('should return default when value is null', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue(null);

        // Act
        const result = await configService.getNumber('TEST_KEY', 99);

        // Assert
        expect(result).toBe(99);
      });

      it('should return default when value is not a number', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('not-a-number');

        // Act
        const result = await configService.getNumber('TEST_KEY', 99);

        // Assert
        expect(result).toBe(99);
      });

      it('should handle negative numbers', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('-42');

        // Act
        const result = await configService.getNumber('TEST_KEY');

        // Assert
        expect(result).toBe(-42);
      });

      it('should handle decimal numbers', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('3.14');

        // Act
        const result = await configService.getNumber('TEST_KEY');

        // Assert
        expect(result).toBe(3.14);
      });
    });

    describe('getBoolean()', () => {
      it('should convert "true" to boolean true', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('true');

        // Act
        const result = await configService.getBoolean('TEST_KEY');

        // Assert
        expect(result).toBe(true);
      });

      it('should convert "1" to boolean true', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('1');

        // Act
        const result = await configService.getBoolean('TEST_KEY');

        // Assert
        expect(result).toBe(true);
      });

      it('should convert "yes" to boolean true', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('yes');

        // Act
        const result = await configService.getBoolean('TEST_KEY');

        // Assert
        expect(result).toBe(true);
      });

      it('should convert "false" to boolean false', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('false');

        // Act
        const result = await configService.getBoolean('TEST_KEY');

        // Assert
        expect(result).toBe(false);
      });

      it('should return default when value is null', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue(null);

        // Act
        const result = await configService.getBoolean('TEST_KEY', true);

        // Assert
        expect(result).toBe(true);
      });

      it('should handle case-insensitive boolean values', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('TRUE');

        // Act
        const result = await configService.getBoolean('TEST_KEY');

        // Assert
        expect(result).toBe(true);
      });

      it('should handle whitespace in boolean values', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('  true  ');

        // Act
        const result = await configService.getBoolean('TEST_KEY');

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('getJSON()', () => {
      it('should parse valid JSON', async () => {
        // Arrange
        const jsonData = { key: 'value', number: 42 };
        vi.spyOn(configService, 'get').mockResolvedValue(JSON.stringify(jsonData));

        // Act
        const result = await configService.getJSON('TEST_KEY');

        // Assert
        expect(result).toEqual(jsonData);
      });

      it('should return default when value is null', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue(null);
        const defaultValue = { default: true };

        // Act
        const result = await configService.getJSON('TEST_KEY', defaultValue);

        // Assert
        expect(result).toEqual(defaultValue);
      });

      it('should return default on invalid JSON', async () => {
        // Arrange
        vi.spyOn(configService, 'get').mockResolvedValue('invalid-json');
        const defaultValue = { default: true };

        // Act
        const result = await configService.getJSON('TEST_KEY', defaultValue);

        // Assert
        expect(result).toEqual(defaultValue);
      });
    });
  });

  describe('Configuration Management', () => {
    describe('set()', () => {
      it('should create new configuration', async () => {
        // Arrange
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);
        const mockCreated = {
          id: 'config-1',
          key: 'NEW_KEY',
          value: 'new-value',
          valueType: 'string',
        };
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCreated]),
          }),
        } as any);

        // Act
        const result = await configService.set('NEW_KEY', 'new-value');

        // Assert
        expect(result).toEqual(mockCreated);
        expect(db.insert).toHaveBeenCalledWith(systemConfig);
      });

      it('should update existing configuration', async () => {
        // Arrange
        const existing = { id: 'config-1', key: 'EXISTING_KEY', value: 'old-value' };
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(existing);
        const mockUpdated = { ...existing, value: 'new-value' };
        vi.mocked(db.update).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockUpdated]),
            }),
          }),
        } as any);

        // Act
        const result = await configService.set('EXISTING_KEY', 'new-value');

        // Assert
        expect(result).toEqual(mockUpdated);
        expect(db.update).toHaveBeenCalledWith(systemConfig);
      });

      it('should validate value with validation rules', async () => {
        // Arrange
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);

        // Act & Assert
        await expect(
          configService.set('TEST_KEY', '5', {
            valueType: 'number',
            validationRules: { min: 10, max: 100 },
          })
        ).rejects.toThrow('less than minimum');
      });

      it('should accept value within validation range', async () => {
        // Arrange
        vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);
        const mockCreated = { id: 'config-1', key: 'TEST_KEY', value: '50' };
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockCreated]),
          }),
        } as any);

        // Act
        const result = await configService.set('TEST_KEY', '50', {
          valueType: 'number',
          validationRules: { min: 10, max: 100 },
        });

        // Assert
        expect(result).toEqual(mockCreated);
      });
    });

    describe('delete()', () => {
      it('should delete configuration from database', async () => {
        // Arrange
        vi.mocked(db.delete).mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        } as any);

        // Act
        await configService.delete('TEST_KEY');

        // Assert
        expect(db.delete).toHaveBeenCalledWith(systemConfig);
      });

      it('should handle deletion errors', async () => {
        // Arrange
        vi.mocked(db.delete).mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Delete failed')),
        } as any);

        // Act & Assert
        await expect(configService.delete('TEST_KEY')).rejects.toThrow('Delete failed');
      });
    });

    describe('bulkSet()', () => {
      it('should set multiple configurations', async () => {
        // Arrange
        const configs = [
          { key: 'KEY1', value: 'value1' },
          { key: 'KEY2', value: 'value2' },
        ];
        vi.spyOn(configService, 'set').mockResolvedValue({} as any);

        // Act
        await configService.bulkSet(configs);

        // Assert
        expect(configService.set).toHaveBeenCalledTimes(2);
        expect(configService.set).toHaveBeenCalledWith('KEY1', 'value1', undefined);
        expect(configService.set).toHaveBeenCalledWith('KEY2', 'value2', undefined);
      });
    });
  });

  describe('Validation', () => {
    it('should validate number type', async () => {
      // Arrange
      vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        configService.set('TEST_KEY', 'not-a-number', {
          valueType: 'number',
        })
      ).rejects.toThrow('Invalid number value');
    });

    it('should validate boolean type', async () => {
      // Arrange
      vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        configService.set('TEST_KEY', 'not-a-boolean', {
          valueType: 'boolean',
        })
      ).rejects.toThrow('Invalid boolean value');
    });

    it('should validate JSON type', async () => {
      // Arrange
      vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        configService.set('TEST_KEY', 'invalid-json', {
          valueType: 'json',
        })
      ).rejects.toThrow('Invalid JSON value');
    });

    it('should validate pattern', async () => {
      // Arrange
      vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        configService.set('TEST_KEY', 'invalid', {
          validationRules: { pattern: '^[0-9]+$' },
        })
      ).rejects.toThrow('does not match pattern');
    });

    it('should validate enum options', async () => {
      // Arrange
      vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        configService.set('TEST_KEY', 'invalid', {
          validationRules: { options: ['option1', 'option2'] },
        })
      ).rejects.toThrow('must be one of');
    });

    it('should validate required fields', async () => {
      // Arrange
      vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue(null);

      // Act & Assert
      await expect(
        configService.set('TEST_KEY', '', {
          validationRules: { required: true },
        })
      ).rejects.toThrow('Value is required');
    });
  });

  describe('Specialized Config Getters', () => {
    describe('getEmailConfig()', () => {
      it('should return email configuration object', async () => {
        // Arrange
        vi.spyOn(configService, 'getString').mockImplementation(async (key: string) => {
          if (key === 'EMAIL_FROM_ADDRESS') return 'from@example.com';
          if (key === 'EMAIL_FROM_NAME') return 'From Name';
          return '';
        });
        vi.spyOn(configService, 'getBoolean').mockResolvedValue(true);
        vi.spyOn(configService, 'getNumber').mockResolvedValue(3);

        // Act
        const result = await configService.getEmailConfig();

        // Assert
        expect(result).toHaveProperty('fromAddress', 'from@example.com');
        expect(result).toHaveProperty('fromName', 'From Name');
        expect(result).toHaveProperty('queueEnabled', true);
        expect(result).toHaveProperty('maxRetries', 3);
      });
    });

    describe('getAWSConfig()', () => {
      it('should return AWS configuration object', async () => {
        // Arrange
        vi.spyOn(configService, 'getString').mockImplementation(async (key: string) => {
          if (key === 'AWS_REGION') return 'us-east-1';
          return 'latest';
        });
        vi.spyOn(configService, 'getNumber').mockResolvedValue(20);

        // Act
        const result = await configService.getAWSConfig();

        // Assert
        expect(result).toHaveProperty('region', 'us-east-1');
        expect(result.ses).toHaveProperty('apiVersion', 'latest');
        expect(result.sqs).toHaveProperty('waitTimeSeconds', 20);
      });
    });

    describe('getWorkerConfig()', () => {
      it('should return worker configuration object', async () => {
        // Arrange
        vi.spyOn(configService, 'getBoolean').mockResolvedValue(true);
        vi.spyOn(configService, 'getNumber').mockImplementation(async (key: string) => {
          if (key === 'WORKER_CONCURRENCY') return 5;
          if (key === 'WORKER_POLL_INTERVAL_MS') return 1000;
          return 0;
        });

        // Act
        const result = await configService.getWorkerConfig();

        // Assert
        expect(result).toHaveProperty('enabled', true);
        expect(result).toHaveProperty('concurrency', 5);
        expect(result).toHaveProperty('pollIntervalMs', 1000);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent get() calls', async () => {
      // Arrange
      vi.mocked(db.query.systemConfig.findFirst).mockResolvedValue({
        id: 'config-1',
        key: 'TEST_KEY',
        value: 'test-value',
      });

      // Act
      const results = await Promise.all([
        configService.get('TEST_KEY'),
        configService.get('TEST_KEY'),
        configService.get('TEST_KEY'),
      ]);

      // Assert
      expect(results).toEqual(['test-value', 'test-value', 'test-value']);
    });

    it('should handle empty string values', async () => {
      // Arrange
      vi.spyOn(configService, 'get').mockResolvedValue('');

      // Act
      const result = await configService.getString('TEST_KEY');

      // Assert
      expect(result).toBe('');
    });

    it('should handle whitespace-only values', async () => {
      // Arrange
      vi.spyOn(configService, 'get').mockResolvedValue('   ');

      // Act
      const result = await configService.getString('TEST_KEY');

      // Assert
      expect(result).toBe('   ');
    });
  });
});
