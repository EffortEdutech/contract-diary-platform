# SESSION 5 PREPARATION SCRIPT
**Phase 2C: BOQ Sections & Import/Export**  
**Date Prepared:** 2024-12-30  
**For Next Session:** Session 5

---

## 🎯 SESSION 5 OBJECTIVE

**Build BOQ Sections & Import/Export:** Organize items into sections, import from Excel/CSV, export to PDF

**What User Can Do After Session 5:**
- ✅ Create sections to organize BOQ items (e.g., "Substructure", "Superstructure")
- ✅ Edit and delete sections
- ✅ Move items into sections
- ✅ Import BOQ items from Excel/CSV (bulk entry)
- ✅ Export BOQ to PDF (Malaysian format - PWD Form 1 style)
- ✅ Filter items by section
- ✅ Reorder sections and items (drag & drop)

---

## 📊 CURRENT PROJECT STATE

### What's Already Working (DO NOT REBUILD)
✅ Authentication system (Login, Signup, Dashboard)  
✅ Contract Management (CRUD operations)  
✅ BOQ Creation (Create, View, Approve)  
✅ **BOQ Item Management (Add, Edit, Delete)** ✅ NEW!  
✅ Real-time calculations (item amounts, totals, SST)  
✅ Color-coded item type badges  
✅ Status-based restrictions (draft vs approved)  
✅ BOQ Service with 20+ functions  
✅ Database with 11 tables and RLS policies  

### What's Missing (TO BUILD IN SESSION 5)
❌ BOQ Sections CRUD functionality  
❌ Link items to sections  
❌ Section-based filtering and display  
❌ Excel/CSV import functionality  
❌ PDF export functionality  
❌ Drag & drop reordering  

### Progress Status
- **Overall:** 55% (66/120 tasks)
- **Current Phase:** Phase 2C - BOQ Sections & Import/Export
- **Budget:** RM 0 (free tier)
- **Files:** 23 files created
- **Time Spent:** 13.5 hours total

---

## 🗄️ CRITICAL DATABASE SCHEMA INFORMATION

### BOQ Sections Table (Ready to Use)
```sql
CREATE TABLE boq_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boq_id UUID REFERENCES boq(id) ON DELETE CASCADE NOT NULL,
  section_number VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_boq_section UNIQUE(boq_id, section_number)
);
```

**KEY POINTS:**
- Sections organize items within a BOQ
- `section_number` must be unique within a BOQ (e.g., "A", "B", "C" or "01", "02", "03")
- `display_order` controls section sequence
- Items can be linked via `section_id` in `boq_items` table

### BOQ Items Table (Already Exists - Reminder)
```sql
CREATE TABLE boq_items (
  id UUID PRIMARY KEY,
  boq_id UUID REFERENCES boq(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES boq_sections(id) ON DELETE SET NULL, -- ← Links to section
  item_number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_rate DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  -- ... other fields
);
```

**KEY POINTS:**
- `section_id` can be NULL (items without section)
- When section is deleted, `section_id` becomes NULL (not cascade delete)

---

## 📁 PROJECT FILE STRUCTURE

```
contract-diary-platform/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   ├── components/
│   │   │   ├── ProtectedRoute.js
│   │   │   ├── Layout.js
│   │   │   ├── contracts/
│   │   │   │   ├── ContractCard.js
│   │   │   │   └── ContractStats.js
│   │   │   └── boq/
│   │   │       ├── AddBOQItemModal.js ← Exists
│   │   │       ├── EditBOQItemModal.js ← Exists
│   │   │       ├── AddSectionModal.js ← TO CREATE
│   │   │       ├── EditSectionModal.js ← TO CREATE
│   │   │       ├── ImportBOQModal.js ← TO CREATE
│   │   │       └── ExportPDFButton.js ← TO CREATE
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── Signup.js
│   │   │   ├── Dashboard.js
│   │   │   ├── contracts/
│   │   │   │   ├── Contracts.js
│   │   │   │   ├── ContractForm.js
│   │   │   │   └── ContractDetail.js
│   │   │   └── boq/
│   │   │       ├── BOQList.js
│   │   │       ├── CreateBOQ.js
│   │   │       └── BOQDetail.js ← TO MODIFY
│   │   ├── services/
│   │   │   └── boqService.js ← TO EXTEND
│   │   ├── utils/ ← TO CREATE
│   │   │   ├── excelParser.js ← NEW
│   │   │   └── pdfGenerator.js ← NEW
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json ← TO UPDATE (add libraries)
└── README.md
```

