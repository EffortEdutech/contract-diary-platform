# Contract Tab – Full Lifecycle GUI Architecture (Hybrid PAM + FIDIC)

This artifact defines a **single, unified Contract GUI** that manages the entire construction contract lifecycle (Sections 1–13) in a legally coherent, workflow-driven manner. The GUI is structured so that **contractual authority, evidence flow, and document dependencies** are enforced visually and functionally.

---

## 0. Contract Header (Persistent)

**Always visible across all sections**

- Contract Name / Number
- Contract Form (PAM 2018 / FIDIC Red / Hybrid)
- Employer | Contractor | Consultant | QS
- Commencement Date | Original Completion Date
- Current Contract Sum | Approved Variations
- Contract Status (Draft / Active / Suspended / Completed)

**Quick Status Indicators**
- ⏱ EOT Status
- 💰 Payment Status
- ⚠ Outstanding Instructions / Claims

---

## 1️⃣ Pre‑Contract & Tender Stage Documents
*(Read‑only once contract is executed)*

**Purpose:** Preserve tender intent and pricing baseline

### Sub‑Modules
- Tender Drawings
- Tender Specifications
- Bills of Quantities (Tender BOQ)
- Addenda & Clarifications
- Tender Queries (Q&A Log)
- Pre‑Tender Meeting Minutes

**Key Rules**
- Locked after Contract Formation
- Used as reference in variation valuation & disputes

---

## 2️⃣ Contract Formation Documents

**Purpose:** Establish legally binding contract baseline

### Sub‑Modules
- Letter of Award (LOA)
- Articles of Agreement
- Conditions of Contract (PAM / FIDIC)
- Contract Drawings (Issued for Construction – IFC)
- Contract Specifications
- Contract BOQ
- Contract Data / Particular Conditions
- Performance Bond & Insurance

**Key Rules**
- Forms the **Contract Baseline Snapshot**
- Subsequent changes must reference this section

---

## 3️⃣ Project Management & Administration Documents

This is the **operational core** of the Contract GUI.

---

### 3.1 Planning & Scheduling Documents

- Master Programme
- Approved Work Programme
- Baseline Programme
- Revised / Recovery Programmes
- Look‑Ahead Schedules
- Programme Impact Analysis

**Workflow Dependency**
- Drives EOT, delay analysis, and progress claims

---

### 3.2 Site Diary & Daily Records

**System Anchor Module**

- Daily Site Diary
- Weather Records
- Labour & Plant Records
- Material Delivery Logs
- Site Photos & Attachments
- Instructions Acknowledgement

**Rules**
- Immutable after submission
- Feeds Claims, Variations, Delay, and Dispute modules

---

### 3.3 Health, Safety & Environment (HSE)

- HSE Plan
- Toolbox Meeting Records
- Safety Induction Logs
- Incident / Accident Reports
- Near‑Miss Reports
- Environmental Monitoring Records
- DOSH / CIDB Safety Documents

**Authority**
- Contractor prepares
- Consultant / Safety Officer monitors

---

### 3.4 Quality Control / Quality Assurance (QA/QC)

- Inspection & Test Plans (ITP)
- Method Statements
- Material Approval Requests
- Site Inspection Requests (IR)
- Non‑Conformance Reports (NCR)
- Corrective Action Records

**Evidence Chain**
- Linked to Work Done → Progress → Payment

---

### 3.5 Technical & Construction Documents

- Construction Drawings
- Shop Drawings
- As‑Built Markups
- Technical Submissions
- Design Change Proposals
- RFI (Request for Information)

**Rules**
- Consultant approval required for status change

---

### 3.6 Commercial & Contractual Documents

- Architect / Engineer Instructions
- Variation Orders (VO)
- Provisional Sum Instructions
- Claims (EOT, Loss & Expense)
- Payment Applications
- Interim Certificates
- Final Account Records

**Strict Authority Control**
- Contractor proposes
- QS assesses
- Consultant certifies

---

### 3.7 Subcontract & Supplier Management

- Subcontract Agreements
- Supplier Purchase Orders
- Subcontractor Diaries
- Subcontractor Claims
- Back‑to‑Back Variations

**Rules**
- Always subordinate to Main Contract

---

### 3.8 Statutory, Authority & Compliance Documents (Malaysia)

- CIDB Registration
- DOSH Approvals
- BOMBA Submissions
- Local Authority (PBT) Approvals
- Environmental Permits
- CCC‑Related Submissions

**Status Tracking**
- Pending | Submitted | Approved | Rejected

---

### 3.9 Testing, Commissioning & Handover

- Testing Records
- Commissioning Certificates
- O&M Manuals
- Training Records
- Practical Completion (PC)
- Defects Liability Period (DLP) Logs

**Triggers**
- Enables Close‑Out Phase

---

## 4️⃣ Project Close‑Out & Archiving

**Purpose:** Final contractual closure & legal defensibility

### Sub‑Modules
- Final Account Agreement
- Final Completion Certificate
- Release of Retention
- Performance Bond Release
- Dispute Records (if any)
- Complete Contract Archive (Read‑Only)

**Rules**
- Entire contract becomes immutable
- Full audit trail preserved

---

## Design Principles Embedded

- GUI follows **contract chronology**
- No screen exists without contractual justification
- Authority determines available actions
- Diary is the factual anchor
- Dispute reconstruction is always possible

---

## Outcome

This Contract GUI allows the platform to:
- Scale from MVP to enterprise
- Support PAM, FIDIC, and Hybrid contracts
- Survive adjudication, arbitration, and audits
- Visually communicate project health & risk

