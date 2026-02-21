// src/services/programmeService.js
// ============================================
// PROGRAMME SERVICE - Work Programme Module
// ============================================
// Tables used:
// - programme_versions
// - programme_items
// ============================================

import { supabase } from '../lib/supabase';

export const PROGRAMME_VERSION_TYPES = {
  BASELINE: 'Baseline',
  REVISION: 'Revision',
  AS_BUILT: 'As-Built',
  CLAIM_SUPPORT: 'Claim Support',
};

// -----------------------------
// Small helpers (internal)
// -----------------------------
const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeWbs = (wbs) => String(wbs || '').trim();

/**
 * Parent rule (your choice):
 *  - parent of 2.1 is 2
 *  - parent of 2.1.3 is 2.1
 */
export const deriveParentWbs = (wbsCode) => {
  const w = normalizeWbs(wbsCode);
  if (!w) return null;

  const parts = w.split('.').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return null; // "2" has no parent

  parts.pop();
  return parts.join('.');
};

export const deriveLevelFromWbs = (wbsCode) => {
  const w = normalizeWbs(wbsCode);
  if (!w) return 1;
  return w.split('.').map(p => p.trim()).filter(Boolean).length;
};

// -----------------------------
// Versions
// -----------------------------
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
 * Ensure v1 Baseline exists.
 * Used for "draft contract, no version yet, still want to import CSV".
 */
