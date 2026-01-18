// ============================================================================
// WEATHEROBSERVATIONCARD.JS - COMPLETE REDESIGN
// ============================================================================
// Shows BOTH existing photos (from database) AND pending photos (to be uploaded)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { getWeatherPhotos, deletePhoto } from '../../services/diaryPhotoService';

const WeatherObservationCard = ({ 
  observation,
  diaryId,
  onEdit,
  onDelete,
  userId,
  isDraft = true,
  
  // ✅ NEW PROPS for pending photos
  pendingPhotos = [],           // File[] from parent state
  onAddPhotos,                  // (observationId, files) => void
  onRemovePendingPhoto          // (observationId, photoIndex) => void
}) => {
  
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // Existing photos from database
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  
  // UI states
  const [expandPhotos, setExpandPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  // ============================================
  // LOAD EXISTING PHOTOS ON MOUNT
  // ============================================
  
  useEffect(() => {
    if (observation?.id && !observation.id.startsWith('weather_')) {
      loadExistingPhotos();
    }
  }, [observation?.id]);

  const loadExistingPhotos = async () => {
    if (!observation?.id || observation.id.startsWith('weather_')) {
      // Temp observation - no existing photos in database
      setExistingPhotos([]);
      return;
    }
    
    try {
      setLoadingExisting(true);
      const photos = await getWeatherPhotos(observation.id);
      setExistingPhotos(photos);
      console.log(`✅ Loaded ${photos.length} existing photos for observation:`, observation.id);
    } catch (error) {
      console.error('Error loading existing photos:', error);
      setExistingPhotos([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  // ============================================
  // VALIDATION
  // ============================================
  
  if (!observation || !observation.id) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ Weather observation data not available
        </p>
      </div>
    );
  }

  // ============================================
  // PHOTO HANDLERS
  // ============================================
  
  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (onAddPhotos) {
      onAddPhotos(observation.id, files);
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleDeleteExisting = async (photoId) => {
    if (!window.confirm('Delete this photo from database?')) return;
    
    try {
      setDeletingPhotoId(photoId);
      await deletePhoto(photoId);
      
      // Reload existing photos
      await loadExistingPhotos();
      
      console.log('✅ Deleted existing photo:', photoId);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo: ' + error.message);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleDeletePending = (photoIndex) => {
    if (!window.confirm('Remove this pending photo?')) return;
    
    if (onRemovePendingPhoto) {
      onRemovePendingPhoto(observation.id, photoIndex);
    }
  };

  // ============================================
  // COMBINE PHOTOS FOR DISPLAY
  // ============================================
  
  // Transform existing photos
  const existingPhotoItems = existingPhotos.map(photo => ({
    type: 'existing',
    id: photo.id,
    url: photo.url,
    caption: photo.caption,
    uploaded_at: photo.uploaded_at
  }));
  
  // Transform pending photos with blob URLs
  const pendingPhotoItems = (pendingPhotos || []).map((file, index) => ({
    type: 'pending',
    id: `pending_${index}`,
    url: URL.createObjectURL(file),
    file: file,
    index: index,
    caption: 'Pending upload...'
  }));
  
  // Combine all photos
  const allPhotos = [...existingPhotoItems, ...pendingPhotoItems];
  const totalPhotoCount = allPhotos.length;
  
  // For collapsed view, show first 4
  const photosToDisplay = expandPhotos ? allPhotos : allPhotos.slice(0, 4);
  const hasMorePhotos = allPhotos.length > 4;

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatWeatherCondition = (condition) => {
    if (!condition) return 'Unknown';
    return condition
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-2xl">{getWeatherIcon(observation.weather_condition)}</span>
            <h4 className="font-semibold text-gray-900">
              {formatWeatherCondition(observation.weather_condition)}
            </h4>
          </div>
          <p className="text-sm text-gray-600">
            Time: {formatTime(observation.observation_time)}
          </p>
        </div>
        
        {/* Action Buttons */}
        {isDraft && onEdit && onDelete && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(observation)}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(observation.id)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Weather Details */}
      {(observation.temperature || observation.humidity) && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          {observation.temperature && (
            <div>
              <span className="text-gray-600">Temperature:</span>{' '}
              <span className="font-medium">{observation.temperature}°C</span>
            </div>
          )}
          {observation.humidity && (
            <div>
              <span className="text-gray-600">Humidity:</span>{' '}
              <span className="font-medium">{observation.humidity}%</span>
            </div>
          )}
        </div>
      )}

      {/* Work Stoppage Alert */}
      {observation.work_stoppage && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-amber-600 mr-2">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Work Stoppage</p>
              {observation.work_stoppage_duration_minutes && (
                <p className="text-sm text-amber-800">
                  Duration: {observation.work_stoppage_duration_minutes} minutes
                </p>
              )}
              {observation.affected_activities && observation.affected_activities.length > 0 && (
                <div className="mt-1">
                  <p className="text-sm text-amber-800">Affected activities:</p>
                  <ul className="list-disc list-inside text-sm text-amber-700 mt-1">
                    {observation.affected_activities.map((activity, idx) => (
                      <li key={idx}>{activity}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remarks */}
      {observation.remarks && (
        <div className="mb-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Remarks:</span> {observation.remarks}
          </p>
        </div>
      )}

      {/* ============================================ */}
      {/* WEATHER PHOTOS SECTION */}
      {/* ============================================ */}
      
      <div className="border-t border-gray-200 pt-3 mt-3">
        {/* Header with Photo Count */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📸</span>
            <h5 className="font-medium text-gray-900">
              Weather Photos
              {totalPhotoCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {totalPhotoCount}
                </span>
              )}
            </h5>
          </div>
          
          {/* Add Photos Button */}
          {isDraft && (
            <div>
              <input
                type="file"
                id={`photo-upload-${observation.id}`}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor={`photo-upload-${observation.id}`}
                className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 cursor-pointer"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Photos
              </label>
            </div>
          )}
        </div>

        {/* Photo Summary (if photos exist) */}
        {totalPhotoCount > 0 && (
          <div className="mb-2">
            <p className="text-xs text-gray-600">
              {existingPhotos.length > 0 && `${existingPhotos.length} saved`}
              {existingPhotos.length > 0 && pendingPhotos.length > 0 && ' • '}
              {pendingPhotos.length > 0 && (
                <span className="text-blue-600 font-medium">
                  {pendingPhotos.length} pending (will upload on save)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Photos Display */}
        {loadingExisting ? (
          <div className="text-center py-4 text-gray-500">
            Loading photos...
          </div>
        ) : totalPhotoCount === 0 ? (
          <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">No photos yet</p>
            {isDraft && (
              <p className="text-xs text-gray-400 mt-1">
                Click "Add Photos" to attach weather photos
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Photo Grid */}
            <div className="grid grid-cols-4 gap-2">
              {photosToDisplay.map((photo) => (
                <div key={photo.id} className="relative group">
                  {/* Photo Image */}
                  <div 
                    className={`
                      aspect-square rounded-lg overflow-hidden cursor-pointer
                      ${photo.type === 'pending' 
                        ? 'border-2 border-dashed border-blue-300' 
                        : 'border border-gray-300'
                      }
                    `}
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Type Badge */}
                  {photo.type === 'pending' && (
                    <div className="absolute top-1 left-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Pending
                      </span>
                    </div>
                  )}

                  {/* Delete Button */}
                  {isDraft && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (photo.type === 'existing') {
                          handleDeleteExisting(photo.id);
                        } else {
                          handleDeletePending(photo.index);
                        }
                      }}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-700 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Show All Button */}
            {hasMorePhotos && (
              <button
                onClick={() => setExpandPhotos(!expandPhotos)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {expandPhotos ? 'Show Less' : `Show All (${allPhotos.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ============================================ */}
      {/* LIGHTBOX MODAL */}
      {/* ============================================ */}
      
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[80vh]">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 bg-white rounded-full p-2 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Image */}
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              className="max-w-full max-h-[80vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
              <p className="text-sm">{selectedPhoto.caption}</p>
              {selectedPhoto.type === 'pending' && (
                <p className="text-xs text-blue-300 mt-1">
                  ⏳ Pending upload - will be saved when you save the diary
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherObservationCard;
