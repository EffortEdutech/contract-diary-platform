# SESSION 18 PREPARATION
## Programme & BOQ Linking Modals

**Date:** 20 January 2026 (Monday)  
**Estimated Duration:** 4 hours  
**Priority:** HIGH - Complete Daily Diary Linking  
**Status:** 🎯 READY TO START

---

## 🎯 SESSION 18 OBJECTIVES

### **PRIMARY GOALS:**

1. **Programme Linking Modal (2 hours)**
   - Build ProgrammeLinkModal.js component
   - Integrate with work activity cards
   - Save to diary_programme_links table
   - Display linked programme in UI
   - Test programme linking workflow

2. **BOQ Linking Modal (2 hours)**
   - Build BOQLinkModal.js component
   - Integrate with material entry cards
   - Save to diary_boq_links table
   - Display linked BOQ in UI
   - Test BOQ quantity tracking

### **SUCCESS CRITERIA:**
- ✅ Both modals functional and integrated
- ✅ Linking saves to database
- ✅ Links display in diary cards
- ✅ Search/filter works smoothly
- ✅ Mobile responsive
- ✅ Zero console errors

---

## 📚 REFERENCE MATERIALS

### **1. Construction Document Master List**
**File:** `construction_contract_management_site_documents_master_list.md`

**Key Sections for Session 18:**

**Section 4: Planning & Scheduling Documents**
- Master Programme
- Detailed Construction Programme
- Look-Ahead Programme (2-week / 4-week)
- Recovery Programme
- Programme Narrative
- **Daily Productivity Records** ← Links to diary activities
- **Resource Histogram** ← Shows manpower/equipment by programme item

**Section 6: Bill of Quantities (BOQ)**
- Contract BOQ (Priced)
- BOQ Sections (A, B, C...)
- BOQ Items with quantities
- **Materials Delivered Records** ← Links to diary materials
- **BOQ Completion Tracking** ← Updated from diary

**Section 5: Site Diary & Daily Records**
- Daily Site Diary ← Our main focus
- Weather Records ← Session 17 ✅
- Manpower Deployment Records ← Links to programme
- Plant & Equipment Utilisation Records
- **Daily Work Progress Logs** ← Links to programme & BOQ

**Linking Logic:**
```
Daily Diary Entry
├─ Work Activity: "Column C1-C5 formwork"
│  └─ Links to: Programme Item "A.1.2 Column Formwork"
│      └─ Updates: Programme Progress 45% → 55%
│
└─ Material Delivery: "Ready-mix concrete 30 m³"
   └─ Links to: BOQ Item "B.2.1 Concrete Grade 30"
       └─ Updates: BOQ Completed 120 m³ / 500 m³ (24%)
```

---

### **2. Database Schema**
**File:** `s15_17Jan2026_Database_Schema/`

**Relevant Tables:**

**A. diary_programme_links:**
```sql
CREATE TABLE diary_programme_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id UUID REFERENCES work_diaries(id) ON DELETE CASCADE,
  programme_item_id UUID REFERENCES programme_items(id),
  activity_title TEXT,
  quantity_completed DECIMAL(10,2),
  unit TEXT,
  work_description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**B. diary_boq_links:**
```sql
CREATE TABLE diary_boq_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id UUID REFERENCES work_diaries(id) ON DELETE CASCADE,
  boq_item_id UUID REFERENCES boq_items(id),
  quantity_completed DECIMAL(10,2),
  unit TEXT,
  work_description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**C. programme_items (for linking):**
```sql
CREATE TABLE programme_items (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  wbs_code TEXT, -- e.g., "A.1.2"
  title TEXT, -- e.g., "Column Formwork"
  description TEXT,
  planned_start DATE,
  planned_finish DATE,
  actual_start DATE,
  actual_finish DATE,
  percent_complete DECIMAL(5,2) DEFAULT 0,
  status TEXT, -- not_started, in_progress, completed
  parent_id UUID REFERENCES programme_items(id)
);
```

**D. boq_items (for linking):**
```sql
CREATE TABLE boq_items (
  id UUID PRIMARY KEY,
  boq_id UUID REFERENCES boqs(id),
  section_id UUID REFERENCES boq_sections(id),
  item_code TEXT, -- e.g., "B.2.1"
  description TEXT,
  unit TEXT, -- m³, m², nos, etc.
  quantity DECIMAL(15,3),
  rate DECIMAL(15,2),
  amount DECIMAL(15,2),
  completed_quantity DECIMAL(15,3) DEFAULT 0,
  percent_complete DECIMAL(5,2) DEFAULT 0
);
```

