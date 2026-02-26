# TradeMate Offline Sync Flow Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER ACTIONS                           │
│  Create Invoice | Update SWMS | Delete Expense | etc.       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               OPTIMISTIC UI UPDATE                          │
│  1. Update Local SQLite immediately                         │
│  2. Show success to user (don't wait for sync)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            ADD TO PRIORITY SYNC QUEUE                       │
│  Priority Assignment:                                        │
│  ├─ CRITICAL (0) → SWMS, Clock-ins     → 30s intervals     │
│  ├─ HIGH (1)     → Invoices, Quotes    → 5min intervals    │
│  ├─ MEDIUM (2)   → Notes, Updates      → 5min intervals    │
│  └─ LOW (3)      → Analytics           → 5min intervals    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NETWORK QUALITY CHECK                          │
│  Measure latency to determine network quality:              │
│  ├─ Excellent (<200ms)  → Sync all items, large batches    │
│  ├─ Good (200-500ms)    → Sync all items, standard batches │
│  ├─ Poor (>500ms)       → Critical items only, small batch │
│  └─ Offline (no reach)  → Queue for later, no attempts     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BATCH PROCESSING ENGINE                        │
│  Retrieve items from queue by priority:                     │
│  1. ORDER BY priority ASC, created_at ASC                  │
│  2. LIMIT by batch size (10 default, 5 critical, 20 full)  │
│  3. Filter by attempts < max_retries (5)                   │
│  4. Check retry interval based on priority                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 SYNC ATTEMPT                                │
│  For each item in batch:                                    │
│  ├─ Parse payload                                           │
│  ├─ Build API request (POST/PUT/DELETE)                    │
│  ├─ Send to server                                          │
│  └─ Wait for response                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ SUCCESS ────┐
                     │               │
                     │               ▼
                     │    ┌──────────────────────────────┐
                     │    │  REMOVE FROM QUEUE           │
                     │    │  Update metrics (+1 synced)  │
                     │    └──────────────────────────────┘
                     │
                     └─ FAILURE ────┐
                                    │
                                    ▼
                     ┌──────────────────────────────────────┐
                     │       CONFLICT DETECTED?             │
                     └──┬───────────────────────────────┬───┘
                        │ YES                           │ NO
                        ▼                               ▼
         ┌────────────────────────────┐   ┌──────────────────────┐
         │  CONFLICT RESOLUTION        │   │  RETRY WITH BACKOFF  │
         │  ├─ SERVER_WINS (default)  │   │  Attempts += 1       │
         │  ├─ CLIENT_WINS            │   │  Calculate delay:    │
         │  ├─ MERGE (smart combine)  │   │  delay = min(        │
         │  └─ MANUAL (log for user)  │   │    1000 * 2^n +      │
         │                             │   │    random(0-1000),   │
         │  Apply strategy → Retry    │   │    60000)            │
         └────────────────────────────┘   │                      │
                                          │  If attempts < 5:    │
                                          │    Schedule retry    │
                                          │  Else:               │
                                          │    Mark as failed    │
                                          └──────────────────────┘
```

## Detailed Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  FOREGROUND SYNC                            │
│  Triggered by:                                               │
│  - User action (create/update/delete)                       │
│  - Manual pull-to-refresh                                   │
│  - App becomes active                                        │
│                                                              │
│  Flow:                                                       │
│  1. User performs action                                    │
│  2. Update local DB (optimistic)                            │
│  3. Add to sync queue                                       │
│  4. Check network quality                                    │
│  5. If online → performSync({ batchSize: 5 })              │
│  6. Update UI with sync status                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 BACKGROUND SYNC                             │
│  Triggered by:                                               │
│  - iOS/Android Background Fetch (every 15 min)             │
│  - Network state change (offline → online)                 │
│                                                              │
│  Flow:                                                       │
│  1. Background task wakes up                                │
│  2. Check network quality                                    │
│  3. If poor → skip (battery saving)                        │
│  4. If good → performSync({ batchSize: 10 })               │
│  5. Log metrics                                             │
│  6. Cleanup old data (30 days)                             │
│  7. Return success/failure to OS                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              CRITICAL ITEM FAST TRACK                       │
│  Triggered by:                                               │
│  - SWMS document created/updated                            │
│  - Worker clocks in/out                                     │
│  - Safety incident reported                                 │
│                                                              │
│  Flow:                                                       │
│  1. Item added with CRITICAL priority                       │
│  2. Immediate sync attempt (don't wait for batch)          │
│  3. If fails → retry after 30 seconds (not 5 min)          │
│  4. Keep retrying every 30s until success                   │
│  5. Show real-time status to user                          │
└─────────────────────────────────────────────────────────────┘
```

## Retry Logic with Exponential Backoff

```
Attempt 1
├─ Initial sync attempt
├─ Fails → delay = 1s + jitter(0-1s)
└─ Wait ~1-2 seconds

Attempt 2
├─ Retry sync
├─ Fails → delay = 2s + jitter(0-1s)
└─ Wait ~2-3 seconds

Attempt 3
├─ Retry sync
├─ Fails → delay = 4s + jitter(0-1s)
└─ Wait ~4-5 seconds

Attempt 4
├─ Retry sync
├─ Fails → delay = 8s + jitter(0-1s)
└─ Wait ~8-9 seconds

Attempt 5 (Final)
├─ Retry sync
├─ Fails → Mark as permanently failed
└─ Move to failed_items queue for manual intervention

Total time span: ~15-20 seconds
Max retries: 5 attempts
Max delay: 60 seconds (capped)
```

## Network Quality Detection Flow

```
┌─────────────────────────────────────────────────────────────┐
│          NETWORK QUALITY DETECTION                          │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Check Network State  │
         │  (expo-network)       │
         └───────┬───────────────┘
                 │
                 ├─ Not Connected ────────────┐
                 │                             │
                 └─ Connected ───────┐         │
                                     ▼         ▼
                      ┌──────────────────────────────┐
                      │  Measure Latency             │
                      │  1. Start timer              │
                      │  2. HEAD google.com/favicon  │
                      │  3. Calculate time           │
                      │  4. Timeout after 5s         │
                      └──────┬───────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  < 200ms              200-500ms              > 500ms
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │EXCELLENT │        │   GOOD   │        │   POOR   │
  │          │        │          │        │          │
  │Sync all  │        │Sync all  │        │Critical  │
  │items     │        │items     │        │only      │
  │Large     │        │Standard  │        │Small     │
  │batches   │        │batches   │        │batches   │
  └──────────┘        └──────────┘        └──────────┘
```

## Conflict Resolution Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│              SERVER RETURNS 409 CONFLICT                    │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Get Conflict Strategy │
         │  from sync_queue_v2    │
         └───────┬───────────────┘
                 │
   ┌─────────────┼─────────────┬─────────────┐
   │             │             │             │
   ▼             ▼             ▼             ▼
SERVER_WINS  CLIENT_WINS     MERGE       MANUAL
   │             │             │             │
   ▼             ▼             ▼             ▼
Use server   Use client   Combine both   Store for
data         data         (smart merge)  manual
   │             │             │          resolution
   └─────────────┴─────────────┴─────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Apply Resolution     │
         │  Retry with merged    │
         │  data                 │
         └───────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Log to               │
         │  sync_conflicts table │
         └───────────────────────┘
```

## Metrics Collection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   SYNC BATCH STARTS                         │
│  Generate batch_id: "batch-{timestamp}"                     │
│  Record start_time                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Process Each Item    │
         │  in Batch             │
         └───────┬───────────────┘
                 │
                 ├─ SUCCESS → items_synced++
                 │
                 └─ FAILURE → items_failed++
                             └─ errors.push({id, error})
                     │
                     ▼
         ┌───────────────────────┐
         │  Calculate Metrics    │
         │  - Total time         │
         │  - Success rate       │
         │  - Network quality    │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │  Store to             │
         │  sync_metrics table   │
         │  - batch_id           │
         │  - items_synced       │
         │  - items_failed       │
         │  - duration_ms        │
         │  - network_quality    │
         └───────────────────────┘
```

## Database Indexes Performance

```
┌─────────────────────────────────────────────────────────────┐
│              QUERY OPTIMIZATION                             │
└─────────────────────────────────────────────────────────────┘

Query: Get pending items by priority
  SELECT * FROM sync_queue_v2
  WHERE attempts < 5
  ORDER BY priority ASC, created_at ASC
  LIMIT 10

  Uses: idx_sync_queue_priority (priority, created_at)
  Performance: O(log n) - ~10ms for 10k rows

Query: Get items for specific entity
  SELECT * FROM sync_queue_v2
  WHERE entity_type = 'invoices'
  AND entity_id = 'inv-123'

  Uses: idx_sync_queue_entity (entity_type, entity_id)
  Performance: O(log n) - ~5ms for 10k rows

Query: Get retry candidates
  SELECT * FROM sync_queue_v2
  WHERE attempts < 5
  AND last_attempt_at < datetime('now', '-5 minutes')

  Uses: idx_sync_queue_attempts (attempts, last_attempt_at)
  Performance: O(log n) - ~15ms for 10k rows
```

## Legend

```
┌──────┐
│ Box  │  Process or Component
└──────┘

   │
   ▼     Flow Direction

   ├─    Decision Point

SUCCESS   Outcome Label

═══════   Critical Path
```
