// frontend/src/lib/ledger/progressCalculators.js

export function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function clamp(n, min, max) {
  if (!Number.isFinite(n)) return n;
  return Math.min(max, Math.max(min, n));
}

/**
 * Validate evidence: qty preferred, % allowed.
 * Returns: { ok: boolean, message?: string }
 */
export function validateEvidence({ executedQty, executedPct }) {
  const qty = toNumberOrNull(executedQty);
  const pct = toNumberOrNull(executedPct);

  if (qty === null && pct === null) {
    return { ok: false, message: 'Please enter Executed Qty or Executed %.' };
  }
  if (qty !== null && qty <= 0) {
    return { ok: false, message: 'Executed Qty must be > 0.' };
  }
  if (pct !== null && (pct < 0 || pct > 100)) {
    return { ok: false, message: 'Executed % must be between 0 and 100.' };
  }
  return { ok: true };
}

/**
 * Compute BOQ basis percent for later programme allocation (Sprint 2),
 * derived from pct if provided; else qty/contractQty.
 */
export function computeBoqBasisPercent({ executedQty, executedPct, boqContractQty }) {
  const pct = toNumberOrNull(executedPct);
  if (pct !== null) return Math.min(100, Math.max(0, pct));

  const qty = toNumberOrNull(executedQty);
  const boqQty = toNumberOrNull(boqContractQty);
  if (qty === null || boqQty === null || boqQty <= 0) return null;

  return Math.min(100, Math.max(0, (qty / boqQty) * 100));
}


/**
 * Shallow “dirty” compare for evidence object (string + numbers).
 * Treats null/'' as equivalent for numeric fields.
 */
export function isEvidenceChanged(initial, current) {
  const norm = (x) => ({
    boq_item_id: x?.boq_item_id || null,
    executed_qty: toNumberOrNull(x?.executed_qty),
    executed_pct: toNumberOrNull(x?.executed_pct),
    location: (x?.location || '').trim(),
    work_description: (x?.work_description || '').trim(),
  });

  const a = norm(initial);
  const b = norm(current);

  return (
    a.boq_item_id !== b.boq_item_id ||
    a.executed_qty !== b.executed_qty ||
    a.executed_pct !== b.executed_pct ||
    a.location !== b.location ||
    a.work_description !== b.work_description
  );
}

/**
 * Compare two evidence arrays (order-independent) and decide if changed.
 * Uses boq_item_id as key.
 */
export function isEvidenceArrayChanged(initialArr = [], currentArr = []) {
  const toMap = (arr) => {
    const m = new Map();
    (arr || []).forEach((e) => {
      if (!e?.boq_item_id) return;
      m.set(e.boq_item_id, {
        boq_item_id: e.boq_item_id,
        executed_qty: toNumberOrNull(e.executed_qty),
        executed_pct: toNumberOrNull(e.executed_pct),
        location: (e.location || '').trim(),
        work_description: (e.work_description || '').trim(),
      });
    });
    return m;
  };

  const a = toMap(initialArr);
  const b = toMap(currentArr);

  if (a.size !== b.size) return true;

  for (const [k, va] of a.entries()) {
    const vb = b.get(k);
    if (!vb) return true;
    if (
      va.executed_qty !== vb.executed_qty ||
      va.executed_pct !== vb.executed_pct ||
      va.location !== vb.location ||
      va.work_description !== vb.work_description
    ) return true;
  }
  return false;
}
