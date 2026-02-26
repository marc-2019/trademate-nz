/**
 * Enhanced Sync Queue Service
 * Optimized for reliable data sync in field conditions
 *
 * Features:
 * - Exponential backoff retry with jitter
 * - Batch processing for efficiency
 * - Priority-based sync ordering
 * - Conflict resolution strategies
 * - Network resilience with connection quality detection
 * - Sync metrics and monitoring
 */

import * as Network from 'expo-network';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'bossboard.db';

export enum SyncPriority {
  CRITICAL = 0,  // Time-sensitive: clock-ins, safety docs
  HIGH = 1,      // Important: invoices, quotes
  MEDIUM = 2,    // Standard: general updates
  LOW = 3,       // Background: analytics, metadata
}

export enum ConflictStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  MERGE = 'merge',
  MANUAL = 'manual',
}

export interface SyncQueueItem {
  id: number;
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  payload: string | null;
  priority: SyncPriority;
  created_at: string;
  attempts: number;
  last_attempt_at: string | null;
  error_message: string | null;
  conflict_strategy: ConflictStrategy;
}

export interface SyncMetrics {
  total_queued: number;
  total_synced: number;
  total_failed: number;
  avg_sync_time_ms: number;
  last_sync_at: string | null;
  network_quality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface NetworkQuality {
  isReachable: boolean;
  latency: number; // ms
  quality: 'excellent' | 'good' | 'poor' | 'offline';
}

// Configuration
const SYNC_CONFIG = {
  MAX_RETRY_ATTEMPTS: 5,
  BATCH_SIZE: 10,
  BASE_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 60000,
  NETWORK_TIMEOUT_MS: 5000,
  CRITICAL_RETRY_INTERVAL_MS: 30000, // 30s for critical items
  STANDARD_RETRY_INTERVAL_MS: 300000, // 5min for standard items
};

let db: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeSyncTables();
  }
  return db;
}

async function initializeSyncTables(): Promise<void> {
  const database = db!;

  await database.execAsync(`
    -- Enhanced sync queue with priority and conflict resolution
    CREATE TABLE IF NOT EXISTS sync_queue_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
      payload TEXT,
      priority INTEGER DEFAULT 2,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      error_message TEXT,
      conflict_strategy TEXT DEFAULT 'server_wins',
      version INTEGER DEFAULT 1,
      checksum TEXT
    );

    -- Sync metrics table
    CREATE TABLE IF NOT EXISTS sync_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_batch_id TEXT NOT NULL,
      items_synced INTEGER DEFAULT 0,
      items_failed INTEGER DEFAULT 0,
      sync_duration_ms INTEGER DEFAULT 0,
      network_quality TEXT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    -- Conflict resolution log
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      server_version TEXT,
      client_version TEXT,
      resolution_strategy TEXT,
      resolved_at TEXT DEFAULT CURRENT_TIMESTAMP,
      merged_data TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sync_queue_priority
      ON sync_queue_v2(priority, created_at);

    CREATE INDEX IF NOT EXISTS idx_sync_queue_entity
      ON sync_queue_v2(entity_type, entity_id);

    CREATE INDEX IF NOT EXISTS idx_sync_queue_attempts
      ON sync_queue_v2(attempts, last_attempt_at);
  `);
}

/**
 * Detect network quality by measuring latency
 */
export async function detectNetworkQuality(): Promise<NetworkQuality> {
  try {
    const startTime = Date.now();
    const networkState = await Network.getNetworkStateAsync();

    if (!networkState.isConnected || networkState.isInternetReachable === false) {
      return { isReachable: false, latency: -1, quality: 'offline' };
    }

    // Measure latency with a simple HEAD request
    try {
      const testUrl = 'https://www.google.com/favicon.ico';
      const response = await Promise.race([
        fetch(testUrl, { method: 'HEAD' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), SYNC_CONFIG.NETWORK_TIMEOUT_MS)
        ),
      ]) as Response;

      const latency = Date.now() - startTime;

      let quality: NetworkQuality['quality'];
      if (latency < 200) quality = 'excellent';
      else if (latency < 500) quality = 'good';
      else quality = 'poor';

      return { isReachable: response.ok, latency, quality };
    } catch {
      return { isReachable: true, latency: -1, quality: 'poor' };
    }
  } catch {
    return { isReachable: false, latency: -1, quality: 'offline' };
  }
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempts: number): number {
  const exponentialDelay = SYNC_CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, attempts);
  const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
  return Math.min(exponentialDelay + jitter, SYNC_CONFIG.MAX_RETRY_DELAY_MS);
}

