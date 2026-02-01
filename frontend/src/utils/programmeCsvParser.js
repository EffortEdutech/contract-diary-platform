// frontend/src/utils/programmeCsvParser.js

// -------------------------------------------------------
// SIMPLE CSV PARSER (no external libs)
// Supports quotes, commas, CRLF
// -------------------------------------------------------
function parseCsvText(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === ',')) {
      row.push(cur);
      cur = '';
      continue;
    }
    if (!inQuotes && (ch === '\n')) {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
      continue;
    }
    if (!inQuotes && ch === '\r') continue;

    cur += ch;
  }

  // last cell
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }

  // remove empty trailing rows
  return rows.filter(r => r.some(c => String(c || '').trim() !== ''));
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w %/.-]/g, '');
}

function toISODate(val) {
  if (!val) return null;

  // already YYYY-MM-DD
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // try Date parse (can be "1/28/2026", "28/1/2026", "28-Jan-26", etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function parseDurationDays(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim().toLowerCase();

  // e.g. "15 days", "7 day", "10d"
  const m = s.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const num = Number(m[1]);
  if (!isFinite(num)) return null;

  // if hours format appears, still treat number as days (best-effort)
  return Math.round(num);
}

function pctToNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).replace('%', '').trim();
  const n = Number(s);
  if (!isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function computeDurationDays(startIso, finishIso) {
  if (!startIso || !finishIso) return null;
  const a = new Date(startIso);
  const b = new Date(finishIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  const diffMs = b.getTime() - a.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive-ish
  return diffDays < 0 ? null : diffDays;
}

function deriveStatus(percent) {
  const p = Number(percent || 0);
  if (p >= 100) return 'Completed';
  if (p > 0) return 'In Progress';
  return 'Not Started';
}

function deriveLevelFromWbs(wbs) {
  if (!wbs) return 1;
  return String(wbs).split('.').filter(Boolean).length;
}

function deriveParentWbs(wbs) {
  if (!wbs) return null;
  const parts = String(wbs).split('.').filter(Boolean);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

export function adaptMsProjectRow(row) {
  const wbs = row['WBS'] || row['Outline Number'] || row['wbs_code'];
  return {
    wbs_code: wbs,
    parent_wbs_code: deriveParentWbs(wbs), // ✅ PUTS IT HERE
    description: row['Name'] || row['Task Name'] || row['description'],
    planned_start: row['Start'] || row['planned_start'],
    planned_finish: row['Finish'] || row['planned_finish'],
    percent_complete: row['% Complete'] ?? row['percent_complete'] ?? 0,
    activity_type: row['Task Type'] || row['activity_type'] || 'Task',
  };
}

export function adaptPrimaveraRow(row) {
  const wbs = row['WBS Code'] || row['Activity ID'] || row['wbs_code'];
  return {
    wbs_code: wbs,
    parent_wbs_code: deriveParentWbs(wbs), // ✅ PUTS IT HERE
    description: row['Activity Name'] || row['Name'] || row['description'],
    planned_start: row['Start Date'] || row['Planned Start'] || row['planned_start'],
    planned_finish: row['Finish Date'] || row['Planned Finish'] || row['planned_finish'],
    percent_complete: row['% Complete'] ?? row['percent_complete'] ?? 0,
    activity_type: row['Activity Type'] || row['activity_type'] || 'Task',
  };
}

// -------------------------------------------------------
// FILE READER
// -------------------------------------------------------
export async function parseCsvFile(file) {
  const text = await file.text();
  const raw = parseCsvText(text);
  if (!raw.length) return { headers: [], rows: [] };

  const headers = raw[0].map(normalizeHeader);
  const rows = raw.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? '';
    });
    return obj;
  });

  return { headers, rows };
}

// -------------------------------------------------------
// ADAPTERS
// -------------------------------------------------------
export function adaptMsProjectRows(rows) {
  // accepted header variants (normalized)
  const H = {
    wbs: ['outline number', 'outline no', 'wbs', 'wbs code'],
    name: ['name', 'task name', 'activity name'],
    start: ['start', 'planned start', 'start date'],
    finish: ['finish', 'planned finish', 'finish date'],
    duration: ['duration', 'duration days'],
    pct: ['% complete', 'percent complete', 'physical % complete'],
    actualStart: ['actual start'],
    actualFinish: ['actual finish'],
    outlineLevel: ['outline level', 'level'],
    summary: ['summary'],
    milestone: ['milestone'],
    critical: ['critical'],
    slack: ['total slack', 'total float', 'total float days'],
    resource: ['resource names', 'resources']
  };

  const pick = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
    }
    return null;
  };

  return rows.map((r) => {
    const wbs = String(pick(r, H.wbs) || '').trim();
    const desc = String(pick(r, H.name) || '').trim();
    const ps = toISODate(pick(r, H.start));
    const pf = toISODate(pick(r, H.finish));
    const dur = parseDurationDays(pick(r, H.duration)) ?? computeDurationDays(ps, pf);
    const pct = pctToNumber(pick(r, H.pct));
    const level = Number(pick(r, H.outlineLevel)) || deriveLevelFromWbs(wbs);

    // type inference
    const milestoneFlag = String(pick(r, H.milestone) || '').toLowerCase();
    const summaryFlag = String(pick(r, H.summary) || '').toLowerCase();

    let activityType = 'Task';
    if (milestoneFlag === 'yes' || milestoneFlag === 'true' || dur === 0) activityType = 'Milestone';
    else if (summaryFlag === 'yes' || summaryFlag === 'true') activityType = 'Summary';

    const status = deriveStatus(pct);

    const isCriticalRaw = String(pick(r, H.critical) || '').toLowerCase();
    const isCritical = isCriticalRaw === 'yes' || isCriticalRaw === 'true';

    return {
      wbs_code: wbs,
      description: desc,
      activity_type: activityType,
      planned_start: ps,
      planned_finish: pf,
      duration_days: dur,
      actual_start: toISODate(pick(r, H.actualStart)),
      actual_finish: toISODate(pick(r, H.actualFinish)),
      percent_complete: pct ?? 0,
      level,
      resource_name: String(pick(r, H.resource) || '').trim() || null,
      is_critical: isCritical,
      total_float_days: Number(pick(r, H.slack) || 0) || 0,
      status
    };
  });
}

