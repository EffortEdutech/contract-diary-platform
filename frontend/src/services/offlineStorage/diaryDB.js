// ============================================================================
// DEXIE DATABASE SCHEMA - IndexedDB for Offline Storage
// ============================================================================
// File: frontend/src/services/offlineStorage/diaryDB.js
// Purpose: Define IndexedDB schema using Dexie for offline data storage
// ============================================================================

import Dexie from 'dexie';

// Initialize Dexie database
export const db = new Dexie('ContractDiaryDB');

// Define schema
db.version(1).stores({
  // Diaries stored offline
  diaries: '++id, diary_date, contract_id, status, sync_status, created_by',
  
  // Weather observations
  weather_observations: '++id, diary_id, observation_time, sync_status, weather_condition',
  
  // Photos stored as base64
  photos: '++id, diary_id, weather_observation_id, timestamp, sync_status',
  
  // Activity links
  diary_programme_links: '++id, diary_id, programme_item_id, sync_status',
  diary_boq_links: '++id, diary_id, boq_item_id, sync_status',
  
  // Sync queue
  sync_queue: '++id, entity_type, entity_id, operation, timestamp, retry_count',
  
  // Cache for Programme and BOQ data (for offline linking)
  programme_items_cache: 'id, contract_id, description',
  boq_items_cache: 'id, contract_id, item_code, description',
  
  // Metadata
  sync_metadata: 'key'
});

// Sync status enum
export const SyncStatus = {
  PENDING: 'pending',      // Not yet synced
  SYNCING: 'syncing',      // Currently syncing
  SYNCED: 'synced',        // Successfully synced
  FAILED: 'failed',        // Sync failed
  CONFLICT: 'conflict'     // Conflict detected
};

// Add helper methods to auto-set sync_status and timestamps
db.diaries.hook('creating', (primKey, obj) => {
  if (!obj.sync_status) {
    obj.sync_status = SyncStatus.PENDING;
  }
  if (!obj.created_at_local) {
    obj.created_at_local = new Date().toISOString();
  }
});

db.weather_observations.hook('creating', (primKey, obj) => {
  if (!obj.sync_status) {
    obj.sync_status = SyncStatus.PENDING;
  }
  if (!obj.created_at_local) {
    obj.created_at_local = new Date().toISOString();
  }
});

db.photos.hook('creating', (primKey, obj) => {
  if (!obj.sync_status) {
    obj.sync_status = SyncStatus.PENDING;
  }
  if (!obj.created_at_local) {
    obj.created_at_local = new Date().toISOString();
  }
});

db.diary_programme_links.hook('creating', (primKey, obj) => {
  if (!obj.sync_status) {
    obj.sync_status = SyncStatus.PENDING;
  }
  if (!obj.created_at_local) {
    obj.created_at_local = new Date().toISOString();
  }
});

db.diary_boq_links.hook('creating', (primKey, obj) => {
  if (!obj.sync_status) {
    obj.sync_status = SyncStatus.PENDING;
  }
  if (!obj.created_at_local) {
    obj.created_at_local = new Date().toISOString();
  }
});

// Helper function to clear all data (for development/testing)
export const clearAllData = async () => {
  await db.diaries.clear();
  await db.weather_observations.clear();
  await db.photos.clear();
  await db.diary_programme_links.clear();
  await db.diary_boq_links.clear();
  await db.sync_queue.clear();
  console.log('✅ All IndexedDB data cleared');
};

// Helper function to get database statistics
export const getDatabaseStats = async () => {
  const stats = {
    diaries: await db.diaries.count(),
    weather: await db.weather_observations.count(),
    photos: await db.photos.count(),
    programmeLinks: await db.diary_programme_links.count(),
    boqLinks: await db.diary_boq_links.count(),
    syncQueue: await db.sync_queue.count(),
    cachedProgramme: await db.programme_items_cache.count(),
    cachedBOQ: await db.boq_items_cache.count()
  };
  
  console.log('📊 IndexedDB Statistics:', stats);
  return stats;
};

export default db;
