# Offline Sync Optimization - Integration Guide

## Overview

This guide helps developers integrate the optimized offline sync system into TradeMate features.

## What's New

### 1. Enhanced API Client with Retry Logic

The API client now includes:
- **Automatic retries** with exponential backoff (3 retries by default)
- **Request timeouts** (30s default, configurable)
- **Request deduplication** for GET requests
- **Better error handling** with typed errors (NetworkError, TimeoutError, ApiError)
- **Smart retry logic** that skips client errors (4xx) but retries server errors (5xx)

### 2. Batch Sync API

New `/api/v1/sync/batch` endpoint processes multiple operations in a single request:
- Reduces HTTP overhead by up to 90%
- Improves performance on poor connections
- Supports up to 50 operations per batch
- Automatic fallback to individual requests if batch fails

### 3. Optimized Sync Scheduler

The sync scheduler now:
- Uses batch API when processing multiple items
- Falls back to individual processing on poor network
- Provides better error reporting
- Includes comprehensive metrics export

## Integration Steps

### Step 1: Update Feature Code

When creating/updating/deleting entities, use the sync queue:

```typescript
import { addToSyncQueue, SyncPriority, ConflictStrategy } from '@/services/syncQueue';
import { performSync } from '@/services/syncScheduler';

async function createInvoice(data: InvoiceData) {
  try {
    // 1. Generate local ID
    const localId = `invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 2. Save to local SQLite first (optimistic UI)
    await saveInvoiceLocally({ ...data, id: localId });

    // 3. Add to sync queue with appropriate priority
    await addToSyncQueue(
      'invoices',              // entity type
      localId,                 // entity ID
      'create',                // action
      data,                    // payload
      SyncPriority.HIGH,       // priority (invoices are important)
      ConflictStrategy.MERGE   // conflict strategy
    );

    // 4. Trigger immediate sync if online
    const networkQuality = await detectNetworkQuality();
    if (networkQuality.quality !== 'offline') {
      await performSync({ batchSize: 10 });
    }

    // 5. Update UI optimistically
    return { success: true, id: localId };

  } catch (error) {
    console.error('Failed to create invoice:', error);
    // UI shows optimistic update; will sync later
    throw error;
  }
}
```

### Step 2: Choose Appropriate Priority

| Priority | Use Cases | Sync Behavior |
|----------|-----------|---------------|
| **CRITICAL** | Safety docs, clock-ins, incidents | Sync every 30s, even on poor network |
| **HIGH** | Invoices, quotes, client updates | Standard sync (every 5min) |
| **MEDIUM** | General updates, notes | Standard sync (every 5min) |
| **LOW** | Analytics, metadata | Standard sync (every 5min) |

**Example:**

```typescript
// Critical - safety-related
await addToSyncQueue('swms', id, 'create', data, SyncPriority.CRITICAL);

// High - financial/client-facing
await addToSyncQueue('invoices', id, 'update', data, SyncPriority.HIGH);

// Medium - general content
await addToSyncQueue('notes', id, 'update', data, SyncPriority.MEDIUM);

// Low - analytics
await addToSyncQueue('analytics', id, 'create', data, SyncPriority.LOW);
```

### Step 3: Choose Conflict Resolution Strategy

| Strategy | When to Use | Behavior |
|----------|-------------|----------|
| **SERVER_WINS** | Default, read-heavy entities | Server data overwrites client |
| **CLIENT_WINS** | User-critical edits | Client data overwrites server |
| **MERGE** | Both have valid updates | Merge non-null values |
| **MANUAL** | Complex business logic | Store conflict for manual resolution |

**Example:**

```typescript
// SERVER_WINS - certifications (read-heavy)
await addToSyncQueue('certifications', id, 'update', data,
  SyncPriority.MEDIUM, ConflictStrategy.SERVER_WINS);

// CLIENT_WINS - user notes (user is always right)
await addToSyncQueue('notes', id, 'update', { content: userNote },
  SyncPriority.MEDIUM, ConflictStrategy.CLIENT_WINS);

// MERGE - invoices (combine changes)
await addToSyncQueue('invoices', id, 'update', updates,
  SyncPriority.HIGH, ConflictStrategy.MERGE);

// MANUAL - complex financial reconciliation
await addToSyncQueue('reconciliation', id, 'update', data,
  SyncPriority.HIGH, ConflictStrategy.MANUAL);
```

### Step 4: Register Background Sync

Add to AuthContext or app initialization:

```typescript
// apps/mobile/src/contexts/AuthContext.tsx

