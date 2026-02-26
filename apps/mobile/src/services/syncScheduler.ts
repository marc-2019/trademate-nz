/**
 * Background Sync Scheduler
 * Intelligent background sync with network-aware strategies
 *
 * Features:
 * - Automatic sync based on network quality
 * - Batched sync operations for efficiency
 * - Smart retry with exponential backoff
 * - Battery-friendly background execution
 * - Foreground priority for critical items
 */

// @ts-ignore
import * as BackgroundFetch from 'expo-background-fetch';
// @ts-ignore
import * as TaskManager from 'expo-task-manager';
import { api } from './api';
import syncQueue, {
  SyncQueueItem,
  SyncPriority,
  detectNetworkQuality,
  getPendingSyncItems,
  markSyncItemProcessed,
  recordSyncFailure,
  recordSyncMetrics,
  cleanupOldMetrics,
} from './syncQueue';

const BACKGROUND_SYNC_TASK = 'background-sync-task';

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: Array<{ itemId: number; error: string }>;
  durationMs: number;
  networkQuality: string;
}

/**
 * Process a single sync item (fallback for individual operations)
 */
async function processSyncItem(item: SyncQueueItem): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = item.payload ? JSON.parse(item.payload) : null;

    switch (item.action) {
      case 'create':
        await api.post(`/api/v1/${item.entity_type}`, payload);
        break;

      case 'update':
        await api.put(`/api/v1/${item.entity_type}/${item.entity_id}`, payload);
        break;

      case 'delete':
        await api.delete(`/api/v1/${item.entity_type}/${item.entity_id}`);
        break;

      default:
        throw new Error(`Unknown action: ${item.action}`);
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Process items using batch API (more efficient)
 */
async function processSyncItemsBatch(items: SyncQueueItem[]): Promise<Map<number, { success: boolean; error?: string }>> {
  const results = new Map<number, { success: boolean; error?: string }>();

  if (items.length === 0) {
    return results;
  }

  try {
    // Prepare batch operations
    const operations = items.map(item => ({
      id: item.id,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      action: item.action,
      payload: item.payload ? JSON.parse(item.payload) : null,
      version: 1,
      checksum: (item as any).checksum || null,
    }));

    // Send batch request
    const response = await api.post<{
      results: Array<{ id: number; success: boolean; entity_id?: string; error?: string }>;
      server_timestamp: string;
      processed: number;
      succeeded: number;
      failed: number;
    }>('/api/v1/sync/batch', {
      operations,
      client_timestamp: new Date().toISOString(),
    });

    // Map results back to sync queue items
    for (const result of response.data.results) {
      results.set(result.id, {
        success: result.success,
        error: result.error,
      });
    }

    console.log(`[Batch Sync] Processed ${response.data.processed} items: ${response.data.succeeded} succeeded, ${response.data.failed} failed`);
  } catch (error) {
    // If batch request fails, mark all items as failed
    const errorMessage = error instanceof Error ? error.message : 'Batch sync failed';
    console.error('[Batch Sync] Error:', errorMessage);

    for (const item of items) {
      results.set(item.id, { success: false, error: errorMessage });
    }
  }

  return results;
}

/**
 * Process a batch of sync items
 */
async function processSyncBatch(items: SyncQueueItem[]): Promise<SyncResult> {
  const startTime = Date.now();
  const batchId = `batch-${Date.now()}`;

  let itemsSynced = 0;
  let itemsFailed = 0;
  const errors: Array<{ itemId: number; error: string }> = [];

  const networkQuality = await detectNetworkQuality();

  // Use batch API if we have multiple items and good network
  const useBatchApi = items.length > 1 && networkQuality.quality !== 'poor';

  if (useBatchApi) {
    try {
      // Process all items in a single batch request
      const batchResults = await processSyncItemsBatch(items);

      // Process results
      for (const item of items) {
        const result = batchResults.get(item.id);

        if (result?.success) {
          await markSyncItemProcessed(item.id);
          itemsSynced++;
        } else {
          await recordSyncFailure(item.id, result?.error || 'Unknown error');
          itemsFailed++;
          errors.push({ itemId: item.id, error: result?.error || 'Unknown error' });
        }
      }
    } catch (error) {
      // If batch API fails, fall back to individual processing
      console.warn('[Sync] Batch API failed, falling back to individual processing');
      return processSyncBatchIndividual(items, batchId, networkQuality);
    }
  } else {
    // Process items individually
    return processSyncBatchIndividual(items, batchId, networkQuality);
  }

  const durationMs = Date.now() - startTime;

  // Record metrics
  await recordSyncMetrics(
    batchId,
    itemsSynced,
    itemsFailed,
    durationMs,
    networkQuality.quality
  );

  return {
    success: itemsFailed === 0,
    itemsSynced,
    itemsFailed,
    errors,
    durationMs,
    networkQuality: networkQuality.quality,
  };
}

/**
 * Process items individually (fallback method)
 */
async function processSyncBatchIndividual(
  items: SyncQueueItem[],
  batchId: string,
  networkQuality: { quality: string }
): Promise<SyncResult> {
  const startTime = Date.now();
  let itemsSynced = 0;
  let itemsFailed = 0;
  const errors: Array<{ itemId: number; error: string }> = [];

  for (const item of items) {
    const result = await processSyncItem(item);

    if (result.success) {
      await markSyncItemProcessed(item.id);
      itemsSynced++;
    } else {
      await recordSyncFailure(item.id, result.error || 'Unknown error');
      itemsFailed++;
      errors.push({ itemId: item.id, error: result.error || 'Unknown error' });
    }

    // Add small delay between items to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const durationMs = Date.now() - startTime;

  // Record metrics
  await recordSyncMetrics(
    batchId,
    itemsSynced,
    itemsFailed,
    durationMs,
    networkQuality.quality
  );

  return {
    success: itemsFailed === 0,
    itemsSynced,
    itemsFailed,
    errors,
    durationMs,
    networkQuality: networkQuality.quality,
  };
}

/**
 * Main sync function - called by foreground and background tasks
 */
export async function performSync(
  options: {
    priorityFilter?: SyncPriority;
    batchSize?: number;
    requireGoodNetwork?: boolean;
  } = {}
): Promise<SyncResult> {
  const {
    priorityFilter,
    batchSize = 10,
    requireGoodNetwork = false,
  } = options;

  // Check network quality
  const networkQuality = await detectNetworkQuality();

  if (!networkQuality.isReachable) {
    return {
      success: false,
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [{ itemId: -1, error: 'No network connection' }],
      durationMs: 0,
      networkQuality: networkQuality.quality,
    };
  }

  // Skip if network quality is poor and we require good network
  if (requireGoodNetwork && networkQuality.quality === 'poor') {
    return {
      success: false,
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [{ itemId: -1, error: 'Network quality too poor' }],
      durationMs: 0,
      networkQuality: networkQuality.quality,
    };
  }

  // Get pending items
  let pendingItems = await getPendingSyncItems(batchSize);

  // Filter by priority if specified
  if (priorityFilter !== undefined) {
    pendingItems = pendingItems.filter((item) => item.priority === priorityFilter);
  }

  if (pendingItems.length === 0) {
    return {
      success: true,
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
      durationMs: 0,
      networkQuality: networkQuality.quality,
    };
  }

  // Process the batch
  return processSyncBatch(pendingItems);
}

/**
 * Sync critical items only (for foreground use)
 */
export async function syncCriticalItems(): Promise<SyncResult> {
  return performSync({ priorityFilter: SyncPriority.CRITICAL, batchSize: 5 });
}

/**
 * Full sync with all items (for manual trigger)
 */
export async function syncAllItems(): Promise<SyncResult> {
  const allResults: SyncResult[] = [];
  let hasMore = true;

  while (hasMore) {
    const result = await performSync({ batchSize: 20 });
    allResults.push(result);

    // Stop if no items were synced (queue is empty)
    hasMore = result.itemsSynced > 0;

    // Add delay between batches
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Aggregate results
  const aggregated: SyncResult = {
    success: allResults.every((r) => r.success),
    itemsSynced: allResults.reduce((sum, r) => sum + r.itemsSynced, 0),
    itemsFailed: allResults.reduce((sum, r) => sum + r.itemsFailed, 0),
    errors: allResults.flatMap((r) => r.errors),
    durationMs: allResults.reduce((sum, r) => sum + r.durationMs, 0),
    networkQuality: allResults[allResults.length - 1]?.networkQuality || 'offline',
  };

  return aggregated;
}

/**
 * Define background sync task
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[Background Sync] Starting background sync task');

    // Perform sync with good network requirement for background
    const result = await performSync({
      batchSize: 10,
      requireGoodNetwork: true,
    });

    console.log('[Background Sync] Completed:', result);

    // Cleanup old metrics
    await cleanupOldMetrics();

    return result.success
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.Failed;
  } catch (error) {
    console.error('[Background Sync] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background sync task
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (minimum allowed by iOS)
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('[Background Sync] Registered background sync task');
    } else {
      console.log('[Background Sync] Task already registered');
    }
  } catch (error) {
    console.error('[Background Sync] Failed to register:', error);
  }
}

/**
 * Unregister background sync task
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('[Background Sync] Unregistered background sync task');
  } catch (error) {
    console.error('[Background Sync] Failed to unregister:', error);
  }
}

/**
 * Check background sync status
 */
export async function getBackgroundSyncStatus(): Promise<{
  isRegistered: boolean;
  status: BackgroundFetch.BackgroundFetchStatus;
}> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  const status = await BackgroundFetch.getStatusAsync();

  return { isRegistered, status };
}

export default {
  performSync,
  syncCriticalItems,
  syncAllItems,
  registerBackgroundSync,
  unregisterBackgroundSync,
  getBackgroundSyncStatus,
};
