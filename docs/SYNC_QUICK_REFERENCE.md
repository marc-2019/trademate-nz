# Offline Sync Quick Reference

## 🚀 Quick Start

```typescript
import { addToSyncQueue, SyncPriority } from '@/services/syncQueue';
import { performSync } from '@/services/syncScheduler';

// 1. Add to queue
await addToSyncQueue('invoices', id, 'update', data, SyncPriority.HIGH);

// 2. Trigger sync
await performSync();
```

## 📊 Priority Levels

| Priority | Sync Interval | Use For |
|----------|---------------|---------|
| `CRITICAL` | 30 seconds | Safety docs, clock-ins |
| `HIGH` | 5 minutes | Invoices, quotes |
| `MEDIUM` | 5 minutes | Notes, updates |
| `LOW` | 5 minutes | Analytics |

## 🔄 Conflict Strategies

```typescript
ConflictStrategy.SERVER_WINS  // Default - server overwrites
ConflictStrategy.CLIENT_WINS  // User edits take precedence
ConflictStrategy.MERGE        // Combine both versions
ConflictStrategy.MANUAL       // Store for manual resolution
```

## 🎯 Common Patterns

### Create Item
```typescript
const id = `local-${Date.now()}`;
await saveLocally({ id, ...data });
await addToSyncQueue('invoices', id, 'create', data, SyncPriority.HIGH);
```

### Update Item
```typescript
await updateLocally(id, updates);
await addToSyncQueue('invoices', id, 'update', updates, SyncPriority.HIGH);
await performSync();
```

### Delete Item
```typescript
await deleteLocally(id);
await addToSyncQueue('invoices', id, 'delete', null, SyncPriority.HIGH);
```

## 📱 UI Components

### Sync Status Badge
```typescript
import { getSyncMetrics } from '@/services/syncQueue';

const metrics = await getSyncMetrics();
// metrics.total_queued, metrics.network_quality
```

### Offline Indicator
```typescript
import { detectNetworkQuality } from '@/services/syncQueue';

const quality = await detectNetworkQuality();
// quality.quality: 'excellent' | 'good' | 'poor' | 'offline'
```

## 🔍 Monitoring

```typescript
import { getSyncMetrics, getFailedSyncItems } from '@/services/syncQueue';

// Get metrics
const metrics = await getSyncMetrics();
console.log('Queue size:', metrics.total_queued);
console.log('Success rate:', metrics.total_synced / (metrics.total_synced + metrics.total_failed));

// Get failed items
const failed = await getFailedSyncItems();
console.log('Failed:', failed.length);
```

## 🧪 Testing

```typescript
// Test offline mode
jest.mock('expo-network', () => ({
  getNetworkStateAsync: () => ({ isConnected: false }),
}));

await updateInvoice(id, data);
const pending = await getPendingSyncItems();
expect(pending).toContainEqual(
  expect.objectContaining({ entity_type: 'invoices', entity_id: id })
);
```

## 🛠️ Troubleshooting

### Queue Growing Too Large
```typescript
const metrics = await getSyncMetrics();
if (metrics.total_queued > 100) {
  await syncAllItems(); // Full drain
}
```

### Retry Failed Items
```typescript
import { getFailedSyncItems, retryFailedItem } from '@/services/syncQueue';

const failed = await getFailedSyncItems();
for (const item of failed) {
  await retryFailedItem(item.id);
}
```

## 📋 Checklist

- [ ] Update local DB first (optimistic UI)
- [ ] Add to sync queue with correct priority
- [ ] Choose appropriate conflict strategy
- [ ] Trigger sync if online
- [ ] Show offline indicator in UI
- [ ] Test in airplane mode

## 📚 Full Documentation

- **Technical Details**: `docs/technical/OFFLINE_SYNC_OPTIMIZATION.md`
- **Implementation Guide**: `docs/technical/SYNC_IMPLEMENTATION_GUIDE.md`
- **Summary**: `SYNC_OPTIMIZATION_SUMMARY.md`
