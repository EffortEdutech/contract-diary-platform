/**
 * DIARY PHOTO SERVICE
 * Handles all photo operations for daily work diaries
 * Includes upload, retrieval, deletion, and storage management
 * 
 * Phase 3B: Photo Upload Module
 * Created: 2026-01-01
 */

import { supabase } from '../lib/supabase';

// ============================================
// CONSTANTS
// ============================================

export const PHOTO_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  BUCKET_NAME: 'diary-photos',
  COMPRESSION_MAX_SIZE_MB: 1, // Compress to max 1MB
  COMPRESSION_MAX_WIDTH_HEIGHT: 1920 // Max dimension
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize filename for storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (filename) => {
  const timestamp = Date.now();
  const name = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  return `${timestamp}_${name}`;
};

/**
 * Generate storage path for photo
 * @param {string} userId - User UUID
 * @param {string} diaryId - Diary UUID
 * @param {string} filename - Sanitized filename
 * @returns {string} - Full storage path
 */
const generateStoragePath = (userId, diaryId, filename) => {
  return `${userId}/${diaryId}/${filename}`;
};

/**
 * Validate file before upload
 * @param {File} file - File object
 * @returns {object} - { valid: boolean, error: string }
 */
export const validatePhotoFile = (file) => {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > PHOTO_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = PHOTO_CONFIG.MAX_FILE_SIZE / 1024 / 1024;
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  if (!PHOTO_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!PHOTO_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: 'Invalid file extension' };
  }

  return { valid: true, error: null };
};

// ============================================
// UPLOAD OPERATIONS
// ============================================

/**
 * Upload photo to Supabase storage and create database record
 * @param {string} diaryId - Diary UUID
 * @param {File} file - File object to upload
 * @param {string} caption - Optional photo caption
 * @returns {Promise<object>} - Photo record
 */
