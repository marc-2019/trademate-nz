/**
 * Offline Storage Service
 * SQLite-based offline-first data persistence
 */

import * as SQLite from 'expo-sqlite';
import * as Network from 'expo-network';

const DB_NAME = 'trademate.db';

let db: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeTables();
  }
  return db;
}

async function initializeTables(): Promise<void> {
  const database = db!;

  // SWMS documents table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS swms_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      trade_type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      job_description TEXT,
      site_address TEXT,
      client_name TEXT,
      expected_duration TEXT,
      hazards TEXT,
      ppe_required TEXT,
      emergency_procedures TEXT,
      signatures TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0,
      local_changes INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      issuer TEXT,
      expiry_date TEXT,
      status TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      attempts INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_data (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

// Network status check
export async function isOnline(): Promise<boolean> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected && networkState.isInternetReachable === true;
  } catch {
    return false;
  }
}

// SWMS Document operations
export interface OfflineSWMS {
  id: string;
  title: string;
  trade_type: string;
  status: string;
  job_description: string | null;
  site_address: string | null;
  client_name: string | null;
  expected_duration: string | null;
  hazards: unknown[];
  ppe_required: string[];
  emergency_procedures: string[];
  signatures: unknown[];
  created_at: string;
  updated_at: string;
  synced: boolean;
  local_changes: boolean;
}

export async function saveSWMSLocally(document: Omit<OfflineSWMS, 'synced' | 'local_changes'>): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT OR REPLACE INTO swms_documents
     (id, title, trade_type, status, job_description, site_address, client_name,
      expected_duration, hazards, ppe_required, emergency_procedures, signatures,
      created_at, updated_at, synced, local_changes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    [
      document.id,
      document.title,
      document.trade_type,
      document.status,
      document.job_description,
      document.site_address,
      document.client_name,
      document.expected_duration,
      JSON.stringify(document.hazards),
      JSON.stringify(document.ppe_required),
      JSON.stringify(document.emergency_procedures),
      JSON.stringify(document.signatures),
      document.created_at,
      document.updated_at,
    ]
  );
}

export async function getSWMSList(): Promise<OfflineSWMS[]> {
  const database = await getDatabase();

  const results = await database.getAllAsync<{
    id: string;
    title: string;
    trade_type: string;
    status: string;
    job_description: string | null;
    site_address: string | null;
    client_name: string | null;
    expected_duration: string | null;
    hazards: string;
    ppe_required: string;
    emergency_procedures: string;
    signatures: string;
    created_at: string;
    updated_at: string;
    synced: number;
    local_changes: number;
  }>('SELECT * FROM swms_documents ORDER BY updated_at DESC');

  return results.map((row) => ({
    ...row,
    hazards: JSON.parse(row.hazards || '[]'),
    ppe_required: JSON.parse(row.ppe_required || '[]'),
    emergency_procedures: JSON.parse(row.emergency_procedures || '[]'),
    signatures: JSON.parse(row.signatures || '[]'),
    synced: row.synced === 1,
    local_changes: row.local_changes === 1,
  }));
}

export async function getSWMSById(id: string): Promise<OfflineSWMS | null> {
  const database = await getDatabase();

  const result = await database.getFirstAsync<{
    id: string;
    title: string;
    trade_type: string;
    status: string;
    job_description: string | null;
    site_address: string | null;
    client_name: string | null;
    expected_duration: string | null;
    hazards: string;
    ppe_required: string;
    emergency_procedures: string;
    signatures: string;
    created_at: string;
    updated_at: string;
    synced: number;
    local_changes: number;
  }>('SELECT * FROM swms_documents WHERE id = ?', [id]);

  if (!result) return null;

  return {
    ...result,
    hazards: JSON.parse(result.hazards || '[]'),
    ppe_required: JSON.parse(result.ppe_required || '[]'),
    emergency_procedures: JSON.parse(result.emergency_procedures || '[]'),
    signatures: JSON.parse(result.signatures || '[]'),
    synced: result.synced === 1,
    local_changes: result.local_changes === 1,
  };
}

export async function updateSWMSLocally(
  id: string,
  updates: Partial<OfflineSWMS>
): Promise<void> {
  const database = await getDatabase();
  const existing = await getSWMSById(id);

  if (!existing) {
    throw new Error('Document not found');
  }

  const updated = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
    local_changes: true,
  };

  await database.runAsync(
    `UPDATE swms_documents SET
       title = ?, trade_type = ?, status = ?, job_description = ?,
       site_address = ?, client_name = ?, expected_duration = ?,
       hazards = ?, ppe_required = ?, emergency_procedures = ?,
       signatures = ?, updated_at = ?, local_changes = 1
     WHERE id = ?`,
    [
      updated.title,
      updated.trade_type,
      updated.status,
      updated.job_description,
      updated.site_address,
      updated.client_name,
      updated.expected_duration,
      JSON.stringify(updated.hazards),
      JSON.stringify(updated.ppe_required),
      JSON.stringify(updated.emergency_procedures),
      JSON.stringify(updated.signatures),
      updated.updated_at,
      id,
    ]
  );

  // Add to sync queue
  await addToSyncQueue('swms', id, 'update', updates);
}

export async function deleteSWMSLocally(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM swms_documents WHERE id = ?', [id]);
  await addToSyncQueue('swms', id, 'delete', null);
}

// Sync queue operations
async function addToSyncQueue(
  entityType: string,
  entityId: string,
  action: string,
  payload: unknown
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO sync_queue (entity_type, entity_id, action, payload)
     VALUES (?, ?, ?, ?)`,
    [entityType, entityId, action, payload ? JSON.stringify(payload) : null]
  );
}

interface SyncQueueItem {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: string | null;
  created_at: string;
  attempts: number;
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const database = await getDatabase();
  return database.getAllAsync<SyncQueueItem>(
    'SELECT * FROM sync_queue WHERE attempts < 3 ORDER BY created_at ASC'
  );
}

export async function markSyncItemProcessed(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export async function incrementSyncAttempts(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?',
    [id]
  );
}

// User data storage
export async function setUserData(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO user_data (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getUserData(key: string): Promise<string | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM user_data WHERE key = ?',
    [key]
  );
  return result?.value || null;
}

// Batch sync all local documents from server
export async function syncFromServer(
  documents: Omit<OfflineSWMS, 'synced' | 'local_changes'>[]
): Promise<void> {
  const database = await getDatabase();

  for (const doc of documents) {
    // Check if we have local changes that shouldn't be overwritten
    const local = await getSWMSById(doc.id);
    if (local && local.local_changes) {
      // Local changes exist, skip this document
      continue;
    }
    await saveSWMSLocally(doc);
  }
}

// Clear all local data (for logout)
export async function clearLocalData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM swms_documents;
    DELETE FROM certifications;
    DELETE FROM sync_queue;
    DELETE FROM user_data;
  `);
}

export default {
  isOnline,
  saveSWMSLocally,
  getSWMSList,
  getSWMSById,
  updateSWMSLocally,
  deleteSWMSLocally,
  getPendingSyncItems,
  markSyncItemProcessed,
  incrementSyncAttempts,
  setUserData,
  getUserData,
  syncFromServer,
  clearLocalData,
};
