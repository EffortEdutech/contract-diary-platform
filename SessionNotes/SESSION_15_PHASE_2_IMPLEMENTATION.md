# SESSION 15 - PHASE 2: FRONTEND IMPLEMENTATION
## Work Diary Redesign with Offline Capability

**Date:** 17 January 2026  
**Duration:** Estimated 4-5 hours (can be split across sessions)  
**Focus:** Offline-first weather tracking, activity linking, responsive UI

---

## 🎯 PHASE 2 OBJECTIVES (Updated with Eff's Requirements)

### **Primary Goals:**
1. ✅ Build offline-first Work Diary with IndexedDB storage
2. ✅ Implement weather tracking with mandatory photos for critical events
3. ✅ Create responsive UI for both phones (one-handed) and tablets
4. ✅ Add activity linking to Programme and BOQ
5. ✅ Auto-suggest delay events for weather stoppages
6. ✅ Implement sync queue for offline → online data flow

### **Updated Requirements from Eff:**

#### **1. Photo Requirements** 📸
- ✅ **MANDATORY** photos for:
  - Heavy rain
  - Lightning
  - Work stoppages
- System blocks submission without required photos
- Photo capture with device camera (mobile-optimized)
- Offline photo storage until sync

#### **2. Automatic Delay Event Suggestions** ⚠️
- ✅ Auto-suggest delay event when:
  - Work stoppage > 1 hour
  - Multiple weather stoppages in one day
- ❌ **NOT** auto-suggest for rainfall threshold (too difficult to quantify)
- Show suggestion modal with pre-filled data
- User can accept, modify, or dismiss

#### **3. Device Support** 📱
- ✅ **Phones** (small screen, one-handed operation)
  - Large touch targets (48px minimum)
  - Bottom navigation for thumb reach
  - Collapsible sections to save space
  - Simplified forms with fewer fields visible
- ✅ **Tablets** (larger screen, more information)
  - Side-by-side layouts
  - More fields visible simultaneously
  - Richer data visualizations
  - Multi-column grids

#### **4. Offline Capability** 🔌 **REQUIRED**
- ✅ Record weather observations offline
- ✅ Create diary entries offline
- ✅ Capture and store photos offline
- ✅ Queue changes for sync when online
- ✅ Show sync status clearly to user
- ✅ Handle conflicts gracefully

---

## 🏗️ TECHNICAL ARCHITECTURE

### **Offline-First Stack:**