---

### **3. Frontend Directory Structure**
**File:** `dir_tree_contract-diary-platform_frontend_src`

**Relevant Components Location:**

```
frontend/src/
├── components/
│   ├── diary/
│   │   ├── WeatherObservationCard.js ✅ Session 17
│   │   ├── WeatherObservationModal.js ✅ Session 17
│   │   ├── PhotoUpload.jsx ✅ Session 17
│   │   ├── PhotoGallery.jsx ✅ Session 16
│   │   ├── ProgrammeLinkModal.js ⏳ NEW - Session 18
│   │   └── BOQLinkModal.js ⏳ NEW - Session 18
│   │
│   ├── programme/
│   │   └── (programme components for future)
│   │
│   └── boq/
│       ├── AddBOQItemModal.js ✅ Existing
│       ├── EditBOQItemModal.js ✅ Existing
│       └── (can reference for modal patterns)
│
├── pages/
│   └── diaries/
│       ├── DiaryFormOffline.js ✅ Main form
│       └── DiaryDetail.js ✅ View mode
│
└── services/
    ├── diaryService.js ✅ Core diary functions
    ├── diaryPhotoService.js ✅ Session 17
    ├── programmeService.js ⏳ NEW - Session 18
    └── boqService.js ✅ Existing (can extend)
```

**Modal Pattern to Follow:**
- Reference: `AddBOQItemModal.js` and `EditBOQItemModal.js`
- Search/filter functionality
- Select from list
- Save and close
- Responsive design

---

### **4. Master Plan Reference**
**File:** `Masterplan_10_Jan_2026/`

**Section 3.1: Daily Diary as Factual Anchor**
> "The daily diary is the temporal spine connecting all construction activities. Every programme update, BOQ completion, variation, and EOT claim must trace back to specific diary entries as evidence."

**Section 7: Data Linkages**
> "Programme items link to diary activities through diary_programme_links table, enabling automatic progress tracking. BOQ items link to diary material deliveries and work completed, ensuring accurate valuation."

**Linking Benefits:**
1. **Automatic Progress Updates** - Programme progress from diary
2. **Accurate Valuations** - BOQ completion from actual work
3. **Evidence Chain** - Claims backed by daily records
4. **No Double Entry** - Update once in diary, reflects everywhere
5. **CIPAA Compliance** - Contemporaneous records with linkages

---

### **5. Technical Appendices**
**File:** `Technical_Appendices/`

**Appendix C: Linking Architecture**

**Programme Linking Flow:**
```
User Action:
1. Creates work activity in diary
2. Clicks "Link to Programme" button
3. Modal opens with programme item list
4. Searches/filters: "Column"
5. Selects: "A.1.2 Column Formwork"
6. Saves link

Backend Processing:
1. Insert into diary_programme_links table
2. Update programme_items.percent_complete
3. Update programme_items.actual_progress
4. Trigger dashboard refresh
5. Update S-curve chart

UI Updates:
1. Activity card shows programme badge
2. Badge displays: "A.1.2"
3. Tooltip: "Column Formwork"
4. Programme page shows diary reference
```

**BOQ Linking Flow:**
```
User Action:
1. Creates material delivery in diary
2. Clicks "Link to BOQ" button
3. Modal opens with BOQ item list
4. Searches/filters: "Concrete"
5. Selects: "B.2.1 Concrete Grade 30"
6. Enters quantity: 30 m³
7. Saves link

Backend Processing:
1. Insert into diary_boq_links table
2. Update boq_items.completed_quantity
3. Update boq_items.percent_complete
4. Recalculate section totals
5. Update claims module

UI Updates:
1. Material card shows BOQ badge
2. Badge displays: "B.2.1"
3. Tooltip: "Concrete Grade 30"
4. BOQ page shows diary reference
5. Claims page includes quantity
```

---

## 🛠️ TECHNICAL IMPLEMENTATION PLAN

### **PHASE 1: Programme Linking Modal (2 hours)**

**Step 1: Create Component File (30 min)**

**File:** `frontend/src/components/diary/ProgrammeLinkModal.js`

**Structure:**
```javascript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const ProgrammeLinkModal = ({ 
  contractId,
  activityTitle,
  onLink,
  onClose 
}) => {
  const [programmeItems, setProgrammeItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Load programme items
  useEffect(() => {
    loadProgrammeItems();
  }, [contractId]);
  
  // Filter items based on search
  useEffect(() => {
    filterItems();
  }, [searchTerm, programmeItems]);
  
  // Functions
  const loadProgrammeItems = async () => { ... };
  const filterItems = () => { ... };
  const handleSelect = (item) => { ... };
  const handleLink = async () => { ... };
  
  return (
    <div className="modal">
      {/* Modal content */}
    </div>
  );
};

export default ProgrammeLinkModal;
```

