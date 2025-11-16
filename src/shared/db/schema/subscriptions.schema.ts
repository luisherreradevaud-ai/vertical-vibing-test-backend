import type { Subscription as SubscriptionType, NewSubscription } from '@vertical-vibing/shared-types';
import { SubscriptionStatus, PlanTier } from '@vertical-vibing/shared-types';

/**
 * Subscriptions Schema
 *
 * Database schema for subscriptions using Drizzle ORM patterns
 * This follows the same pattern as users.schema.ts
 */

// For now, we're using the in-memory database
// When migrating to PostgreSQL with Drizzle, this would be:
// export const subscriptions = pgTable('subscriptions', { ... });

export type Subscription = SubscriptionType;
export type { NewSubscription };

// Export types for repository
export { SubscriptionStatus, PlanTier };