```
┌─────────────────────────────────────────────────┐
│           REACT FRONTEND (UI Layer)             │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐    ┌────────────────────┐    │
│  │ Components   │    │ Service Workers    │    │
│  │ - Diary Form │    │ - Cache Strategy   │    │
│  │ - Weather    │    │ - Background Sync  │    │
│  │ - Photos     │    │ - Push Notifications│   │
│  └──────────────┘    └────────────────────┘    │
│                                                  │
├─────────────────────────────────────────────────┤
│         DATA LAYER (Offline Storage)            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐    ┌────────────────────┐    │
│  │ IndexedDB    │    │ Sync Queue         │    │
│  │ - Diaries    │    │ - Pending Creates  │    │
│  │ - Weather    │    │ - Pending Updates  │    │
│  │ - Photos     │    │ - Pending Deletes  │    │
│  │ - Programme  │    │ - Photo Uploads    │    │
│  │ - BOQ        │    │ - Retry Logic      │    │
│  └──────────────┘    └────────────────────┘    │
│                                                  │
├─────────────────────────────────────────────────┤
│         SYNC LAYER (Online Integration)         │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐    ┌────────────────────┐    │
│  │ Supabase API │    │ Conflict Resolution│    │
│  │ - Real-time  │    │ - Last-Write-Wins  │    │
│  │ - REST       │    │ - Merge Strategies │    │
│  │ - Storage    │    │ - User Prompts     │    │
│  └──────────────┘    └────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### **Key Technologies:**

1. **Dexie.js** - IndexedDB wrapper (easier than raw IndexedDB)
2. **Workbox** - Service Worker toolkit (Google's PWA library)
3. **React Query** - Server state management with offline support
4. **localForage** - Simplified storage API (fallback to localStorage)
5. **idb-keyval** - Simple key-value store for metadata

---

## 📁 FILE STRUCTURE

```
frontend/src/
├── components/
│   ├── diaries/
│   │   ├── DiaryFormOffline.js           ← New main diary form
│   │   ├── WeatherObservationCard.js     ← Weather tracking UI
│   │   ├── WeatherObservationModal.js    ← Add/edit weather modal
│   │   ├── WorkDiaryActivity.js          ← Activity card
│   │   ├── ActivityLinkModal.js          ← Link to Programme/BOQ
│   │   ├── PhotoCaptureOffline.js        ← Offline photo capture
│   │   ├── OfflineSyncStatus.js          ← Sync status indicator
│   │   └── DelayEventSuggestion.js       ← Auto-suggest delay modal
│   │
│   └── common/
│       ├── ResponsiveLayout.js           ← Phone vs Tablet layouts
│       └── OfflineIndicator.js           ← Online/offline status
│
├── services/
│   ├── offlineStorage/
│   │   ├── diaryDB.js                    ← IndexedDB schema
│   │   ├── weatherDB.js                  ← Weather observations storage
│   │   ├── photoStorage.js               ← Base64 photo storage
│   │   └── syncQueue.js                  ← Sync queue management
│   │
│   ├── sync/
│   │   ├── syncService.js                ← Main sync orchestrator
│   │   ├── weatherSync.js                ← Weather-specific sync
│   │   ├── photoSync.js                  ← Photo upload sync
│   │   └── conflictResolver.js           ← Conflict resolution
│   │
│   └── diaryServiceOffline.js            ← Extended diary service
│
├── hooks/
│   ├── useOfflineStorage.js              ← IndexedDB hook
│   ├── useOnlineStatus.js                ← Network detection
│   ├── useSyncStatus.js                  ← Sync progress tracking
│   └── usePhotoCapture.js                ← Camera access hook
│
├── utils/
│   ├── photoCompression.js               ← Compress photos offline
│   ├── deviceDetection.js                ← Phone vs Tablet detection
│   └── delayEventSuggester.js            ← Auto-suggest logic
│
└── sw.js                                 ← Service Worker (PWA)
```

---

## 🔧 PHASE 2 IMPLEMENTATION STEPS

### **Step 1: Setup Offline Infrastructure (1 hour)**

#### **1.1: Install Dependencies**

```bash
cd frontend
npm install dexie workbox-precaching workbox-routing workbox-strategies
npm install react-query localforage idb-keyval
npm install compressorjs  # For photo compression
```

#### **1.2: Create IndexedDB Schema**

**File:** `frontend/src/services/offlineStorage/diaryDB.js`

```javascript
import Dexie from 'dexie';

// Initialize Dexie database
export const db = new Dexie('ContractDiaryDB');

