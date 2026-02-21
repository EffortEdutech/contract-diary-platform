// src/components/programme/WorkProgrammePanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  PROGRAMME_VERSION_TYPES,
  getProgrammeVersions,
  getDefaultProgrammeVersionNumber,
  createProgrammeVersion,
  getProgrammeItems,
  createProgrammeItem,
  updateProgrammeItem,
  deleteProgrammeItem,
} from '../../services/programmeService';
import ImportProgrammeModal from '../contracts/ImportProgrammeModal';
import { supabase } from '../../lib/supabase';

// ------------------------------------------------------------
// Tree helpers
// ------------------------------------------------------------
function buildProgrammeTree(items = []) {
  const byId = new Map();
  const roots = [];

  items.forEach((it) => byId.set(it.id, { ...it, children: [] }));

  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
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

    if (hasChildren && expandedIds.has(node.id)) {
      out.push(...flattenVisible(node.children, expandedIds, depth + 1));
    }
  }
  return out;
}

function iconForType(activityType) {
  if (activityType === 'Summary') return '📦';
  if (activityType === 'Milestone') return '🏁';
  return '🧱';
}

function badgeForStatus(status) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold';
  if (status === 'Completed') return `${base} bg-green-100 text-green-800`;
  if (status === 'In Progress') return `${base} bg-blue-100 text-blue-800`;
  return `${base} bg-gray-100 text-gray-700`;
}

function normalizeText(s) {
  return String(s || '').toLowerCase().trim();
}

// Keep parents if any child matches, so tree doesn't break.
function filterTree(nodes, predicate) {
  const out = [];
  for (const n of nodes) {
    const children = n.children?.length ? filterTree(n.children, predicate) : [];
    const selfOk = predicate(n);
    if (selfOk || children.length) out.push({ ...n, children });
  }
  return out;
}

