# SYSTEM_DATA_FLOW

## Purpose
This document explains how data moves through the Contract Diary Platform.

It is meant to help with:
- debugging missing or wrong data
- understanding where business logic lives
- knowing whether a problem is in UI, service, Supabase, or database design
- planning future integration between Work Programme, BOQ, Work Diary, and Documents

---

## 1. Core Data Flow Principle

For this platform, data usually moves through this chain:

```text
React UI
   ↓
Component State / Props
   ↓
Service Layer
   ↓
Supabase Query
   ↓
PostgreSQL Tables
   ↓
Returned Data
   ↓
Service Formatting / Mapping
   ↓
React UI Render
```

This means a visible UI issue may actually come from:
- wrong props
- wrong service function
- wrong query
- wrong table field
- wrong mapping after query
- wrong UI rendering logic

---

## 2. High-Level System Data Flow

```text
User Action
   ↓
Contract Page / Module Page
   ↓
Module Component
   ↓
Modal / Form / Action Handler
   ↓
Service Function
   ↓
Supabase API Call
   ↓
Database Table / View / Function
   ↓
Response Data
   ↓
Component State Update
   ↓
Rendered UI
```

---

## 3. Contract-Centered Data Flow

The system appears to be built around a contract record.

```text
contracts
   │
   ├── programme_versions
   │      └── programme_items
   │
   ├── boq_items
   │
   ├── work_diary_entries
   │
   └── documents
```

### Meaning
- `contracts` is the root record
- child module tables usually depend on `contract_id`
- module pages/components should always know which contract they are working on

### Common risk
If `contract_id` is missing, wrong, or not passed correctly:
- data may not load
- wrong contract data may appear
- inserts may fail
- edits may affect the wrong records

---

## 4. Frontend Data Flow

### Typical page flow

```text
Route / Page
   ↓
Get contractId / params
   ↓
Load user/auth context
   ↓
Render module component
   ↓
Module calls service methods
```

### Typical component responsibilities
- receive contract id and other parent props
- hold local UI state
- trigger load functions
- open modals
- call create/edit/delete handlers
- refresh data after mutation

### Common UI-level failure points
- parent page not passing required props
- modal state not syncing
- stale local state after save/delete
- import name or component name mismatch
- render logic expecting fields not returned by the query

---

## 5. Service Layer Data Flow

The service layer is the main bridge between UI and database.

Known example:
- `src/services/programmeService.js`

### Service responsibilities
- build queries
- fetch records
- insert new rows
- update rows
- delete rows
- provide helper constants
- apply business rules such as version defaults or hierarchy derivation

### Typical service flow

```text
UI Component
   ↓
programmeService function
   ↓
Supabase from(...).select()/insert()/update()/delete()
   ↓
PostgreSQL table
   ↓
response / error
   ↓
service returns result to UI
```

### Common service-level failure points
- UI imports a function that service does not export
- service returns a shape different from what UI expects
- service uses wrong table or field name
- service rule conflicts with current database design
- service silently swallows errors and UI does not show them clearly

---

## 6. Work Programme Data Flow

This is the most important active module right now.

### Known files
- `src/components/programme/WorkProgrammePanel.jsx`
- `src/components/programme/WorkProgrammeModal.jsx`
- `src/services/programmeService.js`

### Known tables
- `programme_versions`
- `programme_items`

### Planned flow

```text
Contract page / tab
   ↓
WorkProgrammePanel.jsx
   ↓
programmeService.js
   ├── getProgrammeVersions()
   ├── getProgrammeItems()
   ├── createProgrammeVersion()
   ├── createProgrammeItem()
   └── other confirmed functions
   ↓
Supabase queries
   ↓
programme_versions / programme_items
   ↓
returned programme data
   ↓
panel renders table/tree/version views
```

### Work Programme mutation flow

```text
User clicks add/edit/import
   ↓
WorkProgrammeModal or other modal
   ↓
form submit handler
   ↓
programmeService mutation
   ↓
database insert/update/delete
   ↓
reload versions/items
   ↓
UI refresh
```

### Known current risks
- `WorkProgrammePanel.jsx` importing names that are not real
- service export mismatch such as `PROGRAMME_WEIGHT_MODES`
- modal file name mismatch such as `ImportProgrammeCsvModal`
- hierarchy fields not aligning with actual table structure

---

## 7. Programme Version and Item Flow

### Version header flow

```text
programme_versions
   ↓
selected version in UI
   ↓
load corresponding programme_items
```

