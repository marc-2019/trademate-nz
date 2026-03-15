/**
 * Expense Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock services
const mockCreateExpense = jest.fn();
const mockListExpenses = jest.fn();
const mockGetExpense = jest.fn();
const mockUpdateExpense = jest.fn();
const mockDeleteExpense = jest.fn();
const mockGetExpenseStats = jest.fn();
const mockGetMonthlyTotals = jest.fn();

jest.mock('../../services/expenses.js', () => ({
  __esModule: true,
  default: {
    createExpense: mockCreateExpense,
    listExpenses: mockListExpenses,
    getExpense: mockGetExpense,
    updateExpense: mockUpdateExpense,
    deleteExpense: mockDeleteExpense,
    getExpenseStats: mockGetExpenseStats,
    getMonthlyTotals: mockGetMonthlyTotals,
  },
}));

jest.mock('../../middleware/auth.js', () => ({
  authenticate: function (req: any, _res: any, next: any) {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

jest.mock('../../middleware/subscription.js', () => ({
  attachSubscription: function (_req: any, _res: any, next: any) { next(); },
  requireFeature: function () { return function (_req: any, _res: any, next: any) { next(); }; },
}));

import expenseRoutes from '../../routes/expenses.js';
import { errorHandler } from '../../middleware/error.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/expenses', expenseRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Expense Routes', () => {
  const validExpense = {
    amount: 5000,
    category: 'materials',
    description: 'PVC pipes',
    vendor: 'Plumbing World',
  };

  describe('POST /api/v1/expenses', () => {
    it('should create an expense successfully', async () => {
      const mockExpense = { id: 'exp-1', ...validExpense };
      mockCreateExpense.mockResolvedValue(mockExpense);

      const response = await request(app)
        .post('/api/v1/expenses')
        .send(validExpense);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.expense.id).toBe('exp-1');
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .send({ ...validExpense, category: 'invalid-category' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject negative amount', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .send({ ...validExpense, amount: -100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject zero amount', async () => {
      const response = await request(app)
        .post('/api/v1/expenses')
        .send({ ...validExpense, amount: 0 });

      expect(response.status).toBe(400);
    });

    it('should accept all valid categories', async () => {
      const categories = ['materials', 'fuel', 'tools', 'subcontractor', 'vehicle', 'office', 'other'];
      for (const category of categories) {
        mockCreateExpense.mockResolvedValue({ id: 'exp-1', ...validExpense, category });

        const response = await request(app)
          .post('/api/v1/expenses')
          .send({ ...validExpense, category });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('GET /api/v1/expenses', () => {
    it('should list expenses', async () => {
      mockListExpenses.mockResolvedValue({ expenses: [], total: 0 });

      const response = await request(app).get('/api/v1/expenses');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should pass category filter', async () => {
      mockListExpenses.mockResolvedValue({ expenses: [], total: 0 });

      await request(app).get('/api/v1/expenses?category=fuel');

      expect(mockListExpenses).toHaveBeenCalledWith('test-user-id', expect.objectContaining({ category: 'fuel' }));
    });
  });

  describe('GET /api/v1/expenses/stats', () => {
    it('should return expense statistics', async () => {
      const stats = { totalAmount: 50000, categoryBreakdown: {} };
      mockGetExpenseStats.mockResolvedValue(stats);

      const response = await request(app).get('/api/v1/expenses/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toEqual(stats);
    });
  });

  describe('GET /api/v1/expenses/monthly', () => {
    it('should return monthly totals', async () => {
      const totals = [{ month: '2026-01', total: 10000 }];
      mockGetMonthlyTotals.mockResolvedValue(totals);

      const response = await request(app).get('/api/v1/expenses/monthly');

      expect(response.status).toBe(200);
      expect(response.body.data.totals).toEqual(totals);
    });

    it('should pass months parameter', async () => {
      mockGetMonthlyTotals.mockResolvedValue([]);

      await request(app).get('/api/v1/expenses/monthly?months=12');

      expect(mockGetMonthlyTotals).toHaveBeenCalledWith('test-user-id', 12);
    });
  });

  describe('GET /api/v1/expenses/:id', () => {
    it('should return a single expense', async () => {
      mockGetExpense.mockResolvedValue({ id: 'exp-1', amount: 5000 });

      const response = await request(app).get('/api/v1/expenses/exp-1');

      expect(response.status).toBe(200);
      expect(response.body.data.expense.id).toBe('exp-1');
    });
  });

  describe('PUT /api/v1/expenses/:id', () => {
    it('should update an expense', async () => {
      mockUpdateExpense.mockResolvedValue({ id: 'exp-1', amount: 7500 });

      const response = await request(app)
        .put('/api/v1/expenses/exp-1')
        .send({ amount: 7500 });

      expect(response.status).toBe(200);
      expect(response.body.data.expense.amount).toBe(7500);
    });

    it('should reject invalid category in update', async () => {
      const response = await request(app)
        .put('/api/v1/expenses/exp-1')
        .send({ category: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/expenses/:id', () => {
    it('should delete an expense', async () => {
      mockDeleteExpense.mockResolvedValue(undefined);

      const response = await request(app).delete('/api/v1/expenses/exp-1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Expense deleted successfully');
    });
  });
});
