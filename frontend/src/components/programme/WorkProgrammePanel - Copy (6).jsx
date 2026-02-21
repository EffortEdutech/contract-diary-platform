// src/components/programme/WorkProgrammePanel.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PROGRAMME_VERSION_TYPES,
  getProgrammeVersions,
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
function normalizeText(s) {
  return String(s || '').toLowerCase().trim();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}

/**
 * Picks default programme version number from programme_versions list
 * Priority:
 *  1) is_current = true
 *  2) highest version_number
 *  3) fallback 1
 */
function pickDefaultVersionNumber(list) {
  const arr = Array.isArray(list) ? list : [];
  const current = arr.find((v) => v?.is_current);
  if (current?.version_number != null) return Number(current.version_number);

  let maxNo = 1;
  for (const v of arr) {
    const n = Number(v?.version_number);
    if (Number.isFinite(n) && n > maxNo) maxNo = n;
  }
  return maxNo;
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

function buildTree(items = []) {
  const byId = new Map();
  const roots = [];

  (items || []).forEach((it) => byId.set(it.id, { ...it, children: [] }));
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) byId.get(node.parent_id).children.push(node);
    else roots.push(node);
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return String(a.wbs_code || '').localeCompare(String(b.wbs_code || ''));
    });
    nodes.forEach((n) => n.children?.length && sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

function flattenVisibleTree(nodes, expandedIds, level = 0) {
  const rows = [];
  nodes.forEach((n) => {
    rows.push({ ...n, _level: level });
    if (n.children?.length && expandedIds.has(n.id)) {
      rows.push(...flattenVisibleTree(n.children, expandedIds, level + 1));
    }
  });
  return rows;
}

// Tree-aware filter: keep parents if any descendant matches
function filterTreeKeepParents(nodes, predicate) {
  const walk = (node) => {
    const kids = (node.children || []).map(walk).filter(Boolean);
    const keepSelf = predicate(node);
    if (keepSelf || kids.length) return { ...node, children: kids };
    return null;
  };
  return (nodes || []).map(walk).filter(Boolean);
}

function svSeverity(sv) {
  const n = Number(sv ?? 0);
  if (n <= -10) return 'critical';
  if (n <= -5) return 'warning';
  return 'on_track';
}

function svLabel(sev) {
  if (sev === 'critical') return 'Critical';
  if (sev === 'warning') return 'Warning';
  return 'On Track';
}

function svClass(sev) {
  if (sev === 'critical') return 'text-red-700 bg-red-50 border-red-200';
  if (sev === 'warning') return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-green-700 bg-green-50 border-green-200';
}

function actualStatus(actualPct) {
  const a = clampPct(actualPct);
  if (a >= 100) return 'Completed';
  if (a > 0) return 'In Progress';
  return 'Not Started';
}

function countDescendantLeaves(node) {
  if (!node.children?.length) return 1;
  return node.children.reduce((sum, c) => sum + countDescendantLeaves(c), 0);
}

export default function WorkProgrammePanel({ contractId, authority, isLocked, onChanged }) {
  const { user } = useAuth();
  const canEdit = Boolean(authority?.canEditProgramme) && !isLocked;

  // ------------------------------
  // Versions
  // ------------------------------
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState(null);
  const [selectedVersionNo, setSelectedVersionNo] = useState(null);

  // editable version fields (saved only when user clicks Save)
  const [versionName, setVersionName] = useState('');
  const [versionType, setVersionType] = useState('Baseline');
  const [versionDesc, setVersionDesc] = useState('');
  const [weightMode, setWeightMode] = useState('hybrid');
  const [alphaCost, setAlphaCost] = useState(0.7);
  const [savingVersion, setSavingVersion] = useState(false);
  const [saveVersionError, setSaveVersionError] = useState(null);

  // refresh key for views (weights/rollups) after save/import
  const [weightRefreshKey, setWeightRefreshKey] = useState(0);

  // ------------------------------
  // Items + UI
  // ------------------------------
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState(null);

  const [expandedIds, setExpandedIds] = useState(new Set());
  const [query, setQuery] = useState('');

  // SINGLE filter dropdown (tree-aware)
  // ALL | NOT_STARTED | IN_PROGRESS | COMPLETED | CRITICAL_ONLY | HIDE_COMPLETED
  const [filterMode, setFilterMode] = useState('ALL');

  // As-of date for planned % + SV
  const [asOfDate, setAsOfDate] = useState(todayISODate());

  // Actual rollup map (also weights)
  const [actualRollupMap, setActualRollupMap] = useState({});

  // Planned/Actual/SV map computed client-side
  const [varianceMap, setVarianceMap] = useState({});

  // Import modal
  const [importOpen, setImportOpen] = useState(false);

  const loadedContractRef = useRef(null);

  // programmeService exports PROGRAMME_VERSION_TYPES as an OBJECT (not an array).
  // Normalize it to a safe array for rendering dropdown options.
  const programmeVersionTypeOptions = useMemo(() => {
    const t = PROGRAMME_VERSION_TYPES;
    if (Array.isArray(t)) return t;
    if (t && typeof t === 'object') return Object.values(t);
    return ['Baseline', 'Revision', 'As-Built', 'Claim Support'];
  }, []);

  // ------------------------------------------------------------
  // Load versions and pick default (baseline/current)
  // ------------------------------------------------------------
  const loadVersionsAndPick = async () => {
    // contractId might be temporarily empty while routing/parent page loads
    if (!isValidUuid(contractId)) return;

    try {
      setVersionsLoading(true);
      setVersionsError(null);

      const list = await getProgrammeVersions(contractId);
      setVersions(list || []);

      const defaultNo =
        selectedVersionNo != null ? Number(selectedVersionNo) : pickDefaultVersionNumber(list);

      const pickedNo = Number.isFinite(defaultNo) ? defaultNo : 1;
      setSelectedVersionNo(pickedNo);

      const sv = (list || []).find((v) => Number(v.version_number) === pickedNo) || null;
      setVersionName(sv?.version_name || '');
      setVersionType(sv?.version_type || 'Baseline');
    } catch (e) {
      console.error('Error loading versions:', e);
      setVersionsError(e?.message || 'Failed to load versions');
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    if (!isValidUuid(contractId)) return;

    if (loadedContractRef.current !== contractId) {
      loadedContractRef.current = contractId;
      setSelectedVersionNo(null);
      setItems([]);
      setActualRollupMap({});
      setVarianceMap({});
      setExpandedIds(new Set());
      setQuery('');
      setFilterMode('ALL');
      setAsOfDate(todayISODate());
    }

    loadVersionsAndPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const selectedVersion = useMemo(() => {
    return (versions || []).find((v) => v.version_number === selectedVersionNo) || null;
  }, [versions, selectedVersionNo]);

  // When selection changes, sync editable fields (no auto-save)
  useEffect(() => {
    if (!selectedVersionNo) return;
    const sv = selectedVersion;
    if (!sv) return;

    setVersionName(sv.version_name || `Version ${sv.version_number}`);
    setVersionType(sv.version_type || 'Baseline');
    setVersionDesc(sv.description || '');
    setWeightMode(sv.weight_mode || 'hybrid');
    setAlphaCost(sv.alpha_cost != null ? Number(sv.alpha_cost) : 0.7);
    setSaveVersionError(null);
  }, [selectedVersionNo, selectedVersion]);

  // ------------------------------------------------------------
  // Load items for selected version
  // ------------------------------------------------------------
  const loadItems = async (versionNo) => {
    if (!isValidUuid(contractId) || !versionNo) return;
    setItemsLoading(true);
    setItemsError(null);

    try {
      const data = await getProgrammeItems(contractId, Number(versionNo));
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
  }, [selectedVersionNo]);

  // ------------------------------------------------------------
  // Load Actual rollup view (weights come from DB/version)
  // ------------------------------------------------------------
  useEffect(() => {
    const loadActualRollup = async () => {
      if (!isValidUuid(contractId) || !selectedVersionNo) return;

      try {
        const { data, error } = await supabase
          .from('v_programme_actual_progress_rollup')
          .select(
            'programme_item_id, actual_percent_to_date, actual_source, leaf_weight, rollup_weight_total, programme_version, weight_mode, alpha_cost'
          )
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
  }, [contractId, selectedVersionNo, weightRefreshKey]);

  // ------------------------------------------------------------
  // Compute planned+SV client-side (uses asOfDate + weights)
  // ------------------------------------------------------------
  const tree = useMemo(() => buildTree(items), [items]);

  const leafWeightOf = (id) => {
    const ap = actualRollupMap[id];
    if (ap?.leafWeight != null) return Number(ap.leafWeight);
    const it = items.find((x) => x.id === id);
    return Number(it?.duration_days ?? 1) || 1;
  };

  useEffect(() => {
    if (!isValidUuid(contractId) || !selectedVersionNo || !asOfDate) return;

    const map = {};

    // Base (all nodes): planned from dates, actual from rollup
    items.forEach((it) => {
      const ap = actualRollupMap[it.id];
      const actual = clampPct(ap?.pct ?? 0);
      const planned = clampPct(plannedPctForItem(it, asOfDate));
      map[it.id] = { planned, actual, sv: actual - planned };
    });

    // Summary nodes: weighted average of descendant leaves
    const walk = (node) => {
      if (!node.children?.length) {
        return { w: leafWeightOf(node.id), p: map[node.id]?.planned ?? 0, a: map[node.id]?.actual ?? 0 };
      }

      let totalW = 0;
      let sumP = 0;
      let sumA = 0;

      node.children.forEach((c) => {
        const r = walk(c);
        totalW += r.w;
        sumP += r.p * r.w;
        sumA += r.a * r.w;
      });

      const planned = totalW ? clampPct(sumP / totalW) : 0;
      const actual = totalW ? clampPct(sumA / totalW) : 0;
      map[node.id] = { planned, actual, sv: actual - planned };

      return { w: totalW || 0, p: planned, a: actual };
    };

    tree.forEach((r) => walk(r));
    setVarianceMap(map);
  }, [contractId, selectedVersionNo, asOfDate, items, actualRollupMap, tree]);

  // ------------------------------------------------------------
  // Filtered tree (tree-aware) + auto-expand when filtering/search
  // ------------------------------------------------------------
  const filteredTree = useMemo(() => {
    const q = normalizeText(query);

    const predicate = (node) => {
      const vm = varianceMap[node.id] || { planned: 0, actual: 0, sv: 0 };
      const act = clampPct(vm.actual);
      const sev = svSeverity(vm.sv);

      const textOk =
        !q ||
        normalizeText(node.wbs_code).includes(q) ||
        normalizeText(node.description).includes(q) ||
        normalizeText(node.activity_type).includes(q);

      if (!textOk) return false;

      if (filterMode === 'NOT_STARTED') return act === 0;
      if (filterMode === 'IN_PROGRESS') return act > 0 && act < 100;
      if (filterMode === 'COMPLETED') return act >= 100;
      if (filterMode === 'CRITICAL_ONLY') return sev === 'critical';
      if (filterMode === 'HIDE_COMPLETED') return act < 100;

      return true; // ALL
    };

    return filterTreeKeepParents(tree, predicate);
  }, [tree, query, filterMode, varianceMap]);

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

  const rows = useMemo(() => flattenVisibleTree(filteredTree, expandedIds), [filteredTree, expandedIds]);

  // ------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------
  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCreateItem = async (parentId = null) => {
    if (!canEdit || !isValidUuid(contractId) || !selectedVersionNo) return;

    try {
      const payload = {
        contract_id: contractId,
        programme_version: Number(selectedVersionNo),
        parent_id: parentId,
        wbs_code: '',
        description: 'New item',
        activity_type: 'Task',
        planned_start: asOfDate,
        planned_finish: asOfDate,
        duration_days: 1,
        percent_complete: 0,
      };

      await createProgrammeItem(payload);
      await loadItems(selectedVersionNo);
      onChanged?.();
    } catch (e) {
      console.error('Error creating programme item:', e);
      alert(e?.message || 'Failed to create item');
    }
  };

  const onDeleteItem = async (it) => {
    if (!canEdit) return;
    if (!window.confirm('Delete this programme item?')) return;

    try {
      await deleteProgrammeItem(it.id);
      await loadItems(selectedVersionNo);
      onChanged?.();
    } catch (e) {
      console.error('Error deleting programme item:', e);
      alert(e?.message || 'Failed to delete item');
    }
  };

  // ✅ Important: only when user clicks Save -> update programme_versions -> refresh rollup weights
  const onSaveVersion = async () => {
    if (!canEdit || !isValidUuid(contractId) || !selectedVersionNo) return;

    setSavingVersion(true);
    setSaveVersionError(null);

    try {
      const payload = {
        version_name: versionName || `Version ${selectedVersionNo}`,
        version_type: versionType || 'Baseline',
        description: versionDesc || null,
        weight_mode: weightMode || 'hybrid',
        alpha_cost: Number(alphaCost),
        weight_updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('programme_versions')
        .update(payload)
        .eq('contract_id', contractId)
        .eq('version_number', Number(selectedVersionNo));

      if (error) throw error;

      // Refresh versions (to show updated fields) and refresh rollup/weights
      await loadVersionsAndPick();
      setWeightRefreshKey((k) => k + 1);
      onChanged?.();
    } catch (e) {
      console.error('Failed to save programme version:', e);
      setSaveVersionError(e?.message || 'Failed to save version');
    } finally {
      setSavingVersion(false);
    }
  };

  const onCreateNewVersion = async () => {
    if (!canEdit || !isValidUuid(contractId)) return;
    if (!user?.id) {
      alert('User not ready (auth). Please re-login.');
      return;
    }

    try {
      const baseNo = selectedVersionNo || 1;
      const newNo = (versions?.reduce((m, v) => Math.max(m, v.version_number || 0), 0) || 0) + 1;

      // Creates a new version record (item cloning can be added later)
      await createProgrammeVersion({
        contract_id: contractId,
        version_number: newNo,
        version_name: `Revision ${newNo}`,
        version_type: 'Revision',
        description: `Created from version ${baseNo}`,
        created_by: user.id,
        weight_mode: weightMode || 'hybrid',
        alpha_cost: Number(alphaCost),
        is_current: true,
      });

      await loadVersionsAndPick();
      setSelectedVersionNo(newNo);
      setWeightRefreshKey((k) => k + 1);
      onChanged?.();

      alert(
        `Version ${newNo} created.\n\nNext step (if needed): clone items from version ${baseNo} into version ${newNo}.`
      );
    } catch (e) {
      console.error('Error creating version:', e);
      alert(e?.message || 'Failed to create version');
    }
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  if (!isValidUuid(contractId)) {
    return (
      <div className="p-6 bg-white rounded-xl border text-sm text-gray-600">
        Select a contract to view the Work Programme.
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Versions */}
      <div className="p-4 bg-white rounded-xl border shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold">Programme Versions</div>
            <div className="text-xs text-gray-600">Baseline / Revisions. Weight config belongs to a version.</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateNewVersion}
              disabled={!canEdit}
              className="px-3 py-2 text-xs rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              + New Version
            </button>
          </div>
        </div>

        {versionsLoading ? (
          <div className="mt-3 text-sm text-gray-600">Loading versions…</div>
        ) : versionsError ? (
          <div className="mt-3 text-sm text-red-700">{versionsError}</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Version picker */}
            <div className="lg:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Selected Version</label>
              <select
                value={selectedVersionNo || ''}
                onChange={(e) => setSelectedVersionNo(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {(versions || []).map((v) => (
                  <option key={v.id} value={v.version_number}>
                    {v.version_number}. {v.version_name} {v.is_current ? '(current)' : ''}
                  </option>
                ))}
              </select>

              <div className="mt-3 text-xs text-gray-600">
                {selectedVersion ? (
                  <>
                    <div>
                      Type: <span className="font-semibold">{selectedVersion.version_type}</span>
                    </div>
                    <div>
                      Weight: <span className="font-semibold">{selectedVersion.weight_mode}</span> • α cost:{' '}
                      <span className="font-semibold">{Number(selectedVersion.alpha_cost ?? 0.7).toFixed(2)}</span>
                    </div>
                    <div>
                      Updated:{' '}
                      <span className="font-semibold">
                        {selectedVersion.weight_updated_at ? String(selectedVersion.weight_updated_at).slice(0, 19) : '-'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div>No version selected.</div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  disabled={!selectedVersionNo || !canEdit}
                  className="px-3 py-2 text-xs rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Import CSV
                </button>
              </div>
            </div>

            {/* Version editor */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Version Name</label>
                  <input
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    disabled={!canEdit}
                    className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                    placeholder="e.g., Baseline Programme"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Version Type</label>
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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Weight Mode</label>
                  <select
                    value={weightMode}
                    onChange={(e) => setWeightMode(e.target.value)}
                    disabled={!canEdit}
                    className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  >
                    <option value="hybrid">Hybrid (duration + BOQ cost)</option>
                    <option value="duration">Duration only</option>
                    <option value="boq">BOQ cost only</option>
                  </select>
                  <div className="text-[11px] text-gray-500 mt-1">
                    This config affects the weight (leaf_weight) used in roll-up.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">α Cost (0–1)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={alphaCost}
                    onChange={(e) => setAlphaCost(e.target.value)}
                    disabled={!canEdit || weightMode !== 'hybrid'}
                    className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    Hybrid weight = α·(cost weight) + (1-α)·(duration weight)
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={versionDesc}
                    onChange={(e) => setVersionDesc(e.target.value)}
                    disabled={!canEdit}
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-[64px] disabled:bg-gray-50"
                    placeholder="Optional notes for this programme version…"
                  />
                </div>
              </div>

              {saveVersionError ? <div className="mt-2 text-sm text-red-700">{saveVersionError}</div> : null}

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  After saving, weights + roll-up will refresh and planned/SV will re-calc.
                </div>
                <button
                  type="button"
                  onClick={onSaveVersion}
                  disabled={!canEdit || !selectedVersionNo || savingVersion}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingVersion ? 'Saving…' : 'Save Version'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Work Programme Table */}
      <div className="p-4 bg-white rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-semibold">Work Programme</div>
            <div className="text-xs text-gray-600">
              Planned % is calculated from planned dates and the “As-of date”. Actual % comes from diary/BOQ roll-up.
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">As-of date</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Filter</label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="ALL">All (Actual%)</option>
                <option value="NOT_STARTED">Not Started (Actual = 0)</option>
                <option value="IN_PROGRESS">In Progress (0 &lt; Actual &lt; 100)</option>
                <option value="COMPLETED">Completed (Actual = 100)</option>
                <option value="CRITICAL_ONLY">Critical only (SV = Critical)</option>
                <option value="HIDE_COMPLETED">Hide completed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="WBS / Description…"
                className="border rounded-lg px-3 py-2 text-sm w-56"
              />
            </div>

            <button
              type="button"
              onClick={() => onCreateItem(null)}
              disabled={!canEdit || !selectedVersionNo}
              className="px-3 py-2 text-xs rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              + Add Root Item
            </button>
          </div>
        </div>

        <div className="mt-4">
          {itemsLoading ? (
            <div className="text-sm text-gray-600">Loading programme…</div>
          ) : itemsError ? (
            <div className="text-sm text-red-700">{itemsError}</div>
          ) : !selectedVersionNo ? (
            <div className="text-sm text-gray-600">Select a programme version to view items.</div>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <table className="min-w-[1100px] w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-xs font-semibold text-gray-700">
                    <th className="px-4 py-3 w-[420px]">WBS / Activity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">SV</th>
                    <th className="px-4 py-3">Planned dates</th>
                    <th className="px-4 py-3">Planned %</th>
                    <th className="px-4 py-3">Weight</th>
                    <th className="px-4 py-3">Actual %</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-600">
                        No programme items. Import CSV or add items manually.
                      </td>
                    </tr>
                  ) : (
                    rows.map((it) => {
                      const hasChildren = Boolean(it.children?.length);
                      const indent = it._level * 18;

                      const vm = varianceMap[it.id] || { planned: 0, actual: 0, sv: 0 };
                      const ap = actualRollupMap[it.id] || {
                        pct: 0,
                        source: 'none',
                        leafWeight: null,
                        rollupWeightTotal: null,
                      };

                      const actualPct = clampPct(vm.actual);
                      const plannedPct = clampPct(vm.planned);
                      const sv = Number(vm.sv || 0);
                      const sev = svSeverity(sv);

                      const st = actualStatus(actualPct);
                      const weightToShow = hasChildren ? ap.rollupWeightTotal : ap.leafWeight;

                      return (
                        <tr key={it.id} className="text-sm">
                          {/* WBS / Activity */}
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2" style={{ paddingLeft: indent }}>
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(it.id)}
                                  className="mt-0.5 w-5 h-5 rounded border flex items-center justify-center text-xs bg-white hover:bg-gray-50"
                                  title={expandedIds.has(it.id) ? 'Collapse' : 'Expand'}
                                >
                                  {expandedIds.has(it.id) ? '▾' : '▸'}
                                </button>
                              ) : (
                                <span className="w-5" />
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {hasChildren ? '📦' : it.activity_type === 'Milestone' ? '🏁' : '🧱'}
                                  </span>
                                  <span className="font-semibold">{it.wbs_code || '-'}</span>
                                  <span className="truncate">{it.description || '-'}</span>
                                </div>
                                <div className="mt-1 text-[11px] text-gray-500">
                                  {it.activity_type || 'Task'}
                                  {hasChildren ? ` • ${countDescendantLeaves(it)} leaves` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 rounded-md text-xs border bg-white">{st}</span>
                          </td>

                          {/* SV */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-md text-xs border ${svClass(sev)}`}>
                              {svLabel(sev)} {sv.toFixed(2)}%
                            </span>
                          </td>

                          {/* Planned dates */}
                          <td className="px-4 py-3 text-xs text-gray-700">
                            <div>
                              {it.planned_start || '-'} → {it.planned_finish || '-'}
                            </div>
                            <div className="text-[11px] text-gray-500">{Number(it.duration_days || 0)} days</div>
                          </td>

                          {/* Planned % */}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-600 h-2" style={{ width: `${plannedPct}%` }} />
                              </div>
                              <div className="text-xs w-12 text-right">{plannedPct.toFixed(2)}%</div>
                            </div>
                          </td>

                          {/* Weight */}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {weightToShow == null ? (
                              <span className="text-xs text-gray-400">-</span>
                            ) : (
                              <div className="text-xs">
                                <div className="font-semibold text-gray-900">
                                  {Number(weightToShow).toLocaleString()}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {hasChildren ? 'Σ leaf weights' : 'leaf weight'}
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

                          {/* Action */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => onCreateItem(it.id)}
                                disabled={!canEdit}
                                className="px-3 py-1.5 text-xs rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                              >
                                + Child
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteItem(it)}
                                disabled={!canEdit}
                                className="px-3 py-1.5 text-xs rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-600">
          Tip: “Completed” and “In Progress” are based on <b>Actual %</b>.
        </div>
      </div>

      <ImportProgrammeModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        contractId={contractId}
        programmeVersionNumber={selectedVersionNo}
        canEdit={canEdit}
        onImported={async () => {
          await loadItems(selectedVersionNo);
          setWeightRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
