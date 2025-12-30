// ============================================
// DIARY SERVICE - Phase 3A: Daily Diary Module
// ============================================
// Purpose: Manage daily work diary entries for CIPAA compliance
// Features: CRUD operations, validation, status workflow, statistics
// Malaysian Construction Context: Weather, trades, equipment, materials
// ============================================

import { supabase } from '../lib/supabase';

// ============================================
// MALAYSIAN CONSTRUCTION CONSTANTS
// ============================================

export const WEATHER_OPTIONS = [
  'Sunny',
  'Cloudy',
  'Rainy',
  'Heavy Rain',
  'Stormy'
];

export const COMMON_TRADES = [
  'Carpenter',
  'Mason',
  'Steel Fixer',
  'Concrete Worker',
  'Electrician',
  'Plumber',
  'Painter',
  'General Labor',
  'Glazier',
  'Tiler',
  'Welder',
  'Scaffolder',
  'Plant Operator',
  'Supervisor',
  'Foreman'
];

export const EQUIPMENT_TYPES = [
  'Excavator',
  'Crane',
  'Concrete Mixer',
  'Compactor',
  'Generator',
  'Scaffolding',
  'Concrete Pump',
  'Tower Crane',
  'Mobile Crane',
  'Backhoe',
  'Loader',
  'Dumper',
  'Vibrator',
  'Hoist',
  'Welding Machine'
];

export const MATERIAL_UNITS = [
  'm³', // cubic meter
  'm²', // square meter
  'm',  // meter
  'kg', // kilogram
  'ton',
  'pcs', // pieces
  'set',
  'lot',
  'length',
  'roll',
  'bag',
  'drum',
  'sheet'
];

export const DIARY_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  ACKNOWLEDGED: 'acknowledged'
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate diary date - cannot be future date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {object} - { valid: boolean, error: string }
 */
export const validateDiaryDate = (date) => {
  const diaryDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  diaryDate.setHours(0, 0, 0, 0);

  if (diaryDate > today) {
    return {
      valid: false,
      error: 'Cannot create diary for future dates'
    };
  }

  return { valid: true, error: null };
};

/**
 * Check if diary already exists for contract and date
 * @param {string} contractId - Contract UUID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} excludeDiaryId - Diary ID to exclude (for edit)
 * @returns {Promise<object>} - { exists: boolean, diaryId: string }
 */
export const checkDiaryExists = async (contractId, date, excludeDiaryId = null) => {
  try {
    let query = supabase
      .from('work_diaries')
      .select('id')
      .eq('contract_id', contractId)
      .eq('diary_date', date);

    if (excludeDiaryId) {
      query = query.neq('id', excludeDiaryId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is good)
      throw error;
    }

    return {
      exists: !!data,
      diaryId: data?.id || null
    };
  } catch (error) {
    console.error('Error checking diary exists:', error);
    throw error;
  }
};

/**
 * Check if user can edit diary
 * @param {object} diary - Diary object
 * @param {string} userId - User UUID
 * @returns {object} - { canEdit: boolean, reason: string }
 */
export const canEditDiary = (diary, userId) => {
  if (diary.created_by !== userId) {
    return {
      canEdit: false,
      reason: 'You can only edit your own diaries'
    };
  }

  if (diary.status !== DIARY_STATUS.DRAFT) {
    return {
      canEdit: false,
      reason: `Cannot edit ${diary.status} diaries. Only draft diaries can be edited.`
    };
  }

  return { canEdit: true, reason: null };
};

// ============================================
// CREATE OPERATIONS
// ============================================

/**
 * Create new diary entry
 * @param {object} diaryData - Diary data object
 * @returns {Promise<object>} - Created diary object
 */
export const createDiary = async (diaryData) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Validate date
    const dateValidation = validateDiaryDate(diaryData.diary_date);
    if (!dateValidation.valid) {
      throw new Error(dateValidation.error);
    }

    // Check if diary already exists for this date
    const existsCheck = await checkDiaryExists(
      diaryData.contract_id,
      diaryData.diary_date
    );
    if (existsCheck.exists) {
      throw new Error('Diary already exists for this date. Please edit the existing diary instead.');
    }

    // Prepare diary data
    const newDiary = {
      contract_id: diaryData.contract_id,
      diary_date: diaryData.diary_date,
      weather_conditions: diaryData.weather_conditions || null,
      site_conditions: diaryData.site_conditions || null,
      work_progress: diaryData.work_progress || null,
      manpower: diaryData.manpower || [],
      equipment: diaryData.equipment || [],
      materials_delivered: diaryData.materials_delivered || [],
      issues_delays: diaryData.issues_delays || null,
      status: DIARY_STATUS.DRAFT,
      created_by: user.id
    };

    // Insert into database
    const { data, error } = await supabase
      .from('work_diaries')
      .insert([newDiary])
      .select()
      .single();

    if (error) throw error;

    console.log('Diary created successfully:', data.id);
    return data;
  } catch (error) {
    console.error('Error creating diary:', error);
    throw error;
  }
};

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all diaries for a contract
 * @param {string} contractId - Contract UUID
 * @param {object} options - Query options (status, dateFrom, dateTo, sortOrder)
 * @returns {Promise<array>} - Array of diary objects
 */
