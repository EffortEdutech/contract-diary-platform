import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * WorkLedgerLinkModal (Sprint 1)
 * Objective:
 * - Link Work Activity → BOQ for claim evidence
 * - Show programme mapped to BOQ (read-only, derived from programme_boq_links)
 * - Capture progress evidence: Qty (preferred) OR % (allowed) + location + work desc
 *
 * Props:
 * - isOpen, onClose
 * - contractId (required)
 * - boqItems
 * - initialValue (from work activity row)
 * - onSave(payload)
 */
export default function WorkLedgerLinkModal({
  isOpen,
  onClose,
  contractId,
  boqItems = [],
  initialValue = {},
  onSave,
}) {
  const [step, setStep] = useState(1);

  const [boqQuery, setBoqQuery] = useState('');
  const [progQuery, setProgQuery] = useState('');

  const [selectedBoqId, setSelectedBoqId] = useState(initialValue?.boq_item_id || null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState(initialValue?.programme_item_id || null);

  // ✅ Evidence fields (Sprint 1)
  const [executedQty, setExecutedQty] = useState(initialValue?.boq_quantity_completed ?? '');
  const [executedPct, setExecutedPct] = useState(initialValue?.boq_percent_complete ?? '');
  const [workLocation, setWorkLocation] = useState(initialValue?.boq_location ?? '');
  const [workDescription, setWorkDescription] = useState(initialValue?.boq_work_description ?? '');

  const [loadingProgramme, setLoadingProgramme] = useState(false);
  const [mappedProgrammeItems, setMappedProgrammeItems] = useState([]);

  const [toast, setToast] = useState(null); // { type, text }
  const showToast = (type, text) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setBoqQuery('');
    setProgQuery('');
    setSelectedBoqId(initialValue?.boq_item_id || null);
    setSelectedProgrammeId(initialValue?.programme_item_id || null);

    setExecutedQty(initialValue?.boq_quantity_completed ?? '');
    setExecutedPct(initialValue?.boq_percent_complete ?? '');
    setWorkLocation(initialValue?.boq_location ?? '');
    setWorkDescription(initialValue?.boq_work_description ?? '');

    setMappedProgrammeItems([]);
    setToast(null);
  }, [isOpen, initialValue?.boq_item_id, initialValue?.programme_item_id]);

  const selectedBoq = useMemo(
    () => boqItems.find((b) => b.id === selectedBoqId) || null,
    [boqItems, selectedBoqId]
  );

  const selectedProgramme = useMemo(
    () => mappedProgrammeItems.find((p) => p.id === selectedProgrammeId) || null,
    [mappedProgrammeItems, selectedProgrammeId]
  );

  const boqLabel = (b) => {
    const left = b.item_number ? `${b.item_number} — ` : '';
    return `${left}${b.description || '(no description)'}`;
  };

  const programmeLabel = (p) => {
    const left = p.wbs_code ? `${p.wbs_code} — ` : '';
    return `${left}${p.description || '(no description)'}`;
  };

  const boqFiltered = useMemo(() => {
    const q = boqQuery.trim().toLowerCase();
    if (!q) return boqItems;
    return boqItems.filter((b) => (`${b.item_number || ''} ${b.description || ''}`).toLowerCase().includes(q));
  }, [boqItems, boqQuery]);

  // ✅ Load mapped programme (derived, read-only mapping)
  useEffect(() => {
    if (!isOpen) return;
    if (!contractId || !selectedBoqId) {
      setMappedProgrammeItems([]);
      return;
    }

    const loadMappedProgramme = async () => {
      setLoadingProgramme(true);
      try {
        const { data: links, error: linkErr } = await supabase
          .from('programme_boq_links')
          .select('programme_item_id')
          .eq('contract_id', contractId)
          .eq('boq_item_id', selectedBoqId);

        if (linkErr) throw linkErr;

        const ids = (links || []).map((r) => r.programme_item_id).filter(Boolean);
        if (ids.length === 0) {
          setMappedProgrammeItems([]);
          return;
        }

        // IMPORTANT: avoid non-existent columns (start_date/end_date removed)
        const { data: progs, error: progErr } = await supabase
          .from('programme_items')
          .select('id, wbs_code, description, activity_type, planned_start, planned_finish')
          .eq('contract_id', contractId)
          .in('id', ids)
          .order('wbs_code', { ascending: true });

        if (progErr) throw progErr;

        setMappedProgrammeItems(progs || []);
      } catch (e) {
        console.error('Error loading mapped programme:', e);
        setMappedProgrammeItems([]);
        showToast('error', 'Failed to load mapped programme');
      } finally {
        setLoadingProgramme(false);
      }
    };

    loadMappedProgramme();
  }, [isOpen, contractId, selectedBoqId]);

  const programmeFiltered = useMemo(() => {
    const q = progQuery.trim().toLowerCase();
    if (!q) return mappedProgrammeItems;
    return mappedProgrammeItems.filter((p) => (`${p.wbs_code || ''} ${p.description || ''}`).toLowerCase().includes(q));
  }, [mappedProgrammeItems, progQuery]);

  const closeModal = () => onClose?.();

  const clearAll = () => {
    setSelectedBoqId(null);
    setSelectedProgrammeId(null);
    setStep(1);

    setExecutedQty('');
    setExecutedPct('');
    setWorkLocation('');
    setWorkDescription('');

    onSave?.({
      boq_item_id: null,
      boq_item_label: '',
      programme_item_id: null,
      programme_wbs_code: '',
      programme_item_label: '',
      boq_quantity_completed: null,
      boq_percent_complete: null,
      boq_location: '',
      boq_work_description: '',
      boq_unit: '',
    });

    showToast('success', 'Cleared ✅');
  };

  const validateEvidence = () => {
    const qty = executedQty === '' ? null : Number(executedQty);
    const pct = executedPct === '' ? null : Number(executedPct);

    if (!selectedBoqId) return 'Please select a BOQ item.';
    if (qty === null && pct === null) return 'Please enter either Executed Qty or Executed %.';
    if (qty !== null && (!Number.isFinite(qty) || qty <= 0)) return 'Executed Qty must be a number > 0.';
    if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) return 'Executed % must be between 0 and 100.';
    return null;
  };

  const handleSave = () => {
    const err = validateEvidence();
    if (err) {
      showToast('error', err);
      return;
    }

    const qty = executedQty === '' ? null : Number(executedQty);
    const pct = executedPct === '' ? null : Number(executedPct);

    onSave?.({
      boq_item_id: selectedBoqId,
      boq_item_label: selectedBoq ? boqLabel(selectedBoq) : '',
      programme_item_id: selectedProgrammeId || null,
      programme_wbs_code: selectedProgramme?.wbs_code || '',
      programme_item_label: selectedProgramme ? programmeLabel(selectedProgramme) : '',
      boq_quantity_completed: qty,
      boq_percent_complete: pct,
      boq_location: workLocation || '',
      boq_work_description: workDescription || '',
      boq_unit: selectedBoq?.unit || '',
    });

    showToast('success', 'Saved ✅');
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-5xl mx-4 bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Work Ledger Link</h3>
            <p className="text-sm text-gray-600 mt-1">
              Link <b>Work Activity → BOQ</b> (claim evidence). Programme list is derived from BOQ↔Programme mapping.
            </p>
          </div>
          <button type="button" onClick={closeModal} className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
            Close
          </button>
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

          {/* Summary */}
          <div className="mb-4 p-4 rounded-lg border bg-gray-50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[300px]">
                <div className="text-xs text-gray-500">BOQ (required)</div>
                <div className="text-sm font-medium text-gray-900">{selectedBoq ? boqLabel(selectedBoq) : 'Not linked to BOQ'}</div>
                {selectedBoq && (
                  <div className="text-xs text-gray-600 mt-1">
                    Unit: {selectedBoq.unit || '-'} | BOQ Qty: {selectedBoq.quantity ?? '-'} | Rate: {selectedBoq.unit_rate ?? '-'}
                  </div>
                )}
              </div>

              <div className="min-w-[280px]">
                <div className="text-xs text-gray-500">Mapped Programme (derived)</div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedBoqId ? (mappedProgrammeItems.length ? `${mappedProgrammeItems.length} item(s)` : 'No programme mapped') : '—'}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={clearAll} className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-100">
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${step === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
              1) Select BOQ
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${step === 2 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
              2) Evidence + Programme
            </div>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={boqQuery}
                  onChange={(e) => setBoqQuery(e.target.value)}
                  placeholder="Search BOQ item number / description..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button type="button" onClick={() => setBoqQuery('')} className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
                  Clear
                </button>
              </div>

              <div className="max-h-[45vh] overflow-auto border rounded-lg">
                {boqFiltered.length === 0 ? (
                  <div className="p-4 text-gray-500">No BOQ items found.</div>
                ) : (
                  <ul className="divide-y">
                    {boqFiltered.map((b) => (
                      <li key={b.id} className="p-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-gray-900">{boqLabel(b)}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Unit: {b.unit || '-'} | BOQ Qty: {b.quantity ?? '-'} | Rate: {b.unit_rate ?? '-'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBoqId(b.id);
                              setSelectedProgrammeId(null);
                              setStep(2);
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Select
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Evidence form */}
              <div className="border rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-900 mb-3">Evidence for claim / progress</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Executed Qty (preferred)</label>
                    <input
                      value={executedQty}
                      onChange={(e) => setExecutedQty(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full px-3 py-2 border rounded-lg"
                      inputMode="decimal"
                    />
                    <div className="text-xs text-gray-500 mt-1">Unit: {selectedBoq?.unit || '-'}</div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Executed % (allowed)</label>
                    <input
                      value={executedPct}
                      onChange={(e) => setExecutedPct(e.target.value)}
                      placeholder="0 - 100"
                      className="w-full px-3 py-2 border rounded-lg"
                      inputMode="numeric"
                    />
                    <div className="text-xs text-gray-500 mt-1">Use when quantity is hard to measure.</div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Location</label>
                    <input
                      value={workLocation}
                      onChange={(e) => setWorkLocation(e.target.value)}
                      placeholder="e.g. Zone A / Gridline 1-5"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Work description (evidence notes)</label>
                    <textarea
                      value={workDescription}
                      onChange={(e) => setWorkDescription(e.target.value)}
                      placeholder="What was done, method, reference drawing/site instruction, etc."
                      className="w-full px-3 py-2 border rounded-lg min-h-[90px]"
                    />
                  </div>
                </div>
              </div>

              {/* Derived programme list */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Mapped programme (derived)</div>
                  {loadingProgramme && <div className="text-xs text-gray-500">Loading…</div>}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Mapping is read-only here. If none shows, map in BOQ↔Programme module.
                </div>

                <div className="flex items-center gap-2 mt-3 mb-2">
                  <input
                    value={progQuery}
                    onChange={(e) => setProgQuery(e.target.value)}
                    placeholder="Search WBS / description..."
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button type="button" onClick={() => setProgQuery('')} className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
                    Clear
                  </button>
                </div>

                <div className="border rounded-lg overflow-hidden max-h-[45vh] overflow-auto">
                  {!loadingProgramme && programmeFiltered.length === 0 ? (
                    <div className="p-4 text-gray-600 bg-gray-50">
                      No programme items mapped to this BOQ.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {programmeFiltered.map((p) => {
                        const start = p.planned_start || '—';
                        const end = p.planned_finish || '—';
                        const selected = selectedProgrammeId === p.id;

                        return (
                          <li key={p.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-medium text-gray-900">{programmeLabel(p)}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {p.activity_type || 'Task'} • {start} → {end}
                                </div>
                              </div>

                              {/* Optional evidence tag */}
                              <button
                                type="button"
                                onClick={() => setSelectedProgrammeId(selected ? null : p.id)}
                                className={`px-3 py-2 rounded-lg text-sm ${
                                  selected ? 'bg-purple-600 text-white' : 'bg-white border text-purple-700 hover:bg-purple-50'
                                }`}
                                title="Optional evidence tag (does not change mapping)"
                              >
                                {selected ? 'Tagged' : 'Tag'}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="lg:col-span-2 flex items-center justify-between gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
                  Back
                </button>

                <div className="flex gap-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">
                    Save Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
