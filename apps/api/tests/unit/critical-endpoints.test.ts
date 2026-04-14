/**
 * BossBoard API — Critical Endpoint Unit Tests
 *
 * Covers the 10 highest-priority routes with happy-path and key error-path
 * assertions.  All external services (DB, Redis, Stripe, email) are mocked.
 *
 * Endpoints covered:
 *  1.  POST   /api/v1/auth/register          — new user registration
 *  2.  POST   /api/v1/auth/login             — credential authentication
 *  3.  POST   /api/v1/auth/refresh           — JWT refresh
 *  4.  GET    /api/v1/auth/me                — current user profile
 *  5.  POST   /api/v1/invoices               — create invoice
 *  6.  GET    /api/v1/invoices               — list invoices
 *  7.  GET    /api/v1/invoices/:id           — get single invoice
 *  8.  POST   /api/v1/invoices/:id/send      — send invoice to client
 *  9.  GET    /api/v1/subscriptions/me       — subscription status & usage
 * 10.  POST   /api/v1/subscriptions/checkout — initiate Stripe checkout
 */

import request from 'supertest';
import express, { Express } from 'express';

// ---------------------------------------------------------------------------
// Mock: auth service
// ---------------------------------------------------------------------------
const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockRefreshToken = jest.fn();
const mockGetUserById = jest.fn();

