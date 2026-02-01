# WorkDiary Data Flow Diagrams & AI Automation Design

> System architecture document for **execution flow** and **AI governance layer**

---

# PART A — DATA FLOW DIAGRAMS

## A1. Macro System Flow (Governance-Aligned)

```
QS / Client / Consultant
        ↓
BOQ (Commercial Authority)
        ↓
WorkDiary Governance Layer
        ↓
Programme (Execution Model)
        ↓
Work Diaries (Physical Reality)
        ↓
Progress Claims (Commercialisation)
        ↓
Reports (Evidence)
        ↓
Client / Authority / Legal
```

**Governance Principle:**

> Scope authority flows from BOQ. Execution authority flows through Programme. Evidence authority flows from Diaries. WorkDiary is the governance and enforcement layer.

---

## A2. Structural Data Flow (BOQ-Originated Linking)

```
boq_items  (Scope Master)
   ↓
linking_engine (scope governance)
   ↓
programme_items (execution decomposition)
   ↓
work_diaries (site reality)
   ↓
diary_boq_links + diary_programme_links
   ↓
progress_claims → claim_items
   ↓
report_snapshots
```

**Rule:** Programme structure must be derived from BOQ scope coverage, not the reverse.

---

## A3. Execution-Level Flow (Reality Mapping)

```
BOQ Item
   ↓
Linked Programme Activities
   ↓
Site Execution (Diary Entry)
   ↓
Physical Quantity Capture
   ↓
BOQ Quantity Update
   ↓
Programme Progress Update
   ↓
WBS Roll-up
   ↓
Project Roll-up
```

**Meaning:** Reality is always mapped back to BOQ scope first, then to programme logic.

---

## A4. Baseline vs Revision Flow

```
programme_versions
        ↓
baseline_lock
        ↓
revision_version
        ↓
actual_execution
        ↓
variance_analysis
```

Purpose: Delay analysis, EOT, claim substantiation

---

## A5. Commercial Flow

```
Site Diary
   ↓
diary_boq_links
   ↓
boq_progress
   ↓
progress_claims
   ↓
claim_items
   ↓
payment_certificate
```

---

## A6. Evidence Flow

```
Photos / Docs
   ↓
work_diaries
   ↓
report_versions
   ↓
report_snapshots
   ↓
Claims / Disputes / Audits
```

---

## A7. Multi-Contract Flow

```
Master Contract
   ↓
Subcontract A BOQ
   ↓
Subcontract Programme
   ↓
Subcontract Diaries
   ↓
Subcontract Claims
   ↓
Main Contract Aggregation
```

---

# CORE DOCTRINE

> Data → Truth\
> Truth → Trust\
> Trust → Claims\
> Claims → Contracts\
> Contracts → Business

---

"From site to report. From report to claim. From claim to contract truth."

