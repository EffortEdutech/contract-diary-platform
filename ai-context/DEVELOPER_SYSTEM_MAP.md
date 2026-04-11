# DEVELOPER_SYSTEM_MAP

## 1. Purpose
This document gives a practical system map for the **Contract Diary Platform** so development sessions can continue smoothly without re-discovering structure each time.

It is written for:
- ongoing feature development
- debugging across sessions
- handover between work sessions
- keeping naming, file usage, and module relationships consistent

---

## 2. Project Summary
The platform appears to be a **contract administration / project controls system** with a structure centered around a contract record and several operational modules.

Core working areas include:
- Contracts
- Pre-Contract & Tender
- Work Programme
- BOQ
- Work Diary
- Documents / PDF versions
- Authority / edit enablement

The working pattern is generally:
1. open a contract
2. navigate within contract tabs or modules
3. load related records from Supabase / database tables
4. apply permission / authority checks
5. allow edit, import, versioning, linking, and reporting operations

---

## 3. Suggested High-Level Functional Flow

```text
Contract
  ├── Pre-Contract / Tender
  ├── Work Programme
  │     ├── Programme Versions
  │     ├── Programme Items
  │     ├── Import / CSV
  │     ├── Baseline / Revision handling
  │     └── Progress weighting / rollups
  ├── BOQ
  │     ├── BOQ Items
  │     ├── Link to Programme
  │     └── Quantity / value tracking
  ├── Work Diary
  │     ├── Daily records
  │     ├── Activity / progress capture
  │     └── Possible link to Programme / BOQ
  └── Documents
        ├── Upload
        ├── Versioning
        └── PDF viewing
```

---

## 4. Current Known Work Programme Area
Based on the currently shared project files, the Work Programme area includes at least these important files:

### Frontend Components
- `src/components/programme/WorkProgrammePanel.jsx`
- `src/components/programme/WorkProgrammeModal.jsx`

### Service Layer
- `src/services/programmeService.js`

### Database / Schema Reference
- `13FEB2026DatabaseSchema.sql`

These files should be treated as a minimum context pack whenever Work Programme work is continued.

---

## 5. Known Responsibility by File Type

### 5.1 Page files
Typical role:
- route entry
- gets `contractId` or parent object
- loads user/auth context
- passes props into module components
- controls tab-level mounting

Examples to upload when relevant:
- `WorkProgrammePage.jsx`
- `ContractDetail.jsx`
- contract tab container file

### 5.2 Main panel component
Typical role:
- visible UI for the module
- table/tree rendering
- action buttons
- import/open modal controls
- version switching
- state management for selected rows/items

Example:
- `WorkProgrammePanel.jsx`

### 5.3 Modal / child components
Typical role:
- create/edit/import flows
- item details
- version creation
- CSV import
- link-to-other-module actions

Example:
- `WorkProgrammeModal.jsx`
- import modal
- version modal
- BOQ link modal

### 5.4 Service files
Typical role:
- all data access logic
- CRUD functions
- helper constants
- naming contracts used by UI
- business rules such as version defaults, WBS parent derivation, baseline handling

Example:
- `programmeService.js`

This is one of the most important files to upload because it defines the real API used by frontend components.

### 5.5 Database files
Typical role:
- source of truth for table structures
- foreign keys
- enum-like values
- views / functions / policies
- migration history

Examples:
- schema snapshot SQL
- latest migration affecting the module

---

## 6. Recommended Canonical Module Relationship Map

```text
Contracts
  └── Contract detail page / tab shell
        ├── resolves authority / permissions
        ├── loads contract-level context
        └── mounts each module
              ├── Work Programme module
              │     ├── UI panel
              │     ├── modals
              │     ├── service functions
              │     └── programme tables
              ├── BOQ module
              │     ├── BOQ panel
              │     ├── service functions
              │     └── boq tables
              ├── Work Diary module
              │     ├── diary UI
              │     ├── diary service
              │     └── diary tables
              └── Documents module
                    ├── upload/version modal
                    ├── viewer modal
                    └── document tables/storage
```

---

## 7. Work Programme Data Concepts to Track Carefully
When continuing this module, these concepts should always be documented and not guessed:

