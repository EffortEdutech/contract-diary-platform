# AI_PROJECT_CONTEXT

## Project
**Contract Diary Platform**

## Purpose
A contract administration and project controls platform for managing contract-related operational records and workflows in one system.

The platform appears to center around a contract record and then branches into major modules such as:
- Pre-Contract & Tender
- Work Programme
- BOQ
- Work Diary
- Documents / PDF versioning
- Authority / edit enablement

---

## Core Stack
Based on the current project context, the working stack appears to include:
- React frontend
- Supabase
- PostgreSQL
- Service-layer JavaScript files
- SQL schema / migrations

---

## Main Working Principle
Most tasks follow this pattern:

1. open a contract
2. load contract-related module data
3. apply authority / permission logic
4. render module UI
5. perform create / edit / import / version / link actions
6. persist changes through services and database tables

---

## Current Known Focus Area
The most recent confirmed working area is **Work Programme**.

Known relevant files from recent sessions include:
- `src/components/programme/WorkProgrammePanel.jsx`
- `src/components/programme/WorkProgrammeModal.jsx`
- `src/services/programmeService.js`
- `13FEB2026DatabaseSchema.sql`

These should be treated as currently authoritative context files for Work Programme sessions unless replaced by newer confirmed files.

---

## Main Modules
### 1. Contracts
Contract-level shell or page that hosts the other modules.

### 2. Pre-Contract & Tender
Tender / pre-contract data and associated module flow.

### 3. Work Programme
Programme versions, WBS items, imports, baseline/revision handling, weighting, and progress logic.

### 4. BOQ
BOQ items, quantities, values, and likely linking to programme or progress records.

### 5. Work Diary
Daily records, activity entries, progress references, and site-related reporting.

### 6. Documents
Document upload, file versioning, and PDF viewing.

### 7. Authority / Edit Enablement
Controls who can edit or finalize records.

---

## Development Rules
### Rule 1
Do not guess file names, export names, or modal names.

### Rule 2
Do not rename working features casually.

### Rule 3
Always use the real uploaded files as the source of truth.

### Rule 4
For UI changes, include the parent page file when possible.

### Rule 5
For data logic changes, include the relevant service file and latest SQL schema or migration.

### Rule 6
When refactoring, document what was removed, changed, or renamed.

---

## Minimum Upload Pack for a Session
At minimum, upload:
- this file
- `DEVELOPER_SYSTEM_MAP.md`
- `progress.md`
- `current_issues.md`
- files directly related to the task
- exact error log if something is broken

---

## Work Programme Minimum Upload Pack
- parent page file (`WorkProgrammePage.jsx` or `ContractDetail.jsx`)
- `WorkProgrammePanel.jsx`
- `WorkProgrammeModal.jsx`
- related modal files
- `programmeService.js`
- latest SQL migration or schema
- exact error message
- progress and issue docs

---

## Current Priority Guidance
Use this section to keep priorities current.

### Likely immediate priorities
- stabilize Work Programme
- preserve confirmed naming
- reduce regression caused by guessed imports or exports
- prepare reliable linking across Work Programme, BOQ, and Work Diary

---

## How to Use This File
Every new session should begin with this file plus:
- `DEVELOPER_SYSTEM_MAP.md`
- `progress.md`
- `current_issues.md`

Then attach the exact module files related to the task.
