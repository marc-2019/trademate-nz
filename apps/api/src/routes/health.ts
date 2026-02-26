/**
 * Health Check Routes
 * /health
 */

import { Router, Request, Response } from 'express';
import db from '../services/database.js';
import redis from '../services/redis.js';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (_req: Request, res: Response) => {
  const [dbConnected, redisConnected] = await Promise.all([
    db.checkConnection(),
    redis.checkConnection(),
  ]);

  const allHealthy = dbConnected && redisConnected;
  const status = allHealthy ? 'healthy' : 'degraded';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    service: 'bossboard-api',
    version: '0.5.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    dependencies: {
      database: dbConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected',
    },
  });
});

/**
 * GET /health/ready
 * Readiness probe (all dependencies ready)
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const [dbConnected, redisConnected] = await Promise.all([
    db.checkConnection(),
    redis.checkConnection(),
  ]);

  if (!dbConnected || !redisConnected) {
    const reasons: string[] = [];
    if (!dbConnected) reasons.push('Database not connected');
    if (!redisConnected) reasons.push('Redis not connected');

    res.status(503).json({
      ready: false,
      message: reasons.join('; '),
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
