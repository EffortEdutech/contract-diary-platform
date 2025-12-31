// ============================================
// DIARY FORM WITH AUTO-SAVE - Phase 3A
// ============================================
// Purpose: Create and edit daily work diary entries with auto-save
// Features: Auto-save every 2 minutes, localStorage backup, save indicator
// Mobile-optimized with dynamic arrays
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  createDiary,
  updateDiary,
  getDiaryById,
  submitDiary,
  validateDiaryDate,
  getTodayDate,
  WEATHER_OPTIONS,
  COMMON_TRADES,
  EQUIPMENT_TYPES,
  MATERIAL_UNITS,
  DIARY_STATUS
} from '../../services/diaryService';
import { supabase } from '../../lib/supabase';
import PhotoUpload from '../../components/diary/PhotoUpload';
import PhotoGallery from '../../components/diary/PhotoGallery';

const DiaryForm = () => {
  const { contractId, diaryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = !!diaryId;

  // State
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const hasChangesRef = useRef(false);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);

  // Form data
  const [formData, setFormData] = useState({
    diary_date: getTodayDate(),
    weather_conditions: '',
    site_conditions: '',
    work_progress: '',
    issues_delays: ''
  });

  // Dynamic arrays
  const [manpower, setManpower] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [materials, setMaterials] = useState([]);

  // ============================================
  // AUTO-SAVE FUNCTIONS
  // ============================================

  const getLocalStorageKey = () => {
    return `diary_autosave_${contractId}_${diaryId || 'new'}`;
  };

  const saveToLocalStorage = () => {
    try {
      const data = {
        formData,
        manpower,
        equipment,
        materials,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(data));
      console.log('Saved to localStorage');
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const key = getLocalStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        console.log('Found autosaved data from:', data.timestamp);
        return data;
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    }
    return null;
  };

  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(getLocalStorageKey());
      console.log('Cleared localStorage');
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  };

  const performAutoSave = async () => {
    // Don't auto-save if no changes
    if (!hasChangesRef.current) {
      console.log('No changes to auto-save');
      return;
    }

    // Don't auto-save if already saving
    if (saving) {
      console.log('Already saving, skipping auto-save');
      return;
    }

    try {
      setAutoSaveStatus('saving');
      console.log('Auto-saving...');

      const diaryData = {
        ...formData,
        contract_id: contractId,
        manpower,
        equipment,
        materials_delivered: materials
      };

      if (isEditMode) {
        // Update existing diary
        await updateDiary(diaryId, diaryData);
      } else {
        // For new diaries, save to localStorage only
        // Don't create in database until user explicitly saves
        saveToLocalStorage();
      }

      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      hasChangesRef.current = false;
      
      // Reset to idle after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 3000);

    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('error');
      
      // Save to localStorage as backup
      saveToLocalStorage();
      
      // Reset to idle after 5 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 5000);
    }
  };

  const startAutoSaveTimer = () => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Start new timer (2 minutes = 120000ms)
    autoSaveTimerRef.current = setInterval(() => {
      performAutoSave();
    }, 120000); // 2 minutes

    console.log('Auto-save timer started (2 minutes interval)');
  };

  const stopAutoSaveTimer = () => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      console.log('Auto-save timer stopped');
    }
  };

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    loadData();
    
    // Start auto-save timer
    startAutoSaveTimer();

    // Cleanup on unmount
    return () => {
      stopAutoSaveTimer();
    };
  }, [contractId, diaryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load contract
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      // If edit mode, load existing diary
      if (isEditMode) {
        const diary = await getDiaryById(diaryId);
        
        setFormData({
          diary_date: diary.diary_date,
          weather_conditions: diary.weather_conditions || '',
          site_conditions: diary.site_conditions || '',
          work_progress: diary.work_progress || '',
          issues_delays: diary.issues_delays || ''
        });

        setManpower(diary.manpower || []);
        setEquipment(diary.equipment || []);
        setMaterials(diary.materials_delivered || []);
      } else {
        // Check for autosaved data in localStorage
        const autosaved = loadFromLocalStorage();
        if (autosaved) {
          const shouldRestore = window.confirm(
            'Found an autosaved draft from ' + new Date(autosaved.timestamp).toLocaleString() + 
            '. Would you like to restore it?'
          );
          
          if (shouldRestore) {
            setFormData(autosaved.formData);
            setManpower(autosaved.manpower || []);
            setEquipment(autosaved.equipment || []);
            setMaterials(autosaved.materials || []);
            console.log('Restored from autosave');
          } else {
            clearLocalStorage();
          }
        }
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FORM HANDLERS
  // ============================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    hasChangesRef.current = true;
    saveToLocalStorage(); // Save immediately to localStorage
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError(null);
      stopAutoSaveTimer(); // Stop auto-save during manual save

      const diaryData = {
        ...formData,
        contract_id: contractId,
        manpower,
        equipment,
        materials_delivered: materials
      };

      if (isEditMode) {
        await updateDiary(diaryId, diaryData);
        alert('Draft saved successfully!');
        clearLocalStorage(); // Clear localStorage after successful save
        hasChangesRef.current = false;
      } else {
        const newDiary = await createDiary(diaryData);
        alert('Draft saved successfully!');
        clearLocalStorage(); // Clear localStorage after successful save
        hasChangesRef.current = false;
        navigate(`/contracts/${contractId}/diaries/${newDiary.id}/edit`);
      }

    } catch (err) {
      console.error('Error saving draft:', err);
      setError(err.message);
      saveToLocalStorage(); // Save to localStorage as backup
    } finally {
      setSaving(false);
      startAutoSaveTimer(); // Restart auto-save timer
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      stopAutoSaveTimer(); // Stop auto-save during submit

      // Validate required fields
      if (!formData.weather_conditions) {
        throw new Error('Weather conditions are required');
      }
      if (!formData.work_progress) {
        throw new Error('Work progress description is required');
      }

      const diaryData = {
        ...formData,
        contract_id: contractId,
        manpower,
        equipment,
        materials_delivered: materials
      };

      let diaryIdToSubmit = diaryId;

      // Create or update
      if (isEditMode) {
        await updateDiary(diaryId, diaryData);
      } else {
        const newDiary = await createDiary(diaryData);
        diaryIdToSubmit = newDiary.id;
      }

      // Submit for acknowledgment
      await submitDiary(diaryIdToSubmit);
      
      clearLocalStorage(); // Clear localStorage after successful submit
      alert('Diary submitted successfully!');
      navigate(`/contracts/${contractId}/diaries`);

    } catch (err) {
      console.error('Error submitting diary:', err);
      setError(err.message);
      startAutoSaveTimer(); // Restart auto-save if submission failed
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // MANPOWER HANDLERS
  // ============================================

  const addManpower = () => {
    setManpower([...manpower, { trade: '', count: '', hours: 8 }]);
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  const updateManpower = (index, field, value) => {
    const updated = [...manpower];
    updated[index][field] = value;
    setManpower(updated);
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  const removeManpower = (index) => {
    setManpower(manpower.filter((_, i) => i !== index));
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  // ============================================
  // EQUIPMENT HANDLERS
  // ============================================

  const addEquipment = () => {
    setEquipment([...equipment, { type: '', unit_no: '', hours: '', breakdown: false }]);
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  const updateEquipment = (index, field, value) => {
    const updated = [...equipment];
    updated[index][field] = value;
    setEquipment(updated);
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  const removeEquipment = (index) => {
    setEquipment(equipment.filter((_, i) => i !== index));
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  // ============================================
  // MATERIALS HANDLERS
  // ============================================

  const addMaterial = () => {
    setMaterials([...materials, { material: '', quantity: '', unit: 'm³', supplier: '', DO_number: '' }]);
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  const updateMaterial = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  const removeMaterial = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
    hasChangesRef.current = true;
    saveToLocalStorage();
  };

  // ============================================
  // AUTO-SAVE STATUS INDICATOR
  // ============================================

  const renderAutoSaveIndicator = () => {
    if (autoSaveStatus === 'idle') return null;

    const statusConfig = {
      saving: {
        icon: (
          <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ),
        text: 'Auto-saving...',
        color: 'text-blue-600',
        bg: 'bg-blue-50'
      },
      saved: {
        icon: (
          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        text: lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : 'Saved',
        color: 'text-green-600',
        bg: 'bg-green-50'
      },
      error: {
        icon: (
          <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        text: 'Saved locally (offline)',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50'
      }
    };

    const config = statusConfig[autoSaveStatus];

    return (
      <div className={`fixed bottom-4 right-4 ${config.bg} rounded-lg shadow-lg px-4 py-2 flex items-center space-x-2 border ${config.color} border-opacity-20 animate-fade-in z-50`}>
        {config.icon}
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/contracts/${contractId}/diaries`)}
          className="text-blue-600 hover:text-blue-800 mb-2 flex items-center text-sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Diaries
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Daily Diary' : 'Create Daily Diary'}
            </h1>
            {contract && (
              <p className="text-sm text-gray-600 mt-1">{contract.project_name}</p>
            )}
          </div>
          {/* Auto-save info badge */}
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
        
        {/* Basic Information Section */}
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

            {/* Weather */}
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
            </div>
          </div>
        </div>

        {/* Site Conditions */}
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
            placeholder="Describe overall site conditions..."
          />
        </div>

        {/* Work Progress */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Progress <span className="text-red-500">*</span>
          </label>
          <textarea
            name="work_progress"
            value={formData.work_progress}
            onChange={handleChange}
            rows="4"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe work completed today..."
          />
        </div>

        {/* Manpower Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Manpower</h2>
            <button
              type="button"
              onClick={addManpower}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Worker
            </button>
          </div>

          {manpower.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600">No manpower recorded yet</p>
              <button
                type="button"
                onClick={addManpower}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add your first worker entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {manpower.map((m, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Trade */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Trade
                      </label>
                      <select
                        value={m.trade}
                        onChange={(e) => updateManpower(index, 'trade', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select trade</option>
                        {COMMON_TRADES.map(trade => (
                          <option key={trade} value={trade}>{trade}</option>
                        ))}
                      </select>
                    </div>

                    {/* Count */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Workers
                      </label>
                      <input
                        type="number"
                        value={m.count}
                        onChange={(e) => updateManpower(index, 'count', e.target.value)}
                        min="0"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>

                    {/* Hours */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Hours
                      </label>
                      <input
                        type="number"
                        value={m.hours}
                        onChange={(e) => updateManpower(index, 'hours', e.target.value)}
                        min="0"
                        step="0.5"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="8"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeManpower(index)}
                    className="mt-2 text-red-600 hover:text-red-800 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {manpower.length > 0 && (
            <div className="mt-3 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
              <span className="font-medium">Total: </span>
              {manpower.reduce((sum, m) => sum + (parseInt(m.count) || 0), 0)} workers, {' '}
              {manpower.reduce((sum, m) => sum + ((parseInt(m.count) || 0) * (parseFloat(m.hours) || 0)), 0).toFixed(1)} man-hours
            </div>
          )}
        </div>

        {/* Equipment Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Equipment</h2>
            <button
              type="button"
              onClick={addEquipment}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Equipment
            </button>
          </div>

          {equipment.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600">No equipment recorded yet</p>
              <button
                type="button"
                onClick={addEquipment}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add your first equipment entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {equipment.map((e, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Type */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Equipment Type
                      </label>
                      <select
                        value={e.type}
                        onChange={(ev) => updateEquipment(index, 'type', ev.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select equipment</option>
                        {EQUIPMENT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Unit Number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit No.
                      </label>
                      <input
                        type="text"
                        value={e.unit_no}
                        onChange={(ev) => updateEquipment(index, 'unit_no', ev.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="EX-001"
                      />
                    </div>

                    {/* Hours */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Hours
                      </label>
                      <input
                        type="number"
                        value={e.hours}
                        onChange={(ev) => updateEquipment(index, 'hours', ev.target.value)}
                        min="0"
                        step="0.5"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="8"
                      />
                    </div>
                  </div>

                  {/* Breakdown Checkbox */}
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      checked={e.breakdown}
                      onChange={(ev) => updateEquipment(index, 'breakdown', ev.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Equipment breakdown occurred
                    </label>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeEquipment(index)}
                    className="mt-2 text-red-600 hover:text-red-800 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Materials Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Materials Delivered</h2>
            <button
              type="button"
              onClick={addMaterial}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Material
            </button>
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-600">No materials recorded yet</p>
              <button
                type="button"
                onClick={addMaterial}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add your first material delivery
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((mat, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Material Name */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Material Name
                      </label>
                      <input
                        type="text"
                        value={mat.material}
                        onChange={(e) => updateMaterial(index, 'material', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Ready Mix Concrete C30"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={mat.quantity}
                        onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <select
                        value={mat.unit}
                        onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        {MATERIAL_UNITS.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>

                    {/* Supplier */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Supplier
                      </label>
                      <input
                        type="text"
                        value={mat.supplier}
                        onChange={(e) => updateMaterial(index, 'supplier', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="Supplier name"
                      />
                    </div>

                    {/* DO Number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        DO Number
                      </label>
                      <input
                        type="text"
                        value={mat.DO_number}
                        onChange={(e) => updateMaterial(index, 'DO_number', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="DO-12345"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeMaterial(index)}
                    className="mt-2 text-red-600 hover:text-red-800 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Issues and Delays */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Issues & Delays
          </label>
          <textarea
            name="issues_delays"
            value={formData.issues_delays}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Record any issues, delays, or concerns..."
          />
        </div>

        {/* Photo Management Section */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
              <p className="text-sm text-gray-600 mt-1">
                Visual documentation for CIPAA compliance
              </p>
            </div>
            {diaryId && (
              <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Visual Evidence
              </span>
            )}
          </div>
          
          {/* For existing diaries (edit mode) - Show Gallery + Upload */}
          {diaryId ? (
            <div className="space-y-6">
              
              {/* Existing Photos Gallery */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Uploaded Photos
                </h3>
                
                {/* Photo Gallery Component */}
                <PhotoGallery
                  key={photoRefreshKey} // Force refresh when photos uploaded
                  diaryId={diaryId}
                  canEdit={true} // Can delete in edit mode
                  onPhotoDeleted={(photoId) => {
                    console.log('Photo deleted:', photoId);
                    // Optionally show success message
                  }}
                />
              </div>

              {/* Upload New Photos */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add More Photos
                </h3>
                
                {/* Photo Upload Component */}
                <PhotoUpload
                  diaryId={diaryId}
                  onUploadComplete={(results) => {
                    console.log('Photos uploaded:', results);
                    
                    // Show success message
                    if (results.successful.length > 0) {
                      const message = results.failed.length > 0
                        ? `${results.successful.length} photo(s) uploaded, ${results.failed.length} failed`
                        : `${results.successful.length} photo(s) uploaded successfully!`;
                      alert(message);
                      
                      // Refresh gallery to show new photos
                      setPhotoRefreshKey(prev => prev + 1);
                    }
                    
                    // Show failure message if all failed
                    if (results.failed.length > 0 && results.successful.length === 0) {
                      alert(`Failed to upload ${results.failed.length} photo(s)`);
                    }
                  }}
                  disabled={saving}
                />
              </div>



              {/* CIPAA Compliance Note */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-green-800">
                    <strong>CIPAA Compliance:</strong> Photos serve as timestamped evidence. 
                    They will be locked when you submit this diary and cannot be modified.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // For new diaries (create mode) - Show info message
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Add Photos After Saving</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Save this diary as a draft first, then you can add photos to document your work. 
                    Photos are essential for CIPAA compliance and dispute prevention.
                  </p>
                  <ul className="mt-2 text-xs text-blue-600 space-y-1 ml-4">
                    <li className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Site conditions and progress
                    </li>
                    <li className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Equipment and materials
                    </li>
                    <li className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Before/after comparisons
                    </li>
                    <li className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Timestamped evidence
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(`/contracts/${contractId}/diaries`)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition"
            disabled={saving}
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center"
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
            onClick={handleSubmit}
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

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Auto-save:</strong> Your work is automatically saved every 2 minutes</li>
            <li><strong>Local backup:</strong> Changes are backed up locally as you type</li>
            <li><strong>Save as Draft:</strong> Manually save your progress without submitting</li>
            <li><strong>Submit:</strong> Submit to Main Contractor for acknowledgment (cannot edit after)</li>
            <li><strong>Required fields:</strong> Date, Weather, and Work Progress</li>
          </ul>
        </div>
      </div>

      {/* Auto-save Status Indicator (Fixed position) */}
      {renderAutoSaveIndicator()}
    </div>
  );
};

export default DiaryForm;