import { registerBackgroundSync, unregisterBackgroundSync } from '@/services/syncScheduler';

async function login(email: string, password: string) {
  const response = await authApi.login({ email, password });

  // ... existing login logic ...

  // Register background sync for this user
  await registerBackgroundSync();
}

async function logout() {
  // Unregister background sync
  await unregisterBackgroundSync();

  // ... existing logout logic ...
}
```

### Step 5: Add Sync Status UI

Show sync status to users:

```typescript
// components/SyncStatusBadge.tsx

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getSyncMetrics } from '@/services/syncQueue';

export function SyncStatusBadge() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Update every 5 seconds
    const interval = setInterval(async () => {
      const data = await getSyncMetrics();
      setMetrics(data);
      setIsSyncing(data.total_queued > 0);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}>
      {isSyncing && <ActivityIndicator size="small" />}
      <Text style={{ marginLeft: 4 }}>
        {metrics.total_queued === 0
          ? '✓ All synced'
          : `Syncing ${metrics.total_queued} items...`}
      </Text>
      {metrics.network_quality === 'offline' && (
        <Text style={{ color: 'orange', marginLeft: 8 }}>Offline</Text>
      )}
    </View>
  );
}
```

## API Client Configuration

The enhanced API client supports per-request configuration:

```typescript
import { api } from '@/services/api';

// Custom timeout for slow operations
await api.post('/api/v1/photos', data, {
  timeout: 60000, // 60s for photo upload
});

// Custom retry configuration
await api.get('/api/v1/invoices', {
  retries: 5,           // More retries for critical data
  retryDelay: 2000,     // 2s base delay
  skipRetryOn: [404],   // Don't retry 404s
});

// No retries for real-time operations
await api.get('/api/v1/stats/dashboard', {
  retries: 0,
  timeout: 10000,
});
```

## Error Handling

Handle typed errors appropriately:

```typescript
import { NetworkError, TimeoutError, ApiError } from '@/services/api';

try {
  await api.post('/api/v1/invoices', data);
} catch (error) {
  if (error instanceof NetworkError) {
    // No internet - queued for later
    showToast('Saved offline. Will sync when online.');
  } else if (error instanceof TimeoutError) {
    // Request timed out - may be in queue
    showToast('Request timed out. Check sync status.');
  } else if (error instanceof ApiError) {
    if (error.status === 401) {
      // Unauthorized - redirect to login
      logout();
    } else if (error.status >= 500) {
      // Server error - will retry automatically
      showToast('Server error. Will retry automatically.');
    } else {
      // Client error - show to user
      showToast(error.message);
    }
  }
}
```

## Monitoring Sync Performance

Export metrics for monitoring:

```typescript
import { exportSyncMetrics } from '@/services/syncQueue';

async function checkSyncHealth() {
  const metrics = await exportSyncMetrics();

  console.log('Queue Status:', metrics.queue_status);
  console.log('24h Performance:', metrics.recent_performance.last_24h);
  console.log('Success Rate:', metrics.recent_performance.last_24h.success_rate + '%');

  // Alert if success rate is low
  if (metrics.recent_performance.last_24h.success_rate < 90) {
    console.warn('Low sync success rate!');
  }

  // Alert if queue is building up
  if (metrics.queue_status.total_queued > 100) {
    console.warn('Large sync queue!');
  }
}
```

## Testing Offline Scenarios

### Test 1: Create Item Offline

```typescript
// 1. Enable airplane mode
// 2. Create an invoice
const invoice = await createInvoice(testData);

// 3. Verify item is in local SQLite
const localInvoice = await getInvoiceLocally(invoice.id);
expect(localInvoice).toBeDefined();

// 4. Verify item is in sync queue
const queueItems = await getPendingSyncItems();
expect(queueItems.some(item => item.entity_id === invoice.id)).toBe(true);

// 5. Disable airplane mode
// 6. Wait for sync
await performSync();

// 7. Verify item synced to server
const serverInvoice = await api.get(`/api/v1/invoices/${invoice.id}`);
expect(serverInvoice.data).toBeDefined();
```

### Test 2: Update Item with Poor Connection

```typescript
// 1. Simulate poor network (use Network Link Conditioner or similar)
// 2. Update an invoice
await updateInvoice(invoiceId, { amount: 150 });

// 3. Verify retry logic kicks in
const metrics = await getSyncMetrics();
expect(metrics.total_queued).toBeGreaterThan(0);

// 4. Wait for retries
await new Promise(resolve => setTimeout(resolve, 10000));

