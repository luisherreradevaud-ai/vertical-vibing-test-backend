import { Router, type Request, type Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from '../../shared/db/repositories/subscriptions.repository';
import { db } from '../../shared/db/client';
import { authenticateJWT } from '../../shared/middleware/auth';
import { ApiResponse } from '../../shared/utils/response';
import { createSubscriptionSchema, updateSubscriptionSchema } from '@vertical-vibing/shared-types';
import { getAllPlans } from '../../shared/config/plans.config';

/**
 * Create Subscriptions Router
 *
 * Factory function to create the subscriptions router with all dependencies
 */
export function createSubscriptionsRouter(): Router {
  const router = Router();
  const subscriptionsRepository = new SubscriptionsRepository(db);
  const subscriptionsService = new SubscriptionsService(subscriptionsRepository);

  /**
   * GET /api/subscriptions/plans
   * Get all available subscription plans (public)
   */
  router.get('/plans', async (req: Request, res: Response) => {
    try {
      const plans = getAllPlans();
      return ApiResponse.success(res, { plans });
    } catch (error) {
      console.error('Get plans error:', error);
      return ApiResponse.error(res, 'Failed to get plans', 500, 'ERR_INTERNAL_001');
    }
  });

  /**
   * GET /api/subscriptions/me
   * Get current user's subscription
   */
  router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      const subscription = await subscriptionsService.getUserSubscription(userId);

      if (!subscription) {
        return ApiResponse.notFound(res, 'No subscription found');
      }

      return ApiResponse.success(res, { subscription });
    } catch (error) {
      console.error('Get subscription error:', error);
      return ApiResponse.error(res, 'Failed to get subscription', 500, 'ERR_INTERNAL_001');
    }
  });

  /**
   * POST /api/subscriptions
   * Create a new subscription
   */
  router.post('/', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const userEmail = req.user!.email;

      // Validate request body
      const validation = createSubscriptionSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'ERR_VALIDATION_003',
        }));
        return ApiResponse.validationError(res, errors);
      }

      // We need user's name - get it from the request or use email
      const userName = userEmail.split('@')[0];

      const subscription = await subscriptionsService.createSubscription(
        userId,
        userEmail,
        userName,
        validation.data
      );

      return ApiResponse.created(res, { subscription });
    } catch (error) {
      console.error('Create subscription error:', error);

      if (error instanceof Error) {
        if (error.message === 'User already has an active subscription') {
          return ApiResponse.conflict(res, error.message);
        }
      }

      return ApiResponse.error(res, 'Failed to create subscription', 500, 'ERR_INTERNAL_001');
    }
  });

  /**
   * PATCH /api/subscriptions/me
   * Update current user's subscription
   */
  router.patch('/me', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Validate request body
      const validation = updateSubscriptionSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'ERR_VALIDATION_003',
        }));
        return ApiResponse.validationError(res, errors);
      }

      const subscription = await subscriptionsService.updateSubscription(userId, validation.data);

      return ApiResponse.success(res, { subscription });
    } catch (error) {
      console.error('Update subscription error:', error);

      if (error instanceof Error) {
        if (error.message === 'Subscription not found') {
          return ApiResponse.notFound(res, error.message);
        }
        if (error.message === 'Invalid plan change') {
          return ApiResponse.error(res, error.message, 400, 'ERR_VALIDATION_003');
        }
      }

      return ApiResponse.error(res, 'Failed to update subscription', 500, 'ERR_INTERNAL_001');
    }
  });

  /**
   * DELETE /api/subscriptions/me
   * Cancel current user's subscription
   */
  router.delete('/me', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      await subscriptionsService.cancelSubscription(userId);

      return ApiResponse.success(res, { message: 'Subscription canceled successfully' });
    } catch (error) {
      console.error('Cancel subscription error:', error);

      if (error instanceof Error && error.message === 'Subscription not found') {
        return ApiResponse.notFound(res, error.message);
      }

      return ApiResponse.error(res, 'Failed to cancel subscription', 500, 'ERR_INTERNAL_001');
    }
  });

  /**
   * POST /api/subscriptions/checkout
   * Create a checkout session
   */
  router.post('/checkout', authenticateJWT, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const userEmail = req.user!.email;

      const { planTier, successUrl, cancelUrl } = req.body;

      if (!planTier || !successUrl || !cancelUrl) {
        return ApiResponse.error(
          res,
          'Missing required fields: planTier, successUrl, cancelUrl',
          400,
          'ERR_VALIDATION_003'
        );
      }

      const userName = userEmail.split('@')[0];

      const session = await subscriptionsService.createCheckoutSession(
        userId,
        userEmail,
        userName,
        planTier,
        successUrl,
        cancelUrl
      );

      return ApiResponse.success(res, session);
    } catch (error) {
      console.error('Create checkout session error:', error);
      return ApiResponse.error(res, 'Failed to create checkout session', 500, 'ERR_INTERNAL_001');
    }
  });

  return router;
}
