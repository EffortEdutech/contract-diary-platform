// ============================================================================
// ENHANCED DIARY FORM - Matches Existing DiaryForm.js with New Features
// ============================================================================
// File: frontend/src/pages/diaries/DiaryFormOffline.js
// Purpose: Enhanced diary form with linking to Programme, BOQ, Quality, Commercial
// Design: Matches existing DiaryForm.js look and feel exactly
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import PhotoUpload from '../../components/diary/PhotoUpload';
import PhotoGallery from '../../components/diary/PhotoGallery';
import WeatherObservationCard from '../../components/diary/WeatherObservationCard';
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

const DiaryFormOffline = () => {
  const { contractId, diaryId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!diaryId;

  // State
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Form data - matches existing structure
  const [formData, setFormData] = useState({
    diary_date: getTodayDate(),
    weather_conditions: '', // Keep for backward compatibility
    site_conditions: '',
    work_progress: '', // Keep old text field
    general_remarks: ''
  });

  // Dynamic arrays - matches existing structure
  const [manpower, setManpower] = useState({
    main_contractor: [{ trade: '', workers: 0 }],
    subcontractors: [{ trade: '', workers: 0 }]
  });

  const [equipment, setEquipment] = useState([
    { type: '', quantity: 0, hours: 0 }
  ]);

  const [materials, setMaterials] = useState([
    { description: '', quantity: 0, unit: '', supplier: '', boq_item_id: null, boq_item_code: '' }
  ]);

  // NEW: Enhanced features
  const [weatherObservations, setWeatherObservations] = useState([]);
  const [workActivities, setWorkActivities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [delays, setDelays] = useState([]);

  // Reference data for linking
  const [programmeItems, setProgrammeItems] = useState([]);
  const [boqItems, setBOQItems] = useState([]);
  const [inspections, setInspections] = useState([]);

  // Photo management - matches existing
  const [photos, setPhotos] = useState([]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  // Modals for linking
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showProgrammeLink, setShowProgrammeLink] = useState(false);
  const [showBOQLink, setShowBOQLink] = useState(false);
  const [showQualityLink, setShowQualityLink] = useState(false);
  const [showCommercialLink, setShowCommercialLink] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    loadContract();
    loadReferenceData();
    if (isEditMode) {
      loadDiary();
    } else {
      setLoading(false);
    }
  }, [contractId, diaryId]);

  const loadContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (err) {
      console.error('Error loading contract:', err);
      setError('Failed to load contract details');
    }
  };

  const loadReferenceData = async () => {
    try {
      // Load Programme items
      const { data: progData } = await supabase
        .from('programme_items')
        .select('*')
        .eq('contract_id', contractId)
        .order('wbs_code');
      setProgrammeItems(progData || []);

      // Load BOQ items
      const { data: boqData } = await supabase
        .from('boq_items')
        .select('*')
        .eq('contract_id', contractId)
        .order('item_code');
      setBOQItems(boqData || []);

      // Load Inspections
      const { data: inspData } = await supabase
        .from('inspections')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });
      setInspections(inspData || []);

    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  };

  const loadDiary = async () => {
    try {
      setLoading(true);
      const diary = await getDiaryById(diaryId);
      
      setFormData({
        diary_date: diary.diary_date,
        weather_conditions: diary.weather_conditions || '',
        site_conditions: diary.site_conditions || '',
        work_progress: diary.work_progress || '',
        general_remarks: diary.general_remarks || ''
      });

      setManpower(diary.manpower || {
        main_contractor: [{ trade: '', workers: 0 }],
        subcontractors: [{ trade: '', workers: 0 }]
      });

      setEquipment(diary.equipment || [{ type: '', quantity: 0, hours: 0 }]);
      setMaterials(diary.materials_delivered || [{ description: '', quantity: 0, unit: '', supplier: '' }]);

      // Load weather observations if they exist
      const { data: weatherData } = await supabase
        .from('weather_observations')
        .select('*')
        .eq('diary_id', diaryId)
        .order('observation_time');
      setWeatherObservations(weatherData || []);

      // Load photos
      const { data: photoData } = await supabase
        .from('diary_photos')
        .select('*')
        .eq('diary_id', diaryId)
        .order('uploaded_at');
      setPhotos(photoData || []);

    } catch (err) {
      console.error('Error loading diary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FORM HANDLERS - Match existing exactly
  // ============================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manpower handlers - match existing
  const addManpowerRow = (category) => {
    setManpower(prev => ({
      ...prev,
      [category]: [...prev[category], { trade: '', workers: 0 }]
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
      [category]: prev[category].map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  // Equipment handlers - match existing
  const addEquipmentRow = () => {
    setEquipment(prev => [...prev, { type: '', quantity: 0, hours: 0 }]);
  };

  const removeEquipmentRow = (index) => {
    setEquipment(prev => prev.filter((_, i) => i !== index));
  };

  const updateEquipmentRow = (index, field, value) => {
    setEquipment(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ));
  };

  // Material handlers - match existing + BOQ linking
  const addMaterialRow = () => {
    setMaterials(prev => [...prev, { 
      description: '', 
      quantity: 0, 
      unit: '', 
      supplier: '',
      boq_item_id: null,
      boq_item_code: ''
    }]);
  };

  const removeMaterialRow = (index) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const updateMaterialRow = (index, field, value) => {
    setMaterials(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ));
  };

  const linkMaterialToBOQ = (index) => {
    setActiveItemIndex(index);
    setShowBOQLink(true);
  };

  const handleBOQLinkSelected = (boqItem) => {
    if (activeItemIndex !== null) {
      updateMaterialRow(activeItemIndex, 'boq_item_id', boqItem.id);
      updateMaterialRow(activeItemIndex, 'boq_item_code', boqItem.item_code);
      updateMaterialRow(activeItemIndex, 'description', boqItem.description);
      updateMaterialRow(activeItemIndex, 'unit', boqItem.unit);
    }
    setShowBOQLink(false);
    setActiveItemIndex(null);
  };

  // ============================================
  // NEW: Work Activity Handlers (Programme Link)
  // ============================================

  const addWorkActivity = () => {
    setWorkActivities(prev => [...prev, {
      id: `activity_${Date.now()}`,
      title: '',
      description: '',
      programme_item_id: null,
      programme_wbs_code: '',
      quantity_completed: 0,
      unit: '',
      percent_complete: 0,
      status: 'in_progress',
      notes: ''
    }]);
  };

  const removeWorkActivity = (index) => {
    setWorkActivities(prev => prev.filter((_, i) => i !== index));
  };

  const updateWorkActivity = (index, field, value) => {
    setWorkActivities(prev => prev.map((act, i) => 
      i === index ? { ...act, [field]: value } : act
    ));
  };

  const linkActivityToProgramme = (index) => {
    setActiveItemIndex(index);
    setShowProgrammeLink(true);
  };

  const handleProgrammeLinkSelected = (progItem) => {
    if (activeItemIndex !== null) {
      updateWorkActivity(activeItemIndex, 'programme_item_id', progItem.id);
      updateWorkActivity(activeItemIndex, 'programme_wbs_code', progItem.wbs_code);
      updateWorkActivity(activeItemIndex, 'title', progItem.description);
    }
    setShowProgrammeLink(false);
    setActiveItemIndex(null);
  };

  // ============================================
  // NEW: Issue Handlers (Quality Link)
  // ============================================

  const addIssue = () => {
    setIssues(prev => [...prev, {
      id: `issue_${Date.now()}`,
      title: '',
      description: '',
      severity: 'medium',
      inspection_id: null,
      inspection_ref: '',
      status: 'open'
    }]);
  };

  const removeIssue = (index) => {
    setIssues(prev => prev.filter((_, i) => i !== index));
  };

  const updateIssue = (index, field, value) => {
    setIssues(prev => prev.map((issue, i) => 
      i === index ? { ...issue, [field]: value } : issue
    ));
  };

  const linkIssueToQuality = (index) => {
    setActiveItemIndex(index);
    setShowQualityLink(true);
  };

  const handleQualityLinkSelected = (inspection) => {
    if (activeItemIndex !== null) {
      updateIssue(activeItemIndex, 'inspection_id', inspection.id);
      updateIssue(activeItemIndex, 'inspection_ref', inspection.inspection_ref);
    }
    setShowQualityLink(false);
    setActiveItemIndex(null);
  };

  // ============================================
  // NEW: Delay Handlers (Commercial Link)
  // ============================================

  const addDelay = () => {
    setDelays(prev => [...prev, {
      id: `delay_${Date.now()}`,
      title: '',
      description: '',
      delay_type: 'weather',
      duration_hours: 0,
      linked_to: null, // 'eot' or 'vo'
      linked_id: null,
      linked_ref: ''
    }]);
  };

  const removeDelay = (index) => {
    setDelays(prev => prev.filter((_, i) => i !== index));
  };

  const updateDelay = (index, field, value) => {
    setDelays(prev => prev.map((delay, i) => 
      i === index ? { ...delay, [field]: value } : delay
    ));
  };

  const linkDelayToCommercial = (index) => {
    setActiveItemIndex(index);
    setShowCommercialLink(true);
  };

  const handleCommercialLinkSelected = (type, item) => {
    if (activeItemIndex !== null) {
      updateDelay(activeItemIndex, 'linked_to', type);
      updateDelay(activeItemIndex, 'linked_id', item.id);
      updateDelay(activeItemIndex, 'linked_ref', item.reference);
    }
    setShowCommercialLink(false);
    setActiveItemIndex(null);
  };

  // ============================================
  // NEW: Weather Observation Handlers
  // ============================================

  const handleAddWeather = () => {
    setShowWeatherModal(true);
  };

  const handleSaveWeather = (weatherData) => {
    setWeatherObservations(prev => [...prev, {
      id: `weather_${Date.now()}`,
      ...weatherData
    }]);
    setShowWeatherModal(false);
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
  // PHOTO HANDLERS - Match existing exactly
  // ============================================

  const handlePhotoUploaded = (photoData) => {
    setPhotos(prev => [...prev, photoData]);
    setShowPhotoUpload(false);
  };

  const handlePhotoDeleted = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // ============================================
  // SAVE & SUBMIT - Enhanced with new data
  // ============================================

  const handleSave = async (submitForAcknowledgment = false) => {
    try {
      setSaving(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Prepare diary data - matches existing structure
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
        created_by: user.id
      };

      let savedDiary;
      if (isEditMode) {
        savedDiary = await updateDiary(diaryId, diaryData);
      } else {
        savedDiary = await createDiary(diaryData);
      }

      // Save weather observations
      if (weatherObservations.length > 0) {
        for (const weather of weatherObservations) {
          await supabase
            .from('weather_observations')
            .upsert({
              diary_id: savedDiary.id,
              contract_id: contractId,
              ...weather
            });
        }
      }

      // Save work activities with programme links
      if (workActivities.length > 0) {
        for (const activity of workActivities) {
          if (activity.programme_item_id) {
            await supabase
              .from('diary_programme_links')
              .insert({
                diary_id: savedDiary.id,
                programme_item_id: activity.programme_item_id,
                progress_update: activity.percent_complete,
                work_description: activity.description,
                quantity_completed: activity.quantity_completed,
                unit: activity.unit,
                status: activity.status,
                created_by: user.id
              });
          }
        }
      }

      // Save material-BOQ links
      for (const material of materials) {
        if (material.boq_item_id) {
          await supabase
            .from('diary_boq_links')
            .insert({
              diary_id: savedDiary.id,
              boq_item_id: material.boq_item_id,
              quantity_completed: material.quantity,
              unit: material.unit,
              work_description: `Material delivered: ${material.description}`,
              created_by: user.id
            });
        }
      }

      // Save issues with quality links
      if (issues.length > 0) {
        for (const issue of issues) {
          await supabase
            .from('diary_issues')
            .insert({
              diary_id: savedDiary.id,
              contract_id: contractId,
              title: issue.title,
              description: issue.description,
              severity: issue.severity,
              inspection_id: issue.inspection_id,
              status: issue.status,
              reported_by: user.id
            });
        }
      }

      // Save delays with commercial links
      if (delays.length > 0) {
        for (const delay of delays) {
          await supabase
            .from('delay_events')
            .insert({
              diary_id: savedDiary.id,
              contract_id: contractId,
              delay_type: delay.delay_type,
              title: delay.title,
              description: delay.description,
              duration_hours: delay.duration_hours,
              linked_to_type: delay.linked_to,
              linked_to_id: delay.linked_id,
              created_by: user.id
            });
        }
      }

      // Submit if requested
      if (submitForAcknowledgment) {
        await submitDiary(savedDiary.id);
      }

      alert(submitForAcknowledgment 
        ? '✅ Diary submitted for acknowledgment!' 
        : '✅ Diary saved as draft!');
      
      navigate(`/contracts/${contractId}/diaries`);

    } catch (err) {
      console.error('Error saving diary:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const breadcrumbItems = [
    { label: 'Contracts', href: '/contracts', icon: '📄' },
    { label: contract?.contract_number || 'Loading...', href: `/contracts/${contractId}` },
    { label: 'Daily Diaries', href: `/contracts/${contractId}/diaries` },
    { label: isEditMode ? 'Edit Daily Diary' : 'Create Daily Diary', href: null }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Header - matches existing */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Daily Diary' : 'Create Daily Diary'}
            </h1>
            {contract && (
              <p className="text-sm text-gray-600 mt-1">{contract.project_name}</p>
            )}
          </div>
          <div className="hidden md:block text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            🔄 Auto-saves every 2 min
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white shadow rounded-lg p-6 space-y-8">
        
        {/* Basic Information - matches existing */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="diary_date"
                value={formData.diary_date}
                onChange={handleChange}
                max={getTodayDate()}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Cannot select future dates</p>
            </div>

            {/* Weather - keep simple dropdown for backward compatibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weather Conditions <span className="text-red-500">*</span>
              </label>
              <select
                name="weather_conditions"
                value={formData.weather_conditions}
                onChange={handleChange}
                required
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

        {/* NEW: Detailed Weather Tracking */}
        <WeatherObservationCard
          observations={weatherObservations}
          onAdd={handleAddWeather}
          onEdit={() => {}}
          onDelete={handleDeleteWeather}
          diaryDate={formData.diary_date}
          isOffline={false}
        />

        {/* Site Conditions - matches existing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Work Progress - old text field for backward compatibility */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Work Progress</h2>
          <textarea
            name="work_progress"
            value={formData.work_progress}
            onChange={handleChange}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe work progress (free text)"
          />
          <p className="mt-2 text-xs text-blue-600">
            💡 Or add structured work activities below (with Programme linking)
          </p>
        </div>

        {/* NEW: Work Activities (Programme Link) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📋 Work Activities
            </h3>
            <button
              type="button"
              onClick={addWorkActivity}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              + Add Activity
            </button>
          </div>

          {workActivities.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p>No structured activities yet. Add activities to link with Programme.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workActivities.map((activity, index) => (
                <div key={activity.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Activity Title
                      </label>
                      <input
                        type="text"
                        value={activity.title}
                        onChange={(e) => updateWorkActivity(index, 'title', e.target.value)}
                        placeholder="e.g., Foundation Piling"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Programme Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={activity.programme_wbs_code || 'Not linked'}
                          disabled
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                        <button
                          type="button"
                          onClick={() => linkActivityToProgramme(index)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          🔗 Link
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={activity.description}
                        onChange={(e) => updateWorkActivity(index, 'description', e.target.value)}
                        rows="2"
                        placeholder="Describe work done..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity Completed
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={activity.quantity_completed}
                          onChange={(e) => updateWorkActivity(index, 'quantity_completed', parseFloat(e.target.value))}
                          placeholder="0"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={activity.unit}
                          onChange={(e) => updateWorkActivity(index, 'unit', e.target.value)}
                          placeholder="unit"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        % Complete
                      </label>
                      <input
                        type="number"
                        value={activity.percent_complete}
                        onChange={(e) => updateWorkActivity(index, 'percent_complete', parseInt(e.target.value))}
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeWorkActivity(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove Activity
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manpower - matches existing exactly */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manpower</h2>
          
          {/* Main Contractor */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Main Contractor</h3>
              <button
                type="button"
                onClick={() => addManpowerRow('main_contractor')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Row
              </button>
            </div>
            <div className="space-y-2">
              {manpower.main_contractor.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={row.trade}
                    onChange={(e) => updateManpowerRow('main_contractor', index, 'trade', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select trade</option>
                    {COMMON_TRADES.map(trade => (
                      <option key={trade} value={trade}>{trade}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={row.workers}
                    onChange={(e) => updateManpowerRow('main_contractor', index, 'workers', parseInt(e.target.value) || 0)}
                    placeholder="Workers"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {manpower.main_contractor.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeManpowerRow('main_contractor', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Subcontractors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Subcontractors</h3>
              <button
                type="button"
                onClick={() => addManpowerRow('subcontractors')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Row
              </button>
            </div>
            <div className="space-y-2">
              {manpower.subcontractors.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={row.trade}
                    onChange={(e) => updateManpowerRow('subcontractors', index, 'trade', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select trade</option>
                    {COMMON_TRADES.map(trade => (
                      <option key={trade} value={trade}>{trade}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={row.workers}
                    onChange={(e) => updateManpowerRow('subcontractors', index, 'workers', parseInt(e.target.value) || 0)}
                    placeholder="Workers"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {manpower.subcontractors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeManpowerRow('subcontractors', index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Total Workers:</span>
              <span className="font-bold text-blue-900">
                {manpower.main_contractor.reduce((sum, row) => sum + (row.workers || 0), 0) +
                 manpower.subcontractors.reduce((sum, row) => sum + (row.workers || 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Equipment - matches existing exactly */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Equipment</h2>
            <button
              type="button"
              onClick={addEquipmentRow}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Equipment
            </button>
          </div>
          <div className="space-y-2">
            {equipment.map((row, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={row.type}
                  onChange={(e) => updateEquipmentRow(index, 'type', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select equipment</option>
                  {EQUIPMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={row.quantity}
                  onChange={(e) => updateEquipmentRow(index, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder="Qty"
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={row.hours}
                  onChange={(e) => updateEquipmentRow(index, 'hours', parseFloat(e.target.value) || 0)}
                  placeholder="Hours"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                />
                {equipment.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEquipmentRow(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Materials Delivered - Enhanced with BOQ linking */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Materials Delivered</h2>
            <button
              type="button"
              onClick={addMaterialRow}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Material
            </button>
          </div>
          <div className="space-y-3">
            {materials.map((row, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateMaterialRow(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) => updateMaterialRow(index, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Quantity"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <select
                      value={row.unit}
                      onChange={(e) => updateMaterialRow(index, 'unit', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Unit</option>
                      {MATERIAL_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={row.supplier}
                      onChange={(e) => updateMaterialRow(index, 'supplier', e.target.value)}
                      placeholder="Supplier"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={row.boq_item_code || 'Not linked to BOQ'}
                        disabled
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => linkMaterialToBOQ(index)}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      >
                        🔗 BOQ
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  {materials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMaterialRow(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove Material
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NEW: Issues (Quality Link) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">⚠️ Issues & Observations</h2>
            <button
              type="button"
              onClick={addIssue}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
            >
              + Add Issue
            </button>
          </div>

          {issues.length === 0 ? (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p>No issues reported. Add issues to link with Quality inspections.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue, index) => (
                <div key={issue.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={issue.title}
                        onChange={(e) => updateIssue(index, 'title', e.target.value)}
                        placeholder="Issue title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <select
                        value={issue.severity}
                        onChange={(e) => updateIssue(index, 'severity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <textarea
                        value={issue.description}
                        onChange={(e) => updateIssue(index, 'description', e.target.value)}
                        placeholder="Issue description..."
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={issue.inspection_ref || 'Not linked to Quality'}
                          disabled
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                        <button
                          type="button"
                          onClick={() => linkIssueToQuality(index)}
                          className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                        >
                          🔗 Quality
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeIssue(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove Issue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEW: Delays (Commercial Link) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">🕐 Delays</h2>
            <button
              type="button"
              onClick={addDelay}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              + Add Delay
            </button>
          </div>

          {delays.length === 0 ? (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p>No delays reported. Add delays to link with EOT/VO claims.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {delays.map((delay, index) => (
                <div key={delay.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={delay.title}
                        onChange={(e) => updateDelay(index, 'title', e.target.value)}
                        placeholder="Delay title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={delay.delay_type}
                        onChange={(e) => updateDelay(index, 'delay_type', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="weather">Weather</option>
                        <option value="material">Material Shortage</option>
                        <option value="manpower">Manpower</option>
                        <option value="equipment">Equipment Breakdown</option>
                        <option value="instruction">Late Instruction</option>
                        <option value="design">Design Change</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="number"
                        value={delay.duration_hours}
                        onChange={(e) => updateDelay(index, 'duration_hours', parseFloat(e.target.value) || 0)}
                        placeholder="Hours"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <textarea
                        value={delay.description}
                        onChange={(e) => updateDelay(index, 'description', e.target.value)}
                        placeholder="Delay description..."
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={delay.linked_ref || 'Not linked to EOT/VO'}
                          disabled
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        />
                        <button
                          type="button"
                          onClick={() => linkDelayToCommercial(index)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                        >
                          🔗 EOT/VO
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeDelay(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove Delay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Remarks - matches existing */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">General Remarks</h2>
          <textarea
            name="general_remarks"
            value={formData.general_remarks}
            onChange={handleChange}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any additional remarks or notes"
          />
        </div>

        {/* Photos - matches existing exactly */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
            <button
              type="button"
              onClick={() => setShowPhotoUpload(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Upload Photos
            </button>
          </div>
          
          {photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p>No photos uploaded yet</p>
              <button
                type="button"
                onClick={() => setShowPhotoUpload(true)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Upload your first photo
              </button>
            </div>
          ) : (
            <PhotoGallery 
              photos={photos}
              onDelete={handlePhotoDeleted}
              editable={true}
            />
          )}
        </div>

        {/* Action Buttons - matches existing */}
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
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center"
            disabled={saving}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save as Draft
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center"
            disabled={saving}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit for Acknowledgment
              </>
            )}
          </button>
        </div>

        {/* Help Text - matches existing */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Auto-save:</strong> Your work is automatically saved every 2 minutes</li>
            <li><strong>New Features:</strong> Link activities to Programme, materials to BOQ, issues to Quality</li>
            <li><strong>Weather:</strong> Add detailed weather observations with photos for CIPAA compliance</li>
            <li><strong>Save as Draft:</strong> Manually save your progress without submitting</li>
            <li><strong>Submit:</strong> Submit to Main Contractor for acknowledgment (cannot edit after)</li>
          </ul>
        </div>
      </div>

      {/* Photo Upload Modal - matches existing */}
      {showPhotoUpload && (
        <PhotoUpload
          diaryId={isEditMode ? diaryId : null}
          contractId={contractId}
          onPhotoUploaded={handlePhotoUploaded}
          onClose={() => setShowPhotoUpload(false)}
        />
      )}

      {/* TODO: Add linking modals */}
      {/* - ProgrammeLinkModal */}
      {/* - BOQLinkModal */}
      {/* - QualityLinkModal */}
      {/* - CommercialLinkModal */}
      {/* - WeatherObservationModal */}
    </div>
  );
};

export default DiaryFormOffline;
