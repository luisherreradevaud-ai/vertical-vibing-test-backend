import type { PlanTier } from '@vertical-vibing/shared-types';
import { getPlanByTier } from '../config/plans.config';

/**
 * Mock Payment Service
 *
 * Simulates Stripe payment functionality for demo purposes
 * In production, replace with actual Stripe SDK integration
 */

interface CreateCustomerParams {
  email: string;
  name: string;
}

interface CreateSubscriptionParams {
  customerId: string;
  planTier: PlanTier;
}

interface CreateCheckoutSessionParams {
  customerId: string;
  planTier: PlanTier;
  successUrl: string;
  cancelUrl: string;
}

export class PaymentService {
  /**
   * Create a Stripe customer (mock)
   */
  async createCustomer(params: CreateCustomerParams): Promise<string> {
    // In production: const customer = await stripe.customers.create(params);
    // Mock implementation: generate a fake customer ID
    const customerId = `cus_mock_${crypto.randomUUID().substring(0, 14)}`;
    console.log(`[Mock Stripe] Created customer ${customerId} for ${params.email}`);
    return customerId;
  }

  /**
   * Create a Stripe subscription (mock)
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<{
    subscriptionId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    status: string;
  }> {
    // In production:
    // const subscription = await stripe.subscriptions.create({
    //   customer: params.customerId,
    //   items: [{ price: getPriceIdForPlan(params.planTier) }],
    // });

    const subscriptionId = `sub_mock_${crypto.randomUUID().substring(0, 14)}`;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    console.log(
      `[Mock Stripe] Created subscription ${subscriptionId} for customer ${params.customerId} with plan ${params.planTier}`
    );

    return {
      subscriptionId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      status: 'active',
    };
  }

  /**
   * Update a Stripe subscription (mock)
   */
  async updateSubscription(
    subscriptionId: string,
    params: { planTier?: PlanTier; cancelAtPeriodEnd?: boolean }
  ): Promise<void> {
    // In production:
    // await stripe.subscriptions.update(subscriptionId, {
    //   items: [{ price: getPriceIdForPlan(params.planTier) }],
    //   cancel_at_period_end: params.cancelAtPeriodEnd,
    // });

    console.log(`[Mock Stripe] Updated subscription ${subscriptionId}`, params);
  }

  /**
   * Cancel a Stripe subscription (mock)
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    // In production: await stripe.subscriptions.cancel(subscriptionId);
    console.log(`[Mock Stripe] Canceled subscription ${subscriptionId}`);
  }

  /**
   * Create a checkout session (mock)
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    sessionId: string;
    url: string;
  }> {
    // In production:
    // const session = await stripe.checkout.sessions.create({
    //   customer: params.customerId,
    //   line_items: [{
    //     price: getPriceIdForPlan(params.planTier),
    //     quantity: 1,
    //   }],
    //   mode: 'subscription',
    //   success_url: params.successUrl,
    //   cancel_url: params.cancelUrl,
    // });

    const plan = getPlanByTier(params.planTier);
    const sessionId = `cs_mock_${crypto.randomUUID().substring(0, 14)}`;
    const url = `${params.successUrl}?session_id=${sessionId}&plan=${params.planTier}`;

    console.log(
      `[Mock Stripe] Created checkout session ${sessionId} for plan ${plan.name} ($${plan.price / 100})`
    );

    return {
      sessionId,
      url,
    };
  }

  /**
   * Retrieve a subscription (mock)
   */
  async getSubscription(subscriptionId: string): Promise<{
    id: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  } | null> {
    // In production: const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Mock: Return mock subscription data
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    console.log(`[Mock Stripe] Retrieved subscription ${subscriptionId}`);

    return {
      id: subscriptionId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    };
  }
}