**Step 2: Integrate with DiaryFormOffline (30 min)**

**Location:** `frontend/src/pages/diaries/DiaryFormOffline.js`

**Changes:**
```javascript
// Add state
const [showProgrammeLink, setShowProgrammeLink] = useState(false);
const [activeItemIndex, setActiveItemIndex] = useState(null);

// Add handler
const handleLinkToProgramme = (activityIndex) => {
  setActiveItemIndex(activityIndex);
  setShowProgrammeLink(true);
};

const handleProgrammeLinked = (programmeItem) => {
  // Update activity with programme_item_id
  const updatedActivities = [...workActivities];
  updatedActivities[activeItemIndex].programme_item_id = programmeItem.id;
  updatedActivities[activeItemIndex].programme_wbs_code = programmeItem.wbs_code;
  setWorkActivities(updatedActivities);
  setShowProgrammeLink(false);
};

// Add to JSX (near end)
{showProgrammeLink && (
  <ProgrammeLinkModal
    contractId={contractId}
    activityTitle={workActivities[activeItemIndex]?.title}
    onLink={handleProgrammeLinked}
    onClose={() => setShowProgrammeLink(false)}
  />
)}
```

**Step 3: Update Activity Card Display (30 min)**

**Show Programme Badge in Activity Card:**
```javascript
{activity.programme_wbs_code && (
  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
    📊 {activity.programme_wbs_code}
  </span>
)}
```

**Step 4: Save to Database (30 min)**

**Update handleSave in DiaryFormOffline:**
```javascript
// After saving activities
for (const activity of workActivities) {
  if (activity.programme_item_id) {
    await supabase.from('diary_programme_links').insert({
      diary_id: savedDiary.id,
      programme_item_id: activity.programme_item_id,
      activity_title: activity.title,
      quantity_completed: activity.quantity_completed,
      unit: activity.unit,
      work_description: activity.description,
      created_by: user.id
    });
  }
}
```

---

### **PHASE 2: BOQ Linking Modal (2 hours)**

**Step 1: Create Component File (30 min)**

**File:** `frontend/src/components/diary/BOQLinkModal.js`

**Structure:** Similar to ProgrammeLinkModal
- Search/filter BOQ items
- Show item code, description, unit
- Select and link

**Step 2: Integrate with DiaryFormOffline (30 min)**

**Similar pattern:**
```javascript
const [showBOQLink, setShowBOQLink] = useState(false);
const [activeMaterialIndex, setActiveMaterialIndex] = useState(null);

const handleLinkToBOQ = (materialIndex) => { ... };
const handleBOQLinked = (boqItem) => { ... };
```

**Step 3: Update Material Card Display (30 min)**

**Show BOQ Badge:**
```javascript
{material.boq_item_code && (
  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
    📋 {material.boq_item_code}
  </span>
)}
```

**Step 4: Save to Database (30 min)**

**Similar to programme linking:**
```javascript
for (const material of materials) {
  if (material.boq_item_id) {
    await supabase.from('diary_boq_links').insert({
      diary_id: savedDiary.id,
      boq_item_id: material.boq_item_id,
      quantity_completed: material.quantity,
      unit: material.unit,
      work_description: `Material delivered: ${material.description}`,
      created_by: user.id
    });
  }
}
```

---

## 🧪 TESTING PLAN

### **Programme Linking Tests:**

1. **Create and Link**
   - Add work activity: "Column formwork"
   - Click "Link to Programme"
   - Search: "column"
   - Select: "A.1.2 Column Formwork"
   - Save diary
   - ✅ Verify link in diary_programme_links table

2. **Display Badge**
   - Activity card shows: "📊 A.1.2"
   - Hover shows tooltip: "Column Formwork"

3. **Edit Mode**
   - Edit diary
   - Existing link displays correctly
   - Can change link
   - Can remove link

4. **Search/Filter**
   - Search by WBS code
   - Search by title
   - Filter by status
   - Sort alphabetically

---

### **BOQ Linking Tests:**

1. **Create and Link**
   - Add material delivery: "Concrete 30 m³"
   - Click "Link to BOQ"
   - Search: "concrete"
   - Select: "B.2.1 Concrete Grade 30"
   - Save diary
   - ✅ Verify link in diary_boq_links table

