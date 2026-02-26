# Sync Queue Implementation Guide

## Quick Start for Developers

This guide shows you how to implement offline-first sync in TradeMate features.

## Step 1: Add Sync to Your Feature

### Example: Invoice Updates

```typescript
// apps/mobile/app/invoices/[id].tsx

import { addToSyncQueue, SyncPriority, ConflictStrategy } from '@/services/syncQueue';
import { performSync } from '@/services/syncScheduler';

async function updateInvoice(id: string, updates: Partial<Invoice>) {
  try {
    // 1. Update local SQLite first (optimistic update)
    await updateInvoiceLocally(id, updates);

    // 2. Add to sync queue with HIGH priority
    await addToSyncQueue(
      'invoices',              // entity type
      id,                      // entity ID
      'update',                // action
      updates,                 // payload
      SyncPriority.HIGH,       // priority (invoices are important)
      ConflictStrategy.MERGE   // merge local + server changes
    );

    // 3. Trigger immediate sync if online
    const networkQuality = await detectNetworkQuality();
    if (networkQuality.quality !== 'offline') {
      await performSync({ batchSize: 5 });
    }

    // 4. Update UI immediately (optimistic)
    setInvoice({ ...invoice, ...updates });

  } catch (error) {
    console.error('Failed to update invoice:', error);
    // UI still shows optimistic update; will sync later
  }
}
```

## Step 2: Choose the Right Priority

| Priority | When to Use | Examples |
|----------|-------------|----------|
| **CRITICAL** | Safety-critical, time-sensitive | SWMS docs, clock-in/out, incidents |
| **HIGH** | Business-critical, user expects immediate sync | Invoices, quotes, client updates |
| **MEDIUM** | Important but can wait | Notes, metadata, general updates |
| **LOW** | Nice-to-have, background | Analytics, usage stats |

### Decision Tree

```
Is it safety-related or time-sensitive?
├─ YES → CRITICAL
└─ NO
   └─ Is it financial or client-facing?
      ├─ YES → HIGH
      └─ NO
         └─ Is it user-generated content?
            ├─ YES → MEDIUM
            └─ NO → LOW
```

## Step 3: Choose Conflict Resolution Strategy

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| **SERVER_WINS** | Default for most cases | Simple, but loses local changes |
| **CLIENT_WINS** | User is always right | Keeps local changes, may lose server updates |
| **MERGE** | Both have valid updates | Best of both, but may create inconsistencies |
| **MANUAL** | Complex business logic | Safest, but requires manual resolution |

### Examples

```typescript
// SERVER_WINS - Default for read-heavy entities
await addToSyncQueue('certifications', id, 'update', data,
  SyncPriority.MEDIUM, ConflictStrategy.SERVER_WINS);

// CLIENT_WINS - User's edits take precedence
await addToSyncQueue('notes', id, 'update', { content: userNote },
  SyncPriority.MEDIUM, ConflictStrategy.CLIENT_WINS);

// MERGE - Combine both versions
await addToSyncQueue('invoices', id, 'update', updates,
  SyncPriority.HIGH, ConflictStrategy.MERGE);

// MANUAL - Complex financial data
await addToSyncQueue('reconciliation', id, 'update', data,
  SyncPriority.HIGH, ConflictStrategy.MANUAL);
```

## Step 4: Add to AuthContext

Update AuthContext to register background sync on login:

```typescript
// apps/mobile/src/contexts/AuthContext.tsx

import { registerBackgroundSync, unregisterBackgroundSync } from '@/services/syncScheduler';

// In login function
async function login(email: string, password: string) {
  const response = await authApi.login({ email, password });

  // ... existing login logic ...

  // Register background sync for this user
  await registerBackgroundSync();
}

// In logout function
async function logout() {
  // Unregister background sync
  await unregisterBackgroundSync();

  // ... existing logout logic ...
}
```

## Step 5: Add Sync Status UI

Show sync status to users:

```typescript
// components/SyncStatusBadge.tsx

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getSyncMetrics } from '@/services/syncQueue';

export function SyncStatusBadge() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // Update every 5 seconds
    const interval = setInterval(async () => {
      const data = await getSyncMetrics();
      setMetrics(data);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  const queueSize = metrics.total_queued;
  const networkQuality = metrics.network_quality;

  if (queueSize === 0) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text>✓ All synced</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ActivityIndicator size="small" />
      <Text>{queueSize} items pending</Text>
      <Text style={{ fontSize: 10, marginLeft: 4 }}>
        ({networkQuality})
      </Text>
    </View>
  );
}
```

## Step 6: Handle Offline Scenarios

### Optimistic UI Updates

```typescript
// Always update UI immediately, sync in background
async function deleteExpense(id: string) {
  // 1. Optimistic UI update
  setExpenses(prev => prev.filter(e => e.id !== id));

  // 2. Queue for sync
  await addToSyncQueue('expenses', id, 'delete', null, SyncPriority.MEDIUM);

  // 3. Sync will happen automatically in background
}
```

### Show Offline Indicator