export const uploadPhoto = async (diaryId, file, caption = null) => {
  try {
    console.log('Starting photo upload for diary:', diaryId);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Validate file
    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);

    // Generate storage path
    const storagePath = generateStoragePath(user.id, diaryId, sanitizedFilename);

    console.log('Uploading to storage path:', storagePath);

    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from(PHOTO_CONFIG.BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) throw storageError;

    console.log('Photo uploaded to storage successfully');

    // Get the next display order
    const { data: existingPhotos } = await supabase
      .from('diary_photos')
      .select('display_order')
      .eq('diary_id', diaryId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingPhotos && existingPhotos.length > 0 
      ? existingPhotos[0].display_order + 1 
      : 0;

    // Create database record
    const { data: photoData, error: dbError } = await supabase
      .from('diary_photos')
      .insert([{
        diary_id: diaryId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption,
        display_order: nextOrder,
        uploaded_by: user.id
      }])
      .select()
      .single();

    if (dbError) {
      // Rollback: Delete uploaded file from storage
      await supabase.storage
        .from(PHOTO_CONFIG.BUCKET_NAME)
        .remove([storagePath]);
      
      throw dbError;
    }

    console.log('Photo record created in database:', photoData.id);
    return photoData;

  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

/**
 * Upload multiple photos at once
 * @param {string} diaryId - Diary UUID
 * @param {File[]} files - Array of file objects
 * @returns {Promise<object>} - { successful: [], failed: [] }
 */
export const uploadMultiplePhotos = async (diaryId, files) => {
  const results = {
    successful: [],
    failed: []
  };

  for (const file of files) {
    try {
      const photo = await uploadPhoto(diaryId, file);
      results.successful.push({ file: file.name, photo });
    } catch (error) {
      results.failed.push({ file: file.name, error: error.message });
    }
  }

  return results;
};

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all photos for a diary
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<array>} - Array of photo objects with URLs
 */
export const getPhotos = async (diaryId) => {
  try {
    console.log('Fetching photos for diary:', diaryId);

    const { data, error } = await supabase
      .from('diary_photos')
      .select('*')
      .eq('diary_id', diaryId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Generate signed URLs for each photo
    const photosWithUrls = await Promise.all(
      data.map(async (photo) => {
        const url = await getPhotoUrl(photo.storage_path);
        return {
          ...photo,
          url
        };
      })
    );

    console.log(`Retrieved ${photosWithUrls.length} photos for diary ${diaryId}`);
    return photosWithUrls;

  } catch (error) {
    console.error('Error fetching photos:', error);
    throw error;
  }
};

/**
 * Get single photo by ID
 * @param {string} photoId - Photo UUID
 * @returns {Promise<object>} - Photo object with URL
 */
export const getPhotoById = async (photoId) => {
  try {
    const { data, error } = await supabase
      .from('diary_photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (error) throw error;

    // Generate signed URL
    const url = await getPhotoUrl(data.storage_path);

    return {
      ...data,
      url
    };

  } catch (error) {
    console.error('Error fetching photo:', error);
    throw error;
  }
};

/**
 * Get signed URL for photo
 * @param {string} storagePath - Storage path
 * @param {number} expiresIn - URL expiration in seconds (default: 3600)
 * @returns {Promise<string>} - Signed URL
 */
export const getPhotoUrl = async (storagePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase
      .storage
      .from(PHOTO_CONFIG.BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error) throw error;

    return data.signedUrl;

  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

// ============================================
// UPDATE OPERATIONS
// ============================================

/**
 * Update photo caption
 * @param {string} photoId - Photo UUID
 * @param {string} caption - New caption
 * @returns {Promise<object>} - Updated photo object
 */
export const updatePhotoCaption = async (photoId, caption) => {
  try {
    const { data, error } = await supabase
      .from('diary_photos')
      .update({ caption })
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;

    console.log('Photo caption updated:', photoId);
    return data;

  } catch (error) {
    console.error('Error updating photo caption:', error);
    throw error;
  }
};

/**
 * Reorder photos
 * @param {string} diaryId - Diary UUID
 * @param {string[]} photoIds - Array of photo IDs in new order
 * @returns {Promise<boolean>} - Success status
 */
export const reorderPhotos = async (diaryId, photoIds) => {
  try {
    // Update display_order for each photo
    const updates = photoIds.map((photoId, index) => ({
      id: photoId,
      display_order: index
    }));

    for (const update of updates) {
      await supabase
        .from('diary_photos')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
        .eq('diary_id', diaryId); // Extra safety check
    }

    console.log('Photos reordered successfully');
    return true;

  } catch (error) {
    console.error('Error reordering photos:', error);
    throw error;
  }
};

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete photo (draft diaries only)
 * @param {string} photoId - Photo UUID
 * @returns {Promise<boolean>} - Success status
 */
export const deletePhoto = async (photoId) => {
  try {
    console.log('Deleting photo:', photoId);

    // Get photo details
    const { data: photo, error: fetchError } = await supabase
      .from('diary_photos')
      .select('*, work_diaries!inner(status, created_by)')
      .eq('id', photoId)
      .single();

    if (fetchError) throw fetchError;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify user owns the photo
    if (photo.uploaded_by !== user.id) {
      throw new Error('You can only delete your own photos');
    }

    // Verify diary is in draft status
    if (photo.work_diaries.status !== 'draft') {
      throw new Error('Photos can only be deleted from draft diaries');
    }

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

    console.log('Photo deleted successfully:', photoId);
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

    console.log(`Deleted ${deletedCount} photos for diary ${diaryId}`);
    return deletedCount;

  } catch (error) {
    console.error('Error deleting all photos:', error);
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
export const getPhotoStatistics = async (diaryId) => {
  try {
    const { data, error } = await supabase
      .from('diary_photos')
      .select('file_size')
      .eq('diary_id', diaryId);

    if (error) throw error;

    const totalPhotos = data.length;
    const totalSize = data.reduce((sum, photo) => sum + photo.file_size, 0);
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

    return {
      totalPhotos,
      totalSize,
      totalSizeMB
    };

  } catch (error) {
    console.error('Error fetching photo statistics:', error);
    throw error;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Download photo
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

    console.log('Photo downloaded:', filename);

  } catch (error) {
    console.error('Error downloading photo:', error);
    throw error;
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  // Upload
  uploadPhoto,
  uploadMultiplePhotos,
  
  // Read
  getPhotos,
  getPhotoById,
  getPhotoUrl,
  
  // Update
  updatePhotoCaption,
  reorderPhotos,
  
  // Delete
  deletePhoto,
  deleteAllPhotosForDiary,
  
  // Statistics
  getPhotoStatistics,
  
  // Utility
  validatePhotoFile,
  downloadPhoto,
  
  // Constants
  PHOTO_CONFIG
};
