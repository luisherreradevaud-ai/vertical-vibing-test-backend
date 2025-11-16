/**
 * IAM Audit Service
 *
 * Tracks and logs all IAM-related changes for compliance and debugging
 */

interface AuditLog {
  id: string;
  timestamp: string;
  companyId: string;
  userId: string;
  action: string;
  entityType: 'user-level' | 'permission' | 'assignment' | 'view' | 'feature';
  entityId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

class AuditService {
  private logs: AuditLog[] = [];
  private readonly MAX_LOGS = 10000; // Keep last 10k logs in memory

  /**
   * Log a user level creation
   */
  async logUserLevelCreated(
    userId: string,
    companyId: string,
    userLevelId: string,
    data: { name: string; description?: string }
  ): Promise<void> {
    this.addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      companyId,
      userId,
      action: 'user_level.created',
      entityType: 'user-level',
      entityId: userLevelId,
      changes: data,
    });
  }

  /**
   * Log a user level update
   */
  async logUserLevelUpdated(
    userId: string,
    companyId: string,
    userLevelId: string,
    changes: Record<string, any>
  ): Promise<void> {
    this.addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      companyId,
      userId,
      action: 'user_level.updated',
      entityType: 'user-level',
      entityId: userLevelId,
      changes,
    });
  }

  /**
   * Log a user level deletion
   */
  async logUserLevelDeleted(
    userId: string,
    companyId: string,
    userLevelId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    this.addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      companyId,
      userId,
      action: 'user_level.deleted',
      entityType: 'user-level',
      entityId: userLevelId,
      metadata,
    });
  }

  /**
   * Log view permissions update
   */
  async logViewPermissionsUpdated(
    userId: string,
    companyId: string,
    userLevelId: string,
    permissions: any[]
  ): Promise<void> {
    this.addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      companyId,
      userId,
      action: 'permissions.views_updated',
      entityType: 'permission',
      entityId: userLevelId,
      changes: {
        permissionCount: permissions.length,
        allowCount: permissions.filter(p => p.state === 'allow').length,
        denyCount: permissions.filter(p => p.state === 'deny').length,
        inheritCount: permissions.filter(p => p.state === 'inherit').length,
      },
      metadata: { permissions },
    });
  }

  /**
   * Log feature permissions update
   */
  async logFeaturePermissionsUpdated(
    userId: string,
    companyId: string,
    userLevelId: string,
    permissions: any[]
  ): Promise<void> {
    this.addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      companyId,
      userId,
      action: 'permissions.features_updated',
      entityType: 'permission',
      entityId: userLevelId,
      changes: {
        permissionCount: permissions.length,
        allowedCount: permissions.filter(p => p.value === true).length,
        deniedCount: permissions.filter(p => p.value === false).length,
      },
      metadata: { permissions },
    });
  }

  /**
   * Log user-level assignment changes
   */
  async logUserLevelsAssigned(
    userId: string,
    companyId: string,
    targetUserId: string,
    userLevelIds: string[],
    previousLevelIds?: string[]
  ): Promise<void> {
    this.addLog({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      companyId,
      userId,
      action: 'assignment.user_levels_updated',
      entityType: 'assignment',
      entityId: targetUserId,
      changes: {
        before: previousLevelIds || [],
        after: userLevelIds,
        added: userLevelIds.filter(id => !previousLevelIds?.includes(id)),
        removed: previousLevelIds?.filter(id => !userLevelIds.includes(id)) || [],
      },
    });
  }

  /**
   * Get audit logs for a company
   */
  async getLogsForCompany(
    companyId: string,
    options?: {
      limit?: number;
      offset?: number;
      entityType?: AuditLog['entityType'];
      action?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    let filtered = this.logs.filter(log => log.companyId === companyId);

    if (options?.entityType) {
      filtered = filtered.filter(log => log.entityType === options.entityType);
    }

    if (options?.action) {
      filtered = filtered.filter(log => log.action === options.action);
    }

    if (options?.startDate) {
      filtered = filtered.filter(log => log.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(log => log.timestamp <= options.endDate!);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = filtered.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    const logs = filtered.slice(offset, offset + limit);

    return { logs, total };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getLogsForEntity(
    entityType: AuditLog['entityType'],
    entityId: string,
    companyId: string
  ): Promise<AuditLog[]> {
    return this.logs
      .filter(
        log =>
          log.entityType === entityType &&
          log.entityId === entityId &&
          log.companyId === companyId
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Get audit logs for a user's actions
   */
  async getLogsForUser(
    userId: string,
    companyId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return this.logs
      .filter(log => log.userId === userId && log.companyId === companyId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Add a log entry
   */
  private addLog(log: AuditLog): void {
    this.logs.push(log);

    // Trim old logs if we exceed the max
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // In production, you would also:
    // 1. Write to a persistent database
    // 2. Send to a logging service (e.g., CloudWatch, Datadog)
    // 3. Write to a SIEM for security monitoring
    console.log(`[AUDIT] ${log.action} - User: ${log.userId}, Entity: ${log.entityId}`);
  }

  /**
   * Clear all logs (for testing)
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
  }
}

export const auditService = new AuditService();
