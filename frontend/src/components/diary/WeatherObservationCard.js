// ============================================================================
// WEATHER OBSERVATION CARD - Missing Component from Phase 2
// ============================================================================
// File: frontend/src/components/diary/WeatherObservationCard.js
// Purpose: Display multiple weather observations per day
// Note: This component was referenced but never created - NOW FIXED!
// ============================================================================

import React, { useState } from 'react';

const WeatherObservationCard = ({ 
  observations, 
  onAdd, 
  onEdit, 
  onDelete,
  diaryId,
  diaryDate,
  isOffline 
}) => {
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
      fog: '🌫️',
      // Legacy support for existing simple weather
      'Sunny': '☀️',
      'Cloudy': '☁️',
      'Rainy': '🌧️',
      'Heavy Rain': '⛈️',
      'Stormy': '🌩️'
    };
    return icons[condition] || '🌤️';
  };

  // Check if photos are mandatory for this condition
  const requiresPhotos = (condition, workStoppage) => {
    const mandatoryPhotoConditions = [
      'heavy_rain',
      'lightning',
      'thunderstorm',
      'Heavy Rain',
      'Stormy'
    ];
    return mandatoryPhotoConditions.includes(condition) || workStoppage;
  };

  // Calculate daily summary
  const dailySummary = observations.length > 0 ? {
    totalObservations: observations.length,
    totalRainfall: observations.reduce((sum, obs) => sum + (obs.rainfall_mm || 0), 0),
    workStoppages: observations.filter(obs => obs.work_stoppage).length,
    totalStoppageMinutes: observations
      .filter(obs => obs.work_stoppage)
      .reduce((sum, obs) => sum + (obs.work_stoppage_duration_minutes || 0), 0),
    hasHeavyRain: observations.some(obs => 
      obs.weather_condition === 'heavy_rain' || obs.weather_condition === 'Heavy Rain'
    ),
    hasLightning: observations.some(obs => obs.weather_condition === 'lightning'),
    maxTemperature: Math.max(...observations.map(obs => obs.temperature || 0), 0)
  } : null;

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
          onClick={onAdd}
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
            .sort((a, b) => (a.observation_time || '').localeCompare(b.observation_time || ''))
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
                          {obs.observation_time || 'Time not set'} - {(obs.weather_condition || 'Unknown').replace('_', ' ').toUpperCase()}
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
                      {obs.temperature && <span>🌡️ {obs.temperature}°C</span>}
                      {obs.humidity && <span>💧 {obs.humidity}%</span>}
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
                        ⚠️ Photos required for {(obs.weather_condition || 'this condition').replace('_', ' ')}
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
                      onClick={() => onEdit(obs)}
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
      {dailySummary && (
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
    </div>
  );
};

export default WeatherObservationCard;
