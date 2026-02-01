// src/components/contracts/WorkProgrammeModal.jsx
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
import ImportProgrammeModal from './ImportProgrammeModal';

// ------------------------------------------------------------
// Simple modal shell (same look as your other modals)
// ------------------------------------------------------------
// Simple modal shell (scrollable)
const ModalShell = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* Panel: limit height and enable internal scroll */}
      <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header stays fixed */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="text-base font-semibold text-gray-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg border bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {/* Body scrolls */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

const pctNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const WorkProgrammeModal = ({ isOpen, onClose, contractId, authority, isLocked }) => {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [selectedVersionNo, setSelectedVersionNo] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  // Create version form
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionType, setNewVersionType] = useState(PROGRAMME_VERSION_TYPES.BASELINE);

  // Create activity form (minimal)
  const [newWbs, setNewWbs] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newFinish, setNewFinish] = useState('');
  const [newDuration, setNewDuration] = useState(1);

  const [importOpen, setImportOpen] = useState(false);

  // const canEdit = !!authority?.canEditProgramme && !authority?.isReadOnly && !isLocked;
  const canEdit =
    (authority?.canEditProgramme ?? true) && !authority?.isReadOnly && !isLocked;

  // ------------------------------------------------------------
  // Load versions + select default version
  // - Supports your current reality: programme_items already exist
  //   even if programme_versions table is empty.
  // ------------------------------------------------------------
  const loadVersionsAndPick = async () => {
    if (!contractId) return;

    setLoading(true);
    setError(null);

    try {
      // May be empty even though programme_items exists
      const v = await getProgrammeVersions(contractId);
      setVersions(v || []);

      // Choose:
      // 1) keep current selection if still valid
      // 2) if versions exist -> default to first version_number
      // 3) else -> infer from programme_items (max/current) using helper
      let pick = selectedVersionNo;

      if (!pick) {
        if ((v || []).length > 0) {
          pick = v[0]?.version_number ?? null;
        } else {
          pick = await getDefaultProgrammeVersionNumber(contractId);
        }
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
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to load programme items');
      setItems([]);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadVersionsAndPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedVersionNo) return;
    loadItems(selectedVersionNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedVersionNo]);

  const selectedVersion = useMemo(() => {
    return versions.find((v) => v.version_number === selectedVersionNo) || null;
  }, [versions, selectedVersionNo]);

  const onCreateVersion = async () => {
    try {
      if (!newVersionName.trim()) throw new Error('Please enter version name');

      const created = await createProgrammeVersion({
        contractId,
        versionName: newVersionName.trim(),
        versionType: newVersionType,
        setAsCurrent: true, // nice default
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
      alert(e?.message || 'Failed to add activity');
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

    const ensureVersion = async () => {
    // If already selected, nothing to do
    if (selectedVersionNo) return selectedVersionNo;

    // If versions exist but not selected, pick first
    if (versions?.length) {
        const pick = versions[0].version_number;
        setSelectedVersionNo(pick);
        return pick;
    }

    // No versions exist → create v1 Baseline
    const created = await createProgrammeVersion({
        contractId,
        versionName: 'Master Programme (Rev 0)',
        versionType: PROGRAMME_VERSION_TYPES.BASELINE,
        description: 'Auto-created for first programme import',
    });

    // Refresh local state
    const v = await getProgrammeVersions(contractId);
    setVersions(v);
    setSelectedVersionNo(created.version_number);
    return created.version_number;
    };


  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="📅 Work Programme (Planning & Scheduling)">
      {loading ? (
        <div className="animate-pulse bg-gray-100 rounded-lg h-24" />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-red-900">Programme load failed</div>
          <div className="text-xs text-red-800 mt-1">{error}</div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Versions */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <div className="text-sm font-semibold text-gray-900">Programme Versions</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  If versions are empty but activities exist, we still show activities by version number.
                </div>
              </div>

              <div className="p-4 space-y-3">
                <label className="text-xs font-medium text-gray-700">Select Version Number</label>

                {/* If programme_versions exists, show rich options; otherwise show a simple numeric selector */}
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

          {/* Right: Items */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white border rounded-lg overflow-hidden">

                <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <div>
                    <div className="text-sm font-semibold text-gray-900">Activities (WBS)</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                    {selectedVersion
                        ? `Selected: v${selectedVersion.version_number} • ${selectedVersion.version_type} • ${selectedVersion.version_name}`
                        : 'Select a version to view activities.'}
                    </div>
                    {!selectedVersionNo && (
                    <div className="mt-2 text-xs text-amber-700">
                        No programme version yet. Click “Import CSV” to auto-create v1 Baseline.
                    </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
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
                {/* Table */}
                <div className="p-0">
                {/* Scroll container for table */}
                <div className="max-h-[60vh] overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white sticky top-0 z-10">
                        <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">WBS</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Planned</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">%</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-6 text-sm text-gray-600">
                            No activities yet. Add your first WBS item.
                            </td>
                        </tr>
                        ) : (
                        items.map((it) => (
                            <tr key={it.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {it.wbs_code}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-800">
                                {it.description}
                                <div className="text-xs text-gray-500 mt-0.5">
                                {it.status} • {it.activity_type}
                                </div>
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="text-xs">
                                {it.planned_start} → {it.planned_finish}
                                </div>
                                <div className="text-xs text-gray-500">
                                {it.duration_days} days
                                </div>
                            </td>

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
                                    {[0, 25, 50, 75, 100].map((pct) => (
                                    <button
                                        key={pct}
                                        type="button"
                                        onClick={() => onQuickUpdatePercent(it, pct)}
                                        className="px-2 py-1 text-[11px] rounded border bg-white hover:bg-gray-50"
                                    >
                                        {pct}%
                                    </button>
                                    ))}
                                </div>
                                )}
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
                        ))
                        )}
                    </tbody>
                    </table>
                </div>
                </div>


              <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-600">
                Next: link diary progress + BOQ measurement to programme items (linked_boq_item_id).
              </div>
            </div>
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


    </ModalShell>
  );
};


export default WorkProgrammeModal;
