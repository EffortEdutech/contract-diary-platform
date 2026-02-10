// ============================================================================
// CORRECTED DIARY FORM - Proper Malaysian Construction Workflow
// ============================================================================
// File: frontend/src/pages/diaries/DiaryFormOffline.js
// Purpose: Work diary with proper site workflow (Inspection/Test, Observations)
// Corrections: 
// - Work Activity can trigger Inspection/Test requests
// - Observations link to multiple: EOT, VO, QC, RFI
// - No separate Delays section
// - Proper equipment labels
// - Fixed photo upload (only after diary created)
// - Fixed BOQ query
// - Added Weather modal
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
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
import WorkLedgerLinkModal from '../../components/diary/WorkLedgerLinkModal';

const DiaryFormOffline = () => {
  const { contractId, diaryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!diaryId;

  
  // State
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  // ✅ ADD these two new states
  const [weatherPendingPhotos, setWeatherPendingPhotos] = useState({});
  const [observationIdMapping, setObservationIdMapping] = useState({});

  // Form data
  const [formData, setFormData] = useState({
    diary_date: getTodayDate(),
    weather_conditions: '',
    site_conditions: '',
    work_progress: '',
    general_remarks: '',
    status: 'draft' 
  });

  const isDraft = formData.status === 'draft';

  // Dynamic arrays
  const [manpower, setManpower] = useState({
    main_contractor: [{ trade: '', workers: 0, hours: 0 }],  // ✅ ADD hours
    subcontractors: [{ trade: '', workers: 0, hours: 0 }]    // ✅ ADD hours
  });

  const [equipment, setEquipment] = useState([
    { type: '', quantity: 0, hours: 0 }
  ]);

  const [materials, setMaterials] = useState([
    { description: '', quantity: 0, unit: '', supplier: '', do_number: '', boq_item_id: null, boq_item_description: '' }
  ]);

  // NEW CORRECTED: Work Activities with Inspection/Test flags
  const [workActivities, setWorkActivities] = useState([]);

  // NEW CORRECTED: Observations (can link to multiple: EOT, VO, QC, RFI)
  const [observations, setObservations] = useState([]);

  // NEW CORRECTED: Inspection/Test Requests (generated from activities)
  const [inspectionTestRequests, setInspectionTestRequests] = useState([]);

  // Weather observations
  const [weatherObservations, setWeatherObservations] = useState([]);

  // Reference data for linking
  const [programmeItems, setProgrammeItems] = useState([]);
  const [boqItems, setBOQItems] = useState([]);

  // Photos - only after diary saved
  const [photos, setPhotos] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]); // Store files until diary created

  // Modals
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [editingWeather, setEditingWeather] = useState(null);
  const [showProgrammeLink, setShowProgrammeLink] = useState(false);
  const [showBOQLink, setShowBOQLink] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  const [showLedgerLink, setShowLedgerLink] = useState(false);

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
    // ✅ ADD THIS - Cleanup to prevent duplicates
    return () => {
      setWeatherObservations([]);
    };    
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
      const { data: progData, error: progError } = await supabase
        .from('programme_items')
        .select('*')
        .eq('contract_id', contractId)
        .order('wbs_code');
      
      if (progError) {
        console.error('Error loading programme items:', progError);
      } else {
        setProgrammeItems(progData || []);
      }

      // ✅ FIXED: Load all BOQ items (no contract filter)
      const { data: boqData, error: boqError } = await supabase
        .from('boq_items')
        .select(`
          id,
          item_number,
          description,
          unit,
          quantity,
          unit_rate,
          item_type,
          boq_id,
          boq!inner(contract_id)
        `)
        .eq('boq.contract_id', contractId)
        .order('item_number', { ascending: true });


      if (boqError) {
        console.error('Error loading BOQ items:', boqError);
        setBOQItems([]);
      } else {
        setBOQItems(boqData || []);
      }


    } catch (err) {
      console.error('Error loading reference data:', err);
      // Don't fail the whole form if reference data fails
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
        general_remarks: diary.general_remarks || '',
        status: diary.status || 'draft'
      });

      // FIX: Handle manpower data structure properly
      // Check if manpower is an object with the correct structure
      if (diary.manpower && typeof diary.manpower === 'object') {
        // New structure: { main_contractor: [...], subcontractors: [...] }
        if (Array.isArray(diary.manpower.main_contractor) && 
            Array.isArray(diary.manpower.subcontractors)) {
          setManpower(diary.manpower);
        } else {
          // Fallback: Invalid structure, use default
          setManpower({
            main_contractor: [{ trade: '', workers: 0 }],
            subcontractors: [{ trade: '', workers: 0 }]
            
          });
        }
      } else {
        // No manpower data, use default
        setManpower({
          main_contractor: [{ trade: '', workers: 0 }],
          subcontractors: [{ trade: '', workers: 0 }]
        });
      }

      // FIX: Handle equipment array, ensure no NaN values
      if (diary.equipment && Array.isArray(diary.equipment)) {
        const validEquipment = diary.equipment.map(item => ({
          type: item.type || '',
          quantity: Number(item.quantity) || 0,  // Convert to number, default 0
          hours: Number(item.hours) || 0         // Convert to number, default 0
        }));
        setEquipment(validEquipment);
      } else {
        setEquipment([{ type: '', quantity: 0, hours: 0 }]);
      }

      // FIX: Handle materials array
      if (diary.materials_delivered && Array.isArray(diary.materials_delivered)) {
        const validMaterials = diary.materials_delivered.map(item => ({
          description: item.description || '',
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '',
          supplier: item.supplier || '',
          do_number: item.do_number || '',   
          boq_item_id: item.boq_item_id || null,
          boq_item_code: item.boq_item_code || ''
        }));
        setMaterials(validMaterials);
      } else {
        setMaterials([{ description: '', quantity: 0, unit: '', supplier: '' ,do_number: '', boq_item_id: null, boq_item_code: ''}]);
      }

      // Load weather observations
      const { data: weatherData, error: weatherError } = await supabase
        .from('weather_observations')
        .select('*')
        .eq('diary_id', diaryId)
        .order('observation_time');

      if (weatherError) {
        console.error('Error loading weather observations:', weatherError);
        setWeatherObservations([]);
      } else if (weatherData && weatherData.length > 0) {
        console.log(`✅ Loaded ${weatherData.length} weather observations`);
        setWeatherObservations(weatherData);
      } else {
        console.log('No weather observations found');
        setWeatherObservations([]);
      }

      // Load photos
      const { data: photoData } = await supabase
        .from('diary_photos')
        .select('*')
        .eq('diary_id', diaryId)
        .order('uploaded_at');
      setPhotos(photoData || []);

      // ✅ ADD THIS - Load inspection/test requests from database
      const { data: requestsData, error: requestsError } = await supabase
        .from('inspection_test_requests')
        .select('*')
        .eq('diary_id', diaryId)
        .order('created_at');

      if (requestsError) {
        console.error('Error loading inspection/test requests:', requestsError);
        setInspectionTestRequests([]);
      } else if (requestsData && requestsData.length > 0) {
        console.log(`✅ Loaded ${requestsData.length} inspection/test requests`);
        
        // Map database format to state format
        const loadedRequests = requestsData.map(req => ({
          id: req.id,
          activity_id: req.activity_id || `activity_${req.id}`, // Fallback if activity_id is null
          activity_title: req.activity_title || 'N/A',
          type: req.request_type, // Database uses 'request_type', state uses 'type'
          inspection_type: req.inspection_type || '',
          test_type: req.test_type || '',
          status: req.status || 'pending',
          requested_date: req.requested_date || formData.diary_date,
          notes: req.notes || ''
        }));
        
        setInspectionTestRequests(loadedRequests);
      } else {
        console.log('No inspection/test requests found');
        setInspectionTestRequests([]);
      }

      // ✅ ADD THIS - Load work activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('diary_work_activities')
        .select('*')
        .eq('diary_id', diaryId)
        .order('created_at');
      
      if (activitiesError) {
        console.error('Error loading activities:', activitiesError);
        setWorkActivities([]);
      } else if (activitiesData && activitiesData.length > 0) {
        console.log(`✅ Loaded ${activitiesData.length} activities`);
        const loadedActivities = activitiesData.map(act => ({
          id: act.id,
          title: act.title || '',
          description: act.description || '',
          quantity_completed: act.quantity_completed || 0,
          unit: act.unit || '',
          percent_complete: act.percent_complete || 0,
          status: act.status || 'in_progress',
          notes: act.notes || '',
          requires_inspection: act.requires_inspection || false,
          inspection_type: act.inspection_type || '',
          requires_test: act.requires_test || false,
          test_type: act.test_type || '',
          programme_item_id: act.programme_item_id || null,  // ✅ ADDED
          programme_wbs_code: act.programme_wbs_code || ''   // ✅ ADDED
        }));
        setWorkActivities(loadedActivities);
      } else {
        console.log('No activities found');
        setWorkActivities([]);
      }

    } catch (err) {
      console.error('Error loading diary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PHOTO RELOAD FUNCTION
  // ============================================
  
  // Add this function if it doesn't exist
  const loadPhotos = async () => {
    if (!diaryId) return;
    
    try {
      const { data: photoData } = await supabase
        .from('diary_photos')
        .select('*')
        .eq('diary_id', diaryId)
        .order('uploaded_at');
      setPhotos(photoData || []);
      console.log(`✅ Refreshed ${photoData?.length || 0} photos`);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  // Refresh all photos (weather + general)
  const refreshAllPhotos = async () => {
    if (!diaryId) return;
    
    try {
      console.log('🔄 Refreshing all photos...');
      
      // Reload main diary photos
      const { data: photoData } = await supabase
        .from('diary_photos')
        .select('*')
        .eq('diary_id', diaryId)
        .order('uploaded_at');
      setPhotos(photoData || []);
      
      console.log(`✅ Refreshed ${photoData?.length || 0} total photos`);
    } catch (error) {
      console.error('Error refreshing photos:', error);
    }
  };

  // ============================================
  // FORM HANDLERS
  // ============================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Manpower handlers
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
      [category]: prev[category].map((row, i) => {
        if (i === index) {
          // FIX: Convert to number and default to 0 to prevent NaN
          if (field === 'workers') {
            const numValue = parseInt(value);
            return { 
              ...row, 
              workers: isNaN(numValue) ? 0 : numValue 
            };
          }
          return { ...row, [field]: value };
        }
        return row;
      })
    }));
  };

  // Equipment handlers
  const addEquipmentRow = () => {
    setEquipment(prev => [...prev, { type: '', quantity: 0, hours: 0 }]);
  };

  const removeEquipmentRow = (index) => {
    setEquipment(prev => prev.filter((_, i) => i !== index));
  };

  const updateEquipmentRow = (index, field, value) => {
    setEquipment(prev => prev.map((row, i) => {
      if (i === index) {
        // FIX: Convert to number and default to 0 to prevent NaN
        if (field === 'quantity' || field === 'hours') {
          const numValue = parseFloat(value);
          return { 
            ...row, 
            [field]: isNaN(numValue) ? 0 : numValue 
          };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Material handlers
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
    setMaterials(prev => prev.map((row, i) => {
      if (i === index) {
        // FIX: Convert to number and default to 0 to prevent NaN
        if (field === 'quantity') {
          const numValue = parseFloat(value);
          return { 
            ...row, 
            quantity: isNaN(numValue) ? 0 : numValue 
          };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const linkMaterialToBOQ = (index) => {
    setActiveItemIndex(index);
    setShowBOQLink(true);
  };

  const handleBOQLinkSelected = (boqItem) => {
    if (activeItemIndex !== null) {
      updateMaterialRow(activeItemIndex, 'boq_item_id', boqItem.id);
      updateMaterialRow(activeItemIndex, 'boq_item_code', boqItem.description);
      updateMaterialRow(activeItemIndex, 'description', boqItem.description);
      updateMaterialRow(activeItemIndex, 'unit', boqItem.unit);
    }
    setShowBOQLink(false);
    setActiveItemIndex(null);
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

  const openLedgerLinkModal = (index) => {
    setActiveItemIndex(index);
    setShowLedgerLink(true);
  };

  // ============================================
  // NEW CORRECTED: Work Activity Handlers
  // ============================================

  const addWorkActivity = () => {
    const newActivity = {
      id: `activity_${Date.now()}`,
      title: '',
      description: '',
      programme_item_id: null,
      programme_wbs_code: '',
      quantity_completed: 0,
      unit: '',
      percent_complete: 0,
      status: 'in_progress',
      notes: '',
      requires_inspection: false,  // NEW
      requires_test: false,          // NEW
      inspection_type: '',           // NEW: e.g., "Rebar", "Formwork"
      test_type: ''                  // NEW: e.g., "Cube Test", "Compaction Test"
    };
    setWorkActivities(prev => [...prev, newActivity]);
  };

  const removeWorkActivity = (index) => {
    const activity = workActivities[index];
    // Also remove any inspection/test requests linked to this activity
    setInspectionTestRequests(prev => 
      prev.filter(req => req.activity_id !== activity.id)
    );
    setWorkActivities(prev => prev.filter((_, i) => i !== index));
  };

  const updateWorkActivity = (index, field, value) => {
    setWorkActivities(prev =>
      prev.map((act, i) => {
        if (i !== index) return act;

        const updated = { ...act };

        // -------------------------------------------------------
        // ✅ Numeric handling (Sprint 1 + existing fields)
        // -------------------------------------------------------
        const numericFieldsFloat = new Set([
          'quantity_completed',
          'boq_quantity_completed',
        ]);

        const numericFieldsInt = new Set([
          'percent_complete',
          'boq_percent_complete',
        ]);

        if (numericFieldsFloat.has(field)) {
          // allow blank to mean "not provided"
          if (value === '' || value === null || value === undefined) {
            updated[field] = null;
          } else {
            const numValue = parseFloat(value);
            updated[field] = Number.isFinite(numValue) ? numValue : null;
          }
        } else if (numericFieldsInt.has(field)) {
          // allow blank to mean "not provided"
          if (value === '' || value === null || value === undefined) {
            updated[field] = null;
          } else {
            const numValue = parseInt(value, 10);
            updated[field] = Number.isFinite(numValue) ? numValue : null;
          }
        } else {
          updated[field] = value;
        }

        // -------------------------------------------------------
        // ✅ Only trigger on checkbox change
        // -------------------------------------------------------
        if (field === 'requires_inspection') {
          if (value === true) addInspectionRequest(updated, 'inspection');
          else removeInspectionRequest(updated.id, 'inspection');
        }

        if (field === 'requires_test') {
          if (value === true) addInspectionRequest(updated, 'test');
          else removeInspectionRequest(updated.id, 'test');
        }

        return updated;
      })
    );
  };

  // ============================================
  // NEW CORRECTED: Inspection/Test Request Handlers
  // ============================================

  const addInspectionRequest = (activity, type) => {
    // ✅ CHECK FOR DUPLICATES FIRST
    setInspectionTestRequests(prev => {
      // Check if request already exists
      const exists = prev.some(
        req => req.activity_id === activity.id && req.type === type
      );
      
      // Don't add if duplicate
      if (exists) {
        console.log(`${type} request already exists for activity ${activity.id}`);
        return prev; // Return unchanged
      }
      
      // Add new request
      const newRequest = {
        id: `req_${type}_${activity.id}_${Date.now()}`,
        activity_id: activity.id,
        activity_title: activity.title,
        type: type,
        inspection_type: type === 'inspection' ? activity.inspection_type : '',
        test_type: type === 'test' ? activity.test_type : '',
        status: 'pending',
        requested_date: formData.diary_date,
        notes: ''
      };
      
      return [...prev, newRequest];
    });
  };

  const removeInspectionRequest = (activityId, type) => {
    setInspectionTestRequests(prev => 
      prev.filter(req => !(req.activity_id === activityId && req.type === type))
    );
  };

  const updateInspectionRequest = (index, field, value) => {
    setInspectionTestRequests(prev => prev.map((req, i) => 
      i === index ? { ...req, [field]: value } : req
    ));
  };

  // ============================================
  // NEW CORRECTED: Observation Handlers
  // (can link to EOT, VO, QC, RFI)
  // ============================================

  const addObservation = () => {
    setObservations(prev => [...prev, {
      id: `obs_${Date.now()}`,
      title: '',
      description: '',
      category: 'general', // general, quality, commercial, technical
      severity: 'low',
      linked_to: [], // Array of links: [{type: 'eot', id: 'xxx'}, {type: 'vo', id: 'yyy'}]
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
  // Weather Observation Handlers
  // ============================================

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
      if (editingWeather && editingWeather.id) {
        // ============================================
        // EDITING EXISTING OBSERVATION
        // ============================================
        
        // Check if observation has a real UUID (from database)
        const isRealObservation = editingWeather.id && 
                                  !editingWeather.id.startsWith('weather_') &&
                                  editingWeather.id.length === 36; // UUID length

        if (isRealObservation) {
          // UPDATE existing observation in database
          const { error } = await supabase
            .from('weather_observations')
            .update({
              observation_time: weatherData.observation_time,
              weather_condition: weatherData.weather_condition,
              temperature: weatherData.temperature,
              humidity: weatherData.humidity,
              rainfall_mm: weatherData.rainfall_mm,
              wind_speed_kmh: weatherData.wind_speed_kmh,
              work_stoppage: weatherData.work_stoppage,
              work_stoppage_duration_minutes: weatherData.work_stoppage_duration_minutes,
              affected_activities: weatherData.affected_activities,
              remarks: weatherData.remarks,
              updated_at: new Date().toISOString()
            })
            .eq('id', editingWeather.id);

          if (error) throw error;

          // Update local state
          setWeatherObservations(prev => prev.map(obs =>
            obs.id === editingWeather.id ? { ...obs, ...weatherData, id: editingWeather.id } : obs
          ));

          console.log('✅ Weather observation updated in database');

          // Return observation with ID for photo upload
          return { 
            id: editingWeather.id, 
            ...weatherData 
          };
          
        } else {
          // Temp observation (diary not saved yet) - just update state
          setWeatherObservations(prev => prev.map(obs =>
            obs.id === editingWeather.id ? { ...obs, ...weatherData } : obs
          ));
          
          return { id: editingWeather.id, ...weatherData };
        }
        
      } else {
        // ============================================
        // CREATING NEW OBSERVATION
        // ============================================
        
        if (!diaryId) {
          // Diary not saved yet - create temporary observation
          const tempId = `weather_${Date.now()}`;
          const newObs = {
            id: tempId,
            ...weatherData
          };
          
          setWeatherObservations(prev => [...prev, newObs]);
          
          console.log('⚠️ Diary not saved - weather observation stored temporarily');
          alert('Please save the diary first before uploading photos to weather observations');
          
          return newObs;
        }

        // Diary exists - INSERT to database
        const { data: newObs, error } = await supabase
          .from('weather_observations')
          .insert({
            diary_id: diaryId,
            contract_id: contractId,
            observation_time: weatherData.observation_time,
            weather_condition: weatherData.weather_condition,
            temperature: weatherData.temperature,
            humidity: weatherData.humidity,
            rainfall_mm: weatherData.rainfall_mm,
            wind_speed_kmh: weatherData.wind_speed_kmh,
            work_stoppage: weatherData.work_stoppage,
            work_stoppage_duration_minutes: weatherData.work_stoppage_duration_minutes,
            affected_activities: weatherData.affected_activities,
            remarks: weatherData.remarks,
            recorded_by: user.id,
            recorded_by_name: user.email || user.id
          })
          .select()
          .single();

        if (error) throw error;

        // Add to local state with real database ID
        setWeatherObservations(prev => [...prev, newObs]);

        console.log('✅ Weather observation created in database:', newObs.id);

        // Return observation with database ID for photo upload
        return newObs;
      }
      
    } catch (error) {
      console.error('Error saving weather observation:', error);
      alert('Failed to save weather observation: ' + error.message);
      throw error; // Re-throw so modal knows save failed
    }
  };

  const handleDeleteWeather = async (observationId) => {
    if (!window.confirm('Delete this weather observation?')) return;

    try {
      const { error } = await supabase
        .from('weather_observations')
        .delete()
        .eq('id', observationId);

      if (error) throw error;

      // Remove from state
      setWeatherObservations(prev => 
        prev.filter(obs => obs.id !== observationId)
      );
      
      alert('Weather observation deleted');
    } catch (error) {
      console.error('Error deleting weather observation:', error);
      alert('Failed to delete weather observation');
    }
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
  // WEATHER PENDING PHOTOS HANDLERS
  // ============================================

  const handleAddWeatherPhotos = (observationId, files) => {
    const fileArray = Array.from(files);
    setWeatherPendingPhotos(prev => ({
      ...prev,
      [observationId]: [...(prev[observationId] || []), ...fileArray]
    }));
    console.log(`✅ Added ${fileArray.length} pending photos for observation:`, observationId);
  };

  const handleRemovePendingWeatherPhoto = (observationId, photoIndex) => {
    setWeatherPendingPhotos(prev => ({
      ...prev,
      [observationId]: (prev[observationId] || []).filter((_, i) => i !== photoIndex)
    }));
    console.log('✅ Removed pending photo at index:', photoIndex);
  };

  const getAllPhotosForObservation = (observationId) => {
    const realId = observationIdMapping[observationId] || observationId;
    return weatherPendingPhotos[observationId] || weatherPendingPhotos[realId] || [];
  };

  const formatWeatherCondition = (condition) => {
    return condition
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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
      const realObservationId = idMapping[observationId] || observationId;
      const observation = weatherObservations.find(obs => 
        obs.id === observationId || obs.id === realObservationId
      );
      
      console.log(`Uploading ${files.length} photos for observation:`, realObservationId);
      
      for (const file of files) {
        try {
          const time = observation?.observation_time || 'Unknown time';
          const condition = observation?.weather_condition 
            ? formatWeatherCondition(observation.weather_condition)
            : 'Weather event';
          const autoCaption = `Weather ${time} - ${condition}`;
          
          await uploadWeatherPhoto(diaryId, realObservationId, file, autoCaption, user.id);
          
          uploadedCount++;
          console.log(`✅ Uploaded ${uploadedCount}/${totalPending}: ${file.name}`);
          
        } catch (error) {
          console.error(`❌ Failed to upload ${file.name}:`, error);
        }
      }
    }
    
    console.log(`✅ Uploaded ${uploadedCount}/${totalPending} weather photos`);
  };

  // ============================================
  // PHOTO HANDLERS - FIXED
  // ============================================

  const handlePhotoFileSelected = (files) => {
    // Store files temporarily - will upload after diary is saved
    setPendingPhotos(prev => [...prev, ...files]);
  };

  // ✅ ADD THIS NEW FUNCTION:
  const handlePhotosUploaded = (results) => {
    console.log('Photos uploaded:', results);
    // Refresh photos list
    if (results.successful.length > 0) {
      refreshAllPhotos();
    }
  };

  const handleRemovePendingPhoto = (index) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoDeleted = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Upload pending photos after diary is created
  const uploadPendingPhotos = async (savedDiaryId) => {
    if (pendingPhotos.length === 0) {
      console.log('No pending general photos to upload');
      return;
    }

    try {
      console.log(`📸 Uploading ${pendingPhotos.length} pending general photos...`);
      
      // Import the uploadPhotos function
      const { uploadPhotos } = await import('../../services/diaryPhotoService');
      
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Convert File objects to proper format
      const photoFiles = pendingPhotos.map(file => ({
        file: file,
        caption: file.caption || ''
      }));

      // Upload all photos
      const results = await uploadPhotos(savedDiaryId, contractId, photoFiles, user.id);
      
      console.log(`✅ Uploaded ${results.successful.length}/${pendingPhotos.length} general photos`);
      
      if (results.failed.length > 0) {
        console.warn(`❌ Failed to upload ${results.failed.length} photos:`, results.failed);
      }
      
      // Clear pending photos
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
        created_by: user.id
      };

      let savedDiary;
      if (isEditMode) {
        savedDiary = await updateDiary(diaryId, diaryData);
      } else {
        savedDiary = await createDiary(diaryData);
      }

      // Upload pending general photos (both create and edit modes)
      if (pendingPhotos.length > 0) {
        await uploadPendingPhotos(savedDiary.id);
      }

      // ============================================
      // Save weather observations & create ID mapping
      // ============================================
      const newMapping = {};

      if (isEditMode) {
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
              photo_urls: weather.photo_urls || [],
              recorded_by: user.id,
              recorded_by_name: user.email || 'Site Supervisor'
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

            // ✅ Map temp ID → real UUID
            if (weather.id ) {
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
      // ✅ Upload ALL pending weather photos
      // ============================================
      await uploadAllPendingWeatherPhotos(savedDiary.id, newMapping);

      // ============================================
      // ✅ Clear pending weather photos queue
      // ============================================
      setWeatherPendingPhotos({});
      console.log('✅ Cleared pending weather photos queue');


      // ✅ FIX: Delete old work activities in edit mode
      if (isEditMode) {
        // 1) Work activities
        await supabase
          .from('diary_work_activities')
          .delete()
          .eq('diary_id', savedDiary.id);

        // 2) BOQ ledger links (VERY IMPORTANT - avoids inflated progress)
        await supabase
          .from('diary_boq_links')
          .delete()
          .eq('diary_id', savedDiary.id);

        // 3) Programme links (avoid duplicate progress updates)
        await supabase
          .from('diary_programme_links')
          .delete()
          .eq('diary_id', savedDiary.id);
      }


      // Save work activities - ENHANCED ERROR HANDLING
      if (workActivities.length > 0) {
        console.log(`💾 Saving ${workActivities.length} activities...`);
        
        const activityErrors = [];
        
        for (const activity of workActivities) {
          console.log(`- Saving activity: ${activity.title}`);
          
          const { data: savedActivity, error: activityError } = await supabase
            .from('diary_work_activities')
            .insert({
              diary_id: savedDiary.id,
              contract_id: contractId,
              title: activity.title || 'Untitled Activity',
              description: activity.description || '',
              quantity_completed: activity.quantity_completed || 0,
              unit: activity.unit || '',
              percent_complete: activity.percent_complete || 0,
              status: activity.status || 'in_progress',
              notes: activity.notes || '',
              requires_inspection: activity.requires_inspection || false,
              inspection_type: activity.inspection_type || '',
              requires_test: activity.requires_test || false,
              test_type: activity.test_type || '',
              programme_item_id: activity.programme_item_id || null,
              programme_wbs_code: activity.programme_wbs_code || '',
              created_by: user.id
            })
            .select()
            .single();

          if (activityError) {
            console.error('❌ Error saving activity:', activityError);
            activityErrors.push({
              activity: activity.title,
              error: activityError.message
            });
            // ✅ Don't stop, continue with next activity
            continue;
          }
          
          console.log('✅ Activity saved:', savedActivity.id);

          // ✅ Sprint 1: Save ACTIVITY → BOQ evidence into diary_boq_links
          // (Qty preferred, % allowed)
          if (activity.boq_item_id && (activity.boq_quantity_completed != null || activity.boq_percent_complete != null)) {
            const { error: boqLinkErr } = await supabase
              .from('diary_boq_links')
              .insert({
                diary_id: savedDiary.id,
                contract_id: contractId,
                boq_item_id: activity.boq_item_id,

                // link to the saved activity (requires diary_work_activity_id column in DB)
                diary_work_activity_id: savedActivity.id,

                // qty preferred, % allowed (both nullable; DB constraint enforces at least one)
                quantity_completed: activity.boq_quantity_completed ?? null,
                unit: activity.boq_unit ?? null,
                percent_complete: activity.boq_percent_complete ?? null,

                activity_title: activity.title || 'Untitled Activity',
                work_description: activity.boq_work_description || activity.description || '',
                location: activity.boq_location || null,

                created_by: user.id
              });

            if (boqLinkErr) {
              console.error('⚠️ Error saving activity→BOQ evidence:', boqLinkErr);
            }
          }

          // ALSO save to programme_links if linked
          if (activity.programme_item_id) {
            const { error: linkError } = await supabase
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
            
            if (linkError) {
              console.error('⚠️ Error saving programme link:', linkError);
            }
          }
        }
        
        // ✅ SHOW RESULTS TO USER
        if (activityErrors.length > 0) {
          alert(`Warning: ${activityErrors.length} activities failed to save:\n` +
                activityErrors.map(e => `- ${e.activity}: ${e.error}`).join('\n'));
        } else {
          console.log(`✅ All ${workActivities.length} activities saved successfully`);
        }
      }

      // Save material-BOQ links (DB-governed via RPC)
      for (const material of materials) {
        if (material.boq_item_id && (material.quantity || 0) > 0) {
          const { data, error } = await supabase.rpc('post_workledger_boq_progress', {
            p_diary_id: savedDiary.id,
            p_boq_item_id: material.boq_item_id,
            p_quantity_completed: Number(material.quantity || 0),
            p_unit: material.unit || '',
            p_activity_title: `Material delivered`,
            p_work_description: `Material delivered: ${material.description}`,
            p_location: null
          });

          if (error) {
            console.error('❌ RPC post_workledger_boq_progress failed:', error);
            // choose: stop or continue
            // throw error; // strict mode
            continue;       // tolerant mode (keeps saving other items)
          }

          console.log('✅ Ledger posted (material->BOQ):', data);
        }
      }

      // Save observations
      if (observations.length > 0) {
        for (const obs of observations) {
          await supabase
            .from('diary_observations')
            .insert({
              diary_id: savedDiary.id,
              contract_id: contractId,
              title: obs.title,
              description: obs.description,
              category: obs.category,
              severity: obs.severity,
              linked_to: obs.linked_to,
              status: obs.status,
              reported_by: user.id
            });
        }
      }

      // Save inspection/test requests - DELETE OLD, INSERT NEW
      if (isEditMode) {
        await supabase
          .from('inspection_test_requests')
          .delete()
          .eq('diary_id', savedDiary.id);
      }

      if (inspectionTestRequests.length > 0) {
        for (const req of inspectionTestRequests) {
          await supabase
            .from('inspection_test_requests')
            .insert({
              diary_id: savedDiary.id,
              contract_id: contractId,
              request_type: req.type,
              activity_title: req.activity_title,
              inspection_type: req.inspection_type,
              test_type: req.test_type,
              requested_date: req.requested_date,
              status: req.status,
              notes: req.notes,
              requested_by: user.id
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

  // Confirm Dialog Component
  const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };  

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={breadcrumbItems} />

      {/* Header */}
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
        
        {/* Basic Information */}
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
              <p className="mt-1 text-xs text-blue-600">
                💡 Or add detailed weather observations below
              </p>
            </div>
          </div>
        </div>

        {/* Weather Tracking */}
        {/* Weather Observations Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              ⛈️ Weather Observations
            </h3>
            {isDraft && (
              <button
                type="button"
                onClick={() => {
                  setEditingWeather(null);
                  setShowWeatherModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + Add Weather Observation
              </button>
            )}
          </div>

          {/* Display weather observations */}
          {weatherObservations.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-500 text-sm">
                No weather observations recorded
              </p>
              {isDraft && (
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

        {/* Work Progress - old field */}
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
            💡 Or add structured work activities below (with Programme linking & Inspection/Test requests)
          </p>
        </div>

        {/* CORRECTED: Work Activities with Inspection/Test */}
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
              <p>No activities yet. Add activities to link with Programme and request Inspection/Test.</p>
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
                          onClick={() => openLedgerLinkModal(index)}
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

                    {/* NEW: Inspection/Test Checkboxes */}
                    <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Inspection/Test Required:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={activity.requires_inspection}
                              onChange={(e) => updateWorkActivity(index, 'requires_inspection', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Requires Inspection</span>
                          </label>
                          {activity.requires_inspection && (
                            <input
                              type="text"
                              value={activity.inspection_type}
                              onChange={(e) => updateWorkActivity(index, 'inspection_type', e.target.value)}
                              placeholder="e.g., Rebar, Formwork"
                              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}
                        </div>

                        <div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={activity.requires_test}
                              onChange={(e) => updateWorkActivity(index, 'requires_test', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Requires Test</span>
                          </label>
                          {activity.requires_test && (
                            <input
                              type="text"
                              value={activity.test_type}
                              onChange={(e) => updateWorkActivity(index, 'test_type', e.target.value)}
                              placeholder="e.g., Cube Test, Compaction"
                              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}
                        </div>
                      </div>
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

        {/* Manpower */}
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
                // NEW - Manpower row with Hours field
                <div key={index} className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <select
                      value={row.trade}
                      onChange={(e) => updateManpowerRow('main_contractor', index, 'trade', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select trade</option>
                      {COMMON_TRADES.map(trade => (
                        <option key={trade} value={trade}>{trade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={row.workers}
                      onChange={(e) => updateManpowerRow('main_contractor', index, 'workers', parseInt(e.target.value) || 0)}
                      placeholder="Workers"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <label className="text-xs text-gray-500 mt-1">Workers</label>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.5"
                      value={row.hours || 0}
                      onChange={(e) => updateManpowerRow('main_contractor', index, 'hours', parseFloat(e.target.value) || 0)}
                      placeholder="Hours"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <label className="text-xs text-gray-500 mt-1">Hours</label>
                  </div>
                  {manpower.main_contractor.length > 1 && (
                    <div className="col-span-1 flex items-start">
                      <button
                        type="button"
                        onClick={() => removeManpowerRow('main_contractor', index)}
                        className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
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
                <div key={index} className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <select
                      value={row.trade}
                      onChange={(e) => updateManpowerRow('subcontractors', index, 'trade', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select trade</option>
                      {COMMON_TRADES.map(trade => (
                        <option key={trade} value={trade}>{trade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={row.workers}
                      onChange={(e) => updateManpowerRow('subcontractors', index, 'workers', parseInt(e.target.value) || 0)}
                      placeholder="Workers"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <label className="text-xs text-gray-500 mt-1">Workers</label>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.5"
                      value={row.hours || 0}
                      onChange={(e) => updateManpowerRow('subcontractors', index, 'hours', parseFloat(e.target.value) || 0)}
                      placeholder="Hours"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <label className="text-xs text-gray-500 mt-1">Hours</label>
                  </div>
                  {manpower.subcontractors.length > 1 && (
                    <div className="col-span-1 flex items-start">
                      <button
                        type="button"
                        onClick={() => removeManpowerRow('subcontractors', index)}
                        className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
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

        {/* FIXED: Equipment with Labels */}
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
                <div className="flex-1">
                  <select
                    value={row.type}
                    onChange={(e) => updateEquipmentRow(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select equipment</option>
                    {EQUIPMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => updateEquipmentRow(index, 'quantity', parseInt(e.target.value) || 0)}
                    placeholder="Qty"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <label className="text-xs text-gray-500 mt-1">Quantity</label>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={row.hours}
                    onChange={(e) => updateEquipmentRow(index, 'hours', parseFloat(e.target.value) || 0)}
                    placeholder="Hrs"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <label className="text-xs text-gray-500 mt-1">Hours</label>
                </div>
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
                    <label className="block text-xs text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateMaterialRow(index, 'description', e.target.value)}
                      placeholder="Material description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateMaterialRow(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-600 mb-1">Unit</label>
                      <select
                        value={row.unit}
                        onChange={(e) => updateMaterialRow(index, 'unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Unit</option>
                        {MATERIAL_UNITS.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Supplier</label>
                    <input
                      type="text"
                      value={row.supplier}
                      onChange={(e) => updateMaterialRow(index, 'supplier', e.target.value)}
                      placeholder="Supplier name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">DO Number</label>
                    <input
                      type="text"
                      value={row.do_number || ''}
                      onChange={(e) => updateMaterialRow(index, 'do_number', e.target.value)}
                      placeholder="Delivery Order number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">BOQ Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={row.boq_item_code || 'Not linked to BOQ'}
                        disabled
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => openLedgerLinkModal(index)}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                      >
                        🔗 Link
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

        {/* CORRECTED: Observations (can link to EOT, VO, QC, RFI) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">📝 Observations</h2>
            <button
              type="button"
              onClick={addObservation}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
            >
              + Add Observation
            </button>
          </div>

          {observations.length === 0 ? (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p>No observations yet. Add observations to link with EOT, VO, QC, or RFI.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {observations.map((obs, index) => (
                <div key={obs.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={obs.title}
                        onChange={(e) => updateObservation(index, 'title', e.target.value)}
                        placeholder="Observation title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Category</label>
                        <select
                          value={obs.category}
                          onChange={(e) => updateObservation(index, 'category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="general">General</option>
                          <option value="quality">Quality</option>
                          <option value="commercial">Commercial</option>
                          <option value="technical">Technical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Severity</label>
                        <select
                          value={obs.severity}
                          onChange={(e) => updateObservation(index, 'severity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Description</label>
                      <textarea
                        value={obs.description}
                        onChange={(e) => updateObservation(index, 'description', e.target.value)}
                        placeholder="Observation description..."
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Links (can link to multiple)</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                        >
                          + EOT
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                        >
                          + VO
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                        >
                          + QC
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                        >
                          + RFI
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Linked to: {obs.linked_to.length === 0 ? 'None' : obs.linked_to.map(l => l.type).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeObservation(index)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove Observation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEW CORRECTED: Inspection/Test Requests */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🔍 Inspection/Test Requests
          </h2>
          
          {inspectionTestRequests.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p>No inspection/test requests yet.</p>
              <p className="text-sm mt-1">Tick "Requires Inspection" or "Requires Test" in work activities above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspectionTestRequests.map((req, index) => (
                <div key={req.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          req.type === 'inspection' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-green-600 text-white'
                        }`}>
                          {req.type === 'inspection' ? '🔍 INSPECTION' : '🧪 TEST'}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {req.type === 'inspection' ? req.inspection_type : req.test_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        Activity: <span className="font-medium">{req.activity_title}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Requested Date: {req.requested_date}
                      </p>
                      {req.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          Notes: {req.notes}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      req.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Remarks */}
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

        {/* ✅ COMPLETE PHOTO UPLOAD SECTION - WORKING */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">📸 Photos</h2>
            {isEditMode && (
              <p className="text-sm text-gray-600">
                CIPAA Compliance • Contemporaneous Evidence
              </p>
            )}
          </div>
          
          {/* NEW DIARY - Show guidance */}
          {!isEditMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Visual Documentation for CIPAA Compliance
              </h3>
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-yellow-900 mb-2">
                  📌 Save as Draft First
                </p>
                <p className="text-sm text-yellow-800">
                  Photos can only be added after the diary is saved. Click "Save as Draft" below, 
                  then return to this diary to add photos.
                </p>
              </div>
              <p className="text-blue-700 text-sm font-medium mb-3">
                Photos are essential for CIPAA compliance and dispute prevention:
              </p>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span><strong>Site conditions and progress</strong> - Document work as it happens</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span><strong>Equipment and materials</strong> - Proof of delivery and usage</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span><strong>Before/after comparisons</strong> - Show transformation and completion</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span><strong>Timestamped evidence</strong> - Contemporaneous proof for claims</span>
                </li>
              </ul>
            </div>
          )}

          {/* EDIT MODE - Show photo upload/gallery */}
          {isEditMode && (
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
                  diaryId={diaryId}
                  canEdit={true}
                  onPhotoDeleted={(photoId) => {
                    console.log('Photo deleted:', photoId);
                    // Reload photos
                    loadPhotos();
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
                    contractId={contractId}
                    onUploadComplete={handlePhotosUploaded}
                    onFilesSelected={handlePhotoFileSelected}
                    pendingFiles={pendingPhotos}
                  />
              </div>
            </div>
          )}
        </div>

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

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <p className="font-medium mb-1">💡 Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Work Activities:</strong> Tick "Requires Inspection/Test" to auto-create requests</li>
            <li><strong>Observations:</strong> Can link to multiple items (EOT, VO, QC, RFI)</li>
            <li><strong>Photos:</strong> Will upload after diary is saved</li>
            <li><strong>Submit:</strong> Submit to Main Contractor for acknowledgment (cannot edit after)</li>
          </ul>
        </div>
      </div>

      {/* FIXED: Weather Observation Modal */}
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

      {/* Confirm Delete Dialog - ADDED */}
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

      <WorkLedgerLinkModal
        isOpen={showLedgerLink}
        onClose={() => {
          setShowLedgerLink(false);
          setActiveItemIndex(null);
        }}
        contractId={contractId}   // ✅ ADD THIS LINE
        boqItems={boqItems}
        programmeItems={programmeItems}
        initialValue={{
          boq_item_id: activeItemIndex !== null ? workActivities[activeItemIndex]?.boq_item_id : null,
          programme_item_id: activeItemIndex !== null ? workActivities[activeItemIndex]?.programme_item_id : null,
        }}
        onSave={(val) => {
          if (activeItemIndex === null) return;

          updateWorkActivity(activeItemIndex, 'boq_item_id', val.boq_item_id);
          updateWorkActivity(activeItemIndex, 'boq_item_label', val.boq_item_label);

          updateWorkActivity(activeItemIndex, 'programme_item_id', val.programme_item_id);
          updateWorkActivity(activeItemIndex, 'programme_wbs_code', val.programme_wbs_code);
          updateWorkActivity(activeItemIndex, 'programme_item_label', val.programme_item_label);

          updateWorkActivity(activeItemIndex, 'boq_quantity_completed', val.boq_quantity_completed);
          updateWorkActivity(activeItemIndex, 'boq_percent_complete', val.boq_percent_complete);
          updateWorkActivity(activeItemIndex, 'boq_location', val.boq_location);
          updateWorkActivity(activeItemIndex, 'boq_work_description', val.boq_work_description);
          updateWorkActivity(activeItemIndex, 'boq_unit', val.boq_unit);

        }}
      />
    </div>
  );
};

export default DiaryFormOffline;