2. **Display Badge**
   - Material card shows: "📋 B.2.1"
   - Hover shows tooltip: "Concrete Grade 30"

3. **Quantity Tracking**
   - BOQ shows completed: 30 m³ / 500 m³
   - Percentage: 6%
   - Multiple deliveries accumulate

4. **Search/Filter**
   - Search by item code
   - Search by description
   - Filter by section
   - Sort by code

---

## 📋 CHECKLIST FOR SESSION 18

### **Before Starting:**
- [ ] Session 17 complete ✅
- [ ] Database schema verified ✅
- [ ] Reference files reviewed
- [ ] Development environment ready
- [ ] Git status clean

### **Phase 1 - Programme Modal:**
- [ ] ProgrammeLinkModal.js created
- [ ] Modal integrated with DiaryFormOffline
- [ ] Activity card shows programme badge
- [ ] Save to diary_programme_links works
- [ ] Search/filter functional
- [ ] Edit mode tested
- [ ] Mobile responsive

### **Phase 2 - BOQ Modal:**
- [ ] BOQLinkModal.js created
- [ ] Modal integrated with DiaryFormOffline
- [ ] Material card shows BOQ badge
- [ ] Save to diary_boq_links works
- [ ] Quantity tracking accurate
- [ ] Search/filter functional
- [ ] Mobile responsive

### **Final Testing:**
- [ ] Create diary with linked activities and materials
- [ ] Edit and verify links persist
- [ ] Check database entries correct
- [ ] Verify badges display
- [ ] Test search performance
- [ ] Mobile device testing
- [ ] Console error-free

### **Documentation:**
- [ ] Update PROGRESS.md
- [ ] Update DAILY_LOG.md
- [ ] Create Session 19 prep
- [ ] Git commit with message

---

## 🎯 SUCCESS METRICS

### **Functional:**
- ✅ Both modals working
- ✅ Linking saves to database
- ✅ Badges display correctly
- ✅ Search performs well
- ✅ Edit mode preserves links

### **Quality:**
- ✅ Zero console errors
- ✅ Responsive design
- ✅ Professional UI/UX
- ✅ Fast performance (<200ms)

### **Business:**
- ✅ CIPAA compliant
- ✅ Programme tracking enabled
- ✅ BOQ tracking enabled
- ✅ Evidence chain complete

---

## 💡 DESIGN CONSIDERATIONS

### **Modal UI Pattern:**

**Good Example (from BOQ module):**
```
┌─────────────────────────────────────┐
│ Link to Programme Item          [X] │
├─────────────────────────────────────┤
│ Activity: Column formwork           │
│                                     │
│ Search: [________________] 🔍      │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ A.1.1 Site Preparation      │   │
│ │ A.1.2 Column Formwork    ✓  │   │ ← Selected
│ │ A.1.3 Column Concrete       │   │
│ │ A.2.1 Beam Formwork         │   │
│ │ ...                         │   │
│ └─────────────────────────────┘   │
│                                     │
│ [Cancel]  [Link to Programme]      │
└─────────────────────────────────────┘
```

**Features:**
- Clear title
- Context (which activity/material)
- Search box at top
- Scrollable list
- Selected item highlighted
- Primary action button (blue)
- Secondary action (cancel)

---

### **Badge Display Pattern:**

**In Activity Card:**
```
┌─────────────────────────────────────┐
│ Column formwork                     │
│ 📊 A.1.2  ⏰ 8:00-17:00  👷 5 pax │ ← Badges
│                                     │
│ Quantity: 20 m²                     │
│ Status: In Progress                 │
└─────────────────────────────────────┘
```

**Badge Colors:**
- Programme: Purple (📊)
- BOQ: Green (📋)
- Time: Blue (⏰)
- Manpower: Orange (👷)

---

## 🚀 READY TO START!

**Pre-Session Checklist:**
- ✅ Session 17 complete (photos working)
- ✅ Database tables ready
- ✅ Reference files available
- ✅ Development environment ready
- ✅ Clear implementation plan

**Estimated Time:**
- Programme Modal: 2 hours
- BOQ Modal: 2 hours
- **Total: 4 hours**

**Target Completion:** 20 January 2026, 13:00

**Alhamdulillah, ready to begin Session 18!** 🎯

---

**Next Session After 18:** Programme Module (Full)
**Focus:** Programme management, Gantt charts, critical path
**Estimated:** 2-3 sessions (12-18 hours)
