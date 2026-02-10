import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  validateEvidence,
  isEvidenceArrayChanged,
  toNumberOrNull,
  computeBoqBasisPercent,
} from '../../lib/ledger/progressCalculators';

/**
 * WorkLedgerLinkModal (Multi-BOQ evidence per ONE Work Activity)
 * Sprint 2A:
 * - Show BOQ basis % (today) from qty/%.
 * - Show mapped programme (read-only) + Allocation % inputs + preview delta today.
 * - No DB writes here. Returned to DiaryFormOffline as part of evidences array.
 *
 * Scroll fix:
 * - Overlay scrollable
 * - Modal max height
 * - Body scrollable
 */
export default function WorkLedgerLinkModal({
  isOpen,
  onClose,
  contractId,
  boqItems = [],
  initialEvidences = [],
  onSave,
}) {
  const [boqQuery, setBoqQuery] = useState('');
  const [expandedBoqId, setExpandedBoqId] = useState(null);

  // Editable evidences stored as map by boq_item_id
  // evidence shape:
  // {
  //   boq_item_id, boq_item_label, unit,
  //   executed_qty, executed_pct, location, work_description,
  //   programme_allocations_map: { [programme_item_id]: number|string }
  // }
  const [evidenceMap, setEvidenceMap] = useState({});

  // Programme (derived) for currently expanded BOQ
  const [loadingProgramme, setLoadingProgramme] = useState(false);
  const [mappedProgrammeItems, setMappedProgrammeItems] = useState([]);
  const [programmeError, setProgrammeError] = useState(null);

  const [toast, setToast] = useState(null); // {type,text}
  const showToast = (type, text) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2200);
  };

  // Build initial map when opened
  useEffect(() => {
    if (!isOpen) return;

    const init = {};
    (initialEvidences || []).forEach((e) => {
      if (!e?.boq_item_id) return;
      init[e.boq_item_id] = {
        boq_item_id: e.boq_item_id,
        boq_item_label: e.boq_item_label || '',
        unit: e.unit || '',
        executed_qty: e.executed_qty ?? null,
        executed_pct: e.executed_pct ?? null,
        location: e.location || '',
        work_description: e.work_description || '',
        programme_allocations_map: e.programme_allocations_map || {}, // sprint 2A
      };
    });

    setEvidenceMap(init);
    setExpandedBoqId(null);
    setBoqQuery('');
    setMappedProgrammeItems([]);
    setProgrammeError(null);
    setToast(null);
  }, [isOpen, initialEvidences]);

  const boqLabel = (b) => {
    const left = b.item_number ? `${b.item_number} — ` : '';
    return `${left}${b.description || '(no description)'}`;
  };

  const boqFiltered = useMemo(() => {
    const q = boqQuery.trim().toLowerCase();
    if (!q) return boqItems;
    return boqItems.filter((b) =>
      (`${b.item_number || ''} ${b.description || ''}`).toLowerCase().includes(q)
    );
  }, [boqItems, boqQuery]);

  const selectedIds = useMemo(() => Object.keys(evidenceMap || {}), [evidenceMap]);

  const currentEvidencesArray = useMemo(() => {
    return selectedIds.map((id) => evidenceMap[id]).filter(Boolean);
  }, [selectedIds, evidenceMap]);

  const isDirty = useMemo(() => {
    return isEvidenceArrayChanged(initialEvidences || [], currentEvidencesArray);
  }, [initialEvidences, currentEvidencesArray]);

  // Load mapped programmes for currently expanded BOQ (read-only mapping)
  useEffect(() => {
    const load = async () => {
      if (!isOpen) return;
      if (!contractId || !expandedBoqId) {
        setMappedProgrammeItems([]);
        setProgrammeError(null);
        return;
      }

      setLoadingProgramme(true);
      setProgrammeError(null);

      try {
        const { data: links, error: linkErr } = await supabase
          .from('programme_boq_links')
          .select('programme_item_id')
          .eq('contract_id', contractId)
          .eq('boq_item_id', expandedBoqId);

        if (linkErr) throw linkErr;

        const ids = (links || []).map((r) => r.programme_item_id).filter(Boolean);
        if (!ids.length) {
          setMappedProgrammeItems([]);
          return;
        }

        const { data: progs, error: progErr } = await supabase
          .from('programme_items')
          .select('id, wbs_code, description, activity_type, planned_start, planned_finish')
          .eq('contract_id', contractId)
          .in('id', ids)
          .order('wbs_code', { ascending: true });

        if (progErr) throw progErr;

        setMappedProgrammeItems(progs || []);
      } catch (e) {
        console.error('WorkLedgerLinkModal: load mapped programme failed:', e);
        setMappedProgrammeItems([]);
        setProgrammeError(e?.message || 'Failed to load mapped programme');
      } finally {
        setLoadingProgramme(false);
      }
    };

    load();
  }, [isOpen, contractId, expandedBoqId]);

  const toggleSelect = (boq) => {
    setEvidenceMap((prev) => {
      const next = { ...(prev || {}) };
      const exists = !!next[boq.id];

      if (exists) {
        delete next[boq.id];
        if (expandedBoqId === boq.id) setExpandedBoqId(null);
      } else {
        next[boq.id] = {
          boq_item_id: boq.id,
          boq_item_label: boqLabel(boq),
          unit: boq.unit || '',
          executed_qty: null,
          executed_pct: null,
          location: '',
          work_description: '',
          programme_allocations_map: {},
        };
      }
      return next;
    });
  };

  const setEvidenceField = (boqId, field, value) => {
    setEvidenceMap((prev) => {
      const next = { ...(prev || {}) };
      const e = next[boqId];
      if (!e) return prev;

      if (field === 'executed_qty' || field === 'executed_pct') {
        next[boqId] = { ...e, [field]: value === '' ? null : value };
      } else {
        next[boqId] = { ...e, [field]: value };
      }
      return next;
    });
  };

  const setAllocation = (boqId, programmeId, value) => {
    setEvidenceMap((prev) => {
      const next = { ...(prev || {}) };
      const e = next[boqId];
      if (!e) return prev;

      const current = e.programme_allocations_map || {};
      const updated = { ...current, [programmeId]: value };

      return {
        ...next,
        [boqId]: { ...e, programme_allocations_map: updated },
      };
    });
  };

  const requestSwitchExpanded = (boqId) => {
    setExpandedBoqId((prev) => (prev === boqId ? null : boqId));
  };

  const handleClose = () => {
    if (isDirty) {
      const ok = window.confirm('Discard changes and close?');
      if (!ok) return;
    }
    onClose?.();
  };

  // Helpers for expanded BOQ
  const expandedBoqRef = useMemo(
    () => boqItems.find((b) => b.id === expandedBoqId) || null,
    [boqItems, expandedBoqId]
  );

  const expandedEvidence = useMemo(
    () => (expandedBoqId ? evidenceMap?.[expandedBoqId] : null),
    [expandedBoqId, evidenceMap]
  );

  const expandedBoqBasisPercent = useMemo(() => {
    if (!expandedBoqId || !expandedEvidence) return null;
    return computeBoqBasisPercent({
      executedQty: expandedEvidence.executed_qty,
      executedPct: expandedEvidence.executed_pct,
      boqContractQty: expandedBoqRef?.quantity ?? null,
    });
  }, [expandedBoqId, expandedEvidence, expandedBoqRef?.quantity]);

  const expandedAllocSum = useMemo(() => {
    if (!expandedEvidence?.programme_allocations_map) return 0;
    let sum = 0;
    for (const v of Object.values(expandedEvidence.programme_allocations_map)) {
      if (v === '' || v == null) continue;
      const n = Number(v);
      if (Number.isFinite(n)) sum += n;
    }
    return sum;
  }, [expandedEvidence]);

  const handleSave = () => {
    // Validate evidence for each selected BOQ (qty or %)
    for (const e of currentEvidencesArray) {
      const res = validateEvidence({ executedQty: e.executed_qty, executedPct: e.executed_pct });
      if (!res.ok) {
        showToast('error', `BOQ "${e.boq_item_label}": ${res.message}`);
        return;
      }
    }

    // Validate allocation only for the currently expanded BOQ (Sprint 2A preview)
    // Rule: if user starts allocating, allocation must total 100%.
    if (expandedBoqId && expandedEvidence) {
      const allocMap = expandedEvidence.programme_allocations_map || {};
      const anyAlloc = Object.values(allocMap).some((v) => Number(v) > 0);

      if (anyAlloc) {
        if (expandedBoqBasisPercent == null || !Number.isFinite(Number(expandedBoqBasisPercent))) {
          showToast(
            'error',
            'Allocation requires BOQ basis %. Provide Executed % OR ensure BOQ contract qty exists for qty→% conversion.'
          );
          return;
        }
        if (Math.abs(expandedAllocSum - 100) > 0.01) {
          showToast('error', `Allocation must total 100%. Current: ${expandedAllocSum.toFixed(2)}%`);
          return;
        }
      }
    }

    const output = currentEvidencesArray.map((e) => ({
      ...e,
      executed_qty: toNumberOrNull(e.executed_qty),
      executed_pct: toNumberOrNull(e.executed_pct),
      location: (e.location || '').trim(),
      work_description: (e.work_description || '').trim(),
      programme_allocations_map: e.programme_allocations_map || {},
    }));

    onSave?.(output);
    showToast('success', 'Saved ✅');
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    // Overlay scrollable
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4">
        {/* Modal container */}
        <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b flex-shrink-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Work Ledger Link</h3>
              <p className="text-sm text-gray-600 mt-1">
                Select BOQ items, expand to add evidence (Qty/%). Sprint 2A shows programme impact preview using allocations.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 overflow-y-auto">
            {toast && (
              <div
                className={`mb-4 text-sm rounded-lg p-3 border ${
                  toast.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : toast.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                {toast.text}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mb-3">
              <input
                value={boqQuery}
                onChange={(e) => setBoqQuery(e.target.value)}
                placeholder="Search BOQ item number / description..."
                className="flex-1 px-3 py-2 border rounded-lg"
              />

              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || currentEvidencesArray.length === 0}
                className={`px-4 py-2 rounded-lg text-white ${
                  !isDirty || currentEvidencesArray.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                title={
                  currentEvidencesArray.length === 0
                    ? 'Select at least one BOQ'
                    : !isDirty
                    ? 'No changes to save'
                    : 'Save links'
                }
              >
                Save Link
              </button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <ul className="divide-y">
                {boqFiltered.map((b) => {
                  const selected = !!evidenceMap?.[b.id];
                  const expanded = expandedBoqId === b.id;

                  return (
                    <li key={b.id} className="p-3 hover:bg-gray-50">
                      {/* Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(b)}
                            className="mt-1"
                          />

                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{boqLabel(b)}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Unit: {b.unit || '-'} | BOQ Qty: {b.quantity ?? '-'} | Rate: {b.unit_rate ?? '-'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!selected}
                          onClick={() => requestSwitchExpanded(b.id)}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            selected
                              ? 'border text-gray-700 hover:bg-gray-100'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          title={selected ? 'Expand' : 'Select this BOQ first'}
                        >
                          {expanded ? '▼' : '▶'}
                        </button>
                      </div>

                      {/* Expanded */}
                      {expanded && selected && (
                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3 border-t pt-3">
                          {/* BOQ DIV */}
                          <div className="border rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-gray-900">
                                Evidence for claim / progress
                              </div>
                              <div className="text-xs text-gray-600">
                                BOQ basis % (today):{' '}
                                <span className="font-semibold">
                                  {expandedBoqBasisPercent == null ? '—' : `${expandedBoqBasisPercent.toFixed(2)}%`}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Executed Qty (preferred)
                                </label>
                                <input
                                  value={evidenceMap[b.id]?.executed_qty ?? ''}
                                  onChange={(e) => setEvidenceField(b.id, 'executed_qty', e.target.value)}
                                  placeholder="e.g. 20"
                                  className="w-full px-3 py-2 border rounded-lg"
                                  inputMode="decimal"
                                />
                                <div className="text-xs text-gray-500 mt-1">Unit: {b.unit || '-'}</div>
                              </div>

                              <div>
                                <label className="block text-xs text-gray-600 mb-1">
                                  Executed % (allowed)
                                </label>
                                <input
                                  value={evidenceMap[b.id]?.executed_pct ?? ''}
                                  onChange={(e) => setEvidenceField(b.id, 'executed_pct', e.target.value)}
                                  placeholder="0 - 100"
                                  className="w-full px-3 py-2 border rounded-lg"
                                  inputMode="numeric"
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                  Use when quantity is hard to measure.
                                </div>
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">Location</label>
                                <input
                                  value={evidenceMap[b.id]?.location ?? ''}
                                  onChange={(e) => setEvidenceField(b.id, 'location', e.target.value)}
                                  placeholder="e.g. Zone A / Gridline 1-5"
                                  className="w-full px-3 py-2 border rounded-lg"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">
                                  Work description (evidence notes)
                                </label>
                                <textarea
                                  value={evidenceMap[b.id]?.work_description ?? ''}
                                  onChange={(e) => setEvidenceField(b.id, 'work_description', e.target.value)}
                                  placeholder="What was done, method, drawing reference, instruction, etc."
                                  className="w-full px-3 py-2 border rounded-lg min-h-[90px]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* PROGRAM DIV - Sprint 2A Impact Preview */}
                          <div className="border rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-gray-900">
                                Mapped programme (impact preview)
                              </div>
                              {loadingProgramme && <div className="text-xs text-gray-500">Loading…</div>}
                            </div>

                            <div className="text-xs text-gray-500 mt-1">
                              Mapping is read-only here. Allocation will be saved as programme progress when you <b>Save Diary</b> (Sprint 2B).
                            </div>

                            {programmeError && (
                              <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                                {programmeError}
                              </div>
                            )}

                            {!loadingProgramme && mappedProgrammeItems.length === 0 && (
                              <div className="mt-3 text-sm text-gray-600 bg-gray-50 border rounded p-3">
                                No mapped programme for this BOQ yet.
                              </div>
                            )}

                            {mappedProgrammeItems.length > 0 && (
                              <>
                                <div className="mt-3 flex items-center justify-between text-xs text-gray-700">
                                  <div>
                                    Allocation total:{' '}
                                    <span className="font-semibold">{expandedAllocSum.toFixed(2)}%</span>
                                    <span className="text-gray-500"> (target 100% if allocating)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // reset allocations for this BOQ only
                                      setEvidenceMap((prev) => {
                                        const next = { ...(prev || {}) };
                                        const e = next[b.id];
                                        if (!e) return prev;
                                        next[b.id] = { ...e, programme_allocations_map: {} };
                                        return next;
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                                  >
                                    Reset
                                  </button>
                                </div>

                                {expandedBoqBasisPercent == null && (
                                  <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                                    To preview programme impact, provide Executed % or ensure BOQ Qty exists so Qty→% can be computed.
                                  </div>
                                )}

                                <ul className="mt-3 space-y-2">
                                  {mappedProgrammeItems.map((p) => {
                                    const allocRaw = expandedEvidence?.programme_allocations_map?.[p.id] ?? '';
                                    const allocNum = allocRaw === '' || allocRaw == null ? 0 : Number(allocRaw);
                                    const boqBasis = expandedBoqBasisPercent == null ? null : Number(expandedBoqBasisPercent);
                                    const delta =
                                      boqBasis == null || !Number.isFinite(allocNum)
                                        ? null
                                        : (boqBasis * (Number.isFinite(allocNum) ? allocNum : 0)) / 100;

                                    return (
                                      <li key={p.id} className="border rounded p-2">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                              {(p.wbs_code ? `${p.wbs_code} — ` : '')}{p.description}
                                            </div>
                                            <div className="text-xs text-gray-600 mt-1">
                                              {(p.activity_type || 'Task')} • {(p.planned_start || '—')} → {(p.planned_finish || '—')}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                              Preview delta today: <b>{delta == null ? '—' : `+${delta.toFixed(2)}%`}</b>
                                            </div>
                                          </div>

                                          <div className="w-[130px]">
                                            <label className="block text-xs text-gray-600 mb-1">
                                              Allocation %
                                            </label>
                                            <input
                                              value={allocRaw}
                                              onChange={(e) => setAllocation(b.id, p.id, e.target.value)}
                                              placeholder="0-100"
                                              className="w-full px-3 py-2 border rounded-lg"
                                              inputMode="numeric"
                                            />
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>

                                {/* small guidance */}
                                <div className="mt-3 text-xs text-gray-500">
                                  If you start allocating, ensure the total equals <b>100%</b> (for this BOQ).
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Tip: Select multiple BOQ items and fill evidence for each before saving.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
