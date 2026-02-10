import React, { useEffect, useMemo, useState } from 'react';

/**
 * WorkLedgerLinkModal
 * - Primary: Link Work Activity -> BOQ item (claimable anchor)
 * - Secondary: Suggest Programme items derived from BOQ mapping (optional)
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - boqItems: Array<{ id, item_number?, description?, unit?, quantity?, unit_rate? }>
 * - programmeItems: Array<{ id, wbs_code?, description?, linked_boq_item_id?, start_date?, end_date? }>
 * - initialValue: {
 *     boq_item_id?: string|null,
 *     programme_item_id?: string|null
 *   }
 * - onSave: (value) => void
 *    value: {
 *      boq_item_id: string,
 *      boq_item_label: string,
 *      programme_item_id: string|null,
 *      programme_wbs_code: string,
 *      programme_item_label: string
 *    }
 * - allowProgrammePick?: boolean (default true)
 */
export default function WorkLedgerLinkModal({
  isOpen,
  onClose,
  boqItems = [],
  programmeItems = [],
  initialValue = {},
  onSave,
  allowProgrammePick = true,
}) {
  const [step, setStep] = useState(1);

  const [boqQuery, setBoqQuery] = useState('');
  const [progQuery, setProgQuery] = useState('');

  const [selectedBoqId, setSelectedBoqId] = useState(initialValue?.boq_item_id || null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState(initialValue?.programme_item_id || null);

  // Reset when opened
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setBoqQuery('');
    setProgQuery('');
    setSelectedBoqId(initialValue?.boq_item_id || null);
    setSelectedProgrammeId(initialValue?.programme_item_id || null);
  }, [isOpen, initialValue?.boq_item_id, initialValue?.programme_item_id]);

  const selectedBoq = useMemo(
    () => boqItems.find((b) => b.id === selectedBoqId) || null,
    [boqItems, selectedBoqId]
  );

  const selectedProgramme = useMemo(
    () => programmeItems.find((p) => p.id === selectedProgrammeId) || null,
    [programmeItems, selectedProgrammeId]
  );

  const boqFiltered = useMemo(() => {
    const q = boqQuery.trim().toLowerCase();
    if (!q) return boqItems;

    return boqItems.filter((b) => {
      const text = `${b.item_number || ''} ${b.description || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [boqItems, boqQuery]);

  const programmeSuggested = useMemo(() => {
    if (!selectedBoqId) return [];
    return programmeItems.filter((p) => p.linked_boq_item_id === selectedBoqId);
  }, [programmeItems, selectedBoqId]);

  const programmeFiltered = useMemo(() => {
    const q = progQuery.trim().toLowerCase();
    const base = programmeItems;

    if (!q) return base;

    return base.filter((p) => {
      const text = `${p.wbs_code || ''} ${p.description || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [programmeItems, progQuery]);

  const boqLabel = (b) => {
    const left = b.item_number ? `${b.item_number} — ` : '';
    return `${left}${b.description || '(no description)'}`;
  };

  const programmeLabel = (p) => {
    const left = p.wbs_code ? `${p.wbs_code} — ` : '';
    return `${left}${p.description || '(no description)'}`;
  };

  const closeModal = () => {
    onClose?.();
  };

  const unlinkAll = () => {
    setSelectedBoqId(null);
    setSelectedProgrammeId(null);
    setStep(1);
  };

  const unlinkProgramme = () => {
    setSelectedProgrammeId(null);
  };

  const handleSave = () => {
    if (!selectedBoqId) return;

    const payload = {
      boq_item_id: selectedBoqId,
      boq_item_label: selectedBoq ? boqLabel(selectedBoq) : '',
      programme_item_id: selectedProgrammeId || null,
      programme_wbs_code: selectedProgramme?.wbs_code || '',
      programme_item_label: selectedProgramme ? programmeLabel(selectedProgramme) : '',
    };

    onSave?.(payload);
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl mx-4 bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Work Ledger Link</h3>
            <p className="text-sm text-gray-600 mt-1">
              Link <b>Work Activity → BOQ</b> (claimable). Programme is optional and suggested from mapping.
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Current selection summary */}
          <div className="mb-4 p-4 rounded-lg border bg-gray-50">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-[260px]">
                <div className="text-xs text-gray-500">BOQ Link (mandatory)</div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedBoq ? boqLabel(selectedBoq) : 'Not linked to BOQ'}
                </div>
              </div>

              <div className="min-w-[260px]">
                <div className="text-xs text-gray-500">Programme (optional)</div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedProgramme ? programmeLabel(selectedProgramme) : 'Not linked to programme'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={unlinkProgramme}
                  className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                  disabled={!selectedProgrammeId}
                  title="Remove programme link only"
                >
                  Unlink Programme
                </button>
                <button
                  type="button"
                  onClick={unlinkAll}
                  className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-100"
                  title="Remove BOQ + Programme"
                >
                  Clear All
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
              2) Programme (optional)
            </div>
          </div>

          {/* Step 1: BOQ Picker */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={boqQuery}
                  onChange={(e) => setBoqQuery(e.target.value)}
                  placeholder="Search BOQ item number / description..."
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setBoqQuery('')}
                  className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
                >
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
                              Unit: {b.unit || '-'} | Qty: {b.quantity ?? '-'} | Rate: {b.unit_rate ?? '-'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBoqId(b.id);
                              // If BOQ changed, reset programme selection (since suggestion is BOQ-dependent)
                              if (b.id !== selectedBoqId) setSelectedProgrammeId(null);
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
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Programme Picker (optional) */}
          {step === 2 && (
            <div>
              {!selectedBoqId ? (
                <div className="p-4 border rounded-lg bg-amber-50 text-amber-800">
                  Please select a BOQ item first.
                </div>
              ) : (
                <>
                  {/* Suggested programme items */}
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-900 mb-2">
                      Suggested Programme Items (derived from BOQ ↔ Programme mapping)
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      {programmeSuggested.length === 0 ? (
                        <div className="p-4 text-gray-600 bg-gray-50">
                          No programme items are mapped to this BOQ item yet.
                          <div className="text-xs mt-1 text-gray-500">
                            Tip: Map programme items to BOQ in the Programme/BOQ module using
                            <code className="mx-1 px-1 rounded bg-white border">linked_boq_item_id</code>.
                          </div>
                        </div>
                      ) : (
                        <ul className="divide-y">
                          {programmeSuggested.map((p) => (
                            <li key={p.id} className="p-3 hover:bg-gray-50">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium text-gray-900">{programmeLabel(p)}</div>
                                  {(p.start_date || p.end_date) && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {p.start_date || '-'} → {p.end_date || '-'}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  disabled={!allowProgrammePick}
                                  onClick={() => setSelectedProgrammeId(p.id)}
                                  className={`px-3 py-2 rounded-lg text-sm ${
                                    selectedProgrammeId === p.id
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-white border text-purple-700 hover:bg-purple-50'
                                  } ${!allowProgrammePick ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {selectedProgrammeId === p.id ? 'Selected' : 'Select'}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Full programme search (optional) */}
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-900 mb-2">
                      Find Any Programme Item (optional)
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <input
                        value={progQuery}
                        onChange={(e) => setProgQuery(e.target.value)}
                        placeholder="Search WBS / description..."
                        className="flex-1 px-3 py-2 border rounded-lg"
                        disabled={!allowProgrammePick}
                      />
                      <button
                        type="button"
                        onClick={() => setProgQuery('')}
                        className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
                        disabled={!allowProgrammePick}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="max-h-[30vh] overflow-auto border rounded-lg">
                      {programmeFiltered.length === 0 ? (
                        <div className="p-4 text-gray-500">No programme items found.</div>
                      ) : (
                        <ul className="divide-y">
                          {programmeFiltered.slice(0, 200).map((p) => (
                            <li key={p.id} className="p-3 hover:bg-gray-50">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium text-gray-900">{programmeLabel(p)}</div>
                                  {(p.start_date || p.end_date) && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {p.start_date || '-'} → {p.end_date || '-'}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  disabled={!allowProgrammePick}
                                  onClick={() => setSelectedProgrammeId(p.id)}
                                  className={`px-3 py-2 rounded-lg text-sm ${
                                    selectedProgrammeId === p.id
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-white border text-purple-700 hover:bg-purple-50'
                                  } ${!allowProgrammePick ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {selectedProgrammeId === p.id ? 'Selected' : 'Select'}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {programmeFiltered.length > 200 && (
                      <div className="text-xs text-gray-500 mt-2">
                        Showing first 200 results. Refine your search to narrow down.
                      </div>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!selectedBoqId}
                        className={`px-4 py-2 rounded-lg text-white ${
                          selectedBoqId ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                        title={!selectedBoqId ? 'Select a BOQ item first' : 'Save link'}
                      >
                        Save Link
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
