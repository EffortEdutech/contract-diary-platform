# MODULE_DEPENDENCY_MAP

## Purpose
This document maps how important files depend on each other so development can continue without guessing imports, exports, or relationships.

It is especially useful for:
- debugging broken imports
- understanding parent and child components
- knowing which files must be uploaded together in a session
- preventing accidental refactors that remove working dependencies

---

## 1. Main Principle

For this project, a file should never be edited in isolation if it depends on:
- a parent page
- a child modal/component
- a service file
- a utility/helper
- a schema or migration affecting its data

The dependency map helps define the minimum safe context pack for each task.

---

## 2. Contract-Centered Dependency Structure

```text
Contract Page / Contract Detail
      │
      ├── Work Programme Module
      │      ├── WorkProgrammePanel.jsx
      │      ├── WorkProgrammeModal.jsx
      │      ├── Import / Version / Link modals
      │      ├── programmeService.js
      │      └── programme tables / migrations
      │
      ├── BOQ Module
      │      ├── BOQ panel/components
      │      ├── BOQ modals
      │      ├── boqService.js
      │      └── BOQ tables / migrations
      │
      ├── Work Diary Module
      │      ├── diary components
      │      ├── diary modals
      │      ├── workDiaryService.js
      │      └── diary tables / migrations
      │
      └── Documents Module
             ├── document components
             ├── version/viewer modals
             ├── documentService.js
             └── document tables / storage config
```

---

## 3. Work Programme Dependency Map

This is the most important currently active module.

### Known current files

```text
WorkProgrammePage.jsx or ContractDetail.jsx
      │
      └── WorkProgrammePanel.jsx
             │
             ├── WorkProgrammeModal.jsx
             ├── ImportProgrammeCsvModal.jsx   [confirm actual file name]
             ├── Version-related modal(s)
             ├── BOQ linking modal(s)
             ├── helper/util files
             └── programmeService.js
                     │
                     ├── getProgrammeVersions()
                     ├── getProgrammeItems()
                     ├── createProgrammeVersion()
                     ├── createProgrammeItem()
                     ├── other confirmed exports
                     └── Supabase / database calls
                             │
                             ├── programme_versions
                             └── programme_items
```

### Dependency Notes
- `WorkProgrammePanel.jsx` should not be edited without also checking:
  - its parent page
  - all imported modals
  - `programmeService.js`
- If a build error mentions a missing modal, the real modal file must be confirmed before changing imports.
- If a build error mentions a missing export, `programmeService.js` is the source of truth.

---

## 4. Example of the Earlier Failure Pattern

### Missing modal dependency

```text
WorkProgrammePanel.jsx
      └── imports ImportProgrammeCsvModal
```

If `ImportProgrammeCsvModal` does not exist, has a different file name, or exports a different component name, build will fail.

### Missing service export dependency

```text
WorkProgrammePanel.jsx
      └── imports PROGRAMME_WEIGHT_MODES from programmeService.js
```

If `programmeService.js` does not export `PROGRAMME_WEIGHT_MODES`, build will fail.

### Lesson
Whenever editing `WorkProgrammePanel.jsx`, the minimum safe review set is:

```text
- parent page file
- WorkProgrammePanel.jsx
- child modal files
- programmeService.js
- latest programme schema / migration
- exact error output
```

---

## 5. BOQ Dependency Map

This section should be updated once actual BOQ files are confirmed.

### Expected structure

```text
ContractDetail.jsx or BOQ page
      │
      └── BOQ main panel
             │
             ├── BOQ edit/create modal(s)
             ├── BOQ import modal(s)
             ├── BOQ link modal(s)
             ├── boqService.js
             └── BOQ tables / migrations
```

### Expected uploaded files for BOQ work
- parent page file
- BOQ panel/component file
- BOQ modals
- BOQ service file
- relevant SQL migration/schema
- exact error text

---

## 6. Work Diary Dependency Map

This section should be updated once actual Work Diary files are confirmed.

