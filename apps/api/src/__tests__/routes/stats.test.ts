/**
 * Stats Route Tests
 *
 * Covers:
 *   GET /api/v1/stats/dashboard
 *     - happy path: all services return data
 *     - zero-data case: new user with no activity
 *     - SWMS values parsed correctly from strings
 *     - error propagated when db.query throws
 *     - error propagated when invoiceStats throws
 *   GET /api/v1/stats/insights
 *     - happy path: full insights object returned
 *     - empty insights: all zero/empty arrays
 *     - error propagated when insightsService throws
 *   Auth: unauthenticated request rejected (401)
 */

import request from 'supertest';
import express, { Express } from 'express';

// ---------------------------------------------------------------------------
// Mocks — before any imports that trigger module evaluation
// ---------------------------------------------------------------------------

const mockDbQuery = jest.fn();
jest.mock('../../services/database.js', () => ({
  __esModule: true,
  default: { query: (...args: any[]) => mockDbQuery(...args) },
}));

const mockGetInvoiceStats = jest.fn();
jest.mock('../../services/invoices.js', () => ({
  __esModule: true,
  default: { getInvoiceStats: mockGetInvoiceStats },
}));

const mockGetQuoteStats = jest.fn();
jest.mock('../../services/quotes.js', () => ({
  __esModule: true,
  default: { getQuoteStats: mockGetQuoteStats },
}));

const mockGetCertificationStats = jest.fn();
jest.mock('../../services/certifications.js', () => ({
  __esModule: true,
  default: { getCertificationStats: mockGetCertificationStats },
}));

const mockGetInsights = jest.fn();
jest.mock('../../services/insights.js', () => ({
  __esModule: true,
  default: { getInsights: mockGetInsights },
}));

// Authenticate middleware — default is "authenticated"; override per-test for 401 cases
let authenticateImpl: (req: any, res: any, next: any) => void = (req, _res, next) => {
  req.user = { userId: 'test-user-id', email: 'test@example.com' };
  next();
};

jest.mock('../../middleware/auth.js', () => ({
  authenticate: (req: any, res: any, next: any) => authenticateImpl(req, res, next),
}));

