/**
 * BossBoard API Server
 *
 * Express server providing REST API for the BossBoard mobile app.
 *
 * Port: 29000
 *
 * Endpoints:
 * - /health - Health checks
 * - /api/v1/auth - Authentication
 * - /api/v1/swms - SWMS document management
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import db from './services/database.js';
import redis from './services/redis.js';
import { runMigrations } from './services/migrate.js';

// Route imports
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import swmsRoutes from './routes/swms.js';
import invoicesRoutes from './routes/invoices.js';
import certificationsRoutes from './routes/certifications.js';
import statsRoutes from './routes/stats.js';
import businessProfileRoutes from './routes/business-profile.js';
import customersRoutes from './routes/customers.js';
import productsRoutes from './routes/products.js';
import recurringInvoicesRoutes from './routes/recurring-invoices.js';
import bankTransactionsRoutes from './routes/bank-transactions.js';
import photosRoutes from './routes/photos.js';
import quotesRoutes from './routes/quotes.js';
import expensesRoutes from './routes/expenses.js';
import jobLogsRoutes from './routes/job-logs.js';
import notificationsRoutes from './routes/notifications.js';
import teamsRoutes from './routes/teams.js';
import publicRoutes from './routes/public.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import stripeWebhookRoutes from './routes/stripe-webhook.js';
import syncRoutes from './routes/sync.js';
import legalRoutes from './routes/legal.js';
import cronService from './services/cron.js';

const app = express();

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ---------------------------------------------------------------------------
// Stripe webhook MUST be registered before express.json() so that the raw
// Buffer body is available for HMAC signature verification.
// ---------------------------------------------------------------------------
app.use(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookRoutes
);

// Body parsing (all other routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per windowMs
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// ROUTES
// =============================================================================

// Health check routes (no rate limit, no prefix)
app.use('/health', healthRoutes);

// Legal pages (no auth, no rate limit - required for App Store / Play Store)
app.use('/legal', legalRoutes);

// API v1 routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/swms', apiLimiter, swmsRoutes);
app.use('/api/v1/invoices', apiLimiter, invoicesRoutes);
app.use('/api/v1/certifications', apiLimiter, certificationsRoutes);
app.use('/api/v1/stats', apiLimiter, statsRoutes);
app.use('/api/v1/business-profile', apiLimiter, businessProfileRoutes);
app.use('/api/v1/customers', apiLimiter, customersRoutes);
app.use('/api/v1/products', apiLimiter, productsRoutes);
app.use('/api/v1/recurring-invoices', apiLimiter, recurringInvoicesRoutes);
app.use('/api/v1/bank-transactions', apiLimiter, bankTransactionsRoutes);
app.use('/api/v1/photos', apiLimiter, photosRoutes);
app.use('/api/v1/quotes', apiLimiter, quotesRoutes);
app.use('/api/v1/expenses', apiLimiter, expensesRoutes);
app.use('/api/v1/job-logs', apiLimiter, jobLogsRoutes);
app.use('/api/v1/notifications', apiLimiter, notificationsRoutes);
app.use('/api/v1/teams', apiLimiter, teamsRoutes);
app.use('/api/v1/subscriptions', apiLimiter, subscriptionsRoutes);
app.use('/api/v1/sync', apiLimiter, syncRoutes);

// Public routes (no auth required)
app.use('/api/v1/public', apiLimiter, publicRoutes);

// Compliance alias (points to swms for backwards compatibility)
app.use('/api/v1/compliance', apiLimiter, swmsRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  cronService.stop();
  await Promise.all([db.close(), redis.close()]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  cronService.stop();
  await Promise.all([db.close(), redis.close()]);
  process.exit(0);
});

// =============================================================================
// START SERVER
// =============================================================================

const PORT = config.port;

// Async startup: run migrations, connect Redis, then start server
async function startServer() {
  // Run database migrations first
  try {
    await runMigrations();
  } catch (err) {
    console.error('Database migration failed:', err);
    console.error('Server will start but database may be incomplete.');
  }

  // Connect Redis (non-blocking)
  redis.connect().catch((err) => {
    console.error('Failed to connect to Redis on startup:', err.message);
  });

  app.listen(PORT, () => {
    // Start cron jobs
    cronService.start();
    console.log('[server] BossBoard API running on port ' + PORT + ' (' + config.nodeEnv + ')');
  });
}

startServer();

export default app;