/**
 * Add item to sync queue with priority
 */
export async function addToSyncQueue(
  entityType: string,
  entityId: string,
  action: 'create' | 'update' | 'delete',
  payload: unknown,
  priority: SyncPriority = SyncPriority.MEDIUM,
  conflictStrategy: ConflictStrategy = ConflictStrategy.SERVER_WINS
): Promise<number> {
  const database = await getDatabase();

  const payloadStr = payload ? JSON.stringify(payload) : null;
  const checksum = payloadStr ? generateChecksum(payloadStr) : null;

  const result = await database.runAsync(
    `INSERT INTO sync_queue_v2
     (entity_type, entity_id, action, payload, priority, conflict_strategy, checksum)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entityType, entityId, action, payloadStr, priority, conflictStrategy, checksum]
  );

  return result.lastInsertRowId;
}

/**
 * Get pending sync items by priority
 */
export async function getPendingSyncItems(
  limit: number = SYNC_CONFIG.BATCH_SIZE
): Promise<SyncQueueItem[]> {
  const database = await getDatabase();

  const now = Date.now();
  const items = await database.getAllAsync<SyncQueueItem>(`
    SELECT * FROM sync_queue_v2
    WHERE attempts < ?
      AND (
        last_attempt_at IS NULL
        OR (
          priority = ${SyncPriority.CRITICAL}
          AND julianday('now') - julianday(last_attempt_at) > julianday('now', '-${SYNC_CONFIG.CRITICAL_RETRY_INTERVAL_MS / 1000} seconds')
        )
        OR (
          priority != ${SyncPriority.CRITICAL}
          AND julianday('now') - julianday(last_attempt_at) > julianday('now', '-${SYNC_CONFIG.STANDARD_RETRY_INTERVAL_MS / 1000} seconds')
        )
      )
    ORDER BY priority ASC, created_at ASC
    LIMIT ?
  `, [SYNC_CONFIG.MAX_RETRY_ATTEMPTS, limit]);

  return items;
}

/**
 * Mark sync item as processed successfully
 */
export async function markSyncItemProcessed(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sync_queue_v2 WHERE id = ?', [id]);
}

/**
 * Record sync failure with error message
 */
export async function recordSyncFailure(
  id: number,
  errorMessage: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_queue_v2
     SET attempts = attempts + 1,
         last_attempt_at = CURRENT_TIMESTAMP,
         error_message = ?
     WHERE id = ?`,
    [errorMessage, id]
  );
}

/**
 * Resolve conflict between server and client data
 */
export async function resolveConflict(
  item: SyncQueueItem,
  serverData: unknown,
  clientData: unknown
): Promise<{ resolved: unknown; strategy: ConflictStrategy }> {
  const database = await getDatabase();

  let resolvedData: unknown;
  let strategy = item.conflict_strategy;

  switch (strategy) {
    case ConflictStrategy.SERVER_WINS:
      resolvedData = serverData;
      break;

    case ConflictStrategy.CLIENT_WINS:
      resolvedData = clientData;
      break;

    case ConflictStrategy.MERGE:
      // Simple merge: client overwrites server for non-null values
      resolvedData = {
        ...(typeof serverData === 'object' && serverData !== null ? serverData : {}),
        ...(typeof clientData === 'object' && clientData !== null ? clientData : {}),
      };
      break;

    case ConflictStrategy.MANUAL:
      // Store conflict for manual resolution
      await database.runAsync(
        `INSERT INTO sync_conflicts
         (entity_type, entity_id, server_version, client_version, resolution_strategy)
         VALUES (?, ?, ?, ?, ?)`,
        [
          item.entity_type,
          item.entity_id,
          JSON.stringify(serverData),
          JSON.stringify(clientData),
          'pending',
        ]
      );
      resolvedData = serverData; // Default to server until manual resolution
      break;

    default:
      resolvedData = serverData;
  }

  return { resolved: resolvedData, strategy };
}

