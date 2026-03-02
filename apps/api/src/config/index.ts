/**
 * Application Configuration
 * Centralized configuration management
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // App Branding (configurable - no hardcoded product name)
  appName: process.env.APP_NAME || 'BossBoard',
  appDomain: process.env.APP_DOMAIN || '',

  // Server
  port: parseInt(process.env.PORT || '29000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://bossboard:bossboard_dev_2026@localhost:29432/bossboard',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:29379',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'bossboard_jwt_dev_secret_2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'bossboard_jwt_refresh_dev_2026',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },

  // AI
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:19006',
    'http://localhost:8081',
    'http://localhost:3000',
  ],

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIdTradie: process.env.STRIPE_PRICE_ID_TRADIE || '',
    priceIdTeam: process.env.STRIPE_PRICE_ID_TEAM || '',
    // Billing portal return URL (must be the mobile app or a web success page)
    returnUrl: process.env.STRIPE_RETURN_URL || 'http://localhost:19006',
  },

  // Email (SMTP)
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'BossBoard',
    fromEmail: process.env.SMTP_FROM_EMAIL || '',
  },
} as const;

// Fail fast: require JWT secrets in production
if (!config.isDevelopment) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
  }
}

export default config;