jest.mock('../../src/services/auth.js', () => ({
  __esModule: true,
  default: {
    register: mockRegister,
    login: mockLogin,
    refreshToken: mockRefreshToken,
    logout: jest.fn(),
    getUserById: mockGetUserById,
    updateUser: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock: invoice service
// ---------------------------------------------------------------------------
const mockCreateInvoice = jest.fn();
const mockListInvoices = jest.fn();
const mockGetInvoiceById = jest.fn();
const mockMarkAsSent = jest.fn();

jest.mock('../../src/services/invoices.js', () => ({
  __esModule: true,
  default: {
    createInvoice: mockCreateInvoice,
    listInvoices: mockListInvoices,
    getInvoiceById: mockGetInvoiceById,
    getInvoiceByIdRaw: mockGetInvoiceById,
    updateInvoice: jest.fn(),
    deleteInvoice: jest.fn(),
    markAsSent: mockMarkAsSent,
    markAsPaid: jest.fn(),
    generateShareToken: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock: pdf / email / business-profile (invoice route deps)
// ---------------------------------------------------------------------------
jest.mock('../../src/services/pdf.js', () => ({
  __esModule: true,
  default: { generateInvoicePDF: jest.fn() },
}));

jest.mock('../../src/services/email.js', () => ({
  __esModule: true,
  default: {
    isEmailConfigured: jest.fn().mockReturnValue(false),
    isSmtpConfigured: jest.fn().mockReturnValue(false),
    sendInvoiceEmail: jest.fn(),
  },
  isEmailConfigured: jest.fn().mockReturnValue(false),
  isSmtpConfigured: jest.fn().mockReturnValue(false),
  sendInvoiceEmail: jest.fn(),
  sendPaymentFailedEmail: jest.fn(),
}));

jest.mock('../../src/services/business-profile.js', () => ({
  getBusinessProfile: jest.fn().mockResolvedValue({ company_name: 'Test Co' }),
}));

// ---------------------------------------------------------------------------
// Mock: database service (subscription/checkout fetches user email directly)
// ---------------------------------------------------------------------------
const mockDbQuery = jest.fn();
jest.mock('../../src/services/database.js', () => ({
  __esModule: true,
  default: { query: (...args: unknown[]) => mockDbQuery(...args) },
}));

// ---------------------------------------------------------------------------
// Mock: subscription service (route-level)
// ---------------------------------------------------------------------------
const mockGetUserSubscription = jest.fn();
const mockGetTierUsage = jest.fn();
const mockGetAllTiers = jest.fn();
const mockGetTierLimits = jest.fn();
const mockIsBetaMode = jest.fn();
const mockCreateCheckoutSession = jest.fn();

jest.mock('../../src/services/subscriptions.js', () => ({
  getUserSubscription: mockGetUserSubscription,
  getTierUsage: mockGetTierUsage,
  getAllTiers: mockGetAllTiers,
  getTierLimits: mockGetTierLimits,
  isBetaMode: mockIsBetaMode,
  updateSubscriptionTier: jest.fn(),
  canCreateInvoice: jest.fn().mockResolvedValue(true),
  canCreateSwms: jest.fn().mockResolvedValue(true),
  canAddTeamMember: jest.fn().mockResolvedValue(true),
  isFeatureAvailable: jest.fn().mockReturnValue(true),
}));

jest.mock('../../src/services/stripe.js', () => ({
  __esModule: true,
  default: { createCheckoutSession: mockCreateCheckoutSession },
  createCheckoutSession: mockCreateCheckoutSession,
  createPortalSession: jest.fn(),
  constructWebhookEvent: jest.fn(),
  handleWebhookEvent: jest.fn(),
  ensureStripeCustomer: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: auth middleware — injects test user into req.user
// ---------------------------------------------------------------------------
jest.mock('../../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'user-001', email: 'tradie@example.com' };
    next();
  },
}));

// ---------------------------------------------------------------------------
// Mock: subscription middleware — passes through with free tier by default
// ---------------------------------------------------------------------------
jest.mock('../../src/middleware/subscription.js', () => ({
  attachSubscription: (_req: any, _res: any, next: any) => next(),
  requireTier: () => (_req: any, _res: any, next: any) => next(),
  requireFeature: () => (_req: any, _res: any, next: any) => next(),
  checkLimit: () => (_req: any, _res: any, next: any) => next(),
}));

// ---------------------------------------------------------------------------
// Mock: redis (brute-force protection in auth routes)
// ---------------------------------------------------------------------------
jest.mock('../../src/services/redis.js', () => ({
  __esModule: true,
  default: {
    getClient: () => ({
      isOpen: false,
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
      del: jest.fn(),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Mock: config
// ---------------------------------------------------------------------------
jest.mock('../../src/config/index.js', () => ({
  __esModule: true,
  default: {
    jwt: { secret: 'test-secret', refreshSecret: 'test-refresh' },
    stripe: {
      webhookSecret: 'whsec_test',
      secretKey: 'sk_test',
      priceIdTradie: 'price_tradie',
      priceIdTeam: 'price_team',
      returnUrl: 'https://app.bossboard.co.nz',
    },
    isDevelopment: true,
  },
  config: {
    jwt: { secret: 'test-secret', refreshSecret: 'test-refresh' },
    stripe: {
      webhookSecret: 'whsec_test',
      secretKey: 'sk_test',
      priceIdTradie: 'price_tradie',
      priceIdTeam: 'price_team',
      returnUrl: 'https://app.bossboard.co.nz',
    },
    isDevelopment: true,
  },
}));

// ---------------------------------------------------------------------------
// Import routes under test (after all mocks are in place)
// ---------------------------------------------------------------------------
import authRoutes from '../../src/routes/auth.js';
import invoiceRoutes from '../../src/routes/invoices.js';
import subscriptionRoutes from '../../src/routes/subscriptions.js';
import { errorHandler } from '../../src/middleware/error.js';

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/invoices', invoiceRoutes);
  app.use('/api/v1/subscriptions', subscriptionRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsBetaMode.mockReturnValue(false);
});

// ===========================================================================
// 1. POST /api/v1/auth/register
// ===========================================================================
describe('1. POST /api/v1/auth/register', () => {
  const payload = {
    email: 'newtradie@example.com',
    password: 'strongpass123',
    name: 'New Tradie',
    tradeType: 'electrician',
  };

  it('happy path — returns 201 with user and tokens', async () => {
    mockRegister.mockResolvedValue({
      user: { id: 'u-1', email: payload.email, name: payload.name, isVerified: false },
      tokens: { accessToken: 'access_tok', refreshToken: 'refresh_tok', expiresIn: 900 },
    });

    const res = await request(app).post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBe('access_tok');
    expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({ email: payload.email }));
  });

  it('error path — rejects invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...payload, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('error path — rejects password shorter than 8 chars with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...payload, password: 'short' });

    expect(res.status).toBe(400);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('error path — duplicate email returns 409', async () => {
    const err = Object.assign(new Error('Email already registered'), {
      statusCode: 409,
      code: 'EMAIL_EXISTS',
    });
    mockRegister.mockRejectedValue(err);

    const res = await request(app).post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(409);
  });
});

// ===========================================================================
// 2. POST /api/v1/auth/login
// ===========================================================================
describe('2. POST /api/v1/auth/login', () => {
  const credentials = { email: 'tradie@example.com', password: 'correctpass' };

  it('happy path — returns 200 with access and refresh tokens', async () => {
    mockLogin.mockResolvedValue({
      user: { id: 'u-1', email: credentials.email },
      tokens: { accessToken: 'tok-access', refreshToken: 'tok-refresh', expiresIn: 900 },
    });

    const res = await request(app).post('/api/v1/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBe('tok-access');
  });

  it('error path — wrong credentials returns 401', async () => {
    const err = Object.assign(new Error('Invalid email or password'), {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
    mockLogin.mockRejectedValue(err);

    const res = await request(app).post('/api/v1/auth/login').send(credentials);

    expect(res.status).toBe(401);
  });

  it('error path — missing password returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email });

    expect(res.status).toBe(400);
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 3. POST /api/v1/auth/refresh
// ===========================================================================
describe('3. POST /api/v1/auth/refresh', () => {
  it('happy path — returns new token pair on valid refresh token', async () => {
    mockRefreshToken.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 900,
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'valid-refresh-tok' });

    expect(res.status).toBe(200);
    // Route wraps tokens under data.tokens
    expect(res.body.data.tokens.accessToken).toBe('new-access');
  });

  it('error path — missing refresh token returns 400', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(mockRefreshToken).not.toHaveBeenCalled();
  });

  it('error path — expired/invalid refresh token returns 401', async () => {
    const err = Object.assign(new Error('Invalid refresh token'), {
      statusCode: 401,
      code: 'INVALID_TOKEN',
    });
    mockRefreshToken.mockRejectedValue(err);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'expired-tok' });

    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// 4. GET /api/v1/auth/me
// ===========================================================================
describe('4. GET /api/v1/auth/me', () => {
  it('happy path — returns user profile for authenticated user', async () => {
    mockGetUserById.mockResolvedValue({
      id: 'user-001',
      email: 'tradie@example.com',
      name: 'Test Tradie',
      tradeType: 'electrician',
      subscription_tier: 'free',
    });

    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('tradie@example.com');
    expect(mockGetUserById).toHaveBeenCalledWith('user-001');
  });

  it('error path — user not found in DB returns 404', async () => {
    // Route checks `if (!user)` and returns 404 inline; service returning null is the correct mock
    mockGetUserById.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 5. POST /api/v1/invoices
// ===========================================================================
describe('5. POST /api/v1/invoices', () => {
  const validInvoice = {
    clientName: 'Smith Building',
    lineItems: [{ description: 'Labour', amount: 50000 }],
    includeGst: true,
  };

  it('happy path — creates invoice and returns 201', async () => {
    mockCreateInvoice.mockResolvedValue({
      id: 'inv-001',
      invoice_number: 'INV-001',
      client_name: 'Smith Building',
      status: 'draft',
      total: 57500,
    });

    const res = await request(app).post('/api/v1/invoices').send(validInvoice);

    expect(res.status).toBe(201);
    expect(res.body.data.invoice.invoice_number).toBe('INV-001');
    expect(mockCreateInvoice).toHaveBeenCalledWith(
      'user-001',
      expect.objectContaining({ clientName: 'Smith Building' })
    );
  });

  it('error path — missing clientName returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .send({ lineItems: [{ description: 'x', amount: 100 }] });

    expect(res.status).toBe(400);
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it('error path — empty lineItems array returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/invoices')
      .send({ clientName: 'Smith Building', lineItems: [] });

    expect(res.status).toBe(400);
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 6. GET /api/v1/invoices
// ===========================================================================
describe('6. GET /api/v1/invoices', () => {
  it('happy path — returns paginated invoice list', async () => {
    mockListInvoices.mockResolvedValue({
      invoices: [
        { id: 'inv-001', client_name: 'Smith Building', status: 'draft', total: 57500 },
        { id: 'inv-002', client_name: 'Jones Plumbing', status: 'sent', total: 23000 },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    const res = await request(app).get('/api/v1/invoices');

    expect(res.status).toBe(200);
    expect(res.body.data.invoices).toHaveLength(2);
    expect(mockListInvoices).toHaveBeenCalledWith('user-001', expect.any(Object));
  });

  it('happy path — filters by status when provided', async () => {
    mockListInvoices.mockResolvedValue({ invoices: [], total: 0, page: 1, limit: 20 });

    await request(app).get('/api/v1/invoices?status=sent');

    expect(mockListInvoices).toHaveBeenCalledWith(
      'user-001',
      expect.objectContaining({ status: 'sent' })
    );
  });
});

// ===========================================================================
// 7. GET /api/v1/invoices/:id
// ===========================================================================
describe('7. GET /api/v1/invoices/:id', () => {
  it('happy path — returns invoice owned by the authenticated user', async () => {
    mockGetInvoiceById.mockResolvedValue({
      id: 'inv-001',
      user_id: 'user-001',
      client_name: 'Smith Building',
      status: 'draft',
      line_items: [{ description: 'Labour', amount: 50000 }],
      total: 57500,
    });

    const res = await request(app).get('/api/v1/invoices/inv-001');

    expect(res.status).toBe(200);
    expect(res.body.data.invoice.id).toBe('inv-001');
  });

  it('error path — non-existent invoice returns 404', async () => {
    // Route checks `if (!invoice)` inline; returning null is the correct mock for 404
    mockGetInvoiceById.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/invoices/no-such-id');

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 8. POST /api/v1/invoices/:id/send
// ===========================================================================
describe('8. POST /api/v1/invoices/:id/send', () => {
  it('happy path — marks invoice as sent and returns updated invoice', async () => {
    mockGetInvoiceById.mockResolvedValue({
      id: 'inv-001',
      user_id: 'user-001',
      client_name: 'Smith Building',
      client_email: 'smith@example.com',
      status: 'draft',
      total: 57500,
    });
    mockMarkAsSent.mockResolvedValue({
      id: 'inv-001',
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    const res = await request(app).post('/api/v1/invoices/inv-001/send');

    expect(res.status).toBe(200);
    expect(res.body.data.invoice.status).toBe('sent');
    expect(mockMarkAsSent).toHaveBeenCalledWith('inv-001', 'user-001');
  });

  it('error path — invoice not found returns 404', async () => {
    // Route calls markAsSent directly and checks if result is null → 404.
    // (The service handles "already paid" and "wrong user" by returning null or throwing;
    // since the route catch block re-throws, the safe test is the null/404 path.)
    mockMarkAsSent.mockResolvedValue(null);

    const res = await request(app).post('/api/v1/invoices/inv-001/send');

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 9. GET /api/v1/subscriptions/me
// ===========================================================================
describe('9. GET /api/v1/subscriptions/me', () => {
  it('happy path — returns subscription tier, usage, and limits', async () => {
    mockGetUserSubscription.mockResolvedValue({
      tier: 'free',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      startedAt: null,
      expiresAt: null,
    });
    mockGetTierUsage.mockResolvedValue({
      invoicesThisMonth: 1,
      swmsThisMonth: 0,
      teamMembers: 0,
    });
    mockGetTierLimits.mockReturnValue({
      invoicesPerMonth: 3,
      swmsPerMonth: 2,
      teamMembers: 0,
    });

    const res = await request(app).get('/api/v1/subscriptions/me');

    expect(res.status).toBe(200);
    expect(res.body.data.subscription.tier).toBe('free');
    expect(res.body.data.usage.invoicesThisMonth).toBe(1);
    expect(res.body.data.limits.invoicesPerMonth).toBe(3);
  });

  it('error path — no subscription record returns 404', async () => {
    const err = Object.assign(new Error('Subscription not found'), {
      statusCode: 404,
      code: 'SUBSCRIPTION_NOT_FOUND',
    });
    mockGetUserSubscription.mockRejectedValue(err);

    const res = await request(app).get('/api/v1/subscriptions/me');

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 10. POST /api/v1/subscriptions/checkout
// ===========================================================================
describe('10. POST /api/v1/subscriptions/checkout', () => {
  it('happy path — returns Stripe checkout sessionId and URL for tradie tier', async () => {
    mockIsBetaMode.mockReturnValue(false);
    // Route fetches user email/name from DB directly before calling Stripe
    mockDbQuery.mockResolvedValue({
      rows: [{ email: 'tradie@example.com', name: 'Test Tradie' }],
    });
    mockCreateCheckoutSession.mockResolvedValue({
      sessionId: 'cs_test_abc',
      url: 'https://checkout.stripe.com/pay/cs_test_abc',
    });

    const res = await request(app)
      .post('/api/v1/subscriptions/checkout')
      .send({
        tier: 'tradie',
        successUrl: 'https://app.bossboard.co.nz/success',
        cancelUrl: 'https://app.bossboard.co.nz/cancel',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.sessionId).toBe('cs_test_abc');
    expect(res.body.data.url).toContain('checkout.stripe.com');
  });

  it('error path — invalid tier returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/checkout')
      .send({
        tier: 'enterprise',
        successUrl: 'https://app.bossboard.co.nz/success',
        cancelUrl: 'https://app.bossboard.co.nz/cancel',
      });

    expect(res.status).toBe(400);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });

  it('beta mode — returns informational message instead of Stripe URL', async () => {
    mockIsBetaMode.mockReturnValue(true);

    const res = await request(app)
      .post('/api/v1/subscriptions/checkout')
      .send({
        tier: 'tradie',
        successUrl: 'https://app.bossboard.co.nz/success',
        cancelUrl: 'https://app.bossboard.co.nz/cancel',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.betaMode).toBe(true);
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
  });
});