---

**This artifact should be treated as the definitive Contract Tab blueprint.**



---

# Step 1 – Contract Tab Navigation Wireframe (Logic-Level)

This section translates the Contract GUI architecture into a **clear navigation and screen-behaviour wireframe**, without UI styling. It defines **what appears, when it appears, and why**, so frontend and backend teams work from the same mental model.

---

## A. Contract Tab Layout (Mental Model)

```
┌───────────────────────────────────────────┐
│ Contract Header (Persistent)               │
│ [Status | Key Dates | Contract Sum | EOT] │
└───────────────────────────────────────────┘
│ Sidebar / Accordion Navigation             │   Main Content Panel
│                                           │
│ ▸ 1. Pre‑Contract & Tender                │   Contextual List / Form / Viewer
│ ▸ 2. Contract Formation                   │   (changes by selection)
│ ▸ 3. Project Management & Admin            │
│    ▸ 3.1 Planning & Scheduling             │
│    ▸ 3.2 Site Diary & Daily Records        │
│    ▸ 3.3 HSE                               │
│    ▸ 3.4 QA/QC                             │
│    ▸ 3.5 Technical Docs                    │
│    ▸ 3.6 Commercial & Contractual          │
│    ▸ 3.7 Subcontract & Supplier            │
│    ▸ 3.8 Statutory & Authority (MY)        │
│    ▸ 3.9 Testing & Handover                │
│ ▸ 4. Project Close‑Out & Archive           │
│                                           │
└───────────────────────────────────────────┘
```

---

## B. Navigation State Rules (Critical)

### 1. Contract Status Driven Visibility

| Contract Status | Visible Sections |
|---------------|------------------|
| Draft | 1, 2 (editable) |
| Active | 1 (read‑only), 2, 3 |
| Suspended | 1–3 (read‑only) |
| Completed | 1–4 (read‑only) |

> This prevents users from acting outside the contract lifecycle.

---

### 2. Progressive Disclosure (No UI Clutter)

- Only **Section 3** expands by default during construction
- Sections 1 & 2 collapse automatically once Active
- Section 4 is hidden until **Testing & Handover reaches PC**

---

## C. Section‑Level Screen Behaviour

### 1️⃣ Pre‑Contract & Tender

**Default View:** Document list (read‑only)

Actions:
- View
- Compare (Tender BOQ vs Contract BOQ)

Hidden when:
- Contract Status ≠ Active / Completed

---

### 2️⃣ Contract Formation

**Default View:** Baseline Summary Panel

Tabs:
- Agreement
- Conditions
- Contract BOQ
- Bonds & Insurance

Actions:
- Upload (Admin / Consultant only)
- Lock baseline (Admin)

Once locked:
- All documents become immutable

---

### 3️⃣ Project Management & Administration (Core)

This section behaves like a **mini‑application** inside the Contract tab.

---

#### 3.1 Planning & Scheduling

Default View:
- Programme list with status (Submitted / Approved / Superseded)

Actions:
- Upload programme (Contractor)
- Review / approve (Consultant)

Dependencies:
- Required before EOT claims enabled

---

#### 3.2 Site Diary & Daily Records

Default View:
- Calendar / timeline view

Actions:
- Open diary (redirects to Work Diary tab)
- View historical diary (read‑only)

Rule:
- Editing only allowed via Work Diary tab

---

#### 3.3 HSE

Default View:
- HSE dashboard (Incidents, Permits, Notices)

Actions:
- Create record (role‑based)
- Close / acknowledge

Authority‑gated buttons enforced

---

#### 3.4 QA/QC

Default View:
- Inspection / NCR register

Actions:
- Raise IR
- Issue NCR
- Close NCR

Dependencies:
- Linked to diary + work activity

---

#### 3.5 Technical & Construction Docs

Default View:
- Drawing register (IFC / Shop / As‑Built)

Actions:
- Submit
- Review
- Approve

Status badges:
- For Review | Approved | Superseded

---

#### 3.6 Commercial & Contractual

Default View:
- Commercial dashboard

Panels:
- Instructions
- Variations
- Claims
- Payments

Rules:
- Read‑only snapshots for Employer
- Edit paths enforce Appendix E logic

---

#### 3.7 Subcontract & Supplier

Default View:
- Subcontractor list

Actions:
- Assign scope
- View back‑to‑back claims

Isolation rule:
- Subcontract data never alters main contract baseline

---

#### 3.8 Statutory & Authority (Malaysia)

Default View:
- Authority checklist

Actions:
- Upload submission
- Update status

Traffic‑light indicators:
- Red / Amber / Green

---

#### 3.9 Testing, Commissioning & Handover

Default View:
- Commissioning tracker

Actions:
- Upload records
- Issue PC / CPC

Trigger:
- Unlocks Section 4

---

### 4️⃣ Project Close‑Out & Archive

Default View:
- Close‑out checklist

Actions:
- Final account sign‑off
- Archive contract

Rule:
- Entire Contract tab becomes read‑only

---

## D. Global UX Enforcement Rules

- No section visible without contractual relevance
- Buttons appear only if:
  - role allows
  - prerequisite status met
- All screens show:
  - status
  - last action by / date

---

## E. Why This Wireframe Matters

This navigation logic:
- prevents scope creep
- eliminates illegal actions
- keeps UI simple despite complexity
- allows phased delivery without redesign

**This is the foundation for frontend, backend, and RLS to stay aligned.**

