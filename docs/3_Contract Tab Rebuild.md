# Step 1 – Revised Contract Tab Navigation Wireframe (Tab-Based)

This revision aligns the wireframe to the **tab-based Contract Page layout** you proposed, while preserving all lifecycle, authority, and workflow logic already defined. The Contract tab now behaves as a **contract control room**, not a sidebar-driven document tree.

---

## A. Contract Page Layout (Revised Mental Model)

```
┌──────────────────────────────────────────────────────────────┐
│ Contract Header (Persistent – Existing)                       │
│ Contract No | Title | Status: Active                           │
│ <Edit Contract> <Delete Contract>                              │
└──────────────────────────────────────────────────────────────┘
│ Main Contract Tabs                                            │
│ [Contract Information] [Pre‑Contract] [Contract Formation]   │
│ [Project Management & Admin] [Close‑Out & Archive]            │
└──────────────────────────────────────────────────────────────┘
│ Contextual Content Panel                                      │
│ (Changes based on selected tab)                               │
└──────────────────────────────────────────────────────────────┘
│ Quick Actions (Persistent – Existing)                         │
│ BOQ | Daily Diaries | Claims | Work Programme | Team Members  │
└──────────────────────────────────────────────────────────────┘
```

---

## B. Global Tab Behaviour Rules

### 1. Contract Status → Tab Availability

| Contract Status | Enabled Tabs |
|----------------|-------------|
| Draft | Contract Info, Pre‑Contract, Contract Formation |
| Active | All except Close‑Out |
| Suspended | View‑only on all tabs |
| Completed | All tabs (Read‑Only) |

---

### 2. Authority‑Aware Actions

- Tabs are always visible (vision completeness)
- **Actions inside tabs** are role‑ and status‑gated
- No tab allows actions outside contractual authority

---

## C. Tab‑Level Wireframe & Behaviour

---

### 1️⃣ Contract Information Tab (Meta & Snapshot)

**Purpose:** Single source of contract metadata

**Layout:** Two‑column form (read‑mostly)

Fields:
- Contract Type
- Contract Value
- Project Location
- Client / Consultant Names
- Contract Period (Start / End / Duration)
- Created Date / Last Updated
- Project Description

Actions:
- Edit (Admin only, pre‑Active)

---

### 2️⃣ Pre‑Contract Tab

**Purpose:** Preserve tender intent & pricing baseline

**Layout:** Accordion sections

▸ Employer / Client Documents  
▸ Tender Documents  
▸ Contractor Tender Submissions

Default View:
- Document register per subsection

Rules:
- Fully read‑only once Contract = Active

---

### 3️⃣ Contract Formation Tab

**Purpose:** Establish binding contract baseline

**Layout:** Sectioned checklist + document register

Includes:
- LOA / LOA
- Contract Agreement
- Conditions (General & Particular)
- Appendix to Conditions
- IFC Drawings
- Specifications
- Priced BOQ / Contract Sum Analysis
- Contract Programme
- Bonds & Insurance (CAR, PL, WC, PI)

Actions:
- Upload / Replace (pre‑lock)
- Lock Contract Baseline

Once locked:
- Immutable snapshot enforced

---

### 4️⃣ Project Management & Admin Tab (Operational Core)

**Purpose:** Day‑to‑day contract administration

**Layout:** Left sub‑navigation + main panel

Sub‑Sections:

▸ Planning & Scheduling  
▸ Site Diary & Daily Records  
▸ HSE  
▸ QA/QC  
▸ Technical Docs  
▸ Commercial & Contractual  
▸ Subcontract & Supplier  
▸ Statutory & Authority (MY)  
▸ Testing & Handover

Each sub‑section:
- behaves as a focused mini‑module
- enforces Appendix E role/action rules

---

### 5️⃣ Project Close‑Out & Archive Tab

**Purpose:** Formal contract closure & legal archive

Includes:
- Final Account Agreement
- Final Completion Certificate
- Release of Retention
- Performance Bond Release
- Dispute Records (if any)
- Complete Contract Archive

Rules:
- Unlocked only after PC/CPC issued
- Entire tab is read‑only

---

## D. Quick Actions (Re‑contextualised)

Quick Actions always:
- open in context of the current contract
- respect role & workflow gating

| Action | Behaviour |
|------|-----------|
| BOQ | Opens Contract BOQ register |
| Daily Diaries | Redirects to Work Diary (filtered) |
| Claims | Opens Claims tab (contract‑scoped) |
| Work Programme | Opens Planning sub‑section |
| Team Members | Opens Contract Parties |

---

## E. Why This Revision Is Better

This tab‑based wireframe:
- matches your current UI direction
- keeps the full lifecycle visible
- avoids sidebar overload
- is intuitive for non‑technical users
- still enforces PAM + FIDIC logic

**The Contract page now reads like the contract itself — structured, chronological, and controlled.**

---



This section maps **each Contract Tab screen** to its **core database tables, key fields, and relationships**. It ensures that UI, workflow, and data model remain perfectly aligned for Supabase/PostgreSQL implementation.

---

## A. Core Contract Tables (Foundation)

