# Session Wrap-Up: Work Programme Module (Tree View & CSV Import)

**Date:** Feb 2026  
**Status:** Stable, usable, ready to build on  
**Module:** Work Programme (Planning & Scheduling)

---

## 1. What Was Achieved (Alhamdulillah)

### 1.1 Work Programme Core Functionality
The Work Programme module is now **functionally complete at core level**:

- ✅ Programme items can be **imported via CSV**
  - MS Project adapter
  - Primavera P6 adapter
- ✅ Auto-creation of **Baseline Version (v1)** on first import
- ✅ Safe **re-import support**
  - Optional replace existing activities
  - Deduplication by `wbs_code`
- ✅ Programme items are stored in `programme_items`
- ✅ Programme versions stored in `programme_versions`

---

### 1.2 Tree View (WBS Hierarchy)
Programme display now correctly supports **true WBS hierarchy**:

- Parent-child resolution via `parent_id`
- Expand / collapse per node
- Expand All / Collapse All
- Indentation based on depth
- Summary / Task / Milestone icons
- Critical path flag display

This matches **real-world planning structures** (Primavera / MS Project style).

---

### 1.3 Search & Filtering
The following UI capabilities are working and responsive:

- 🔍 Live search (WBS + description)
- Filter by:
  - Status (Not Started / In Progress / Completed)
  - Critical only
  - Hide completed
- Tree-aware filtering (parents retained if children match)

This makes large programmes usable in practice.

---

### 1.4 UI / UX Improvements
- Sticky table headers
- Scrollable body inside page
- Clear status badges
- Percent-complete quick update buttons
- Clean separation of:
  - Versions panel
  - Activities panel

---

### 1.5 Architecture Refactor: Modal → Page
The Work Programme has been **successfully converted** from:

> Modal-based feature  
➡️ to  
> Full page with route, breadcrumb, layout

New route pattern:

/contracts/:id/programme


Components now follow platform standard:
- `WorkProgrammePage.jsx` (page + breadcrumb)
- `WorkProgrammePanel.jsx` (core logic & UI)
- `WorkProgrammeModal.jsx` (wrapper, optional / legacy)

---

## 2. Important Technical Clarifications

### 2.1 Locking Model (Resolved)
- ❌ `contracts.is_locked` **does not exist**
- ✅ Lock state is correctly sourced from:
  - `contract_baseline_locks.is_locked`

This is now handled properly in `WorkProgrammePage.jsx`.

---

### 2.2 Authority Resolution (Root Cause of Disabled Buttons)

**Observed issue:**  
Buttons (`Create Version`, `Import CSV`, `Add Activity`) appeared disabled after moving to page layout.

**Root cause:**  
Authority resolution depends on:
- `contract.status`
- `contract_members.member_role`
- correct data loading order

During modal usage, authority was already resolved upstream (`ContractDetail.js`).  
When moving to page, authority must be **explicitly rebuilt**.

**Current state:**
- Page now correctly loads:
  - contract
  - member role
  - lock state
- Authority resolution is technically correct
- UI disablement is no longer architectural, only policy-based

This is **understood and solvable**, not a blocker.

---

## 3. What We Deliberately Did NOT Finalise Yet

### 3.1 Authority Fine-Tuning (Deferred by Choice)
The following was intentionally **not over-engineered yet**:

- Granular permission matrix for programme edits
- Role-based fine-grain rules (owner vs editor vs viewer)
- Contract status transitions (draft → active → locked)

**Reason:**  
These do **not block functional progress** and can be refined later without rework.

---

## 4. Strategic Decision: Next Session Direction

### 4.1 Is “Authority Resolution & Edit Enablement” Important?
**Yes — but not urgent.**

It is important **before production / multi-user rollout**, but **not required** to continue core system integration.

---

### 4.2 Recommended Next Session (Priority Order)

Instead of authority polishing, the **higher-value next step** is:

## 👉 Link Work Programme ↔ BOQ ↔ Work Diary

This aligns with **real construction workflows**:

1. **BOQ defines scope & quantities**
2. **Programme defines sequence & time**
3. **Diary records actual progress**
4. **Progress % is derived, not manually guessed**

---

## 5. Proposed Next Session Scope

### Session Title
**Programme–BOQ–Diary Integration (Progress Logic Phase)**

### Objectives
- Add `linked_boq_item_id` usage in Programme
- Define % completion formula based on:
  - BOQ measured quantity
  - Diary records
- Enable:
  - Programme-driven progress
  - EOT / delay analysis foundation
- Prepare for:
  - Claims
  - As-built programme
  - Delay narratives

---

## 6. Current State Summary (TL;DR)

| Area | Status |
|---|---|
| Programme Import | ✅ Stable |
| Tree View | ✅ Stable |
| Search & Filters | ✅ Stable |
| Page Layout | ✅ Stable |
| Locking Model | ✅ Correct |
| Authority Logic | ⚠️ Deferred fine-tuning |
| Programme–BOQ Link | ⏭️ Next |
| Programme–Diary Link | ⏭️ Next |

