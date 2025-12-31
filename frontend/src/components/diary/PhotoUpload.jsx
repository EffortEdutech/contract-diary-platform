/**
 * ENHANCED PHOTO UPLOAD COMPONENT
 * Drag & drop photo uploader for daily work diaries
 * Features: Image compression, captions, validation, preview, progress tracking
 * 
 * Phase 3B: Photo Upload Module - ENHANCED VERSION
 * Created: 2026-01-01
 * 
 * ENHANCEMENTS ADDED:
 * 1. Image compression before upload (reduces file size)
 * 2. Caption input for each photo
 * 3. Better file validation messages
 * 4. Individual upload progress tracking
 * 5. Preview with file details
 * 6. Batch operations support
 */

import React, { useState, useRef } from 'react';
import { uploadPhoto, uploadMultiplePhotos, PHOTO_CONFIG } from '../../services/diaryPhotoService';

const PhotoUpload = ({ diaryId, onUploadComplete, disabled = false }) => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [captions, setCaptions] = useState({});
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [compressing, setCompressing] = useState(false);
  
  const fileInputRef = useRef(null);

  // ============================================
  // FILE SELECTION HANDLERS
  // ============================================

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  /**
   * Handle drag over event
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragActive(true);
    }
  };

  /**
   * Handle drag leave event
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  /**
   * Handle drop event
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  /**
   * Process selected files with validation
   */
  const processFiles = (files) => {
    setError(null);
    
    // Filter image files only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const nonImageFiles = files.filter(file => !file.type.startsWith('image/'));
    
    // Show warning for non-image files
    if (nonImageFiles.length > 0) {
      setError(`${nonImageFiles.length} non-image file(s) skipped. Only images are allowed.`);
    }
    
    if (imageFiles.length === 0) {
      setError('Please select image files only (JPG, PNG, WEBP)');
      return;
    }

    // Validate file sizes
    const validFiles = [];
    const oversizedFiles = [];
    const maxSizeMB = PHOTO_CONFIG.MAX_FILE_SIZE / 1024 / 1024;

    imageFiles.forEach(file => {
      if (file.size > PHOTO_CONFIG.MAX_FILE_SIZE) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });
    
    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} file(s) exceed ${maxSizeMB}MB limit: ${oversizedFiles.slice(0, 3).join(', ')}${oversizedFiles.length > 3 ? '...' : ''}`);
      if (validFiles.length === 0) return;
    }

    // Check total file count
    if (validFiles.length > 20) {
      setError('Maximum 20 photos can be uploaded at once');
      return;
    }

    setSelectedFiles(validFiles);
    generatePreviews(validFiles);
  };

  /**
   * Generate image previews
   */
  const generatePreviews = (files) => {
    const previewPromises = files.map((file, index) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: `${Date.now()}_${index}`,
            file: file,
            name: file.name,
            size: formatFileSize(file.size),
            sizeBytes: file.size,
            preview: reader.result,
            type: file.type
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then(setPreviews);
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Update caption for a specific photo
   */
  const updateCaption = (previewId, caption) => {
    setCaptions(prev => ({
      ...prev,
      [previewId]: caption
    }));
  };

  /**
   * Remove file from selection
   */
  const removeFile = (index) => {
    const removedPreview = previews[index];
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Remove caption for this file
    const newCaptions = { ...captions };
    delete newCaptions[removedPreview.id];
    
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    setCaptions(newCaptions);
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setCaptions({});
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================
  // IMAGE COMPRESSION (OPTIONAL ENHANCEMENT)
  // ============================================

  /**
   * Compress image before upload
   * This is a basic client-side compression
   * For better compression, install 'browser-image-compression' package
   */
  const compressImage = async (file) => {
    // If file is already small, don't compress
    if (file.size < 500 * 1024) { // Less than 500KB
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if too large
          const maxDimension = 1920;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            console.log(`Compressed: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`);
            resolve(compressedFile);
          }, file.type, 0.85); // 85% quality
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // ============================================
  // UPLOAD HANDLERS
  // ============================================

  /**
   * Handle upload button click
   */
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    try {
      // Optional: Compress images before upload
      setCompressing(true);
      const compressedFiles = await Promise.all(
        selectedFiles.map(file => compressImage(file))
      );
      setCompressing(false);

      // Upload files with captions
      const uploadPromises = compressedFiles.map(async (file, index) => {
        const preview = previews[index];
        const caption = captions[preview.id] || null;
        
        try {
          const result = await uploadPhoto(diaryId, file, caption);
          setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
          return { success: true, file: file.name, result };
        } catch (error) {
          setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
          return { success: false, file: file.name, error: error.message };
        }
      });

      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log('Upload results:', { successful, failed });

      if (failed.length > 0) {
        const failedNames = failed.map(f => f.file).slice(0, 3).join(', ');
        setError(`${failed.length} photo(s) failed to upload: ${failedNames}${failed.length > 3 ? '...' : ''}`);
      }

      // Clear selection on success
      if (successful.length > 0) {
        clearSelection();
      }
      
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete({
          successful: successful.map(s => ({ file: s.file, photo: s.result })),
          failed: failed.map(f => ({ file: f.file, error: f.error }))
        });
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
      setCompressing(false);
      setUploadProgress(null);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      
      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center
          transition-colors duration-200
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        {/* Icon */}
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="text-sm text-gray-600">
          <label className="relative cursor-pointer font-medium text-blue-600 hover:text-blue-500">
            <span>Click to browse</span>
          </label>
          <p className="text-gray-500">or drag and drop photos here</p>
        </div>

        {/* File info */}
        <p className="mt-2 text-xs text-gray-500">
          PNG, JPG, WEBP up to 5MB • Max 20 photos at once
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
          <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Preview Section */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              Selected Photos ({previews.length})
              <span className="ml-2 text-xs text-gray-500">
                Total: {formatFileSize(previews.reduce((sum, p) => sum + p.sizeBytes, 0))}
              </span>
            </h4>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
              disabled={uploading}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All
            </button>
          </div>

          {/* Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previews.map((preview, index) => (
              <div
                key={preview.id}
                className="relative group bg-gray-100 rounded-lg overflow-hidden"
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="relative w-24 h-24 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                    <img
                      src={preview.preview}
                      alt={preview.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Remove Button */}
                    {!uploading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-opacity opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Details & Caption */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {preview.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {preview.size} • {preview.type.split('/')[1].toUpperCase()}
                    </p>
                    
                    {/* Caption Input */}
                    <input
                      type="text"
                      placeholder="Add caption (optional)"
                      value={captions[preview.id] || ''}
                      onChange={(e) => updateCaption(preview.id, e.target.value)}
                      disabled={uploading}
                      className="mt-2 w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compression Notice */}
          {compressing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center">
              <svg className="animate-spin h-4 w-4 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-yellow-800">
                Compressing images to optimize upload speed...
              </span>
            </div>
          )}

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Uploading photos...
                </span>
                <span className="text-sm text-blue-700">
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading || disabled || compressing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {compressing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Compressing...
                </>
              ) : uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload {previews.length} Photo{previews.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