---

## 🔧 EXISTING SERVICE FUNCTIONS (Already Available)

**In `src/services/boqService.js`:**

```javascript
// Section Operations (ALREADY EXIST - DO NOT RECREATE)
export const createBOQSection = async (sectionData) => { ... }
export const updateBOQSection = async (sectionId, updates) => { ... }
export const deleteBOQSection = async (sectionId) => { ... }

// Item Operations (ALREADY EXIST)
export const createBOQItem = async (itemData) => { ... }
export const getBOQItems = async (boqId) => { ... }
export const updateBOQItem = async (itemId, updates) => { ... }
export const deleteBOQItem = async (itemId) => { ... }

// These functions are ready to use - just call them from UI components!
```

**Functions to ADD to boqService.js:**
```javascript
// TO ADD IN SESSION 5
export const getBOQSections = async (boqId) => { ... }
export const getItemsBySection = async (sectionId) => { ... }
export const moveItemToSection = async (itemId, sectionId) => { ... }
export const reorderSections = async (boqId, sectionOrder) => { ... }
```

---

## 📚 LIBRARIES NEEDED

### For Excel/CSV Import
**Library:** `xlsx` (SheetJS)
- **Install:** `npm install xlsx`
- **Usage:** Parse Excel (.xlsx, .xls) and CSV files
- **Features:** Read spreadsheets, convert to JSON
- **Documentation:** https://docs.sheetjs.com/

**Alternative:** `papaparse` (for CSV only)
- **Install:** `npm install papaparse`
- **Usage:** CSV parsing with validation
- **Lighter weight than xlsx**

### For PDF Export
**Library:** `jspdf` + `jspdf-autotable`
- **Install:** `npm install jspdf jspdf-autotable`
- **Usage:** Generate PDF with tables
- **Features:** Custom formatting, Malaysian BOQ style
- **Documentation:** https://github.com/simonbengtsson/jsPDF-AutoTable

**Alternative:** `pdfmake`
- **Install:** `npm install pdfmake`
- **Usage:** Declarative PDF generation
- **Features:** Complex layouts, headers/footers

**Recommendation:** Use `jspdf` + `jspdf-autotable` for simplicity

---

## 🎨 SESSION 5 IMPLEMENTATION PLAN

### Task 5.1: Create Section Management Components (60 min)

**File to Create:** `src/components/boq/AddSectionModal.js`

**What It Should Have:**
- Modal dialog
- Form with fields:
  - Section Number (text input, e.g., "A", "01")
  - Title (text input, e.g., "Substructure Works")
  - Description (textarea, optional)
- Submit button
- Cancel button
- Validation (section number must be unique within BOQ)

**File to Create:** `src/components/boq/EditSectionModal.js`

**What It Should Have:**
- Same as Add but pre-filled with existing data
- Update button instead of Create

**Import They Need:**
```javascript
import { createBOQSection, updateBOQSection } from '../../services/boqService';
```

### Task 5.2: Extend boqService.js with Section Functions (30 min)

**File to Modify:** `src/services/boqService.js`

**Functions to Add:**
```javascript
export const getBOQSections = async (boqId) => {
  // Fetch all sections for a BOQ, ordered by display_order
}

export const getItemsBySection = async (sectionId) => {
  // Fetch all items in a specific section
}

export const moveItemToSection = async (itemId, sectionId) => {
  // Update item's section_id
}

export const reorderSections = async (boqId, sectionOrder) => {
  // Update display_order for multiple sections
}
```

### Task 5.3: Update BOQDetail.js to Show Sections (45 min)

**File to Modify:** `src/pages/boq/BOQDetail.js`

**Changes Needed:**
1. Fetch sections along with items
2. Display sections in collapsible panels (Accordion style)
3. Show items grouped under each section
4. Add "+ Add Section" button
5. Add section actions (Edit, Delete)
6. Show items without section in "Unsectioned Items" group
7. Add "Move to Section" dropdown for each item

