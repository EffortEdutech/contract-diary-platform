// src/components/programme/WorkProgrammePanel.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PROGRAMME_VERSION_TYPES,
  getProgrammeVersions,
  getDefaultProgrammeVersionNumber,
  createProgrammeVersion,
  getProgrammeItems,
  createProgrammeItem,
  deleteProgrammeItem,
} from '../../services/programmeService';
import ImportProgrammeModal from '../contracts/ImportProgrammeModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function buildProgrammeTree(items = []) {
  const byId = new Map();
  const roots = [];

  items.forEach((it) => byId.set(it.id, { ...it, children: [] }));

  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) byId.get(node.parent_id).children.push(node);
    else roots.push(node);
  });

  const sortChildren = (nodes) => {
    nodes.sort((a, b) => {
      const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (so !== 0) return so;
      return String(a.wbs_code || '').localeCompare(String(b.wbs_code || ''));
    });
    nodes.forEach((n) => sortChildren(n.children || []));
  };

  sortChildren(roots);
  return roots;
}

function flattenVisible(tree = [], expandedIds = new Set(), depth = 0) {
  const out = [];
  for (const node of tree) {
    const hasChildren = (node.children?.length || 0) > 0;
    out.push({ node, depth, hasChildren });
    if (hasChildren && expandedIds.has(node.id)) out.push(...flattenVisible(node.children, expandedIds, depth + 1));
  }
  return out;
}

// Tree filter: keep parent if any descendant matches
function filterTree(nodes, predicate) {
  const out = [];
  for (const n of nodes) {
    const children = n.children?.length ? filterTree(n.children, predicate) : [];
    const selfOk = predicate(n);
    if (selfOk || children.length) out.push({ ...n, children });
  }
  return out;
}

function normalizeText(s) {
  return String(s || '').toLowerCase().trim();
}

