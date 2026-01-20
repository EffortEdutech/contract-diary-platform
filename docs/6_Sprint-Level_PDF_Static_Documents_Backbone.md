# Execution Plan – Sprint-Level Breakdown (PDF / Static Documents Backbone)

This section breaks **(PDF Upload, Versioning & Viewing)** into **clear, buildable sprints** that deliver visible value while laying a non-negotiable contractual foundation.

The goal is NOT “document upload”, but:
> **A legally defensible Contract Document Backbone** that everything else depends on.

---

## Sprint 1.0 – Foundations 
**Objective:** Enable contract-aware document handling

### Backend
- Create `contract_documents` table
- Create `document_versions` table
- Define controlled `document_type` enum (LOA, Contract, Insurance, etc.)
- Define `contract_section` enum (Pre‑Contract, Formation, Close‑Out)
- Store file hash (SHA‑256)

### Frontend
- Contract tab → empty document registers per section
- Upload UI (no logic yet)

### Outcome
- All contract sections visibly exist
- No workflows yet, but structure is locked

---

## Sprint 1.1 – Upload & Register 
**Objective:** Replace “file storage” with a **Document Register**

### Features
- Upload PDF
- Mandatory metadata capture:
  - Document Type
  - Issuer
  - Issue Date
  - Version
- Auto-create document register row

### Rules
- Same document type can have multiple versions
- Latest version flagged `is_current = true`

### Outcome
- Contract Formation & Pre‑Contract tabs become usable

---

## Sprint 1.2 – Versioning & Supersession 
**Objective:** Legal-grade document lifecycle

### Features
- Upload replacement version
- Auto-supersede old version
- Version history panel
- Read-only access to superseded versions

### Rules
- No deletion of issued documents
- All superseded versions retained

### Outcome
- Audit-safe document trail

---

## Sprint 1.3 – Viewing, Preview & Access Control 
**Objective:** Make documents usable, not hidden

### Features
- Inline PDF viewer (no download required)
- Download with watermark (Contract No / User)
- Role-based access:
  - Contractor: upload draft
  - Consultant: view & acknowledge
  - Admin: lock

### Outcome
- Platform replaces email/WhatsApp document sharing

---

## Sprint 1.4 – Contract Baseline Locking 
**Objective:** Create the **legal baseline snapshot**

### Features
- “Lock Contract Formation” action
- Freeze all Formation documents
- Visual baseline indicator

### Rules
- Once locked:
  - No uploads
  - No replacements
  - Only view

### Outcome
- Contract baseline legally frozen

---

## Sprint 1.5 – Status & Expiry Tracking 
**Objective:** Risk visibility

### Features
- Expiry dates for bonds & insurance
- Traffic-light status (OK / Warning / Expired)
- Dashboard alerts

### Outcome
- Contract risk becomes visible early

---

## Sprint 1.6 – Close‑Out & Archive Mode 
**Objective:** Immutable legal archive

### Features
- Archive toggle on contract completion
- Entire Contract tab read-only
- Export archive index

### Outcome
- Dispute-ready contract archive

---

## What We Will Achieve 

| Area | Status |
|----|----|
| Legal Contract Backbone | ✅ Complete |
| UI Confidence | ✅ High |
| Database Stability | ✅ Anchored |
| Claims Readiness | ⚠ Prepared |

---

## What Comes Next 

**Recommended next move:**
➡️ Site Diary (Platform Form anchor)

Because once documents are stable, **facts** must follow.


