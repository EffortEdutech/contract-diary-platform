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
- Linked/tag to Work Programme, BOQ items , related QA/QC, Technical & Construction Documents, Commercial & Contractual Documents,Testing, Commissioning & Handover items
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