export const getDiariesByContract = async (contractId, options = {}) => {
  try {
    let query = supabase
      .from('work_diaries')
      .select('*')
      .eq('contract_id', contractId);

    // Filter by status
    if (options.status) {
      query = query.eq('status', options.status);
    }

    // Filter by date range
    if (options.dateFrom) {
      query = query.gte('diary_date', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.lte('diary_date', options.dateTo);
    }

    // Sort order
    const sortOrder = options.sortOrder || 'desc';
    query = query.order('diary_date', { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) throw error;

    console.log(`Retrieved ${data.length} diaries for contract ${contractId}`);
    return data;
  } catch (error) {
    console.error('Error fetching diaries:', error);
    throw error;
  }
};

/**
 * Get single diary by ID
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<object>} - Diary object with contract details
 */
export const getDiaryById = async (diaryId) => {
  try {
    const { data, error } = await supabase
      .from('work_diaries')
      .select(`
        *,
        contracts (
          id,
          contract_number,
          project_name,
          location,
          contract_type
        )
      `)
      .eq('id', diaryId)
      .single();

    if (error) throw error;

    console.log('Diary retrieved:', diaryId);
    return data;
  } catch (error) {
    console.error('Error fetching diary:', error);
    throw error;
  }
};

/**
 * Get diary for specific contract and date
 * @param {string} contractId - Contract UUID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object|null>} - Diary object or null if not found
 */
export const getDiaryByDate = async (contractId, date) => {
  try {
    const { data, error } = await supabase
      .from('work_diaries')
      .select('*')
      .eq('contract_id', contractId)
      .eq('diary_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching diary by date:', error);
    throw error;
  }
};

// ============================================
// UPDATE OPERATIONS
// ============================================

/**
 * Update diary entry (draft only)
 * @param {string} diaryId - Diary UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated diary object
 */
export const updateDiary = async (diaryId, updates) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get existing diary
    const existingDiary = await getDiaryById(diaryId);

    // Check if user can edit
    const editCheck = canEditDiary(existingDiary, user.id);
    if (!editCheck.canEdit) {
      throw new Error(editCheck.reason);
    }

    // If date is being changed, validate new date
    if (updates.diary_date && updates.diary_date !== existingDiary.diary_date) {
      const dateValidation = validateDiaryDate(updates.diary_date);
      if (!dateValidation.valid) {
        throw new Error(dateValidation.error);
      }

      // Check if diary exists for new date
      const existsCheck = await checkDiaryExists(
        existingDiary.contract_id,
        updates.diary_date,
        diaryId
      );
      if (existsCheck.exists) {
        throw new Error('Diary already exists for this date');
      }
    }

    // Prepare update data (only allowed fields)
    const allowedUpdates = {
      diary_date: updates.diary_date,
      weather_conditions: updates.weather_conditions,
      site_conditions: updates.site_conditions,
      work_progress: updates.work_progress,
      manpower: updates.manpower,
      equipment: updates.equipment,
      materials_delivered: updates.materials_delivered,
      issues_delays: updates.issues_delays
    };

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    // Update in database
    const { data, error } = await supabase
      .from('work_diaries')
      .update(allowedUpdates)
      .eq('id', diaryId)
      .select()
      .single();

    if (error) throw error;

    console.log('Diary updated successfully:', diaryId);
    return data;
  } catch (error) {
    console.error('Error updating diary:', error);
    throw error;
  }
};

/**
 * Submit diary for MC acknowledgment
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<object>} - Updated diary object
 */
export const submitDiary = async (diaryId) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get existing diary
    const existingDiary = await getDiaryById(diaryId);

    // Check ownership
    if (existingDiary.created_by !== user.id) {
      throw new Error('You can only submit your own diaries');
    }

    // Check status
    if (existingDiary.status !== DIARY_STATUS.DRAFT) {
      throw new Error('Only draft diaries can be submitted');
    }

    // Validate required fields
    if (!existingDiary.weather_conditions) {
      throw new Error('Weather conditions are required before submission');
    }
    if (!existingDiary.work_progress) {
      throw new Error('Work progress description is required before submission');
    }

    // Update status to submitted
    const { data, error } = await supabase
      .from('work_diaries')
      .update({ status: DIARY_STATUS.SUBMITTED })
      .eq('id', diaryId)
      .select()
      .single();

    if (error) throw error;

    console.log('Diary submitted successfully:', diaryId);
    return data;
  } catch (error) {
    console.error('Error submitting diary:', error);
    throw error;
  }
};

/**
 * MC acknowledges diary (locks it)
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<object>} - Updated diary object
 */
