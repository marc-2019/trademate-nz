/**
 * Health Route Tests
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock database service before importing routes
const mockDbCheckConnection = jest.fn();
jest.mock('../../services/database.js', () => ({
  __esModule: true,
  default: {
    checkConnection: mockDbCheckConnection,
    query: jest.fn(),
  },
}));

// Mock redis service before importing routes
const mockRedisCheckConnection = jest.fn();
jest.mock('../../services/redis.js', () => ({
  __esModule: true,
  default: {
    checkConnection: mockRedisCheckConnection,
    connect: jest.fn(),
    close: jest.fn(),
    getClient: jest.fn(),
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
    it('should return healthy status when both database and redis are connected', async () => {
      mockDbCheckConnection.mockResolvedValue(true);
      mockRedisCheckConnection.mockResolvedValue(true);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'bossboard-api',
        version: '0.5.0',
        dependencies: {
          database: 'connected',
          redis: 'connected',
        },
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return degraded status when database is disconnected', async () => {
      mockDbCheckConnection.mockResolvedValue(false);
      mockRedisCheckConnection.mockResolvedValue(true);

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'degraded',
        dependencies: {
          database: 'disconnected',
          redis: 'connected',
        },
      });
    });

    it('should return degraded status when redis is disconnected', async () => {
      mockDbCheckConnection.mockResolvedValue(true);
      mockRedisCheckConnection.mockResolvedValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'degraded',
        dependencies: {
          database: 'connected',
          redis: 'disconnected',
        },
      });
    });

    it('should return degraded status when both database and redis are disconnected', async () => {
      mockDbCheckConnection.mockResolvedValue(false);
      mockRedisCheckConnection.mockResolvedValue(false);

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'degraded',
        dependencies: {
          database: 'disconnected',
          redis: 'disconnected',
        },
      });
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready when both database and redis are connected', async () => {
      mockDbCheckConnection.mockResolvedValue(true);
      mockRedisCheckConnection.mockResolvedValue(true);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ready: true,
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return not ready when database is disconnected', async () => {
      mockDbCheckConnection.mockResolvedValue(false);
      mockRedisCheckConnection.mockResolvedValue(true);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        ready: false,
        message: 'Database not connected',
      });
    });

    it('should return not ready when redis is disconnected', async () => {
      mockDbCheckConnection.mockResolvedValue(true);
      mockRedisCheckConnection.mockResolvedValue(false);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        ready: false,
        message: 'Redis not connected',
      });
    });

    it('should return not ready with both reasons when both are disconnected', async () => {
      mockDbCheckConnection.mockResolvedValue(false);
      mockRedisCheckConnection.mockResolvedValue(false);

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        ready: false,
        message: 'Database not connected; Redis not connected',
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