- version types
- baseline vs revision logic
- default version numbering
- item hierarchy / WBS structure
- parent-child derivation
- level derivation
- weighting mode / progress calculation mode
- import rules
- delete rules
- whether edits are authority-controlled
- how programme links to BOQ and Work Diary

Any constant names or exports used by components must be confirmed from the actual service file, not assumed.

---

## 8. Common Failure Pattern to Avoid
A major repeated risk in this repo is **assuming file names, export names, or modal names**.

Examples of the type of issue that can happen:
- component imports a file that does not exist
- component imports an export that is not actually provided by the service
- renamed modal or helper breaks build
- service constant names drift from UI expectations

### Rule
For this project:
- do not invent import names
- do not rename exports unless all usages are updated
- always confirm from real uploaded files

---

## 9. Files That Should Usually Be Uploaded Per Task

### For Work Programme tasks
Upload at minimum:
- parent page file (`WorkProgrammePage.jsx` or `ContractDetail.jsx`)
- `WorkProgrammePanel.jsx`
- `WorkProgrammeModal.jsx`
- related modal files
- `programmeService.js`
- latest SQL migration/schema affecting programme tables
- exact build/runtime error text
- `progress.md`
- `current_issues.md`

### For BOQ tasks
Upload at minimum:
- parent page file
- BOQ component files
- BOQ service file
- relevant SQL
- progress and issue docs

### For Work Diary tasks
Upload at minimum:
- parent page file
- diary component files
- diary service file
- relevant SQL
- progress and issue docs

---

## 10. Recommended Repo Documentation Structure
Create and maintain this folder:

```text
/ai-context
```

Recommended files:

```text
/ai-context
  AI_PROJECT_CONTEXT.md
  DEVELOPER_SYSTEM_MAP.md
  progress.md
  current_issues.md
  ai_session_handover.md
  module_map.md
  database_tables.md
  naming_rules.md
```

And one root entry file:

```text
/START_HERE_FOR_AI.md
```

---

## 11. Recommended Meaning of Each AI Context File

### `AI_PROJECT_CONTEXT.md`
Short summary of the whole repo:
- stack
- main modules
- current stage
- key rules
- where to start reading

### `DEVELOPER_SYSTEM_MAP.md`
This file.
Used for architecture and module relationship understanding.

### `progress.md`
Tracks:
- completed
- in progress
- blocked
- next tasks

### `current_issues.md`
Tracks:
- exact current errors
- suspected cause
- affected files
- priority

### `ai_session_handover.md`
Tracks:
- what happened in the last working session
- what changed
- what remains open
- what file names were confirmed

### `database_tables.md`
Tracks:
- important tables
- purpose of each table
- key relationships
- important fields

### `naming_rules.md`
Tracks:
- confirmed component names
- confirmed service export names
- modal names
- naming conventions that must not drift

---

## 12. Suggested Session Workflow

### Start of session
Upload:
- `AI_PROJECT_CONTEXT.md`
- `DEVELOPER_SYSTEM_MAP.md`
- `progress.md`
- `current_issues.md`
- files directly involved in the task
- exact error log

### During session
Whenever a module changes significantly, update:
- `progress.md`
- `current_issues.md`
- `ai_session_handover.md`

### End of session
Record:
- what was completed
- what is partly completed
- confirmed names
- files changed
- next recommended task

---

## 13. Practical Handover Template

```md
## Session Summary
- Module worked on:
- Objective:
- Completed:
- Still broken:
- Confirmed file names:
- Confirmed export names:
- Database tables involved:
- Next task:
```

---

## 14. Immediate Next Improvement for This Repo
The most useful next repo improvement is to create a stable AI context layer so future development does not depend on memory.

Start with these four files first:
- `AI_PROJECT_CONTEXT.md`
- `DEVELOPER_SYSTEM_MAP.md`
- `progress.md`
- `current_issues.md`

That gives enough structure for reliable continuation across sessions.

---

## 15. Working Principle
For this repo, the safest principle is:

**Never let the assistant infer architecture, names, or file relationships when the real file can be uploaded and confirmed.**

That one rule will prevent a large portion of avoidable breakage.
