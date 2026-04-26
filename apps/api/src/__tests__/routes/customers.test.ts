/**
 * Customers Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock services
const mockCreateCustomer = jest.fn();
const mockListCustomers = jest.fn();
const mockGetCustomerById = jest.fn();
const mockUpdateCustomer = jest.fn();
const mockDeleteCustomer = jest.fn();

jest.mock('../../services/customers.js', () => ({
  __esModule: true,
  default: {
    createCustomer: mockCreateCustomer,
    listCustomers: mockListCustomers,
    getCustomerById: mockGetCustomerById,
    updateCustomer: mockUpdateCustomer,
    deleteCustomer: mockDeleteCustomer,
  },
}));

jest.mock('../../middleware/auth.js', () => ({
  authenticate: function (req: any, _res: any, next: any) {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import customerRoutes from '../../routes/customers.js';
import { errorHandler } from '../../middleware/error.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/customers', customerRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Customer Routes', () => {
  const validCustomer = {
    name: 'Acme Plumbing Ltd',
    email: 'contact@acme.co.nz',
    phone: '09-123-4567',
    address: '1 Main Street, Auckland',
  };

  // =========================================================================
  // POST /
  // =========================================================================
  describe('POST /api/v1/customers', () => {
    it('should create a customer successfully', async () => {
      const mockCreated = { id: 'cust-1', ...validCustomer, isActive: true };
      mockCreateCustomer.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/v1/customers')
        .send(validCustomer);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customer.id).toBe('cust-1');
      expect(response.body.data.customer.name).toBe('Acme Plumbing Ltd');
      expect(response.body.message).toContain('created');
      expect(mockCreateCustomer).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ name: 'Acme Plumbing Ltd' })
      );
    });

    it('should create a customer with only required name field', async () => {
      const mockCreated = { id: 'cust-2', name: 'Bob the Builder', isActive: true };
      mockCreateCustomer.mockResolvedValue(mockCreated);

      const response = await request(app)
        .post('/api/v1/customers')
        .send({ name: 'Bob the Builder' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject missing name', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .send({ name: 'Test', email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject defaultPaymentTerms out of range', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .send({ name: 'Test', defaultPaymentTerms: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should accept valid defaultPaymentTerms', async () => {
      mockCreateCustomer.mockResolvedValue({ id: 'cust-3', name: 'Test', defaultPaymentTerms: 30 });

      const response = await request(app)
        .post('/api/v1/customers')
        .send({ name: 'Test', defaultPaymentTerms: 30 });

      expect(response.status).toBe(201);
    });

  });

  // =========================================================================
  // GET /
  // =========================================================================
  describe('GET /api/v1/customers', () => {
    it('should list customers with no filters', async () => {
      const mockResult = {
        customers: [{ id: 'cust-1', name: 'Acme', isActive: true }],
        total: 1,
      };
      mockListCustomers.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/customers');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customers).toHaveLength(1);
      expect(mockListCustomers).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ includeInactive: false })
      );
    });

    it('should pass search parameter', async () => {
      mockListCustomers.mockResolvedValue({ customers: [], total: 0 });

      await request(app).get('/api/v1/customers?search=acme');

      expect(mockListCustomers).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ search: 'acme' })
      );
    });

    it('should pass pagination parameters as integers', async () => {
      mockListCustomers.mockResolvedValue({ customers: [], total: 0 });

      await request(app).get('/api/v1/customers?limit=10&offset=20');

      expect(mockListCustomers).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ limit: 10, offset: 20 })
      );
    });

    it('should pass includeInactive=true', async () => {
      mockListCustomers.mockResolvedValue({ customers: [], total: 0 });

      await request(app).get('/api/v1/customers?includeInactive=true');

      expect(mockListCustomers).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ includeInactive: true })
      );
    });
  });

  // =========================================================================
  // GET /:id
  // =========================================================================
  describe('GET /api/v1/customers/:id', () => {
    it('should return a customer by ID', async () => {
      const mockCustomer = { id: 'cust-1', name: 'Acme', isActive: true };
      mockGetCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app).get('/api/v1/customers/cust-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customer.id).toBe('cust-1');
      expect(mockGetCustomerById).toHaveBeenCalledWith('cust-1', 'test-user-id');
    });

    it('should return 404 when customer not found', async () => {
      mockGetCustomerById.mockResolvedValue(null);

      const response = await request(app).get('/api/v1/customers/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // PUT /:id
  // =========================================================================
  describe('PUT /api/v1/customers/:id', () => {
    it('should update a customer successfully', async () => {
      const mockUpdated = { id: 'cust-1', name: 'Updated Name', isActive: true };
      mockUpdateCustomer.mockResolvedValue(mockUpdated);

      const response = await request(app)
        .put('/api/v1/customers/cust-1')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customer.name).toBe('Updated Name');
      expect(response.body.message).toContain('updated');
      expect(mockUpdateCustomer).toHaveBeenCalledWith(
        'cust-1',
        'test-user-id',
        expect.objectContaining({ name: 'Updated Name' })
      );
    });

    it('should allow nullable fields in update', async () => {
      const mockUpdated = { id: 'cust-1', name: 'Test', email: null };
      mockUpdateCustomer.mockResolvedValue(mockUpdated);

      const response = await request(app)
        .put('/api/v1/customers/cust-1')
        .send({ email: null });

      expect(response.status).toBe(200);
    });

    it('should reject invalid email in update', async () => {
      const response = await request(app)
        .put('/api/v1/customers/cust-1')
        .send({ email: 'bad-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when customer not found', async () => {
      mockUpdateCustomer.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/customers/nonexistent')
        .send({ name: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NOT_FOUND');
    });

    it('should allow updating isActive flag', async () => {
      mockUpdateCustomer.mockResolvedValue({ id: 'cust-1', name: 'Test', isActive: false });

      const response = await request(app)
        .put('/api/v1/customers/cust-1')
        .send({ isActive: false });

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // DELETE /:id
  // =========================================================================
  describe('DELETE /api/v1/customers/:id', () => {
    it('should soft-delete a customer', async () => {
      mockDeleteCustomer.mockResolvedValue(true);

      const response = await request(app).delete('/api/v1/customers/cust-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deactivated');
      expect(mockDeleteCustomer).toHaveBeenCalledWith('cust-1', 'test-user-id');
    });

    it('should return 404 when customer not found', async () => {
      mockDeleteCustomer.mockResolvedValue(false);

      const response = await request(app).delete('/api/v1/customers/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // Error-path coverage — every handler forwards service errors via next(error).
  // These tests pin the shared catch-block behaviour against regressions.
  // =========================================================================
  describe('Service error forwarding', () => {
    it('POST / forwards service errors to the error handler', async () => {
      mockCreateCustomer.mockRejectedValue(new Error('db down'));

      const response = await request(app)
        .post('/api/v1/customers')
        .send({ name: 'Acme Ltd' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('GET / forwards service errors to the error handler', async () => {
      mockListCustomers.mockRejectedValue(new Error('db down'));

      const response = await request(app).get('/api/v1/customers');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('GET /:id forwards service errors to the error handler', async () => {
      mockGetCustomerById.mockRejectedValue(new Error('db down'));

      const response = await request(app).get('/api/v1/customers/cust-1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('PUT /:id forwards service errors to the error handler', async () => {
      mockUpdateCustomer.mockRejectedValue(new Error('db down'));

      const response = await request(app)
        .put('/api/v1/customers/cust-1')
        .send({ name: 'New Name' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('DELETE /:id forwards service errors to the error handler', async () => {
      mockDeleteCustomer.mockRejectedValue(new Error('db down'));

      const response = await request(app).delete('/api/v1/customers/cust-1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
