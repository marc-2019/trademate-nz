/**
 * Database Service
 * PostgreSQL connection and query helpers
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/index.js';

// Create connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

/**
 * Execute a query
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (config.isDevelopment) {
      console.log('Query executed', { text: text.substring(0, 50), duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Database query error:', { text: text.substring(0, 50), error });
    throw error;
  }
}

/**
 * Get a client for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check database connectivity
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Close the pool (for graceful shutdown)
 */
export async function close(): Promise<void> {
  await pool.end();
}

export default {
  query,
  getClient,
  transaction,
  checkConnection,
  close,
};
