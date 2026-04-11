# module_map

## Purpose
This file gives a simplified map of the platform modules and how they relate to each other.

---

## Contract-Centered Structure

```text
Contract
  ├── Pre-Contract & Tender
  ├── Work Programme
  ├── BOQ
  ├── Work Diary
  ├── Documents
  └── Authority / Finalisation
```

---

## Module Notes

### Contracts
The parent domain object.
Usually the contract page or detail page hosts the other modules.

### Pre-Contract & Tender
Used for tender and pre-award information and setup.

### Work Programme
Used for:
- programme versions
- programme items
- hierarchy / WBS
- baseline and revision logic
- import flows
- progress / weighting logic

### BOQ
Used for:
- bill items
- quantities
- values
- likely mapping to programme scope or progress records

### Work Diary
Used for:
- daily records
- activity capture
- site progress logs
- possible links to programme and BOQ

### Documents
Used for:
- document upload
- versioning
- PDF viewing

### Authority / Finalisation
Used for:
- edit rights
- enablement logic
- lock/finalization control

---

## Recommended Flow Between Modules

```text
Contract
  → Work Programme defines planned structure
  → BOQ defines measured/commercial structure
  → Work Diary captures daily actual activity
  → Documents provide supporting records
  → Authority controls who can edit/finalize
```

---

## Integration Questions to Keep Tracking
- How does Work Programme link to BOQ?
- How does Work Diary reference Programme items?
- What tables hold the linking logic?
- Which module is the source of truth for progress roll-up?
- What permissions exist for editing vs finalizing?