**UI Structure:**
```
┌─────────────────────────────────────────────────┐
│ BOQ Items (24)          [+ Add Section] [+ Add Item] │
├─────────────────────────────────────────────────┤
│ ▼ Section A: Substructure Works (8 items)      │
│   [Edit] [Delete]                               │
│   ├─ A.1.1 | Excavation | Labor | RM 2,550     │
│   ├─ A.1.2 | Concrete   | Material | RM 22,500 │
│   └─ ...                                        │
├─────────────────────────────────────────────────┤
│ ▼ Section B: Superstructure (10 items)         │
│   [Edit] [Delete]                               │
│   ├─ B.1.1 | Column Formwork | RM 5,000        │
│   └─ ...                                        │
├─────────────────────────────────────────────────┤
│ ▼ Unsectioned Items (6 items)                  │
│   ├─ X.1.1 | Temporary Works | RM 1,200        │
│   └─ ...                                        │
└─────────────────────────────────────────────────┘
```

### Task 5.4: Build Excel Import Functionality (90 min)

**File to Create:** `src/components/boq/ImportBOQModal.js`

**What It Should Have:**
- File upload input (accept .xlsx, .csv)
- Preview imported data before saving
- Validation:
  - Check required columns (Item No, Description, Unit, Qty, Rate)
  - Validate data types
  - Check for duplicates
- Map columns to database fields
- Bulk insert items
- Error handling and reporting

**File to Create:** `src/utils/excelParser.js`

**Functions:**
```javascript
export const parseExcelFile = (file) => {
  // Parse Excel/CSV to JSON
  // Return array of item objects
}

export const validateBOQData = (data) => {
  // Validate parsed data
  // Return { isValid, errors, warnings }
}

export const mapToItemFormat = (row) => {
  // Map Excel columns to database format
  // Handle Malaysian units, number formats
}
```

**Expected Excel Format (PWD Form 1 Style):**
```
| Item No | Description          | Unit | Quantity | Rate    | Amount  |
|---------|---------------------|------|----------|---------|---------|
| A.1.1   | Excavation          | m³   | 100.000  | 25.50   | 2,550.00|
| A.1.2   | Concrete Grade 30   | m³   | 50.000   | 450.00  | 22,500.00|
```

**Installation:**
```bash
npm install xlsx
```

### Task 5.5: Build PDF Export Functionality (60 min)

**File to Create:** `src/components/boq/ExportPDFButton.js`

**What It Should Have:**
- Button component
- Loading state during PDF generation
- Download PDF file
- PDF format matches PWD Form 1 or PAM BOQ style

**File to Create:** `src/utils/pdfGenerator.js`

**Functions:**
```javascript
export const generateBOQPDF = (boq, items, sections) => {
  // Generate PDF with Malaysian BOQ format
  // Include:
  // - Header (Project name, Contract number, BOQ number)
  // - Sections with items
  // - Totals by section
  // - Grand total with SST
  // - Footer (Prepared by, Date)
}

export const formatBOQForPDF = (boq, items, sections) => {
  // Format data for PDF generation
  // Group items by section
  // Calculate section subtotals
}
```

**PDF Layout (PWD Form 1 Style):**
```
┌────────────────────────────────────────────────────┐
│         BILL OF QUANTITIES                         │
│                                                    │
│ Project: Hospital Building                        │
│ Contract No: CT-2024-001                          │
│ BOQ No: BOQ-001                                   │
├────────────────────────────────────────────────────┤
│ SECTION A: SUBSTRUCTURE WORKS                     │
├──────┬────────────┬──────┬─────────┬───────┬──────┤
│ Item │ Description│ Unit │ Quantity│ Rate  │Amount│
├──────┼────────────┼──────┼─────────┼───────┼──────┤
│A.1.1 │Excavation  │  m³  │ 100.000 │ 25.50 │2,550 │
│A.1.2 │Concrete    │  m³  │  50.000 │450.00 │22,500│
├──────┴────────────┴──────┴─────────┴───────┼──────┤
│                      Section A Subtotal:    │25,050│
├────────────────────────────────────────────┼──────┤
│                              Subtotal:      │32,050│
│                              SST (6%):      │ 1,923│
│                              Grand Total:   │33,973│
└────────────────────────────────────────────┴──────┘
```

