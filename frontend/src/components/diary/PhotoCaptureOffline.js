// ============================================================================
// PHOTO CAPTURE OFFLINE - Camera with Offline Support
// ============================================================================
// File: frontend/src/components/diaries/PhotoCaptureOffline.js
// Purpose: Capture and compress photos for offline storage
// Note: Install compressorjs first: npm install compressorjs
// ============================================================================

import React, { useState, useRef } from 'react';

// NOTE: You need to install compressorjs
// Run: npm install compressorjs
// If not installed, photos will not be compressed (just stored as-is)

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
  const compressPhoto = async (file) => {
    return new Promise((resolve, reject) => {
      try {
        // Try to use Compressor if available
        if (typeof window.Compressor !== 'undefined') {
          new window.Compressor(file, {
            quality: 0.6,
            maxWidth: 1920,
            maxHeight: 1920,
            success: (compressedFile) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(compressedFile);
            },
            error: reject
          });
        } else {
          // Fallback: Just convert to base64 without compression
          console.warn('Compressor.js not found. Photos will not be compressed.');
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }
      } catch (error) {
        // If compression fails, fallback to direct base64
        console.error('Compression failed, using uncompressed:', error);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
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
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      console.error('Error processing photos:', error);
      alert('Failed to process photos. Please try again.');
    } finally {
      setCapturing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
              type="button"
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
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={capturing}
            className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Info Message */}
      {isOffline && photos.length > 0 && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
          📴 Photos will be uploaded when you're back online
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
