// ============================================
// PROGRAMME SERVICE - Phase 3B: Work Programme Module
// ============================================
// Tables used (from your schema):
// - programme_versions
// - programme_items
// - programme_links (later)
// - programme_calendars (later)
// ============================================

import { supabase } from '../lib/supabase';

export const PROGRAMME_VERSION_TYPES = {
  BASELINE: 'Baseline',
  REVISION: 'Revision',
  AS_BUILT: 'As-Built',
  CLAIM_SUPPORT: 'Claim Support',
};

/**
 * List programme versions for a contract
 */
export const getProgrammeVersions = async (contractId) => {
  const { data, error } = await supabase
    .from('programme_versions')
    .select('*')
    .eq('contract_id', contractId)
    .order('version_number', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Create a new programme version
 * - auto version_number = max + 1
 */
export const createProgrammeVersion = async ({
  contractId,
  versionName,
  versionType,
  description = null,
}) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('User not authenticated');

  // Determine next version number
  const { data: existing, error: exErr } = await supabase
    .from('programme_versions')
    .select('version_number')
    .eq('contract_id', contractId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (exErr) throw exErr;

  const nextNo = (existing?.[0]?.version_number || 0) + 1;

  const payload = {
    contract_id: contractId,
    version_number: nextNo,
    version_name: versionName,
    version_type: versionType, // must match CHECK constraint enum
    description,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('programme_versions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * List programme items (activities) for contract + version
 * Note: programme_items uses programme_version integer (not version id)
 */
export const getProgrammeItems = async (contractId, programmeVersionNumber) => {
  const { data, error } = await supabase
    .from('programme_items')
    .select(`
      id,
      contract_id,
      wbs_code,
      description,
      activity_type,
      planned_start,
      planned_finish,
      duration_days,
      actual_start,
      actual_finish,
      percent_complete,
      parent_id,
      level,
      sort_order,
      linked_boq_item_id,
      programme_version,
      is_baseline,
      is_current,
      status,
      is_critical,
      total_float_days,
      created_at,
      updated_at
    `)
    .eq('contract_id', contractId)
    .eq('programme_version', programmeVersionNumber)
    .order('sort_order', { ascending: true })
    .order('wbs_code', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Create a programme item
 */
export const createProgrammeItem = async ({
  contractId,
  programmeVersionNumber,
  wbsCode,
  description,
  activityType = 'Task',
  plannedStart,
  plannedFinish,
  durationDays,
  parentId = null,
  level = 1,
  sortOrder = 0,
  linkedBoqItemId = null,
  status = 'Not Started',
}) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('User not authenticated');

  const payload = {
    contract_id: contractId,
    programme_version: programmeVersionNumber,
    wbs_code: wbsCode,
    description,
    activity_type: activityType,
    planned_start: plannedStart,
    planned_finish: plannedFinish,
    duration_days: durationDays,
    parent_id: parentId,
    level,
    sort_order: sortOrder,
    linked_boq_item_id: linkedBoqItemId,
    status,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from('programme_items')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update programme item
 */
export const updateProgrammeItem = async (id, patch) => {
  const { data, error } = await supabase
    .from('programme_items')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete programme item
 */
export const deleteProgrammeItem = async (id) => {
  const { error } = await supabase.from('programme_items').delete().eq('id', id);
  if (error) throw error;
  return true;
};
