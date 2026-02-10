import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * BOQ ↔ Programme Link Modal
 * Governs official bridge:
 * programme_items.linked_boq_item_id → boq_items.id
 *
 * Props:
 * - isOpen (bool)
 * - onClose () => void
 * - contractId (uuid)  REQUIRED
 * - initialBoqItemId (uuid | null)
 * - initialProgrammeItemId (uuid | null)
 * - onSaved () => void   (optional refresh callback)
 */
export default function BoqProgrammeLinkModal({
  isOpen,
  onClose,
  contractId,
  initialBoqItemId = null,
  initialProgrammeItemId = null,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [boqItems, setBoqItems] = useState([]);
  const [programmeItems, setProgrammeItems] = useState([]);

  const [selectedBoqItemId, setSelectedBoqItemId] = useState(initialBoqItemId);
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState(
    initialProgrammeItemId ? [initialProgrammeItemId] : []
  );

  const [boqSearch, setBoqSearch] = useState('');
  const [progSearch, setProgSearch] = useState('');
  const [progFilter, setProgFilter] = useState('all'); // all | linked | unlinked

  // Reset when opened
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedBoqItemId(initialBoqItemId);
    setSelectedProgrammeIds(initialProgrammeItemId ? [initialProgrammeItemId] : []);
    setBoqSearch('');
    setProgSearch('');
    setProgFilter('all');
  }, [isOpen, initialBoqItemId, initialProgrammeItemId]);

  // Load BOQ items + Programme items
  useEffect(() => {
    if (!isOpen) return;
    if (!contractId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // BOQ items for contract via join: boq_items.boq_id -> boq.id (contract_id)
        const { data: boqData, error: boqErr } = await supabase
          .from('boq_items')
          .select(`
            id,
            item_number,
            description,
            unit,
            quantity,
            unit_rate,
            item_type,
            boq_id,
            boq!inner(contract_id)
          `)
          .eq('boq.contract_id', contractId)
          .order('item_number', { ascending: true });

        if (boqErr) throw boqErr;

        // Programme items for contract + (optional) show linked BOQ item via relationship
        const { data: progData, error: progErr } = await supabase
          .from('programme_items')
          .select(`
            id,
            wbs_code,
            description,
            activity_type,
            planned_start,
            planned_finish,
            linked_boq_item_id,
            boq_items(item_number, description)
          `)
          .eq('contract_id', contractId)
          .order('wbs_code', { ascending: true });

        if (progErr) throw progErr;

        setBoqItems(boqData || []);
        setProgrammeItems(progData || []);

        // If no initial selection, choose first BOQ item (optional UX)
        if (!initialBoqItemId && (boqData || []).length > 0) {
          setSelectedBoqItemId((boqData || [])[0].id);
        }
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Failed to load BOQ/Programme items');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, contractId, initialBoqItemId]);

  const selectedBoq = useMemo(
    () => boqItems.find(b => b.id === selectedBoqItemId) || null,
    [boqItems, selectedBoqItemId]
  );

  const linkedProgrammeCount = useMemo(() => {
    if (!selectedBoqItemId) return 0;
    return programmeItems.filter(p => p.linked_boq_item_id === selectedBoqItemId).length;
  }, [programmeItems, selectedBoqItemId]);

  const filteredBoqItems = useMemo(() => {
    const q = boqSearch.trim().toLowerCase();
    if (!q) return boqItems;
    return boqItems.filter(b => {
      const a = (b.item_number || '').toLowerCase();
      const d = (b.description || '').toLowerCase();
      return a.includes(q) || d.includes(q);
    });
  }, [boqItems, boqSearch]);

  const filteredProgrammeItems = useMemo(() => {
    const q = progSearch.trim().toLowerCase();

    return programmeItems.filter(p => {
      const matchesSearch = !q
        ? true
        : (p.wbs_code || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q);

      const isLinkedToSelected = selectedBoqItemId
        ? p.linked_boq_item_id === selectedBoqItemId
        : false;

      const isLinkedToAny = !!p.linked_boq_item_id;

      const matchesFilter =
        progFilter === 'all'
          ? true
          : progFilter === 'linked'
          ? isLinkedToSelected
          : progFilter === 'unlinked'
          ? !isLinkedToAny
          : true;

      return matchesSearch && matchesFilter;
    });
  }, [programmeItems, progSearch, progFilter, selectedBoqItemId]);

  const toggleProgrammeSelection = (id) => {
    setSelectedProgrammeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllVisibleProgramme = () => {
    const visibleIds = filteredProgrammeItems.map(p => p.id);
    setSelectedProgrammeIds(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearProgrammeSelection = () => setSelectedProgrammeIds([]);

  const refreshProgrammeItems = async () => {
    const { data: progData, error: progErr } = await supabase
      .from('programme_items')
      .select(`
        id,
        wbs_code,
        description,
        activity_type,
        planned_start,
        planned_finish,
        linked_boq_item_id,
        boq_items(item_number, description)
      `)
      .eq('contract_id', contractId)
      .order('wbs_code', { ascending: true });

    if (progErr) throw progErr;
    setProgrammeItems(progData || []);
  };

  const handleLinkSelected = async () => {
    if (!selectedBoqItemId) return setError('Select a BOQ item first.');
    if (selectedProgrammeIds.length === 0) return setError('Select at least 1 programme item.');

    setSaving(true);
    setError(null);

    try {
      const { error: upErr } = await supabase
        .from('programme_items')
        .update({ linked_boq_item_id: selectedBoqItemId })
        .in('id', selectedProgrammeIds);

      if (upErr) throw upErr;

      await refreshProgrammeItems();
      onSaved?.();
      clearProgrammeSelection();
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to link selected programme items');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkSelected = async () => {
    if (selectedProgrammeIds.length === 0) return setError('Select at least 1 programme item.');

    setSaving(true);
    setError(null);

    try {
      const { error: upErr } = await supabase
        .from('programme_items')
        .update({ linked_boq_item_id: null })
        .in('id', selectedProgrammeIds);

      if (upErr) throw upErr;

      await refreshProgrammeItems();
      onSaved?.();
      clearProgrammeSelection();
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to unlink selected programme items');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-6xl mx-4 bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">🔗 BOQ ↔ Programme Linking</div>
            <div className="text-xs text-gray-600 mt-1">
              Official bridge: <span className="font-mono">programme_items.linked_boq_item_id → boq_items.id</span>
            </div>
            {selectedBoq && (
              <div className="text-xs text-gray-500 mt-1">
                Selected BOQ: <span className="font-semibold">{selectedBoq.item_number}</span> —{' '}
                <span className="italic">{selectedBoq.description}</span> • Linked programme items:{' '}
                <span className="font-semibold">{linkedProgrammeCount}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {(loading) ? (
            <div className="animate-pulse h-48 bg-gray-100 rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: BOQ Items */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
                  <div className="font-semibold text-gray-900">BOQ Items</div>
                  <input
                    value={boqSearch}
                    onChange={(e) => setBoqSearch(e.target.value)}
                    placeholder="Search item no / description…"
                    className="text-sm border rounded-lg px-3 py-2 w-64"
                  />
                </div>

                <div className="max-h-[420px] overflow-auto">
                  {filteredBoqItems.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No BOQ items found.</div>
                  ) : (
                    <ul className="divide-y">
                      {filteredBoqItems.map(b => {
                        const active = b.id === selectedBoqItemId;
                        return (
                          <li
                            key={b.id}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                              active ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => setSelectedBoqItemId(b.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {b.item_number}{' '}
                                  <span className="text-xs font-normal text-gray-500">
                                    ({b.item_type || 'item'})
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {b.description}
                                </div>
                              </div>
                              {active && (
                                <div className="text-xs font-semibold text-blue-700">Selected</div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right: Programme Items */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-gray-900">Programme Items</div>

                  <div className="flex items-center gap-2">
                    <select
                      className="text-sm border rounded-lg px-2 py-2"
                      value={progFilter}
                      onChange={(e) => setProgFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="linked">Linked to selected BOQ</option>
                      <option value="unlinked">Unlinked</option>
                    </select>

                    <input
                      value={progSearch}
                      onChange={(e) => setProgSearch(e.target.value)}
                      placeholder="Search WBS / description…"
                      className="text-sm border rounded-lg px-3 py-2 w-64"
                    />
                  </div>
                </div>

                <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-gray-600">
                    Selected programme items: <span className="font-semibold">{selectedProgrammeIds.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllVisibleProgramme}
                      className="px-3 py-2 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      Select all visible
                    </button>
                    <button
                      onClick={clearProgrammeSelection}
                      className="px-3 py-2 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="max-h-[340px] overflow-auto">
                  {filteredProgrammeItems.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No programme items found.</div>
                  ) : (
                    <ul className="divide-y">
                      {filteredProgrammeItems.map(p => {
                        const checked = selectedProgrammeIds.includes(p.id);
                        const linkedToSelected =
                          selectedBoqItemId && p.linked_boq_item_id === selectedBoqItemId;

                        const linkedLabel = p.linked_boq_item_id
                          ? (p.boq_items?.item_number
                              ? `Linked: ${p.boq_items.item_number}`
                              : 'Linked')
                          : 'Unlinked';

                        return (
                          <li key={p.id} className="px-4 py-3 hover:bg-gray-50">
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() => toggleProgrammeSelection(p.id)}
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {p.wbs_code} — {p.description}
                                  </div>
                                  <div
                                    className={`text-xs font-semibold ${
                                      linkedToSelected
                                        ? 'text-blue-700'
                                        : p.linked_boq_item_id
                                        ? 'text-green-700'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {linkedToSelected ? 'Linked to selected' : linkedLabel}
                                  </div>
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                  {p.activity_type || 'Task'} • {p.planned_start || '—'} → {p.planned_finish || '—'}
                                </div>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="p-4 border-t flex flex-wrap items-center justify-end gap-2">
                  <button
                    disabled={saving}
                    onClick={handleUnlinkSelected}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                  >
                    Unlink selected
                  </button>

                  <button
                    disabled={saving}
                    onClick={handleLinkSelected}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Link selected to BOQ
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4">
            Reminder: this modal manages the **BOQ ↔ Programme bridge**. Diary-level linking remains separate            
            {/* (Diary ↔ BOQ and Diary ↔ Programme). :contentReference[oaicite:1]{index=1} */}
          </div>
        </div>
      </div>
    </div>
  );
}
