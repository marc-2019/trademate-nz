/**
 * Sync Queue Tests
 * Comprehensive tests for offline sync queue optimization
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock dependencies before imports
jest.mock('expo-sqlite');
jest.mock('expo-network');

// Shared mock database - must stay as one object since the module caches `db`
const mockDb = {
  execAsync: jest.fn<any>().mockResolvedValue(undefined),
  runAsync: jest.fn<any>().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  getAllAsync: jest.fn<any>().mockResolvedValue([]),
  getFirstAsync: jest.fn<any>().mockResolvedValue(null),
};

// Set up the mock BEFORE importing the module under test
const SQLite = require('expo-sqlite');
const Network = require('expo-network');
(SQLite.openDatabaseAsync as any) = jest.fn<any>().mockResolvedValue(mockDb);

import {
  SyncPriority,
  ConflictStrategy,
  addToSyncQueue,
  getPendingSyncItems,
  markSyncItemProcessed,
  recordSyncFailure,
  resolveConflict,
  getSyncMetrics,
  detectNetworkQuality,
  getFailedSyncItems,
  retryFailedItem,
} from '../syncQueue';

describe('SyncQueue', () => {
  beforeEach(() => {
    // Clear call history but keep the mock implementations on the SAME object
    mockDb.execAsync.mockClear();
    mockDb.runAsync.mockClear().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    mockDb.getAllAsync.mockClear().mockResolvedValue([]);
    mockDb.getFirstAsync.mockClear().mockResolvedValue(null);

    (Network.getNetworkStateAsync as any) = jest.fn<any>().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addToSyncQueue', () => {
    it('should add item with default priority and strategy', async () => {
      const itemId = await addToSyncQueue(
        'invoices',
        'inv-123',
        'update',
        { amount: 100 }
      );

      expect(itemId).toBe(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue_v2'),
        expect.arrayContaining([
          'invoices',
          'inv-123',
          'update',
          expect.any(String), // payload JSON
          SyncPriority.MEDIUM,
          ConflictStrategy.SERVER_WINS,
          expect.any(String), // checksum
        ])
      );
    });

    it('should add critical item with correct priority', async () => {
      await addToSyncQueue(
        'swms',
        'swms-456',
        'create',
        { title: 'Safety Doc' },
        SyncPriority.CRITICAL
      );

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue_v2'),
        expect.arrayContaining([
          'swms',
          'swms-456',
          'create',
          expect.any(String),
          SyncPriority.CRITICAL,
          expect.any(String),
          expect.any(String),
        ])
      );
    });

    it('should handle delete action with null payload', async () => {
      await addToSyncQueue('expenses', 'exp-789', 'delete', null);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue_v2'),
        expect.arrayContaining(['expenses', 'exp-789', 'delete'])
      );
    });
  });

  describe('getPendingSyncItems', () => {
    it('should return items ordered by priority and created_at', async () => {
      const mockItems = [
        {
          id: 1,
          entity_type: 'swms',
          entity_id: 'swms-1',
          action: 'create',
          priority: SyncPriority.CRITICAL,
          attempts: 0,
        },
        {
          id: 2,
          entity_type: 'invoices',
          entity_id: 'inv-1',
          action: 'update',
          priority: SyncPriority.HIGH,
          attempts: 1,
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockItems);

      const items = await getPendingSyncItems(10);

      expect(items).toHaveLength(2);
      expect(items[0].priority).toBe(SyncPriority.CRITICAL);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY priority ASC, created_at ASC'),
        expect.any(Array)
      );
    });

    it('should respect batch size limit', async () => {
      await getPendingSyncItems(5);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        expect.arrayContaining([5])
      );
    });

    it('should filter items that exceeded max retries', async () => {
      await getPendingSyncItems(10);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE attempts < ?'),
        expect.arrayContaining([5]) // MAX_RETRY_ATTEMPTS
      );
    });
  });

  describe('markSyncItemProcessed', () => {
    it('should delete item from queue', async () => {
      await markSyncItemProcessed(123);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'DELETE FROM sync_queue_v2 WHERE id = ?',
        [123]
      );
    });
  });

  describe('recordSyncFailure', () => {
    it('should increment attempts and record error', async () => {
      const errorMessage = 'Network timeout';

      await recordSyncFailure(456, errorMessage);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_queue_v2'),
        [errorMessage, 456]
      );
    });
  });

  describe('resolveConflict', () => {
    const mockItem = {
      id: 1,
      entity_type: 'invoices',
      entity_id: 'inv-123',
      action: 'update' as const,
      payload: '{}',
      priority: SyncPriority.MEDIUM,
      created_at: new Date().toISOString(),
      attempts: 0,
      last_attempt_at: null,
      error_message: null,
      conflict_strategy: ConflictStrategy.SERVER_WINS,
    };

    it('should use server data when strategy is SERVER_WINS', async () => {
      const serverData = { amount: 100 };
      const clientData = { amount: 150 };

      const result = await resolveConflict(mockItem, serverData, clientData);

      expect(result.resolved).toEqual(serverData);
      expect(result.strategy).toBe(ConflictStrategy.SERVER_WINS);
    });

    it('should use client data when strategy is CLIENT_WINS', async () => {
      const item = { ...mockItem, conflict_strategy: ConflictStrategy.CLIENT_WINS };
      const serverData = { amount: 100 };
      const clientData = { amount: 150 };

      const result = await resolveConflict(item, serverData, clientData);

      expect(result.resolved).toEqual(clientData);
      expect(result.strategy).toBe(ConflictStrategy.CLIENT_WINS);
    });

    it('should merge data when strategy is MERGE', async () => {
      const item = { ...mockItem, conflict_strategy: ConflictStrategy.MERGE };
      const serverData = { amount: 100, status: 'draft' };
      const clientData = { amount: 150, notes: 'Updated' };

      const result = await resolveConflict(item, serverData, clientData);

      expect(result.resolved).toEqual({
        amount: 150,
        status: 'draft',
        notes: 'Updated',
      });
    });

    it('should store conflict when strategy is MANUAL', async () => {
      const item = { ...mockItem, conflict_strategy: ConflictStrategy.MANUAL };
      const serverData = { amount: 100 };
      const clientData = { amount: 150 };

      await resolveConflict(item, serverData, clientData);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_conflicts'),
        expect.arrayContaining([
          'invoices',
          'inv-123',
          JSON.stringify(serverData),
          JSON.stringify(clientData),
          'pending',
        ])
      );
    });
  });

  describe('detectNetworkQuality', () => {
    it('should return offline when not connected', async () => {
      (Network.getNetworkStateAsync as any).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const quality = await detectNetworkQuality();

      expect(quality.quality).toBe('offline');
      expect(quality.isReachable).toBe(false);
    });

    it('should return excellent for low latency', async () => {
      (Network.getNetworkStateAsync as any).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      // Mock fetch to simulate fast response
      global.fetch = jest.fn<any>().mockResolvedValue({ ok: true });

      const quality = await detectNetworkQuality();

      expect(quality.isReachable).toBe(true);
      expect(quality.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle network timeout gracefully', async () => {
      (Network.getNetworkStateAsync as any).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      // Mock fetch to timeout
      global.fetch = jest.fn().mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      ) as any;

      const quality = await detectNetworkQuality();

      expect(quality.quality).toBe('poor');
    });
  });

  describe('getSyncMetrics', () => {
    it('should return comprehensive metrics', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 5 }) // total queued
        .mockResolvedValueOnce({
          // recent metrics
          total_synced: 100,
          total_failed: 5,
          avg_duration: 1500,
          last_sync: '2026-02-16T10:00:00Z',
        });

      // Mock fetch for detectNetworkQuality (called internally)
      global.fetch = jest.fn<any>().mockResolvedValue({ ok: true });

      const metrics = await getSyncMetrics();

      expect(metrics.total_queued).toBe(5);
      expect(metrics.total_synced).toBe(100);
      expect(metrics.total_failed).toBe(5);
      expect(metrics.avg_sync_time_ms).toBe(1500);
      expect(metrics.network_quality).toBeDefined();
    });
  });

  describe('getFailedSyncItems', () => {
    it('should return items that exceeded max retries', async () => {
      const failedItems = [
        {
          id: 1,
          entity_type: 'invoices',
          attempts: 5,
          error_message: 'Server error',
        },
      ];

      mockDb.getAllAsync.mockResolvedValue(failedItems);

      const items = await getFailedSyncItems();

      expect(items).toHaveLength(1);
      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE attempts >= ?'),
        [5]
      );
    });
  });

  describe('retryFailedItem', () => {
    it('should reset attempts and error state', async () => {
      await retryFailedItem(123);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_queue_v2'),
        [123]
      );
    });
  });
});
