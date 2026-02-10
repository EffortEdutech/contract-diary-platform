import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  validateEvidence,
  isEvidenceArrayChanged,
  toNumberOrNull,
} from '../../lib/ledger/progressCalculators';

/**
 * WorkLedgerLinkModal (Multiple BOQ evidences per ONE Work Activity)
 *
 * - User can select multiple BOQ items (checkbox)
 * - Each selected row can be expanded to enter evidence (Qty/%/Location/Notes)
 * - Programme mapping is shown (read-only, derived) for the currently expanded BOQ row
 * - Save disabled if no changes
 *
 * Props:
 * - isOpen, onClose
 * - contractId
 * - boqItems
 * - initialEvidences: Array<{boq_item_id, boq_item_label, unit, executed_qty, executed_pct, location, work_description}>
 * - onSave: (evidencesArray) => void
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
  const [evidenceMap, setEvidenceMap] = useState({}); // { [boqId]: evidenceObj }

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
    return boqItems.filter((b) => (`${b.item_number || ''} ${b.description || ''}`).toLowerCase().includes(q));
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

        const ids = (links || []).map(r => r.programme_item_id).filter(Boolean);
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
        // if we unselect the expanded row, collapse
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

      // Normalize numeric fields to null if blank
      if (field === 'executed_qty' || field === 'executed_pct') {
        next[boqId] = { ...e, [field]: value === '' ? null : value };
      } else {
        next[boqId] = { ...e, [field]: value };
      }
      return next;
    });
  };

  const requestSwitchExpanded = (boqId) => {
    // if switching expand target while dirty, warn
    if (expandedBoqId && expandedBoqId !== boqId && isDirty) {
      const ok = window.confirm('You have unsaved changes. Switch BOQ anyway? (Unsaved changes will remain until you Save or Close)');
      if (!ok) return;
    }
    setExpandedBoqId((prev) => (prev === boqId ? null : boqId));
  };

  const handleClose = () => {
    if (isDirty) {
      const ok = window.confirm('Discard changes and close?');
      if (!ok) return;
    }
    onClose?.();
  };

  const handleSave = () => {
    // Validate each selected evidence (must have qty or %)
    for (const e of currentEvidencesArray) {
      const res = validateEvidence({ executedQty: e.executed_qty, executedPct: e.executed_pct });
      if (!res.ok) {
        showToast('error', `BOQ "${e.boq_item_label}": ${res.message}`);
        return;
      }
    }

    // Normalize numbers
    const output = currentEvidencesArray.map((e) => ({
      ...e,
      executed_qty: toNumberOrNull(e.executed_qty),
      executed_pct: toNumberOrNull(e.executed_pct),
      location: (e.location || '').trim(),
      work_description: (e.work_description || '').trim(),
    }));

    onSave?.(output);
    showToast('success', 'Saved ✅');
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-6xl mx-4 bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Work Ledger Link</h3>
            <p className="text-sm text-gray-600 mt-1">
              Select one or more BOQ items, expand to add evidence (Qty/%). Programme list is derived (read-only) for the expanded BOQ.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
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
                    {/* Row header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(b)}
                          className="mt-1"
                        />

                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {boqLabel(b)}
                          </div>
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
                          selected ? 'border text-gray-700 hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        title={selected ? 'Expand evidence' : 'Select this BOQ first'}
                      >
                        {expanded ? '▼' : '▶'}
                      </button>
                    </div>

                    {/* Expanded panel */}
                    {expanded && selected && (
                      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3 border-t pt-3">
                        {/* BOQ DIV */}
                        <div className="border rounded-lg p-3 bg-white">
                          <div className="text-sm font-semibold text-gray-900 mb-2">
                            Evidence for claim / progress
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Executed Qty (preferred)</label>
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
                              <label className="block text-xs text-gray-600 mb-1">Executed % (allowed)</label>
                              <input
                                value={evidenceMap[b.id]?.executed_pct ?? ''}
                                onChange={(e) => setEvidenceField(b.id, 'executed_pct', e.target.value)}
                                placeholder="0 - 100"
                                className="w-full px-3 py-2 border rounded-lg"
                                inputMode="numeric"
                              />
                              <div className="text-xs text-gray-500 mt-1">Use when quantity is hard to measure.</div>
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
                              <label className="block text-xs text-gray-600 mb-1">Work description (evidence notes)</label>
                              <textarea
                                value={evidenceMap[b.id]?.work_description ?? ''}
                                onChange={(e) => setEvidenceField(b.id, 'work_description', e.target.value)}
                                placeholder="What was done, method, drawing reference, instruction, etc."
                                className="w-full px-3 py-2 border rounded-lg min-h-[90px]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* PROGRAM DIV (Sprint 2 placeholder) */}
                        <div className="border rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-gray-900">Mapped programme (Sprint 2)</div>
                            {loadingProgramme && <div className="text-xs text-gray-500">Loading…</div>}
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            Mapping is read-only here. If none shows, map in BOQ↔Programme module.
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
                            <ul className="mt-3 space-y-2">
                              {mappedProgrammeItems.map((p) => (
                                <li key={p.id} className="border rounded p-2">
                                  <div className="text-sm font-medium text-gray-900">
                                    {(p.wbs_code ? `${p.wbs_code} — ` : '')}{p.description}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {(p.activity_type || 'Task')} • {(p.planned_start || '—')} → {(p.planned_finish || '—')}
                                  </div>
                                </li>
                              ))}
                            </ul>
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
            Tip: You can select multiple BOQ items and fill evidence for each before saving.
          </div>
        </div>
      </div>
    </div>
  );
}
