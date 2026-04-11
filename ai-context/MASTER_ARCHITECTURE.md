# MASTER_ARCHITECTURE

## Contract Diary Platform

**Author:** Darya Malak\
**Purpose:** Provide a clear architecture overview of the entire
platform so developers and AI assistants can understand how all modules
connect.

------------------------------------------------------------------------

# 1. System Philosophy

The platform is **contract‑centric**.

Everything in the system ultimately belongs to a **Contract**.

Each contract acts as the **root container** for operational modules.

These modules collectively form the **digital contract record**.

Core modules:

-   Work Programme
-   BOQ
-   Work Diary
-   Documents
-   Authority / Permissions

------------------------------------------------------------------------

# 2. High Level Architecture

    Contract
    │
    ├── Work Programme
    │     ├── Programme Versions
    │     └── Programme Items
    │
    ├── BOQ
    │     └── BOQ Items
    │
    ├── Work Diary
    │     └── Daily Records
    │
    ├── Documents
    │     └── File Versions
    │
    └── Authority
          └── Edit / Lock Control

------------------------------------------------------------------------

# 3. Technology Architecture

## Frontend

React component system

Typical structure:

    src/
       pages/
          contracts/

       components/
          programme/
          boq/
          diary/
          documents/

       services/
          programmeService.js
          boqService.js
          diaryService.js

------------------------------------------------------------------------

## Backend

Supabase

Components:

-   PostgreSQL database
-   Row Level Security
-   Storage for documents
-   API layer

------------------------------------------------------------------------

# 4. Data Architecture

## Root Table

contracts

This table represents the **project contract**.

Most other tables reference this.

    contracts
       │
       ├── programme_versions
       │       └── programme_items
       │
       ├── boq_items
       │
       ├── work_diary_entries
       │
       └── documents

------------------------------------------------------------------------

# 5. Work Programme Architecture

The **Work Programme** represents the planned project structure.

### Tables

programme_versions

Represents each revision of the programme.

Example fields

-   id
-   contract_id
-   version_number
-   version_type
-   baseline_flag

programme_items

Represents tasks in the programme.

Example fields

-   id
-   programme_version_id
-   contract_id
-   wbs
-   parent_id
-   level
-   description

Hierarchy is created using **parent_id**.

------------------------------------------------------------------------

# 6. BOQ Architecture

BOQ represents commercial measurement.

Table

boq_items

Example fields

-   id
-   contract_id
-   item_number
-   description
-   quantity
-   unit
-   rate
-   amount

Future link:

    programme_items
          │
          └── linked to
                 │
                 boq_items

------------------------------------------------------------------------

# 7. Work Diary Architecture

Work Diary records **actual site activity**.

Table

work_diary_entries

Example fields

-   id
-   contract_id
-   date
-   description
-   progress_reference

Future link:

    work_diary_entries
           │
           └── references
                  │
                  programme_items

------------------------------------------------------------------------

# 8. Document Management

Handles project documents.

Table

documents

Example fields

-   id
-   contract_id
-   title
-   file_path
-   version
-   uploaded_by

Documents stored in **Supabase Storage**.

------------------------------------------------------------------------

# 9. Authority System

Controls editing permissions.

Typical states

-   editable
-   locked
-   finalised

Authority logic likely handled in:

    utils/contractAuthority.js

------------------------------------------------------------------------

# 10. Data Flow Example

User opens contract.

    Contract Page
          │
          └── WorkProgrammePanel
                 │
                 └── programmeService.js
                         │
                         └── Supabase Query
                                │
                                └── PostgreSQL Tables

------------------------------------------------------------------------

# 11. Future Integration Roadmap

### Programme → BOQ

Track planned work vs quantity measurement.

### Programme → Work Diary

Track planned vs actual progress.

### BOQ → Work Diary

Track quantity installed per day.

------------------------------------------------------------------------

# 12. Architectural Principles

1.  Contract is the root object
2.  Programme defines planned work
3.  BOQ defines measurable work
4.  Diary defines actual work
5.  Documents store evidence
6.  Authority controls editing

------------------------------------------------------------------------

# 13. Development Rules

Never guess file names.

Never guess service exports.

Always confirm with real source files.

Do not remove working functionality during refactoring.

------------------------------------------------------------------------

# 14. Recommended AI Session Start

Always provide:

    AI_PROJECT_CONTEXT.md
    DEVELOPER_SYSTEM_MAP.md
    MASTER_ARCHITECTURE.md
    progress.md
    current_issues.md

Then upload files being edited.

------------------------------------------------------------------------

# 15. Long Term Vision

The platform becomes a **complete digital contract administration
system** where:

-   Programme controls planning
-   BOQ controls quantities
-   Diary controls site activity
-   Documents store evidence
-   Authority controls compliance

Together they form the **full project history of a construction
contract**.
