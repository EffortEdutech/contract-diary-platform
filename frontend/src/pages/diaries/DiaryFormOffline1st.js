// ============================================================================
// WORK DIARY FORM OFFLINE - Complete Offline-Capable Diary Creation
// ============================================================================
// File: frontend/src/components/diaries/DiaryFormOffline.js
// Purpose: Complete work diary form with weather tracking, offline support
// Features: Weather observations, photos, auto-sync, delay suggestions
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WeatherObservationCard from '../../components/diary/WeatherObservationCard';
import WeatherObservationModal from '../../components/diary/WeatherObservationModal';
import DelayEventSuggestion from '../../components//diary/DelayEventSuggestion';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import db, { SyncStatus } from '../../services/offlineStorage/diaryDB';
import syncService from '../../services/syncService';
import { supabase } from '../../lib/supabase';

const DiaryFormOffline = () => {
  const navigate = useNavigate();
  const { contractId } = useParams();
  const isOnline = useOnlineStatus();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contract, setContract] = useState(null);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    diary_date: new Date().toISOString().split('T')[0],
    site_conditions: '',
    manpower: {
      main_contractor: 0,
      subcontractors: 0,
      total: 0
    },
    equipment: '',
    materials_delivered: '',
    issues_delays: '',
    general_remarks: ''
  });

  // Weather observations
  const [weatherObservations, setWeatherObservations] = useState([]);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [editingWeather, setEditingWeather] = useState(null);

  // Delay event suggestion
  const [showDelaySuggestion, setShowDelaySuggestion] = useState(false);

  // Load contract details
  useEffect(() => {
    loadContract();
  }, [contractId]);

  // Check for delay suggestions when weather changes
  useEffect(() => {
    checkDelaySuggestion();
  }, [weatherObservations]);

  const loadContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error loading contract:', error);
      alert('Failed to load contract details');
    }
  };

  const checkDelaySuggestion = () => {
    // Check if we should suggest delay event
    const longStoppage = weatherObservations.some(
      obs => obs.work_stoppage && obs.work_stoppage_duration_minutes > 60
    );
    const multipleStoppages = weatherObservations.filter(
      obs => obs.work_stoppage
    ).length > 1;

    setShowDelaySuggestion(longStoppage || multipleStoppages);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('manpower.')) {
      const field = name.split('.')[1];
      setFormData(prev => {
        const manpower = {
          ...prev.manpower,
          [field]: parseInt(value) || 0
        };
        // Auto-calculate total
        manpower.total = manpower.main_contractor + manpower.subcontractors;
        return { ...prev, manpower };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Weather observation handlers
  const handleAddWeather = () => {
    setEditingWeather(null);
    setShowWeatherModal(true);
  };

  const handleEditWeather = (observation) => {
    setEditingWeather(observation);
    setShowWeatherModal(true);
  };

  const handleSaveWeather = async (weatherData) => {
    try {
      if (editingWeather) {
        // Update existing
        const updated = weatherObservations.map(obs =>
          obs.id === editingWeather.id ? { ...obs, ...weatherData } : obs
        );
        setWeatherObservations(updated);
      } else {
        // Add new
        const newWeather = {
          id: `weather_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...weatherData,
          sync_status: SyncStatus.PENDING
        };
        setWeatherObservations([...weatherObservations, newWeather]);
      }
      setShowWeatherModal(false);
    } catch (error) {
      console.error('Error saving weather:', error);
      alert('Failed to save weather observation');
    }
  };

  const handleDeleteWeather = (weatherId) => {
    setPendingDelete(weatherId);
    setShowConfirm(true);
  };

  // then on confirm:
  const confirmDelete = () => {
    setWeatherObservations(prev =>
      prev.filter(w => w.id !== pendingDelete)
    );
    setShowConfirm(false);
  };


  const handleCreateDelayEvent = async (delayData) => {
    // TODO: Implement delay event creation
    // For now, just dismiss
    console.log('Creating delay event:', delayData);
    setShowDelaySuggestion(false);
    alert('Delay event feature coming soon!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validation
      if (!formData.diary_date) {
        alert('Please select diary date');
        return;
      }

      if (weatherObservations.length === 0) {
        if (!window.confirm('No weather observations recorded. Continue anyway?')) {
          return;
        }
      }


      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to create a diary');
        return;
      }

      // Prepare diary data
      const diaryData = {
        contract_id: contractId,
        diary_date: formData.diary_date,
        site_conditions: formData.site_conditions,
        manpower: formData.manpower,
        equipment: formData.equipment,
        materials_delivered: formData.materials_delivered,
        issues_delays: formData.issues_delays,
        general_remarks: formData.general_remarks,
        status: 'draft',
        created_by: user.id,
        sync_status: SyncStatus.PENDING
      };

      if (isOnline) {
        // Online: Save directly to Supabase
        const { data: diary, error: diaryError } = await supabase
          .from('work_diaries')
          .insert(diaryData)
          .select()
          .single();

        if (diaryError) throw diaryError;

        // Save weather observations
        for (const weather of weatherObservations) {
          const weatherRecord = {
            contract_id: contractId,
            diary_id: diary.id,
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
            photo_urls: [],
            recorded_by: user.id,
            recorded_by_name: 'Site Supervisor'
          };

          const { data: weatherData, error: weatherError } = await supabase
            .from('weather_observations')
            .insert(weatherRecord)
            .select()
            .single();

          if (weatherError) throw weatherError;

          // Upload photos if any
          if (weather.photos && weather.photos.length > 0) {
            const photoUrls = [];
            
            for (const photo of weather.photos) {
              // Convert base64 to blob
              const response = await fetch(photo.base64);
              const blob = await response.blob();
              
              // Upload to Supabase Storage
              const filename = `${diary.id}_${Date.now()}_${photo.id}.jpg`;
              const filepath = `diaries/${contractId}/${filename}`;
              
              const { error: uploadError } = await supabase.storage
                .from('diary-photos')
                .upload(filepath, blob, {
                  contentType: 'image/jpeg'
                });

              if (uploadError) throw uploadError;

              // Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('diary-photos')
                .getPublicUrl(filepath);

              photoUrls.push(publicUrl);
            }

            // Update weather observation with photo URLs
            await supabase
              .from('weather_observations')
              .update({ photo_urls: photoUrls })
              .eq('id', weatherData.id);
          }
        }

        alert('✅ Diary created successfully!');
        navigate(`/contracts/${contractId}/diaries`);

      } else {
        // Offline: Save to IndexedDB
        const localDiaryId = await db.diaries.add(diaryData);

        // Save weather observations to IndexedDB
        for (const weather of weatherObservations) {
          await db.weather_observations.add({
            ...weather,
            diary_id: localDiaryId,
            contract_id: contractId,
            recorded_by: user.id
          });

          // Save photos to IndexedDB
          if (weather.photos && weather.photos.length > 0) {
            for (const photo of weather.photos) {
              await db.photos.add({
                diary_id: localDiaryId,
                weather_observation_id: weather.id,
                base64: photo.base64,
                filename: photo.filename,
                timestamp: photo.timestamp,
                sync_status: SyncStatus.PENDING
              });
            }
          }
        }

        alert('📴 Diary saved offline! It will sync when you\'re back online.');
        navigate(`/contracts/${contractId}/diaries`);
      }

    } catch (error) {
      console.error('Error creating diary:', error);
      alert(`Failed to create diary: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contract details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/contracts/${contractId}/diaries`)}
                className="text-gray-400 hover:text-gray-600"
              >
                ← Back
              </button>
            </div>
          </div>
          <p className="text-gray-600">
            {contract.project_name} • {contract.contract_number}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📅 Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diary Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="diary_date"
                  value={formData.diary_date}
                  onChange={handleChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Site Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Conditions
                </label>
                <input
                  type="text"
                  name="site_conditions"
                  value={formData.site_conditions}
                  onChange={handleChange}
                  placeholder="e.g., Dry, accessible"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Manpower */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              👷 Manpower
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Contractor
                </label>
                <input
                  type="number"
                  name="manpower.main_contractor"
                  value={formData.manpower.main_contractor}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcontractors
                </label>
                <input
                  type="number"
                  name="manpower.subcontractors"
                  value={formData.manpower.subcontractors}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Workers
                </label>
                <input
                  type="number"
                  value={formData.manpower.total}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Weather Tracking */}
          <WeatherObservationCard
            observations={weatherObservations}
            onAdd={handleAddWeather}
            onEdit={handleEditWeather}
            onDelete={handleDeleteWeather}
            diaryId={null}
            diaryDate={formData.diary_date}
            isOffline={!isOnline}
          />

          {/* Delay Event Suggestion */}
          {showDelaySuggestion && (
            <DelayEventSuggestion
              weatherObservations={weatherObservations}
              onCreateDelayEvent={handleCreateDelayEvent}
              onDismiss={() => setShowDelaySuggestion(false)}
            />
          )}

          {/* Equipment */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              🚜 Equipment
            </h2>
            <textarea
              name="equipment"
              value={formData.equipment}
              onChange={handleChange}
              rows={3}
              placeholder="List equipment used on site (e.g., Excavator, Concrete mixer, etc.)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Materials Delivered */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📦 Materials Delivered
            </h2>
            <textarea
              name="materials_delivered"
              value={formData.materials_delivered}
              onChange={handleChange}
              rows={3}
              placeholder="List materials delivered today (supplier, quantity, etc.)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Issues & Delays */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              ⚠️ Issues & Delays
            </h2>
            <textarea
              name="issues_delays"
              value={formData.issues_delays}
              onChange={handleChange}
              rows={3}
              placeholder="Document any issues, delays, or problems encountered"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* General Remarks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📝 General Remarks
            </h2>
            <textarea
              name="general_remarks"
              value={formData.general_remarks}
              onChange={handleChange}
              rows={4}
              placeholder="Any additional remarks or observations"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(`/contracts/${contractId}/diaries`)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {isOnline ? 'Creating...' : 'Saving Offline...'}
                  </span>
                ) : (
                  <span>
                    {isOnline ? '✅ Create Diary' : '📴 Save Offline'}
                  </span>
                )}
              </button>
            </div>

            {!isOnline && (
              <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-3">
                📴 Working offline. Diary will be saved locally and synced when you're back online.
              </p>
            )}
          </div>
        </form>

        {/* Weather Observation Modal */}
        {showWeatherModal && (
          <WeatherObservationModal
            observation={editingWeather}
            diaryId={null}
            diaryDate={formData.diary_date}
            isOffline={!isOnline}
            onSave={handleSaveWeather}
            onClose={() => setShowWeatherModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default DiaryFormOffline;
