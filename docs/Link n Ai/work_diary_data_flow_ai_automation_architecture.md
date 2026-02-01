# WorkLedger Data Flow Diagrams & AI Automation Design

> System architecture document for **execution flow** and **AI governance layer**

---

# PART A — DATA FLOW DIAGRAMS

## A1. Macro System Flow

```
User Input (Site / Office)
        ↓
Contracts
        ↓
BOQ
        ↓
Programme
        ↓
Work Diaries
        ↓
Progress Claims
        ↓
Reports
        ↓
Client / Authority / Legal
```

This is the **authoritative operational flow** of WorkLedger.

---

## A2. Structural Data Flow

```
boq_items
   ↓
programme_items (linked_boq_item_id)
   ↓
work_diaries
   ↓
diary_boq_links + diary_programme_links
   ↓
progress_claims → claim_items
   ↓
report_snapshots
```

---

## A3. Execution-Level Flow

```
Programme Activity
        ↓
Site Execution (Diary Entry)
        ↓
Physical Quantity Entry
        ↓
BOQ Quantity Update
        ↓
Programme % Update
        ↓
WBS Roll-up
        ↓
Project Roll-up
```

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

# PART B — AI AUTOMATION DESIGN

> AI in WorkLedger is **governance AI**, not chatbot AI

---

## B1. AI System Positioning

```
Data Layer → Rule Engine → AI Engine → Governance Layer → User Interface
```

AI does not create data.  
AI evaluates data.

---

## B2. AI Input Sources

- `boq_items`
- `programme_items`
- `work_diaries`
- `diary_work_activities`
- `diary_boq_links`
- `diary_programme_links`
- `progress_claims`
- `claim_items`
- `report_snapshots`
- `delay_events`
- `eot_claims`
- `variation_orders`
- `site_instructions`

---

## B3. AI Output Table

Table: `ai_outputs`

```sql
ai_outputs
- id
- source_type
- source_id
- ai_type
- severity
- confidence
- summary
- recommendation
- created_at
```

---

## B4. AI Domains

### 1. Progress Intelligence

Functions:
- BOQ overrun prediction
- Activity slippage detection
- Critical path risk alerts
- Productivity benchmarking

---

### 2. Delay Intelligence

Functions:
- Float consumption tracking
- Delay causation classification
- Baseline vs actual variance
- EOT evidence pre-assembly

---

### 3. Commercial Intelligence

Functions:
- Cost overrun detection
- Claim risk scoring
- Variation impact prediction
- Cashflow forecasting

---

### 4. Compliance Intelligence

Functions:
- Missing evidence detection
- Incomplete diary flags
- Photo/document sufficiency
- NCR/CAR risk prediction

---

### 5. Legal Intelligence

Functions:
- Dispute readiness scoring
- Evidence chain completeness
- Claim defensibility index
- Contractual exposure risk

---

## B5. AI Automation Pipelines

### Pipeline 1 — Progress Risk

```
work_diaries → boq_progress → programme_progress → AI
```

Output:
- Slippage risk
- Quantity mismatch
- Forecast delay

---

### Pipeline 2 — Delay Claim Engine

```
baseline → actual → variance → AI → eot_claims
```

Output:
- Auto-generated delay narrative
- Evidence linking
- Impact analysis

---

### Pipeline 3 — Claim Readiness Engine

```
site logs → boq → claims → AI
```

Output:
- Claim completeness score
- Missing evidence alerts
- Risk flags

---

### Pipeline 4 — Governance Engine

```
all project data → AI → compliance scoring
```

Output:
- Audit readiness
- ISO compliance support
- Client reporting quality

---

## B6. AI Decision Rules

AI **never auto-approves**:
- Claims
- Variations
- EOTs
- Certificates

AI can:
- Recommend
- Flag
- Score
- Predict
- Pre-fill

Human always approves.

---

## B7. AI Trust Model

```
Evidence-based AI
Traceable AI
Explainable AI
Auditable AI
```

No black-box decisions.

---

## B8. AI Risk Governance

### Safeguards:
- Confidence thresholds
- Dual-validation logic
- Manual override
- Full traceability

---

## B9. AI Maturity Roadmap

### Phase 1 — Rules
- Threshold alerts
- Simple predictions

### Phase 2 — ML Models
- Pattern recognition
- Forecasting

### Phase 3 — Autonomous Agents
- Evidence assembly
- Report drafting
- Claim structuring

---

# FINAL SYSTEM IDENTITY

WorkLedger is:

> **A Construction Intelligence Platform**

Not a reporting tool  
Not a project tracker  
Not a diary system  

It is a:

> **Contract Execution Operating System**

---

# CORE DOCTRINE

> Data → Truth  
> Truth → Trust  
> Trust → Claims  
> Claims → Contracts  
> Contracts → Business

---

"From site to report. From report to claim. From claim to contract truth."

