/**
 * Job Log Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock services
const mockCreateJobLog = jest.fn();
const mockGetActiveJobLog = jest.fn();
const mockGetJobLogStats = jest.fn();
const mockListJobLogs = jest.fn();
const mockGetJobLog = jest.fn();
const mockUpdateJobLog = jest.fn();
const mockClockOut = jest.fn();
const mockDeleteJobLog = jest.fn();

jest.mock('../../services/job-logs.js', () => ({
  __esModule: true,
  default: {
    createJobLog: mockCreateJobLog,
    getActiveJobLog: mockGetActiveJobLog,
    getJobLogStats: mockGetJobLogStats,
    listJobLogs: mockListJobLogs,
    getJobLog: mockGetJobLog,
    updateJobLog: mockUpdateJobLog,
    clockOut: mockClockOut,
    deleteJobLog: mockDeleteJobLog,
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

import jobLogRoutes from '../../routes/job-logs.js';
import { errorHandler } from '../../middleware/error.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/job-logs', jobLogRoutes);
  app.use(errorHandler);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Job Log Routes', () => {
  describe('POST /api/v1/job-logs', () => {
    it('should create a job log (clock in)', async () => {
      const mockJobLog = { id: 'jl-1', description: 'Kitchen renovation', status: 'active' };
      mockCreateJobLog.mockResolvedValue(mockJobLog);

      const response = await request(app)
        .post('/api/v1/job-logs')
        .send({ description: 'Kitchen renovation', siteAddress: '123 Main St' });

      expect(response.status).toBe(201);
      expect(response.body.data.jobLog.id).toBe('jl-1');
    });

    it('should reject missing description', async () => {
      const response = await request(app)
        .post('/api/v1/job-logs')
        .send({ siteAddress: '123 Main St' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should handle already clocked-in error', async () => {
      const error = { statusCode: 409, code: 'ALREADY_CLOCKED_IN', message: 'Already clocked in' };
      mockCreateJobLog.mockRejectedValue(error);

      const response = await request(app)
        .post('/api/v1/job-logs')
        .send({ description: 'New job' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('ALREADY_CLOCKED_IN');
    });
  });

  describe('GET /api/v1/job-logs/active', () => {
    it('should return active job log', async () => {
      mockGetActiveJobLog.mockResolvedValue({ id: 'jl-1', status: 'active' });

      const response = await request(app).get('/api/v1/job-logs/active');

      expect(response.status).toBe(200);
      expect(response.body.data.jobLog.status).toBe('active');
    });

    it('should return null when no active job', async () => {
      mockGetActiveJobLog.mockResolvedValue(null);

      const response = await request(app).get('/api/v1/job-logs/active');

      expect(response.status).toBe(200);
      expect(response.body.data.jobLog).toBeNull();
    });
  });

  describe('GET /api/v1/job-logs/stats', () => {
    it('should return job log stats', async () => {
      const stats = { totalHours: 120, jobsCompleted: 15 };
      mockGetJobLogStats.mockResolvedValue(stats);

      const response = await request(app).get('/api/v1/job-logs/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toEqual(stats);
    });
  });

  describe('GET /api/v1/job-logs', () => {
    it('should list job logs', async () => {
      mockListJobLogs.mockResolvedValue({ jobLogs: [], total: 0 });

      const response = await request(app).get('/api/v1/job-logs');

      expect(response.status).toBe(200);
      expect(response.body.data.jobLogs).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should pass filters to service', async () => {
      mockListJobLogs.mockResolvedValue({ jobLogs: [], total: 0 });

      await request(app).get('/api/v1/job-logs?status=completed&limit=10');

      expect(mockListJobLogs).toHaveBeenCalledWith('test-user-id', expect.objectContaining({
        status: 'completed',
        limit: 10,
      }));
    });
  });

  describe('GET /api/v1/job-logs/:id', () => {
    it('should return a job log by id', async () => {
      mockGetJobLog.mockResolvedValue({ id: 'jl-1', description: 'Job' });

      const response = await request(app).get('/api/v1/job-logs/jl-1');

      expect(response.status).toBe(200);
      expect(response.body.data.jobLog.id).toBe('jl-1');
    });

    it('should handle not found error from service', async () => {
      const error = { statusCode: 404, code: 'NOT_FOUND', message: 'Job log not found' };
      mockGetJobLog.mockRejectedValue(error);

      const response = await request(app).get('/api/v1/job-logs/missing');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/job-logs/:id', () => {
    it('should update a job log', async () => {
      mockUpdateJobLog.mockResolvedValue({ id: 'jl-1', description: 'Updated' });

      const response = await request(app)
        .put('/api/v1/job-logs/jl-1')
        .send({ description: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.jobLog.description).toBe('Updated');
    });

    it('should reject description over 500 chars', async () => {
      const response = await request(app)
        .put('/api/v1/job-logs/jl-1')
        .send({ description: 'a'.repeat(501) });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/job-logs/:id/clock-out', () => {
    it('should clock out of a job', async () => {
      mockClockOut.mockResolvedValue({ id: 'jl-1', status: 'completed' });

      const response = await request(app)
        .post('/api/v1/job-logs/jl-1/clock-out')
        .send({ notes: 'Job done' });

      expect(response.status).toBe(200);
      expect(response.body.data.jobLog.status).toBe('completed');
    });

    it('should clock out without notes', async () => {
      mockClockOut.mockResolvedValue({ id: 'jl-1', status: 'completed' });

      const response = await request(app)
        .post('/api/v1/job-logs/jl-1/clock-out')
        .send({});

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/job-logs/:id', () => {
    it('should delete a job log', async () => {
      mockDeleteJobLog.mockResolvedValue(undefined);

      const response = await request(app).delete('/api/v1/job-logs/jl-1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Job log deleted');
    });
  });
});
