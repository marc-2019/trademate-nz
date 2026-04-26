/**
 * Certifications Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock service functions
const mockCreateCertification = jest.fn();
const mockListCertifications = jest.fn();
const mockGetExpiringCertifications = jest.fn();
const mockGetCertificationById = jest.fn();
const mockUpdateCertification = jest.fn();
const mockDeleteCertification = jest.fn();

jest.mock('../../services/certifications.js', () => ({
  __esModule: true,
  default: {
    createCertification: mockCreateCertification,
    listCertifications: mockListCertifications,
    getExpiringCertifications: mockGetExpiringCertifications,
    getCertificationById: mockGetCertificationById,
    updateCertification: mockUpdateCertification,
    deleteCertification: mockDeleteCertification,
  },
}));

jest.mock('../../middleware/auth.js', () => ({
  authenticate: function (req: any, _res: any, next: any) {
    req.user = { userId: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

import certificationRoutes from '../../routes/certifications.js';
import { errorHandler } from '../../middleware/error.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/certifications', certificationRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Certification Routes', () => {
  const validCertification = {
    type: 'electrical',
    name: 'Electrical Practitioner Licence',
    certNumber: 'EP-12345',
    issuingBody: 'Energy Safety NZ',
    issueDate: '2024-01-15',
    expiryDate: '2026-01-14',
  };

  // ============================================================
  // POST /api/v1/certifications
  // ============================================================

  describe('POST /api/v1/certifications', () => {
    it('should create a certification successfully', async () => {
      const mockCert = { id: 'cert-1', ...validCertification, userId: 'test-user-id' };
      mockCreateCertification.mockResolvedValue(mockCert);

      const response = await request(app)
        .post('/api/v1/certifications')
        .send(validCertification);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: { certification: mockCert },
        message: 'Certification created successfully',
      });
      expect(mockCreateCertification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ type: 'electrical', name: 'Electrical Practitioner Licence' })
      );
    });

    it('should create a certification with only required fields', async () => {
      const minimal = { type: 'gas', name: 'Gas Fitter Cert' };
      const mockCert = { id: 'cert-2', ...minimal, userId: 'test-user-id' };
      mockCreateCertification.mockResolvedValue(mockCert);

      const response = await request(app)
        .post('/api/v1/certifications')
        .send(minimal);

      expect(response.status).toBe(201);
      expect(response.body.data.certification.id).toBe('cert-2');
    });

    it('should reject missing type', async () => {
      const { type: _omit, ...noType } = validCertification;

      const response = await request(app)
        .post('/api/v1/certifications')
        .send(noType);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: 'VALIDATION_ERROR',
      });
    });

    it('should reject invalid type', async () => {
      const response = await request(app)
        .post('/api/v1/certifications')
        .send({ ...validCertification, type: 'welding' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject missing name', async () => {
      const { name: _omit, ...noName } = validCertification;

      const response = await request(app)
        .post('/api/v1/certifications')
        .send(noName);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      // Zod reports "Required" for missing fields; min(1) message fires for empty string
      expect(response.body.message).toBeTruthy();
    });

    it('should reject empty name', async () => {
      const response = await request(app)
        .post('/api/v1/certifications')
        .send({ ...validCertification, name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should include validation details in error response', async () => {
      const response = await request(app)
        .post('/api/v1/certifications')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it.each(['electrical', 'gas', 'plumbing', 'lpg', 'first_aid', 'site_safe', 'other'] as const)(
      'should accept %s as a valid certification type',
      async (type) => {
        const mockCert = { id: 'cert-x', type, name: 'Test Cert' };
        mockCreateCertification.mockResolvedValue(mockCert);

        const response = await request(app)
          .post('/api/v1/certifications')
          .send({ type, name: 'Test Cert' });

        expect(response.status).toBe(201);
      }
    );
  });

  // ============================================================
  // GET /api/v1/certifications
  // ============================================================

  describe('GET /api/v1/certifications', () => {
    it('should list certifications', async () => {
      const mockResult = { certifications: [], total: 0 };
      mockListCertifications.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/certifications');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, data: mockResult });
    });

    it('should pass limit and offset to service', async () => {
      mockListCertifications.mockResolvedValue({ certifications: [], total: 0 });

      await request(app).get('/api/v1/certifications?limit=5&offset=10');

      expect(mockListCertifications).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ limit: 5, offset: 10 })
      );
    });

    it('should pass undefined when no pagination params', async () => {
      mockListCertifications.mockResolvedValue({ certifications: [], total: 0 });

      await request(app).get('/api/v1/certifications');

      expect(mockListCertifications).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ limit: undefined, offset: undefined })
      );
    });

    it('should return certifications list with total count', async () => {
      const mockCerts = [
        { id: 'cert-1', type: 'electrical', name: 'Electrical Licence' },
        { id: 'cert-2', type: 'gas', name: 'Gas Fitter Cert' },
      ];
      mockListCertifications.mockResolvedValue({ certifications: mockCerts, total: 2 });

      const response = await request(app).get('/api/v1/certifications');

      expect(response.status).toBe(200);
      expect(response.body.data.certifications).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });
  });

  // ============================================================
  // GET /api/v1/certifications/expiring
  // ============================================================

  describe('GET /api/v1/certifications/expiring', () => {
    it('should return expiring certifications with default 30 day window', async () => {
      const mockExpiring = [{ id: 'cert-1', expiryDate: '2026-05-01', name: 'Expiring Cert' }];
      mockGetExpiringCertifications.mockResolvedValue(mockExpiring);

      const response = await request(app).get('/api/v1/certifications/expiring');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: { certifications: mockExpiring },
      });
      expect(mockGetExpiringCertifications).toHaveBeenCalledWith('test-user-id', 30);
    });

    it('should accept custom days query parameter', async () => {
      mockGetExpiringCertifications.mockResolvedValue([]);

      await request(app).get('/api/v1/certifications/expiring?days=60');

      expect(mockGetExpiringCertifications).toHaveBeenCalledWith('test-user-id', 60);
    });

    it('should return empty array when no certifications are expiring', async () => {
      mockGetExpiringCertifications.mockResolvedValue([]);

      const response = await request(app).get('/api/v1/certifications/expiring');

      expect(response.status).toBe(200);
      expect(response.body.data.certifications).toEqual([]);
    });

    it('should resolve before /:id route (route ordering)', async () => {
      mockGetExpiringCertifications.mockResolvedValue([]);

      const response = await request(app).get('/api/v1/certifications/expiring');

      expect(response.status).toBe(200);
      expect(mockGetExpiringCertifications).toHaveBeenCalled();
      expect(mockGetCertificationById).not.toHaveBeenCalled();
    });

    it('should return certifications sorted by nearest expiry date', async () => {
      // Service handles sorting — route just returns what service provides
      const mockExpiring = [
        { id: 'cert-1', expiryDate: '2026-04-20', name: 'Expires Soon' },
        { id: 'cert-2', expiryDate: '2026-05-01', name: 'Expires Later' },
      ];
      mockGetExpiringCertifications.mockResolvedValue(mockExpiring);

      const response = await request(app).get('/api/v1/certifications/expiring?days=90');

      expect(response.status).toBe(200);
      expect(response.body.data.certifications).toHaveLength(2);
      expect(response.body.data.certifications[0].id).toBe('cert-1');
    });
  });

  // ============================================================
  // GET /api/v1/certifications/:id
  // ============================================================

  describe('GET /api/v1/certifications/:id', () => {
    it('should return a certification by id', async () => {
      const mockCert = { id: 'cert-1', type: 'plumbing', name: 'Plumbing Licence' };
      mockGetCertificationById.mockResolvedValue(mockCert);

      const response = await request(app).get('/api/v1/certifications/cert-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: { certification: mockCert },
      });
      expect(mockGetCertificationById).toHaveBeenCalledWith('cert-1', 'test-user-id');
    });

    it('should return 404 when certification not found', async () => {
      mockGetCertificationById.mockResolvedValue(null);

      const response = await request(app).get('/api/v1/certifications/cert-999');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'NOT_FOUND',
        message: 'Certification not found',
      });
    });

    it('should not return another user\'s certification (service enforces ownership)', async () => {
      // Route passes userId to service — service returns null for non-owned records
      mockGetCertificationById.mockResolvedValue(null);

      const response = await request(app).get('/api/v1/certifications/other-user-cert');

      expect(response.status).toBe(404);
      expect(mockGetCertificationById).toHaveBeenCalledWith('other-user-cert', 'test-user-id');
    });
  });

  // ============================================================
  // PUT /api/v1/certifications/:id
  // ============================================================

  describe('PUT /api/v1/certifications/:id', () => {
    it('should update a certification successfully', async () => {
      const updated = { id: 'cert-1', type: 'electrical', name: 'Updated Electrical Licence' };
      mockUpdateCertification.mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/v1/certifications/cert-1')
        .send({ name: 'Updated Electrical Licence' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: { certification: updated },
        message: 'Certification updated successfully',
      });
      expect(mockUpdateCertification).toHaveBeenCalledWith(
        'cert-1',
        'test-user-id',
        expect.objectContaining({ name: 'Updated Electrical Licence' })
      );
    });

    it('should return 404 when certification not found', async () => {
      mockUpdateCertification.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/certifications/cert-999')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'NOT_FOUND',
        message: 'Certification not found',
      });
    });

    it('should reject empty name on update', async () => {
      const response = await request(app)
        .put('/api/v1/certifications/cert-1')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid type on update', async () => {
      const response = await request(app)
        .put('/api/v1/certifications/cert-1')
        .send({ type: 'invalid_type' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should allow setting certNumber to null (removing cert number)', async () => {
      const updated = { id: 'cert-1', certNumber: null };
      mockUpdateCertification.mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/v1/certifications/cert-1')
        .send({ certNumber: null });

      expect(response.status).toBe(200);
    });

    it('should allow setting expiryDate to null (no expiry)', async () => {
      const updated = { id: 'cert-1', expiryDate: null };
      mockUpdateCertification.mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/v1/certifications/cert-1')
        .send({ expiryDate: null });

      expect(response.status).toBe(200);
    });

    it('should allow setting issuingBody to null', async () => {
      const updated = { id: 'cert-1', issuingBody: null };
      mockUpdateCertification.mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/v1/certifications/cert-1')
        .send({ issuingBody: null });

      expect(response.status).toBe(200);
    });

    it('should accept partial update with only type', async () => {
      const updated = { id: 'cert-1', type: 'site_safe' };
      mockUpdateCertification.mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/v1/certifications/cert-1')
        .send({ type: 'site_safe' });

      expect(response.status).toBe(200);
      expect(response.body.data.certification.type).toBe('site_safe');
    });

    it('should update expiry date (renewal flow)', async () => {
      const updated = { id: 'cert-1', expiryDate: '2028-01-14' };
      mockUpdateCertification.mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/v1/certifications/cert-1')
        .send({ expiryDate: '2028-01-14' });

      expect(response.status).toBe(200);
      expect(response.body.data.certification.expiryDate).toBe('2028-01-14');
    });
  });

  // ============================================================
  // DELETE /api/v1/certifications/:id
  // ============================================================

  describe('DELETE /api/v1/certifications/:id', () => {
    it('should delete a certification', async () => {
      mockDeleteCertification.mockResolvedValue(true);

      const response = await request(app).delete('/api/v1/certifications/cert-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Certification deleted successfully',
      });
      expect(mockDeleteCertification).toHaveBeenCalledWith('cert-1', 'test-user-id');
    });

    it('should return 404 when certification not found', async () => {
      mockDeleteCertification.mockResolvedValue(false);

      const response = await request(app).delete('/api/v1/certifications/cert-999');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'NOT_FOUND',
        message: 'Certification not found',
      });
    });
  });
});
