// ============================================================================
// DIARY PHOTO SERVICE - Enhanced with Weather Observation Support
// ============================================================================
// Session 16 Update: Added weather photo linking capabilities
// Maintains backward compatibility with existing photo operations
// ============================================================================

import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const PHOTO_CONFIG = {
  BUCKET_NAME: 'diary-photos',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  COMPRESSION_QUALITY: 0.8,
  THUMBNAIL_SIZE: 300,
};

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Upload a general diary photo (backward compatible)
 * @param {string} diaryId - Diary UUID
 * @param {File} file - Image file
 * @param {string} caption - Optional caption
 * @param {string} userId - User UUID
 * @returns {Promise<object>} - Uploaded photo record
 */
export const uploadPhoto = async (diaryId, file, caption = '', userId) => {
  try {
    console.log('Uploading photo to diary:', diaryId);

    // Validate file
    if (!PHOTO_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    if (file.size > PHOTO_CONFIG.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit.');
    }

    // Generate unique file path
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    const storagePath = `${diaryId}/${timestamp}_${randomStr}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(PHOTO_CONFIG.BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Save to database
    const { data: photoRecord, error: dbError } = await supabase
      .from('diary_photos')
      .insert({
        diary_id: diaryId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
        uploaded_by: userId,
        weather_observation_id: null // General photo, not weather-linked
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: Delete from storage
      await supabase.storage.from(PHOTO_CONFIG.BUCKET_NAME).remove([storagePath]);
      throw dbError;
    }

    console.log('✅ Photo uploaded successfully:', photoRecord.id);
    return photoRecord;

  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

/**
 * Upload a weather observation photo (NEW in Session 16)
 * @param {string} diaryId - Diary UUID
 * @param {string} weatherObservationId - Weather observation UUID
 * @param {File} file - Image file
 * @param {string} autoCaption - Auto-generated caption
 * @param {string} userId - User UUID
 * @returns {Promise<object>} - Uploaded photo record
 */
export const uploadWeatherPhoto = async (
  diaryId, 
  weatherObservationId, 
  file, 
  autoCaption, 
  userId
) => {
  try {
    console.log('Uploading weather photo:', { diaryId, weatherObservationId, userId });

    // Validate file
    if (!PHOTO_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    if (file.size > PHOTO_CONFIG.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit.');
    }

    // Note: Skip weather observation verification to avoid RLS issues
    // The foreign key constraint will validate the observation_id exists
    console.log('Uploading weather photo:', { diaryId, weatherObservationId });

    // Generate unique file path (in weather subfolder for organization)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    const storagePath = `${diaryId}/weather/${timestamp}_${randomStr}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(PHOTO_CONFIG.BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Save to database with weather observation link
    const { data: photoRecord, error: dbError } = await supabase
      .from('diary_photos')
      .insert({
        diary_id: diaryId,
        weather_observation_id: weatherObservationId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: autoCaption,
        uploaded_by: userId
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: Delete from storage
      await supabase.storage.from(PHOTO_CONFIG.BUCKET_NAME).remove([storagePath]);
      throw dbError;
    }

    console.log('✅ Weather photo uploaded successfully:', photoRecord.id);
    return photoRecord;

  } catch (error) {
    console.error('Error uploading weather photo:', error);
    throw error;
  }
};

// ============================================
// RETRIEVAL FUNCTIONS
// ============================================

/**
 * Get all photos for a diary (backward compatible)
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<Array>} - Array of photo objects with URLs
 */
export const getPhotos = async (diaryId) => {
  try {
    const { data: photos, error } = await supabase
      .from('diary_photos')
      .select('*')
      .eq('diary_id', diaryId)
      .order('uploaded_at', { ascending: true });

    if (error) throw error;

    // Generate public URLs for each photo
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await getPhotoUrl(photo.storage_path);
        return { ...photo, url };
      })
    );

    return photosWithUrls;

  } catch (error) {
    console.error('Error fetching photos:', error);
    throw error;
  }
};

/**
 * Get photos for a specific weather observation (NEW in Session 16)
 * @param {string} weatherObservationId - Weather observation UUID
 * @returns {Promise<Array>} - Array of photo objects with URLs
 */
export const getWeatherPhotos = async (weatherObservationId) => {
  try {
    const { data: photos, error } = await supabase
      .from('diary_photos')
      .select('*')
      .eq('weather_observation_id', weatherObservationId)
      .order('uploaded_at', { ascending: true });

    if (error) throw error;

    // Generate public URLs for each photo
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await getPhotoUrl(photo.storage_path);
        return { ...photo, url };
      })
    );

    console.log(`✅ Loaded ${photosWithUrls.length} weather photos`);
    return photosWithUrls;

  } catch (error) {
    console.error('Error fetching weather photos:', error);
    throw error;
  }
};

