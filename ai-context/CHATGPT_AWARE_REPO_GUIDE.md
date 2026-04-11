# CHATGPT_AWARE_REPO_GUIDE

## 1. Purpose
This guide explains how to turn the repo into a **ChatGPT-aware repo** so future development sessions become faster, more accurate, and less dependent on repeated explanation.

A ChatGPT-aware repo is not a special Git feature. It simply means the repo contains a small set of context files that make it easy for an AI assistant to understand:
- what the system does
- how modules connect
- what is already finished
- what is currently broken
- which names are confirmed
- where to look first

---

## 2. Main Principle
Do not expect the assistant to understand the whole repo from a link alone.

The best workflow is:
1. keep core project context files inside the repo
2. upload only the relevant files for the current task
3. keep progress and issues updated
4. keep naming and architecture documented so they are not guessed

---

## 3. Recommended Folder Structure
Create this folder in the root of the repo:

```text
/ai-context
```

Recommended contents:

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

Also create this file in the repo root:

```text
/START_HERE_FOR_AI.md
```

---

## 4. What Each File Should Contain

### 4.1 `START_HERE_FOR_AI.md`
This is the top-level entry point.
It should tell the assistant where to start reading.

Suggested content:

```md
# START HERE FOR AI

Please read these files first:
1. /ai-context/AI_PROJECT_CONTEXT.md
2. /ai-context/DEVELOPER_SYSTEM_MAP.md
3. /ai-context/progress.md
4. /ai-context/current_issues.md

Then review the task-specific uploaded files.
```

### 4.2 `AI_PROJECT_CONTEXT.md`
This should be a short repo summary.

Suggested sections:
- project name
- purpose
- stack
- major modules
- important rules
- current development phase
- current priorities

### 4.3 `DEVELOPER_SYSTEM_MAP.md`
This should explain:
- architecture overview
- module relationships
- page → component → service → database flow

### 4.4 `progress.md`
This should answer:
- what is completed
- what is in progress
- what is blocked
- what comes next

### 4.5 `current_issues.md`
This should answer:
- what is broken now
- exact error messages
- affected files
- likely cause
- priority

### 4.6 `ai_session_handover.md`
This should summarize the most recent work session.
It helps the next session continue without losing momentum.

### 4.7 `database_tables.md`
This should list:
- table name
- purpose
- important keys
- relationships
- notes

### 4.8 `naming_rules.md`
This should list confirmed names such as:
- component names
- modal names
- service export names
- route names
- constant names

This is very important for avoiding broken imports and guessed naming.

---

## 5. Best Workflow for Every Development Session

### Step 1: update context docs
Before starting a new session, update at least:
- `progress.md`
- `current_issues.md`
- `ai_session_handover.md` if the last session changed important things

### Step 2: upload a focused task pack
Do not upload the whole repo unless necessary.
Upload:
- AI context docs
- files directly related to the task
- exact error output
- latest SQL if database-related

### Step 3: keep the assistant on real files only
The assistant should work only from uploaded or clearly confirmed files.
Do not allow guessing of:
- import names
- export names
- modal names
- table names

### Step 4: record the outcome
At the end of the session, update:
- what was finished
- what remains open
- what file names were confirmed
- what should be done next

---

## 6. Suggested Upload Packs by Situation

### 6.1 Bug fix session
Upload:
- `/ai-context/AI_PROJECT_CONTEXT.md`
- `/ai-context/DEVELOPER_SYSTEM_MAP.md`
- `/ai-context/progress.md`
- `/ai-context/current_issues.md`
- the file with the bug
- all files imported by that file if they affect the issue
- exact error output

### 6.2 New feature session
Upload:
- context docs
- parent page file
- module component files
- service file
- latest migration/schema
- any related helper files

### 6.3 Database session
Upload:
- context docs
- latest schema snapshot or migration
- service files using the tables
- component files that depend on the data

---

## 7. Recommended Prompt Format for Future Sessions
Use a consistent prompt like this:

```text
Please refer to these project context files first:
- ai-context/AI_PROJECT_CONTEXT.md
- ai-context/DEVELOPER_SYSTEM_MAP.md
- ai-context/progress.md
- ai-context/current_issues.md

Task:
[describe the exact task]

Files uploaded:
- [list files]

Current error or objective:
[paste exact error / requirement]
```

This makes each session much more stable.

---

## 8. Example for This Repo
For a Work Programme issue, your session pack could be:

```text
ai-context/AI_PROJECT_CONTEXT.md
ai-context/DEVELOPER_SYSTEM_MAP.md
ai-context/progress.md
ai-context/current_issues.md
src/pages/contracts/WorkProgrammePage.jsx
src/components/programme/WorkProgrammePanel.jsx
src/components/programme/WorkProgrammeModal.jsx
src/services/programmeService.js
latest migration.sql
exact error log
```

That is enough for a very effective coding session.

---

## 9. Suggested Rules to Add to the Repo
You can optionally add these repo rules into `AI_PROJECT_CONTEXT.md` or `naming_rules.md`:

### Rule 1
Never rename files, exports, or constants without confirming all usages.

### Rule 2
Do not invent component names or modal names.

### Rule 3
Any session involving database logic should include the latest relevant SQL.

### Rule 4
Any session involving UI logic should include the parent page file and service file.

### Rule 5
Always preserve existing working features unless explicitly replacing them.

### Rule 6
When refactoring, document what was removed and why.

---

## 10. Minimum Viable ChatGPT-Aware Repo
If you want the smallest setup that still works well, create only these files first:

```text
/ai-context/AI_PROJECT_CONTEXT.md
/ai-context/DEVELOPER_SYSTEM_MAP.md
/ai-context/progress.md
/ai-context/current_issues.md
/START_HERE_FOR_AI.md
```

This is already enough to dramatically improve continuity across sessions.

---

## 11. Stronger Version of the Same System
Later, you can expand with:

```text
/ai-context/ai_session_handover.md
/ai-context/database_tables.md
/ai-context/naming_rules.md
/ai-context/module_map.md
```

This is useful when the codebase becomes larger and more interconnected.

---

## 12. What Not To Do
Avoid these common mistakes:

- giving only the repo link and expecting complete repo understanding
- uploading one file without the related service or parent file
- not including exact error text
- asking to continue from an earlier session without updated handover docs
- letting names drift between UI, service, and database layers

---

## 13. Practical Benefit
A repo becomes ChatGPT-aware when the assistant can answer these questions quickly and accurately:

- What does this project do?
- What module are we working on now?
- What files are authoritative for this module?
- What is already completed?
- What is broken right now?
- What names are confirmed and must not be guessed?
- What should be done next?

If your repo can answer those questions through a few maintained markdown files, future AI-assisted development becomes much more reliable.

---

## 14. Recommended Next Files to Create
After this guide, the best next files to create are:
- `AI_PROJECT_CONTEXT.md`
- `progress.md`
- `current_issues.md`
- `START_HERE_FOR_AI.md`

These four files plus this guide and the system map are enough to establish a strong workflow.

---

## 15. Final Working Principle
For this project, the best rule is:

**Use GitHub for source control, but use a small AI context layer inside the repo for continuity, handover, and safe development assistance.**
