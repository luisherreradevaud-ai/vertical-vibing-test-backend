import type { SubscriptionsRepository } from '../../shared/db/repositories/subscriptions.repository';
import type { Subscription, CreateSubscriptionDTO, UpdateSubscriptionDTO } from '@vertical-vibing/shared-types';
import { SubscriptionStatus, PlanTier } from '@vertical-vibing/shared-types';
import { PaymentService } from '../../shared/services/payment.service';
import { getPlanByTier, canUpgradeToPlan, canDowngradeToPlan } from '../../shared/config/plans.config';

/**
 * Subscriptions Service
 *
 * Business logic for subscription management
 */
export class SubscriptionsService {
  private paymentService: PaymentService;

  constructor(private subscriptionsRepository: SubscriptionsRepository) {
    this.paymentService = new PaymentService();
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findByUserId(userId);
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription(
    userId: string,
    userEmail: string,
    userName: string,
    dto: CreateSubscriptionDTO
  ): Promise<Subscription> {
    // Check if user already has a subscription
    const existing = await this.subscriptionsRepository.findByUserId(userId);
    if (existing) {
      throw new Error('User already has an active subscription');
    }

    // Get plan configuration
    const plan = getPlanByTier(dto.planTier);

    // For free plan, create subscription directly without payment
    if (dto.planTier === PlanTier.FREE) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100); // Free plan never expires

      return this.subscriptionsRepository.create({
        userId,
        planTier: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      });
    }

    // For paid plans, create Stripe customer and subscription
    const customerId = await this.paymentService.createCustomer({
      email: userEmail,
      name: userName,
    });

    const stripeSubscription = await this.paymentService.createSubscription({
      customerId,
      planTier: dto.planTier,
    });

    // Create subscription in database
    return this.subscriptionsRepository.create({
      userId,
      planTier: dto.planTier,
      status: stripeSubscription.status as SubscriptionStatus,
      currentPeriodStart: stripeSubscription.currentPeriodStart,
      currentPeriodEnd: stripeSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.subscriptionId,
    });
  }

  /**
   * Update subscription (change plan or cancel)
   */
  async updateSubscription(
    userId: string,
    dto: UpdateSubscriptionDTO
  ): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findByUserId(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Handle plan change
    if (dto.planTier && dto.planTier !== subscription.planTier) {
      const currentTier = subscription.planTier;
      const newTier = dto.planTier;

      // Validate plan change
      if (!canUpgradeToPlan(currentTier, newTier) && !canDowngradeToPlan(currentTier, newTier)) {
        throw new Error('Invalid plan change');
      }

      // For free plan, don't use Stripe
      if (newTier === PlanTier.FREE) {
        const updated = await this.subscriptionsRepository.update(subscription.id, {
          planTier: newTier,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: null,
        });
        if (!updated) throw new Error('Failed to update subscription');
        return updated;
      }

      // Update Stripe subscription
      if (subscription.stripeSubscriptionId) {
        await this.paymentService.updateSubscription(subscription.stripeSubscriptionId, {
          planTier: newTier,
        });
      }

      const updated = await this.subscriptionsRepository.update(subscription.id, {
        planTier: newTier,
      });
      if (!updated) throw new Error('Failed to update subscription');
      return updated;
    }

    // Handle cancellation
    if (dto.cancelAtPeriodEnd !== undefined) {
      if (subscription.stripeSubscriptionId) {
        await this.paymentService.updateSubscription(subscription.stripeSubscriptionId, {
          cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
        });
      }

      const updated = await this.subscriptionsRepository.update(subscription.id, {
        cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
      });
      if (!updated) throw new Error('Failed to update subscription');
      return updated;
    }

    return subscription;
  }

  /**
   * Cancel subscription immediately
   */
  async cancelSubscription(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionsRepository.findByUserId(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Cancel in Stripe if exists
    if (subscription.stripeSubscriptionId) {
      await this.paymentService.cancelSubscription(subscription.stripeSubscriptionId);
    }

    // Update status to canceled
    const updated = await this.subscriptionsRepository.update(subscription.id, {
      status: SubscriptionStatus.CANCELED,
      cancelAtPeriodEnd: true,
    });

    return updated !== null;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    userEmail: string,
    userName: string,
    planTier: PlanTier,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    // Get or create Stripe customer
    let customerId: string;
    const subscription = await this.subscriptionsRepository.findByUserId(userId);

    if (subscription?.stripeCustomerId) {
      customerId = subscription.stripeCustomerId;
    } else {
      customerId = await this.paymentService.createCustomer({
        email: userEmail,
        name: userName,
      });
    }

    // Create checkout session
    return this.paymentService.createCheckoutSession({
      customerId,
      planTier,
      successUrl,
      cancelUrl,
    });
  }
}
