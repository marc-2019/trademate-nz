/**
 * TradeMate NZ API Server
 *
 * Express server providing REST API for the TradeMate mobile app.
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

// Route imports
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import swmsRoutes from './routes/swms.js';
import invoicesRoutes from './routes/invoices.js';
import certificationsRoutes from './routes/certifications.js';
import statsRoutes from './routes/stats.js';

const app = express();

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
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

// API v1 routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/swms', apiLimiter, swmsRoutes);
app.use('/api/v1/invoices', apiLimiter, invoicesRoutes);
app.use('/api/v1/certifications', apiLimiter, certificationsRoutes);
app.use('/api/v1/stats', apiLimiter, statsRoutes);

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
  // Close database connections, etc.
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// =============================================================================
// START SERVER
// =============================================================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     TradeMate NZ API                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:      Running                                          ║
║  Port:        ${String(PORT).padEnd(47)}║
║  Environment: ${config.nodeEnv.padEnd(47)}║
║                                                                ║
║  Endpoints:                                                    ║
║    Health:    http://localhost:${PORT}/health                      ║
║    Auth:      http://localhost:${PORT}/api/v1/auth                 ║
║    SWMS:      http://localhost:${PORT}/api/v1/swms                 ║
║    Invoices:  http://localhost:${PORT}/api/v1/invoices             ║
║    Certs:     http://localhost:${PORT}/api/v1/certifications       ║
║    Stats:     http://localhost:${PORT}/api/v1/stats                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
