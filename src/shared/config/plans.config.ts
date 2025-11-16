import { PlanTier, type PlanConfig } from '@vertical-vibing/shared-types';

/**
 * Subscription Plans Configuration
 *
 * Defines all available subscription plans with their features and pricing
 */
export const SUBSCRIPTION_PLANS: Record<PlanTier, PlanConfig> = {
  [PlanTier.FREE]: {
    tier: PlanTier.FREE,
    name: 'Free',
    description: 'Perfect for trying out the platform',
    price: 0,
    currency: 'usd',
    interval: 'month',
    priority: 1,
    features: [
      '1 user',
      '3 projects',
      '1 GB storage',
      'Community support',
      'Basic analytics',
    ],
    maxUsers: 1,
    maxProjects: 3,
    maxStorage: 1,
  },

  [PlanTier.STARTER]: {
    tier: PlanTier.STARTER,
    name: 'Starter',
    description: 'Great for small teams getting started',
    price: 1900, // $19.00
    currency: 'usd',
    interval: 'month',
    priority: 2,
    features: [
      'Up to 5 users',
      '10 projects',
      '10 GB storage',
      'Email support',
      'Advanced analytics',
      'API access',
    ],
    maxUsers: 5,
    maxProjects: 10,
    maxStorage: 10,
  },

  [PlanTier.PRO]: {
    tier: PlanTier.PRO,
    name: 'Pro',
    description: 'For growing teams that need more power',
    price: 4900, // $49.00
    currency: 'usd',
    interval: 'month',
    priority: 3,
    features: [
      'Up to 20 users',
      'Unlimited projects',
      '100 GB storage',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'SSO support',
    ],
    maxUsers: 20,
    maxStorage: 100,
  },

  [PlanTier.ENTERPRISE]: {
    tier: PlanTier.ENTERPRISE,
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    price: 9900, // $99.00 (base price, typically custom pricing)
    currency: 'usd',
    interval: 'month',
    priority: 4,
    features: [
      'Unlimited users',
      'Unlimited projects',
      'Unlimited storage',
      '24/7 dedicated support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'SSO support',
      'SLA guarantee',
      'Custom contracts',
      'On-premise deployment',
    ],
  },
};

/**
 * Get all plans sorted by priority
 */
export function getAllPlans(): PlanConfig[] {
  return Object.values(SUBSCRIPTION_PLANS).sort((a, b) => a.priority - b.priority);
}

/**
 * Get plan configuration by tier
 */
export function getPlanByTier(tier: PlanTier): PlanConfig {
  return SUBSCRIPTION_PLANS[tier];
}

/**
 * Check if a plan upgrade is valid
 */
export function canUpgradeToPlan(currentTier: PlanTier, newTier: PlanTier): boolean {
  const currentPlan = SUBSCRIPTION_PLANS[currentTier];
  const newPlan = SUBSCRIPTION_PLANS[newTier];
  return newPlan.priority > currentPlan.priority;
}

/**
 * Check if a plan downgrade is valid
 */
export function canDowngradeToPlan(currentTier: PlanTier, newTier: PlanTier): boolean {
  const currentPlan = SUBSCRIPTION_PLANS[currentTier];
  const newPlan = SUBSCRIPTION_PLANS[newTier];
  return newPlan.priority < currentPlan.priority;
}