| Table                     | Purpose                   | Key Relationships                         |
| ------------------------- | ------------------------- | ----------------------------------------- |
| contracts                 | Master contract record    | project\_id, employer\_id, contractor\_id |
| contract\_parties         | Parties & roles           | contract\_id → organizations              |
| contract\_documents       | Generic document register | contract\_id, section\_code               |
| contract\_status\_history | Status transitions        | contract\_id                              |

All modules below **must reference ****contract\_id**.

---

## B. Section 1 – Pre‑Contract & Tender

### Screens → Tables

| Screen          | Primary Tables                  | Notes                 |
| --------------- | ------------------------------- | --------------------- |
| Tender Drawings | tender\_documents               | Read‑only after award |
| Tender BOQ      | tender\_boq, tender\_boq\_items | Used for comparison   |
| Tender Queries  | tender\_rfi                     | Locked post‑award     |

### Mandatory Fields

- contract\_id
- document\_type
- version
- locked\_at

---

## C. Section 2 – Contract Formation

| Screen                 | Primary Tables                      | Notes               |
| ---------------------- | ----------------------------------- | ------------------- |
| Agreement / Conditions | contract\_documents                 | Baseline snapshot   |
| Contract BOQ           | contract\_boq, contract\_boq\_items | Commercial baseline |
| Bonds & Insurance      | contract\_security                  | Expiry‑tracked      |

**Rule:** Once `baseline_locked = true`, no update allowed.

---

## D. Section 3.1 – Planning & Scheduling

| Screen             | Tables             | Key Links     |
| ------------------ | ------------------ | ------------- |
| Programme Register | programmes         | contract\_id  |
| Programme Approval | programme\_reviews | programme\_id |

Fields:

- programme\_type (baseline / revised)
- approval\_status

---

## E. Section 3.2 – Site Diary & Daily Records

| Screen           | Tables             | Key Links                 |
| ---------------- | ------------------ | ------------------------- |
| Daily Diary      | site\_diaries      | contract\_id, diary\_date |
| Weather          | diary\_weather     | diary\_id                 |
| Manpower / Plant | diary\_resources   | diary\_id                 |
| Photos           | diary\_attachments | diary\_id                 |

**Anchor Rule:** `diary_id` is referenced by almost all downstream tables.

---

## F. Section 3.3 – HSE

| Screen    | Tables         | Links        |
| --------- | -------------- | ------------ |
| Toolbox   | hse\_toolbox   | diary\_id    |
| Incidents | hse\_incidents | diary\_id    |
| Permits   | hse\_permits   | contract\_id |

---

## G. Section 3.4 – QA/QC

| Screen | Tables    | Links        |
| ------ | --------- | ------------ |
| ITP    | qaqc\_itp | contract\_id |
| IR     | qaqc\_ir  | diary\_id    |
| NCR    | qaqc\_ncr | ir\_id       |

---

## H. Section 3.5 – Technical & Construction Docs

| Screen           | Tables              | Notes         |
| ---------------- | ------------------- | ------------- |
| Drawing Register | technical\_drawings | status‑driven |
| RFI              | technical\_rfi      | diary\_id     |

---

## I. Section 3.6 – Commercial & Contractual

| Screen       | Tables                | Mandatory Links          |
| ------------ | --------------------- | ------------------------ |
| Instructions | instructions          | diary\_id                |
| Variations   | variations            | instruction\_id          |
| Claims       | claims                | diary\_id, programme\_id |
| Payments     | payment\_claims       | contract\_id             |
| Certificates | payment\_certificates | payment\_claim\_id       |

---

## J. Section 3.7 – Subcontract & Supplier

| Screen       | Tables               | Notes         |
| ------------ | -------------------- | ------------- |
| Subcontracts | subcontracts         | contract\_id  |
| Sub Diaries  | subcontract\_diaries | diary\_id     |
| Sub Claims   | subcontract\_claims  | variation\_id |

---

## K. Section 3.8 – Statutory & Authority (MY)

| Screen             | Tables                 | Status         |
| ------------------ | ---------------------- | -------------- |
| Authority Register | authority\_submissions | traffic\_light |

---

## L. Section 3.9 – Testing & Handover

| Screen   | Tables                   | Triggers         |
| -------- | ------------------------ | ---------------- |
| Testing  | testing\_records         | diary\_id        |
| PC / CPC | completion\_certificates | unlock\_closeout |
| DLP      | dlp\_records             | certificate\_id  |

---

## M. Section 4 – Close‑Out & Archive

| Screen        | Tables            | Rules     |
| ------------- | ----------------- | --------- |
| Final Account | final\_accounts   | read‑only |
| Archive       | contract\_archive | immutable |

---

## N. Universal Columns (All Tables)

Every table must include:

- id (uuid)
- contract\_id
- created\_by
- created\_at
- status
- locked\_at (nullable)

---

## O. Why Step 2 Locks the System

With this mapping:

- frontend screens know exactly which tables they touch
- backend APIs become deterministic
- RLS policies can be written safely
- no feature can exist without a data anchor

**This is the point where the platform stops being abstract and becomes build‑ready.**