### Item hierarchy flow

```text
programme_items
   ├── id
   ├── programme_version_id
   ├── contract_id
   ├── wbs
   ├── parent_id
   ├── level
   └── description
```

### Logic notes
- version selection changes which rows should display
- parent-child structure likely depends on `parent_id`
- UI may derive tree/nesting from `wbs`, `level`, and `parent_id`
- wrong derivation logic can cause broken nesting or rollups

---

## 8. BOQ Data Flow

BOQ file names are not fully confirmed yet, but expected flow is:

```text
Contract page
   ↓
BOQ component
   ↓
boqService.js
   ↓
boq_items table
   ↓
returned BOQ rows
   ↓
UI render
```

### Future integration flow

```text
programme_items
   ↓
linking logic
   ↓
boq_items
```

### Likely future use
- map planned tasks to commercial items
- compare planned structure against measured quantities
- support progress and claim logic later

---

## 9. Work Diary Data Flow

Expected flow:

```text
Contract page
   ↓
Work Diary component
   ↓
workDiaryService.js
   ↓
work_diary_entries
   ↓
returned diary records
   ↓
UI render
```

### Future integration flow

```text
work_diary_entries
   ↓
references / links
   ↓
programme_items
   ↓
possibly linked to boq_items
```

### Likely future use
- record actual site progress by day
- relate actual work done to planned programme tasks
- build planned vs actual reporting

---

## 10. Documents Data Flow

Recent sessions indicate PDF versioning/document flow is already more mature.

### Expected flow

```text
Document component
   ↓
documentService.js
   ↓
documents metadata table
   ↓
storage file path / PDF file
   ↓
versions modal / PDF viewer modal
   ↓
UI render
```

### Main document subflows
- upload document
- upload new version
- list versions
- open PDF viewer

### Common failure points
- metadata saved but file path wrong
- file exists in storage but version record missing
- version modal reads wrong document id
- viewer receives wrong URL or stale state

---

## 11. Authority / Permission Data Flow

Authority logic seems to influence whether users can edit or finalize.

Known likely utility:
- `utils/contractAuthority.js`

### Typical flow

```text
user auth context
   ↓
contract authority resolution
   ↓
component receives canEdit / isLocked / authority flags
   ↓
buttons/inputs enabled or disabled
```

### Common failure points
- UI assumes edit allowed when authority says no
- lock/finalization state not passed to child component
- service allows mutation even when UI should be locked
- inconsistent rules across modules

---

## 12. Error Location Guide

When something goes wrong, use this simple diagnosis path.

### Problem: button exists but action does nothing
Check:
- click handler
- modal state
- submit handler
- service call
- error handling

### Problem: data saved but not visible
Check:
- reload after mutation
- selected version/filter
- contract id
- query conditions
- render mapping

### Problem: build fails with import/export error
Check:
- real file name
- real export name
- `REAL_FILE_INDEX.md`
- `MODULE_DEPENDENCY_MAP.md`
- source service/component file

### Problem: wrong rows appear
Check:
- contract id
- selected version id
- parent/child mapping
- stale state
- query filters

### Problem: insert/update fails
Check:
- required fields
- table field names
- foreign keys
- RLS/policy if present
- service payload shape

---

## 13. Safe Debugging Flow

Use this path when debugging data issues:

```text
1. Identify visible issue in UI
2. Find the exact component responsible
3. Find the exact service function called
4. Find the exact table/query involved
5. Compare returned data shape with expected UI shape
6. Confirm props/state refresh logic
7. Confirm permissions/locking are not blocking the action
```

---

## 14. Future Integrated Data Flow Vision

Long-term, the system likely wants this connected flow:

```text
Contract
   ↓
Work Programme defines planned structure
   ↓
BOQ defines quantity/value structure
   ↓
Work Diary records actual work done
   ↓
Documents store evidence/supporting records
   ↓
Authority layer controls edit/finalization
```

### Full comparison vision

```text
Planned Work        → programme_items
Measured Work       → boq_items
Actual Daily Work   → work_diary_entries
Evidence            → documents
Control             → authority logic
```

This will enable richer reporting such as:
- planned vs actual
- task vs quantity progress
- diary-supported progress evidence
- contract-level record completeness

---

## 15. Working Principle

For this repo:

**Every UI problem should be traced through the full data path: component → service → query → table → returned shape → rendered state.**

That is the safest way to debug without guessing.