/**
 * Get photos grouped by type (weather vs general) - NEW in Session 16
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<object>} - Object with weatherPhotos and generalPhotos arrays
 */
export const getPhotosGroupedByType = async (diaryId) => {
  try {
    // Get all photos for the diary
    const allPhotos = await getPhotos(diaryId);

    // Group by type
    const weatherPhotos = allPhotos.filter(photo => photo.weather_observation_id !== null);
    const generalPhotos = allPhotos.filter(photo => photo.weather_observation_id === null);

    console.log(`✅ Grouped photos: ${weatherPhotos.length} weather, ${generalPhotos.length} general`);

    return {
      weatherPhotos,
      generalPhotos,
      totalPhotos: allPhotos.length
    };

  } catch (error) {
    console.error('Error grouping photos:', error);
    throw error;
  }
};

/**
 * Get photo URL from storage
 * @param {string} storagePath - Storage path
 * @returns {Promise<string>} - Public URL
 */
export const getPhotoUrl = async (storagePath) => {
  try {
    const { data, error } = await supabase
      .storage
      .from(PHOTO_CONFIG.BUCKET_NAME)
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;

  } catch (error) {
    console.error('Error getting photo URL:', error);
    return null;
  }
};

/**
 * Get single photo by ID
 * @param {string} photoId - Photo UUID
 * @returns {Promise<object>} - Photo object with URL
 */
