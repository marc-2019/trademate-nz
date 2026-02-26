/**
 * Subscription Routes
 * Tier info, usage, and subscription management
 * Phase A: Read-only tier info + usage tracking
 * Phase B (~50 users): Stripe checkout integration
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getTierLimits,
  getAllTiers,
  isBetaMode,
  getUserSubscription,
  getTierUsage,
} from '../services/subscriptions.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/subscriptions/tiers
 * Get all available tier definitions (for displaying pricing/features)
 */
router.get('/tiers', (_req: Request, res: Response) => {
  const tiers = getAllTiers();
  const beta = isBetaMode();

  res.json({
    success: true,
    data: {
      tiers,
      betaMode: beta,
      pricing: {
        free: { price: 0, period: 'forever' },
        tradie: { price: 4.99, period: 'week', monthlyEquivalent: 19.99, currency: 'NZD' },
        team: { price: 9.99, period: 'week', monthlyEquivalent: 39.99, currency: 'NZD' },
      },
    },
  });
});

/**
 * GET /api/v1/subscriptions/me
 * Get current user's subscription info + usage
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const [subscription, usage] = await Promise.all([
      getUserSubscription(userId),
      getTierUsage(userId),
    ]);

    const limits = getTierLimits(subscription.tier);
    const beta = isBetaMode();

    res.json({
      success: true,
      data: {
        subscription,
        limits,
        usage,
        betaMode: beta,
        // During beta, show what the user would get vs what they have access to
        ...(beta && {
          betaNote: 'All features are free during beta! Your tier will apply when beta ends.',
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/subscriptions/usage
 * Get current month's usage for the authenticated user
 */
router.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const subscription = await getUserSubscription(userId);
    const usage = await getTierUsage(userId);
    const limits = getTierLimits(subscription.tier);

    res.json({
      success: true,
      data: {
        usage,
        limits: {
          invoicesPerMonth: limits.invoicesPerMonth,
          swmsPerMonth: limits.swmsPerMonth,
          teamMembers: limits.teamMembers,
        },
        remaining: {
          invoices: limits.invoicesPerMonth === null ? null : Math.max(0, limits.invoicesPerMonth - usage.invoicesThisMonth),
          swms: limits.swmsPerMonth === null ? null : Math.max(0, limits.swmsPerMonth - usage.swmsThisMonth),
          teamMembers: limits.teamMembers === null ? null : Math.max(0, limits.teamMembers - usage.teamMemberCount),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/subscriptions/limits
 * Get tier limits for the current user's tier
 */
router.get('/limits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const subscription = await getUserSubscription(userId);
    const limits = getTierLimits(subscription.tier);

    res.json({
      success: true,
      data: {
        tier: subscription.tier,
        limits,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// PHASE B: Stripe Integration (stub routes for future)
// =============================================================================

/**
 * POST /api/v1/subscriptions/checkout
 * Create Stripe checkout session for upgrading
 * Phase B: Will redirect user to Stripe Checkout
 */
router.post('/checkout', (_req: Request, res: Response) => {
  if (isBetaMode()) {
    res.json({
      success: true,
      data: {
        message: 'All features are free during beta! No payment required.',
        betaMode: true,
      },
    });
    return;
  }

  // Phase B: Create Stripe checkout session
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'Stripe checkout will be available soon.',
  });
});

/**
 * POST /api/v1/subscriptions/portal
 * Create Stripe billing portal session for managing subscription
 * Phase B: Will redirect user to Stripe Billing Portal
 */
router.post('/portal', (_req: Request, res: Response) => {
  if (isBetaMode()) {
    res.json({
      success: true,
      data: {
        message: 'Billing portal will be available when beta ends.',
        betaMode: true,
      },
    });
    return;
  }

  // Phase B: Create Stripe portal session
  res.status(501).json({
    success: false,
    error: 'NOT_IMPLEMENTED',
    message: 'Billing portal will be available soon.',
  });
});

export default router;