export const ensureBaselineVersion = async (contractId) => {
  if (!contractId) throw new Error('Missing contractId');

  // If any version exists, return the first version (lowest number)
  const { data: existing, error: exErr } = await supabase
    .from('programme_versions')
    .select('*')
    .eq('contract_id', contractId)
    .order('version_number', { ascending: true })
    .limit(1);

  if (exErr) throw exErr;
  if (existing?.length) return existing[0];

  // Create v1 Baseline
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  const payload = {
    contract_id: contractId,
    version_number: 1,
    version_name: 'Baseline Programme',
    version_type: PROGRAMME_VERSION_TYPES.BASELINE,
    description: 'Auto-created from CSV import',
    created_by: user?.id || null,
    is_current: true,

    // ✅ new defaults (per-version roll-up config)
    weight_mode: 'hybrid',
    alpha_cost: 0.70,
  };

  const { data, error } = await supabase
    .from('programme_versions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getDefaultProgrammeVersionNumber = async (contractId) => {
  const { data: maxItemV, error: maxErr } = await supabase
    .from('programme_items')
    .select('programme_version')
    .eq('contract_id', contractId)
    .order('programme_version', { ascending: false })
    .limit(1);

  if (maxErr) throw maxErr;
  return maxItemV?.[0]?.programme_version || 1;
};

export const createProgrammeVersion = async (args) => {
  const contractId = args?.contractId ?? args?.contract_id;
  if (!contractId) throw new Error('createProgrammeVersion: contractId is required');

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('User not authenticated');

  const versionName = args?.versionName ?? args?.version_name ?? 'Revision';
  const versionType = args?.versionType ?? args?.version_type ?? PROGRAMME_VERSION_TYPES.REVISION;
  const description = args?.description ?? null;

  const weightMode = args?.weightMode ?? args?.weight_mode ?? 'hybrid';
  const alphaCostRaw = args?.alphaCost ?? args?.alpha_cost;
  const alphaCost = alphaCostRaw == null ? 0.7 : Number(alphaCostRaw);

  const requestedNo = args?.versionNumber ?? args?.version_number ?? null;
  const makeCurrent = Boolean(args?.isCurrent ?? args?.is_current ?? false);

  // Decide version number
  let versionNo = requestedNo;
  if (versionNo == null) {
    const { data: existing, error: exErr } = await supabase
      .from('programme_versions')
      .select('version_number')
      .eq('contract_id', contractId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (exErr) throw exErr;
    versionNo = (existing?.[0]?.version_number || 0) + 1;
  }

  // Ensure only one current (frontend safety)
  if (makeCurrent) {
    const { error: unsetErr } = await supabase
      .from('programme_versions')
      .update({ is_current: false })
      .eq('contract_id', contractId);

    if (unsetErr) throw unsetErr;
  }

  const payload = {
    contract_id: contractId,
    version_number: Number(versionNo),
    version_name: versionName,
    version_type: versionType,
    description,
    created_by: user.id,
    weight_mode: weightMode,
    alpha_cost: alphaCost,
    is_current: makeCurrent,
  };

  const { data, error } = await supabase
    .from('programme_versions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProgrammeVersionWeightConfig = async ({
  contractId,
  versionNumber,
  weightMode,   // 'hybrid' | 'boq' | 'duration'
  alphaCost,    // 0..1 (only meaningful for hybrid)
}) => {
  const payload = {
    weight_mode: weightMode,
    alpha_cost: Number(alphaCost ?? 0.70),
    weight_updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('programme_versions')
    .update(payload)
    .eq('contract_id', contractId)
    .eq('version_number', Number(versionNumber))
    .select()
    .single();

  if (error) throw error;
  return data;
};

// -----------------------------
// Items
// -----------------------------

/**
 * Backward compatible:
 * - old: getProgrammeItems(contractId, versionNo)
 * - new: getProgrammeItems(contractId, { programmeVersionNumber, onlyCurrent, onlyBaseline })
 */
export const getProgrammeItems = async (contractId, arg2 = null) => {
  const opts =
    typeof arg2 === 'number'
      ? { programmeVersionNumber: arg2 }
      : (arg2 || {});

  const {
    programmeVersionNumber = null,
    onlyCurrent = false,
    onlyBaseline = false,
  } = opts;

  let q = supabase
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
      actual_duration_days,
      percent_complete,
      parent_id,
      level,
      sort_order,
      calendar_id,
      resource_name,
      linked_boq_item_id,
      programme_version,
      is_baseline,
      is_current,
      status,
      is_critical,
      total_float_days,
      created_by,
      created_at,
      updated_at
    `)
    .eq('contract_id', contractId);

  if (programmeVersionNumber != null) q = q.eq('programme_version', programmeVersionNumber);
  if (onlyCurrent) q = q.eq('is_current', true);
  if (onlyBaseline) q = q.eq('is_baseline', true);

  q = q
    .order('level', { ascending: true })
    .order('wbs_code', { ascending: true })
    .order('sort_order', { ascending: true });

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

export const createProgrammeItem = async (args) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('User not authenticated');

  const contractId = args?.contractId ?? args?.contract_id;
  const programmeVersionNumber =
    args?.programmeVersionNumber ?? args?.programme_version ?? args?.programmeVersion ?? null;

  if (!contractId) throw new Error('createProgrammeItem: contractId is required');
  if (!programmeVersionNumber) throw new Error('createProgrammeItem: programmeVersionNumber is required');

  const payload = {
    contract_id: contractId,
    programme_version: Number(programmeVersionNumber),

    wbs_code: normalizeWbs(args?.wbsCode ?? args?.wbs_code),
    description: args?.description ?? '',
    activity_type: args?.activityType ?? args?.activity_type ?? 'Task',

    planned_start: args?.plannedStart ?? args?.planned_start ?? null,
    planned_finish: args?.plannedFinish ?? args?.planned_finish ?? null,
    duration_days: args?.durationDays ?? args?.duration_days ?? null,

    parent_id: args?.parentId ?? args?.parent_id ?? null,
    level: args?.level ?? deriveLevelFromWbs(args?.wbsCode ?? args?.wbs_code),
    sort_order: args?.sortOrder ?? args?.sort_order ?? 0,

    linked_boq_item_id: args?.linkedBoqItemId ?? args?.linked_boq_item_id ?? null,

    status: args?.status ?? 'Not Started',
    is_critical: Boolean(args?.isCritical ?? args?.is_critical ?? false),
    total_float_days: Number(args?.totalFloatDays ?? args?.total_float_days ?? 0),

    is_baseline: Boolean(args?.isBaseline ?? args?.is_baseline ?? false),
    is_current: Boolean(args?.isCurrent ?? args?.is_current ?? true),

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

export const deleteProgrammeItem = async (id) => {
  const { error } = await supabase.from('programme_items').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const deleteProgrammeItemsByVersion = async (contractId, programmeVersionNumber) => {
  const { error } = await supabase
    .from('programme_items')
    .delete()
    .eq('contract_id', contractId)
    .eq('programme_version', programmeVersionNumber);

  if (error) throw error;
  return true;
};

export const setCurrentProgrammeVersion = async (contractId, versionNumber) => {
  // 1) clear current
  const { error: e1 } = await supabase
    .from('programme_versions')
    .update({ is_current: false })
    .eq('contract_id', contractId);

  if (e1) throw e1;

  // 2) set chosen current
  const { error: e2 } = await supabase
    .from('programme_versions')
    .update({ is_current: true })
    .eq('contract_id', contractId)
    .eq('version_number', Number(versionNumber));

  if (e2) throw e2;
};

export const ensureProgrammeVersionRow = async (contractId) => {
  // If any versions exist, return them
  const existing = await getProgrammeVersions(contractId);
  if (existing.length) return existing;

  // Otherwise create v1 baseline
  const created = await createProgrammeVersion({
    contractId,
    versionName: 'Baseline Programme',
    versionType: PROGRAMME_VERSION_TYPES.BASELINE,
    description: 'Auto-created because programme_versions was empty',
  });

  // Make it current
  await setCurrentProgrammeVersion(contractId, created.version_number);

  return await getProgrammeVersions(contractId);
};

// -----------------------------
// BULK IMPORT (CSV)
// -----------------------------
/**
 * Duplicates / Re-import handling (simple + safe):
 * - Default: replaceExisting = true
 *   -> delete all items for this version, then insert fresh.
 *
 * Parent linking:
 * - No schema change.
 * - We compute parent by WBS: 2.1 -> 2, 2.1.3 -> 2.1
 * - After inserting, we fetch (id, wbs_code) and update parent_id.
 */
export const bulkImportProgrammeItems = async ({
  contractId,
  programmeVersionNumber,
  items,
  replaceExisting = false,
}) => {
  // 🧹 Clear existing items for this version (safe re-import)
  if (replaceExisting) {
    await supabase
      .from('programme_items')
      .delete()
      .eq('contract_id', contractId)
      .eq('programme_version', programmeVersionNumber);
  }

  if (!contractId) throw new Error('Missing contractId');
  if (!programmeVersionNumber) throw new Error('Missing programmeVersionNumber');
  if (!Array.isArray(items) || items.length === 0) return { inserted: 0, updatedParents: 0 };

  // A) De-dupe by wbs_code (last wins)
  const dedup = new Map();
  for (const it of items) {
    const w = normalizeWbs(it?.wbs_code);
    if (!w) continue;
    dedup.set(w, { ...it, wbs_code: w });
  }
  const list = Array.from(dedup.values());

  // B) Replace mode (this is your “E duplicates/re-import” fix)
  if (replaceExisting) {
    await deleteProgrammeItemsByVersion(contractId, programmeVersionNumber);
  }

  // C) Prepare insert payload (no parent_id yet)
  const payloadList = list.map((it, idx) => {
    const w = normalizeWbs(it.wbs_code);

    const pct = toNumber(it.percent_complete, 0);
    const nextStatus =
      typeof it.status === 'string' && it.status.trim()
        ? it.status
        : pct >= 100
        ? 'Completed'
        : pct > 0
        ? 'In Progress'
        : 'Not Started';

    return {
      contract_id: contractId,
      programme_version: programmeVersionNumber,

      wbs_code: w,
      description: it.description || '',
      activity_type: it.activity_type || 'Task',

      planned_start: it.planned_start || null,
      planned_finish: it.planned_finish || null,
      duration_days: it.duration_days != null ? toNumber(it.duration_days, null) : null,

      actual_start: it.actual_start || null,
      actual_finish: it.actual_finish || null,
      percent_complete: pct,

      level: it.level != null ? toNumber(it.level, deriveLevelFromWbs(w)) : deriveLevelFromWbs(w),
      sort_order: it.sort_order != null ? toNumber(it.sort_order, idx) : idx,

      resource_name: it.resource_name || null,
      status: nextStatus,
      is_critical: !!it.is_critical,
      total_float_days: it.total_float_days != null ? toNumber(it.total_float_days, 0) : 0,

      is_current: true,
    };
  });

  // D) Insert in chunks
  const CHUNK = 200;
  for (let i = 0; i < payloadList.length; i += CHUNK) {
    const chunk = payloadList.slice(i, i + CHUNK);
    const { error } = await supabase.from('programme_items').insert(chunk);
    if (error) throw error;
  }

  // E) Resolve parent_id (2.1 -> 2, 2.1.3 -> 2.1)
  // Fetch id map
  const { data: allRows, error: fetchErr } = await supabase
    .from('programme_items')
    .select('id, wbs_code')
    .eq('contract_id', contractId)
    .eq('programme_version', programmeVersionNumber);

  if (fetchErr) throw fetchErr;

  const idByWbs = new Map();
  (allRows || []).forEach((r) => idByWbs.set(normalizeWbs(r.wbs_code), r.id));

  let updatedParents = 0;

  for (const it of payloadList) {
    const childWbs = normalizeWbs(it.wbs_code);
    const parentWbs = deriveParentWbs(childWbs);
    if (!parentWbs) continue;

    const childId = idByWbs.get(childWbs);
    const parentId = idByWbs.get(parentWbs);

    // If parent row doesn't exist in CSV, we skip (no crash)
    if (!childId || !parentId) continue;

    const { error: upErr } = await supabase
      .from('programme_items')
      .update({ parent_id: parentId })
      .eq('id', childId);

    if (upErr) throw upErr;
    updatedParents++;
  }

  return { inserted: payloadList.length, updatedParents };
};
