/**
 * Stripe Service
 * Handles Stripe Checkout sessions, Billing Portal sessions, and webhook processing.
 *
 * Pricing (NZD, billed monthly):
 *   Tradie: $4.99/wk → $19.99/mo (STRIPE_PRICE_ID_TRADIE)
 *   Team:   $9.99/wk → $39.99/mo (STRIPE_PRICE_ID_TEAM)
 *
 * Flow:
 *   1. POST /api/v1/subscriptions/checkout → createCheckoutSession → Stripe-hosted page
 *   2. User pays → Stripe fires checkout.session.completed webhook
 *   3. Webhook handler updates user's subscription_tier + stripe fields
 *   4. POST /api/v1/subscriptions/portal → createPortalSession → Stripe-hosted management
 */

import Stripe from 'stripe';
import { config } from '../config/index.js';
import { SubscriptionTier } from '../types/index.js';
import { updateSubscriptionTier } from './subscriptions.js';
import db from './database.js';

// ---------------------------------------------------------------------------
// Stripe client
// ---------------------------------------------------------------------------

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!config.stripe.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    _stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Price ID → tier mapping
// ---------------------------------------------------------------------------

function tierForPriceId(priceId: string): SubscriptionTier | null {
  if (priceId === config.stripe.priceIdTradie) return 'tradie';
  if (priceId === config.stripe.priceIdTeam) return 'team';
  return null;
}

// ---------------------------------------------------------------------------
// Customer helpers
// ---------------------------------------------------------------------------

/**
 * Get or create a Stripe customer for a user.
 * Stores stripe_customer_id on the users row.
 */
export async function ensureStripeCustomer(
  userId: string,
  email: string,
  name: string | null
): Promise<string> {
  const stripe = getStripe();

  // Check if already has a customer ID
  const result = await db.query<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows[0]?.stripe_customer_id) {
    return result.rows[0].stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { trademate_user_id: userId },
  });

  // Persist the customer ID
  await db.query(
    'UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
    [customer.id, userId]
  );

  return customer.id;
}

// ---------------------------------------------------------------------------
// Checkout session
// ---------------------------------------------------------------------------

export interface CheckoutSessionInput {
  userId: string;
  userEmail: string;
  userName: string | null;
  tier: 'tradie' | 'team';
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

/**
 * Create a Stripe Checkout session for subscribing to a paid tier.
 */
export async function createCheckoutSession(
  input: CheckoutSessionInput
): Promise<CheckoutSessionResult> {
  const stripe = getStripe();

  const priceId =
    input.tier === 'tradie'
      ? config.stripe.priceIdTradie
      : config.stripe.priceIdTeam;

  if (!priceId) {
    throw new Error(`STRIPE_PRICE_ID_${input.tier.toUpperCase()} is not configured`);
  }

  const customerId = await ensureStripeCustomer(
    input.userId,
    input.userEmail,
    input.userName
  );

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    subscription_data: {
      metadata: {
        trademate_user_id: input.userId,
        tier: input.tier,
      },
    },
    // Allow promo codes
    allow_promotion_codes: true,
    metadata: {
      trademate_user_id: input.userId,
      tier: input.tier,
    },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return { sessionId: session.id, url: session.url };
}

// ---------------------------------------------------------------------------
// Billing portal session
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Billing Portal session so users can manage their subscription.
 */
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

// ---------------------------------------------------------------------------
// Webhook processing
// ---------------------------------------------------------------------------

/**
 * Verify and parse a Stripe webhook payload.
 * Stripe requires the raw body (Buffer) to validate the signature.
 */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string
): Stripe.Event {
  if (!config.stripe.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

/**
 * Check if a Stripe event has already been processed (idempotency guard).
 * Returns true if the event was newly inserted (i.e. should be processed).
 */
async function markEventProcessed(eventId: string): Promise<boolean> {
  try {
    await db.query(
      `INSERT INTO stripe_webhook_events (event_id, processed_at)
       VALUES ($1, NOW())
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId]
    );
    // If rowCount is 0, the event was already processed
    const check = await db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM stripe_webhook_events WHERE event_id = $1 AND processed_at > NOW() - INTERVAL \'5 seconds\'',
      [eventId]
    );
    return parseInt(check.rows[0].count, 10) > 0;
  } catch {
    // Table might not exist yet in dev — allow processing but log warning
    console.warn('[Stripe] stripe_webhook_events table not found, skipping dedup check');
    return true;
  }
}

/**
 * Handle a verified Stripe webhook event.
 * Updates the user's subscription tier based on payment lifecycle events.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  const isNew = await markEventProcessed(event.id);
  if (!isNew) {
    console.log(`[Stripe] Skipping duplicate webhook event: ${event.id}`);
    return;
  }

  console.log(`[Stripe] Processing webhook event: ${event.type} (${event.id})`);

  switch (event.type) {
    case 'checkout.session.completed': {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    }

    case 'customer.subscription.updated': {
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    }

    case 'invoice.payment_failed': {
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.trademate_user_id;
  const tier = session.metadata?.tier as SubscriptionTier | undefined;

  if (!userId || !tier) {
    console.error('[Stripe] checkout.session.completed missing metadata', session.metadata);
    return;
  }

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  await updateSubscriptionTier(userId, tier, {
    stripeCustomerId: customerId ?? undefined,
    stripeSubscriptionId: subscriptionId ?? undefined,
    startedAt: new Date(),
  });

  console.log(`[Stripe] User ${userId} upgraded to ${tier} tier`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.trademate_user_id;
  if (!userId) {
    // Look up via stripe_customer_id
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;
    if (!customerId) return;

    const result = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE stripe_customer_id = $1',
      [customerId]
    );
    if (result.rows.length === 0) return;

    await handleSubscriptionUpdatedForUser(result.rows[0].id, subscription);
    return;
  }

  await handleSubscriptionUpdatedForUser(userId, subscription);
}

async function handleSubscriptionUpdatedForUser(
  userId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // Determine tier from the price ID on the subscription
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = priceId ? tierForPriceId(priceId) : null;

    if (tier) {
      const periodEnd = subscription.current_period_end;
      await updateSubscriptionTier(userId, tier, {
        stripeSubscriptionId: subscription.id,
        expiresAt: periodEnd ? new Date(periodEnd * 1000) : undefined,
      });
      console.log(`[Stripe] User ${userId} subscription updated to ${tier}`);
    }
  } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    console.warn(`[Stripe] User ${userId} subscription is ${subscription.status}`);
    // Don't downgrade immediately — give user time to update payment method via portal
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  const result = await db.query<{ id: string }>(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (result.rows.length === 0) return;

  const userId = result.rows[0].id;

  // Downgrade to free tier
  await updateSubscriptionTier(userId, 'free', {
    stripeSubscriptionId: undefined,
    expiresAt: new Date(),
  });

  console.log(`[Stripe] User ${userId} downgraded to free (subscription deleted)`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!customerId) return;

  const result = await db.query<{ id: string; email: string }>(
    'SELECT id, email FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (result.rows.length === 0) return;

  const { id: userId, email } = result.rows[0];
  console.warn(`[Stripe] Payment failed for user ${userId} (${email})`);
  // TODO: trigger push notification / email to user about payment failure
}

export default {
  ensureStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  handleWebhookEvent,
};
