/**
 * PHOTO GALLERY COMPONENT
 * Displays photos in a grid with lightbox viewer
 * Features: Grid layout, full-size viewing, navigation, captions, delete
 * 
 * Phase 3B: Photo Upload Module
 * Created: 2026-01-01
 */

import React, { useState, useEffect } from 'react';
import { getPhotos, deletePhoto, downloadPhoto } from '../../services/diaryPhotoService';

const PhotoGallery = ({ diaryId, canEdit = false, onPhotoDeleted }) => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [deleting, setDeleting] = useState(null);

  // ============================================
  // LOAD PHOTOS
  // ============================================

  useEffect(() => {
    loadPhotos();
  }, [diaryId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPhotos(diaryId);
      setPhotos(data);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // LIGHTBOX HANDLERS
  // ============================================

  const openLightbox = (index) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentPhotoIndex]);

  // ============================================
  // DELETE HANDLER
  // ============================================

  const handleDelete = async (photoId, photoName) => {
    if (!window.confirm(`Delete "${photoName}"?`)) return;

    try {
      setDeleting(photoId);
      await deletePhoto(photoId);
      
      // Remove from local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      
      // Close lightbox if deleting current photo
      if (lightboxOpen && photos[currentPhotoIndex]?.id === photoId) {
        closeLightbox();
      }

      // Notify parent
      if (onPhotoDeleted) {
        onPhotoDeleted(photoId);
      }

    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Failed to delete photo: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  // ============================================
  // DOWNLOAD HANDLER
  // ============================================

  const handleDownload = async (photo) => {
    try {
      await downloadPhoto(photo.storage_path, photo.file_name);
    } catch (err) {
      console.error('Error downloading photo:', err);
      alert('Failed to download photo');
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600">Loading photos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="mt-2 text-sm text-gray-600">No photos yet</p>
        {canEdit && (
          <p className="text-xs text-gray-500 mt-1">Upload photos to document your work</p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            {/* Thumbnail */}
            <img
              src={photo.url}
              alt={photo.caption || photo.file_name}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />

            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>

            {/* Caption Badge */}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <p className="text-white text-xs truncate">{photo.caption}</p>
              </div>
            )}

            {/* Delete Button (if editable) */}
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(photo.id, photo.file_name);
                }}
                disabled={deleting === photo.id}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                {deleting === photo.id ? (
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Main Image */}
            <div className="bg-white rounded-lg overflow-hidden">
              <img
                src={photos[currentPhotoIndex].url}
                alt={photos[currentPhotoIndex].caption || photos[currentPhotoIndex].file_name}
                className="w-full max-h-[70vh] object-contain"
              />

              {/* Photo Info */}
              <div className="p-4 space-y-2">
                {photos[currentPhotoIndex].caption && (
                  <p className="text-lg font-medium text-gray-900">
                    {photos[currentPhotoIndex].caption}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>{photos[currentPhotoIndex].file_name}</span>
                  <span>•</span>
                  <span>{formatFileSize(photos[currentPhotoIndex].file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(photos[currentPhotoIndex].uploaded_at)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleDownload(photos[currentPhotoIndex])}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => {
                        const photo = photos[currentPhotoIndex];
                        handleDelete(photo.id, photo.file_name);
                      }}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            {photos.length > 1 && (
              <>
                {/* Previous */}
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-900 rounded-full p-3 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Next */}
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-900 rounded-full p-3 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white bg-opacity-80 text-gray-900 px-3 py-1 rounded-full text-sm font-medium">
                  {currentPhotoIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGallery;