export const getPhotoById = async (photoId) => {
  try {
    const { data: photo, error } = await supabase
      .from('diary_photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (error) throw error;

    const url = await getPhotoUrl(photo.storage_path);
    return { ...photo, url };

  } catch (error) {
    console.error('Error fetching photo by ID:', error);
    throw error;
  }
};

// ============================================
// UPDATE FUNCTIONS
// ============================================

/**
 * Update photo caption
 * @param {string} photoId - Photo UUID
 * @param {string} caption - New caption
 * @returns {Promise<object>} - Updated photo record
 */
export const updatePhotoCaption = async (photoId, caption) => {
  try {
    const { data, error } = await supabase
      .from('diary_photos')
      .update({ 
        caption,
        updated_at: new Date().toISOString()
      })
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Photo caption updated:', photoId);
    return data;

  } catch (error) {
    console.error('Error updating photo caption:', error);
    throw error;
  }
};

/**
 * Update photo display order
 * @param {string} diaryId - Diary UUID
 * @param {Array<string>} photoIds - Ordered array of photo IDs
 * @returns {Promise<boolean>} - Success status
 */
export const reorderPhotos = async (diaryId, photoIds) => {
  try {
    // Update display_order for each photo
    const updates = photoIds.map((photoId, index) => 
      supabase
        .from('diary_photos')
        .update({ display_order: index })
        .eq('id', photoId)
        .eq('diary_id', diaryId)
    );

    await Promise.all(updates);

    console.log('✅ Photos reordered successfully');
    return true;

  } catch (error) {
    console.error('Error reordering photos:', error);
    throw error;
  }
};

// ============================================
// DELETE FUNCTIONS
// ============================================

/**
 * Delete a photo
 * @param {string} photoId - Photo UUID
 * @returns {Promise<boolean>} - Success status
 */
export const deletePhoto = async (photoId) => {
  try {
    // Get photo record
    const { data: photo, error: fetchError } = await supabase
      .from('diary_photos')
      .select('storage_path, uploaded_by, diary_id')
      .eq('id', photoId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from(PHOTO_CONFIG.BUCKET_NAME)
      .remove([photo.storage_path]);

    if (storageError) {
      console.warn('Warning: Could not delete from storage:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('diary_photos')
      .delete()
      .eq('id', photoId);

    if (dbError) throw dbError;

    console.log('✅ Photo deleted successfully:', photoId);
    return true;

  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
};

/**
 * Delete all photos for a diary
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<number>} - Number of photos deleted
 */
export const deleteAllPhotosForDiary = async (diaryId) => {
  try {
    // Get all photos
    const photos = await getPhotos(diaryId);

    // Delete each photo
    let deletedCount = 0;
    for (const photo of photos) {
      try {
        await deletePhoto(photo.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete photo ${photo.id}:`, error);
      }
    }

    console.log(`✅ Deleted ${deletedCount} photos for diary ${diaryId}`);
    return deletedCount;

  } catch (error) {
    console.error('Error deleting all photos:', error);
    throw error;
  }
};

/**
 * Delete all weather photos for a weather observation (NEW in Session 16)
 * @param {string} weatherObservationId - Weather observation UUID
 * @returns {Promise<number>} - Number of photos deleted
 */
export const deleteWeatherPhotos = async (weatherObservationId) => {
  try {
    // Get all weather photos
    const photos = await getWeatherPhotos(weatherObservationId);

    // Delete each photo
    let deletedCount = 0;
    for (const photo of photos) {
      try {
        await deletePhoto(photo.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete photo ${photo.id}:`, error);
      }
    }

    console.log(`✅ Deleted ${deletedCount} weather photos`);
    return deletedCount;

  } catch (error) {
    console.error('Error deleting weather photos:', error);
    throw error;
  }
};

// ============================================
// STATISTICS
// ============================================

/**
 * Get photo statistics for a diary
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<object>} - Statistics object
 */
export const getPhotoStats = async (diaryId) => {
  try {
    const { weatherPhotos, generalPhotos, totalPhotos } = 
      await getPhotosGroupedByType(diaryId);

    const stats = {
      total: totalPhotos,
      weather: weatherPhotos.length,
      general: generalPhotos.length,
      totalSize: 0,
      averageSize: 0
    };

    // Calculate total size
    const allPhotos = [...weatherPhotos, ...generalPhotos];
    stats.totalSize = allPhotos.reduce((sum, photo) => sum + (photo.file_size || 0), 0);
    stats.averageSize = totalPhotos > 0 ? Math.round(stats.totalSize / totalPhotos) : 0;

    return stats;

  } catch (error) {
    console.error('Error getting photo stats:', error);
    throw error;
  }
};

/**
 * Get weather photo count for a weather observation (NEW in Session 16)
 * @param {string} weatherObservationId - Weather observation UUID
 * @returns {Promise<number>} - Photo count
 */
export const getWeatherPhotoCount = async (weatherObservationId) => {
  try {
    const { data, error } = await supabase
      .from('diary_photos')
      .select('id', { count: 'exact', head: true })
      .eq('weather_observation_id', weatherObservationId);

    if (error) throw error;

    return data?.length || 0;

  } catch (error) {
    console.error('Error getting weather photo count:', error);
    return 0;
  }
};

// ============================================
// VALIDATION
// ============================================

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {object} - Validation result
 */
export const validateFile = (file) => {
  const errors = [];

  if (!PHOTO_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    errors.push('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }

  if (file.size > PHOTO_CONFIG.MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${PHOTO_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================
// DOWNLOAD FUNCTION
// ============================================

/**
 * Download a photo
 * @param {string} storagePath - Storage path
 * @param {string} filename - Filename for download
 */
export const downloadPhoto = async (storagePath, filename) => {
  try {
    const { data, error } = await supabase
      .storage
      .from(PHOTO_CONFIG.BUCKET_NAME)
      .download(storagePath);

    if (error) throw error;

    // Create download link
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ Photo downloaded:', filename);

  } catch (error) {
    console.error('Error downloading photo:', error);
    throw error;
  }
};

// ============================================
// BATCH UPLOAD FUNCTION
// ============================================

/**
 * Upload multiple photos (backward compatibility)
 * @param {string} diaryId - Diary UUID
 * @param {string} contractId - Contract UUID  
 * @param {Array} photoFiles - Array of {file, caption} objects
 * @param {string} userId - User UUID
 * @returns {Promise<object>} - {successful: [], failed: []}
 */
export const uploadPhotos = async (diaryId, contractId, photoFiles, userId) => {
  const results = {
    successful: [],
    failed: []
  };

  for (const photoFile of photoFiles) {
    try {
      const record = await uploadPhoto(
        diaryId, 
        photoFile.file, 
        photoFile.caption || '', 
        userId
      );
      results.successful.push(record);
    } catch (error) {
      console.error(`Failed to upload ${photoFile.file.name}:`, error);
      results.failed.push(photoFile.file.name);
    }
  }

  return results;
};

// ============================================
// EXPORTS
// ============================================

export default {
  // Upload
  uploadPhoto,
  uploadPhotos, // NEW - for batch uploads
  uploadWeatherPhoto, // NEW
  
  // Retrieval
  getPhotos,
  getWeatherPhotos, // NEW
  getPhotosGroupedByType, // NEW
  getPhotoUrl,
  getPhotoById,
  
  // Update
  updatePhotoCaption,
  reorderPhotos,
  
  // Delete
  deletePhoto,
  deleteAllPhotosForDiary,
  deleteWeatherPhotos, // NEW
  
  // Download
  downloadPhoto, // NEW
  
  // Statistics
  getPhotoStats,
  getWeatherPhotoCount, // NEW
  
  // Validation
  validateFile,
  
  // Config
  PHOTO_CONFIG
};

// ============================================
// NAMED EXPORTS FOR CONVENIENCE
// ============================================

export { PHOTO_CONFIG };
