/**
 * Subscription Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock services
const mockGetAllTiers = jest.fn();
const mockIsBetaMode = jest.fn();
const mockGetUserSubscription = jest.fn();
const mockGetTierUsage = jest.fn();
const mockGetTierLimits = jest.fn();

jest.mock('../../services/subscriptions.js', () => ({
  getAllTiers: (...args: any[]) => mockGetAllTiers(...args),
  isBetaMode: (...args: any[]) => mockIsBetaMode(...args),
  getUserSubscription: (...args: any[]) => mockGetUserSubscription(...args),
  getTierUsage: (...args: any[]) => mockGetTierUsage(...args),
  getTierLimits: (...args: any[]) => mockGetTierLimits(...args),
}));

const mockCreateCheckoutSession = jest.fn();
const mockCreatePortalSession = jest.fn();

jest.mock('../../services/stripe.js', () => ({
  createCheckoutSession: (...args: any[]) => mockCreateCheckoutSession(...args),
  createPortalSession: (...args: any[]) => mockCreatePortalSession(...args),
}));

const mockDbQuery = jest.fn();
jest.mock('../../services/database.js', () => ({
  __esModule: true,
  default: { query: (...args: any[]) => mockDbQuery(...args) },
}));

jest.mock('../../config/index.js', () => ({
  config: {
    port: 29001,
    isDevelopment: true,
    stripe: { returnUrl: 'https://app.test.com' },
  },
}));

jest.mock('../../middleware/auth.js', () => ({
  authenticate: function (req: any, _res: any, next: any) {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import subscriptionRoutes from '../../routes/subscriptions.js';
import { errorHandler } from '../../middleware/error.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/subscriptions', subscriptionRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Subscription Routes', () => {
  describe('GET /api/v1/subscriptions/tiers', () => {
    it('should return all tier definitions', async () => {
      const tiers = [
        { tier: 'free', invoicesPerMonth: 3 },
        { tier: 'tradie', invoicesPerMonth: null },
        { tier: 'team', invoicesPerMonth: null },
      ];
      mockGetAllTiers.mockReturnValue(tiers);
      mockIsBetaMode.mockReturnValue(true);

      const response = await request(app).get('/api/v1/subscriptions/tiers');

      expect(response.status).toBe(200);
      expect(response.body.data.tiers).toHaveLength(3);
      expect(response.body.data.betaMode).toBe(true);
      expect(response.body.data.pricing.tradie.price).toBe(4.99);
    });
  });

  describe('GET /api/v1/subscriptions/me', () => {
    it('should return user subscription info', async () => {
      mockGetUserSubscription.mockResolvedValue({ tier: 'free', stripeCustomerId: null });
      mockGetTierUsage.mockResolvedValue({ invoicesThisMonth: 2, swmsThisMonth: 1, teamMemberCount: 0 });
      mockGetTierLimits.mockReturnValue({ invoicesPerMonth: null, swmsPerMonth: null });
      mockIsBetaMode.mockReturnValue(true);

      const response = await request(app).get('/api/v1/subscriptions/me');

      expect(response.status).toBe(200);
      expect(response.body.data.subscription.tier).toBe('free');
      expect(response.body.data.betaMode).toBe(true);
      expect(response.body.data.betaNote).toBeDefined();
    });
  });

  describe('GET /api/v1/subscriptions/usage', () => {
    it('should return usage data with remaining counts', async () => {
      mockGetUserSubscription.mockResolvedValue({ tier: 'free' });
      mockGetTierUsage.mockResolvedValue({ invoicesThisMonth: 2, swmsThisMonth: 1, teamMemberCount: 0 });
      mockGetTierLimits.mockReturnValue({
        invoicesPerMonth: 3,
        swmsPerMonth: 2,
        teamMembers: null,
      });

      const response = await request(app).get('/api/v1/subscriptions/usage');

      expect(response.status).toBe(200);
      expect(response.body.data.remaining.invoices).toBe(1);
      expect(response.body.data.remaining.swms).toBe(1);
      expect(response.body.data.remaining.teamMembers).toBeNull();
    });
  });

  describe('GET /api/v1/subscriptions/limits', () => {
    it('should return tier limits', async () => {
      mockGetUserSubscription.mockResolvedValue({ tier: 'tradie' });
      mockGetTierLimits.mockReturnValue({
        tier: 'tradie',
        invoicesPerMonth: null,
        pdfExport: true,
      });

      const response = await request(app).get('/api/v1/subscriptions/limits');

      expect(response.status).toBe(200);
      expect(response.body.data.tier).toBe('tradie');
      expect(response.body.data.limits.pdfExport).toBe(true);
    });
  });

  describe('POST /api/v1/subscriptions/checkout', () => {
    it('should return beta message when in beta mode', async () => {
      mockIsBetaMode.mockReturnValue(true);

      const response = await request(app)
        .post('/api/v1/subscriptions/checkout')
        .send({ tier: 'tradie' });

      expect(response.status).toBe(200);
      expect(response.body.data.betaMode).toBe(true);
    });

    it('should reject invalid tier', async () => {
      mockIsBetaMode.mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/subscriptions/checkout')
        .send({ tier: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should create checkout session when not in beta', async () => {
      mockIsBetaMode.mockReturnValue(false);
      mockDbQuery.mockResolvedValue({ rows: [{ email: 'test@example.com', name: 'Test' }] });
      mockCreateCheckoutSession.mockResolvedValue({ sessionId: 'sess-1', url: 'https://checkout.stripe.com/...' });

      const response = await request(app)
        .post('/api/v1/subscriptions/checkout')
        .send({ tier: 'tradie' });

      expect(response.status).toBe(200);
      expect(response.body.data.sessionId).toBe('sess-1');
    });

    it('should return 404 when user not found', async () => {
      mockIsBetaMode.mockReturnValue(false);
      mockDbQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/v1/subscriptions/checkout')
        .send({ tier: 'tradie' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/subscriptions/portal', () => {
    it('should return beta message when in beta', async () => {
      mockIsBetaMode.mockReturnValue(true);

      const response = await request(app).post('/api/v1/subscriptions/portal');

      expect(response.status).toBe(200);
      expect(response.body.data.betaMode).toBe(true);
    });

    it('should reject users without Stripe customer ID', async () => {
      mockIsBetaMode.mockReturnValue(false);
      mockGetUserSubscription.mockResolvedValue({ tier: 'free', stripeCustomerId: null });

      const response = await request(app).post('/api/v1/subscriptions/portal');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('NO_STRIPE_CUSTOMER');
    });

    it('should return portal URL for paying customer', async () => {
      mockIsBetaMode.mockReturnValue(false);
      mockGetUserSubscription.mockResolvedValue({ tier: 'tradie', stripeCustomerId: 'cus_123' });
      mockCreatePortalSession.mockResolvedValue('https://billing.stripe.com/...');

      const response = await request(app).post('/api/v1/subscriptions/portal');

      expect(response.status).toBe(200);
      expect(response.body.data.url).toContain('stripe.com');
    });
  });
});
