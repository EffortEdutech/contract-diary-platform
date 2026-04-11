# REAL_FILE_INDEX

## Purpose

This document lists the **real confirmed files** used in the Contract
Diary Platform. It prevents development errors caused by guessing file
names, component names, or service exports.

Whenever a new file becomes part of the system, it should be recorded
here.

------------------------------------------------------------------------

# 1. Root Project Structure (Frontend)

    src/
       pages/
       components/
       services/
       utils/

------------------------------------------------------------------------

# 2. Contract Module

Parent container for most modules.

Expected location:

    src/pages/contracts/

Typical files:

    ContractDetail.jsx
    WorkProgrammePage.jsx

Responsibilities: - Load contract context - Mount contract modules -
Control tab navigation

------------------------------------------------------------------------

# 3. Work Programme Module

Current active development area.

Confirmed files:

    src/components/programme/WorkProgrammePanel.jsx
    src/components/programme/WorkProgrammeModal.jsx
    src/services/programmeService.js

Possible additional modals (confirm exact names):

    ImportProgrammeCsvModal.jsx
    ProgrammeVersionModal.jsx
    ProgrammeLinkBoqModal.jsx

------------------------------------------------------------------------

# 4. Service Layer

Services act as the **data access layer**.

Confirmed file:

    src/services/programmeService.js

Typical responsibilities:

-   fetching programme versions
-   fetching programme items
-   creating programme versions
-   creating programme items
-   deleting programme items
-   bulk import programme items

These functions interact with **Supabase queries**.

------------------------------------------------------------------------

# 5. Database Schema Files

Schema reference files are important because UI logic often depends on
database fields.

Example schema file already used in development:

    13FEB2026DatabaseSchema.sql

Important tables:

    contracts
    programme_versions
    programme_items

------------------------------------------------------------------------

# 6. Utility Files

Utilities often affect permission and authority logic.

Known utility example:

    utils/contractAuthority.js

Typical responsibilities:

-   determining edit permission
-   checking authority roles
-   enabling/disabling UI actions

------------------------------------------------------------------------

# 7. Documents Module

Handles document versioning and PDF viewing.

Expected files:

    DocumentPanel.jsx
    DocumentVersionsModal.jsx
    PdfViewerModal.jsx
    documentService.js

Status: Recently completed PDF version workflow.

------------------------------------------------------------------------

# 8. Future Modules

## BOQ Module

Expected files:

    BOQPanel.jsx
    BOQModal.jsx
    boqService.js

## Work Diary Module

Expected files:

    WorkDiaryPanel.jsx
    WorkDiaryEntryModal.jsx
    workDiaryService.js

------------------------------------------------------------------------

# 9. File Confirmation Rule

Before using any file in development:

1.  Confirm the file exists in the repository.
2.  Confirm the component name exported from the file.
3.  Confirm the service exports from the service file.
4.  Confirm database fields used by the service.

Never assume names.

------------------------------------------------------------------------

# 10. How This File Is Maintained

Whenever a module is stabilised:

Add:

-   confirmed component files
-   confirmed modal files
-   confirmed service files
-   confirmed database schema references

This document should always represent the **true file structure of the
system**.