// 5. Verify eventual sync
const finalMetrics = await getSyncMetrics();
expect(finalMetrics.total_queued).toBe(0);
```

### Test 3: Conflict Resolution

```typescript
// 1. Create item on server
const serverItem = await api.post('/api/v1/invoices', serverData);

// 2. Go offline and modify locally
const localUpdates = { amount: 200 };
await updateInvoiceLocally(serverItem.data.id, localUpdates);

// 3. Modify on server (while offline)
await api.put(`/api/v1/invoices/${serverItem.data.id}`, { status: 'paid' });

// 4. Go online and sync
await performSync();

// 5. Verify merge strategy worked (both changes applied)
const finalItem = await api.get(`/api/v1/invoices/${serverItem.data.id}`);
expect(finalItem.data.amount).toBe(200); // Local change
expect(finalItem.data.status).toBe('paid'); // Server change
```

## Performance Best Practices

### 1. Batch Similar Operations

```typescript
// ❌ Bad - multiple individual syncs
for (const expense of expenses) {
  await addToSyncQueue('expenses', expense.id, 'create', expense);
  await performSync(); // Don't do this!
}

// ✓ Good - queue all, then sync once
for (const expense of expenses) {
  await addToSyncQueue('expenses', expense.id, 'create', expense);
}
await performSync({ batchSize: 20 }); // Single batch sync
```

### 2. Use Appropriate Priorities

```typescript
// ❌ Bad - everything is CRITICAL
await addToSyncQueue('note', id, 'create', data, SyncPriority.CRITICAL);

// ✓ Good - prioritize appropriately
await addToSyncQueue('note', id, 'create', data, SyncPriority.MEDIUM);
```

### 3. Handle Network Quality

```typescript
// ❌ Bad - force sync regardless of network
await performSync();

// ✓ Good - check network first
const networkQuality = await detectNetworkQuality();
if (networkQuality.quality !== 'offline') {
  if (networkQuality.quality === 'poor') {
    // Only critical items on poor network
    await syncCriticalItems();
  } else {
    // Full sync on good network
    await performSync({ batchSize: 20 });
  }
}
```

### 4. Clean Up Old Data

```typescript
// Run periodically (e.g., on app startup)
await cleanupOldMetrics(); // Removes metrics older than 30 days
await deletePermanentlyFailedItems(); // Removes failed items older than 7 days
```

## Troubleshooting

### Issue: High sync failure rate

**Symptoms:**
- `metrics.recent_performance.last_24h.success_rate < 80%`
- Many items in failed queue

**Solutions:**
1. Check error types: `await exportSyncMetrics()` → `failed_items.by_error`
2. If network errors: Users may be in areas with poor coverage
3. If server errors: Check API server health
4. If timeout errors: Increase timeout for slow endpoints

### Issue: Large sync queue

**Symptoms:**
- `metrics.queue_status.total_queued > 100`
- Slow app performance

**Solutions:**
1. Check network quality: `metrics.network_quality_distribution`
2. Trigger manual full sync: `await syncAllItems()`
3. Check for failed items: `await getFailedSyncItems()`
4. Review priority distribution: May need to adjust priorities

### Issue: Conflicts not resolving

**Symptoms:**
- Items stuck in `sync_conflicts` table
- Data inconsistencies

**Solutions:**
1. Check conflict strategy: May need MANUAL for complex cases
2. Review merge logic: May need custom merge for specific entities
3. Implement conflict resolution UI for manual conflicts

## Migration Checklist

- [ ] Update all create/update/delete operations to use sync queue
- [ ] Choose appropriate priorities for each entity type
- [ ] Choose appropriate conflict strategies
- [ ] Register background sync in AuthContext
- [ ] Add sync status UI to main screens
- [ ] Add error handling for NetworkError/TimeoutError/ApiError
- [ ] Test offline scenarios
- [ ] Test poor network scenarios
- [ ] Test conflict resolution
- [ ] Set up sync metrics monitoring
- [ ] Add cleanup routines to app initialization
- [ ] Update user documentation

## Next Steps

1. **Integration**: Follow the steps above to integrate sync into features
2. **Testing**: Run comprehensive offline/poor network tests
3. **Monitoring**: Set up dashboards to track sync metrics
4. **Iteration**: Adjust priorities and batch sizes based on real-world usage

## Support

For issues or questions:
- Technical docs: `docs/technical/OFFLINE_SYNC_OPTIMIZATION.md`
- Code reference: `apps/mobile/src/services/syncQueue.ts` and `syncScheduler.ts`
- API reference: `apps/api/src/routes/sync.ts`
