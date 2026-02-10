import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Programme → many BOQ mapping modal
 * Writes to: programme_boq_links (contract_id, programme_item_id, boq_item_id)
 *
 * Features:
 * - Toast confirmation on save/unlink
 * - Unsaved changes warning (switch Programme / close)
 * - Immediate UI refresh after save/unlink
 * - Save Mapping disabled when no changes
 */
export default function ProgrammeBoqLinkModal({
  isOpen,
  onClose,
  contractId,
  initialProgrammeItemId = null,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [programmeItems, setProgrammeItems] = useState([]);
  const [boqItems, setBoqItems] = useState([]);

  const [selectedProgrammeId, setSelectedProgrammeId] = useState(initialProgrammeItemId);
  const [selectedBoqIds, setSelectedBoqIds] = useState([]);

  const [linkBoqIdSet, setLinkBoqIdSet] = useState(new Set()); // DB truth for selected programme

  const [programmeSearch, setProgrammeSearch] = useState('');
  const [boqSearch, setBoqSearch] = useState('');
  const [boqFilter, setBoqFilter] = useState('all'); // all | linked | unlinked

  const [toast, setToast] = useState(null); // { type, text }

  const showToast = (type, text) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2200);
  };

  const setsEqual = (a, b) => {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  };

  const selectedBoqSet = useMemo(() => new Set(selectedBoqIds), [selectedBoqIds]);
  const hasChanges = useMemo(
    () => !setsEqual(selectedBoqSet, linkBoqIdSet),
    [selectedBoqSet, linkBoqIdSet]
  );

  const confirmDiscardIfDirty = () => {
    if (!hasChanges) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  };

  const safeClose = () => {
    if (!confirmDiscardIfDirty()) return;
    onClose();
  };

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setToast(null);
    setProgrammeSearch('');
    setBoqSearch('');
    setBoqFilter('all');
    setSelectedProgrammeId(initialProgrammeItemId || null);
    setSelectedBoqIds([]);
    setLinkBoqIdSet(new Set());
  }, [isOpen, initialProgrammeItemId]);

  // Load programme items + BOQ items
  useEffect(() => {
    if (!isOpen || !contractId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: progData, error: progErr } = await supabase
          .from('programme_items')
          .select('id, wbs_code, description, activity_type, planned_start, planned_finish')
          .eq('contract_id', contractId)
          .order('wbs_code', { ascending: true });

        if (progErr) throw progErr;

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

        setProgrammeItems(progData || []);
        setBoqItems(boqData || []);

        if (!initialProgrammeItemId && (progData || []).length > 0) {
          setSelectedProgrammeId((progData || [])[0].id);
        }
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Failed to load programme/BOQ items');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, contractId, initialProgrammeItemId]);

  const selectedProgramme = useMemo(
    () => programmeItems.find(p => p.id === selectedProgrammeId) || null,
    [programmeItems, selectedProgrammeId]
  );

  // Load existing link set when programme changes
  useEffect(() => {
    if (!isOpen || !contractId || !selectedProgrammeId) return;

    const loadLinks = async () => {
      setError(null);
      try {
        const { data, error: linkErr } = await supabase
          .from('programme_boq_links')
          .select('boq_item_id')
          .eq('contract_id', contractId)
          .eq('programme_item_id', selectedProgrammeId);

        if (linkErr) throw linkErr;

        const set = new Set((data || []).map(r => r.boq_item_id));
        setLinkBoqIdSet(set);
        setSelectedBoqIds(Array.from(set)); // default = current links
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Failed to load existing links');
        setLinkBoqIdSet(new Set());
        setSelectedBoqIds([]);
      }
    };

    loadLinks();
  }, [isOpen, contractId, selectedProgrammeId]);

  const filteredProgrammeItems = useMemo(() => {
    const q = programmeSearch.trim().toLowerCase();
    if (!q) return programmeItems;
    return programmeItems.filter(p => {
      const text = `${p.wbs_code || ''} ${p.description || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [programmeItems, programmeSearch]);

  const filteredBoqItems = useMemo(() => {
    const q = boqSearch.trim().toLowerCase();

    return boqItems.filter(b => {
      const matchesSearch = !q
        ? true
        : `${b.item_number || ''} ${b.description || ''}`.toLowerCase().includes(q);

      const isLinked = linkBoqIdSet.has(b.id);

      const matchesFilter =
        boqFilter === 'all'
          ? true
          : boqFilter === 'linked'
          ? isLinked
          : boqFilter === 'unlinked'
          ? !isLinked
          : true;

      return matchesSearch && matchesFilter;
    });
  }, [boqItems, boqSearch, boqFilter, linkBoqIdSet]);

  const toggleBoqSelection = (id) => {
    setSelectedBoqIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllVisibleBoq = () => {
    const visibleIds = filteredBoqItems.map(b => b.id);
    setSelectedBoqIds(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearBoqSelection = () => setSelectedBoqIds([]);

  const reloadLinksForProgramme = async () => {
    const { data, error: linkErr } = await supabase
      .from('programme_boq_links')
      .select('boq_item_id')
      .eq('contract_id', contractId)
      .eq('programme_item_id', selectedProgrammeId);

    if (linkErr) throw linkErr;

    const set = new Set((data || []).map(r => r.boq_item_id));
    setLinkBoqIdSet(set);
    setSelectedBoqIds(Array.from(set));
  };

  const handleSaveMapping = async () => {
    if (!selectedProgrammeId) return setError('Select a programme item first.');
    if (selectedBoqIds.length === 0) return setError('Select at least 1 BOQ item.');
    if (!hasChanges) return;

    setSaving(true);
    setError(null);

    try {
      const rows = selectedBoqIds.map(bid => ({
        contract_id: contractId,
        programme_item_id: selectedProgrammeId,
        boq_item_id: bid,
        link_type: 'primary',
      }));

      const { error: upErr } = await supabase
        .from('programme_boq_links')
        .upsert(rows, { onConflict: 'programme_item_id,boq_item_id' });

      if (upErr) throw upErr;

      await reloadLinksForProgramme();
      onSaved?.();
      showToast('success', 'Mapping saved ✅');
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to save mapping');
      showToast('error', 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkSelected = async () => {
    if (!selectedProgrammeId) return setError('Select a programme item first.');
    if (selectedBoqIds.length === 0) return setError('Select at least 1 BOQ item.');

    setSaving(true);
    setError(null);

    try {
      const { error: delErr } = await supabase
        .from('programme_boq_links')
        .delete()
        .eq('contract_id', contractId)
        .eq('programme_item_id', selectedProgrammeId)
        .in('boq_item_id', selectedBoqIds);

      if (delErr) throw delErr;

      await reloadLinksForProgramme();
      onSaved?.();
      showToast('success', 'Mapping removed ✅');
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to unlink selected BOQ items');
      showToast('error', 'Unlink failed');
    } finally {
      setSaving(false);
    }
  };

  const tryChangeSelectedProgramme = (newId) => {
    if (newId === selectedProgrammeId) return;
    if (!confirmDiscardIfDirty()) return;
    setSelectedProgrammeId(newId);
    setError(null);
    setToast(null);
  };

  const canSave = !!selectedProgrammeId && selectedBoqIds.length > 0 && hasChanges && !saving;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-6xl mx-4 bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">🔗 Programme ↔ BOQ Mapping</div>
            <div className="text-xs text-gray-600 mt-1">
              Mapping table: <span className="font-mono">programme_boq_links</span>
            </div>
            {selectedProgramme && (
              <div className="text-xs text-gray-500 mt-1">
                Selected Programme: <span className="font-semibold">{selectedProgramme.wbs_code}</span> —{' '}
                <span className="italic">{selectedProgramme.description}</span>
                {hasChanges ? (
                  <span className="ml-2 text-amber-700 font-semibold">• Unsaved changes</span>
                ) : (
                  <span className="ml-2 text-gray-400">• No changes</span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={safeClose}
            className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
          >
            Close
          </button>
        </div>

        <div className="p-5">
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

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="animate-pulse h-48 bg-gray-100 rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Programme list */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
                  <div className="font-semibold text-gray-900">Programme Items</div>
                  <input
                    value={programmeSearch}
                    onChange={(e) => setProgrammeSearch(e.target.value)}
                    placeholder="Search WBS / description…"
                    className="text-sm border rounded-lg px-3 py-2 w-64"
                  />
                </div>

                <div className="max-h-[420px] overflow-auto">
                  {filteredProgrammeItems.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No programme items found.</div>
                  ) : (
                    <ul className="divide-y">
                      {filteredProgrammeItems.map(p => {
                        const active = p.id === selectedProgrammeId;
                        return (
                          <li
                            key={p.id}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${active ? 'bg-blue-50' : ''}`}
                            onClick={() => tryChangeSelectedProgramme(p.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {p.wbs_code}{' '}
                                  <span className="text-xs font-normal text-gray-500">
                                    ({p.activity_type || 'Task'})
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {p.description}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {p.planned_start || '—'} → {p.planned_finish || '—'}
                                </div>
                              </div>
                              {active && <div className="text-xs font-semibold text-blue-700">Selected</div>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* BOQ list */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-gray-900">BOQ Items</div>

                  <div className="flex items-center gap-2">
                    <select
                      className="text-sm border rounded-lg px-2 py-2"
                      value={boqFilter}
                      onChange={(e) => setBoqFilter(e.target.value)}
                    >
                      <option value="all">All</option>
                      <option value="linked">Linked</option>
                      <option value="unlinked">Unlinked</option>
                    </select>

                    <input
                      value={boqSearch}
                      onChange={(e) => setBoqSearch(e.target.value)}
                      placeholder="Search item no / description…"
                      className="text-sm border rounded-lg px-3 py-2 w-64"
                    />
                  </div>
                </div>

                <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-gray-600">
                    Selected: <span className="font-semibold">{selectedBoqIds.length}</span>
                    <span className="ml-2 text-gray-400">•</span>
                    <span className="ml-2">
                      Currently linked: <span className="font-semibold">{linkBoqIdSet.size}</span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllVisibleBoq}
                      className="px-3 py-2 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      Select all visible
                    </button>
                    <button
                      onClick={clearBoqSelection}
                      className="px-3 py-2 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="max-h-[340px] overflow-auto">
                  {filteredBoqItems.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No BOQ items found.</div>
                  ) : (
                    <ul className="divide-y">
                      {filteredBoqItems.map(b => {
                        const checked = selectedBoqIds.includes(b.id);
                        const isLinked = linkBoqIdSet.has(b.id);

                        return (
                          <li key={b.id} className="px-4 py-3 hover:bg-gray-50">
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() => toggleBoqSelection(b.id)}
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {b.item_number}{' '}
                                    <span className="text-xs font-normal text-gray-500">
                                      ({b.item_type || 'item'})
                                    </span>
                                    <div className="text-xs text-gray-600 mt-1">{b.description}</div>
                                  </div>

                                  <div className={`text-xs font-semibold ${isLinked ? 'text-green-700' : 'text-gray-500'}`}>
                                    {isLinked ? 'Linked' : 'Unlinked'}
                                  </div>
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                  Unit: {b.unit || '-'} • Qty: {b.quantity ?? '-'} • Rate: {b.unit_rate ?? '-'}
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
                    disabled={saving || selectedBoqIds.length === 0}
                    onClick={handleUnlinkSelected}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                    title={selectedBoqIds.length === 0 ? 'Select items to unlink' : undefined}
                  >
                    Unlink
                  </button>

                  <button
                    disabled={!canSave}
                    onClick={handleSaveMapping}
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    title={!hasChanges ? 'No changes to save' : undefined}
                  >
                    Save Mapping
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4">
            This modal maps Programme ↔ BOQ for deriving programme progress from BOQ ledger truth.
          </div>
        </div>
      </div>
    </div>
  );
}
