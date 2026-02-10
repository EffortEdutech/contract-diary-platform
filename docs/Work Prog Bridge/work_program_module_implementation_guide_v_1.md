# 🏗️ Work Program Module — Implementation Guideline

**Purpose:**
This document defines the **implementation-level design** of the Work Program Module as a **Check–Balance Bridge** between:

- 📒 Daily Work Diary  
- 📐 BOQ (Bill of Quantities)  
- 📊 Official Project Program (MS Project / Primavera P6)

The module is **not a planning tool**.  
It is a **verification + validation layer** that detects the "truth gap" between:

> Planned Program vs Physical Execution

---

# 1. Core Design Principle

## Single Source of Authority Model

| Domain | Authority |
|------|--------|
| Schedule Logic | MS Project / Primavera |
| Quantities | BOQ |
| Physical Progress | Work Diary |
| Validation | Work Program Module |

The Work Program Module:
- ❌ Does NOT create schedules
- ❌ Does NOT modify logic
- ❌ Does NOT resequence tasks
- ❌ Does NOT manage dependencies

It ONLY:
✅ Imports
✅ Maps
✅ Compares
✅ Validates
✅ Flags variance

---

# 2. System Positioning (Your Platform Flow)

```
Diary  →  BOQ  →  Program  →  Work Program Module
  |        |         |              |
  |        |         |              ↓
  |        |         |        Check–Balance Engine
  |        |         ↓              ↓
  |   Quantity Truth        Program Truth
  |                                   ↓
  └────────────── Physical Reality ─────┘
```

**Meaning:**
- Diary = What happened
- BOQ = How much work exists
- Program = When it should happen
- Module = Whether reality matches the plan

---

# 3. Data Model (Implementation Level)

## Core Entities

### `program_baseline`
```json
{
  "baseline_id": "uuid",
  "project_id": "uuid",
  "name": "Baseline 0",
  "source": "MS_PROJECT | PRIMAVERA",
  "version": "0",
  "is_active": true,
  "import_date": "timestamp"
}
```

### `program_task`
```json
{
  "task_id": "uuid",
  "baseline_id": "uuid",
  "wbs_id": "1.2.3.4",
  "name": "Excavation",
  "start_date": "date",
  "finish_date": "date",
  "duration_days": 10,
  "cost": 50000,
  "man_hours": 320,
  "weight": 0.034,
  "parent_wbs": "1.2.3",
  "is_leaf": true
}
```

### `diary_task_link`
```json
{
  "diary_id": "uuid",
  "task_id": "uuid",
  "boq_item_id": "uuid",
  "quantity_installed": 25,
  "date": "date"
}
```

---

# 4. Import Pipeline (MS Project / Primavera)

## Step Flow
```
CSV/XLSX Import
     ↓
Column Mapping
     ↓
WBS Hierarchy Build
     ↓
Baseline Freeze
     ↓
Weight Calculation
     ↓
Activation
```

## Required Columns

| Logical Field | Source |
|------|--------|
| WBS ID | MSP / P6 |
| Task Name | MSP / P6 |
| Start Date | MSP / P6 |
| Finish Date | MSP / P6 |
| Duration | MSP / P6 |
| Cost | Optional |
| Man-hours | Optional |

---

# 5. Weight Engine (Implementation Logic)

## Supported Weight Models

- Duration
- Cost
- Man-hours
- Blended (multi-select)

## Blended Weight Calculation

### Step 1 — Normalize
```
WD = Duration_i / Total_Duration
WC = Cost_i / Total_Cost
WM = ManHours_i / Total_ManHours
```

### Step 2 — Blend
```
WB = (WD + WC + WM) / N
```

### Step 3 — Validation
```
Σ(WB_leaf_tasks) = 1.0
```

---

# 6. Planned Progress Engine

## Formula
```
Planned % = clamp(
  (CurrentDate - StartDate) / Duration,
  0,
  1
) * 100
```

**Source:** Program baseline only

---

# 7. Actual Progress Engine

## Source Priority

1. Diary
2. BOQ

## Formula
```
Actual % = Installed_Quantity / BOQ_Total_Quantity
```

Fallback:
```
Manual % if quantity not measurable
```

---

# 8. WBS Roll-up Engine (Recursive)

## Percentage Calculation Model (Child → Parent → Project)

### Leaf Level (Depth = Max Level)

**Actual % (Physical Reality):**
```
Actual_leaf = Installed_Quantity / BOQ_Total_Quantity
```

**Planned % (Program Reality):**
```
Planned_leaf = clamp(
  (CurrentDate - StartDate) / Duration,
  0,
  1
) * 100
```

---

### Parent Level Calculation (Depth n-1, n-2, ..., Root)

Parents are **never calculated directly**.
They are always derived from children using **weighted aggregation**.

#### Parent Actual %
```
Actual_parent = Σ(Actual_child_i × Weight_child_i) / Σ(Weight_child_i)
```

#### Parent Planned %
```
Planned_parent = Σ(Planned_child_i × Weight_child_i) / Σ(Weight_child_i)
```

---

### Multi-Level Depth Example

```
Level 1 (Project)
└── Level 2 (Package)
    └── Level 3 (System)
        └── Level 4 (Task / Leaf)
```

**Computation Order (Depth-First):**
```
Level 4 → Level 3 → Level 2 → Level 1
```

---

## Recursive Algorithm
```
function computeNode(node):
  if node.is_leaf:
    return {
      actual: node.actual,
      planned: node.planned,
      weight: node.weight
    }

  children = get_children(node)
  actual_sum = 0
  planned_sum = 0
  weight_sum = 0

  for c in children:
    r = computeNode(c)
    actual_sum += r.actual * r.weight
    planned_sum += r.planned * r.weight
    weight_sum += r.weight

  return {
    actual: actual_sum / weight_sum,
    planned: planned_sum / weight_sum,
    weight: weight_sum
  }
```

---

## Depth Integrity Rules

- Only **leaf nodes** accept diary input
- Only **leaf nodes** accept BOQ quantity input
- Parents are **computed nodes**, not editable
- No manual override on parent levels
- No diary linkage to parent WBS
- No BOQ linkage to parent WBS

---

# 9. Variance Engine (Check–Balance Core)


## Formula
```
SV = Actual % - Planned %
```

## Status Rules

| SV | Status |
|------|--------|
| ≥ +5% | Ahead |
| 0 to -5% | On Track |
| -5 to -10% | Warning |
| < -10% | Critical |

---

# 10. Early Warning System

## Rules

### Stagnation
```
IF task.active = true
AND diary_entries = 0 for 3 days
→ ALERT
```

### Phantom Progress
```
IF planned% > 0
AND actual% = 0
→ ALERT
```

### Silent Site
```
IF project.active
AND diary.empty_today
→ ALERT
```

---

# 11. UX Flow

## Supervisor
```
Diary → Select BOQ → Auto-map Program Task → Submit
```

## PM / Engineer
```
Dashboard → Variance View → Drilldown → Diary Evidence
```

---

# 12. Governance Rules

- Baseline 0 is immutable
- Revisions require versioning
- Only one Active baseline
- Diary must link to BOQ
- BOQ must link to Program
- No direct Diary → Program bypass

---

# 13. Module Identity

**Role:** Truth Validation Layer  
**Function:** Check & Balance Engine  
**Position:** Between Planning & Execution  
**Purpose:** Reality Verification  

> "This module does not manage construction. It verifies it."

