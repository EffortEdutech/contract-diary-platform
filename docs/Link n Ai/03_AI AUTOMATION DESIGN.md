# PART B — AI AUTOMATION DESIGN

> AI in WorkDiary is **governance AI**, not chatbot AI

---

## B1. AI System Positioning (Governance AI)

```
BOQ (Scope Truth)
   ↓
Programme (Execution Interpretation)
   ↓
Diary (Reality Evidence)
   ↓
Rule Engine
   ↓
AI Engine
   ↓
Governance Layer
   ↓
User Interface
```

AI does not define scope.\
AI does not define sequence.\
AI evaluates compliance between **scope, execution, and reality**.

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

## B4. AI Domains (BOQ-Governed Intelligence)

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

WorkDiary is:

> **A Construction Intelligence Platform**

Not a reporting tool\
Not a project tracker\
Not a diary system

It is a:

> **Contract Execution Operating System**

---

# CORE DOCTRINE

> Data → Truth\
> Truth → Trust\
> Trust → Claims\
> Claims → Contracts\
> Contracts → Business

---

"From site to report. From report to claim. From claim to contract truth."