```typescript
// components/OfflineIndicator.tsx

import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { detectNetworkQuality } from '@/services/syncQueue';

export function OfflineIndicator() {
  const [quality, setQuality] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const q = await detectNetworkQuality();
      setQuality(q);
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, []);

  if (quality?.quality === 'offline') {
    return (
      <View style={{ backgroundColor: '#FFA500', padding: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          📶 Offline - Changes will sync when connected
        </Text>
      </View>
    );
  }

  if (quality?.quality === 'poor') {
    return (
      <View style={{ backgroundColor: '#FFD700', padding: 8 }}>
        <Text style={{ textAlign: 'center' }}>
          ⚠️ Poor connection - Critical items only
        </Text>
      </View>
    );
  }

  return null;
}
```

## Step 7: Testing

### Test Offline Mode

```typescript
// __tests__/invoices.test.ts

import { addToSyncQueue, getPendingSyncItems } from '@/services/syncQueue';

describe('Invoice Offline Sync', () => {
  it('should queue invoice update when offline', async () => {
    // Simulate offline mode
    jest.mock('expo-network', () => ({
      getNetworkStateAsync: () => ({ isConnected: false }),
    }));

    // Update invoice
    await updateInvoice('inv-123', { amount: 500 });

    // Verify queued
    const pending = await getPendingSyncItems();
    expect(pending).toContainEqual(
      expect.objectContaining({
        entity_type: 'invoices',
        entity_id: 'inv-123',
        action: 'update',
      })
    );
  });
});
```

### Test Conflict Resolution

```typescript
it('should merge conflicting invoice updates', async () => {
  const serverData = { amount: 100, status: 'sent' };
  const clientData = { amount: 150, notes: 'Updated by client' };

  const result = await resolveConflict(
    { conflict_strategy: ConflictStrategy.MERGE, /* ... */ },
    serverData,
    clientData
  );

  expect(result.resolved).toEqual({
    amount: 150,
    status: 'sent',
    notes: 'Updated by client',
  });
});
```

## Common Patterns

### Pattern 1: Create with Auto-Sync

```typescript
async function createInvoice(data: CreateInvoiceData) {
  // 1. Generate local ID
  const id = `local-${Date.now()}`;

  // 2. Save locally
  await saveInvoiceLocally({ id, ...data });

  // 3. Queue for sync (will get server ID on sync)
  await addToSyncQueue('invoices', id, 'create', data, SyncPriority.HIGH);

  // 4. Trigger sync
  await performSync();

  return id;
}
```

### Pattern 2: Bulk Update with Batching

```typescript
async function bulkUpdateExpenses(updates: Array<{ id: string; data: any }>) {
  // Queue all updates
  for (const { id, data } of updates) {
    await addToSyncQueue('expenses', id, 'update', data, SyncPriority.MEDIUM);
  }

  // Sync in one batch
  await performSync({ batchSize: updates.length });
}
```

### Pattern 3: Retry Failed Items

```typescript
// In settings screen
async function retryAllFailed() {
  const failed = await getFailedSyncItems();

  for (const item of failed) {
    await retryFailedItem(item.id);
  }

  // Trigger immediate sync
  await performSync();
}
```

## Debugging

### Enable Debug Logging

```typescript
// services/syncQueue.ts

// Add debug flag
const DEBUG = __DEV__;

if (DEBUG) {
  console.log('[SyncQueue] Adding item:', { entityType, entityId, action, priority });
}
```

### Monitor Sync Activity

```typescript
// In developer menu
async function showSyncDebugInfo() {
  const metrics = await getSyncMetrics();
  const pending = await getPendingSyncItems(100);
  const failed = await getFailedSyncItems();

  console.log('=== Sync Debug Info ===');
  console.log('Metrics:', metrics);
  console.log('Pending:', pending.length);
  console.log('Failed:', failed.length);

  if (failed.length > 0) {
    console.log('Failed items:', failed.map(i => ({
      type: i.entity_type,
      id: i.entity_id,
      attempts: i.attempts,
      error: i.error_message,
    })));
  }
}
```

## Best Practices

### DO ✅

- Always update local DB first (optimistic UI)
- Use appropriate priorities based on criticality
- Add items to queue even when online (ensures retry on failure)
- Show offline indicators to users
- Test with airplane mode and throttled connections
- Monitor sync metrics in production

### DON'T ❌

- Don't wait for sync before updating UI
- Don't use CRITICAL priority for everything
- Don't sync large files through the queue (use direct upload)
- Don't assume sync will complete immediately
- Don't ignore failed items (implement retry UI)

## Production Checklist

- [ ] Background sync registered on login
- [ ] All CRUD operations queue for sync
- [ ] Appropriate priorities set for each entity type
- [ ] Conflict strategies chosen based on business logic
- [ ] Offline indicator shown in UI
- [ ] Sync status badge visible
- [ ] Failed items have retry mechanism
- [ ] Metrics tracked in monitoring system
- [ ] E2E tests cover offline scenarios
- [ ] Field testing completed with real devices

## Next Steps

1. Review your existing features and add sync queue integration
2. Test thoroughly in offline mode
3. Monitor sync metrics in staging
4. Roll out to beta users
5. Iterate based on real-world usage data
