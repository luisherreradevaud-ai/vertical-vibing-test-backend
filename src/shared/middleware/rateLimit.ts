import type { Request, Response, NextFunction } from 'express';
import { rateLimitStore } from '../utils/rateLimit';
import { db } from '../db/client';
import { PlanTier } from '@vertical-vibing/shared-types';

/**
 * Rate Limiting Middleware
 *
 * Enforces API rate limits based on user's subscription tier
 * Adds rate limit headers to all responses
 *
 * Headers:
 * - X-RateLimit-Limit: Maximum requests allowed in window
 * - X-RateLimit-Remaining: Remaining requests in current window
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 * - Retry-After: Seconds until rate limit resets (only when limit exceeded)
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip rate limiting for health check and public endpoints
    if (req.path === '/health' || req.path.startsWith('/api/subscriptions/plans')) {
      return next();
    }

    // Get user from auth middleware
    const userId = req.user?.userId;

    if (!userId) {
      // No authenticated user - apply strictest limit (free tier)
      const result = rateLimitStore.increment('anonymous', PlanTier.FREE);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        res.status(429).json({
          status: 'error',
          code: 'ERR_RATE_LIMIT_001',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        });
        return;
      }

      return next();
    }

    // Get user's subscription tier
    const subscription = await db.subscriptions.findByUserId(userId);
    const tier: PlanTier = subscription?.planTier || PlanTier.FREE;

    // Check and increment rate limit
    const result = rateLimitStore.increment(userId, tier);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

    // Check if rate limit exceeded
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      res.status(429).json({
        status: 'error',
        code: 'ERR_RATE_LIMIT_001',
        message: `Rate limit exceeded for ${tier} tier. Please upgrade your plan or try again later.`,
        tier,
        limit: result.limit,
        retryAfter,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    // On error, allow the request through (fail open)
    next();
  }
}

/**
 * Optional: Rate limit middleware that only adds headers without enforcing limits
 * Useful for monitoring before enabling enforcement
 */
export async function rateLimitHeadersOnly(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next();
    }

    const subscription = await db.subscriptions.findByUserId(userId);
    const tier: PlanTier = subscription?.planTier || PlanTier.FREE;

    const info = rateLimitStore.get(userId, tier);

    res.setHeader('X-RateLimit-Limit', info.limit.toString());
    res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString());

    next();
  } catch (error) {
    console.error('Rate limit headers error:', error);
    next();
  }
}
