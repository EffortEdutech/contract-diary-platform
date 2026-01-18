// ============================================================================
// DIARY FORM OFFLINE - Complete with Weather Pending Photos System
// ============================================================================
// File: frontend/src/pages/diaries/DiaryFormOffline.js
// Purpose: Work diary with weather tracking and pending photo management
// Features: 
// - Weather observations with pending photos
// - Proper Malaysian construction workflow
// - No orphaned data on cancel
// - Batch photo upload on save
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import PhotoGallery from '../../components/diary/PhotoGallery';
import WeatherObservationCard from '../../components/diary/WeatherObservationCard';
import WeatherObservationModal from '../../components/diary/WeatherObservationModal';
import { supabase } from '../../lib/supabase';
import {
  createDiary,
  updateDiary,
  getDiaryById,
  submitDiary,
  getTodayDate,
  WEATHER_OPTIONS,
  COMMON_TRADES,
  EQUIPMENT_TYPES,
  MATERIAL_UNITS,
  DIARY_STATUS
} from '../../services/diaryService';
import PhotoUpload from '../../components/diary/PhotoUpload';
import { useAuth } from '../../contexts/AuthContext';
import { uploadWeatherPhoto } from '../../services/diaryPhotoService';

const DiaryFormOffline = () => {
  const { contractId, diaryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!diaryId;

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // UI State
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    diary_date: getTodayDate(),
    weather_conditions: '',
    site_conditions: '',
    work_progress: '',
    general_remarks: '',
    status: 'draft'
  });

  // Manpower
  const [manpower, setManpower] = useState({
    main_contractor: [{ trade: '', workers: 0, hours: 0 }],
    subcontractors: [{ trade: '', workers: 0, hours: 0 }]
  });

  // Equipment
  const [equipment, setEquipment] = useState([
    { type: '', quantity: 0, hours: 0 }
  ]);

  // Materials
  const [materials, setMaterials] = useState([
    { description: '', quantity: 0, unit: '', supplier: '', do_number: '', boq_item_id: null, boq_item_description: '' }
  ]);

  // Work Activities
  const [workActivities, setWorkActivities] = useState([]);

  // Observations
  const [observations, setObservations] = useState([]);

  // Inspection/Test Requests
  const [inspectionTestRequests, setInspectionTestRequests] = useState([]);

  // Weather Observations
  const [weatherObservations, setWeatherObservations] = useState([]);

  // ✅ NEW: Weather Pending Photos State
  const [weatherPendingPhotos, setWeatherPendingPhotos] = useState({});
  // Structure: { observationId: [File, File, ...] }

  // ✅ NEW: Observation ID Mapping (temp → real UUID)
  const [observationIdMapping, setObservationIdMapping] = useState({});
  // Structure: { 'weather_123': 'real-uuid-456' }

  // Reference Data
  const [programmeItems, setProgrammeItems] = useState([]);
  const [boqItems, setBOQItems] = useState([]);

  // General Photos
  const [photos, setPhotos] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);

  // Modals
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [editingWeather, setEditingWeather] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // ============================================
  // LOAD DATA ON MOUNT
  // ============================================
  
  useEffect(() => {
    loadInitialData();
  }, [contractId, diaryId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load contract
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      // If editing, load diary
      if (isEditMode) {
        await loadDiaryData(diaryId);
      }

      // Load reference data
      await loadReferenceData();

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDiaryData = async (id) => {
    try {
      console.log('Loading diary:', id);

      const diary = await getDiaryById(id);
      
      setFormData({
        diary_date: diary.diary_date,
        weather_conditions: diary.weather_conditions || '',
        site_conditions: diary.site_conditions || '',
        work_progress: diary.work_progress || '',
        general_remarks: diary.general_remarks || '',
        status: diary.status || 'draft'  // ✅ IMPORTANT: Include status
      });

      // Handle manpower
      if (diary.manpower && typeof diary.manpower === 'object') {
        if (Array.isArray(diary.manpower.main_contractor) && 
            Array.isArray(diary.manpower.subcontractors)) {
          setManpower(diary.manpower);
        } else {
          setManpower({
            main_contractor: [{ trade: '', workers: 0, hours: 0 }],
            subcontractors: [{ trade: '', workers: 0, hours: 0 }]
          });
        }
      }

      // Handle equipment
      if (diary.equipment && Array.isArray(diary.equipment)) {
        setEquipment(diary.equipment.length > 0 ? diary.equipment : [{ type: '', quantity: 0, hours: 0 }]);
      }

      // Handle materials
      if (diary.materials_delivered && Array.isArray(diary.materials_delivered)) {
        setMaterials(diary.materials_delivered.length > 0 ? diary.materials_delivered : [
          { description: '', quantity: 0, unit: '', supplier: '', do_number: '', boq_item_id: null }
        ]);
      }

      // Load weather observations
      const { data: weatherData, error: weatherError } = await supabase
        .from('weather_observations')
        .select('*')
        .eq('diary_id', id)
        .order('observation_time');

      if (!weatherError && weatherData && weatherData.length > 0) {
        setWeatherObservations(weatherData);
        console.log(`✅ Loaded ${weatherData.length} weather observations`);
      }

      // Load inspection/test requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('inspection_test_requests')
        .select('*')
        .eq('diary_id', id)
        .order('created_at');

      if (!requestsError && requestsData) {
        setInspectionTestRequests(requestsData);
        console.log(`✅ Loaded ${requestsData.length} inspection/test requests`);
      }

      // Load work activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('work_activities')
        .select('*')
        .eq('diary_id', id)
        .order('created_at');

      if (!activitiesError && activitiesData) {
        setWorkActivities(activitiesData);
        console.log(`✅ Loaded ${activitiesData.length} activities`);
      }

      // Load photos
      await loadPhotos();

    } catch (error) {
      console.error('Error loading diary:', error);
      throw error;
    }
  };

  const loadReferenceData = async () => {
    try {
      // Load Programme Items
      const { data: progData } = await supabase
        .from('programme')
        .select('id, activity_code, activity_description')
        .eq('contract_id', contractId)
        .order('activity_code');

      if (progData) setProgrammeItems(progData);

      // Load BOQ Items
      const { data: boqData } = await supabase
        .from('boq')
        .select('id, item_no, description')
        .eq('contract_id', contractId)
        .order('item_no');

      if (boqData) setBOQItems(boqData);

    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };

  const loadPhotos = async () => {
    if (!diaryId) return;
    
    try {
      const { data: photoData } = await supabase
        .from('diary_photos')
        .select('*')
        .eq('diary_id', diaryId)
        .order('uploaded_at');
      setPhotos(photoData || []);
      console.log(`✅ Loaded ${photoData?.length || 0} photos`);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  // ============================================
  // FORM HANDLERS
  // ============================================
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ============================================
  // MANPOWER HANDLERS
  // ============================================
  
  const addManpowerRow = (category) => {
    setManpower(prev => ({
      ...prev,
      [category]: [...prev[category], { trade: '', workers: 0, hours: 0 }]
    }));
  };

  const removeManpowerRow = (category, index) => {
    setManpower(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const updateManpowerRow = (category, index, field, value) => {
    setManpower(prev => ({
      ...prev,
      [category]: prev[category].map((row, i) => {
        if (i === index) {
          if (field === 'workers' || field === 'hours') {
            const numValue = parseInt(value);
            return { ...row, [field]: isNaN(numValue) ? 0 : numValue };
          }
          return { ...row, [field]: value };
        }
        return row;
      })
    }));
  };

  // ============================================
  // EQUIPMENT HANDLERS
  // ============================================
  
  const addEquipmentRow = () => {
    setEquipment(prev => [...prev, { type: '', quantity: 0, hours: 0 }]);
  };

  const removeEquipmentRow = (index) => {
    setEquipment(prev => prev.filter((_, i) => i !== index));
  };

  const updateEquipmentRow = (index, field, value) => {
    setEquipment(prev => prev.map((row, i) => {
      if (i === index) {
        if (field === 'quantity' || field === 'hours') {
          const numValue = parseFloat(value);
          return { ...row, [field]: isNaN(numValue) ? 0 : numValue };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // ============================================
  // MATERIAL HANDLERS
  // ============================================
  
  const addMaterialRow = () => {
    setMaterials(prev => [...prev, 
      { description: '', quantity: 0, unit: '', supplier: '', do_number: '', boq_item_id: null, boq_item_description: '' }
    ]);
  };

  const removeMaterialRow = (index) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const updateMaterialRow = (index, field, value) => {
    setMaterials(prev => prev.map((row, i) => {
      if (i === index) {
        if (field === 'boq_item_id') {
          const selectedItem = boqItems.find(item => item.id === value);
          return {
            ...row,
            boq_item_id: value,
            boq_item_description: selectedItem?.description || ''
          };
        }
        if (field === 'quantity') {
          const numValue = parseFloat(value);
          return { ...row, quantity: isNaN(numValue) ? 0 : numValue };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // ============================================
  // WORK ACTIVITY HANDLERS
  // ============================================
  
  const addWorkActivity = () => {
    setWorkActivities(prev => [...prev, {
      id: `activity_${Date.now()}`,
      description: '',
      location: '',
      trade: '',
      progress_percentage: 0,
      linked_programme_items: [],
      linked_boq_items: [],
      requires_inspection: false,
      inspection_type: '',
      requires_test: false,
      test_type: '',
      remarks: ''
    }]);
  };

  const removeWorkActivity = (index) => {
    setWorkActivities(prev => prev.filter((_, i) => i !== index));
  };

  const updateWorkActivity = (index, field, value) => {
    setWorkActivities(prev => prev.map((activity, i) => 
      i === index ? { ...activity, [field]: value } : activity
    ));
  };

  // ============================================
  // OBSERVATION HANDLERS
  // ============================================
  
  const addObservation = () => {
    setObservations(prev => [...prev, {
      id: `obs_${Date.now()}`,
      title: '',
      description: '',
      category: 'general',
      severity: 'low',
      linked_to: [],
      status: 'open'
    }]);
  };

  const removeObservation = (index) => {
    setObservations(prev => prev.filter((_, i) => i !== index));
  };

  const updateObservation = (index, field, value) => {
    setObservations(prev => prev.map((obs, i) => 
      i === index ? { ...obs, [field]: value } : obs
    ));
  };

  // ============================================
  // WEATHER OBSERVATION HANDLERS
  // ============================================
  
  const handleAddWeather = () => {
    setEditingWeather(null);
    setShowWeatherModal(true);
  };

  const handleEditWeather = (observation) => {
    setEditingWeather(observation);
    setShowWeatherModal(true);
  };

  const handleSaveWeather = (weatherData) => {
    if (editingWeather) {
      // Update existing
      setWeatherObservations(prev => prev.map(obs =>
        obs.id === editingWeather.id ? { ...obs, ...weatherData } : obs
      ));
    } else {
      // Create new with temp ID
      setWeatherObservations(prev => [...prev, {
        id: `weather_${Date.now()}`,
        ...weatherData
      }]);
    }
    setShowWeatherModal(false);
    setEditingWeather(null);
  };

  const handleDeleteWeather = (weatherId) => {
    setPendingDelete(weatherId);
    setShowConfirm(true);
  };

  const confirmDeleteWeather = () => {
    setWeatherObservations(prev =>
      prev.filter(w => w.id !== pendingDelete)
    );
    setPendingDelete(null);
    setShowConfirm(false);
  };

  const cancelDeleteWeather = () => {
    setPendingDelete(null);
    setShowConfirm(false);
  };

  // ============================================
  // ✅ NEW: WEATHER PENDING PHOTOS HANDLERS
  // ============================================
  
  /**
   * Add photos to pending queue for a weather observation
   */
  const handleAddWeatherPhotos = (observationId, files) => {
    const fileArray = Array.from(files);
    
    setWeatherPendingPhotos(prev => ({
      ...prev,
      [observationId]: [...(prev[observationId] || []), ...fileArray]
    }));
    
    console.log(`✅ Added ${fileArray.length} pending photos for observation:`, observationId);
  };

  /**
   * Remove a pending photo (before save)
   */
  const handleRemovePendingWeatherPhoto = (observationId, photoIndex) => {
    setWeatherPendingPhotos(prev => ({
      ...prev,
      [observationId]: (prev[observationId] || []).filter((_, i) => i !== photoIndex)
    }));
    
    console.log('✅ Removed pending photo at index:', photoIndex);
  };

  /**
   * Get all photos for an observation (existing + pending)
   */
  const getAllPhotosForObservation = (observationId) => {
    // Get real UUID if this is a temp ID
    const realId = observationIdMapping[observationId] || observationId;
    
    // Get pending photos (check both temp and real ID)
    const pending = weatherPendingPhotos[observationId] || 
                    weatherPendingPhotos[realId] || 
                    [];
    
    return pending;
  };

  /**
   * Format weather condition for caption
   */
  const formatWeatherCondition = (condition) => {
    return condition
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /**
   * Upload all pending weather photos during save
   */
  const uploadAllPendingWeatherPhotos = async (diaryId, idMapping) => {
    const totalPending = Object.values(weatherPendingPhotos)
      .reduce((sum, photos) => sum + photos.length, 0);
    
    if (totalPending === 0) {
      console.log('No pending weather photos to upload');
      return;
    }
    
    console.log(`📸 Uploading ${totalPending} pending weather photos...`);
    
    let uploadedCount = 0;
    
    for (const [observationId, files] of Object.entries(weatherPendingPhotos)) {
      // Get real observation UUID (map temp → real if needed)
      const realObservationId = idMapping[observationId] || observationId;
      
      // Find observation to get details for caption
      const observation = weatherObservations.find(obs => 
        obs.id === observationId || obs.id === realObservationId
      );
      
      console.log(`Uploading ${files.length} photos for observation:`, realObservationId);
      
      for (const file of files) {
        try {
          // Generate auto-caption
          const time = observation?.observation_time || 'Unknown time';
          const condition = observation?.weather_condition 
            ? formatWeatherCondition(observation.weather_condition)
            : 'Weather event';
          const autoCaption = `Weather ${time} - ${condition}`;
          
          // Upload photo
          await uploadWeatherPhoto(
            diaryId,
            realObservationId,
            file,
            autoCaption,
            user.id
          );
          
          uploadedCount++;
          console.log(`✅ Uploaded ${uploadedCount}/${totalPending}: ${file.name}`);
          
        } catch (error) {
          console.error(`❌ Failed to upload ${file.name}:`, error);
          // Continue with other photos
        }
      }
    }
    
    console.log(`✅ Uploaded ${uploadedCount}/${totalPending} weather photos`);
  };

  /**
   * Get total pending photo count
   */
  const getTotalPendingPhotoCount = () => {
    return Object.values(weatherPendingPhotos)
      .reduce((sum, photos) => sum + photos.length, 0);
  };

  // ============================================
  // GENERAL PHOTO HANDLERS
  // ============================================
  
  const handlePhotoFileSelected = (files) => {
    setPendingPhotos(prev => [...prev, ...files]);
  };

  const handleRemovePendingPhoto = (index) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoDeleted = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const uploadPendingPhotos = async (savedDiaryId) => {
    if (pendingPhotos.length === 0) return;

    try {
      const { uploadPhotos } = await import('../../services/diaryPhotoService');
      
      const photoFiles = pendingPhotos.map(file => ({
        file: file,
        caption: file.caption || ''
      }));

      await uploadPhotos(savedDiaryId, contractId, photoFiles);
      setPendingPhotos([]);
    } catch (err) {
      console.error('Error uploading photos:', err);
      alert(`Failed to upload some photos: ${err.message}`);
    }
  };

  // ============================================
  // SAVE & SUBMIT
  // ============================================
  
  const handleSave = async (submitForAcknowledgment = false) => {
    try {
      setSaving(true);
      setError(null);

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Prepare diary data
      const diaryData = {
        contract_id: contractId,
        diary_date: formData.diary_date,
        weather_conditions: formData.weather_conditions,
        site_conditions: formData.site_conditions,
        work_progress: formData.work_progress,
        manpower: manpower,
        equipment: equipment,
        materials_delivered: materials,
        general_remarks: formData.general_remarks,
        status: submitForAcknowledgment ? DIARY_STATUS.SUBMITTED : DIARY_STATUS.DRAFT,
        created_by: currentUser.id
      };

      let savedDiary;
      if (isEditMode) {
        savedDiary = await updateDiary(diaryId, diaryData);
      } else {
        savedDiary = await createDiary(diaryData);
      }

      console.log('✅ Diary saved:', savedDiary.id);

      // ============================================
      // SAVE WEATHER OBSERVATIONS & CREATE ID MAPPING
      // ============================================
      
      const newMapping = {}; // Map temp IDs → real UUIDs

      if (isEditMode) {
        // Delete old observations
        await supabase
          .from('weather_observations')
          .delete()
          .eq('diary_id', savedDiary.id);
      }

      // Insert all observations and track ID mapping
      if (weatherObservations.length > 0) {
        for (const weather of weatherObservations) {
          if (weather.observation_time && weather.weather_condition) {
            const weatherRecord = {
              diary_id: savedDiary.id,
              contract_id: contractId,
              observation_time: weather.observation_time,
              weather_condition: weather.weather_condition,
              temperature: weather.temperature ? Number(weather.temperature) : null,
              humidity: weather.humidity ? Number(weather.humidity) : null,
              rainfall_mm: weather.rainfall_mm ? Number(weather.rainfall_mm) : null,
              wind_speed_kmh: weather.wind_speed_kmh ? Number(weather.wind_speed_kmh) : null,
              work_stoppage: weather.work_stoppage || false,
              work_stoppage_duration_minutes: weather.work_stoppage_duration_minutes 
                ? Number(weather.work_stoppage_duration_minutes) 
                : null,
              affected_activities: weather.affected_activities || [],
              remarks: weather.remarks || '',
              recorded_by: currentUser.id,
              recorded_by_name: currentUser.email || currentUser.id
            };

            const { data: savedObs, error: weatherError } = await supabase
              .from('weather_observations')
              .insert(weatherRecord)
              .select()
              .single();

            if (weatherError) {
              console.error('Error saving weather observation:', weatherError);
              continue;
            }

            // ✅ CRITICAL: Map temp ID → real UUID
            if (weather.id && weather.id.startsWith('weather_')) {
              newMapping[weather.id] = savedObs.id;
              console.log(`Mapped: ${weather.id} → ${savedObs.id}`);
            }
          }
        }
      }

      // Update ID mapping state
      if (Object.keys(newMapping).length > 0) {
        setObservationIdMapping(prev => ({ ...prev, ...newMapping }));
      }

      // ============================================
      // ✅ UPLOAD ALL PENDING WEATHER PHOTOS
      // ============================================
      
      await uploadAllPendingWeatherPhotos(savedDiary.id, newMapping);

      // ============================================
      // ✅ CLEAR PENDING WEATHER PHOTOS QUEUE
      // ============================================
      
      setWeatherPendingPhotos({});
      console.log('✅ Cleared pending weather photos queue');

      // ============================================
      // UPLOAD GENERAL PENDING PHOTOS
      // ============================================
      
      if (!isEditMode && pendingPhotos.length > 0) {
        await uploadPendingPhotos(savedDiary.id);
      }

      alert('Diary saved successfully!');
      navigate(`/contracts/${contractId}/diaries`);

    } catch (error) {
      console.error('Error saving diary:', error);
      setError(error.message);
      alert('Failed to save diary: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // UNSAVED CHANGES WARNING
  // ============================================
  
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const totalPending = getTotalPendingPhotoCount();
      
      if (totalPending > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved weather photos. Leave without saving?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [weatherPendingPhotos]);

  // ============================================
  // RENDER
  // ============================================
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading diary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Diary</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate(`/contracts/${contractId}/diaries`)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Diaries
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-5xl mx-auto px-4">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Contracts', href: '/contracts' },
            { label: contract?.name || 'Contract', href: `/contracts/${contractId}` },
            { label: 'Diaries', href: `/contracts/${contractId}/diaries` },
            { label: isEditMode ? 'Edit Diary' : 'New Diary', href: null }
          ]}
        />

        {/* Header */}
        <div className="mt-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Work Diary' : 'New Work Diary'}
          </h1>
          <p className="mt-2 text-gray-600">
            Contract: {contract?.name}
          </p>
        </div>

        {/* Pending Photo Count Banner */}
        {getTotalPendingPhotoCount() > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-blue-800">
              📸 {getTotalPendingPhotoCount()} weather photo(s) ready to upload when you save
            </p>
          </div>
        )}

        {/* Main Form */}
        <form className="space-y-8">
          
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Diary Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="diary_date"
                  value={formData.diary_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Weather (Simple) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  General Weather
                </label>
                <select
                  name="weather_conditions"
                  value={formData.weather_conditions}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select weather</option>
                  {WEATHER_OPTIONS.map(weather => (
                    <option key={weather} value={weather}>{weather}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-blue-600">
                  💡 Or add detailed weather observations below
                </p>
              </div>
            </div>
          </div>

          {/* Weather Observations */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                ⛈️ Weather Observations
              </h2>
              {formData.status === 'draft' && (
                <button
                  type="button"
                  onClick={handleAddWeather}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  + Add Weather Observation
                </button>
              )}
            </div>

            {weatherObservations.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-500 text-sm">
                  No weather observations recorded
                </p>
                {formData.status === 'draft' && (
                  <p className="text-gray-400 text-xs mt-1">
                    Click "Add Weather Observation" to record weather events
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {weatherObservations.map(observation => (
                  <WeatherObservationCard
                    key={observation.id}
                    observation={observation}
                    diaryId={diaryId}
                    onEdit={handleEditWeather}
                    onDelete={handleDeleteWeather}
                    userId={user?.id}
                    isDraft={formData.status === 'draft'}
                    pendingPhotos={getAllPhotosForObservation(observation.id)}
                    onAddPhotos={handleAddWeatherPhotos}
                    onRemovePendingPhoto={handleRemovePendingWeatherPhoto}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Site Conditions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Site Conditions
            </label>
            <textarea
              name="site_conditions"
              value={formData.site_conditions}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe site conditions (e.g., dry, muddy, accessible, etc.)"
            />
          </div>

          {/* Work Progress */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Work Progress</h2>
            <textarea
              name="work_progress"
              value={formData.work_progress}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe work progress (free text)"
            />
          </div>

          {/* General Remarks */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              General Remarks
            </label>
            <textarea
              name="general_remarks"
              value={formData.general_remarks}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional remarks or notes..."
            />
          </div>

          {/* Photos Section (only if diary saved) */}
          {isEditMode && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Photos</h2>

              {/* Existing Photos */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Existing Photos ({photos.length})
                </h3>
                <PhotoGallery
                  diaryId={diaryId}
                  canEdit={formData.status === 'draft'}
                  onPhotoDeleted={(photoId) => {
                    console.log('Photo deleted:', photoId);
                    loadPhotos();
                  }}
                />
              </div>

              {/* Upload New Photos */}
              {formData.status === 'draft' && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Add More Photos
                  </h3>
                  <PhotoUpload
                    diaryId={diaryId}
                    onUploadComplete={(results) => {
                      if (results.successful.length > 0) {
                        alert(`${results.successful.length} photo(s) uploaded successfully!`);
                        loadPhotos();
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/contracts/${contractId}/diaries`)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save as Draft'
              )}
            </button>
          </div>
        </form>

        {/* Weather Observation Modal */}
        {showWeatherModal && (
          <WeatherObservationModal
            observation={editingWeather}
            diaryId={isEditMode ? diaryId : null}
            diaryDate={formData.diary_date}
            userId={user?.id}
            isOffline={false}
            onSave={handleSaveWeather}
            pendingPhotos={editingWeather ? getAllPhotosForObservation(editingWeather.id) : []}
            onAddPhotos={handleAddWeatherPhotos}
            onRemovePendingPhoto={handleRemovePendingWeatherPhoto}
            onClose={() => {
              setShowWeatherModal(false);
              setEditingWeather(null);
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Delete Weather Observation?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this weather observation? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteWeather}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteWeather}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryFormOffline;
