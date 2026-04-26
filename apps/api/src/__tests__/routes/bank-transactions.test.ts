/**
 * Bank Transactions Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock services
const mockUploadCSV = jest.fn();
const mockListTransactions = jest.fn();
const mockAutoMatch = jest.fn();
const mockConfirmMatch = jest.fn();
const mockUnmatchTransaction = jest.fn();
const mockGetTransactionSummary = jest.fn();

jest.mock('../../services/bank-transactions.js', () => ({
  __esModule: true,
  default: {
    uploadCSV: mockUploadCSV,
    listTransactions: mockListTransactions,
    autoMatch: mockAutoMatch,
    confirmMatch: mockConfirmMatch,
    unmatchTransaction: mockUnmatchTransaction,
    getTransactionSummary: mockGetTransactionSummary,
  },
}));

jest.mock('../../middleware/auth.js', () => ({
  authenticate: function (req: any, _res: any, next: any) {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import bankTransactionRoutes from '../../routes/bank-transactions.js';
import { errorHandler } from '../../middleware/error.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/bank-transactions', bankTransactionRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Bank Transaction Routes', () => {
  // =========================================================================
  // POST /upload
  // =========================================================================
  describe('POST /api/v1/bank-transactions/upload', () => {
    const validCsv = 'Date,Description,Amount\n2026-01-01,Payment from client,500.00';

    it('should upload CSV and return import results', async () => {
      mockUploadCSV.mockResolvedValue({ imported: 3, duplicates: 1 });

      const response = await request(app)
        .post('/api/v1/bank-transactions/upload')
        .send({ csvContent: validCsv, filename: 'wise-export.csv' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.imported).toBe(3);
      expect(response.body.data.duplicates).toBe(1);
      expect(response.body.message).toContain('3 transactions');
      expect(response.body.message).toContain('1 duplicates');
      expect(mockUploadCSV).toHaveBeenCalledWith('test-user-id', validCsv, 'wise-export.csv');
    });

    it('should accept base64-encoded CSV content', async () => {
      const csvData = 'Date,Description,Amount\n2026-01-01,Payment,200.00';
      const base64Csv = Buffer.from(csvData).toString('base64');
      mockUploadCSV.mockResolvedValue({ imported: 1, duplicates: 0 });

      const response = await request(app)
        .post('/api/v1/bank-transactions/upload')
        .send({ csvContent: base64Csv, filename: 'wise.csv' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      // Service should have been called with decoded CSV
      expect(mockUploadCSV).toHaveBeenCalledWith('test-user-id', csvData, 'wise.csv');
    });

    it('should reject missing csvContent', async () => {
      const response = await request(app)
        .post('/api/v1/bank-transactions/upload')
        .send({ filename: 'wise.csv' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject missing filename', async () => {
      const response = await request(app)
        .post('/api/v1/bank-transactions/upload')
        .send({ csvContent: validCsv });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject empty csvContent', async () => {
      const response = await request(app)
        .post('/api/v1/bank-transactions/upload')
        .send({ csvContent: '', filename: 'wise.csv' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

  });

  // =========================================================================
  // GET /
  // =========================================================================
  describe('GET /api/v1/bank-transactions', () => {
    it('should list transactions with no filters', async () => {
      const mockResult = {
        transactions: [{ id: 'txn-1', amount: 50000, description: 'Payment' }],
        total: 1,
      };
      mockListTransactions.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/bank-transactions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(mockListTransactions).toHaveBeenCalledWith('test-user-id', {
        isReconciled: undefined,
        startDate: undefined,
        endDate: undefined,
        batchId: undefined,
        limit: undefined,
        offset: undefined,
      });
    });

    it('should pass isReconciled filter as boolean', async () => {
      mockListTransactions.mockResolvedValue({ transactions: [], total: 0 });

      await request(app).get('/api/v1/bank-transactions?isReconciled=true');

      expect(mockListTransactions).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ isReconciled: true })
      );
    });

    it('should pass isReconciled=false correctly', async () => {
      mockListTransactions.mockResolvedValue({ transactions: [], total: 0 });

      await request(app).get('/api/v1/bank-transactions?isReconciled=false');

      expect(mockListTransactions).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ isReconciled: false })
      );
    });

    it('should pass date range filters', async () => {
      mockListTransactions.mockResolvedValue({ transactions: [], total: 0 });

      await request(app).get(
        '/api/v1/bank-transactions?startDate=2026-01-01&endDate=2026-01-31'
      );

      expect(mockListTransactions).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ startDate: '2026-01-01', endDate: '2026-01-31' })
      );
    });

    it('should pass pagination parameters', async () => {
      mockListTransactions.mockResolvedValue({ transactions: [], total: 0 });

      await request(app).get('/api/v1/bank-transactions?limit=20&offset=40');

      expect(mockListTransactions).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ limit: 20, offset: 40 })
      );
    });

    it('should pass batchId filter', async () => {
      mockListTransactions.mockResolvedValue({ transactions: [], total: 0 });

      await request(app).get('/api/v1/bank-transactions?batchId=batch-123');

      expect(mockListTransactions).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ batchId: 'batch-123' })
      );
    });
  });

  // =========================================================================
  // GET /summary
  // =========================================================================
  describe('GET /api/v1/bank-transactions/summary', () => {
    it('should return transaction summary stats', async () => {
      const mockSummary = {
        totalTransactions: 50,
        reconciledCount: 30,
        unreconciledCount: 20,
        totalAmount: 500000,
      };
      mockGetTransactionSummary.mockResolvedValue(mockSummary);

      const response = await request(app).get('/api/v1/bank-transactions/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toEqual(mockSummary);
      expect(mockGetTransactionSummary).toHaveBeenCalledWith('test-user-id');
    });

  });

  // =========================================================================
  // POST /auto-match
  // =========================================================================
  describe('POST /api/v1/bank-transactions/auto-match', () => {
    it('should run auto-match and return results', async () => {
      mockAutoMatch.mockResolvedValue({ matched: 5, candidates: [] });

      const response = await request(app)
        .post('/api/v1/bank-transactions/auto-match')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.matched).toBe(5);
      expect(response.body.message).toContain('5 potential matches');
      expect(mockAutoMatch).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle zero matches gracefully', async () => {
      mockAutoMatch.mockResolvedValue({ matched: 0, candidates: [] });

      const response = await request(app)
        .post('/api/v1/bank-transactions/auto-match')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('0 potential matches');
    });
  });

  // =========================================================================
  // POST /:id/confirm
  // =========================================================================
  describe('POST /api/v1/bank-transactions/:id/confirm', () => {
    it('should confirm a match successfully', async () => {
      const mockTxn = { id: 'txn-1', isReconciled: true, matchedInvoiceId: 'inv-1' };
      mockConfirmMatch.mockResolvedValue(mockTxn);

      const response = await request(app)
        .post('/api/v1/bank-transactions/txn-1/confirm')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.isReconciled).toBe(true);
      expect(response.body.message).toContain('confirmed');
      expect(mockConfirmMatch).toHaveBeenCalledWith('txn-1', 'test-user-id');
    });

    it('should return 404 when transaction not found', async () => {
      mockConfirmMatch.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/bank-transactions/nonexistent/confirm')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // POST /:id/unmatch
  // =========================================================================
  describe('POST /api/v1/bank-transactions/:id/unmatch', () => {
    it('should remove a match successfully', async () => {
      const mockTxn = { id: 'txn-1', isReconciled: false, matchedInvoiceId: null };
      mockUnmatchTransaction.mockResolvedValue(mockTxn);

      const response = await request(app)
        .post('/api/v1/bank-transactions/txn-1/unmatch')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction.isReconciled).toBe(false);
      expect(response.body.message).toContain('removed');
      expect(mockUnmatchTransaction).toHaveBeenCalledWith('txn-1', 'test-user-id');
    });

    it('should return 404 when transaction not found', async () => {
      mockUnmatchTransaction.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/bank-transactions/nonexistent/unmatch')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // Error-path coverage — every handler forwards service errors via next(error).
  // Financial data handlers must surface DB/service failures cleanly instead of
  // swallowing them, so these tests pin that contract.
  // =========================================================================
  describe('Service error forwarding', () => {
    it('POST /upload forwards service errors to the error handler', async () => {
      mockUploadCSV.mockRejectedValue(new Error('parser crashed'));

      const response = await request(app)
        .post('/api/v1/bank-transactions/upload')
        .send({ csvContent: 'date,amount\n2026-01-01,100', filename: 'x.csv' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('GET / forwards service errors to the error handler', async () => {
      mockListTransactions.mockRejectedValue(new Error('db down'));

      const response = await request(app).get('/api/v1/bank-transactions');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('POST /auto-match forwards service errors to the error handler', async () => {
      mockAutoMatch.mockRejectedValue(new Error('matcher failed'));

      const response = await request(app)
        .post('/api/v1/bank-transactions/auto-match')
        .send();

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('POST /:id/confirm forwards service errors to the error handler', async () => {
      mockConfirmMatch.mockRejectedValue(new Error('tx commit failed'));

      const response = await request(app)
        .post('/api/v1/bank-transactions/txn-1/confirm')
        .send();

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('POST /:id/unmatch forwards service errors to the error handler', async () => {
      mockUnmatchTransaction.mockRejectedValue(new Error('tx commit failed'));

      const response = await request(app)
        .post('/api/v1/bank-transactions/txn-1/unmatch')
        .send();

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('GET /summary forwards service errors to the error handler', async () => {
      mockGetTransactionSummary.mockRejectedValue(new Error('aggregate failed'));

      const response = await request(app).get('/api/v1/bank-transactions/summary');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
