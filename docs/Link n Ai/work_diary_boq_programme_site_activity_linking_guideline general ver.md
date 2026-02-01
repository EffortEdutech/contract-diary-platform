# WorkLedger Development Guideline

## BOQ, Programme & Site Activity Relationship

This document defines the **core construction data model philosophy** for WorkLedger. It is intended as a long‑term reference for developers, ensuring that BOQ, work programmes, and site activities are linked in a way that reflects **real construction practice** and supports future scalability.

---

## 1. Core Assumption (Industry Reality)

In most traditional construction contracts, the workflow is:

```
Design → BOQ → Tender → Programme → Construction
```

Therefore:
- **BOQ** defines the *scope, quantities, and cost*
- **Programme** defines *time, sequence, and logic*
- **Site activity** records *actual execution*

> **BOQ is the primary source of truth for scope and quantities.**

This assumption is valid for the majority of projects (traditional, lump sum, remeasurement, infrastructure works).

---

## 2. Key Principle (Must Not Be Violated)

> **Programme activities must not own quantities directly.**

Quantities belong to BOQ items. Programme activities *consume* BOQ quantities over time.

This separation ensures:
- Accurate valuation
- Proper progress tracking
- Clean reporting
- Future support for EOT, claims, and earned value

---

## 3. Conceptual Model (3‑Layer Architecture)

```
BOQ (WHAT & HOW MUCH)
        ↓
Programme (WHEN & SEQUENCE)
        ↓
Site Activity / Daily Logs (WHAT ACTUALLY HAPPENED)
```

Each layer has a distinct responsibility and must not overlap.

---

## 4. Entity Definitions

### 4.1 BOQ Item
Represents contractual scope and measurable quantities.

**Responsibilities:**
- Quantity ownership
- Rate & cost calculation
- Sectional grouping

**Core Fields:**
- item_no
- description
- unit
- quantity
- rate
- section
- type (labor / material)

---

### 4.2 Programme Activity
Represents planned execution logic and timing.

**Responsibilities:**
- Schedule control
- Critical path logic
- Time-based progress roll-up

**Core Fields:**
- external_ref (MS Project / Primavera ID)
- name
- start_date
- finish_date
- duration
- wbs_code
- critical

Programme activities **must not store quantities**.

---

### 4.3 BOQ ↔ Programme Link (Critical Table)

This table defines how BOQ items are executed within the programme.

**Purpose:**
- Allow realistic many-to-many relationships
- Support partial execution of BOQ items
- Enable accurate progress calculation

**Relationship Rules:**
- One BOQ item can map to multiple programme activities
- One programme activity can consume multiple BOQ items

**Core Fields:**
- boq_item_id
- programme_activity_id
- planned_quantity

> This table is the **structural backbone** of WorkLedger.

---

### 4.4 Site Activity / Daily Work Log

Represents actual site execution.

**Responsibilities:**
- Capture real work done
- Provide evidence for progress
- Act as the only source of executed quantities

**Core Fields:**
- date
- programme_activity_id
- remarks
- weather
- attachments (photos, documents)

Site logs **do not modify BOQ directly**.

---

### 4.5 BOQ Progress (Derived Data)

BOQ progress is **calculated**, not manually entered.

**Derived From:**
- Site logs
- Executed quantities

**Responsibilities:**
- Track cumulative executed quantity
- Support valuation and reporting

**Key Rule:**
> All progress must be traceable back to site activity.

---

## 5. Progress Flow (Golden Rule)

```
Site Logs → BOQ Progress → Programme Progress
```

### Example:
- Site log: "Compacted 150 m³ crusher run"
- System updates:
  - BOQ executed quantity
  - Programme activity % complete
  - WBS and project roll-up

Programme % completion is **always derived**, never directly edited.

---

## 6. Why This Model Is Chosen

This structure allows WorkLedger to support:

- Interim payment valuation
- Planned vs actual reporting
- Earned Value Management (EV / PV / AC)
- Delay and impact analysis
- Multi-contract and subcontract BOQs
- Offline-first site data capture

It mirrors how **QS, planners, and site engineers** operate in real projects.

---

## 7. Edge Cases (Awareness Only)

Some project types may not strictly follow BOQ-first workflows:
- Design & Build
- Fast-track projects
- Rolling wave planning

However, even in these cases:
> BOQ eventually stabilises and becomes the reference point.

This model remains valid without redesign.

---

## 8. Non-Negotiable Design Rules

1. BOQ owns quantities
2. Programme owns time & logic
3. Site logs own actual execution
4. Progress is always calculated, never guessed
5. All data must be auditable and traceable

---

## 9. Final Statement

This guideline defines the **core philosophy** of WorkLedger’s construction data model.

Any future feature or schema change must **respect these relationships** to ensure accuracy, trust, and long-term scalability.