**Installation:**
```bash
npm install jspdf jspdf-autotable
```

### Task 5.6: Add Drag & Drop Reordering (Optional - 45 min)

**Library:** `react-beautiful-dnd` or `@dnd-kit/core`

**Features:**
- Drag sections to reorder
- Drag items between sections
- Visual feedback during drag

**Note:** This is optional for Session 5. Can be deferred to Session 6 if time runs short.

---

## 📋 STEP-BY-STEP EXECUTION GUIDE

### STEP 1: Start Session (5 min)

**User Will Say Something Like:**
- "Let's continue with Session 5"
- "Ready for BOQ Sections and Import/Export"
- "I want to build sections functionality"

**Claude Should:**
1. Read this SESSION_5_PREP.md file
2. Check PROGRESS.md for current status (should be 55%)
3. Verify user completed Session 4
4. Confirm Session 5 objectives with user
5. Start with Task 5.1

### STEP 2: Install Required Libraries (10 min)

**Tell User:**
"First, we need to install libraries for Excel import and PDF export."

**Commands:**
```bash
cd contract-diary-platform/frontend
npm install xlsx jspdf jspdf-autotable
```

**Verify Installation:**
- Check package.json shows new dependencies
- Restart dev server: `npm start`

### STEP 3: Create Section Management Modals (60 min)

**Tell User:**
"We'll create Add and Edit Section modals to organize BOQ items."

**Create Files:**
1. `src/components/boq/AddSectionModal.js`
2. `src/components/boq/EditSectionModal.js`

**Test After Creation:**
- Import in BOQDetail.js
- Add "+ Add Section" button
- Test section creation
- Verify section appears in database

### STEP 4: Extend boqService.js (30 min)

**Tell User:**
"Now we'll add functions to fetch and manage sections."

**Add Functions:**
- `getBOQSections(boqId)`
- `getItemsBySection(sectionId)`
- `moveItemToSection(itemId, sectionId)`
- `reorderSections(boqId, sectionOrder)`

**Test After Adding:**
- Call functions from console
- Verify database queries work
- Check returned data structure

### STEP 5: Update BOQDetail.js with Sections (45 min)

**Tell User:**
"Let's update the BOQ detail page to show items grouped by sections."

**Changes:**
1. Fetch sections and items
2. Group items by section
3. Display in collapsible accordion
4. Add section actions (Edit, Delete)
5. Show "Unsectioned Items" group

**Test After Changes:**
- Create a section
- Add items to section
- Move items between sections
- Delete a section (items become unsectioned)

### STEP 6: Build Excel Import (90 min)

**Tell User:**
"Now we'll build Excel/CSV import for bulk item entry."

**Create Files:**
1. `src/utils/excelParser.js`
2. `src/components/boq/ImportBOQModal.js`

**Features:**
- File upload
- Parse Excel/CSV
- Preview data
- Validate and map columns
- Bulk insert

**Test After Creation:**
1. Prepare sample Excel file with BOQ items
2. Import file
3. Preview parsed data
4. Validate and save
5. Verify items appear in BOQ

### STEP 7: Build PDF Export (60 min)

**Tell User:**
"Finally, let's add PDF export in Malaysian BOQ format."

**Create Files:**
1. `src/utils/pdfGenerator.js`
2. `src/components/boq/ExportPDFButton.js`

**Features:**
- Generate PDF with PWD Form 1 style
- Include sections, items, totals
- Format for printing
- Download as file

**Test After Creation:**
- Click Export PDF button
- Download PDF file
- Open and verify format
- Check calculations correct

### STEP 8: Testing & Verification (30 min)

**Create Test Checklist:**
- [ ] Can create section
- [ ] Can edit section
- [ ] Can delete section (items become unsectioned)
- [ ] Can view items grouped by section
- [ ] Can move item to section
- [ ] Can import Excel file with items
- [ ] Excel validation catches errors
- [ ] Can export BOQ to PDF
- [ ] PDF format matches Malaysian standard
- [ ] PDF calculations correct
- [ ] Only draft BOQs allow section changes

---

## ⚠️ COMMON PITFALLS TO AVOID

### Import Path Issues
❌ **WRONG:** `import { supabase } from '../config/supabaseClient'`  
✅ **CORRECT:** `import { supabase } from '../lib/supabase'`