/**
 * Get sync metrics
 */
export async function getSyncMetrics(): Promise<SyncMetrics> {
  const database = await getDatabase();

  const totalQueued = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue_v2'
  );

  const recentMetrics = await database.getFirstAsync<{
    total_synced: number;
    total_failed: number;
    avg_duration: number;
    last_sync: string;
  }>(`
    SELECT
      SUM(items_synced) as total_synced,
      SUM(items_failed) as total_failed,
      AVG(sync_duration_ms) as avg_duration,
      MAX(completed_at) as last_sync
    FROM sync_metrics
    WHERE started_at > datetime('now', '-7 days')
  `);

  const networkQuality = await detectNetworkQuality();

  return {
    total_queued: totalQueued?.count || 0,
    total_synced: recentMetrics?.total_synced || 0,
    total_failed: recentMetrics?.total_failed || 0,
    avg_sync_time_ms: recentMetrics?.avg_duration || 0,
    last_sync_at: recentMetrics?.last_sync || null,
    network_quality: networkQuality.quality,
  };
}

/**
 * Record sync batch metrics
 */
export async function recordSyncMetrics(
  batchId: string,
  itemsSynced: number,
  itemsFailed: number,
  durationMs: number,
  networkQuality: string
): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO sync_metrics
     (sync_batch_id, items_synced, items_failed, sync_duration_ms, network_quality, completed_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [batchId, itemsSynced, itemsFailed, durationMs, networkQuality]
  );
}

/**
 * Clean up old sync metrics (keep last 30 days)
 */
export async function cleanupOldMetrics(): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `DELETE FROM sync_metrics
     WHERE started_at < datetime('now', '-30 days')`
  );

  await database.runAsync(
    `DELETE FROM sync_conflicts
     WHERE resolved_at < datetime('now', '-30 days')`
  );
}

/**
 * Simple checksum for data integrity
 */
function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Get failed sync items that exceeded max retries
 */
