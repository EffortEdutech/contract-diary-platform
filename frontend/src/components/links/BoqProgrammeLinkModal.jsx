import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * BOQ → many Programme mapping modal (V2)
 * Writes to: programme_boq_links (contract_id, boq_item_id, programme_item_id)
 *
 * Features:
 * - Toast confirmation on save/unlink
 * - Unsaved changes warning (switch BOQ / close)
 * - Immediate UI refresh after save/unlink
 * - Save Mapping disabled when no changes
 */
export default function BoqProgrammeLinkModal({
  isOpen,
  onClose,
  contractId,
  initialBoqItemId = null,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', text: string }
  const [boqItems, setBoqItems] = useState([]);
  const [programmeItems, setProgrammeItems] = useState([]);

  const [selectedBoqItemId, setSelectedBoqItemId] = useState(initialBoqItemId);
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState([]);
  const [linkedProgrammeIdSet, setLinkedProgrammeIdSet] = useState(new Set()); // DB truth for selected BOQ

  const [boqSearch, setBoqSearch] = useState('');
  const [progSearch, setProgSearch] = useState('');
  const [progFilter, setProgFilter] = useState('all'); // all | linked | unlinked

  const showToast = (type, text) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2200);
  };

  const setsEqual = (a, b) => {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  };

  const selectedProgrammeSet = useMemo(() => new Set(selectedProgrammeIds), [selectedProgrammeIds]);
  const hasChanges = useMemo(
    () => !setsEqual(selectedProgrammeSet, linkedProgrammeIdSet),
    [selectedProgrammeSet, linkedProgrammeIdSet]
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
    setBoqSearch('');
    setProgSearch('');
    setProgFilter('all');
    setSelectedBoqItemId(initialBoqItemId || null);
    setSelectedProgrammeIds([]);
    setLinkedProgrammeIdSet(new Set());
  }, [isOpen, initialBoqItemId]);

  // Load BOQ + Programme (contract-scoped)
  useEffect(() => {
    if (!isOpen || !contractId) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
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

        const { data: progData, error: progErr } = await supabase
          .from('programme_items')
          .select('id, wbs_code, description, activity_type, planned_start, planned_finish')
          .eq('contract_id', contractId)
          .order('wbs_code', { ascending: true });

        if (progErr) throw progErr;

        setBoqItems(boqData || []);
        setProgrammeItems(progData || []);

        if (!initialBoqItemId && (boqData || []).length > 0) {
          setSelectedBoqItemId(boqData[0].id);
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

  // Load existing links (DB truth) whenever selected BOQ changes
  useEffect(() => {
    if (!isOpen || !contractId || !selectedBoqItemId) return;

    const loadLinks = async () => {
      setError(null);
      try {
        const { data, error: linkErr } = await supabase
          .from('programme_boq_links')
          .select('programme_item_id')
          .eq('contract_id', contractId)
          .eq('boq_item_id', selectedBoqItemId);

        if (linkErr) throw linkErr;

        const set = new Set((data || []).map(r => r.programme_item_id));
        setLinkedProgrammeIdSet(set);
        setSelectedProgrammeIds(Array.from(set)); // default selection = current links
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Failed to load existing links');
        setLinkedProgrammeIdSet(new Set());
        setSelectedProgrammeIds([]);
      }
    };

    loadLinks();
  }, [isOpen, contractId, selectedBoqItemId]);

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

      const isLinked = linkedProgrammeIdSet.has(p.id);

      const matchesFilter =
        progFilter === 'all'
          ? true
          : progFilter === 'linked'
          ? isLinked
          : progFilter === 'unlinked'
          ? !isLinked
          : true;

      return matchesSearch && matchesFilter;
    });
  }, [programmeItems, progSearch, progFilter, linkedProgrammeIdSet]);

  const toggleProgrammeSelection = (id) => {
    setSelectedProgrammeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllVisibleProgramme = () => {
    const visibleIds = filteredProgrammeItems.map(p => p.id);
    setSelectedProgrammeIds(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearProgrammeSelection = () => {
    setSelectedProgrammeIds([]);
  };

  const reloadLinksForSelectedBoq = async () => {
    const { data, error: linkErr } = await supabase
      .from('programme_boq_links')
      .select('programme_item_id')
      .eq('contract_id', contractId)
      .eq('boq_item_id', selectedBoqItemId);

    if (linkErr) throw linkErr;

    const set = new Set((data || []).map(r => r.programme_item_id));
    setLinkedProgrammeIdSet(set);
    setSelectedProgrammeIds(Array.from(set));
  };

  const handleSaveMapping = async () => {
    if (!selectedBoqItemId) return setError('Select a BOQ item first.');
    if (selectedProgrammeIds.length === 0) return setError('Select at least 1 programme item.');
    if (!hasChanges) return;

    setSaving(true);
    setError(null);

    try {
      const rows = selectedProgrammeIds.map(pid => ({
        contract_id: contractId,
        boq_item_id: selectedBoqItemId,
        programme_item_id: pid,
        link_type: 'primary',
      }));

      const { error: upErr } = await supabase
        .from('programme_boq_links')
        .upsert(rows, { onConflict: 'programme_item_id,boq_item_id' });

      if (upErr) throw upErr;

      await reloadLinksForSelectedBoq();
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
    if (!selectedBoqItemId) return setError('Select a BOQ item first.');
    if (selectedProgrammeIds.length === 0) return setError('Select at least 1 programme item.');

    setSaving(true);
    setError(null);

    try {
      const { error: delErr } = await supabase
        .from('programme_boq_links')
        .delete()
        .eq('contract_id', contractId)
        .eq('boq_item_id', selectedBoqItemId)
        .in('programme_item_id', selectedProgrammeIds);

      if (delErr) throw delErr;

      await reloadLinksForSelectedBoq();
      onSaved?.();
      showToast('success', 'Mapping removed ✅');
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to unlink');
      showToast('error', 'Unlink failed');
    } finally {
      setSaving(false);
    }
  };

  const tryChangeSelectedBoq = (newBoqId) => {
    if (newBoqId === selectedBoqItemId) return;
    if (!confirmDiscardIfDirty()) return;
    setSelectedBoqItemId(newBoqId);
    setError(null);
    setToast(null);
  };

  const canSave = !!selectedBoqItemId && selectedProgrammeIds.length > 0 && hasChanges && !saving;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-6xl mx-4 bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">🔗 BOQ ↔ Programme Mapping</div>
            <div className="text-xs text-gray-600 mt-1">
              Mapping table: <span className="font-mono">programme_boq_links</span>
            </div>
            {selectedBoq && (
              <div className="text-xs text-gray-500 mt-1">
                Selected BOQ: <span className="font-semibold">{selectedBoq.item_number}</span> —{' '}
                <span className="italic">{selectedBoq.description}</span>
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
              {/* BOQ list */}
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
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${active ? 'bg-blue-50' : ''}`}
                            onClick={() => tryChangeSelectedBoq(b.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {b.item_number}{' '}
                                  <span className="text-xs font-normal text-gray-500">
                                    ({b.item_type || 'item'})
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{b.description}</div>
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

              {/* Programme list */}
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
                      <option value="linked">Linked</option>
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
                    Selected: <span className="font-semibold">{selectedProgrammeIds.length}</span>
                    <span className="ml-2 text-gray-400">•</span>
                    <span className="ml-2">
                      Currently linked: <span className="font-semibold">{linkedProgrammeIdSet.size}</span>
                    </span>
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
                        const isLinked = linkedProgrammeIdSet.has(p.id);

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
                                  <div className={`text-xs font-semibold ${isLinked ? 'text-green-700' : 'text-gray-500'}`}>
                                    {isLinked ? 'Linked' : 'Unlinked'}
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
                    disabled={saving || selectedProgrammeIds.length === 0}
                    onClick={handleUnlinkSelected}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
                    title={selectedProgrammeIds.length === 0 ? 'Select items to unlink' : undefined}
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
            This modal manages BOQ ↔ Programme governance mapping (M:N) via <span className="font-mono">programme_boq_links</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