---

## 7. Closing Note

This session delivered a **major structural milestone**.  
The Work Programme module is no longer a prototype — it is a **proper planning engine**.

Deferring authority fine-tuning is the **right call**.  
Linking Programme ↔ BOQ ↔ Diary will unlock **real contractual value**.

**Ready for next session, in shā’ Allāh.**

— End of Session —

## NEXT SESSION PLAN

1️⃣ What “Authority Resolution & Edit Enablement” really is (in plain language)

That session is NOT about UI buttons.

It is about answering one hard question for the entire system:

“At this moment in the contract lifecycle, who is allowed to:

create,

modify,

lock,

revise,

or rely on
the Work Programme?”

Right now, you are feeling the pain because:

Buttons are disabled

authority is sometimes null

isLocked logic moved from modal → page → panel

contract_members schema mismatch surfaced

👉 All of that is symptoms of authority not being finalised yet.

2️⃣ Why linking Programme ↔ BOQ ↔ Diary feels more “important” (and you’re not wrong)

From a real construction practice perspective (Malaysia / CIPAA reality):

The value chain is:

BOQ  →  Work Programme  →  Diary Records  →  Progress / Claims / Delay


And you already got this 100% right earlier when you said:

“In real world, work programme are created based on BOQ which spells out the job scope…”

So from a business and domain angle, the next high-value milestone is:

✅ Programme ↔ BOQ ↔ Diary linkage

Because this unlocks:

% completion logic

Measured progress

Claim support

Delay analysis (later)

Authority does not block understanding or designing these links.

3️⃣ The risk if you skip authority without a temporary rule

Here is the danger zone ⚠️ (this is important):

If you proceed without any authority rule at all, you will get:

Random disabled buttons

Confusing conditions (canEdit, isLocked, authority?.canEditProgramme)

More time lost debugging UI instead of building features

That’s what just happened in this session.

4️⃣ The correct compromise (this is my recommendation)
✅ DEFER full Authority Resolution
❗ BUT introduce a Temporary Authority Policy
Temporary Rule (Simple & Safe)

For the next few sessions, hard-code this rule in WorkProgrammePanel:

const canEdit = !isLocked && contract?.status === 'draft';


Ignore:

member roles

invitation status

reviewer / editor / viewer

contract_members complexity

📌 Why this works:

Matches real-world: draft = editable

Keeps UI predictable

Unblocks feature development

You can replace this later with full authority logic

Think of this as “Construction Phase Mode”
Authority becomes strict only later (Claims / Final Account phase)

5️⃣ What your NEXT session SHOULD be (recommended)
🚀 Next Session:
Programme–BOQ–Diary Linkage (Progress Engine v1)
Concrete objectives (clear & exciting):

Link Programme Item ↔ BOQ Item

programme_items.linked_boq_item_id

Define progress calculation rule

BOQ-weighted % complete

Pull Diary quantities → Programme progress

Show:

Programme % complete

BOQ measured % complete

Variance

This is where your system becomes more than CRUD.

6️⃣ Where “Authority Resolution” should REALLY live

Not next session.

It should be its own dedicated phase, like:

🔐 Authority & Locking Finalisation (Later Phase)

After:

Programme is stable

BOQ is stable

Diary workflow is proven

That session will:

Cleanly redesign resolveContractAuthority

Finalise locking tables

Decide when data becomes legally frozen

Align with CIPAA / contract clauses

Trying to do that now is like arguing about paint colour while the slab is still curing 🧱

## SUGGESTED AUTHORITY
 
user_profiles.role = 'subcontractor'              // WHAT company
user_profiles.user_role = 'admin'                 // Default power
contract_members.member_role (Contract A) = 'editor'
contract_members.member_role (Contract B) = 'viewer'

1. user_profiles.role ✅
Purpose: Company Type / Organization Identity
Values:

main_contractor
subcontractor
consultant
supplier

Meaning: This identifies WHAT TYPE OF COMPANY the user belongs to.

2. user_profiles.user_role ✅
Purpose: System-Level Default Permission
Values:

owner
admin
editor
viewer
submitter
reviewer
approver
auditor
readonly

Meaning: This is the user's DEFAULT SYSTEM-WIDE PERMISSION LEVEL.

3. contract_members.member_role ✅
Purpose: Contract-Specific Permission
Values: (Same as user_role)

owner
admin
editor
viewer
submitter
reviewer
approver
auditor
readonly

Meaning: This is the user's PERMISSION WITHIN A SPECIFIC CONTRACT.

Why We Need All Three?
This is actually a correct multi-layer RBAC design:
Example: Ali from ABC Subcontractor Sdn Bhd

user_profiles.role = 'subcontractor'           ← Company type
user_profiles.user_role = 'admin'              ← Default system permission
contract_members.member_role (Contract A) = 'editor'   ← Contract A permission
contract_members.member_role (Contract B) = 'viewer'   ← Contract B permission


