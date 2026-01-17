// ============================================================================
// SYNC SERVICE - Complete Offline-to-Online Synchronization
// ============================================================================
// File: frontend/src/services/sync/syncService.js
// Purpose: Main orchestrator for syncing offline data to Supabase
// Features: Photo upload, weather sync, conflict resolution, progress tracking
// ============================================================================

import { supabase } from '../lib/supabase';
import db, { SyncStatus } from './offlineStorage/diaryDB';
import syncQueue from './offlineStorage/syncQueue';

// ============================================================================
// SYNC SERVICE CLASS
// ============================================================================

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      currentItem: null
    };
    this.listeners = [];
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Start synchronization process
   * @returns {Promise<Object>} Sync results
   */
  async startSync() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { status: 'already_syncing' };
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'started' });

    try {
      console.log('🔄 Starting sync process...');

      // Step 1: Check online status
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      // Step 2: Get all pending items
      const pendingDiaries = await this.getPendingDiaries();
      const pendingWeather = await this.getPendingWeather();
      const pendingPhotos = await this.getPendingPhotos();
      const pendingProgrammeLinks = await this.getPendingProgrammeLinks();
      const pendingBOQLinks = await this.getPendingBOQLinks();

      const totalItems = 
        pendingDiaries.length + 
        pendingWeather.length + 
        pendingPhotos.length +
        pendingProgrammeLinks.length +
        pendingBOQLinks.length;

      this.syncProgress.total = totalItems;
      this.syncProgress.completed = 0;
      this.syncProgress.failed = 0;

      console.log(`📊 Total items to sync: ${totalItems}`);

      if (totalItems === 0) {
        console.log('✅ Nothing to sync');
        return { status: 'nothing_to_sync' };
      }

      const results = {
        diaries: { success: 0, failed: 0 },
        weather: { success: 0, failed: 0 },
        photos: { success: 0, failed: 0 },
        programmeLinks: { success: 0, failed: 0 },
        boqLinks: { success: 0, failed: 0 },
        errors: []
      };

      // Step 3: Sync in order (diaries first, then related data)
      
      // 3a. Sync diaries
      for (const diary of pendingDiaries) {
        try {
          this.syncProgress.currentItem = `Diary: ${diary.diary_date}`;
          this.notifyListeners({ ...this.syncProgress });
          
          await this.syncDiary(diary);
          results.diaries.success++;
          this.syncProgress.completed++;
        } catch (error) {
          console.error('Failed to sync diary:', error);
          results.diaries.failed++;
          results.errors.push({ type: 'diary', id: diary.id, error: error.message });
        }
      }

      // 3b. Sync weather observations
      for (const weather of pendingWeather) {
        try {
          this.syncProgress.currentItem = `Weather: ${weather.observation_time}`;
          this.notifyListeners({ ...this.syncProgress });
          
          await this.syncWeatherObservation(weather);
          results.weather.success++;
          this.syncProgress.completed++;
        } catch (error) {
          console.error('Failed to sync weather:', error);
          results.weather.failed++;
          results.errors.push({ type: 'weather', id: weather.id, error: error.message });
        }
      }

      // 3c. Sync photos (after weather, so weather records exist)
      for (const photo of pendingPhotos) {
        try {
          this.syncProgress.currentItem = `Photo: ${photo.id}`;
          this.notifyListeners({ ...this.syncProgress });
          
          await this.syncPhoto(photo);
          results.photos.success++;
          this.syncProgress.completed++;
        } catch (error) {
          console.error('Failed to sync photo:', error);
          results.photos.failed++;
          results.errors.push({ type: 'photo', id: photo.id, error: error.message });
        }
      }

      // 3d. Sync programme links
      for (const link of pendingProgrammeLinks) {
        try {
          this.syncProgress.currentItem = `Programme Link`;
          this.notifyListeners({ ...this.syncProgress });
          
          await this.syncProgrammeLink(link);
          results.programmeLinks.success++;
          this.syncProgress.completed++;
        } catch (error) {
          console.error('Failed to sync programme link:', error);
          results.programmeLinks.failed++;
          results.errors.push({ type: 'programme_link', id: link.id, error: error.message });
        }
      }

      // 3e. Sync BOQ links
      for (const link of pendingBOQLinks) {
        try {
          this.syncProgress.currentItem = `BOQ Link`;
          this.notifyListeners({ ...this.syncProgress });
          
          await this.syncBOQLink(link);
          results.boqLinks.success++;
          this.syncProgress.completed++;
        } catch (error) {
          console.error('Failed to sync BOQ link:', error);
          results.boqLinks.failed++;
          results.errors.push({ type: 'boq_link', id: link.id, error: error.message });
        }
      }

      console.log('✅ Sync completed:', results);
      this.notifyListeners({ status: 'completed', results });

      return { status: 'success', results };

    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notifyListeners({ status: 'error', error: error.message });
      return { status: 'error', error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Add listener for sync progress updates
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Notify all listeners of progress
   */
  notifyListeners(data) {
    this.listeners.forEach(callback => callback(data));
  }

  // ==========================================================================
  // GET PENDING ITEMS
  // ==========================================================================

  async getPendingDiaries() {
    return await db.diaries
      .where('sync_status')
      .equals(SyncStatus.PENDING)
      .toArray();
  }

  async getPendingWeather() {
    return await db.weather_observations
      .where('sync_status')
      .equals(SyncStatus.PENDING)
      .toArray();
  }

  async getPendingPhotos() {
    return await db.photos
      .where('sync_status')
      .equals(SyncStatus.PENDING)
      .toArray();
  }

  async getPendingProgrammeLinks() {
    return await db.diary_programme_links
      .where('sync_status')
      .equals(SyncStatus.PENDING)
      .toArray();
  }

  async getPendingBOQLinks() {
    return await db.diary_boq_links
      .where('sync_status')
      .equals(SyncStatus.PENDING)
      .toArray();
  }

  // ==========================================================================
  // SYNC INDIVIDUAL ITEMS
  // ==========================================================================

  /**
   * Sync diary to Supabase
   */
  async syncDiary(diary) {
    try {
      // Update sync status
      await db.diaries.update(diary.id, { sync_status: SyncStatus.SYNCING });

      // Prepare data for Supabase (remove local fields)
      const diaryData = {
        contract_id: diary.contract_id,
        diary_date: diary.diary_date,
        weather_conditions: diary.weather_conditions,
        temperature: diary.temperature,
        site_conditions: diary.site_conditions,
        work_progress: diary.work_progress,
        manpower: diary.manpower,
        equipment: diary.equipment,
        materials_delivered: diary.materials_delivered,
        issues_delays: diary.issues_delays,
        general_remarks: diary.general_remarks,
        status: diary.status,
        created_by: diary.created_by
      };

      // Check if diary already exists in Supabase (conflict detection)
      const { data: existing } = await supabase
        .from('work_diaries')
        .select('id, updated_at')
        .eq('contract_id', diary.contract_id)
        .eq('diary_date', diary.diary_date)
        .eq('created_by', diary.created_by)
        .single();

      if (existing) {
        // Diary exists - handle conflict
        console.log('⚠️ Diary already exists, checking for conflicts...');
        
        // For now, use last-write-wins strategy
        // In future, could prompt user for conflict resolution
        const { error } = await supabase
          .from('work_diaries')
          .update(diaryData)
          .eq('id', existing.id);

        if (error) throw error;

        // Update local diary with server ID
        await db.diaries.update(diary.id, {
          server_id: existing.id,
          sync_status: SyncStatus.SYNCED
        });

      } else {
        // Diary doesn't exist - create new
        const { data, error } = await supabase
          .from('work_diaries')
          .insert(diaryData)
          .select()
          .single();

        if (error) throw error;

        // Update local diary with server ID
        await db.diaries.update(diary.id, {
          server_id: data.id,
          sync_status: SyncStatus.SYNCED
        });
      }

      console.log('✅ Diary synced successfully');

    } catch (error) {
      // Mark as failed
      await db.diaries.update(diary.id, { sync_status: SyncStatus.FAILED });
      throw error;
    }
  }

  /**
   * Sync weather observation to Supabase
   */
  async syncWeatherObservation(weather) {
    try {
      // Update sync status
      await db.weather_observations.update(weather.id, { 
        sync_status: SyncStatus.SYNCING 
      });

      // Get diary's server ID (must be synced first)
      const diary = await db.diaries.get(weather.diary_id);
      if (!diary.server_id) {
        throw new Error('Diary must be synced before weather observations');
      }

      // Prepare data for Supabase
      const weatherData = {
        contract_id: weather.contract_id,
        diary_id: diary.server_id, // Use server ID
        observation_time: weather.observation_time,
        weather_condition: weather.weather_condition,
        temperature: weather.temperature,
        humidity: weather.humidity,
        rainfall_mm: weather.rainfall_mm,
        wind_speed_kmh: weather.wind_speed_kmh,
        work_stoppage: weather.work_stoppage,
        work_stoppage_duration_minutes: weather.work_stoppage_duration_minutes,
        affected_activities: weather.affected_activities,
        remarks: weather.remarks,
        photo_urls: weather.photo_urls || [],
        recorded_by: weather.recorded_by,
        recorded_by_name: weather.recorded_by_name
      };

      // Insert to Supabase
      const { data, error } = await supabase
        .from('weather_observations')
        .insert(weatherData)
        .select()
        .single();

      if (error) throw error;

      // Update local with server ID
      await db.weather_observations.update(weather.id, {
        server_id: data.id,
        sync_status: SyncStatus.SYNCED
      });

      console.log('✅ Weather observation synced successfully');

    } catch (error) {
      await db.weather_observations.update(weather.id, { 
        sync_status: SyncStatus.FAILED 
      });
      throw error;
    }
  }

  /**
   * Sync photo to Supabase Storage
   */
  async syncPhoto(photo) {
    try {
      // Update sync status
      await db.photos.update(photo.id, { sync_status: SyncStatus.SYNCING });

      // Get diary's server ID
      const diary = await db.diaries.get(photo.diary_id);
      if (!diary.server_id) {
        throw new Error('Diary must be synced before photos');
      }

      // Convert base64 to blob
      const response = await fetch(photo.base64);
      const blob = await response.blob();

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${diary.server_id}_${timestamp}_${photo.id}.jpg`;
      const filepath = `diaries/${diary.contract_id}/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('diary-photos')
        .upload(filepath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('diary-photos')
        .getPublicUrl(filepath);

      // Update weather observation's photo_urls if linked to weather
      if (photo.weather_observation_id) {
        const weather = await db.weather_observations.get(photo.weather_observation_id);
        if (weather && weather.server_id) {
          // Get current photo URLs
          const { data: currentWeather } = await supabase
            .from('weather_observations')
            .select('photo_urls')
            .eq('id', weather.server_id)
            .single();

          const photoUrls = currentWeather?.photo_urls || [];
          photoUrls.push(publicUrl);

          // Update weather observation with new photo URL
          await supabase
            .from('weather_observations')
            .update({ photo_urls: photoUrls })
            .eq('id', weather.server_id);
        }
      }

      // Create diary_photos record
      const { error: dbError } = await supabase
        .from('diary_photos')
        .insert({
          diary_id: diary.server_id,
          photo_url: publicUrl,
          caption: photo.caption,
          uploaded_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      // Update local photo
      await db.photos.update(photo.id, {
        public_url: publicUrl,
        sync_status: SyncStatus.SYNCED
      });

      console.log('✅ Photo synced successfully');

    } catch (error) {
      await db.photos.update(photo.id, { sync_status: SyncStatus.FAILED });
      throw error;
    }
  }

  /**
   * Sync programme link to Supabase
   */
  async syncProgrammeLink(link) {
    try {
      await db.diary_programme_links.update(link.id, { 
        sync_status: SyncStatus.SYNCING 
      });

      // Get diary's server ID
      const diary = await db.diaries.get(link.diary_id);
      if (!diary.server_id) {
        throw new Error('Diary must be synced before programme links');
      }

      const linkData = {
        diary_id: diary.server_id,
        programme_item_id: link.programme_item_id,
        progress_update: link.progress_update,
        previous_progress: link.previous_progress,
        new_progress: link.new_progress,
        activity_title: link.activity_title,
        work_description: link.work_description,
        quantity_completed: link.quantity_completed,
        unit: link.unit,
        status: link.status,
        has_issues: link.has_issues,
        issue_description: link.issue_description,
        delay_days: link.delay_days,
        created_by: link.created_by
      };

      const { data, error } = await supabase
        .from('diary_programme_links')
        .insert(linkData)
        .select()
        .single();

      if (error) throw error;

      // Update programme item's progress
      if (link.new_progress) {
        await supabase
          .from('programme_items')
          .update({ 
            percent_complete: link.new_progress,
            updated_at: new Date().toISOString()
          })
          .eq('id', link.programme_item_id);
      }

      await db.diary_programme_links.update(link.id, {
        server_id: data.id,
        sync_status: SyncStatus.SYNCED
      });

      console.log('✅ Programme link synced successfully');

    } catch (error) {
      await db.diary_programme_links.update(link.id, { 
        sync_status: SyncStatus.FAILED 
      });
      throw error;
    }
  }

  /**
   * Sync BOQ link to Supabase
   */
  async syncBOQLink(link) {
    try {
      await db.diary_boq_links.update(link.id, { 
        sync_status: SyncStatus.SYNCING 
      });

      // Get diary's server ID
      const diary = await db.diaries.get(link.diary_id);
      if (!diary.server_id) {
        throw new Error('Diary must be synced before BOQ links');
      }

      const linkData = {
        diary_id: diary.server_id,
        boq_item_id: link.boq_item_id,
        quantity_completed: link.quantity_completed,
        unit: link.unit,
        previous_cumulative: link.previous_cumulative,
        new_cumulative: link.new_cumulative,
        total_quantity: link.total_quantity,
        percent_complete: link.percent_complete,
        activity_title: link.activity_title,
        work_description: link.work_description,
        location: link.location,
        quality_verified: link.quality_verified,
        created_by: link.created_by
      };

      const { data, error } = await supabase
        .from('diary_boq_links')
        .insert(linkData)
        .select()
        .single();

      if (error) throw error;

      // Update BOQ item's cumulative quantity
      if (link.new_cumulative) {
        await supabase
          .from('boq_items')
          .update({ 
            quantity_completed: link.new_cumulative,
            updated_at: new Date().toISOString()
          })
          .eq('id', link.boq_item_id);
      }

      await db.diary_boq_links.update(link.id, {
        server_id: data.id,
        sync_status: SyncStatus.SYNCED
      });

      console.log('✅ BOQ link synced successfully');

    } catch (error) {
      await db.diary_boq_links.update(link.id, { 
        sync_status: SyncStatus.FAILED 
      });
      throw error;
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const pendingCount = await this.getPendingCount();
    const syncedCount = await this.getSyncedCount();
    const failedCount = await this.getFailedCount();

    return {
      pending: pendingCount,
      synced: syncedCount,
      failed: failedCount,
      total: pendingCount + syncedCount + failedCount,
      isSyncing: this.isSyncing
    };
  }

  async getPendingCount() {
    const diaries = await db.diaries.where('sync_status').equals(SyncStatus.PENDING).count();
    const weather = await db.weather_observations.where('sync_status').equals(SyncStatus.PENDING).count();
    const photos = await db.photos.where('sync_status').equals(SyncStatus.PENDING).count();
    return diaries + weather + photos;
  }

  async getSyncedCount() {
    const diaries = await db.diaries.where('sync_status').equals(SyncStatus.SYNCED).count();
    const weather = await db.weather_observations.where('sync_status').equals(SyncStatus.SYNCED).count();
    const photos = await db.photos.where('sync_status').equals(SyncStatus.SYNCED).count();
    return diaries + weather + photos;
  }

  async getFailedCount() {
    const diaries = await db.diaries.where('sync_status').equals(SyncStatus.FAILED).count();
    const weather = await db.weather_observations.where('sync_status').equals(SyncStatus.FAILED).count();
    const photos = await db.photos.where('sync_status').equals(SyncStatus.FAILED).count();
    return diaries + weather + photos;
  }

  /**
   * Retry failed syncs
   */
  async retryFailed() {
    // Reset failed items to pending
    await db.diaries.where('sync_status').equals(SyncStatus.FAILED)
      .modify({ sync_status: SyncStatus.PENDING });
    
    await db.weather_observations.where('sync_status').equals(SyncStatus.FAILED)
      .modify({ sync_status: SyncStatus.PENDING });
    
    await db.photos.where('sync_status').equals(SyncStatus.FAILED)
      .modify({ sync_status: SyncStatus.PENDING });

    // Start sync again
    return await this.startSync();
  }

  /**
   * Clear synced items from IndexedDB (free up space)
   */
  async clearSynced() {
    // Only delete items that are fully synced
    await db.diaries.where('sync_status').equals(SyncStatus.SYNCED).delete();
    await db.weather_observations.where('sync_status').equals(SyncStatus.SYNCED).delete();
    await db.photos.where('sync_status').equals(SyncStatus.SYNCED).delete();
    
    console.log('✅ Cleared synced items from local storage');
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const syncService = new SyncService();
export default syncService;
