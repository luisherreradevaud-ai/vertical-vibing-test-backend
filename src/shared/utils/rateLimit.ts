import type { PlanTier } from '@vertical-vibing/shared-types';

/**
 * Rate Limit Configuration
 *
 * Defines request limits per subscription tier
 * Window: 15 minutes (900 seconds)
 */
export const RATE_LIMIT_CONFIG = {
  free: {
    requests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  starter: {
    requests: 500,
    windowMs: 15 * 60 * 1000,
  },
  pro: {
    requests: 2000,
    windowMs: 15 * 60 * 1000,
  },
  enterprise: {
    requests: 10000,
    windowMs: 15 * 60 * 1000,
  },
} as const;

/**
 * Rate Limit Store Entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-Memory Rate Limit Store
 *
 * Stores request counts per user
 * In production, use Redis for distributed rate limiting
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Get current rate limit info for a user
   */
  get(userId: string, tier: PlanTier): {
    count: number;
    resetTime: number;
    remaining: number;
    limit: number;
  } {
    const config = RATE_LIMIT_CONFIG[tier];
    const now = Date.now();
    const entry = this.store.get(userId);

    // No entry or expired entry
    if (!entry || entry.resetTime <= now) {
      return {
        count: 0,
        resetTime: now + config.windowMs,
        remaining: config.requests,
        limit: config.requests,
      };
    }

    return {
      count: entry.count,
      resetTime: entry.resetTime,
      remaining: Math.max(0, config.requests - entry.count),
      limit: config.requests,
    };
  }

  /**
   * Increment request count for a user
   * Returns true if request is allowed, false if rate limit exceeded
   */
  increment(userId: string, tier: PlanTier): {
    allowed: boolean;
    count: number;
    resetTime: number;
    remaining: number;
    limit: number;
  } {
    const config = RATE_LIMIT_CONFIG[tier];
    const now = Date.now();
    const entry = this.store.get(userId);

    // No entry or expired entry - create new
    if (!entry || entry.resetTime <= now) {
      const resetTime = now + config.windowMs;
      this.store.set(userId, {
        count: 1,
        resetTime,
      });

      return {
        allowed: true,
        count: 1,
        resetTime,
        remaining: config.requests - 1,
        limit: config.requests,
      };
    }

    // Increment existing entry
    entry.count++;
    const remaining = Math.max(0, config.requests - entry.count);
    const allowed = entry.count <= config.requests;

    return {
      allowed,
      count: entry.count,
      resetTime: entry.resetTime,
      remaining,
      limit: config.requests,
    };
  }

  /**
   * Reset rate limit for a user (useful for testing)
   */
  reset(userId: string): void {
    this.store.delete(userId);
  }

  /**
   * Reset all rate limits (useful for testing)
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(userId);
      }
    }
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalUsers: number;
    activeUsers: number;
  } {
    const now = Date.now();
    let activeUsers = 0;

    for (const entry of this.store.values()) {
      if (entry.resetTime > now) {
        activeUsers++;
      }
    }

    return {
      totalUsers: this.store.size,
      activeUsers,
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Export singleton instance
export const rateLimitStore = new RateLimitStore();
