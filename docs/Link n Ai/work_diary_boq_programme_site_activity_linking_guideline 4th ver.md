# ContractDiary Architecture Guideline

## BOQ – Programme – Site Activity Integration

> **System-aligned guideline based on existing ContractDiary database schema**

---

## 1. Core Principle (System Truth Model)

### Governance Model

```
BOQ (Commercial Authority)  →  Programme (Execution Authority)
                ↘        ↙
               ContractDiary Platform
```

**Governance Rule:**

> BOQ is the master scope authority. Programme is the execution model. The platform enforces governed bidirectional linking.

### Authoritative Data Flow

```
Contracts → BOQ → Programme → Site Diaries → Claims → Reports
```

This is not conceptual — it already exists structurally in your database:

| Layer             | Table(s)                                                                          | Role                      |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------- |
| Contract          | `contracts`                                                                       | Root container            |
| BOQ               | `boq`, `boq_sections`, `boq_items`, `boq_item_breakdown`                          | Commercial scope baseline |
| Programme         | `programme_versions`, `programme_items`, `programme_links`, `programme_calendars` | Time baseline             |
| Site Execution    | `work_diaries`, `diary_work_activities`                                           | Physical execution        |
| Linking           | `diary_boq_links`, `diary_programme_links`, `programme_items.linked_boq_item_id`  | Data integrity            |
| Commercialisation | `progress_claims`, `claim_items`                                                  | Payment                   |
| Reporting         | `report_snapshots`, `report_versions`                                             | Evidence                  |

**System Rule:**

> Nothing is claimable, reportable, or certifiable unless it is traceable to:
>
> - a `boq_items.id`
> - a `programme_items.id`
> - a `work_diaries.id`

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
- `boq_items.quantity_done` = cumulative physical progress
- `boq_items.percentage_complete` = derived field

**No programme logic allowed here.**

---

## 3. Programme Layer (Time Truth)

### Tables Used

- `programme_versions`
- `programme_items`
- `programme_links`
- `programme_calendars`

### Key Fields

```sql
programme_items.linked_boq_item_id → boq_items.id
```

This is the **official BOQ–Programme bridge**.

### Meaning

- One BOQ item can map to many programme activities
- Programme is a **time decomposition** of BOQ scope

---

## 4. Site Execution Layer

### Tables Used

- `work_diaries`
- `diary_work_activities`

This layer represents **what actually happened on site**.

---

## 5. Linking Architecture (Already Implemented)

### A. Diary ↔ BOQ

Table: `diary_boq_links`

```sql
diary_id → work_diaries.id
boq_item_id → boq_items.id
```

Purpose:

- Quantity tracking
- Cumulative progress
- Claim traceability

---

### B. Diary ↔ Programme

Table: `diary_programme_links`

```sql
diary_id → work_diaries.id
programme_item_id → programme_items.id
```

Purpose:

- Schedule progress
- Delay tracking
- Critical path evidence

---

### C. Programme ↔ BOQ

Field:

```sql
programme_items.linked_boq_item_id
```

Purpose:

- Time–Commercial integration

---

## 6. Claim Architecture

### Tables

- `progress_claims`
- `claim_items`

```sql
claim_items.boq_item_id → boq_items.id
```

Claims are BOQ-driven, not programme-driven.

Programme only provides **evidence + justification**.

---

## 7. Execution Data Flow (Real System Flow)

```
BOQ Item
   ↓
Programme Item (linked_boq_item_id)
   ↓
Site Diary Activity
   ↓
(diagrammatically)
   ↓
diary_boq_links + diary_programme_links
   ↓
progress_claims → claim_items
   ↓
report_snapshots
```

---

## 8. Enforcement Rules (For Developers)

### Data Integrity

1. `programme_items.linked_boq_item_id` MUST NOT be NULL for claimable activities
2. `diary_boq_links` is mandatory for claim inclusion
3. `claim_items` must originate from `diary_boq_links`
4. `programme_versions` must be locked for baseline (`contract_baseline_locks`)

---

## 9. Anti-Patterns to Avoid

❌ Direct diary → claim mapping without BOQ ❌ Programme-only progress claims ❌ Manual quantity edits in claims ❌ Orphan programme activities ❌ Diary records without BOQ or Programme linkage

---

## 10. System Philosophy

ContractDiary is structured as:

> **Commercial-first system with time orchestration and site evidence**

BOQ = Legal truth\
Programme = Time truth\
Diary = Physical truth\
Claims = Financial truth\
Reports = Evidence truth

---

## 11. Architecture Summary

| Domain            | Authority          |
| ----------------- | ------------------ |
| Scope             | `boq_items`        |
| Time              | `programme_items`  |
| Execution         | `work_diaries`     |
| Commercialisation | `progress_claims`  |
| Evidence          | `report_snapshots` |

---

## 12. Developer Mental Model

If you can’t answer:

> “Which BOQ item does this come from?”

Then the data **must not exist in the system**.

---

## 13. Design Doctrine

> BOQ defines value\
> Programme defines sequence\
> Diary defines reality\
> Claims define money\
> Reports define truth

---

## 14. ContractDiary Identity Layer

This schema already supports:

- Delay claims (`delay_events`, `eot_claims`)
- Variations (`variation_orders`)
- Instructions (`site_instructions`)
- Inspections (`inspections`)
- NCR/CAR (`ncr`, `car`)
- AI governance (`ai_outputs`)

Which means ContractDiary is structurally a:

> **Contract Lifecycle Operating System**

Not a diary app. Not a reporting app. Not a project tracker.

---

## 15. Final Statement

**This system is already architecturally correct.**

Your schema already implements:

- Commercial truth layer
- Time truth layer
- Physical truth layer
- Legal traceability
- Auditability
- Claim defensibility

This document is alignment, not redesign.

---

"From site to report. From report to claim. From claim to contract truth."