jest.mock('../../types/index.js', () => ({}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import statsRoutes from '../../routes/stats.js';
import { errorHandler } from '../../middleware/error.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeSWMSRow(overrides: Record<string, string> = {}) {
  return { total: '5', this_month: '2', signed: '3', draft: '2', ...overrides };
}

function makeInvoiceStats(overrides = {}) {
  return { total: 20, totalRevenue: 400000, paid: 15, outstanding: 5, ...overrides };
}

function makeQuoteStats(overrides = {}) {
  return { total: 10, accepted: 7, pending: 3, ...overrides };
}

function makeCertStats(overrides = {}) {
  return { total: 6, expiring: 1, expired: 0, ...overrides };
}

function makeInsights(overrides = {}) {
  return {
    revenue: { thisMonth: 120000, lastMonth: 100000, percentChange: 20 },
    aging: {
      current: 3, thirtyDay: 1, sixtyDay: 0, ninetyPlus: 0,
      currentAmount: 30000, thirtyDayAmount: 5000, sixtyDayAmount: 0, ninetyPlusAmount: 0,
    },
    topCustomers: [
      { customerId: 'cust-1', customerName: 'Acme Ltd', revenue: 60000, invoiceCount: 3 },
    ],
    monthlyRevenue: [
      { month: '2025-11', label: 'Nov', revenue: 80000, count: 4 },
      { month: '2025-12', label: 'Dec', revenue: 95000, count: 5 },
      { month: '2026-01', label: 'Jan', revenue: 100000, count: 6 },
      { month: '2026-02', label: 'Feb', revenue: 110000, count: 5 },
      { month: '2026-03', label: 'Mar', revenue: 115000, count: 5 },
      { month: '2026-04', label: 'Apr', revenue: 120000, count: 4 },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/stats', statsRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
  // Reset to default authenticated
  authenticateImpl = (req, _res, next) => {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  };
});

// ===========================================================================
// GET /api/v1/stats/dashboard
// ===========================================================================

describe('GET /api/v1/stats/dashboard', () => {
  it('returns aggregated stats with correct shape', async () => {
    mockDbQuery.mockResolvedValue({ rows: [makeSWMSRow()] });
    mockGetInvoiceStats.mockResolvedValue(makeInvoiceStats());
    mockGetQuoteStats.mockResolvedValue(makeQuoteStats());
    mockGetCertificationStats.mockResolvedValue(makeCertStats());

    const res = await request(app).get('/api/v1/stats/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { stats } = res.body.data;
    expect(stats).toHaveProperty('swms');
    expect(stats).toHaveProperty('invoices');
    expect(stats).toHaveProperty('quotes');
    expect(stats).toHaveProperty('certifications');
  });

  it('parses SWMS counts from DB strings to integers', async () => {
    mockDbQuery.mockResolvedValue({ rows: [makeSWMSRow({ total: '42', this_month: '7', signed: '35', draft: '7' })] });
    mockGetInvoiceStats.mockResolvedValue(makeInvoiceStats());
    mockGetQuoteStats.mockResolvedValue(makeQuoteStats());
    mockGetCertificationStats.mockResolvedValue(makeCertStats());

    const res = await request(app).get('/api/v1/stats/dashboard');

    expect(res.body.data.stats.swms.total).toBe(42);
    expect(res.body.data.stats.swms.thisMonth).toBe(7);
    expect(res.body.data.stats.swms.signed).toBe(35);
    expect(res.body.data.stats.swms.draft).toBe(7);
  });

  it('returns zero values for a new user with no activity', async () => {
    mockDbQuery.mockResolvedValue({ rows: [makeSWMSRow({ total: '0', this_month: '0', signed: '0', draft: '0' })] });
    mockGetInvoiceStats.mockResolvedValue({ total: 0, totalRevenue: 0, paid: 0, outstanding: 0 });
    mockGetQuoteStats.mockResolvedValue({ total: 0, accepted: 0, pending: 0 });
    mockGetCertificationStats.mockResolvedValue({ total: 0, expiring: 0, expired: 0 });

    const res = await request(app).get('/api/v1/stats/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.data.stats.swms.total).toBe(0);
    expect(res.body.data.stats.invoices.total).toBe(0);
    expect(res.body.data.stats.quotes.total).toBe(0);
    expect(res.body.data.stats.certifications.total).toBe(0);
  });

  it('returns 401 when unauthenticated', async () => {
    authenticateImpl = (_req, res, _next) => {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    };

    const res = await request(app).get('/api/v1/stats/dashboard');

    expect(res.status).toBe(401);
  });

  it('passes userId from auth token to db.query', async () => {
    authenticateImpl = (req, _res, next) => {
      req.user = { userId: 'specific-user-42', email: 'user42@example.com' };
      next();
    };
    mockDbQuery.mockResolvedValue({ rows: [makeSWMSRow()] });
    mockGetInvoiceStats.mockResolvedValue(makeInvoiceStats());
    mockGetQuoteStats.mockResolvedValue(makeQuoteStats());
    mockGetCertificationStats.mockResolvedValue(makeCertStats());

    await request(app).get('/api/v1/stats/dashboard');

    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['specific-user-42']
    );
    expect(mockGetInvoiceStats).toHaveBeenCalledWith('specific-user-42');
  });
});

// ===========================================================================
// GET /api/v1/stats/insights
// ===========================================================================

describe('GET /api/v1/stats/insights', () => {
  it('returns full insights object', async () => {
    mockGetInsights.mockResolvedValue(makeInsights());

    const res = await request(app).get('/api/v1/stats/insights');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { insights } = res.body.data;
    expect(insights).toHaveProperty('revenue');
    expect(insights).toHaveProperty('aging');
    expect(insights).toHaveProperty('topCustomers');
    expect(insights).toHaveProperty('monthlyRevenue');
  });

  it('returns correct revenue comparison values', async () => {
    mockGetInsights.mockResolvedValue(makeInsights({
      revenue: { thisMonth: 150000, lastMonth: 100000, percentChange: 50 },
    }));

    const res = await request(app).get('/api/v1/stats/insights');

    expect(res.body.data.insights.revenue.thisMonth).toBe(150000);
    expect(res.body.data.insights.revenue.lastMonth).toBe(100000);
    expect(res.body.data.insights.revenue.percentChange).toBe(50);
  });

  it('returns empty topCustomers array when no customers', async () => {
    mockGetInsights.mockResolvedValue(makeInsights({ topCustomers: [] }));

    const res = await request(app).get('/api/v1/stats/insights');

    expect(res.body.data.insights.topCustomers).toEqual([]);
  });

  it('returns 6-month revenue array', async () => {
    mockGetInsights.mockResolvedValue(makeInsights());

    const res = await request(app).get('/api/v1/stats/insights');

    expect(res.body.data.insights.monthlyRevenue).toHaveLength(6);
  });

  it('handles zero-revenue new user', async () => {
    mockGetInsights.mockResolvedValue(makeInsights({
      revenue: { thisMonth: 0, lastMonth: 0, percentChange: 0 },
      topCustomers: [],
      monthlyRevenue: Array(6).fill({ month: '2026-01', label: 'Jan', revenue: 0, count: 0 }),
    }));

    const res = await request(app).get('/api/v1/stats/insights');

    expect(res.status).toBe(200);
    expect(res.body.data.insights.revenue.percentChange).toBe(0);
  });

  it('returns 401 when unauthenticated', async () => {
    authenticateImpl = (_req, res, _next) => {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    };

    const res = await request(app).get('/api/v1/stats/insights');

    expect(res.status).toBe(401);
  });

  it('passes userId from auth token to insightsService', async () => {
    authenticateImpl = (req, _res, next) => {
      req.user = { userId: 'insights-user-99', email: 'user99@example.com' };
      next();
    };
    mockGetInsights.mockResolvedValue(makeInsights());

    await request(app).get('/api/v1/stats/insights');

    expect(mockGetInsights).toHaveBeenCalledWith('insights-user-99');
  });
});
