# Offline-First SQLite Sync Queue Optimization

## Overview

TradeMate's offline-first sync queue has been optimized for reliable data synchronization in field conditions where network connectivity is unreliable or intermittent.

## Key Improvements

### 1. Priority-Based Sync Queue

Items are now processed by priority to ensure critical data syncs first:

| Priority | Use Cases | Sync Interval |
|----------|-----------|---------------|
| **CRITICAL** | SWMS documents, clock-ins, safety incidents | Every 30 seconds |
| **HIGH** | Invoices, quotes, job updates | Standard (5 min) |
| **MEDIUM** | General updates, notes | Standard (5 min) |
| **LOW** | Analytics, metadata | Standard (5 min) |

### 2. Exponential Backoff with Jitter

Retry logic now uses exponential backoff to prevent network congestion:

- **Base delay**: 1 second
- **Max delay**: 60 seconds
- **Max attempts**: 5
- **Jitter**: Random 0-1s added to prevent thundering herd

Formula: `delay = min(1000 * 2^attempts + random(0-1000), 60000)`

### 3. Network Quality Detection

System now detects network quality and adapts sync behavior:

| Quality | Latency | Behavior |
|---------|---------|----------|
| **Excellent** | < 200ms | Sync all items |
| **Good** | 200-500ms | Sync all items |
| **Poor** | > 500ms | Critical items only |
| **Offline** | N/A | Queue for later |

### 4. Conflict Resolution Strategies

Four strategies for handling conflicts between server and client data:

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| **SERVER_WINS** | Server data overwrites client | Default for most entities |
| **CLIENT_WINS** | Client data overwrites server | User-critical edits |
| **MERGE** | Merge non-null values | Compatible schema changes |
| **MANUAL** | Store for manual resolution | Complex conflicts |

### 5. Comprehensive Metrics

Track sync performance with detailed metrics:

- Total items queued/synced/failed
- Average sync time
- Network quality trends
- Last successful sync timestamp

## Architecture

```
┌─────────────────────────────────────────┐
│  React Native App (Foreground)          │
│  - User actions trigger sync queue      │
│  - Real-time critical item sync         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Sync Scheduler (syncScheduler.ts)      │
│  - Batch processing (10 items/batch)    │
│  - Network-aware sync triggers          │
│  - Background sync (15min intervals)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Enhanced Sync Queue (syncQueue.ts)     │
│  - Priority queue management            │
│  - Exponential backoff retry            │
│  - Conflict resolution                  │
│  - Metrics tracking                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  SQLite Database (trademate.db)         │
│  - sync_queue_v2 (enhanced queue)       │
│  - sync_metrics (performance tracking)  │
│  - sync_conflicts (resolution log)      │
└─────────────────────────────────────────┘
```

## Usage

### Basic Usage

```typescript
import { addToSyncQueue, SyncPriority, ConflictStrategy } from '@/services/syncQueue';
import { performSync, syncCriticalItems } from '@/services/syncScheduler';

// Add item to sync queue
await addToSyncQueue(
  'invoices',           // entity type
  'inv-123',           // entity ID
  'update',            // action (create/update/delete)
  { amount: 100 },     // payload
  SyncPriority.HIGH,   // priority
  ConflictStrategy.SERVER_WINS // conflict strategy
);

// Trigger immediate sync (foreground)
const result = await performSync({ batchSize: 10 });
console.log(`Synced ${result.itemsSynced} items`);

// Sync only critical items
await syncCriticalItems();
```

### Background Sync

```typescript
import { registerBackgroundSync, getBackgroundSyncStatus } from '@/services/syncScheduler';

// Register background sync (call once at app startup)
await registerBackgroundSync();

// Check status
const status = await getBackgroundSyncStatus();
console.log('Background sync registered:', status.isRegistered);
```

### Monitoring

```typescript
import { getSyncMetrics, getFailedSyncItems } from '@/services/syncQueue';

// Get sync metrics
const metrics = await getSyncMetrics();
console.log('Queue size:', metrics.total_queued);
console.log('Success rate:', metrics.total_synced / (metrics.total_synced + metrics.total_failed));

// Get failed items for manual review
const failedItems = await getFailedSyncItems();
for (const item of failedItems) {
  console.log(`Failed: ${item.entity_type}/${item.entity_id} - ${item.error_message}`);
}
```

### Manual Retry

```typescript
import { retryFailedItem, deletePermanentlyFailedItems } from '@/services/syncQueue';

// Retry a specific failed item
await retryFailedItem(itemId);

// Clean up old failed items (>7 days)
const deletedCount = await deletePermanentlyFailedItems();
console.log(`Cleaned up ${deletedCount} old failed items`);
```

## Migration from Old Offline Service

### Before (offline.ts)