function iconForType(activityType) {
  if (activityType === 'Summary') return '📦';
  if (activityType === 'Milestone') return '🏁';
  return '🧱';
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function clampPct(x) {
  const n = Number(x || 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// Dropdown status = based on ACTUAL %
function classifyProgressFromActual(actualPct) {
  const a = clampPct(actualPct);
  const EPS = 0.0001;
  if (a <= EPS) return 'not started';
  if (a >= 100 - EPS) return 'completed';
  return 'in progress';
}

function svBadge(sv) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold';
  const n = Number(sv || 0);

  if (n >= 5) return { label: `Ahead +${n.toFixed(2)}%`, cls: `${base} bg-green-100 text-green-800`, sev: 'ahead' };
  if (n > -5) return { label: `On Track ${n.toFixed(2)}%`, cls: `${base} bg-blue-100 text-blue-800`, sev: 'ontrack' };
  if (n > -10) return { label: `Warning ${n.toFixed(2)}%`, cls: `${base} bg-amber-100 text-amber-900`, sev: 'warning' };
  return { label: `Critical ${n.toFixed(2)}%`, cls: `${base} bg-red-100 text-red-800`, sev: 'critical' };
}

function classifySvSeverity(sv) {
  return svBadge(sv).sev;
}

function badgeForStatusText(statusText) {
  const s = String(statusText || '').toLowerCase();
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold';

  if (s.includes('complete')) return `${base} bg-green-100 text-green-800`;
  if (s.includes('progress')) return `${base} bg-blue-100 text-blue-800`;
  if (s.includes('start')) return `${base} bg-gray-100 text-gray-700`;
  return `${base} bg-gray-100 text-gray-700`;
}

function deriveParentWbs(wbsCode) {
  const w = String(wbsCode || '').trim();
  if (!w) return null;

  const parts = w.split('.').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return null;

  parts.pop();
  return parts.join('.');
}


// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
export default function WorkProgrammePanel({ contractId, authority, isLocked, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [selectedVersionNo, setSelectedVersionNo] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  // Create version form
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionType, setNewVersionType] = useState(PROGRAMME_VERSION_TYPES.BASELINE);

  // Create activity form
  const [newWbs, setNewWbs] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newFinish, setNewFinish] = useState('');
  const [newDuration, setNewDuration] = useState(1);

  // Import modal + UI panels
  const [importOpen, setImportOpen] = useState(false);
  const [showVersionsPanel, setShowVersionsPanel] = useState(true);
  const [showWbsPanel, setShowWbsPanel] = useState(true);

  // Tree expand/collapse
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const canEdit = (authority?.canEditProgramme ?? true) && !authority?.isReadOnly && !isLocked;
  
  const { user } = useAuth();

  // Search + ONE Dropdown Filter
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL');
  // ALL | NOT_STARTED | IN_PROGRESS | COMPLETED | SV_CRITICAL | SV_HIDE_ONTRACK

  // As-of date (Planned% + SV based on this)
  const [asOfDate, setAsOfDate] = useState(todayISODate());

  // Weight config (persisted in programme_versions)
  const [weightMode, setWeightMode] = useState('hybrid'); // 'hybrid' | 'boq' | 'duration'
  const [alphaCost, setAlphaCost] = useState(0.7);
  const [savingWeightConfig, setSavingWeightConfig] = useState(false);
  const [weightSaveError, setWeightSaveError] = useState(null);

  // ✅ Forces reload AFTER DB save completes
  const [weightRefreshKey, setWeightRefreshKey] = useState(0);

  // ✅ Prevent saving immediately when we are just loading existing DB values
  const skipNextWeightSaveRef = useRef(true);

  // From actual rollup view:
  // { [programme_item_id]: { pct, source, leafWeight, rollupWeightTotal } }
  const [actualRollupMap, setActualRollupMap] = useState({});

  // Variance snapshot map (planned + actual + sv)
  // { [programme_item_id]: { planned, actual, sv } }
  const [varianceMap, setVarianceMap] = useState({});

  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState(null);

  // ------------------------------------------------------------
  // Load versions and pick default
  // ------------------------------------------------------------
  const loadVersionsAndPick = async () => {
    try {
      setLoading(true);    
      setVersionsLoading(true);
      setVersionsError(null);

      const v = await getProgrammeVersions(contractId);
      setVersions(v || []);

      // 1) try current version
      let pick =
        (v || []).find((x) => x.is_current)?.version_number ??
        null;

      // 2) fallback: first version
      if (!pick) {
        pick = (v || []).length > 0 ? v[0]?.version_number ?? null : null;
      }

      // 3) fallback: helper
      if (!pick) {
        pick = await getDefaultProgrammeVersionNumber(contractId);
      }

      setSelectedVersionNo(pick);
    } catch (e) {
      console.error('Error loading versions:', e);
      setVersionsError(e?.message || 'Failed to load versions');
      setVersions([]);
      setSelectedVersionNo(null);
    } finally {
      setVersionsLoading(false);
      setLoading(false);
    }
  };

  const setCurrentVersion = async (versionNo) => {
    if (!contractId || !versionNo) return;

    // 1) programme_versions: only one current
    const { error: e1 } = await supabase
      .from('programme_versions')
      .update({ is_current: false })
      .eq('contract_id', contractId);
    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from('programme_versions')
      .update({ is_current: true })
      .eq('contract_id', contractId)
      .eq('version_number', Number(versionNo));
    if (e2) throw e2;

    // 2) programme_items: keep is_current aligned
    await supabase
      .from('programme_items')
      .update({ is_current: false })
      .eq('contract_id', contractId);

    await supabase
      .from('programme_items')
      .update({ is_current: true })
      .eq('contract_id', contractId)
      .eq('programme_version', Number(versionNo));

    // 3) refresh UI versions list
    await loadVersionsAndPick();
  };

  const loadItems = async (versionNo) => {
    if (!contractId || !versionNo) {
      setItems([]);
      return;
    }

    try {
      setError(null);
      const list = await getProgrammeItems(contractId, {
        programmeVersionNumber: Number(versionNo),
      });
      setItems(list || []);

      // auto-expand parents + summaries
      const parentIds = new Set();
      const summaryIds = new Set((list || []).filter((it) => it.activity_type === 'Summary').map((it) => it.id));
      (list || []).forEach((it) => {
        if (it.parent_id) parentIds.add(it.parent_id);
      });

      const expand = new Set();
      summaryIds.forEach((id) => expand.add(id));
      parentIds.forEach((id) => expand.add(id));
      setExpandedIds(expand);

      onChanged?.();
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to load programme items');
      setItems([]);
    }
  };



  useEffect(() => {
    loadVersionsAndPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  useEffect(() => {
    if (!selectedVersionNo) return;
    loadItems(selectedVersionNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionNo]);

  const selectedVersion = useMemo(() => {
    return versions.find((v) => v.version_number === selectedVersionNo) || null;
  }, [versions, selectedVersionNo]);

  // ------------------------------------------------------------
  // Sync weight config from selectedVersion only (NO extra fetch)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!selectedVersionNo) return;

    const wm = selectedVersion?.weight_mode || 'hybrid';
    const ac = selectedVersion?.alpha_cost != null ? Number(selectedVersion.alpha_cost) : 0.7;

    setWeightMode(wm);
    setAlphaCost(ac);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionNo, selectedVersion?.weight_mode, selectedVersion?.alpha_cost]);

  // ------------------------------------------------------------
  // Save weight config when user changes dropdown/alpha (UI -> DB)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!contractId || !selectedVersionNo) return;
    if (!canEdit) return;

    let cancelled = false;
    setWeightSaveError(null);

    const t = setTimeout(async () => {
      try {
        setSavingWeightConfig(true);

        const payload = {
          weight_mode: weightMode,
          alpha_cost: Number(alphaCost),
          weight_updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('programme_versions')
          .update(payload)
          .eq('contract_id', contractId)
          .eq('version_number', Number(selectedVersionNo));

        if (error) throw error;

        // update local versions state
        setVersions((prev) =>
          (prev || []).map((v) =>
            v.version_number === Number(selectedVersionNo)
              ? { ...v, weight_mode: weightMode, alpha_cost: Number(alphaCost) }
              : v
          )
        );
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to save weight config:', e);
          setWeightSaveError(e?.message || 'Failed to save weight config');
        }
      } finally {
        if (!cancelled) setSavingWeightConfig(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [contractId, selectedVersionNo, weightMode, alphaCost, canEdit]);

  // ------------------------------------------------------------
  // Load Actual Progress rollup view (also returns weights)
  // ------------------------------------------------------------
  useEffect(() => {
    const loadActualRollup = async () => {
      if (!contractId || !selectedVersionNo) return;

      try {
        const { data, error } = await supabase
          .from('v_programme_actual_progress_rollup')
          .select('programme_item_id, actual_percent_to_date, actual_source, leaf_weight, rollup_weight_total, programme_version')
          .eq('contract_id', contractId)
          .eq('programme_version', Number(selectedVersionNo));

        if (error) throw error;

        const map = {};
        (data || []).forEach((r) => {
          map[r.programme_item_id] = {
            pct: Number(r.actual_percent_to_date || 0),
            source: r.actual_source || 'none',
            leafWeight: r.leaf_weight != null ? Number(r.leaf_weight) : null,
            rollupWeightTotal: r.rollup_weight_total != null ? Number(r.rollup_weight_total) : null,
          };
        });

        setActualRollupMap(map);
      } catch (err) {
        console.error('Error loading actual rollup:', err);
        setActualRollupMap({});
      }
    };

    loadActualRollup();
  }, [contractId, selectedVersionNo, weightMode, alphaCost]);

  // ------------------------------------------------------------
  // Load planned+actual+SV snapshot (RPC) - Option B
  // ------------------------------------------------------------
  useEffect(() => {
    const loadVariance = async () => {
      if (!contractId || !selectedVersionNo || !asOfDate) return;

      try {
        const { data, error } = await supabase.rpc('fn_programme_variance_snapshot', {
          p_contract_id: contractId,
          p_programme_version: Number(selectedVersionNo),
          p_as_of_date: asOfDate,
        });

        if (error) throw error;

        const map = {};
        (data || []).forEach((r) => {
          map[r.programme_item_id] = {
            planned: Number(r.planned_percent_to_date || 0),
            actual: Number(r.actual_percent_to_date || 0),
            sv: Number(r.sv_percent || 0),
          };
        });

        setVarianceMap(map);
      } catch (e) {
        console.error('Error loading variance snapshot:', e);
        setVarianceMap({});
      }
    };

    loadVariance();
  }, [contractId, selectedVersionNo, asOfDate, weightMode, alphaCost]);

  // ------------------------------------------------------------
  // Ensure version exists (for Import CSV)
  // ------------------------------------------------------------
  const ensureVersion = async () => {
    if (selectedVersionNo) return selectedVersionNo;

    if (versions?.length) {
      const pick = versions[0].version_number;
      setSelectedVersionNo(pick);
      return pick;
    }

    const created = await createProgrammeVersion({
      contractId,
      versionName: 'Master Programme (Rev 0)',
      versionType: PROGRAMME_VERSION_TYPES.BASELINE,
      description: 'Auto-created for first programme import',
      setAsCurrent: true,
    });

    const v = await getProgrammeVersions(contractId);
    setVersions(v || []);
    setSelectedVersionNo(created.version_number);
    return created.version_number;
  };

  // ------------------------------------------------------------
  // Create version / item
  // ------------------------------------------------------------
  const onCreateVersion = async () => {
    try {
      if (!newVersionName.trim()) throw new Error('Please enter version name');

      const created = await createProgrammeVersion({
        contractId,
        versionName: newVersionName.trim(),
        versionType: newVersionType,
        setAsCurrent: true,
      });

      setNewVersionName('');
      await loadVersionsAndPick();
      setSelectedVersionNo(created.version_number);
    } catch (e) {
      alert(e?.message || 'Failed to create version');
    }
  };

  const onCreateItem = async () => {
    try {
      if (!selectedVersionNo) throw new Error('Select a programme version first');
      if (!newWbs.trim()) throw new Error('WBS Code is required');
      if (!newDesc.trim()) throw new Error('Description is required');
      if (!newStart) throw new Error('Planned Start is required');
      if (!newFinish) throw new Error('Planned Finish is required');

      await createProgrammeItem({
        contractId,
        programmeVersionNumber: Number(selectedVersionNo),
        wbsCode: newWbs.trim(),
        description: newDesc.trim(),
        plannedStart: newStart,
        plannedFinish: newFinish,
        durationDays: Number(newDuration || 1),
        sortOrder: (items?.length || 0) + 1,
      });

      setNewWbs('');
      setNewDesc('');
      setNewStart('');
      setNewFinish('');
      setNewDuration(1);

      await loadItems(selectedVersionNo);
    } catch (e) {
      console.error('Add activity error:', e);
      alert(e?.message || JSON.stringify(e, null, 2) || 'Failed to add activity');
    }
  };

  const onDeleteItem = async (item) => {
    const ok = window.confirm(`Delete activity ${item.wbs_code}?`);
    if (!ok) return;

    try {
      await deleteProgrammeItem(item.id);
      await loadItems(selectedVersionNo);
    } catch (e) {
      alert(e?.message || 'Failed to delete activity');
    }
  };

  const cloneVersionFrom = async ({ sourceVersionNo, newVersionName, newVersionType }) => {
    if (!contractId) throw new Error('Missing contractId');
    if (!sourceVersionNo) throw new Error('Select a source version first');

    // next version number
    const nextNo =
      Math.max(0, ...(versions || []).map((v) => Number(v.version_number || 0))) + 1;

    // copy config from source
    const src = (versions || []).find((v) => Number(v.version_number) === Number(sourceVersionNo));
    const weight_mode = src?.weight_mode || 'hybrid';
    const alpha_cost = src?.alpha_cost != null ? Number(src.alpha_cost) : 0.7;

    // create version row
    const { data: createdVer, error: verErr } = await supabase
      .from('programme_versions')
      .insert([
        {
          contract_id: contractId,
          version_number: nextNo,
          version_name: newVersionName,
          version_type: newVersionType,
          description: `Cloned from Version ${sourceVersionNo}`,
          created_by: user?.id,
          is_current: true,
          weight_mode,
          alpha_cost,
          weight_updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();
    if (verErr) throw verErr;

    // make it current (and align programme_items.is_current)
    await setCurrentVersion(nextNo);

    // load source items
    const { data: srcItems, error: itemsErr } = await supabase
      .from('programme_items')
      .select('*')
      .eq('contract_id', contractId)
      .eq('programme_version', Number(sourceVersionNo))
      .order('level', { ascending: true })
      .order('sort_order', { ascending: true });
    if (itemsErr) throw itemsErr;

    if (!srcItems?.length) return createdVer;

    // insert in level order so parent exists before child
    const wbsToNewId = {};

    for (const it of srcItems) {
      const parentWbs = deriveParentWbs(it.wbs_code);
      const parent_id = parentWbs ? wbsToNewId[parentWbs] || null : null;

      const payload = {
        contract_id: contractId,
        programme_version: nextNo,

        wbs_code: it.wbs_code,
        description: it.description,
        activity_type: it.activity_type,

        planned_start: it.planned_start,
        planned_finish: it.planned_finish,
        duration_days: it.duration_days,

        actual_start: it.actual_start,
        actual_finish: it.actual_finish,
        actual_duration_days: it.actual_duration_days,

        percent_complete: it.percent_complete,
        parent_id,
        level: it.level,
        sort_order: it.sort_order,

        calendar_id: it.calendar_id,
        resource_name: it.resource_name,
        linked_boq_item_id: it.linked_boq_item_id,

        status: it.status,
        is_critical: it.is_critical,
        total_float_days: it.total_float_days,

        created_by: user?.id,
        is_current: true,
      };

      const { data: ins, error: insErr } = await supabase
        .from('programme_items')
        .insert([payload])
        .select('id, wbs_code')
        .single();
      if (insErr) throw insErr;

      wbsToNewId[String(ins.wbs_code)] = ins.id;
    }

    return createdVer;
  };

  // Quick update Planned% (uses programme_items.percent_complete)
  const onQuickUpdatePercent = async (item, pct) => {
    try {
      if (!canEdit) return;

      const { error } = await supabase
        .from('programme_items')
        .update({ percent_complete: String(pct), updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) throw error;

      setItems((prev) =>
        (prev || []).map((it) => (it.id === item.id ? { ...it, percent_complete: String(pct) } : it))
      );
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Failed to update planned %');
    }
  };

  // ------------------------------------------------------------
  // Tree view: compute visible rows
  // ------------------------------------------------------------
  const tree = useMemo(() => buildProgrammeTree(items), [items]);

  // ✅ ONE FILTER ONLY (tree concept: if child matches → parent appears)
  const filteredTree = useMemo(() => {
    const q = normalizeText(query);

    const predicate = (it) => {
      // text search
      const hay = `${it.wbs_code || ''} ${it.description || ''}`.toLowerCase();
      if (q && !hay.includes(q)) return false;

      const actual = clampPct(actualRollupMap[it.id]?.pct ?? 0);
      const sv = Number(varianceMap[it.id]?.sv ?? 0);
      const svSev = classifySvSeverity(sv);
      const cat = classifyProgressFromActual(actual);

      if (filterMode === 'ALL') return true;

      if (filterMode === 'NOT_STARTED') return cat === 'not started';
      if (filterMode === 'IN_PROGRESS') return cat === 'in progress';
      if (filterMode === 'COMPLETED') return cat === 'completed';

      if (filterMode === 'SV_CRITICAL') return svSev === 'critical';

      if (filterMode === 'SV_HIDE_ONTRACK') {
        // hide On Track items only (but keep others)
        return svSev !== 'ontrack';
      }

      return true;
    };

    return filterTree(tree, predicate);
  }, [tree, query, filterMode, actualRollupMap, varianceMap]);

  const visibleRows = useMemo(() => flattenVisible(filteredTree, expandedIds), [filteredTree, expandedIds]);

  // When filtering/searching, expand parents in filtered tree for clarity
  useEffect(() => {
    const hasActiveFilter = Boolean(normalizeText(query)) || filterMode !== 'ALL';
    if (!hasActiveFilter) return;

    const parents = new Set();
    const walk = (nodes) => {
      nodes.forEach((n) => {
        if (n.children?.length) {
          parents.add(n.id);
          walk(n.children);
        }
      });
    };
    walk(filteredTree);
    setExpandedIds(parents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filterMode, filteredTree]);

  // Expand/collapse helpers
  const toggleNode = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const parents = new Set();
    items.forEach((it) => {
      if (it.parent_id) parents.add(it.parent_id);
    });
    setExpandedIds(parents);
  };

  const collapseAll = () => setExpandedIds(new Set());

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="bg-white">
      {loading ? (
        <div className="animate-pulse bg-gray-100 rounded-lg h-24" />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-red-900">Programme load failed</div>
          <div className="text-xs text-red-800 mt-1">{error}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ===================================================== */}
          {/* Programme Versions (collapsible) */}
          {/* ===================================================== */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowVersionsPanel((v) => !v)}
              className="w-full px-4 py-3 bg-gray-50 border-b flex items-center justify-between"
            >
              <div className="text-sm font-semibold text-gray-900">Programme Versions</div>
              <div className="text-gray-600">{showVersionsPanel ? '▾' : '▸'}</div>
            </button>

            {showVersionsPanel && (
              <div className="p-4">
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <div className="text-sm font-semibold text-gray-900">Programme Versions</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Weight Mode & Alpha are saved into <b>programme_versions</b> per version.
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <label className="text-xs font-medium text-gray-700">Select Version Number</label>

                    {versions.length > 0 ? (
                      <select
                        value={selectedVersionNo || ''}
                        onChange={(e) => setSelectedVersionNo(Number(e.target.value))}
                        className="w-full rounded-md border-gray-300"
                      >
                        <option value="" disabled>
                          Select…
                        </option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.version_number}>
                            v{v.version_number} • {v.version_type} • {v.version_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        value={selectedVersionNo || 1}
                        onChange={(e) => setSelectedVersionNo(Number(e.target.value))}
                        className="w-full rounded-md border-gray-300"
                        placeholder="Programme version number (e.g. 1)"
                      />
                    )}

                    {/* Weight config UI */}
                    {selectedVersionNo && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold text-gray-800">Roll-up Weight Setup</div>
                            <div className="text-[11px] text-gray-600">
                              Changes affect roll-up weights used by planned/actual roll-up.
                            </div>
                          </div>

                          <div className="text-[11px] text-gray-600">
                            {savingWeightConfig ? (
                              <span className="text-blue-700 font-semibold">Saving…</span>
                            ) : weightSaveError ? (
                              <span className="text-red-700 font-semibold">Save failed</span>
                            ) : (
                              <span className="text-green-700 font-semibold">Saved</span>
                            )}
                          </div>
                        </div>

                        {weightSaveError && <div className="mt-2 text-[11px] text-red-700">{weightSaveError}</div>}

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-700">Weight Mode</label>
                            <select
                              value={weightMode}
                              onChange={(e) => setWeightMode(e.target.value)}
                              disabled={!canEdit}
                              className="w-full mt-1 rounded-md border-gray-300 text-sm disabled:bg-gray-100"
                            >
                              <option value="hybrid">Hybrid (Cost + Duration)</option>
                              <option value="boq">BOQ Value (Cost)</option>
                              <option value="duration">Duration (Days)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">Alpha Cost (Hybrid Only)</label>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={alphaCost}
                                onChange={(e) => setAlphaCost(Number(e.target.value))}
                                disabled={!canEdit || weightMode !== 'hybrid'}
                                className="w-full"
                              />
                              <div className="w-16 text-right text-sm font-semibold">{Number(alphaCost).toFixed(2)}</div>
                            </div>
                            <div className="text-[11px] text-gray-600 mt-1">
                              HybridWeight = α×Cost + (1−α)×k×Duration
                            </div>
                          </div>
                        </div>

                        {!canEdit && (
                          <div className="mt-2 text-[11px] text-gray-500">
                            Editing disabled (read-only / locked / no permission).
                          </div>
                        )}
                      </div>
                    )}

                    {/* Create new version */}
                    <div className="border-t pt-3">
                      <div className="text-xs font-semibold text-gray-800 mb-2">Create New Version</div>

                      <div className="space-y-2">
                        <select
                          value={newVersionType}
                          onChange={(e) => setNewVersionType(e.target.value)}
                          className="w-full rounded-md border-gray-300"
                          disabled={!canEdit}
                        >
                          <option value={PROGRAMME_VERSION_TYPES.BASELINE}>Baseline</option>
                          <option value={PROGRAMME_VERSION_TYPES.REVISION}>Revision</option>
                          <option value={PROGRAMME_VERSION_TYPES.AS_BUILT}>As-Built</option>
                          <option value={PROGRAMME_VERSION_TYPES.CLAIM_SUPPORT}>Claim Support</option>
                        </select>

                        <input
                          value={newVersionName}
                          onChange={(e) => setNewVersionName(e.target.value)}
                          className="w-full rounded-md border-gray-300"
                          placeholder="Version name (e.g., Rev 1)"
                          disabled={!canEdit}
                        />

                        <button
                          type="button"
                          onClick={onCreateVersion}
                          disabled={!canEdit}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          Create Version
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===================================================== */}
          {/* WBS Activities (collapsible) */}
          {/* ===================================================== */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowWbsPanel((v) => !v)}
              className="w-full px-4 py-3 bg-gray-50 border-b flex items-center justify-between"
            >
              <div className="text-sm font-semibold text-gray-900">Activities (WBS)</div>
              <div className="text-gray-600">{showWbsPanel ? '▾' : '▸'}</div>
            </button>

            {showWbsPanel && (
              <div className="p-4">
                <div className="bg-white border rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gray-50 border-b flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Activities (WBS)</div>

                      <div className="text-xs text-gray-600 mt-0.5">
                        {selectedVersion
                          ? `Selected: v${selectedVersion.version_number} • ${selectedVersion.version_type} • ${selectedVersion.version_name}`
                          : selectedVersionNo
                          ? `Selected: v${selectedVersionNo}`
                          : 'Select a version to view activities.'}
                      </div>

                      <div className="text-[11px] text-gray-600 mt-1">
                        Current Weight Mode: <span className="font-semibold">{weightMode}</span>
                        {weightMode === 'hybrid' && (
                          <>
                            {' '}
                            • Alpha: <span className="font-semibold">{Number(alphaCost).toFixed(2)}</span>
                          </>
                        )}
                      </div>

                      {/* Search + ONE Dropdown Filter */}
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search WBS / description…"
                            className="w-full rounded-md border-gray-300 text-sm"
                          />
                          {query && (
                            <button
                              type="button"
                              onClick={() => setQuery('')}
                              className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={filterMode}
                            onChange={(e) => setFilterMode(e.target.value)}
                            className="rounded-md border-gray-300 text-sm"
                          >
                            <option value="ALL">All</option>
                            <option value="NOT_STARTED">Not Started (Actual = 0)</option>
                            <option value="IN_PROGRESS">In Progress (0 &lt; Actual &lt; 100)</option>
                            <option value="COMPLETED">Completed (Actual = 100)</option>
                            <option value="SV_CRITICAL">Critical Only (SV = Critical)</option>
                            <option value="SV_HIDE_ONTRACK">Hide On Track (SV = On Track)</option>
                          </select>

                          <label className="text-xs text-gray-600 flex items-center gap-2">
                            As-of date:
                            <input
                              type="date"
                              value={asOfDate}
                              onChange={(e) => setAsOfDate(e.target.value)}
                              className="rounded-md border-gray-300 text-xs"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setQuery('');
                              setFilterMode('ALL');
                            }}
                            className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
                          >
                            Reset
                          </button>
                        </div>

                        <div className="text-xs text-gray-500">
                          Showing <span className="font-semibold text-gray-700">{visibleRows.length}</span> row(s)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={expandAll}
                        className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        onClick={collapseAll}
                        className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50"
                      >
                        Collapse All
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await ensureVersion();
                            setImportOpen(true);
                          } catch (e) {
                            alert(e?.message || 'Failed to create programme version');
                          }
                        }}
                        disabled={!canEdit}
                        className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Import CSV
                      </button>
                    </div>
                  </div>

                  {/* Add Activity */}
                  <div className="p-4 border-b">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <input
                        className="rounded-md border-gray-300"
                        placeholder="WBS Code (e.g. 1.2.3)"
                        value={newWbs}
                        onChange={(e) => setNewWbs(e.target.value)}
                        disabled={!canEdit || !selectedVersionNo}
                      />
                      <input
                        className="rounded-md border-gray-300 md:col-span-2"
                        placeholder="Activity description"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        disabled={!canEdit || !selectedVersionNo}
                      />
                      <input
                        type="date"
                        className="rounded-md border-gray-300"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                        disabled={!canEdit || !selectedVersionNo}
                      />
                      <input
                        type="date"
                        className="rounded-md border-gray-300"
                        value={newFinish}
                        onChange={(e) => setNewFinish(e.target.value)}
                        disabled={!canEdit || !selectedVersionNo}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Duration (days)</label>
                        <input
                          type="number"
                          min="1"
                          className="w-24 rounded-md border-gray-300"
                          value={newDuration}
                          onChange={(e) => setNewDuration(e.target.value)}
                          disabled={!canEdit || !selectedVersionNo}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={onCreateItem}
                        disabled={!canEdit || !selectedVersionNo}
                        className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        Add Activity
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">WBS</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Planned</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Planned %</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Weight</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actual</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-200">
                          {visibleRows.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-6 text-sm text-gray-600">
                                No activities match your filter.
                              </td>
                            </tr>
                          ) : (
                            visibleRows.map(({ node: it, depth, hasChildren }) => {
                              const ap = actualRollupMap[it.id] || {
                                pct: 0,
                                source: 'none',
                                leafWeight: null,
                                rollupWeightTotal: null,
                              };

                              const actualPct = clampPct(ap.pct || 0);
                              const weightToShow = ap.source === 'rollup' ? ap.rollupWeightTotal : ap.leafWeight;

                              const vr = varianceMap[it.id] || { planned: 0, actual: actualPct, sv: 0 };

                              const plannedToDate = clampPct(vr.planned ?? 0);
                              const sv = Number(vr.sv ?? (actualPct - plannedToDate));
                              const svB = svBadge(sv);

                              // ✅ derive status from ACTUAL % (your rule)
                              const derivedStatus = classifyProgressFromActual(actualPct);
                              const derivedStatusText =
                                derivedStatus === 'not started' ? 'Not Started' :
                                derivedStatus === 'completed' ? 'Completed' :
                                'In Progress';

                              const derivedStatusCls =
                                derivedStatus === 'completed'
                                  ? 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800'
                                  : derivedStatus === 'in progress'
                                  ? 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800'
                                  : 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700';

                              return (
                                <tr key={it.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 16}px` }}>
                                      {hasChildren ? (
                                        <button
                                          type="button"
                                          onClick={() => toggleNode(it.id)}
                                          className="w-6 h-6 flex items-center justify-center rounded border bg-white hover:bg-gray-50"
                                          title={expandedIds.has(it.id) ? 'Collapse' : 'Expand'}
                                        >
                                          {expandedIds.has(it.id) ? '▾' : '▸'}
                                        </button>
                                      ) : (
                                        <div className="w-6 h-6" />
                                      )}

                                      <span>{iconForType(it.activity_type)}</span>
                                      <span>{it.wbs_code}</span>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3 text-sm text-gray-800">
                                    {it.description}
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className={derivedStatusCls}>{derivedStatusText}</span>
                                      <span className={svB.cls}>{svB.label}</span>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    <div className="text-xs">
                                      {it.planned_start} → {it.planned_finish}
                                    </div>
                                    <div className="text-xs text-gray-500">{it.duration_days ?? '-'} days</div>
                                  </td>

                                  {/* Planned %  */}
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {/* ✅ Planned-to-date (from RPC) — respects As-of date + weighting */}
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div className="bg-blue-600 h-2" style={{ width: `${plannedToDate}%` }} />
                                      </div>
                                      <div className="text-xs w-12 text-right">{plannedToDate.toFixed(2)}%</div>
                                    </div>

                                    <div className="mt-1 text-[11px] text-gray-500">
                                      Planned-to-date (As-of {asOfDate})
                                    </div>

                                    {/* Optional: keep manual planned % editor (rename so it’s not confusing) */}
                                    <div className="mt-2 text-[11px] text-gray-500">
                                      Manual Planned %: <span className="font-semibold">{clampPct(it.percent_complete || 0).toFixed(2)}%</span>
                                    </div>

                                    {canEdit && (
                                      <div className="mt-2 flex gap-1 flex-wrap">
                                        {[0, 25, 50, 75, 100].map((pctBtn) => (
                                          <button
                                            key={pctBtn}
                                            type="button"
                                            onClick={() => onQuickUpdatePercent(it, pctBtn)}
                                            className="px-2 py-1 text-[11px] rounded border bg-white hover:bg-gray-50"
                                          >
                                            {pctBtn}%
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </td>

                                  {/* Weight */}
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {weightToShow == null ? (
                                      <span className="text-xs text-gray-400">-</span>
                                    ) : (
                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-900">{Number(weightToShow).toLocaleString()}</div>
                                        <div className="text-[11px] text-gray-500">
                                          {ap.source === 'rollup' ? 'Σ leaf weights' : 'leaf weight'}
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Actual */}
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div className="bg-green-600 h-2" style={{ width: `${actualPct}%` }} />
                                      </div>
                                      <div className="text-xs w-12 text-right">{actualPct.toFixed(2)}%</div>
                                    </div>

                                    <div className="mt-1 text-[11px] text-gray-500">
                                      Source: <span className="font-semibold">{ap.source}</span>
                                    </div>
                                  </td>

                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => onDeleteItem(it)}
                                      disabled={!canEdit}
                                      className="px-3 py-1.5 text-xs rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-600">
                      Next: link diary progress + BOQ measurement to programme items (linked_boq_item_id).
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <ImportProgrammeModal
            isOpen={importOpen}
            onClose={() => setImportOpen(false)}
            contractId={contractId}
            programmeVersionNumber={selectedVersionNo}
            canEdit={canEdit}
            onImported={() => loadItems(selectedVersionNo)}
          />
        </div>
      )}
    </div>
  );
}