### Expected structure

```text
ContractDetail.jsx or Work Diary page
      │
      └── Work Diary main component
             │
             ├── diary entry modal(s)
             ├── diary detail/view modal(s)
             ├── workDiaryService.js
             └── diary tables / migrations
```

### Expected uploaded files for Work Diary work
- parent page file
- diary component file
- diary modal files
- diary service file
- relevant SQL migration/schema
- exact error text

---

## 7. Documents Module Dependency Map

This section is based on recent completed work around PDF versioning.

### Expected structure

```text
ContractDetail.jsx or Documents container
      │
      └── document list / document panel
             │
             ├── upload modal
             ├── versions modal
             ├── PDF viewer modal
             ├── documentService.js
             └── documents tables / storage logic
```

### Notes
Document tasks usually require:
- parent page or container
- document UI component
- versions modal
- viewer modal
- service file
- exact upload/view/version issue description

---

## 8. Utility Dependency Layer

Many modules may depend on shared helpers.

### Common utility examples
- `utils/contractAuthority.js`
- date helpers
- formatting helpers
- hierarchy/WBS helpers
- linking helpers

### Rule
If a component uses a shared helper that affects logic, that helper should be included in the upload pack.

---

## 9. Database Dependency Layer

Frontend files often depend indirectly on database design through service files.

### Typical dependency chain

```text
Component
   ↓
Service
   ↓
Supabase query
   ↓
Database table / view / function / policy
```

### Rule
If a task involves:
- missing fields
- wrong sorting
- broken version logic
- linking logic
- unexpected nulls
- failed inserts/updates

then the relevant SQL migration or schema file should be uploaded too.

---

## 10. Safe Upload Packs by Dependency

### Work Programme safe pack
```text
- parent page file
- WorkProgrammePanel.jsx
- WorkProgrammeModal.jsx
- all related modals
- programmeService.js
- relevant utility files
- latest SQL migration/schema
- exact error text
- progress.md
- current_issues.md
```

### BOQ safe pack
```text
- parent page file
- BOQ main component
- BOQ modals
- BOQ service
- related helpers
- relevant SQL
- exact error text
- progress.md
- current_issues.md
```

### Work Diary safe pack
```text
- parent page file
- Work Diary main component
- diary modals
- diary service
- related helpers
- relevant SQL
- exact error text
- progress.md
- current_issues.md
```

### Documents safe pack
```text
- parent page file or container
- document component
- upload/version/viewer modals
- documentService.js
- relevant schema/storage logic
- exact issue text
- progress.md
- current_issues.md
```

---

## 11. File Dependency Checklist Before Editing

Before changing any file, confirm:

- What is the parent file that renders this file?
- What child files does this file import?
- What service file does it call?
- What helper files influence its logic?
- What database tables or migrations influence its data?
- Are all imported names real and confirmed?
- Are all exported names real and confirmed?

If any answer is unknown, do not guess. Upload the real file.

---

## 12. Rename Safety Rules

If renaming any file, export, or component:

1. confirm all imports/usages first
2. update every reference
3. record the rename in `naming_rules.md`
4. update `MODULE_DEPENDENCY_MAP.md` if the dependency path changes
5. update `progress.md` and `ai_session_handover.md` if the rename affects current work

---

## 13. Recommended Maintenance Rule

Whenever a new module becomes active, add its real dependency tree here.

This file should always answer:

- Which file is the parent entry?
- Which files are children/modals?
- Which service controls data?
- Which utilities affect logic?
- Which tables support the module?

---

## 14. Current Known High-Risk Dependency Area

Right now, the highest-risk dependency area is:

```text
WorkProgrammePanel.jsx
      ├── imported modal names
      ├── service export names
      ├── parent page props
      └── programme table logic
```

This file should always be worked on together with its dependency set.

---

## 15. Working Principle

For this repo:

**A broken build often comes from a broken dependency assumption, not from the visible file alone.**

That is why development should follow the dependency map, not isolated file editing.
