import type { Database } from '../client';
import type { Subscription, NewSubscription } from '../schema/subscriptions.schema';

/**
 * Subscriptions Repository
 *
 * Data access layer for subscriptions table
 */
export class SubscriptionsRepository {
  constructor(private db: Database) {}

  /**
   * Find subscription by user ID
   */
  async findByUserId(userId: string): Promise<Subscription | null> {
    return this.db.subscriptions.findByUserId(userId);
  }

  /**
   * Find subscription by ID
   */
  async findById(id: string): Promise<Subscription | null> {
    return this.db.subscriptions.findById(id);
  }

  /**
   * Find subscription by Stripe subscription ID
   */
  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null> {
    return this.db.subscriptions.findByStripeSubscriptionId(stripeSubscriptionId);
  }

  /**
   * Create a new subscription
   */
  async create(subscriptionData: NewSubscription): Promise<Subscription> {
    return this.db.subscriptions.create(subscriptionData);
  }

  /**
   * Update subscription by ID
   */
  async update(id: string, data: Partial<NewSubscription>): Promise<Subscription | null> {
    return this.db.subscriptions.update(id, data);
  }

  /**
   * Delete subscription by ID
   */
  async delete(id: string): Promise<boolean> {
    return this.db.subscriptions.delete(id);
  }
}
