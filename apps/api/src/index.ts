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
// ROOT LANDING PAGE
// =============================================================================

app.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'unsafe-inline'; font-src https://fonts.gstatic.com; link-src https://fonts.googleapis.com;");
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Boss Board — NZ Trade Compliance Platform</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(30,64,175,0.08);
      padding: 3rem 2.5rem;
      max-width: 520px;
      width: 100%;
      text-align: center;
    }
    .logo {
      font-size: 2.5rem;
      font-weight: 800;
      color: #7C3AED;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }
    .tagline {
      font-size: 1.1rem;
      color: #475569;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .badge {
      display: inline-block;
      background: #F5F3FF;
      color: #7C3AED;
      font-weight: 700;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 9999px;
      padding: 0.35rem 1.1rem;
      margin-bottom: 2rem;
      border: 1.5px solid #DDD6FE;
    }
    .links {
      margin: 1.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .btn {
      display: inline-block;
      background: #7C3AED;
      color: #fff;
      text-decoration: none;
      border-radius: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      font-size: 1rem;
      transition: background 0.15s;
    }
    .btn:hover { background: #6D28D9; }
    .btn-outline {
      background: transparent;
      color: #7C3AED;
      border: 1.5px solid #7C3AED;
    }
    .btn-outline:hover { background: #F5F3FF; }
    .contact {
      margin-top: 1.75rem;
      font-size: 0.9rem;
      color: #64748b;
    }
    .contact a { color: #7C3AED; text-decoration: none; }
    .contact a:hover { text-decoration: underline; }
    footer {
      margin-top: 2.5rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Boss Board</div>
    <p class="tagline">NZ's trade compliance platform for Kiwi tradies</p>
    <div class="badge">Coming Soon</div>
    <div class="links">
      <a class="btn" href="https://ournewnormal.co.nz" target="_blank" rel="noopener">View our ONN Listing</a>
      <a class="btn btn-outline" href="mailto:info@instilligent.com">Get Early Access</a>
    </div>
    <div class="contact">
      Questions? <a href="mailto:info@instilligent.com">info@instilligent.com</a>
    </div>
  </div>
  <footer>&copy; ${new Date().getFullYear()} Instilligent Limited. All rights reserved.</footer>
</body>
</html>`);
});

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
