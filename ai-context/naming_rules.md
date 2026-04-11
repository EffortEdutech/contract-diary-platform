# naming_rules

## Purpose
This file prevents broken imports, export mismatches, and naming drift.

Use it to record all names that are confirmed and should not be guessed.

---

## Rules

### Rule 1
Use the real file name, not an assumed file name.

### Rule 2
Use the real export name from the service file, not an assumed export name.

### Rule 3
If a component or constant is renamed, update every usage and record the change here.

### Rule 4
Before refactoring, confirm whether the existing naming is already depended on elsewhere.

---

## Confirmed File Names
Fill this with real confirmed file paths.

- `src/components/programme/WorkProgrammePanel.jsx`
- `src/components/programme/WorkProgrammeModal.jsx`
- `src/services/programmeService.js`

---

## Confirmed Component Names
Fill this with actual exported component names.

- `WorkProgrammePanel`
- `WorkProgrammeModal`

---

## Confirmed Service Exports
Record actual exports from the service file once confirmed.

Example:
- `PROGRAMME_VERSION_TYPES`
- `createProgrammeItem`
- `createProgrammeVersion`
- `getProgrammeItems`
- `getProgrammeVersions`

Add new confirmed exports here and remove wrong assumptions.

---

## Confirmed Table Names
Record actual database table names once confirmed.

Example:
- `programme_versions`
- `programme_items`

---

## Known Naming Risks
Use this section to note any naming mismatch risk.

Example:
- UI imports `PROGRAMME_WEIGHT_MODES` but service may not export it
- UI references `ImportProgrammeCsvModal` but actual file name may differ

---

## Rename Log
Whenever something is intentionally renamed, record it here.

### Rename Entry Template
**Old name:**  
**New name:**  
**Reason:**  
**Files updated:**  
**Date:**  