```typescript
import offline from '@/services/offline';

// Old way - basic queue
await offline.updateSWMSLocally(id, updates);
// Internally calls: addToSyncQueue('swms', id, 'update', updates)
```

### After (using new services)

```typescript
import { updateSWMSLocally } from '@/services/offline';
// OR use syncQueue directly for more control:
import { addToSyncQueue, SyncPriority } from '@/services/syncQueue';

// SWMS is critical - use CRITICAL priority
await addToSyncQueue('swms', id, 'update', updates, SyncPriority.CRITICAL);

// Non-critical update - use default MEDIUM
await addToSyncQueue('invoices', id, 'update', updates);
```

## Database Schema

### sync_queue_v2

```sql
CREATE TABLE sync_queue_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
  payload TEXT,
  priority INTEGER DEFAULT 2,           -- 0=CRITICAL, 1=HIGH, 2=MEDIUM, 3=LOW
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  error_message TEXT,
  conflict_strategy TEXT DEFAULT 'server_wins',
  version INTEGER DEFAULT 1,
  checksum TEXT
);
```

### sync_metrics

```sql
CREATE TABLE sync_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_batch_id TEXT NOT NULL,
  items_synced INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  sync_duration_ms INTEGER DEFAULT 0,
  network_quality TEXT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
```

### sync_conflicts

```sql
CREATE TABLE sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  server_version TEXT,
  client_version TEXT,
  resolution_strategy TEXT,
  resolved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  merged_data TEXT
);
```

## Performance Optimizations

### Indexes

```sql
-- Priority-based queue ordering
CREATE INDEX idx_sync_queue_priority
  ON sync_queue_v2(priority, created_at);

-- Entity lookup
CREATE INDEX idx_sync_queue_entity
  ON sync_queue_v2(entity_type, entity_id);

-- Retry filtering
CREATE INDEX idx_sync_queue_attempts
  ON sync_queue_v2(attempts, last_attempt_at);
```

### Batch Processing

- **Default batch size**: 10 items
- **Critical batch size**: 5 items (faster turnaround)
- **Full sync batch size**: 20 items (efficient for manual sync)

### Network-Aware Sync

| Network Quality | Action |
|-----------------|--------|
| Excellent (< 200ms) | Sync all priorities, large batches |
| Good (200-500ms) | Sync all priorities, standard batches |
| Poor (> 500ms) | Critical only, small batches |
| Offline | Queue all, no sync attempts |

## Field Testing Recommendations

### Test Scenarios

1. **Complete offline mode**
   - Turn on airplane mode
   - Perform multiple operations
   - Verify all queued
   - Turn off airplane mode
   - Verify sync completes

2. **Flaky connection**
   - Simulate intermittent connectivity
   - Verify exponential backoff works
   - Check metrics for retry counts

3. **Poor network quality**
   - Throttle network to 2G speeds
   - Verify critical items sync first
   - Check non-critical items wait for better connection

4. **Conflict scenarios**
   - Edit same invoice offline and online
   - Verify conflict resolution strategy works
   - Check conflict log

### Monitoring Metrics

Track these metrics in production:

- **Sync success rate**: target > 95%
- **Average sync latency**: target < 2s for critical items
- **Queue size**: alert if > 100 items
- **Failed items**: alert if > 10 items exceed max retries
- **Network quality distribution**: understand user connectivity patterns

## Troubleshooting

### High failure rate

```typescript
// Check failed items
const failed = await getFailedSyncItems();

// Review error patterns
const errorCounts = failed.reduce((acc, item) => {
  const error = item.error_message || 'Unknown';
  acc[error] = (acc[error] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Error distribution:', errorCounts);
```

### Queue growing too large

```typescript
// Check metrics
const metrics = await getSyncMetrics();
if (metrics.total_queued > 100) {
  // Trigger manual full sync
  await syncAllItems();
}
```

### Background sync not running

```typescript
// Check registration status
const status = await getBackgroundSyncStatus();
if (!status.isRegistered) {
  await registerBackgroundSync();
}

// Check iOS background fetch status
if (status.status === BackgroundFetch.BackgroundFetchStatus.Denied) {
  // User has disabled background app refresh
  // Show alert to enable in Settings
}
```

## Future Enhancements

1. **Differential sync** - Only sync changed fields, not entire payloads
2. **Compression** - Compress large payloads before sync
3. **P2P sync** - Sync between devices on same network
4. **Smart prefetch** - Preload data user is likely to need offline
5. **Adaptive batch sizing** - Adjust batch size based on network quality

## References

- [Expo Background Fetch](https://docs.expo.dev/versions/latest/sdk/background-fetch/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Network](https://docs.expo.dev/versions/latest/sdk/network/)
- [React Native Best Practices - Offline First](https://reactnative.dev/docs/network)
