/**
 * Redis Service
 * Redis connection and health check helpers
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config/index.js';

// Create Redis client
const client: RedisClientType = createClient({
  url: config.redisUrl,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error('Redis: max reconnection attempts reached');
        return new Error('Redis max reconnection attempts reached');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

// Log connection events
client.on('error', (err) => {
  console.error('Redis client error:', err.message);
});

client.on('connect', () => {
  console.log('Redis: connecting...');
});

client.on('ready', () => {
  console.log('Redis: connected and ready');
});

client.on('reconnecting', () => {
  console.log('Redis: reconnecting...');
});

/**
 * Connect to Redis
 * Safe to call multiple times - will not reconnect if already connected.
 */
export async function connect(): Promise<void> {
  if (!client.isOpen) {
    await client.connect();
  }
}

/**
 * Check Redis connectivity via PING
 */
export async function checkConnection(): Promise<boolean> {
  try {
    if (!client.isOpen) {
      return false;
    }
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Close the Redis connection (for graceful shutdown)
 */
export async function close(): Promise<void> {
  if (client.isOpen) {
    await client.quit();
  }
}

/**
 * Get the underlying Redis client for direct use by other services
 */
export function getClient(): RedisClientType {
  return client;
}

export default {
  connect,
  checkConnection,
  close,
  getClient,
};
