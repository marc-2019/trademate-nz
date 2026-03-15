/**
 * Stats Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock services
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

jest.mock('../../middleware/auth.js', () => ({
  authenticate: function (req: any, _res: any, next: any) {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

// Must mock the types import used by stats route
jest.mock('../../types/index.js', () => ({}));

import statsRoutes from '../../routes/stats.js';
import { errorHandler } from '../../middleware/error.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/stats', statsRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Stats Routes', () => {
  describe('GET /api/v1/stats/dashboard', () => {
    it('should return aggregated dashboard stats', async () => {
      mockDbQuery.mockResolvedValue({
        rows: [{ total: '10', this_month: '3', signed: '7', draft: '3' }],
      });
      mockGetInvoiceStats.mockResolvedValue({
        total: 25,
        totalRevenue: 500000,
        paid: 20,
        outstanding: 5,
      });
      mockGetQuoteStats.mockResolvedValue({
        total: 15,
        accepted: 10,
        pending: 5,
      });
      mockGetCertificationStats.mockResolvedValue({
        total: 8,
        expiring: 2,
        expired: 1,
      });

      const response = await request(app).get('/api/v1/stats/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.swms.total).toBe(10);
      expect(response.body.data.stats.swms.thisMonth).toBe(3);
      expect(response.body.data.stats.invoices.total).toBe(25);
      expect(response.body.data.stats.quotes.total).toBe(15);
      expect(response.body.data.stats.certifications.total).toBe(8);
    });
  });

  describe('GET /api/v1/stats/insights', () => {
    it('should return business insights', async () => {
      const insights = {
        revenueComparison: { thisMonth: 100000, lastMonth: 80000, percentChange: 25 },
        invoiceAging: { current: 3, thirtyDays: 1, sixtyDays: 0, ninetyPlus: 0 },
        topCustomers: [{ name: 'John Smith', revenue: 50000 }],
        monthlyRevenue: [{ month: '2026-01', revenue: 80000 }],
      };
      mockGetInsights.mockResolvedValue(insights);

      const response = await request(app).get('/api/v1/stats/insights');

      expect(response.status).toBe(200);
      expect(response.body.data.insights.revenueComparison.percentChange).toBe(25);
      expect(response.body.data.insights.topCustomers).toHaveLength(1);
    });
  });
});
