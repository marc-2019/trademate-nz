/**
 * Application Configuration
 * Centralized configuration management
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '29000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://trademate:trademate_dev_2026@localhost:29432/trademate',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:29379',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'trademate_jwt_dev_secret_2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'trademate_jwt_refresh_dev_2026',
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
} as const;

export default config;
