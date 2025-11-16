/**
 * Audit Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { auditService } from '../audit.service';

describe('Audit Service', () => {
  let consoleLogSpy: any;

  beforeEach(async () => {
    // Clear all logs before each test
    await auditService.clearLogs();

    // Suppress console.log in tests
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Log Operations', () => {
    describe('logUserLevelCreated', () => {
      it('should create audit log with correct data', async () => {
        await auditService.logUserLevelCreated(
          'user-123',
          'company-456',
          'level-789',
          { name: 'Manager', description: 'Manager level' }
        );

        const { logs } = await auditService.getLogsForCompany('company-456');

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
          companyId: 'company-456',
          userId: 'user-123',
          action: 'user_level.created',
          entityType: 'user-level',
          entityId: 'level-789',
          changes: { name: 'Manager', description: 'Manager level' },
        });
        expect(logs[0].id).toBeDefined();
        expect(logs[0].timestamp).toBeDefined();
      });

      it('should log to console', async () => {
        await auditService.logUserLevelCreated(
          'user-123',
          'company-456',
          'level-789',
          { name: 'Manager' }
        );

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] user_level.created')
        );
      });
    });

    describe('logUserLevelUpdated', () => {
      it('should log changes', async () => {
        await auditService.logUserLevelUpdated(
          'user-123',
          'company-456',
          'level-789',
          { name: 'Senior Manager', description: 'Updated description' }
        );

        const { logs } = await auditService.getLogsForCompany('company-456');

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
          action: 'user_level.updated',
          entityType: 'user-level',
          entityId: 'level-789',
          changes: { name: 'Senior Manager', description: 'Updated description' },
        });
      });
    });

    describe('logUserLevelDeleted', () => {
      it('should log deletion', async () => {
        await auditService.logUserLevelDeleted(
          'user-123',
          'company-456',
          'level-789',
          { reason: 'No longer needed' }
        );

        const { logs } = await auditService.getLogsForCompany('company-456');

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
          action: 'user_level.deleted',
          entityType: 'user-level',
          entityId: 'level-789',
          metadata: { reason: 'No longer needed' },
        });
      });

      it('should work without metadata', async () => {
        await auditService.logUserLevelDeleted(
          'user-123',
          'company-456',
          'level-789'
        );

        const { logs } = await auditService.getLogsForCompany('company-456');

        expect(logs).toHaveLength(1);
        expect(logs[0].metadata).toBeUndefined();
      });
    });

    describe('logViewPermissionsUpdated', () => {
      it('should log permission changes with counts', async () => {
        const permissions = [
          { viewId: 'view-1', state: 'allow' },
          { viewId: 'view-2', state: 'deny' },
          { viewId: 'view-3', state: 'inherit' },
          { viewId: 'view-4', state: 'allow' },
        ];

        await auditService.logViewPermissionsUpdated(
          'user-123',
          'company-456',
          'level-789',
          permissions
        );

        const { logs } = await auditService.getLogsForCompany('company-456');

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
          action: 'permissions.views_updated',
          entityType: 'permission',
          entityId: 'level-789',
          changes: {
            permissionCount: 4,
            allowCount: 2,
            denyCount: 1,
            inheritCount: 1,
          },
        });
        expect(logs[0].metadata).toEqual({ permissions });
      });
    });

    describe('logFeaturePermissionsUpdated', () => {
      it('should log permission changes with allowed/denied counts', async () => {
        const permissions = [
          { featureId: 'feat-1', action: 'Create', value: true },
          { featureId: 'feat-2', action: 'Update', value: false },
          { featureId: 'feat-3', action: 'Delete', value: true },
        ];

        await auditService.logFeaturePermissionsUpdated(
          'user-123',
          'company-456',
          'level-789',
          permissions
        );

        const { logs } = await auditService.getLogsForCompany('company-456');

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
          action: 'permissions.features_updated',
          entityType: 'permission',
          entityId: 'level-789',
          changes: {
            permissionCount: 3,
            allowedCount: 2,
            deniedCount: 1,
          },
        });
        expect(logs[0].metadata).toEqual({ permissions });
      });
    });

    describe('logUserLevelsAssigned', () => {
      it('should log assignments with before/after', async () => {
        await auditService.logUserLevelsAssigned(
          'user-123',
          'company-456',
          'target-user-789',
          ['level-1', 'level-2', 'level-3'],
          ['level-1', 'level-4']
        );

        const { logs } = await auditService.getLogsForCompany('company-456');

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
          action: 'assignment.user_levels_updated',
          entityType: 'assignment',
          entityId: 'target-user-789',
          changes: {
            before: ['level-1', 'level-4'],
            after: ['level-1', 'level-2', 'level-3'],
            added: ['level-2', 'level-3'],
            removed: ['level-4'],
          },
        });
      });

      it('should handle no previous levels', async () => {
        await auditService.logUserLevelsAssigned(
          'user-123',
          'company-456',
          'target-user-789',
          ['level-1', 'level-2']
        );

        const { logs } = await auditService.getLogsForCompany('company-456');

        expect(logs[0].changes).toMatchObject({
          before: [],
          after: ['level-1', 'level-2'],
          added: ['level-1', 'level-2'],
          removed: [],
        });
      });
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create test data
      await auditService.logUserLevelCreated('user-1', 'company-1', 'level-1', { name: 'Level 1' });
      await auditService.logUserLevelUpdated('user-2', 'company-1', 'level-1', { name: 'Updated' });
      await auditService.logUserLevelCreated('user-1', 'company-2', 'level-2', { name: 'Level 2' });
      await auditService.logViewPermissionsUpdated('user-1', 'company-1', 'level-1', []);
      await auditService.logFeaturePermissionsUpdated('user-2', 'company-1', 'level-1', []);
    });

    describe('getLogsForCompany', () => {
      it('should return logs for specific company', async () => {
        const { logs, total } = await auditService.getLogsForCompany('company-1');

        expect(total).toBe(4);
        expect(logs).toHaveLength(4);
        expect(logs.every(log => log.companyId === 'company-1')).toBe(true);
      });

      it('should filter by entityType', async () => {
        const { logs, total } = await auditService.getLogsForCompany('company-1', {
          entityType: 'user-level',
        });

        expect(total).toBe(2);
        expect(logs).toHaveLength(2);
        expect(logs.every(log => log.entityType === 'user-level')).toBe(true);
      });

      it('should filter by action', async () => {
        const { logs, total } = await auditService.getLogsForCompany('company-1', {
          action: 'user_level.created',
        });

        expect(total).toBe(1);
        expect(logs).toHaveLength(1);
        expect(logs[0].action).toBe('user_level.created');
      });

      it('should support pagination', async () => {
        const { logs, total } = await auditService.getLogsForCompany('company-1', {
          limit: 2,
          offset: 0,
        });

        expect(total).toBe(4);
        expect(logs).toHaveLength(2);

        const { logs: page2 } = await auditService.getLogsForCompany('company-1', {
          limit: 2,
          offset: 2,
        });

        expect(page2).toHaveLength(2);
        // Ensure different logs
        expect(logs[0].id).not.toBe(page2[0].id);
      });

      it('should sort by timestamp descending', async () => {
        const { logs } = await auditService.getLogsForCompany('company-1');

        // Verify timestamps are in descending order
        for (let i = 0; i < logs.length - 1; i++) {
          expect(logs[i].timestamp >= logs[i + 1].timestamp).toBe(true);
        }
      });

      it('should filter by date range', async () => {
        const now = new Date();
        const future = new Date(now.getTime() + 1000);
        const past = new Date(now.getTime() - 1000);

        await auditService.clearLogs();

        // Create logs at different times (simulated via timestamp)
        await auditService.logUserLevelCreated('user-1', 'company-1', 'level-1', { name: 'Test' });

        const { logs: allLogs } = await auditService.getLogsForCompany('company-1');
        const logTime = allLogs[0].timestamp;

        // Filter to include this log
        const { logs: includedLogs } = await auditService.getLogsForCompany('company-1', {
          startDate: past.toISOString(),
          endDate: future.toISOString(),
        });

        expect(includedLogs).toHaveLength(1);

        // Filter to exclude this log
        const { logs: excludedLogs } = await auditService.getLogsForCompany('company-1', {
          startDate: future.toISOString(),
        });

        expect(excludedLogs).toHaveLength(0);
      });

      it('should return empty array for non-existent company', async () => {
        const { logs, total } = await auditService.getLogsForCompany('company-999');

        expect(total).toBe(0);
        expect(logs).toHaveLength(0);
      });
    });

    describe('getLogsForEntity', () => {
      it('should return logs for specific entity', async () => {
        const logs = await auditService.getLogsForEntity(
          'user-level',
          'level-1',
          'company-1'
        );

        expect(logs).toHaveLength(2);
        expect(logs.every(log => log.entityId === 'level-1')).toBe(true);
        expect(logs.every(log => log.entityType === 'user-level')).toBe(true);
      });

      it('should only return logs for specified company', async () => {
        const logs = await auditService.getLogsForEntity(
          'user-level',
          'level-1',
          'company-999'
        );

        expect(logs).toHaveLength(0);
      });

      it('should sort by timestamp descending', async () => {
        const logs = await auditService.getLogsForEntity(
          'user-level',
          'level-1',
          'company-1'
        );

        // Verify timestamps are in descending order
        for (let i = 0; i < logs.length - 1; i++) {
          expect(logs[i].timestamp >= logs[i + 1].timestamp).toBe(true);
        }
      });
    });

    describe('getLogsForUser', () => {
      it('should return logs for specific user', async () => {
        const logs = await auditService.getLogsForUser('user-1', 'company-1');

        expect(logs).toHaveLength(2);
        expect(logs.every(log => log.userId === 'user-1')).toBe(true);
        expect(logs.every(log => log.companyId === 'company-1')).toBe(true);
      });

      it('should respect limit parameter', async () => {
        const logs = await auditService.getLogsForUser('user-1', 'company-1', 1);

        expect(logs).toHaveLength(1);
      });

      it('should default to 100 limit', async () => {
        // Create 150 logs for the same user
        await auditService.clearLogs();

        for (let i = 0; i < 150; i++) {
          await auditService.logUserLevelCreated(
            'user-1',
            'company-1',
            `level-${i}`,
            { name: `Level ${i}` }
          );
        }

        const logs = await auditService.getLogsForUser('user-1', 'company-1');

        expect(logs).toHaveLength(100);
      });

      it('should sort by timestamp descending', async () => {
        const logs = await auditService.getLogsForUser('user-1', 'company-1');

        // Verify timestamps are in descending order
        for (let i = 0; i < logs.length - 1; i++) {
          expect(logs[i].timestamp >= logs[i + 1].timestamp).toBe(true);
        }
      });
    });
  });

  describe('Log Management', () => {
    it('should enforce max 10,000 log limit', async () => {
      // Create 10,500 logs
      for (let i = 0; i < 10500; i++) {
        await auditService.logUserLevelCreated(
          'user-1',
          'company-1',
          `level-${i}`,
          { name: `Level ${i}` }
        );
      }

      const { total } = await auditService.getLogsForCompany('company-1');

      expect(total).toBe(10000);
    });

    it('should remove oldest logs when limit is reached', async () => {
      // Create 10,001 logs
      for (let i = 0; i < 10001; i++) {
        await auditService.logUserLevelCreated(
          'user-1',
          'company-1',
          `level-${i}`,
          { name: `Level ${i}` }
        );
      }

      const { logs } = await auditService.getLogsForCompany('company-1', {
        limit: 10000,
      });

      // The first log (level-0) should be removed
      expect(logs.some(log => log.entityId === 'level-0')).toBe(false);

      // The last log (level-10000) should still exist
      expect(logs.some(log => log.entityId === 'level-10000')).toBe(true);
    });

    it('should clear all logs when clearLogs is called', async () => {
      await auditService.logUserLevelCreated('user-1', 'company-1', 'level-1', { name: 'Test' });
      await auditService.logUserLevelUpdated('user-1', 'company-1', 'level-1', { name: 'Updated' });

      let { total } = await auditService.getLogsForCompany('company-1');
      expect(total).toBe(2);

      await auditService.clearLogs();

      ({ total } = await auditService.getLogsForCompany('company-1'));
      expect(total).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty permission arrays', async () => {
      await auditService.logViewPermissionsUpdated(
        'user-1',
        'company-1',
        'level-1',
        []
      );

      const { logs } = await auditService.getLogsForCompany('company-1');

      expect(logs[0].changes).toMatchObject({
        permissionCount: 0,
        allowCount: 0,
        denyCount: 0,
        inheritCount: 0,
      });
    });

    it('should handle assignment with empty arrays', async () => {
      await auditService.logUserLevelsAssigned(
        'user-1',
        'company-1',
        'target-user',
        [],
        []
      );

      const { logs } = await auditService.getLogsForCompany('company-1');

      expect(logs[0].changes).toMatchObject({
        before: [],
        after: [],
        added: [],
        removed: [],
      });
    });

    it('should handle multiple companies independently', async () => {
      await auditService.clearLogs();

      await auditService.logUserLevelCreated('user-1', 'company-1', 'level-1', { name: 'C1L1' });
      await auditService.logUserLevelCreated('user-2', 'company-2', 'level-2', { name: 'C2L1' });
      await auditService.logUserLevelCreated('user-1', 'company-1', 'level-3', { name: 'C1L2' });

      const { total: total1 } = await auditService.getLogsForCompany('company-1');
      const { total: total2 } = await auditService.getLogsForCompany('company-2');

      expect(total1).toBe(2);
      expect(total2).toBe(1);
    });
  });
});