### Excel Parsing Issues
❌ **WRONG:** Assume Excel has headers in row 1  
✅ **CORRECT:** Detect header row dynamically or allow user to specify

❌ **WRONG:** Direct string comparison for units  
✅ **CORRECT:** Normalize units (trim, lowercase, handle variations)

### PDF Generation Issues
❌ **WRONG:** Hardcode page breaks  
✅ **CORRECT:** Use autotable's auto-page break feature

❌ **WRONG:** Forget to handle long descriptions  
✅ **CORRECT:** Set column width and allow text wrap

### Section-Item Relationship
❌ **WRONG:** DELETE CASCADE for section_id in items  
✅ **CORRECT:** ON DELETE SET NULL (items become unsectioned)

❌ **WRONG:** Allow section deletion without warning  
✅ **CORRECT:** Show item count and confirm before deleting section

---

## 🔍 DEBUGGING CHECKLIST

If something doesn't work:

1. **Check Console Logs**
   - Look for import errors
   - Check for xlsx/jspdf library loading errors
   - Verify function calls

2. **Verify Database**
   - Check if sections created in Supabase
   - Verify section_id in items table
   - Check RLS policies allow operations

3. **Check Excel Format**
   - Verify column headers match expected
   - Check for empty rows
   - Validate number formats

4. **Check PDF Output**
   - Open in PDF viewer
   - Verify all data present
   - Check page breaks

---

## 📦 COMPONENT CODE TEMPLATES

### AddSectionModal.js Structure

```javascript
import React, { useState } from 'react';
import { createBOQSection } from '../../services/boqService';

function AddSectionModal({ isOpen, onClose, boqId, onSectionAdded }) {
  const [formData, setFormData] = useState({
    section_number: '',
    title: '',
    description: ''
  });
  
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const result = await createBOQSection({
      boq_id: boqId,
      ...formData
    });

    if (result.success) {
      onSectionAdded();
      onClose();
    } else {
      setErrors([result.error]);
    }
    
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Modal content */}
      </div>
    </div>
  );
}

export default AddSectionModal;
```

### excelParser.js Structure

