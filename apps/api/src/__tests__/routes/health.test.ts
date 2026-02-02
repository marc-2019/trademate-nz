/**
 * Health Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock database service before importing routes
const mockCheckConnection = jest.fn();
jest.mock('../../services/database.js', () => ({
  __esModule: true,
  default: {
    checkConnection: mockCheckConnection,
    query: jest.fn(),
  },
}));

// Import routes after mocking
import healthRoutes from '../../routes/health.js';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/health', healthRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return healthy status when database is connected', async () => {
      mockCheckConnection.mockResolvedValue(true);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'trademate-api',
        version: '0.1.0',
        dependencies: {
          database: 'connected',
          redis: 'pending',
        },
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return degraded status when database is disconnected', async () => {
      mockCheckConnection.mockResolvedValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'degraded',
        dependencies: {
          database: 'disconnected',
        },
      });
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready when database is connected', async () => {
      mockCheckConnection.mockResolvedValue(true);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ready: true,
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return not ready when database is disconnected', async () => {
      mockCheckConnection.mockResolvedValue(false);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        ready: false,
        message: 'Database not connected',
      });
    });
  });

  describe('GET /health/live', () => {
    it('should always return alive', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        alive: true,
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
