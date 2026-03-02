/**
 * Stripe Webhook Handler
 *
 * IMPORTANT: This route must be registered BEFORE express.json() middleware
 * because Stripe signature verification requires the raw request body (Buffer),
 * not the parsed JSON object.
 *
 * Handles:
 *   - checkout.session.completed      → activate subscription
 *   - customer.subscription.updated   → reflect plan changes
 *   - customer.subscription.deleted   → downgrade to free
 *   - invoice.payment_failed          → warn user
 */

import { Router, Request, Response } from 'express';
import { constructWebhookEvent, handleWebhookEvent } from '../services/stripe.js';

const router = Router();

/**
 * POST /webhooks/stripe
 * Stripe webhook endpoint — uses raw body parser (configured in index.ts).
 */
router.post('/', (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event;
  try {
    // req.body is a raw Buffer when this route uses express.raw()
    event = constructWebhookEvent(req.body as Buffer, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('[Stripe Webhook] Signature error:', message);
    res.status(400).json({ error: message });
    return;
  }

  // Acknowledge receipt immediately — Stripe retries if we don't respond quickly
  res.json({ received: true });

  // Process async without blocking the HTTP response
  handleWebhookEvent(event).catch((err) => {
    console.error('[Stripe Webhook] Error processing event:', event.type, err);
  });
});

export default router;
