// ============================================================================
// WEATHEROBSERVATIONMODAL.JS - COMPLETE REDESIGN
// ============================================================================
// Adds photos to PENDING QUEUE instead of uploading immediately
// Shows existing + pending photos
// ============================================================================

import React, { useState, useEffect } from 'react';
import { getWeatherPhotos, deletePhoto } from '../../services/diaryPhotoService';

const WeatherObservationModal = ({ 
  observation, 
  diaryId, 
  diaryDate,
  userId,
  isOffline, 
  onSave, 
  onClose,
  
  // ✅ NEW PROPS for pending photos
  pendingPhotos = [],           // File[] from parent state
  onAddPhotos,                  // (observationId, files) => void
  onRemovePendingPhoto         // (observationId, photoIndex) => void
}) => {
  
  // ============================================
  // FORM DATA STATE
  // ============================================
  
  const [formData, setFormData] = useState({
    observation_time: '',
    weather_condition: '',
    temperature: '',
    humidity: '',
    rainfall_mm: '',
    wind_speed_kmh: '',
    work_stoppage: false,
    work_stoppage_duration_minutes: '',
    affected_activities: [],
    remarks: ''
  });

  // ============================================
  // PHOTO STATE
  // ============================================
  
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // ============================================
  // UI STATE
  // ============================================
  
  const [activityInput, setActivityInput] = useState('');

  // Weather condition options
  const weatherConditions = [
    { value: 'sunny', label: '☀️ Sunny' },
    { value: 'cloudy', label: '☁️ Cloudy' },
    { value: 'partly_cloudy', label: '⛅ Partly Cloudy' },
    { value: 'overcast', label: '☁️ Overcast' },
    { value: 'light_rain', label: '🌦️ Light Rain' },
    { value: 'heavy_rain', label: '⛈️ Heavy Rain' },
    { value: 'drizzle', label: '🌧️ Drizzle' },
    { value: 'thunderstorm', label: '⛈️ Thunderstorm' },
    { value: 'lightning', label: '⚡ Lightning' },
    { value: 'strong_wind', label: '💨 Strong Wind' },
    { value: 'haze', label: '🌫️ Haze' },
    { value: 'fog', label: '🌫️ Fog' }
  ];

  // ============================================
  // INITIALIZE FORM DATA & LOAD PHOTOS
  // ============================================
  
  useEffect(() => {
    if (observation) {
      // Editing existing observation
      setFormData({
        observation_time: observation.observation_time || '',
        weather_condition: observation.weather_condition || '',
        temperature: observation.temperature || '',
        humidity: observation.humidity || '',
        rainfall_mm: observation.rainfall_mm || '',
        wind_speed_kmh: observation.wind_speed_kmh || '',
        work_stoppage: observation.work_stoppage || false,
        work_stoppage_duration_minutes: observation.work_stoppage_duration_minutes || '',
        affected_activities: observation.affected_activities || [],
        remarks: observation.remarks || ''
      });

      // Load existing photos if observation has real UUID
      if (observation.id && !observation.id.startsWith('weather_')) {
        loadExistingPhotos(observation.id);
      }
    } else {
      // New observation - set default time to now
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setFormData(prev => ({
        ...prev,
        observation_time: `${hours}:${minutes}`
      }));
    }
  }, [observation]);

  const loadExistingPhotos = async (observationId) => {
    try {
      setLoadingPhotos(true);
      const photos = await getWeatherPhotos(observationId);
      setExistingPhotos(photos);
      console.log(`✅ Loaded ${photos.length} existing photos`);
    } catch (error) {
      console.error('Error loading photos:', error);
      setExistingPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // ============================================
  // FORM HANDLERS
  // ============================================
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddActivity = () => {
    if (activityInput.trim()) {
      setFormData(prev => ({
        ...prev,
        affected_activities: [...prev.affected_activities, activityInput.trim()]
      }));
      setActivityInput('');
    }
  };

  const handleRemoveActivity = (index) => {
    setFormData(prev => ({
      ...prev,
      affected_activities: prev.affected_activities.filter((_, i) => i !== index)
    }));
  };

  // ============================================
  // PHOTO HANDLERS
  // ============================================
  
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (onAddPhotos && observation) {
      onAddPhotos(observation.id, files);
      console.log(`✅ Added ${files.length} photos to pending queue`);
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleRemovePending = (photoIndex) => {
    if (!window.confirm('Remove this pending photo?')) return;
    
    if (onRemovePendingPhoto && observation) {
      onRemovePendingPhoto(observation.id, photoIndex);
    }
  };

  const handleDeleteExisting = async (photoId) => {
    if (!window.confirm('Delete this photo from database?')) return;

    try {
      await deletePhoto(photoId);
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
      console.log('✅ Photo deleted from database');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    }
  };

  // ============================================
  // SUBMIT HANDLER
  // ============================================
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.observation_time) {
      alert('Please enter observation time');
      return;
    }
    if (!formData.weather_condition) {
      alert('Please select weather condition');
      return;
    }

    try {
      // Prepare data for save
      const weatherData = {
        ...formData,
        temperature: formData.temperature ? Number(formData.temperature) : null,
        humidity: formData.humidity ? Number(formData.humidity) : null,
        rainfall_mm: formData.rainfall_mm ? Number(formData.rainfall_mm) : null,
        wind_speed_kmh: formData.wind_speed_kmh ? Number(formData.wind_speed_kmh) : null,
        work_stoppage_duration_minutes: formData.work_stoppage_duration_minutes 
          ? Number(formData.work_stoppage_duration_minutes) 
          : null
      };

      // ✅ JUST SAVE OBSERVATION DATA
      // Photos are already in pending queue - will upload on "Save as Draft"
      await onSave(weatherData);
      
      console.log('✅ Observation saved (photos in pending queue)');
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error saving observation:', error);
      alert('Failed to save observation: ' + error.message);
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  const requiresPhotos = () => {
    const mandatoryConditions = ['heavy_rain', 'thunderstorm', 'lightning'];
    return mandatoryConditions.includes(formData.weather_condition) || formData.work_stoppage;
  };

  // ============================================
  // COMBINE PHOTOS FOR DISPLAY
  // ============================================
  
  const existingPhotoItems = existingPhotos.map(photo => ({
    type: 'existing',
    id: photo.id,
    url: photo.url,
    caption: photo.caption
  }));
  
  const pendingPhotoItems = (pendingPhotos || []).map((file, index) => ({
    type: 'pending',
    id: `pending_${index}`,
    url: URL.createObjectURL(file),
    file: file,
    index: index,
    caption: 'Pending upload...'
  }));
  
  const allPhotos = [...existingPhotoItems, ...pendingPhotoItems];

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            {observation ? 'Edit' : 'Add'} Weather Observation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Time & Weather Condition */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="observation_time"
                value={formData.observation_time}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weather Condition <span className="text-red-500">*</span>
              </label>
              <select
                name="weather_condition"
                value={formData.weather_condition}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select condition</option>
                {weatherConditions.map(cond => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weather Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (°C)
              </label>
              <input
                type="number"
                name="temperature"
                value={formData.temperature}
                onChange={handleChange}
                step="0.1"
                min="0"
                max="50"
                placeholder="e.g., 28.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Humidity (%)
              </label>
              <input
                type="number"
                name="humidity"
                value={formData.humidity}
                onChange={handleChange}
                min="0"
                max="100"
                placeholder="e.g., 75"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rainfall (mm)
              </label>
              <input
                type="number"
                name="rainfall_mm"
                value={formData.rainfall_mm}
                onChange={handleChange}
                step="0.1"
                min="0"
                placeholder="e.g., 25.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wind Speed (km/h)
              </label>
              <input
                type="number"
                name="wind_speed_kmh"
                value={formData.wind_speed_kmh}
                onChange={handleChange}
                step="0.1"
                min="0"
                placeholder="e.g., 15.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Work Stoppage */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                name="work_stoppage"
                checked={formData.work_stoppage}
                onChange={handleChange}
                id="work_stoppage"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="work_stoppage" className="ml-2 text-sm font-medium text-gray-900">
                Work Stoppage Occurred
              </label>
            </div>

            {formData.work_stoppage && (
              <div className="space-y-3 pl-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="work_stoppage_duration_minutes"
                    value={formData.work_stoppage_duration_minutes}
                    onChange={handleChange}
                    min="0"
                    placeholder="e.g., 60"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Affected Activities
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={activityInput}
                      onChange={(e) => setActivityInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddActivity();
                        }
                      }}
                      placeholder="e.g., Foundation Work"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddActivity}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  
                  {formData.affected_activities.length > 0 && (
                    <div className="space-y-1">
                      {formData.affected_activities.map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200"
                        >
                          <span className="text-sm text-gray-700">{activity}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveActivity(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows="3"
              placeholder="Additional observations or notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ============================================ */}
          {/* PHOTOS SECTION */}
          {/* ============================================ */}
          
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                📸 Weather Photos
                {requiresPhotos() && (
                  <span className="ml-2 text-sm font-normal text-amber-600">
                    (Photos recommended for this condition)
                  </span>
                )}
              </h3>
            </div>

            {/* Photo Summary */}
            {allPhotos.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  {existingPhotos.length > 0 && `${existingPhotos.length} saved`}
                  {existingPhotos.length > 0 && pendingPhotos.length > 0 && ' • '}
                  {pendingPhotos.length > 0 && (
                    <span className="text-blue-600 font-medium">
                      {pendingPhotos.length} pending (will upload when you save diary)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Photo Upload Button */}
            <div className="mb-3">
              <input
                type="file"
                id="photo-upload-modal"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <label
                htmlFor="photo-upload-modal"
                className="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 cursor-pointer"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Select Photos
              </label>
            </div>

            {/* Photos Display */}
            {loadingPhotos ? (
              <div className="text-center py-4 text-gray-500">
                Loading photos...
              </div>
            ) : allPhotos.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">No photos added yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {allPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div 
                      className={`
                        aspect-square rounded-lg overflow-hidden
                        ${photo.type === 'pending' 
                          ? 'border-2 border-dashed border-blue-300' 
                          : 'border border-gray-300'
                        }
                      `}
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
                    <button
                      type="button"
                      onClick={() => {
                        if (photo.type === 'existing') {
                          handleDeleteExisting(photo.id);
                        } else {
                          handleRemovePending(photo.index);
                        }
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {observation ? 'Update' : 'Add'} Observation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WeatherObservationModal;
