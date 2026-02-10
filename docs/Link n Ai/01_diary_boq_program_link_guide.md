# ContractDiary Architecture Guideline

## BOQ – Programme – Site Activity Integration

> **System-aligned guideline based on existing ContractDiary database schema**
> Updated to incorporate **Ledger Doctrine** and **Many-to-Many BOQ ↔ Programme Mapping**

---

## 1. Core Principle (System Truth Model)

### Governance Model

BOQ (Commercial Authority) ↔ Programme (Execution / Time Authority)
↘ ↙
ContractDiary Platform
↓
Diary Ledger → Claims → Reports


**Governance Rule:**

> BOQ is the master commercial authority. The programme is a time/execution model.
> **Claimability must be anchored to BOQ via diary ledger entries.**
> Programme progress should be **derived** wherever possible (not manually asserted).

### Authoritative Data Flow

Contracts → BOQ ↔ Programme → Site Diaries (Ledger) → Claims → Reports


This is not conceptual — it exists structurally in your database:

| Layer             | Table(s)                                                                                           | Role                                  |
| ----------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Contract          | `contracts`                                                                                        | Root container                        |
| BOQ               | `boq`, `boq_sections`, `boq_items`, `boq_item_breakdown`                                           | Commercial scope + payment baseline   |
| Programme         | `programme_versions`, `programme_items`, `programme_links`, `programme_calendars`                 | Time decomposition + sequence         |
| Diary (Execution) | `work_diaries`, `diary_work_activities`                                                            | Site record                           |
| Linking           | `diary_boq_links`, `diary_programme_links` + Programme↔BOQ bridge                                  | Governance + traceability             |
| Commercialisation | `progress_claims`, `claim_items`                                                                   | Payment                               |
| Reporting         | `report_snapshots`, `report_versions`                                                              | Evidence                              |

**System Rule:**

> Nothing is claimable, reportable, or certifiable unless it is traceable to:
> - a `boq_items.id`
> - a `work_diaries.id`
> Programme items are evidence/time context, not the claim anchor.

---

## 2. BOQ Layer (Commercial Truth)

### Tables Used
- `boq`
- `boq_sections`
- `boq_items`
- `boq_item_breakdown`

### Function
BOQ defines **WHAT is being paid for**.

### Rules
- `boq_items.quantity` = contractual quantity
- `boq_items.unit_rate` = contractual rate
- `boq_items.amount` = system-calculated
- `boq_items.quantity_done` = cumulative physical progress (ledger-derived)
- `boq_items.percentage_complete` = derived field

**No programme logic allowed here.**

---

## 3. Programme Layer (Time Truth)

### Tables Used
- `programme_versions`
- `programme_items`
- `programme_links`
- `programme_calendars`

### Meaning
Programme defines **WHEN / IN WHAT SEQUENCE** BOQ scope is executed.

### Real-world Alignment (Important)
Programme and BOQ do not align 1-to-1 in real projects:
- One BOQ item is often executed across many programme activities.
- One programme activity often touches multiple BOQ items.

Therefore, the correct model is **many-to-many** between BOQ items and programme items.

---

## 4. Site Execution Layer (Diary)

### Tables Used
- `work_diaries`
- `diary_work_activities`

This layer represents **what actually happened on site**.

---

## 5. Linking Architecture (Ledger Doctrine)

### A. Diary ↔ BOQ (PRIMARY: claimable execution ledger)

Table: `diary_boq_links`

```sql
diary_id → work_diaries.id
boq_item_id → boq_items.id
Purpose:

Quantity tracking

Cumulative progress

Claim traceability

Doctrine Rule:

Work execution becomes claimable only when a diary entry produces a BOQ-linked ledger record (diary_boq_links).

B. Diary ↔ Programme (SECONDARY: schedule evidence)
Table: diary_programme_links


diary_id → work_diaries.id
programme_item_id → programme_items.id
Purpose:

Schedule progress evidence

Delay tracking

Critical path narrative evidence

Doctrine Rule:

Diary ↔ Programme linking is evidence, not the commercial anchor.

C. Programme ↔ BOQ (OFFICIAL GOVERNANCE BRIDGE)
v1 (existing schema compatibility)
Field:

programme_items.linked_boq_item_id → boq_items.id
Meaning:

Supports many programme activities → one BOQ item (N:1)

Useful for early adoption but not sufficient for real projects

v2 (target doctrine: many-to-many)
Recommended new table (must be implemented): programme_boq_links

Proposed structure:

id

contract_id

programme_item_id (FK to programme_items.id)

boq_item_id (FK to boq_items.id)

link_type (optional: primary|secondary|supporting)

weight (optional numeric for progress allocation)

created_by, created_at, updated_at

Constraints:

unique(programme_item_id, boq_item_id)

indexes on: contract_id, programme_item_id, boq_item_id

Doctrine Rule:

This table becomes the single source of truth for Programme ↔ BOQ mapping.
programme_items.linked_boq_item_id becomes legacy and may be deprecated later.

6. GUI Responsibilities (New Link Concept)
A) Diary: WorkActivity ↔ BOQ ↔ Programme (WorkLedgerLinkModal)
Entry point:

Diary page / Work activities section

Goal:

User must link Work Activity → BOQ (mandatory)

Programme is optional (derived suggestion)

Behavior:

Select BOQ item (mandatory)

Show suggested programme items derived from:

v2: programme_boq_links, OR

v1 fallback: programme_items.linked_boq_item_id

Optionally select programme item for evidence

On diary save:

post ledger entry into diary_boq_links (claimable anchor)

optionally write diary_programme_links (time evidence)

B) Governance Mapping: BOQ ↔ Programme (Two Entry Points)
1) From BOQ Detail (BOQ → many Programme)
Modal: BoqProgrammeLinkModal

choose 1 BOQ item

select many programme items

writes mapping rows to programme_boq_links

2) From Work Programme Page (Programme → many BOQ)
Modal: ProgrammeBoqLinkModal

choose 1 programme item

select many BOQ items

writes mapping rows to programme_boq_links

7. Claim Architecture
Tables
progress_claims

claim_items


claim_items.boq_item_id → boq_items.id
Claims are BOQ-driven, not programme-driven.

Programme only provides evidence + justification.

8. Execution Data Flow (Real System Flow)
v2 target flow (ledger doctrine)

Work Diary
  ↓
Work Activity (user records execution)
  ↓
WorkActivity ↔ BOQ (ledger posting)
  ↓
diary_boq_links (claimable execution record)
  ↓
BOQ progress derived
  ↓
Programme progress derived via programme_boq_links
  ↓
progress_claims → claim_items
  ↓
report_snapshots
9. Enforcement Rules (For Developers)
Data Integrity (v2)
Claimability requires BOQ traceability

a diary must produce diary_boq_links for any claimable quantity

Programme evidence is optional but recommended

diary_programme_links supports delay narratives and progress justification

Programme progress should be derived (default)

derived through BOQ progress + the Programme↔BOQ mapping (programme_boq_links)

Baseline governance must be respected

programme baselines should be locked (e.g., contract_baseline_locks) before certification workflows

10. Anti-Patterns to Avoid
❌ Direct diary → claim mapping without BOQ
❌ Programme-only progress claims
❌ Manual quantity edits in claims without ledger evidence
❌ Orphan programme activities with no scope mapping (no BOQ mapping)
❌ Diary records treated as claims without diary_boq_links