// Define schema
db.version(1).stores({
  // Diaries stored offline
  diaries: '++id, diary_date, contract_id, status, sync_status',
  
  // Weather observations
  weather_observations: '++id, diary_id, observation_time, sync_status',
  
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

// Add helper methods
db.diaries.hook('creating', (primKey, obj) => {
  obj.sync_status = SyncStatus.PENDING;
  obj.created_at_local = new Date().toISOString();
});

db.weather_observations.hook('creating', (primKey, obj) => {
  obj.sync_status = SyncStatus.PENDING;
  obj.created_at_local = new Date().toISOString();
});

db.photos.hook('creating', (primKey, obj) => {
  obj.sync_status = SyncStatus.PENDING;
  obj.created_at_local = new Date().toISOString();
});

export default db;
```

#### **1.3: Create Sync Queue Manager**

**File:** `frontend/src/services/offlineStorage/syncQueue.js`

```javascript
import db, { SyncStatus } from './diaryDB';
import { supabase } from '../../lib/supabase';

// Maximum retry attempts
const MAX_RETRIES = 3;

// Sync queue manager
export const syncQueue = {
  // Add item to sync queue
  async add(entityType, entityId, operation, data) {
    await db.sync_queue.add({
      entity_type: entityType,
      entity_id: entityId,
      operation: operation, // 'create', 'update', 'delete'
      data: data,
      timestamp: new Date().toISOString(),
      retry_count: 0,
      last_error: null
    });
  },

  // Get all pending sync items
  async getPending() {
    return await db.sync_queue
      .where('retry_count')
      .below(MAX_RETRIES)
      .toArray();
  },

  // Process sync queue
  async processPending() {
    const items = await this.getPending();
    const results = {
      success: 0,
      failed: 0,
      total: items.length
    };

    for (const item of items) {
      try {
        await this.processItem(item);
        await db.sync_queue.delete(item.id);
        results.success++;
      } catch (error) {
        console.error(`Sync failed for ${item.entity_type}:`, error);
        await db.sync_queue.update(item.id, {
          retry_count: item.retry_count + 1,
          last_error: error.message
        });
        results.failed++;
      }
    }

    return results;
  },

  // Process individual sync item
  async processItem(item) {
    const { entity_type, operation, data } = item;

    switch (entity_type) {
      case 'diary':
        return await this.syncDiary(operation, data);
      case 'weather_observation':
        return await this.syncWeatherObservation(operation, data);
      case 'photo':
        return await this.syncPhoto(operation, data);
      case 'diary_programme_link':
        return await this.syncProgrammeLink(operation, data);
      case 'diary_boq_link':
        return await this.syncBOQLink(operation, data);
      default:
        throw new Error(`Unknown entity type: ${entity_type}`);
    }
  },

  // Sync diary to Supabase
  async syncDiary(operation, data) {
    if (operation === 'create') {
      const { error } = await supabase
        .from('work_diaries')
        .insert(data);
      if (error) throw error;
    } else if (operation === 'update') {
      const { error } = await supabase
        .from('work_diaries')
        .update(data)
        .eq('id', data.id);
      if (error) throw error;
    }
  },

  // Sync weather observation to Supabase
  async syncWeatherObservation(operation, data) {
    if (operation === 'create') {
      const { error } = await supabase
        .from('weather_observations')
        .insert(data);
      if (error) throw error;
    }
  },

  // Sync photo to Supabase Storage
  async syncPhoto(operation, data) {
    const { base64, path, diary_id } = data;
    
    // Convert base64 to blob
    const blob = await fetch(base64).then(r => r.blob());
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('diary-photos')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });
    
    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('diary-photos')
      .getPublicUrl(path);

    // Update diary_photos record
    const { error: dbError } = await supabase
      .from('diary_photos')
      .insert({
        diary_id: diary_id,
        photo_url: publicUrl,
        uploaded_at: new Date().toISOString()
      });

    if (dbError) throw dbError;
  },

  // Sync programme link
  async syncProgrammeLink(operation, data) {
    if (operation === 'create') {
      const { error } = await supabase
        .from('diary_programme_links')
        .insert(data);
      if (error) throw error;
    }
  },

  // Sync BOQ link
  async syncBOQLink(operation, data) {
    if (operation === 'create') {
      const { error } = await supabase
        .from('diary_boq_links')
        .insert(data);
      if (error) throw error;
    }
  },

  // Clear completed sync items
  async clearCompleted() {
    return await db.sync_queue.clear();
  }
};

export default syncQueue;
```

#### **1.4: Create Online Status Hook**

**File:** `frontend/src/hooks/useOnlineStatus.js`

```javascript
import { useState, useEffect } from 'react';

// Hook to detect online/offline status
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