export const acknowledgeDiary = async (diaryId) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get existing diary
    const existingDiary = await getDiaryById(diaryId);

    // Check status
    if (existingDiary.status !== DIARY_STATUS.SUBMITTED) {
      throw new Error('Only submitted diaries can be acknowledged');
    }

    // TODO: Add role check for MC (Main Contractor) in production
    // For now, any user can acknowledge

    // Update status and acknowledgment details
    const { data, error } = await supabase
      .from('work_diaries')
      .update({
        status: DIARY_STATUS.ACKNOWLEDGED,
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', diaryId)
      .select()
      .single();

    if (error) throw error;

    console.log('Diary acknowledged successfully:', diaryId);
    return data;
  } catch (error) {
    console.error('Error acknowledging diary:', error);
    throw error;
  }
};

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete diary (draft only)
 * @param {string} diaryId - Diary UUID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteDiary = async (diaryId) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get existing diary
    const existingDiary = await getDiaryById(diaryId);

    // Check if user can delete
    const editCheck = canEditDiary(existingDiary, user.id);
    if (!editCheck.canEdit) {
      throw new Error('Only draft diaries created by you can be deleted');
    }

    // Delete from database
    const { error } = await supabase
      .from('work_diaries')
      .delete()
      .eq('id', diaryId);

    if (error) throw error;

    console.log('Diary deleted successfully:', diaryId);
    return true;
  } catch (error) {
    console.error('Error deleting diary:', error);
    throw error;
  }
};

// ============================================
// STATISTICS & REPORTS
// ============================================

/**
 * Get diary statistics for a contract
 * @param {string} contractId - Contract UUID
 * @returns {Promise<object>} - Statistics object
 */
export const getDiaryStatistics = async (contractId) => {
  try {
    const { data, error } = await supabase
      .from('work_diaries')
      .select('status')
      .eq('contract_id', contractId);

    if (error) throw error;

    const stats = {
      total: data.length,
      draft: data.filter(d => d.status === DIARY_STATUS.DRAFT).length,
      submitted: data.filter(d => d.status === DIARY_STATUS.SUBMITTED).length,
      acknowledged: data.filter(d => d.status === DIARY_STATUS.ACKNOWLEDGED).length
    };

    console.log('Diary statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
};

/**
 * Get diary summary for date range
 * @param {string} contractId - Contract UUID
 * @param {string} dateFrom - Start date YYYY-MM-DD
 * @param {string} dateTo - End date YYYY-MM-DD
 * @returns {Promise<object>} - Summary object
 */
export const getDiarySummary = async (contractId, dateFrom, dateTo) => {
  try {
    const { data, error } = await supabase
      .from('work_diaries')
      .select('*')
      .eq('contract_id', contractId)
      .gte('diary_date', dateFrom)
      .lte('diary_date', dateTo)
      .order('diary_date', { ascending: true });

    if (error) throw error;

    // Calculate totals
    let totalManpower = 0;
    let totalManHours = 0;
    const weatherCount = {};
    const tradesUsed = new Set();
    const equipmentUsed = new Set();

    data.forEach(diary => {
      // Manpower totals
      if (diary.manpower && Array.isArray(diary.manpower)) {
        diary.manpower.forEach(m => {
          totalManpower += m.count || 0;
          totalManHours += (m.count || 0) * (m.hours || 0);
          tradesUsed.add(m.trade);
        });
      }

      // Weather count
      if (diary.weather_conditions) {
        weatherCount[diary.weather_conditions] = 
          (weatherCount[diary.weather_conditions] || 0) + 1;
      }

      // Equipment used
      if (diary.equipment && Array.isArray(diary.equipment)) {
        diary.equipment.forEach(e => equipmentUsed.add(e.type));
      }
    });

    const summary = {
      dateFrom,
      dateTo,
      totalDays: data.length,
      totalManpower,
      totalManHours,
      averageManpower: data.length > 0 ? Math.round(totalManpower / data.length) : 0,
      weatherCount,
      tradesUsed: Array.from(tradesUsed),
      equipmentUsed: Array.from(equipmentUsed),
      diaries: data
    };

    console.log('Diary summary generated for', dateFrom, 'to', dateTo);
    return summary;
  } catch (error) {
    console.error('Error generating diary summary:', error);
    throw error;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format diary date for display
 * @param {string} date - Date string
 * @returns {string} - Formatted date
 */
export const formatDiaryDate = (date) => {
  const d = new Date(date);
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return d.toLocaleDateString('en-MY', options);
};

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} - Today's date
 */
export const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Get date range for last N days
 * @param {number} days - Number of days
 * @returns {object} - { dateFrom, dateTo }
 */
export const getDateRange = (days) => {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  return {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: dateTo.toISOString().split('T')[0]
  };
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export default {
  // Constants
  WEATHER_OPTIONS,
  COMMON_TRADES,
  EQUIPMENT_TYPES,
  MATERIAL_UNITS,
  DIARY_STATUS,
  
  // Validation
  validateDiaryDate,
  checkDiaryExists,
  canEditDiary,
  
  // CRUD
  createDiary,
  getDiariesByContract,
  getDiaryById,
  getDiaryByDate,
  updateDiary,
  submitDiary,
  acknowledgeDiary,
  deleteDiary,
  
  // Statistics
  getDiaryStatistics,
  getDiarySummary,
  
  // Utilities
  formatDiaryDate,
  getTodayDate,
  getDateRange
};