export async function getFailedSyncItems(): Promise<SyncQueueItem[]> {
  const database = await getDatabase();

  return database.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue_v2
     WHERE attempts >= ?
     ORDER BY created_at DESC`,
    [SYNC_CONFIG.MAX_RETRY_ATTEMPTS]
  );
}

/**
 * Retry failed item (reset attempts)
 */
export async function retryFailedItem(id: number): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `UPDATE sync_queue_v2
     SET attempts = 0,
         last_attempt_at = NULL,
         error_message = NULL
     WHERE id = ?`,
    [id]
  );
}

/**
 * Delete permanently failed items
 */
export async function deletePermanentlyFailedItems(): Promise<number> {
  const database = await getDatabase();

  const result = await database.runAsync(
    `DELETE FROM sync_queue_v2
     WHERE attempts >= ?
       AND created_at < datetime('now', '-7 days')`,
    [SYNC_CONFIG.MAX_RETRY_ATTEMPTS]
  );

  return result.changes;
}

/**
 * Export sync metrics for monitoring/debugging
 */
export async function exportSyncMetrics(): Promise<{
  queue_status: {
    total_queued: number;
    by_priority: Record<string, number>;
    by_entity_type: Record<string, number>;
  };
  recent_performance: {
    last_24h: {
      total_synced: number;
      total_failed: number;
      avg_duration_ms: number;
      success_rate: number;
    };
    last_7d: {
      total_synced: number;
      total_failed: number;
      avg_duration_ms: number;
      success_rate: number;
    };
  };
  failed_items: {
    total: number;
    by_error: Record<string, number>;
  };
  network_quality_distribution: Record<string, number>;
}> {
  const database = await getDatabase();

  // Queue status
  const queueByPriority = await database.getAllAsync<{ priority: number; count: number }>(
    'SELECT priority, COUNT(*) as count FROM sync_queue_v2 GROUP BY priority'
  );

  const queueByType = await database.getAllAsync<{ entity_type: string; count: number }>(
    'SELECT entity_type, COUNT(*) as count FROM sync_queue_v2 GROUP BY entity_type'
  );

  const totalQueued = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue_v2'
  );

  // Recent performance (24h)
  const metrics24h = await database.getFirstAsync<{
    total_synced: number;
    total_failed: number;
    avg_duration: number;
  }>(`
    SELECT
      SUM(items_synced) as total_synced,
      SUM(items_failed) as total_failed,
      AVG(sync_duration_ms) as avg_duration
    FROM sync_metrics
    WHERE started_at > datetime('now', '-1 day')
  `);

  // Recent performance (7d)
  const metrics7d = await database.getFirstAsync<{
    total_synced: number;
    total_failed: number;
    avg_duration: number;
  }>(`
    SELECT
      SUM(items_synced) as total_synced,
      SUM(items_failed) as total_failed,
      AVG(sync_duration_ms) as avg_duration
    FROM sync_metrics
    WHERE started_at > datetime('now', '-7 days')
  `);

  // Failed items
  const totalFailed = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue_v2 WHERE attempts >= ?',
    [SYNC_CONFIG.MAX_RETRY_ATTEMPTS]
  );

  const failedByError = await database.getAllAsync<{ error_message: string; count: number }>(
    `SELECT error_message, COUNT(*) as count
     FROM sync_queue_v2
     WHERE attempts >= ? AND error_message IS NOT NULL
     GROUP BY error_message`,
    [SYNC_CONFIG.MAX_RETRY_ATTEMPTS]
  );

  // Network quality distribution
  const networkQualityDist = await database.getAllAsync<{ network_quality: string; count: number }>(
    `SELECT network_quality, COUNT(*) as count
     FROM sync_metrics
     WHERE started_at > datetime('now', '-7 days')
     GROUP BY network_quality`
  );

  // Build response
  const byPriority: Record<string, number> = {};
  queueByPriority.forEach(row => {
    const priorityName = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][row.priority] || 'UNKNOWN';
    byPriority[priorityName] = row.count;
  });

  const byEntityType: Record<string, number> = {};
  queueByType.forEach(row => {
    byEntityType[row.entity_type] = row.count;
  });

  const byError: Record<string, number> = {};
  failedByError.forEach(row => {
    byError[row.error_message || 'Unknown'] = row.count;
  });

  const networkQualityMap: Record<string, number> = {};
  networkQualityDist.forEach(row => {
    networkQualityMap[row.network_quality || 'unknown'] = row.count;
  });

  const total24hSynced = metrics24h?.total_synced || 0;
  const total24hFailed = metrics24h?.total_failed || 0;
  const successRate24h = total24hSynced + total24hFailed > 0
    ? (total24hSynced / (total24hSynced + total24hFailed)) * 100
    : 0;

  const total7dSynced = metrics7d?.total_synced || 0;
  const total7dFailed = metrics7d?.total_failed || 0;
  const successRate7d = total7dSynced + total7dFailed > 0
    ? (total7dSynced / (total7dSynced + total7dFailed)) * 100
    : 0;

  return {
    queue_status: {
      total_queued: totalQueued?.count || 0,
      by_priority: byPriority,
      by_entity_type: byEntityType,
    },
    recent_performance: {
      last_24h: {
        total_synced: total24hSynced,
        total_failed: total24hFailed,
        avg_duration_ms: metrics24h?.avg_duration || 0,
        success_rate: successRate24h,
      },
      last_7d: {
        total_synced: total7dSynced,
        total_failed: total7dFailed,
        avg_duration_ms: metrics7d?.avg_duration || 0,
        success_rate: successRate7d,
      },
    },
    failed_items: {
      total: totalFailed?.count || 0,
      by_error: byError,
    },
    network_quality_distribution: networkQualityMap,
  };
}

export default {
  addToSyncQueue,
  getPendingSyncItems,
  markSyncItemProcessed,
  recordSyncFailure,
  resolveConflict,
  getSyncMetrics,
  recordSyncMetrics,
  cleanupOldMetrics,
  detectNetworkQuality,
  getFailedSyncItems,
  retryFailedItem,
  deletePermanentlyFailedItems,
  exportSyncMetrics,
};