export default function WorkProgrammePanel({
  contractId,
  authority,
  isLocked,
  onChanged,
}) {
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

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [showVersionsPanel, setShowVersionsPanel] = useState(true);
  const [showWbsPanel, setShowWbsPanel] = useState(true);

  // Tree expand/collapse
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const canEdit =
    (authority?.canEditProgramme ?? true) && !authority?.isReadOnly && !isLocked;

  // Search + Filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  // ✅ Actual progress map now stores extra info for GUI proof
  // { [programme_item_id]: { pct, source, leafWeight, rollupWeightTotal } }
  const [actualProgressMap, setActualProgressMap] = useState({});

  // ✅ 3-mode dropdown
  // auto -> v_programme_actual_progress_rollup (default view)
  // boq  -> v_programme_actual_progress_rollup_boq
  // duration -> v_programme_actual_progress_rollup_duration
  const [weightMode, setWeightMode] = useState('auto');

  // ------------------------------------------------------------
  // Load versions and pick default
  // ------------------------------------------------------------
  const loadVersionsAndPick = async () => {
    if (!contractId) return;

    setLoading(true);
    setError(null);

    try {
      const v = await getProgrammeVersions(contractId);
      setVersions(v || []);

      let pick = selectedVersionNo;

      if (!pick) {
        if ((v || []).length > 0) pick = v[0]?.version_number ?? null;
        else pick = await getDefaultProgrammeVersionNumber(contractId);
      }

      setSelectedVersionNo(pick);
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to load programme versions');
      setSelectedVersionNo(null);
      setVersions([]);
    } finally {
      setLoading(false);
    }
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

      // auto-expand any parent and Summary nodes
      const parentIds = new Set();
      const summaryIds = new Set(
        (list || []).filter((it) => it.activity_type === 'Summary').map((it) => it.id)
      );

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

  // ------------------------------------------------------------
  // Load Actual Progress from Roll-up Views (with weights)
  // ------------------------------------------------------------
  useEffect(() => {
    const loadActual = async () => {
      if (!contractId || !selectedVersionNo) return;

      const viewName =
        weightMode === 'duration'
          ? 'v_programme_actual_progress_rollup_duration'
          : weightMode === 'boq'
          ? 'v_programme_actual_progress_rollup_boq'
          : 'v_programme_actual_progress_rollup'; // auto

      try {
        const { data, error } = await supabase
          .from(viewName)
          .select(
            'programme_item_id, actual_percent_to_date, actual_source, leaf_weight, rollup_weight_total, programme_version'
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
          };
        });

        setActualProgressMap(map);
      } catch (err) {
        console.error('Error loading actual progress:', err);
        setActualProgressMap({});
      }
    };

    loadActual();
  }, [contractId, selectedVersionNo, weightMode]);

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

  const onQuickUpdatePercent = async (item, nextPct) => {
    try {
      await updateProgrammeItem(item.id, {
        percent_complete: nextPct,
        status: nextPct >= 100 ? 'Completed' : nextPct > 0 ? 'In Progress' : 'Not Started',
      });
      await loadItems(selectedVersionNo);
    } catch (e) {
      alert(e?.message || 'Failed to update progress');
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

  // ------------------------------------------------------------
  // Tree view: compute visible rows
  // ------------------------------------------------------------
  const tree = useMemo(() => buildProgrammeTree(items), [items]);

  const filteredTree = useMemo(() => {
    const q = normalizeText(query);

    const predicate = (it) => {
      const hay = `${it.wbs_code || ''} ${it.description || ''}`.toLowerCase();
      if (q && !hay.includes(q)) return false;

      if (statusFilter !== 'ALL' && (it.status || '') !== statusFilter) return false;

      if (criticalOnly && !it.is_critical) return false;

      if (hideCompleted && (it.status || '') === 'Completed') return false;

      return true;
    };

    return filterTree(tree, predicate);
  }, [tree, query, statusFilter, criticalOnly, hideCompleted]);

  const visibleRows = useMemo(
    () => flattenVisible(filteredTree, expandedIds),
    [filteredTree, expandedIds]
  );

  // When filtering/searching, expand all parents in filtered tree for clarity
  useEffect(() => {
    if (!query && statusFilter === 'ALL' && !criticalOnly && !hideCompleted) return;
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
  }, [query, statusFilter, criticalOnly, hideCompleted]);

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
                      If versions are empty but activities exist, we still show activities by version number.
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
                          placeholder="e.g. Master Programme (Rev 0)"
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

                        {!canEdit && (
                          <div className="text-xs text-gray-500">
                            Editing disabled (read-only / locked / no permission).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===================================================== */}
          {/* Activities / WBS (collapsible, full width) */}
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
                <div className="overflow-x-auto">
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

                        {!selectedVersionNo && (
                          <div className="mt-2 text-xs text-amber-700">
                            No programme version yet. Click “Import CSV” to auto-create v1 Baseline.
                          </div>
                        )}

                        {/* Search + Filters */}
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
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="rounded-md border-gray-300 text-sm"
                            >
                              <option value="ALL">All Status</option>
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={criticalOnly}
                                onChange={(e) => setCriticalOnly(e.target.checked)}
                              />
                              Critical only
                            </label>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={hideCompleted}
                                onChange={(e) => setHideCompleted(e.target.checked)}
                              />
                              Hide completed
                            </label>

                            {/* ✅ NEW: Weight mode dropdown */}
                            <select
                              value={weightMode}
                              onChange={(e) => setWeightMode(e.target.value)}
                              className="rounded-md border-gray-300 text-sm"
                              title="Choose which roll-up weighting is used for parent actual progress"
                            >
                              <option value="auto">Roll-up Weight: Auto (Default)</option>
                              <option value="boq">Roll-up Weight: BOQ Value</option>
                              <option value="duration">Roll-up Weight: Duration (days)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                setQuery('');
                                setStatusFilter('ALL');
                                setCriticalOnly(false);
                                setHideCompleted(false);
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
                                  No activities yet. Add your first WBS item or import CSV.
                                </td>
                              </tr>
                            ) : (
                              visibleRows.map(({ node: it, depth, hasChildren }) => {
                                const ap = actualProgressMap[it.id] || {
                                  pct: 0,
                                  source: 'none',
                                  leafWeight: null,
                                  rollupWeightTotal: null,
                                };

                                const pct = Number(ap.pct || 0);
                                const weightToShow =
                                  ap.source === 'rollup' ? ap.rollupWeightTotal : ap.leafWeight;

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

                                        {it.is_critical && (
                                          <span className="ml-1 text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-800">
                                            Critical
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-800">
                                      {it.description}
                                      <div className="mt-1 flex items-center gap-2">
                                        <span className={badgeForStatus(it.status)}>{it.status || 'Not Started'}</span>
                                        <span className="text-xs text-gray-500">{it.activity_type}</span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-700">
                                      <div className="text-xs">
                                        {it.planned_start} → {it.planned_finish}
                                      </div>
                                      <div className="text-xs text-gray-500">{it.duration_days ?? '-'} days</div>
                                    </td>

                                    {/* Planned % (manual for now) */}
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                                          <div
                                            className="bg-blue-600 h-2"
                                            style={{ width: `${Number(it.percent_complete || 0)}%` }}
                                          />
                                        </div>
                                        <div className="text-xs w-10 text-right">
                                          {Number(it.percent_complete || 0)}%
                                        </div>
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

                                    {/* ✅ Weight column */}
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                      {weightToShow == null ? (
                                        <span className="text-xs text-gray-400">-</span>
                                      ) : (
                                        <div className="text-xs">
                                          <div className="font-semibold text-gray-900">
                                            {Number(weightToShow).toLocaleString()}
                                          </div>
                                          <div className="text-[11px] text-gray-500">
                                            {ap.source === 'rollup' ? 'Σ leaf weights' : 'leaf weight'}
                                          </div>
                                        </div>
                                      )}
                                    </td>

                                    {/* ✅ Actual column */}
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                                          <div
                                            className="bg-green-600 h-2"
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <div className="text-xs w-10 text-right">{pct.toFixed(2)}%</div>
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
                    </div>

                    <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-600">
                      Next: Planned % engine (date-based) + variance (planned vs actual).
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ImportProgrammeModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        contractId={contractId}
        programmeVersionNumber={selectedVersionNo}
        canEdit={canEdit}
        onImported={() => loadItems(selectedVersionNo)}
      />
    </div>
  );
}