export function adaptPrimaveraRows(rows) {
  const H = {
    wbs: ['wbs code', 'wbs', 'activity id'],
    name: ['activity name', 'name', 'task name', 'description'],
    start: ['start date', 'planned start', 'start'],
    finish: ['finish date', 'planned finish', 'finish'],
    duration: ['planned duration', 'duration', 'duration days'],
    pct: ['physical % complete', '% complete', 'percent complete'],
    actualStart: ['actual start'],
    actualFinish: ['actual finish'],
    parent: ['parent wbs', 'wbs parent', 'wbs path'],
    float: ['total float', 'total float days', 'total float (days)'],
    critical: ['critical activity', 'critical'],
    resources: ['resources', 'resource names']
  };

  const pick = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
    }
    return null;
  };

  return rows.map((r) => {
    const wbs = String(pick(r, H.wbs) || '').trim();
    const desc = String(pick(r, H.name) || '').trim();
    const ps = toISODate(pick(r, H.start));
    const pf = toISODate(pick(r, H.finish));
    const dur = parseDurationDays(pick(r, H.duration)) ?? computeDurationDays(ps, pf);
    const pct = pctToNumber(pick(r, H.pct));
    const parent = String(pick(r, H.parent) || '').trim() || null;

    const criticalRaw = String(pick(r, H.critical) || '').toLowerCase();
    const isCritical = criticalRaw === 'yes' || criticalRaw === 'true' || criticalRaw === 'y';

    // P6 usually exports tasks; milestone can be detected by duration 0
    let activityType = dur === 0 ? 'Milestone' : 'Task';
    const level = deriveLevelFromWbs(wbs);

    return {
      wbs_code: wbs,
      description: desc,
      activity_type: activityType,
      planned_start: ps,
      planned_finish: pf,
      duration_days: dur,
      actual_start: toISODate(pick(r, H.actualStart)),
      actual_finish: toISODate(pick(r, H.actualFinish)),
      percent_complete: pct ?? 0,
      parent_wbs_code: parent, // will be resolved into parent_id
      level,
      resource_name: String(pick(r, H.resources) || '').trim() || null,
      is_critical: isCritical,
      total_float_days: Number(pick(r, H.float) || 0) || 0,
      status: deriveStatus(pct)
    };
  });
}

// -------------------------------------------------------
// VALIDATION
// -------------------------------------------------------
export function validateProgrammeRows(items) {
  const errors = [];
  const warnings = [];

  const seen = new Set();

  items.forEach((it, idx) => {
    const rowNo = idx + 2; // header is line 1

    if (!it.wbs_code) errors.push(`Row ${rowNo}: WBS/ID is required`);
    if (!it.description) errors.push(`Row ${rowNo}: Description is required`);

    if (!it.planned_start) errors.push(`Row ${rowNo}: Planned Start is required/invalid date`);
    if (!it.planned_finish) errors.push(`Row ${rowNo}: Planned Finish is required/invalid date`);

    if (it.planned_start && it.planned_finish) {
      if (new Date(it.planned_start) > new Date(it.planned_finish)) {
        errors.push(`Row ${rowNo}: Planned Start must be <= Planned Finish`);
      }
    }

    const key = it.wbs_code;
    if (key) {
      if (seen.has(key)) warnings.push(`Row ${rowNo}: Duplicate WBS "${key}" (last one will be used)`);
      seen.add(key);
    }

    if (it.duration_days === null || it.duration_days === undefined) {
      warnings.push(`Row ${rowNo}: duration_days missing (will be computed)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// -------------------------------------------------------
// TEMPLATE DOWNLOAD
// -------------------------------------------------------
function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMsProjectTemplate() {
  downloadTextFile(
    'MS_Project_Programme_Template.csv',
    `Outline Number,Name,Start,Finish,Duration,% Complete,Actual Start,Actual Finish,Outline Level,Critical,Total Slack,Resource Names
1.0,Preliminaries & Site Setup,2024-03-01,2024-03-15,15 days,100,2024-03-01,2024-03-14,1,No,0,Site Team
1.1,Site Fencing & Hoarding,2024-03-01,2024-03-07,7 days,100,2024-03-01,2024-03-07,2,Yes,0,Subcon A
`
  );
}

export function downloadPrimaveraTemplate() {
  downloadTextFile(
    'Primavera_P6_Programme_Template.csv',
    `WBS Code,Activity ID,Activity Name,Start Date,Finish Date,Planned Duration,Physical % Complete,Actual Start,Actual Finish,Parent WBS,Total Float,Critical Activity,Resources
2.0,,Substructure Works,2024-03-16,2024-06-30,107,85,2024-03-16,,,"0",Yes,
2.1,A1020,Foundation Excavation,2024-03-16,2024-04-15,31,100,2024-03-16,2024-04-12,2.0,0,Yes,Civil Crew
`
  );
}
