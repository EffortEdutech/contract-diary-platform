# Pre-Contract & Tender Checklist

## Technical Handover & System Explanation

> **Purpose of this document**  
> This handover explains, in plain and structured terms, **how the Pre-Contract & Tender checklist works**, where the data comes from, and which scripts are involved.  
> It is intended to help future development sessions resume smoothly **without re-tracing the entire debugging history**.

---

## 1. One-Sentence Overview

**Pre-Contract & Tender is NOT manually filled.**  
It is **auto-generated from system templates**, filtered per contract, and dynamically matched with uploaded documents.

Checklist status (Pending / Uploaded / Locked) is **computed**, not stored.

---

## 2. The Four Core Tables (Critical Mental Model)

The entire Pre-Contract checklist system is built on **four database tables**, each with a clear responsibility.

```
TEMPLATES → REQUIRED → DOCUMENTS → VERSIONS
```

---

### 2.1 `contract_document_templates`

**Role:** System Master Template  
**Scope:** Global (not contract-specific)

This table defines:
- What documents *should exist*
- For which lifecycle stage
- In which section
- In what order

Typical fields:
- `lifecycle_stage` → `PRE_CONTRACT`
- `section_code` → `EMPLOYER_DOCS`, `TENDER_DOCS`, etc
- `item_title`
- `item_code`
- `sequence_no`

📌 This table **never changes per contract**.

---

### 2.2 `contract_required_documents`

**Role:** Contract-Specific Checklist

This table answers:
> “For *this* contract, which template items are required?”

When a contract is created:
- Rows are inserted referencing `contract_document_templates`
- Each row is marked `is_required = true / false`

This allows:
- Contract A to require 40 documents
- Contract B to require only 28 documents

📌 This is the table that makes each contract’s checklist unique.

---

### 2.3 `contract_documents`

**Role:** Current Uploaded Document (Single Source of Truth)

This table represents:
> “What file is currently uploaded for this checklist item?”

Each upload creates **one row** here with:
- `template_id` (links back to checklist item)
- `file_url`
- `storage_path`
- `version`
- `revision_number`
- `is_current = true`
- `status`

📌 Checklist status **depends on this table**.

If a row exists → status becomes **UPLOADED**.

---

### 2.4 `document_versions`

**Role:** Audit Trail / Version History

This table stores:
- Every version ever uploaded
- Change reason & summary
- Who uploaded it
- When it was uploaded

📌 This table is **NOT used to decide checklist status**.

It is used only for:
- Version history modal
- Audit / compliance

---

## 3. What Happens When Pre-Contract Page Loads

Component involved:
- `DocumentChecklistRegister.jsx`

The checklist is built in **three logical steps**.

---

### Step 1 — Load Required Checklist Items

Query:
```sql
contract_required_documents
JOIN contract_document_templates
WHERE contract_id = :contractId
AND lifecycle_stage = 'PRE_CONTRACT'
AND section_code = :sectionCode
AND is_required = true
```

Result:
- List of items that **should exist** for this contract & section

---

### Step 2 — Load Uploaded Documents

Query:
```sql
contract_documents
WHERE contract_id = :contractId
AND template_id IN (...)
AND is_current = true
```

Result:
- Files that **actually exist**

---

### Step 3 — Frontend Merge (Computed Status)

For each checklist item:

| Condition | Status |
|--------|--------|
| No document | `PENDING` |
| Document exists | `UPLOADED` |
| Document / section locked | `LOCKED` |

📌 Status is **computed in React**, not stored in DB.

---

## 4. Why Deleting Files in Storage Does NOT Reset Status

Important rule:

> **Database is the source of truth, not Supabase Storage**

If a file is deleted manually from the bucket:
- `contract_documents` row still exists
- Checklist still shows **UPLOADED**

This is intentional:
- Prevents silent data loss
- Preserves audit trail

✅ Proper removal must:
- Update `contract_documents`
- Or set `is_current = false`
- Or mark document as superseded / locked

---

## 5. Upload Flow (First Upload)

Component:
- `DocumentUploadModal.jsx`

Service:
- `documentService.uploadDocument()`

Execution order:

1. Upload PDF to Supabase Storage  
2. Insert row into `contract_documents`  
3. Insert row into `document_versions` (v1.0)

After success:
- Checklist reloads
- Status becomes **UPLOADED**

---

## 6. Version Upload Flow

Component:
- `DocumentVersionsModal.jsx`

Service:
- `documentService.uploadNewVersion()`

Execution order:

1. Upload new PDF to Storage  
2. Update `contract_documents` (new version, new path)  
3. Insert new row into `document_versions`

Checklist status **does not change** (still UPLOADED).

---

## 7. Viewing PDFs

Viewing logic:

1. Prefer `storage_path`
2. Generate signed URL via:
   ```js
   documentService.getSignedViewUrl(path)
   ```
3. Open inside `PdfViewerModal`

📌 Works for **private buckets**.

---

## 8. Key Files to Remember (Cheat Sheet)

### Frontend
- `DocumentChecklistRegister.jsx` → checklist rendering
- `DocumentUploadModal.jsx` → first upload
- `DocumentVersionsModal.jsx` → version history
- `PdfViewerModal.jsx` → PDF preview

### Services
- `documentService.uploadDocument`
- `documentService.uploadNewVersion`
- `documentService.getSignedViewUrl`

### Database
- `contract_document_templates`
- `contract_required_documents`
- `contract_documents`
- `document_versions`

---

## 9. Final Mental Model (Remember This)

```
Templates define expectations
Required defines contract scope
Documents define current state
Versions define history
```

If this model is clear, **everything else becomes predictable**.

---

## 10. Ready for Next Phase

With PDF handling complete, the system is now ready for:
- Contract Formation locking rules
- Section-based freeze logic
- Claims, certificates, and approvals

This document exists so the next session can start **without re-discovering this logic**.

---

**End of Handover**