export default useOnlineStatus;
```

---

### **Step 2: Weather Observation Components (1.5 hours)**

#### **2.1: Weather Observation Card**

**File:** `frontend/src/components/diaries/WeatherObservationCard.js`

```javascript
import React, { useState } from 'react';
import WeatherObservationModal from './WeatherObservationModal';

const WeatherObservationCard = ({ 
  observations, 
  onAdd, 
  onEdit, 
  onDelete,
  diaryId,
  diaryDate,
  isOffline 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingObservation, setEditingObservation] = useState(null);

  // Weather condition icons
  const getWeatherIcon = (condition) => {
    const icons = {
      sunny: '☀️',
      cloudy: '☁️',
      partly_cloudy: '⛅',
      overcast: '☁️',
      light_rain: '🌦️',
      heavy_rain: '⛈️',
      drizzle: '🌧️',
      thunderstorm: '⛈️',
      lightning: '⚡',
      strong_wind: '💨',
      haze: '🌫️',
      fog: '🌫️'
    };
    return icons[condition] || '🌤️';
  };

  // Check if photos are mandatory for this condition
  const requiresPhotos = (condition, workStoppage) => {
    const mandatoryPhotoConditions = [
      'heavy_rain',
      'lightning',
      'thunderstorm'
    ];
    return mandatoryPhotoConditions.includes(condition) || workStoppage;
  };

  // Calculate daily summary
  const dailySummary = {
    totalObservations: observations.length,
    totalRainfall: observations.reduce((sum, obs) => sum + (obs.rainfall_mm || 0), 0),
    workStoppages: observations.filter(obs => obs.work_stoppage).length,
    totalStoppageMinutes: observations
      .filter(obs => obs.work_stoppage)
      .reduce((sum, obs) => sum + (obs.work_stoppage_duration_minutes || 0), 0),
    hasHeavyRain: observations.some(obs => obs.weather_condition === 'heavy_rain'),
    hasLightning: observations.some(obs => obs.weather_condition === 'lightning'),
    maxTemperature: Math.max(...observations.map(obs => obs.temperature || 0), 0)
  };

  const handleAdd = () => {
    setEditingObservation(null);
    setShowModal(true);
  };

  const handleEdit = (observation) => {
    setEditingObservation(observation);
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          🌤️ Weather Tracking
          {isOffline && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Offline Mode
            </span>
          )}
        </h3>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Add Observation
        </button>
      </div>

      {/* Observations List */}
      {observations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">No weather observations yet</p>
          <p className="text-sm mt-2">
            Add observations throughout the day to track weather conditions
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {observations
            .sort((a, b) => a.observation_time.localeCompare(b.observation_time))
            .map((obs, index) => (
              <div
                key={obs.id || index}
                className={`border rounded-lg p-4 ${
                  obs.work_stoppage 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Time and Condition */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {getWeatherIcon(obs.weather_condition)}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {obs.observation_time} - {obs.weather_condition.replace('_', ' ').toUpperCase()}
                        </p>
                        {obs.work_stoppage && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            🚨 WORK STOPPED - {obs.work_stoppage_duration_minutes} minutes
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Environmental Data */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                      <span>🌡️ {obs.temperature}°C</span>
                      <span>💧 {obs.humidity}%</span>
                      {obs.rainfall_mm > 0 && (
                        <span className="font-semibold text-blue-600">
                          ☔ {obs.rainfall_mm}mm
                        </span>
                      )}
                      {obs.wind_speed_kmh > 0 && (
                        <span>💨 {obs.wind_speed_kmh} km/h</span>
                      )}
                    </div>

                    {/* Affected Activities */}
                    {obs.affected_activities && obs.affected_activities.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Affected Activities:</p>
                        <div className="flex flex-wrap gap-1">
                          {obs.affected_activities.map((activity, i) => (
                            <span
                              key={i}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded"
                            >
                              {activity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remarks */}
                    {obs.remarks && (
                      <p className="text-sm text-gray-600 mt-2">
                        📝 {obs.remarks}
                      </p>
                    )}

                    {/* Photos */}
                    {obs.photo_urls && obs.photo_urls.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {obs.photo_urls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Weather photo ${i + 1}`}
                            className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-75"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    )}

                    {/* Missing photos warning */}
                    {requiresPhotos(obs.weather_condition, obs.work_stoppage) && 
                     (!obs.photo_urls || obs.photo_urls.length === 0) && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        ⚠️ Photos required for {obs.weather_condition.replace('_', ' ')}
                      </div>
                    )}

                    {/* Sync Status */}
                    {obs.sync_status && obs.sync_status !== 'synced' && (
                      <div className="mt-2 text-xs text-gray-500">
                        {obs.sync_status === 'pending' && '⏳ Pending sync...'}
                        {obs.sync_status === 'syncing' && '🔄 Syncing...'}
                        {obs.sync_status === 'failed' && '❌ Sync failed'}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(obs)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(obs.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Daily Summary */}
      {observations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-bold text-blue-900 mb-3">📊 Daily Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-600 font-medium">Total Observations</p>
              <p className="text-2xl font-bold text-blue-900">
                {dailySummary.totalObservations}
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Total Rainfall</p>
              <p className="text-2xl font-bold text-blue-900">
                {dailySummary.totalRainfall.toFixed(1)}mm
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Work Stoppages</p>
              <p className="text-2xl font-bold text-blue-900">
                {dailySummary.workStoppages}
                {dailySummary.totalStoppageMinutes > 0 && (
                  <span className="text-sm ml-1">
                    ({dailySummary.totalStoppageMinutes} min)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-blue-600 font-medium">Max Temperature</p>
              <p className="text-2xl font-bold text-blue-900">
                {dailySummary.maxTemperature}°C
              </p>
            </div>
          </div>
          
          {/* Alerts */}
          <div className="mt-3 space-y-1">
            {dailySummary.hasHeavyRain && (
              <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                ⚠️ Heavy Rain Alert
              </div>
            )}
            {dailySummary.hasLightning && (
              <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                ⚠️ Lightning Alert - Safety Critical
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <WeatherObservationModal
          observation={editingObservation}
          diaryId={diaryId}
          diaryDate={diaryDate}
          isOffline={isOffline}
          onSave={(data) => {
            if (editingObservation) {
              onEdit(editingObservation.id, data);
            } else {
              onAdd(data);
            }
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default WeatherObservationCard;
```

---

### **Step 3: Photo Capture with Offline Support (1 hour)**

**File:** `frontend/src/components/diaries/PhotoCaptureOffline.js`

```javascript
import React, { useState, useRef } from 'react';
import Compressor from 'compressorjs';

const PhotoCaptureOffline = ({ 
  onPhotoCaptured, 
  maxPhotos = 5,
  mandatory = false,
  isOffline 
}) => {
  const [photos, setPhotos] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef(null);

  // Compress photo to reduce size for offline storage
  const compressPhoto = (file) => {
    return new Promise((resolve, reject) => {
      new Compressor(file, {
        quality: 0.6,
        maxWidth: 1920,
        maxHeight: 1920,
        success: (compressedFile) => {
          // Convert to base64 for IndexedDB storage
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(compressedFile);
        },
        error: reject
      });
    });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setCapturing(true);

    try {
      const compressedPhotos = await Promise.all(
        files.map(async (file) => {
          const base64 = await compressPhoto(file);
          return {
            id: `photo_${Date.now()}_${Math.random()}`,
            base64: base64,
            filename: file.name,
            size: base64.length,
            timestamp: new Date().toISOString(),
            synced: false
          };
        })
      );

      const newPhotos = [...photos, ...compressedPhotos];
      setPhotos(newPhotos);
      onPhotoCaptured(newPhotos);
    } catch (error) {
      console.error('Error compressing photos:', error);
      alert('Failed to process photos');
    } finally {
      setCapturing(false);
    }
  };

  const handleRemovePhoto = (photoId) => {
    const newPhotos = photos.filter(p => p.id !== photoId);
    setPhotos(newPhotos);
    onPhotoCaptured(newPhotos);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          📸 Photos
          {mandatory && (
            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              REQUIRED
            </span>
          )}
          {isOffline && (
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              Stored offline
            </span>
          )}
        </label>
        <span className="text-xs text-gray-500">
          {photos.length} / {maxPhotos} photos
        </span>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.base64}
              alt="Captured"
              className="w-full h-24 object-cover rounded-lg border border-gray-200"
            />
            <button
              onClick={() => handleRemovePhoto(photo.id)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
            {!photo.synced && (
              <div className="absolute bottom-1 left-1 bg-yellow-500 text-white text-xs px-1 rounded">
                ⏳
              </div>
            )}
          </div>
        ))}

        {/* Add Photo Button */}
        {photos.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={capturing}
            className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            {capturing ? (
              <span className="text-xs text-gray-500">Processing...</span>
            ) : (
              <>
                <span className="text-2xl text-gray-400">+</span>
                <span className="text-xs text-gray-500 mt-1">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Validation Message */}
      {mandatory && photos.length === 0 && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          ⚠️ At least one photo is required
        </p>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default PhotoCaptureOffline;
```

---

### **Step 4: Delay Event Auto-Suggestion (0.5 hours)**

**File:** `frontend/src/components/diaries/DelayEventSuggestion.js`

```javascript
import React from 'react';

const DelayEventSuggestion = ({ 
  weatherObservations, 
  onCreateDelayEvent, 
  onDismiss 
}) => {
  // Check if we should suggest delay event
  const shouldSuggest = () => {
    // Check 1: Work stoppage > 1 hour
    const longStoppage = weatherObservations.some(
      obs => obs.work_stoppage && obs.work_stoppage_duration_minutes > 60
    );

    // Check 2: Multiple work stoppages in one day
    const multipleStoppages = weatherObservations.filter(
      obs => obs.work_stoppage
    ).length > 1;

    return longStoppage || multipleStoppages;
  };

  if (!shouldSuggest()) return null;

  // Calculate total delay
  const totalDelayMinutes = weatherObservations
    .filter(obs => obs.work_stoppage)
    .reduce((sum, obs) => sum + (obs.work_stoppage_duration_minutes || 0), 0);

  const affectedActivities = [
    ...new Set(
      weatherObservations
        .filter(obs => obs.work_stoppage)
        .flatMap(obs => obs.affected_activities || [])
    )
  ];

  return (
    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mt-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-bold text-orange-900 mb-2">
            Delay Event Suggested
          </h4>
          <p className="text-sm text-orange-800 mb-3">
            Significant weather delay detected. Would you like to create a delay 
            event for potential EOT claim?
          </p>

          <div className="bg-white rounded p-3 mb-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Delay:</span>
              <span className="font-semibold text-gray-900">
                {totalDelayMinutes} minutes ({(totalDelayMinutes / 60).toFixed(1)} hours)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stoppages:</span>
              <span className="font-semibold text-gray-900">
                {weatherObservations.filter(obs => obs.work_stoppage).length} times
              </span>
            </div>
            {affectedActivities.length > 0 && (
              <div>
                <span className="text-gray-600">Affected Activities:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {affectedActivities.map((activity, i) => (
                    <span
                      key={i}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {activity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onCreateDelayEvent({
                totalDelayMinutes,
                affectedActivities,
                weatherObservations
              })}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
            >
              Create Delay Event
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DelayEventSuggestion;
```

---

*[Continued in next message due to length...]*

---

**PHASE 2 STATUS:** 📝 **IN PROGRESS**  
**Current:** Step 4 of 7 complete  
**Time Invested:** ~2 hours  
**Remaining:** ~2-3 hours  

Should I continue with Steps 5-7 (Responsive layouts, Sync service, Main diary form)?
