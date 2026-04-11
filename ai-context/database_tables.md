# database_tables

## Purpose
Use this file to maintain a human-readable map of important database tables.

This should be updated whenever:
- a module gets new tables
- a migration changes relationships
- important fields are renamed
- new linking tables are introduced

---

## Table Template

### `table_name`
**Purpose:**  
**Primary key:**  
**Important foreign keys:**  
**Important fields:**  
**Related modules:**  
**Notes:**  

---

## Known / Suspected Important Tables
Replace or expand this section with your actual confirmed schema information.

### `contracts`
**Purpose:** main contract record  
**Primary key:** id  
**Important foreign keys:**  
**Important fields:** contract number, title, status  
**Related modules:** Contracts, all child modules  
**Notes:** likely the parent entity for most records

### `programme_versions`
**Purpose:** stores programme version headers  
**Primary key:** id  
**Important foreign keys:** contract_id  
**Important fields:** version number, version type, baseline/revision status  
**Related modules:** Work Programme  
**Notes:** likely the parent for programme items

### `programme_items`
**Purpose:** stores work programme rows/items  
**Primary key:** id  
**Important foreign keys:** contract_id, programme_version_id, parent_id  
**Important fields:** wbs, description, level, quantity/progress-related fields  
**Related modules:** Work Programme  
**Notes:** likely supports hierarchy and roll-up logic

### `boq_items`
**Purpose:** stores BOQ line items  
**Primary key:** id  
**Important foreign keys:** contract_id  
**Important fields:** item number, description, quantity, unit, rate, amount  
**Related modules:** BOQ  
**Notes:** confirm actual table name from schema

### `work_diary_entries`
**Purpose:** stores daily diary records  
**Primary key:** id  
**Important foreign keys:** contract_id  
**Important fields:** date, activity, remarks, progress references  
**Related modules:** Work Diary  
**Notes:** confirm actual table name from schema

### `documents`
**Purpose:** stores document metadata  
**Primary key:** id  
**Important foreign keys:** contract_id  
**Important fields:** title, type, file path/url, current version  
**Related modules:** Documents  
**Notes:** may work together with storage and version tables

---

## Relationship Notes
Use this section to document actual confirmed relationships.

Example:
- `programme_versions.id` → `programme_items.programme_version_id`
- `contracts.id` → child module tables through `contract_id`

---

## Migration Notes
Use this section for recent schema change notes.

Example:
- Added baseline fields to `programme_versions`
- Added hierarchy support to `programme_items`
- Added BOQ → Programme link table
