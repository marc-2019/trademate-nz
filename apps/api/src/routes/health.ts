/**
 * Health Check Routes
 * /health
 */

import { Router, Request, Response } from 'express';
import db from '../services/database.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (_req: Request, res: Response) => {
  const dbConnected = await db.checkConnection();

  const status = dbConnected ? 'healthy' : 'degraded';
  const statusCode = dbConnected ? 200 : 503;

  res.status(statusCode).json({
    status,
    service: 'trademate-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    dependencies: {
      database: dbConnected ? 'connected' : 'disconnected',
      redis: 'pending', // TODO: Add Redis health check
    },
  });
});

/**
 * GET /health/ready
 * Readiness probe (all dependencies ready)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const dbConnected = await db.checkConnection();

  if (!dbConnected) {
    res.status(503).json({
      ready: false,
      message: 'Database not connected',
    });
    return;
  }

  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/live
 * Liveness probe (process is alive)
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
