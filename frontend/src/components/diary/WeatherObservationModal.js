// ============================================================================
// WEATHER OBSERVATION MODAL - Add/Edit Weather Observations
// ============================================================================
// File: frontend/src/components/diaries/WeatherObservationModal.js
// Purpose: Modal for adding or editing weather observations with photo support
// ============================================================================

import React, { useState, useEffect } from 'react';
import PhotoCaptureOffline from './PhotoCaptureOffline';

const WeatherObservationModal = ({ 
  observation, 
  diaryId, 
  diaryDate,
  isOffline, 
  onSave, 
  onClose 
}) => {
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
    remarks: '',
    photo_urls: []
  });

  const [activityInput, setActivityInput] = useState('');
  const [photos, setPhotos] = useState([]);

  // Weather condition options
  const weatherConditions = [
    { value: 'sunny', label: '☀️ Sunny', icon: '☀️' },
    { value: 'cloudy', label: '☁️ Cloudy', icon: '☁️' },
    { value: 'partly_cloudy', label: '⛅ Partly Cloudy', icon: '⛅' },
    { value: 'overcast', label: '☁️ Overcast', icon: '☁️' },
    { value: 'light_rain', label: '🌦️ Light Rain', icon: '🌦️' },
    { value: 'heavy_rain', label: '⛈️ Heavy Rain', icon: '⛈️' },
    { value: 'drizzle', label: '🌧️ Drizzle', icon: '🌧️' },
    { value: 'thunderstorm', label: '⛈️ Thunderstorm', icon: '⛈️' },
    { value: 'lightning', label: '⚡ Lightning', icon: '⚡' },
    { value: 'strong_wind', label: '💨 Strong Wind', icon: '💨' },
    { value: 'haze', label: '🌫️ Haze', icon: '🌫️' },
    { value: 'fog', label: '🌫️ Fog', icon: '🌫️' }
  ];

  // Initialize form data if editing
  useEffect(() => {
    if (observation) {
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
        remarks: observation.remarks || '',
        photo_urls: observation.photo_urls || []
      });
    } else {
      // Set default time to current time
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setFormData(prev => ({
        ...prev,
        observation_time: `${hours}:${minutes}`
      }));
    }
  }, [observation]);

  // Check if photos are mandatory for this condition
  const requiresPhotos = () => {
    const mandatoryPhotoConditions = ['heavy_rain', 'lightning', 'thunderstorm'];
    return mandatoryPhotoConditions.includes(formData.weather_condition) || formData.work_stoppage;
  };

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

  const handlePhotoCaptured = (capturedPhotos) => {
    setPhotos(capturedPhotos);
  };

  const handleSubmit = (e) => {
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
    if (requiresPhotos() && photos.length === 0) {
      alert(`Photos are required for ${formData.weather_condition.replace('_', ' ')} or work stoppages`);
      return;
    }
    if (formData.work_stoppage && !formData.work_stoppage_duration_minutes) {
      alert('Please enter work stoppage duration');
      return;
    }
    if (formData.work_stoppage && formData.affected_activities.length === 0) {
      alert('Please specify affected activities for work stoppage');
      return;
    }

    // Prepare data
    const weatherData = {
      ...formData,
      diary_id: diaryId,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      humidity: formData.humidity ? parseInt(formData.humidity) : null,
      rainfall_mm: formData.rainfall_mm ? parseFloat(formData.rainfall_mm) : null,
      wind_speed_kmh: formData.wind_speed_kmh ? parseFloat(formData.wind_speed_kmh) : null,
      work_stoppage_duration_minutes: formData.work_stoppage_duration_minutes 
        ? parseInt(formData.work_stoppage_duration_minutes) 
        : null,
      photos: photos, // Include photos for offline storage
      recorded_by_name: 'Site Supervisor' // TODO: Get from user context
    };

    onSave(weatherData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🌤️ {observation ? 'Edit' : 'Add'} Weather Observation
            {isOffline && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                Offline
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observation Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="observation_time"
              value={formData.observation_time}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Site working hours: 06:00 - 19:00
            </p>
          </div>

          {/* Weather Condition */}
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
              <option value="">Select condition...</option>
              {weatherConditions.map(condition => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
          </div>

          {/* Environmental Data - Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Temperature */}
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

            {/* Humidity */}
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

            {/* Rainfall */}
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

            {/* Wind Speed */}
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
                placeholder="e.g., 15.0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Work Stoppage */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                name="work_stoppage"
                checked={formData.work_stoppage}
                onChange={handleChange}
                className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
              />
              <label className="text-sm font-medium text-orange-900">
                🚨 Work Stoppage Due to Weather
              </label>
            </div>

            {formData.work_stoppage && (
              <div className="space-y-3">
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-orange-900 mb-2">
                    Stoppage Duration (minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="work_stoppage_duration_minutes"
                    value={formData.work_stoppage_duration_minutes}
                    onChange={handleChange}
                    min="1"
                    placeholder="e.g., 120"
                    required={formData.work_stoppage}
                    className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Affected Activities */}
                <div>
                  <label className="block text-sm font-medium text-orange-900 mb-2">
                    Affected Activities <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={activityInput}
                      onChange={(e) => setActivityInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddActivity())}
                      placeholder="Enter activity name"
                      className="flex-1 px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddActivity}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.affected_activities.map((activity, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm"
                      >
                        {activity}
                        <button
                          type="button"
                          onClick={() => handleRemoveActivity(index)}
                          className="text-orange-600 hover:text-orange-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks / Notes
            </label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={3}
              placeholder="Additional observations, safety actions taken, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Photos */}
          <PhotoCaptureOffline
            onPhotoCaptured={handlePhotoCaptured}
            maxPhotos={5}
            mandatory={requiresPhotos()}
            isOffline={isOffline}
          />

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