```javascript
import * as XLSX from 'xlsx';

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const validateBOQData = (data) => {
  const errors = [];
  const requiredColumns = ['item_number', 'description', 'unit', 'quantity', 'unit_rate'];
  
  // Validation logic here
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### pdfGenerator.js Structure

```javascript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBOQPDF = (boq, items, sections) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.text('BILL OF QUANTITIES', 105, 20, { align: 'center' });
  
  // Project details
  doc.setFontSize(10);
  doc.text(`Project: ${boq.contract.project_name}`, 14, 35);
  doc.text(`BOQ No: ${boq.boq_number}`, 14, 42);
  
  // Table
  const tableData = formatItemsForPDF(items, sections);
  
  autoTable(doc, {
    startY: 50,
    head: [['Item No', 'Description', 'Unit', 'Quantity', 'Rate (RM)', 'Amount (RM)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    foot: [[{ content: `Grand Total: RM ${boq.total_amount}`, colSpan: 6, styles: { halign: 'right' } }]]
  });
  
  // Download
  doc.save(`${boq.boq_number}.pdf`);
};

const formatItemsForPDF = (items, sections) => {
  // Format logic here
  return formattedData;
};
```

---

## 📝 SESSION 5 SUCCESS CRITERIA

At the end of Session 5, user should be able to:

✅ Create BOQ sections  
✅ Edit section details  
✅ Delete sections (items become unsectioned)  
✅ View items grouped by sections  
✅ Move items between sections  
✅ Upload Excel/CSV file with BOQ items  
✅ Preview imported data before saving  
✅ Validate Excel data (required columns, data types)  
✅ Bulk insert items from Excel  
✅ Export BOQ to PDF  
✅ PDF includes sections, items, totals  
✅ PDF format matches Malaysian BOQ style (PWD Form 1)  
✅ Download PDF file  

---

## 📊 PROGRESS TRACKING

**Starting Progress:** 55% (66/120 tasks)  
**Expected After Session 5:** 63% (76/120 tasks)  
**Tasks to Complete:** 10 tasks

**Update Progress After Each Task:**
- [ ] 5.1 - Create AddSectionModal component
- [ ] 5.2 - Create EditSectionModal component
- [ ] 5.3 - Extend boqService with section functions
- [ ] 5.4 - Update BOQDetail to show sections
- [ ] 5.5 - Create excelParser utility
- [ ] 5.6 - Create ImportBOQModal component
- [ ] 5.7 - Create pdfGenerator utility
- [ ] 5.8 - Create ExportPDFButton component
- [ ] 5.9 - Test import/export workflows
- [ ] 5.10 - Update PROGRESS.md and DAILY_LOG.md

---

## 🎯 AFTER SESSION 5

**What's Next (Session 6):**
- Daily Diary Module (mobile-optimized)
- Photo upload and storage
- MC acknowledgment workflow
- Diary locking mechanism

**User Should Know:**
- Phase 2C (Sections & Import/Export) will be complete
- Progress will be at 63%
- Ready to start Phase 3: Daily Diary Module

---

## 💬 HOW CLAUDE SHOULD START SESSION 5

**Greeting:**
"Bismillah, Eff! Welcome to Session 5. I've reviewed your progress - you're at 55% (66/120 tasks) with Phase 2B complete. Today we'll build BOQ Sections & Import/Export functionality.

I've read SESSION_5_PREP.md and understand:
- Your database schema (boq_sections table ready)
- Existing boqService.js functions
- What needs to be built (Sections CRUD, Excel import, PDF export)
- Libraries needed (xlsx, jspdf)
- Common pitfalls to avoid

We'll install libraries first, then build:
1. Section management modals
2. Section functions in boqService
3. Section display in BOQDetail
4. Excel/CSV import
5. PDF export

Ready to start with installing libraries?"

---

## 🔒 CRITICAL REMINDERS

1. **Always check project knowledge first**
2. **Install xlsx and jspdf libraries before starting**
3. **Use correct import paths** (`lib/supabase` not `config/supabaseClient`)
4. **Don't recreate existing section functions** - use what's in boqService.js
5. **Test Excel parsing with sample file** - don't assume format
6. **Test PDF generation** - verify format and calculations
7. **Handle section deletion** - items should become unsectioned, not deleted
8. **Update progress files** at end of session

---

## 📱 USER PREFERENCES

- **Communication Style:** Direct, clear, step-by-step
- **No Decision Points:** Give expert-directed guidance, don't ask user to choose
- **Testing:** Test each feature after building
- **Documentation:** Update PROGRESS.md and DAILY_LOG.md at end
- **Budget Conscious:** Keep everything on free tier
- **Malaysian Standards:** PWD Form 1, PAM BOQ formats, SST 6%

---

## 📚 REFERENCE MATERIALS

### PWD Form 1 (Malaysian BOQ Format)
- Header: Project name, Contract number, BOQ number
- Sections: Group items by work type (Substructure, Superstructure, etc.)
- Columns: Item No, Description, Unit, Quantity, Rate, Amount
- Footer: Subtotal, SST (6% on materials), Grand Total
- Malaysian units: m², m³, kg, ton, pcs

### Excel Template (Expected Format)
```
Row 1: Headers
Row 2+: Data

Columns:
A: Item Number (e.g., A.1.1)
B: Description (e.g., Excavation for foundation)
C: Unit (e.g., m³)
D: Quantity (e.g., 100.000)
E: Unit Rate (e.g., 25.50)
F: Amount (auto-calculated or provided)
G: Type (optional: material/labor/equipment/subcontractor)
H: Section (optional: A, B, C)
```

---

## 🎨 SAMPLE DATA FOR TESTING

### Sample Excel File Content:
```csv
Item No,Description,Unit,Quantity,Rate,Type,Section
A.1.1,Excavation for foundation,m³,100.000,25.50,labor,A
A.1.2,Concrete Grade 30,m³,50.000,450.00,material,A
B.1.1,Formwork to columns,m²,120.000,45.00,material,B
B.1.2,Steel reinforcement,kg,2500.000,5.80,material,B
C.1.1,Brickwork,m²,200.000,35.00,material,C
```

---

**END OF SESSION 5 PREP SCRIPT**

*This document contains everything Claude needs to successfully guide Session 5.*
