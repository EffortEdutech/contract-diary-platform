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

// Defensive: programmeService may export types as array or object
const PROGRAMME_VERSION_TYPE_OPTIONS = Array.isArray(PROGRAMME_VERSION_TYPES)
  ? PROGRAMME_VERSION_TYPES
  : Object.values(PROGRAMME_VERSION_TYPES || {});

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function normalizeText(s) {
  return String(s || '').toLowerCase().trim();
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function clampPct(x) {
  const n = Number(x ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function parseISODateToUTC(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map((v) => Number(v));
  if (!y || !m || !d) return null;
  // Use UTC noon to avoid timezone shift
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function plannedPctForItem(item, asOfDateStr) {
  const asOf = parseISODateToUTC(asOfDateStr);
  const s = parseISODateToUTC(item?.planned_start);
  const f = parseISODateToUTC(item?.planned_finish);

  if (!asOf || !s || !f) return 0;
  if (f.getTime() <= s.getTime()) return asOf.getTime() >= f.getTime() ? 100 : 0;

  if (asOf.getTime() <= s.getTime()) return 0;
  if (asOf.getTime() >= f.getTime()) return 100;

  const span = f.getTime() - s.getTime();
  const done = asOf.getTime() - s.getTime();
  return clampPct((done / span) * 100);
}

function formatMoney(n) {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function formatPct(n) {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return '0.00%';
  return `${num.toFixed(2)}%`;
}

// ------------------------------------------------------------
// Tree helpers: build nested structure for programme_items
// ------------------------------------------------------------
function buildTree(items) {
  const map = new Map();
  const roots = [];

  (items || []).forEach((it) => {
    map.set(it.id, { ...it, children: [] });
  });

  (items || []).forEach((it) => {
    const node = map.get(it.id);
    if (it.parent_id && map.has(it.parent_id)) {
      map.get(it.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  // sort children by sort_order then wbs_code
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (so !== 0) return so;
      return String(a.wbs_code || '').localeCompare(String(b.wbs_code || ''));
    });
    nodes.forEach((n) => n.children?.length && sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

function flattenTree(tree) {
  const out = [];
  const walk = (nodes) => {
    nodes.forEach((n) => {
      out.push(n);
      if (n.children?.length) walk(n.children);
    });
  };
  walk(tree || []);
  return out;
}

function filterTreeKeepParents(tree, matchFn) {
  const walk = (node) => {
    const children = (node.children || [])
      .map(walk)
      .filter(Boolean);

    const selfMatch = matchFn(node);
    if (selfMatch || children.length) {
      return { ...node, children };
    }
    return null;
  };

  return (tree || []).map(walk).filter(Boolean);
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function WorkProgrammePanel({
  contractId,
  authority,
  isLocked = false,
}) {
  const { user, profile } = useAuth();

  // ----------------------------
  // Permissions
  // ----------------------------
  const canEdit = useMemo(() => {
    if (isLocked) return false;
    const role = authority?.role || profile?.user_role || profile?.role;
    // keep simple: owner/editor can edit
    return role === 'owner' || role === 'editor' || role === 'admin';
  }, [authority, profile, isLocked]);

  // ----------------------------
  // State: versions
  // ----------------------------
  const [versions, setVersions] = useState([]);
  const [selectedVersionNo, setSelectedVersionNo] = useState(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState(null);

  // Version form fields
  const [versionName, setVersionName] = useState('');
  const [versionType, setVersionType] = useState('Baseline');

  // Weight config for selected version (stored in programme_versions)
  const [weightMode, setWeightMode] = useState('hybrid');
  const [alphaCost, setAlphaCost] = useState(0.7);
  const [savingWeightConfig, setSavingWeightConfig] = useState(false);
  const [weightSaveError, setWeightSaveError] = useState(null);

  // create version modal
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [createVersionError, setCreateVersionError] = useState(null);

  // ----------------------------
  // State: programme items
  // ----------------------------
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState(null);

  // add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    wbs_code: '',
    description: '',
    activity_type: 'Task',
    planned_start: '',
    planned_finish: '',
    duration_days: '',
    parent_id: null,
    level: 1,
    sort_order: 0,
    status: 'Not Started',
    is_critical: false,
  });
  const [savingItem, setSavingItem] = useState(false);
  const [saveItemError, setSaveItemError] = useState(null);

  // Tree UI
  const [expandedIds, setExpandedIds] = useState(new Set());
  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtering/search
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // ALL | NOT_STARTED | IN_PROGRESS | COMPLETED | CRITICAL_ONLY | HIDE_COMPLETED
  const [asOfDate, setAsOfDate] = useState(todayISODate());

  // Rollup actual & weights from view
  const [actualRollupMap, setActualRollupMap] = useState({});
  // Planned/Actual/SV snapshot (RPC)
  const [varianceMap, setVarianceMap] = useState({});

  // Import modal
  const [showImport, setShowImport] = useState(false);

  // Prevent duplicate initial pick
  const didInitPickRef = useRef(false);

  // ------------------------------------------------------------
  // Programme version type options (safe even if export changes)
  // ------------------------------------------------------------
  const programmeVersionTypeOptions = useMemo(() => {
    const t = PROGRAMME_VERSION_TYPES;
    if (Array.isArray(t)) return t;
    if (t && typeof t === 'object') return Object.values(t);
    if (Array.isArray(PROGRAMME_VERSION_TYPE_OPTIONS) && PROGRAMME_VERSION_TYPE_OPTIONS.length)
      return PROGRAMME_VERSION_TYPE_OPTIONS;
    return ['Baseline', 'Revision', 'As-Built', 'Claim Support'];
  }, []);

  // ------------------------------------------------------------
  // Load versions (and pick default) when contract changes
  // ------------------------------------------------------------
  const loadVersionsAndPick = async () => {
    if (!contractId) return; // CRITICAL: never query with blank contractId

    setVersionsLoading(true);
    setVersionsError(null);

    try {
      const data = await getProgrammeVersions(contractId);
      const list = data || [];
      setVersions(list);

      // Pick current or default version number
      const defaultNoRaw =
        selectedVersionNo != null
          ? selectedVersionNo
          : getDefaultProgrammeVersionNumber(list) ?? (list[0]?.version_number ?? 1);

      const defaultNo = Number(defaultNoRaw) || 1;
      setSelectedVersionNo(defaultNo);

      // Fill form fields from selected version
      const sv = list.find((v) => Number(v.version_number) === defaultNo) || null;
      if (sv) {
        setVersionName(sv.version_name || `Version ${sv.version_number}`);
        setVersionType(sv.version_type || 'Baseline');
        setWeightMode(sv.weight_mode || 'hybrid');
        setAlphaCost(sv.alpha_cost != null ? Number(sv.alpha_cost) : 0.7);
      } else {
        setVersionName(`Version ${defaultNo}`);
        setVersionType('Baseline');
      }
    } catch (e) {
      console.error('Failed to load programme_versions:', e);
      setVersionsError(e?.message || 'Failed to load programme versions');
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    didInitPickRef.current = false;
    loadVersionsAndPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  // ------------------------------------------------------------
  // Selected version object
  // ------------------------------------------------------------
  const selectedVersion = useMemo(() => {
    if (selectedVersionNo == null) return null;
    return versions.find((v) => Number(v.version_number) === Number(selectedVersionNo)) || null;
  }, [versions, selectedVersionNo]);

  // ------------------------------------------------------------
  // Sync form fields from selectedVersion (only when version changes)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!selectedVersionNo) return;
    if (!selectedVersion) return;

    setVersionName(selectedVersion.version_name || `Version ${selectedVersion.version_number}`);
    setVersionType(selectedVersion.version_type || 'Baseline');
    setWeightMode(selectedVersion.weight_mode || 'hybrid');
    setAlphaCost(selectedVersion.alpha_cost != null ? Number(selectedVersion.alpha_cost) : 0.7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionNo]);

  // ------------------------------------------------------------
  // Save weight config (UI -> programme_versions)
  // ------------------------------------------------------------
  useEffect(() => {
    if (!contractId || !selectedVersionNo) return;
    if (!canEdit) return;

    // debounce
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
            Number(v.version_number) === Number(selectedVersionNo)
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
  // Load programme items for selected version
  // ------------------------------------------------------------
  const loadItems = async (versionNo) => {
    if (!contractId) return;
    const vNo = Number(versionNo);
    if (!Number.isFinite(vNo)) return;

    setItemsLoading(true);
    setItemsError(null);

    try {
      const data = await getProgrammeItems(contractId, vNo);
      setItems(data || []);
    } catch (e) {
      console.error('Error loading programme items:', e);
      setItemsError(e?.message || 'Failed to load programme items');
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedVersionNo) return;
    loadItems(selectedVersionNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionNo, contractId]);

  // ------------------------------------------------------------
  // Load Actual Progress rollup view (also returns weights)
  // ------------------------------------------------------------
  useEffect(() => {
    const loadActualRollup = async () => {
      if (!contractId || !selectedVersionNo) return;

      const vNo = Number(selectedVersionNo);
      if (!Number.isFinite(vNo)) return;

      try {
        const { data, error } = await supabase
          .from('v_programme_actual_progress_rollup')
          .select(
            'programme_item_id, actual_percent_to_date, actual_source, leaf_weight, rollup_weight_total, programme_version, weight_mode, alpha_cost'
          )
          .eq('contract_id', contractId)
          .eq('programme_version', vNo);

        if (error) throw error;

        const map = {};
        (data || []).forEach((r) => {
          map[r.programme_item_id] = {
            pct: Number(r.actual_percent_to_date || 0),
            source: r.actual_source || 'none',
            leafWeight: r.leaf_weight != null ? Number(r.leaf_weight) : null,
            rollupWeightTotal: r.rollup_weight_total != null ? Number(r.rollup_weight_total) : null,
            weightMode: r.weight_mode || null,
            alphaCost: r.alpha_cost != null ? Number(r.alpha_cost) : null,
          };
        });

        setActualRollupMap(map);
      } catch (err) {
        console.error('Error loading actual rollup:', err);
        setActualRollupMap({});
      }
    };

    loadActualRollup();
  }, [contractId, selectedVersionNo]);

  // ------------------------------------------------------------
  // Load planned+actual+SV snapshot (RPC) - optional
  // If you don't have fn_programme_variance_snapshot, this will safely fail & keep SV blank
  // ------------------------------------------------------------
  useEffect(() => {
    const loadVariance = async () => {
      if (!contractId || !selectedVersionNo || !asOfDate) return;

      const vNo = Number(selectedVersionNo);
      if (!Number.isFinite(vNo)) return;

      try {
        const { data, error } = await supabase.rpc('fn_programme_variance_snapshot', {
          p_contract_id: contractId,
          p_programme_version: vNo,
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
        // quiet fail is OK
        setVarianceMap({});
      }
    };

    loadVariance();
  }, [contractId, selectedVersionNo, asOfDate]);

  // ------------------------------------------------------------
  // Build tree + computed columns
  // ------------------------------------------------------------
  const tree = useMemo(() => buildTree(items), [items]);

  const enrichedTree = useMemo(() => {
    const map = actualRollupMap || {};
    const vmap = varianceMap || {};

    const walk = (node) => {
      const actual = map[node.id]?.pct ?? 0;
      const source = map[node.id]?.source ?? 'none';
      const leafWeight = map[node.id]?.leafWeight ?? null;
      const rollupWeightTotal = map[node.id]?.rollupWeightTotal ?? null;

      // Planned:
      // If you have RPC variance map, use it; otherwise, compute simple planned % from dates.
      const planned = vmap[node.id]?.planned != null ? vmap[node.id].planned : plannedPctForItem(node, asOfDate);
      const sv = vmap[node.id]?.sv != null ? vmap[node.id].sv : (actual - planned);

      const children = (node.children || []).map(walk);

      return {
        ...node,
        plannedPct: clampPct(planned),
        actualPct: clampPct(actual),
        svPct: Number.isFinite(Number(sv)) ? Number(sv) : 0,
        actualSource: source,
        leafWeight,
        rollupWeightTotal,
        children,
      };
    };

    return (tree || []).map(walk);
  }, [tree, actualRollupMap, varianceMap, asOfDate]);

  // ------------------------------------------------------------
  // Unified filter (single dropdown)
  // ALL | NOT_STARTED | IN_PROGRESS | COMPLETED | CRITICAL_ONLY | HIDE_COMPLETED
  // Rule: if a child matches, parent stays visible (tree concept)
  // ------------------------------------------------------------
  const filteredTree = useMemo(() => {
    const q = normalizeText(query);

    const matchFn = (node) => {
      const actual = node.actualPct ?? 0;

      // search match
      const textMatch =
        !q ||
        normalizeText(node.wbs_code).includes(q) ||
        normalizeText(node.description).includes(q) ||
        normalizeText(node.activity_type).includes(q);

      if (!textMatch) return false;

      switch (filterMode) {
        case 'NOT_STARTED':
          return actual === 0;
        case 'IN_PROGRESS':
          return actual > 0 && actual < 100;
        case 'COMPLETED':
          return actual === 100;
        case 'CRITICAL_ONLY':
          return node.is_critical === true;
        case 'HIDE_COMPLETED':
          return actual < 100;
        case 'ALL':
        default:
          return true;
      }
    };

    return filterTreeKeepParents(enrichedTree, matchFn);
  }, [enrichedTree, query, filterMode]);

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

  // ------------------------------------------------------------
  // UI actions: change version
  // ------------------------------------------------------------
  const handleVersionChange = (e) => {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;
    setSelectedVersionNo(v);
  };

  const handleSaveVersionMeta = async () => {
    if (!contractId || !selectedVersionNo) return;
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from('programme_versions')
        .update({
          version_name: versionName,
          version_type: versionType,
          weight_mode: weightMode,
          alpha_cost: Number(alphaCost),
          weight_updated_at: new Date().toISOString(),
        })
        .eq('contract_id', contractId)
        .eq('version_number', Number(selectedVersionNo));

      if (error) throw error;

      setVersions((prev) =>
        (prev || []).map((v) =>
          Number(v.version_number) === Number(selectedVersionNo)
            ? {
                ...v,
                version_name: versionName,
                version_type: versionType,
                weight_mode: weightMode,
                alpha_cost: Number(alphaCost),
              }
            : v
        )
      );
    } catch (e) {
      console.error('Failed to save version metadata:', e);
      alert(e?.message || 'Failed to save version metadata');
    }
  };

  // ------------------------------------------------------------
  // Create new version
  // ------------------------------------------------------------
  const handleCreateVersion = async () => {
    if (!contractId) return;
    if (!canEdit) return;

    setCreatingVersion(true);
    setCreateVersionError(null);

    try {
      // next version number
      const maxNo =
        (versions || []).reduce((m, v) => Math.max(m, Number(v.version_number) || 0), 0) || 0;
      const nextNo = maxNo + 1;

      const payload = {
        contract_id: contractId,
        version_number: nextNo,
        version_name: `Revision ${nextNo}`,
        version_type: 'Revision',
        description: '',
        created_by: user?.id,
        weight_mode: 'hybrid',
        alpha_cost: 0.7,
      };

      await createProgrammeVersion(payload);

      // reload
      await loadVersionsAndPick();
      setShowCreateVersion(false);
    } catch (e) {
      console.error('Failed to create version:', e);
      setCreateVersionError(e?.message || 'Failed to create version');
    } finally {
      setCreatingVersion(false);
    }
  };

  // ------------------------------------------------------------
  // Add item
  // ------------------------------------------------------------
  const handleAddItem = async () => {
    if (!contractId || !selectedVersionNo) return;
    if (!canEdit) return;

    setSavingItem(true);
    setSaveItemError(null);

    try {
      const payload = {
        contract_id: contractId,
        programme_version: Number(selectedVersionNo),
        wbs_code: newItem.wbs_code,
        description: newItem.description,
        activity_type: newItem.activity_type,
        planned_start: newItem.planned_start || null,
        planned_finish: newItem.planned_finish || null,
        duration_days: newItem.duration_days ? Number(newItem.duration_days) : null,
        parent_id: newItem.parent_id || null,
        level: newItem.level ? Number(newItem.level) : 1,
        sort_order: newItem.sort_order ? Number(newItem.sort_order) : 0,
        status: newItem.status || 'Not Started',
        is_critical: Boolean(newItem.is_critical),
        is_current: true,
        is_baseline: selectedVersion?.version_type === 'Baseline',
      };

      await createProgrammeItem(payload);
      setShowAddItem(false);
      setNewItem({
        wbs_code: '',
        description: '',
        activity_type: 'Task',
        planned_start: '',
        planned_finish: '',
        duration_days: '',
        parent_id: null,
        level: 1,
        sort_order: 0,
        status: 'Not Started',
        is_critical: false,
      });

      await loadItems(selectedVersionNo);
    } catch (e) {
      console.error('Failed to add programme item:', e);
      setSaveItemError(e?.message || 'Failed to add programme item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!canEdit) return;
    if (!window.confirm('Delete this programme item?')) return;

    try {
      await deleteProgrammeItem(id);
      await loadItems(selectedVersionNo);
    } catch (e) {
      console.error('Failed to delete programme item:', e);
      alert(e?.message || 'Failed to delete item');
    }
  };

  // ------------------------------------------------------------
  // Render row in tree table
  // ------------------------------------------------------------
  const renderNodeRow = (node, depth = 0) => {
    const hasChildren = (node.children || []).length > 0;
    const expanded = expandedIds.has(node.id);

    const svLabel =
      node.svPct > 0.001 ? 'On Track' : node.svPct < -0.001 ? 'Critical' : 'Warning';

    const weightLabel = hasChildren ? 'Σ leaf weights' : 'leaf weight';

    return (
      <React.Fragment key={node.id}>
        <tr className="border-b">
          <td className="px-3 py-2 text-sm">
            <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(node.id)}
                  className="text-gray-600 hover:text-gray-900"
                  title={expanded ? 'Collapse' : 'Expand'}
                >
                  {expanded ? '▾' : '▸'}
                </button>
              ) : (
                <span className="text-gray-300">•</span>
              )}

              <span className="font-medium">{node.wbs_code}</span>
              <span className="text-gray-700">{node.description}</span>
            </div>
          </td>

          <td className="px-3 py-2 text-sm">{node.status || '-'}</td>

          <td className="px-3 py-2 text-sm">
            <span className={node.is_critical ? 'font-semibold text-red-700' : ''}>
              {svLabel} {formatPct(node.svPct)}
            </span>
          </td>

          <td className="px-3 py-2 text-sm">
            {node.planned_start || '-'} → {node.planned_finish || '-'}
            <div className="text-xs text-gray-500">{node.duration_days ?? '-'} days</div>
          </td>

          <td className="px-3 py-2 text-sm">
            <div className="font-semibold">{formatPct(node.plannedPct)}</div>
            <div className="text-xs text-gray-500">
              As-of: {asOfDate}
            </div>
          </td>

          <td className="px-3 py-2 text-sm">
            <div className="font-semibold">{formatPct(node.actualPct)}</div>
            <div className="text-xs text-gray-500">Source: {node.actualSource}</div>
          </td>

          <td className="px-3 py-2 text-sm">
            <div className="font-semibold">{formatMoney(node.rollupWeightTotal ?? node.leafWeight ?? 0)}</div>
            <div className="text-xs text-gray-500">{weightLabel}</div>
          </td>

          <td className="px-3 py-2 text-sm text-right">
            {canEdit ? (
              <button
                type="button"
                onClick={() => handleDeleteItem(node.id)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </td>
        </tr>

        {hasChildren && expanded &&
          node.children.map((c) => renderNodeRow(c, depth + 1))}
      </React.Fragment>
    );
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-xl font-semibold">📅 Work Programme</div>
          <div className="text-sm text-gray-600">
            Planning & Scheduling • Tree view • CSV import
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {isLocked ? (
            <span className="px-2 py-1 rounded bg-red-50 text-red-700">Locked</span>
          ) : (
            <span className="px-2 py-1 rounded bg-green-50 text-green-700">Unlocked</span>
          )}
          <span className="ml-2">• Contract status: active</span>
          <span className="ml-2">• Member role: {authority?.role || profile?.user_role || 'member'}</span>
        </div>
      </div>

      {/* ContractId guard */}
      {!contractId ? (
        <div className="p-4 rounded-lg border bg-yellow-50 text-yellow-900">
          Missing contractId. This page must be opened via a contract route.
        </div>
      ) : null}

      {/* Versions Section */}
      <div className="border rounded-xl p-4 mb-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Programme Versions</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
            >
              Import CSV
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowCreateVersion(true)}
                className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                + New Version
              </button>
            )}
          </div>
        </div>

        {versionsLoading ? (
          <div className="text-sm text-gray-600">Loading versions…</div>
        ) : versionsError ? (
          <div className="text-sm text-red-700">{versionsError}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">Select Version</label>
              <select
                value={selectedVersionNo ?? ''}
                onChange={handleVersionChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {(versions || []).map((v) => (
                  <option key={v.id} value={v.version_number}>
                    v{v.version_number} — {v.version_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Version Name</label>
              <input
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Version Type</label>
              <select
                value={versionType}
                onChange={(e) => setVersionType(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
              >
                {programmeVersionTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveVersionMeta}
                  className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
                >
                  Save Version
                </button>
              )}
            </div>
          </div>
        )}

        {/* Weight controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <div>
            <label className="text-xs text-gray-500">Weight Mode</label>
            <select
              value={weightMode}
              onChange={(e) => setWeightMode(e.target.value)}
              disabled={!canEdit}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="hybrid">Hybrid (Duration + Cost)</option>
              <option value="duration">Duration Only</option>
              <option value="boq">BOQ Cost Only</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Alpha Cost (0–1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={alphaCost}
              onChange={(e) => setAlphaCost(e.target.value)}
              disabled={!canEdit}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <div className="text-xs text-gray-500">
              {savingWeightConfig ? 'Saving weight config…' : weightSaveError ? (
                <span className="text-red-700">{weightSaveError}</span>
              ) : (
                <span>Weight config saved to programme_versions.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded-xl p-4 mb-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="WBS / Description…"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Filter</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All</option>
              <option value="NOT_STARTED">Not Started (Actual = 0)</option>
              <option value="IN_PROGRESS">In Progress (0 &lt; Actual &lt; 100)</option>
              <option value="COMPLETED">Completed (Actual = 100)</option>
              <option value="CRITICAL_ONLY">Critical Only</option>
              <option value="HIDE_COMPLETED">Hide Completed</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">As-of date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowAddItem((v) => !v)}
                className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
              >
                + Add Item
              </button>
            )}
          </div>
        </div>

        {showAddItem && (
          <div className="mt-4 border-t pt-4">
            <div className="font-semibold mb-2">Add Programme Item</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="WBS Code"
                value={newItem.wbs_code}
                onChange={(e) => setNewItem((p) => ({ ...p, wbs_code: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
              />
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={newItem.activity_type}
                onChange={(e) => setNewItem((p) => ({ ...p, activity_type: e.target.value }))}
              >
                <option value="Task">Task</option>
                <option value="Summary">Summary</option>
                <option value="Milestone">Milestone</option>
              </select>

              <input
                type="date"
                className="border rounded-lg px-3 py-2 text-sm"
                value={newItem.planned_start}
                onChange={(e) => setNewItem((p) => ({ ...p, planned_start: e.target.value }))}
              />
              <input
                type="date"
                className="border rounded-lg px-3 py-2 text-sm"
                value={newItem.planned_finish}
                onChange={(e) => setNewItem((p) => ({ ...p, planned_finish: e.target.value }))}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Duration days"
                value={newItem.duration_days}
                onChange={(e) => setNewItem((p) => ({ ...p, duration_days: e.target.value }))}
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newItem.is_critical}
                  onChange={(e) => setNewItem((p) => ({ ...p, is_critical: e.target.checked }))}
                />
                Critical
              </label>

              <div className="md:col-span-4 flex gap-2 items-center">
                <button
                  type="button"
                  disabled={savingItem}
                  onClick={handleAddItem}
                  className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingItem ? 'Saving…' : 'Save Item'}
                </button>
                {saveItemError && <span className="text-sm text-red-700">{saveItemError}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Programme Table */}
      <div className="border rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Work Programme</div>

        {itemsLoading ? (
          <div className="p-4 text-sm text-gray-600">Loading programme…</div>
        ) : itemsError ? (
          <div className="p-4 text-sm text-red-700">{itemsError}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-xs text-gray-600">
                  <th className="px-3 py-2">WBS / Description</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">SV</th>
                  <th className="px-3 py-2">Dates</th>
                  <th className="px-3 py-2">Planned %</th>
                  <th className="px-3 py-2">Actual %</th>
                  <th className="px-3 py-2">Weight</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(filteredTree || []).map((n) => renderNodeRow(n, 0))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <ImportProgrammeModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          contractId={contractId}
          onImported={() => {
            setShowImport(false);
            loadItems(selectedVersionNo);
          }}
        />
      )}

      {/* Create Version Modal */}
      {showCreateVersion && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-4">
            <div className="font-semibold text-lg mb-2">Create New Version</div>
            <div className="text-sm text-gray-600 mb-4">
              This creates a new entry in programme_versions. (You can later implement copy/clone of items.)
            </div>

            {createVersionError && (
              <div className="text-sm text-red-700 mb-3">{createVersionError}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateVersion(false)}
                className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={creatingVersion}
                onClick={handleCreateVersion}
                className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {creatingVersion ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
