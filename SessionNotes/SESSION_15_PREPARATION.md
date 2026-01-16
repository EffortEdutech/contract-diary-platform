# SESSION 15 PREPARATION DOCUMENT
## GUI Structure Mapping & Navigation Flow Implementation

**Session:** 15  
**Date:** TBD (Following Session 14)  
**Duration:** Estimated 8-10 hours  
**Focus:** Complete GUI mapping, route definition, feature flags, navigation flow

---

## 📋 SESSION 15 OBJECTIVES

### **Primary Goals:**
1. ✅ Map entire GUI structure according to project workflow
2. ✅ Define all routes with feature flag implementation
3. ✅ Create "Coming Soon" components for pending modules
4. ✅ Document complete navigation flow
5. ✅ Design Programme Module wireframes
6. ✅ Map module integration points

### **Success Criteria:**
- [ ] All routes documented and implemented
- [ ] Feature flags control module visibility
- [ ] Navigation flows map to Masterplan workflow
- [ ] "Coming Soon" UX is professional and consistent
- [ ] Programme Module design ready for implementation
- [ ] Clear integration documentation for all modules

---

## 🎯 MASTERPLAN ALIGNMENT

### **Reference Documents:**
1. **Masterplan 10 Jan 2026**
   - Section 6: Core Modules & Responsibilities
   - Section 8: UI/UX Master Layout & Navigation Flow
   - Section 11: Phased Development Roadmap

2. **Technical Appendices**
   - Platform Positioning & Operating Model
   - Data Visibility Rules per Chain Level
   - Contract Coverage Framework

### **Key Masterplan Principles:**

#### **1. Fixed UI Structure (Section 8.2)**
> "All major modules visible from day one, features progressively enabled"

**Implementation Strategy:**
- Tab structure remains consistent throughout development
- Disabled tabs show "Coming Soon" states
- Users see the complete system vision early
- No future UI redesign needed

#### **2. Contract-Centric Design (Section 3.5)**
> "Contract-Centric, Not Feature-Centric"

**Implementation Strategy:**
- All modules accessed via Contract context
- Contract selection determines available data
- Multi-contract support from foundation
- Chain-level visibility enforced

#### **3. Daily Diary as Anchor (Section 3.1)**
> "Daily Diary as the Factual Anchor"

**Workflow Integration:**
```
Daily Diary (Fact Capture)
    ↓
Programme (Time Context)
    ↓
BOQ (Quantity Context)
    ↓
Quality (Inspection/NCR)
    ↓
Claims/EOT (Commercial Outcome)
```

---

## 🗺️ COMPLETE GUI STRUCTURE MAP

### **Top-Level Navigation (Tab-Based)**

Based on Masterplan Section 8.3, the platform has **8 primary tabs:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Contract Diary Platform - [Contract Name]                      │
├─────────────────────────────────────────────────────────────────┤
│ Tabs:                                                            │
│ [Diary] [Programme] [BOQ] [Quality] [Commercial] [Claims]       │
│ [Contract] [Reports]                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

### **1. DAILY DIARY TAB** ✅ **COMPLETE**

**Status:** Production-ready  
**Routes:**
```
/contracts/:id/diary              - Diary list view
/contracts/:id/diary/create       - New diary entry
/contracts/:id/diary/:diaryId     - View/edit diary
/contracts/:id/diary/:diaryId/photos - Photo management
```

**Features Implemented:**
- ✅ Daily entry creation
- ✅ Weather conditions tracking
- ✅ Manpower/equipment JSON fields
- ✅ Photo upload with timestamps
- ✅ Status workflow (draft → submitted → acknowledged)
- ✅ Date-based filtering

**Integration Points:**
- → Programme: Links to work activities
- → BOQ: References BOQ items completed
- → Quality: Triggers inspection requests
- → Claims: Evidence for progress claims
- → EOT: Delay event documentation

**Internal Structure:**
```
Diary Tab
├── List View (date-sorted)
├── Create/Edit Form
│   ├── Basic Info (date, weather, site conditions)
│   ├── Work Progress (narrative)
│   ├── Resources (manpower, equipment)
│   ├── Materials Delivered
│   └── Issues/Delays
├── Photo Gallery
└── Status Actions (submit, acknowledge)
```

---

### **2. PROGRAMME TAB** ⏳ **HIGH PRIORITY - SESSION 15**

**Status:** Not yet implemented  
**Priority:** HIGH  
**Target Completion:** Session 15-16

**Masterplan Reference:**
- Section 6.3: Programme Module (Time Control)
- Section 8.4: Contextual Navigation From Daily Diary

**Planned Routes:**
```
/contracts/:id/programme                      - Programme overview
/contracts/:id/programme/timeline             - Gantt chart view
/contracts/:id/programme/activities           - Activity list
/contracts/:id/programme/activity/:actId      - Activity detail
/contracts/:id/programme/import               - Import from MS Project/Primavera
/contracts/:id/programme/versions             - Programme version history
/contracts/:id/programme/critical-path        - Critical path analysis
```

**Key Features to Implement:**

#### **A. Core Programme Structure:**
```javascript
// Database tables (already exist):
- programme_items (WBS, activities, durations)
- programme_links (predecessors, successors)
- programme_calendars (working days, holidays)
- programme_versions (baseline, revisions)
```

#### **B. User Interface Components:**

**1. Programme Overview Card:**
```
┌────────────────────────────────────────────┐
│ Programme Overview                          │
├────────────────────────────────────────────┤
│ Baseline: Version 1.0 (01 Jan 2024)       │
│ Current: Version 1.2 (15 Jan 2026)        │
│                                            │
│ Total Activities: 156                      │
│ Completed: 89 (57%)                        │
│ In Progress: 24 (15%)                      │
│ Not Started: 43 (28%)                      │
│                                            │
│ Critical Path Activities: 34               │
│ Programme Status: ⚠️ Delayed (12 days)    │
└────────────────────────────────────────────┘
```

**2. Gantt Chart View:**
- Horizontal timeline with bars
- Activity dependencies (FS, SS, FF, SF links)
- Critical path highlighted in red
- Progress overlay (% complete)
- Today's date indicator
- Zoom controls (day, week, month view)

**3. Activity List (Hierarchical WBS):**
```
📁 1.0 Site Mobilization                    [100%] ✅
  📄 1.1 Site Office Setup                  [100%] ✅
  📄 1.2 Worker Accommodation               [100%] ✅
📁 2.0 Foundation Works                     [ 45%] 🔄
  📄 2.1 Excavation                         [100%] ✅
  📄 2.2 Piling                             [ 80%] 🔄 (CRITICAL)
  📄 2.3 Pile Cap Concrete                  [  0%] ⏸️
📁 3.0 Superstructure                       [  0%] ⏳
  📄 3.1 Column Formwork                    [  0%] ⏳ (COMING SOON)
```

**4. Activity Detail Modal:**
```
┌─────────────────────────────────────────────────┐
│ Activity: 2.2 Piling                             │
├─────────────────────────────────────────────────┤
│ WBS Code: 2.2                                   │
│ Type: Task                                       │
│                                                  │
│ Planned Start: 05 Jan 2026                      │
│ Planned Finish: 25 Jan 2026                     │
│ Duration: 15 working days                       │
│                                                  │
│ Actual Start: 06 Jan 2026 (1 day late)         │
│ Expected Finish: 28 Jan 2026 (forecast)        │
│ % Complete: 80%                                  │
│                                                  │
│ Predecessors:                                    │
│  - 2.1 Excavation (FS)                          │
│                                                  │
│ Successors:                                      │
│  - 2.3 Pile Cap Concrete (FS, lag +2 days)     │
│                                                  │
│ Linked BOQ Items:                                │
│  - B.1.2 Bored Piles 600mm diameter            │
│                                                  │
│ Linked Diaries: 12 entries                      │
│ [View Timeline] [Update Progress] [Add Delay]   │
└─────────────────────────────────────────────────┘
```

#### **C. CSV Import Enhancement:**
**Goal:** Allow Programme import from CSV (simpler than MS Project)

**CSV Format:**
```csv
wbs_code,description,planned_start,planned_finish,duration_days,predecessor,boq_link
1.0,"Site Mobilization",2024-01-01,2024-01-10,10,"",""
1.1,"Site Office Setup",2024-01-01,2024-01-05,5,"","A.1"
1.2,"Worker Accommodation",2024-01-06,2024-01-10,5,"1.1FS",""
2.0,"Foundation Works",2024-01-11,2024-02-15,25,"1.0FS",""
2.1,"Excavation",2024-01-11,2024-01-20,10,"2.0FS","B.1"
```

**Import Process:**
1. User uploads CSV file
2. System validates structure
3. Preview shows WBS hierarchy
4. User confirms or edits
5. Creates new programme version
6. Maps to existing BOQ items

#### **D. Integration with Daily Diary:**

**Workflow:**
```
User creates Diary Entry
    ↓
Selects Programme Activities worked on
    ↓
Updates % complete for activities
    ↓
System recalculates programme progress
    ↓
Updates forecast completion dates
```

**UI in Diary Entry:**
```
┌─────────────────────────────────────────┐
│ Work Progress (15 Jan 2026)             │
├─────────────────────────────────────────┤
│ Activities Worked On:                    │
│                                          │
│ [+] Add Activity                         │
│                                          │
│ 🔨 2.2 Piling                           │
│    Previous: 70% → Today: 80%           │
│    Piles completed: 15 of 18            │
│                                          │
│ 🔨 2.1 Excavation                       │
│    Status: ✅ Completed today           │
│    Final depth: 3.5m as per drawing     │
└─────────────────────────────────────────┘
```

---

### **3. BOQ TAB** ✅ **COMPLETE (Enhanced in Session 15)**

**Status:** Production-ready, enhancement planned  
**Current Routes:**
```
/contracts/:id/boq                - BOQ list
/contracts/:id/boq/:boqId         - BOQ detail
/contracts/:id/boq/create         - Create new BOQ
/contracts/:id/boq/:boqId/edit    - Edit BOQ
```

**Session 15 Enhancement: CSV Import**

**Goal:** Allow BOQ import from standard QS Excel/CSV templates

**CSV Format Example:**
```csv
section_number,section_title,item_number,description,unit,quantity,unit_rate
A,"Preliminary",A.1,"Mobilization",lot,1,50000.00
A,"Preliminary",A.2,"Site Office",month,12,3500.00
B,"Earthworks",B.1,"Excavation",m3,1500,35.00
B,"Earthworks",B.2,"Filling",m3,800,28.50
```

**Import UI:**
```
┌───────────────────────────────────────────────┐
│ Import BOQ from CSV/Excel                     │
├───────────────────────────────────────────────┤
│ Step 1: Upload File                           │
│ [📎 Choose File] boq_template.csv             │
│                                                │
│ Step 2: Map Columns                           │
│ CSV Column      → BOQ Field                   │
│ section_number  → Section Number              │
│ section_title   → Section Title               │
│ item_number     → Item Number                 │
│ description     → Description                 │
│ unit            → Unit                        │
│ quantity        → Quantity                    │
│ unit_rate       → Unit Rate                   │
│                                                │
│ Step 3: Preview (showing first 5 items)       │
│ A.1 - Mobilization | lot | 1 | RM 50,000     │
│ A.2 - Site Office | month | 12 | RM 3,500    │
│ ...                                            │
│                                                │
│ [Cancel] [Import BOQ]                         │
└───────────────────────────────────────────────┘
```

---

### **4. QUALITY TAB** ⏳ **HIGH PRIORITY - SESSION 17-18**

**Status:** Not yet implemented  
**Priority:** HIGH  
**Target Completion:** Session 17-18

**Masterplan Reference:**
- Section 6.5: Quality Module (Inspections, Tests, NCR, CAR)
- Section 7.8: Quality Data Model

**Planned Routes:**
```
/contracts/:id/quality                      - Quality dashboard
/contracts/:id/quality/inspections          - Inspection list
/contracts/:id/quality/inspection/:id       - Inspection detail
/contracts/:id/quality/inspection/create    - Request inspection
/contracts/:id/quality/tests                - Test records list
/contracts/:id/quality/test/:id             - Test detail
/contracts/:id/quality/ncr                  - NCR list
/contracts/:id/quality/ncr/:id              - NCR detail
/contracts/:id/quality/car                  - CAR list
/contracts/:id/quality/car/:id              - CAR detail
```

**Key Sub-Modules:**

#### **A. Inspections:**
- RFI (Request for Inspection)
- Hold Points (mandatory inspections)
- Witness Points (optional inspections)
- Routine inspections
- Final inspections

**Workflow:**
```
Contractor submits RFI
    ↓
Consultant/SO schedules inspection
    ↓
Inspection conducted (pass/fail/conditional)
    ↓
If fail → NCR issued
    ↓
NCR → CAR (Corrective Action)
    ↓
Verification → Close-out
```

#### **B. Tests:**
- Concrete cube tests
- Soil compaction tests
- Rebar tests
- Steel tests
- Other material tests

#### **C. NCR (Non-Conformance Report):**
- Issue identification
- Severity classification (Critical/Major/Minor)
- Responsible party assignment
- Photos (before/after)
- Linked to diary, inspection, programme

#### **D. CAR (Corrective Action Request):**
- Action description
- Target completion date
- Implementation verification
- Close-out approval

---

### **5. COMMERCIAL TAB** ⏳ **MEDIUM PRIORITY - SESSION 19-20**

**Status:** Progress Claims implemented, VO pending  
**Priority:** MEDIUM  
**Target Completion:** Session 19-20

**Current Routes:**
```
/contracts/:id/claims              - Progress claims (✅ DONE)
/contracts/:id/claims/:id          - Claim detail (✅ DONE)
/contracts/:id/claims/create       - Create claim (✅ DONE)
```

**Planned Routes:**
```
/contracts/:id/commercial                    - Commercial dashboard
/contracts/:id/commercial/vo                 - Variation Orders list
/contracts/:id/commercial/vo/:id             - VO detail
/contracts/:id/commercial/vo/create          - Create VO
/contracts/:id/commercial/instructions       - Site Instructions
/contracts/:id/commercial/submissions        - Submissions log
/contracts/:id/commercial/approvals          - Approvals register
```

**Sub-Modules to Implement:**

#### **A. Variation Orders (VO):**
- VO request/instruction
- Scope description
- Cost estimate
- Programme impact
- Status workflow
- Linked to BOQ, Programme, Claims

#### **B. Site Instructions:**
- Architect/Engineer Instructions
- Directions
- Clarifications
- Potential time/cost impact flags

---

### **6. CLAIMS TAB** ⏳ **MEDIUM PRIORITY - SESSION 21-22**

**Status:** Basic structure exists, EOT pending  
**Priority:** MEDIUM  
**Target Completion:** Session 21-22

**Planned Routes:**
```
/contracts/:id/claims-eot                    - Claims & EOT dashboard
/contracts/:id/claims-eot/eot                - EOT claims list
/contracts/:id/claims-eot/eot/:id            - EOT detail
/contracts/:id/claims-eot/eot/create         - Create EOT claim
/contracts/:id/claims-eot/delay-events       - Delay events log
/contracts/:id/claims-eot/loss-expense       - Loss & Expense claims
```

**Key Sub-Modules:**

#### **A. EOT (Extension of Time):**
- Delay event registration
- Evidence bundling (diaries, weather, photos)
- Programme analysis
- Claim preparation
- Submission tracking

#### **B. Delay Events:**
- Event categorization (weather, variation, late instruction, etc.)
- Critical path impact analysis
- Weather data integration
- Linked to diaries, programme, instructions

#### **C. Loss & Expense:**
- Prolongation costs
- Disruption claims
- Cost substantiation
- Evidence trail

---

### **7. CONTRACT TAB** ✅ **COMPLETE**

**Status:** Production-ready  
**Routes:**
```
/contracts                         - Contracts list (✅ DONE)
/contracts/create                  - Create contract (✅ DONE)
/contracts/:id                     - Contract dashboard (✅ DONE)
/contracts/:id/edit                - Edit contract (✅ DONE)
/contracts/:id/members             - Member management (✅ DONE)
/contracts/:id/members/invite      - Invite member (✅ DONE)
```

**Features Implemented:**
- ✅ Contract CRUD
- ✅ Contract dashboard with summary cards
- ✅ Member invitation system
- ✅ Role-based permissions (8 tiers)
- ✅ Organization linkage
- ✅ CIDB registration tracking

**Planned Enhancement (Session 23+):**
```
/contracts/:id/milestones          - Contract milestones (CPC, WC, DLP)
/contracts/:id/securities          - Performance bonds, insurance
/contracts/:id/documents           - Contract documents library
```

---

### **8. REPORTS TAB** 🔄 **85% COMPLETE**

**Status:** In progress  
**Current Routes:**
```
/contracts/:id/reports             - Reports dashboard (✅ DONE)
/contracts/:id/reports/daily       - Daily reports (🔄 IN PROGRESS)
/contracts/:id/reports/weekly      - Weekly reports (🔄 IN PROGRESS)
/contracts/:id/reports/monthly     - Monthly reports (🔄 IN PROGRESS)
/contracts/:id/reports/custom      - Custom date range (⏳ PLANNED)
```

**Features Implemented:**
- ✅ Report summary cards
- ✅ Tab-based navigation
- ✅ Date range filters inside tabs
- 🔄 Report generation logic (partial)

**Planned Enhancements:**
- Report template selection
- PDF export with PWD Form 1 compliance
- AI-assisted narrative generation
- Evidence attachment
- Approval workflow

---

## 🚦 FEATURE FLAGS IMPLEMENTATION

### **Purpose:**
- Control module visibility during development
- Enable/disable features per environment
- A/B testing capabilities
- Gradual rollout strategy

### **Implementation Strategy:**

#### **A. Feature Flag Configuration File:**

```javascript
// frontend/src/config/featureFlags.js

export const FEATURE_FLAGS = {
  // Core modules (always enabled)
  DIARY: true,
  CONTRACT: true,
  BOQ: true,
  CLAIMS_PROGRESS: true,
  REPORTS: true,
  MEMBERS: true,
  
  // In development
  PROGRAMME: false,        // Session 15-16
  QUALITY: false,          // Session 17-18
  COMMERCIAL_VO: false,    // Session 19-20
  CLAIMS_EOT: false,       // Session 21-22
  CONTRACT_SECURITIES: false, // Session 23+
  SAFETY: false,           // Session 23+
  
  // Feature enhancements
  BOQ_CSV_IMPORT: false,   // Session 15
  PROGRAMME_CSV_IMPORT: false, // Session 15
  AI_REPORT_ASSIST: false, // Future
  WEATHER_API_INTEGRATION: false, // Future
  
  // Environment-specific
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  SHOW_COMING_SOON: true,  // Show disabled features with "Coming Soon"
};

// Helper function
export const isFeatureEnabled = (featureName) => {
  return FEATURE_FLAGS[featureName] === true;
};
```

#### **B. Feature Flag Component Wrapper:**

```javascript
// frontend/src/components/common/FeatureFlag.js

import React from 'react';
import { isFeatureEnabled } from '../../config/featureFlags';
import ComingSoon from './ComingSoon';

const FeatureFlag = ({ 
  feature, 
  children, 
  fallback = null,
  showComingSoon = true 
}) => {
  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }
  
  if (showComingSoon) {
    return <ComingSoon featureName={feature} />;
  }
  
  return fallback;
};

export default FeatureFlag;
```

#### **C. Usage in Components:**

```javascript
// Example: Programme Tab
import FeatureFlag from '../common/FeatureFlag';
import { FEATURE_FLAGS } from '../../config/featureFlags';

const ContractDetail = () => {
  return (
    <div className="tabs">
      <Tab label="Diary" path="diary" />
      
      <FeatureFlag feature="PROGRAMME">
        <Tab label="Programme" path="programme" />
      </FeatureFlag>
      
      <Tab label="BOQ" path="boq" />
      
      <FeatureFlag feature="QUALITY">
        <Tab label="Quality" path="quality" />
      </FeatureFlag>
      
      {/* ... other tabs */}
    </div>
  );
};
```

---

## 🚧 "COMING SOON" COMPONENT DESIGN

### **Purpose:**
Show users the complete platform vision while clearly indicating what's available now vs. future.

### **Design Specifications:**

#### **A. Coming Soon Card (Small):**
```
┌─────────────────────────────────────┐
│  🚀 Coming Soon                     │
│                                     │
│  Programme Module                   │
│  Expected: Session 15-16            │
│                                     │
│  [Learn More] [Notify Me]          │
└─────────────────────────────────────┘
```

#### **B. Coming Soon Page (Full):**
```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                    🚀                                     │
│                                                           │
│            Programme Module                               │
│            Coming Soon                                     │
│                                                           │
│  The Programme Module will enable:                        │
│  • Work programme scheduling and tracking                 │
│  • Gantt chart visualization                              │
│  • Critical path analysis                                 │
│  • Integration with Daily Diary and BOQ                   │
│  • MS Project / Primavera import                          │
│  • Programme version management                           │
│                                                           │
│  Expected Release: Session 15-16                          │
│                                                           │
│  [📧 Notify Me When Available]                           │
│  [📄 View Technical Documentation]                        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### **C. Component Implementation:**

```javascript
// frontend/src/components/common/ComingSoon.js

import React from 'react';

const featureInfo = {
  PROGRAMME: {
    title: "Programme Module",
    description: "Work scheduling, Gantt charts, critical path analysis",
    expectedSession: "Session 15-16",
    icon: "📅",
    features: [
      "Work programme scheduling and tracking",
      "Interactive Gantt chart visualization",
      "Critical path analysis",
      "Integration with Daily Diary and BOQ",
      "MS Project / Primavera import",
      "Programme version management"
    ]
  },
  QUALITY: {
    title: "Quality Module",
    description: "Inspections, tests, NCR, and CAR management",
    expectedSession: "Session 17-18",
    icon: "✓",
    features: [
      "Request for Inspection (RFI)",
      "Test records management",
      "Non-Conformance Reports (NCR)",
      "Corrective Action Requests (CAR)",
      "Photo documentation",
      "Close-out tracking"
    ]
  },
  // ... other modules
};

const ComingSoon = ({ featureName, variant = 'card' }) => {
  const info = featureInfo[featureName] || {
    title: "Feature Coming Soon",
    description: "This feature is under development",
    icon: "🚀"
  };
  
  if (variant === 'card') {
    return (
      <div className="coming-soon-card">
        <span className="icon">{info.icon}</span>
        <h3>{info.title}</h3>
        <p>{info.description}</p>
        <p className="session">Expected: {info.expectedSession}</p>
      </div>
    );
  }
  
  // Full page variant
  return (
    <div className="coming-soon-page">
      <div className="icon-large">{info.icon}</div>
      <h1>{info.title}</h1>
      <h2>Coming Soon</h2>
      
      <div className="description">
        <p>This module will enable:</p>
        <ul>
          {info.features.map((feature, idx) => (
            <li key={idx}>{feature}</li>
          ))}
        </ul>
      </div>
      
      <p className="expected">Expected Release: {info.expectedSession}</p>
      
      <div className="actions">
        <button className="btn-primary">📧 Notify Me When Available</button>
        <button className="btn-secondary">📄 View Documentation</button>
      </div>
    </div>
  );
};

export default ComingSoon;
```

---

## 🎨 PROGRAMME MODULE WIREFRAMES

### **A. Programme Overview Page:**

```
┌────────────────────────────────────────────────────────────────────┐
│ Programme - Peningkatan Jalan Raya KM 15-22                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [Timeline] [Activities] [Critical Path] [Versions] [Import]        │
│                                                                     │
│ ┌─────────────────────┐  ┌─────────────────────┐                  │
│ │ Programme Status    │  │ Key Dates           │                  │
│ │                     │  │                     │                  │
│ │ ⚠️ 12 days delayed  │  │ Start: 01 Jan 2024 │                  │
│ │                     │  │ Original End: 31... │                  │
│ │ Current Version:1.2 │  │ Forecast End: 12... │                  │
│ └─────────────────────┘  └─────────────────────┘                  │
│                                                                     │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Progress Overview                                            │  │
│ │                                                              │  │
│ │ Completed: 89 █████████░░░░░░░ 57%                          │  │
│ │ In Progress: 24 ███░░░░░░░░░░░░ 15%                         │  │
│ │ Not Started: 43 █████░░░░░░░░░░ 28%                         │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌──────────────────────────────────────────────────────────────┐  │
│ │ Recent Activity Updates                                      │  │
│ │                                                              │  │
│ │ 📅 15 Jan: 2.2 Piling → 80% (from 70%)                     │  │
│ │ ✅ 14 Jan: 2.1 Excavation → Completed                      │  │
│ │ ⚠️ 13 Jan: 2.3 Pile Cap → Delayed (rain)                   │  │
│ └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### **B. Gantt Chart View:**

```
┌────────────────────────────────────────────────────────────────────┐
│ Timeline View - January 2026                                       │
├────────────────────────────────────────────────────────────────────┤
│ [◀ Dec 2025] [Jan 2026] [Feb 2026 ▶]  Zoom: [Day Week Month]     │
│                                                                     │
│ Activity              │ 1  5  10  15  20  25  30                   │
│ ─────────────────────┼────────────────────────────────────────    │
│ 📁 1.0 Mobilization  │████████████░░░░░░░░░░░░░░░░░░ 100%         │
│   1.1 Site Office    │██████░░░░░░░░░░░░░░░░░░░░░░░░ 100%         │
│   1.2 Accommodation  │      ██████░░░░░░░░░░░░░░░░░░ 100%         │
│ 📁 2.0 Foundation    │      ░░░░░░██████████████░░░░░░ 45%         │
│   2.1 Excavation     │      ░░░░░░██████░░░░░░░░░░░░░ 100%         │
│   2.2 Piling 🔴      │      ░░░░░░░░░░░░████████░░░░░░ 80%         │
│   2.3 Pile Cap       │      ░░░░░░░░░░░░░░░░░░░░████░░   0%         │
│ 📁 3.0 Superstructure│      ░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%         │
│                      │            ▲ Today                          │
└────────────────────────────────────────────────────────────────────┘

Legend: 🔴 Critical Path  █ Complete  ░ Remaining
```

### **C. Activity List View:**

```
┌────────────────────────────────────────────────────────────────────┐
│ Activities - Hierarchical WBS View                                 │
├────────────────────────────────────────────────────────────────────┤
│ [+ Expand All] [− Collapse All] [🔍 Search] [📥 Export]            │
│                                                                     │
│ WBS    Activity                      Start    Finish   Dur   %     │
│ ────────────────────────────────────────────────────────────────── │
│ 📂 1.0 Site Mobilization            01 Jan   10 Jan   10   100% ✅│
│   📄 1.1 Site Office Setup          01 Jan   05 Jan    5   100% ✅│
│   📄 1.2 Worker Accommodation       06 Jan   10 Jan    5   100% ✅│
│                                                                     │
│ 📂 2.0 Foundation Works             11 Jan   15 Feb   25    45% 🔄│
│   📄 2.1 Excavation                 11 Jan   20 Jan   10   100% ✅│
│   📄 2.2 Piling 🔴                  21 Jan   05 Feb   10    80% 🔄│
│   📄 2.3 Pile Cap Concrete          06 Feb   15 Feb    8     0% ⏸️│
│                                                                     │
│ 📂 3.0 Superstructure               16 Feb   30 Apr   52     0% ⏳│
│   📄 3.1 Column Formwork            16 Feb   28 Feb    9     0% ⏳│
│   📄 3.2 Column Concreting          01 Mar   10 Mar    7     0% ⏳│
│   ...                                                               │
│                                                                     │
│ [+ Add Activity] [📤 Import Programme]                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 MODULE INTEGRATION MAP

### **Integration Matrix:**

```
              │ Diary │ Prog │ BOQ │ Qual │ Comm │ Claims │ Contract │
──────────────┼───────┼──────┼─────┼──────┼──────┼────────┼──────────┤
Diary         │   -   │  ✓   │  ✓  │  ✓   │  ✓   │   ✓    │    ✓     │
Programme     │   ✓   │  -   │  ✓  │  ✓   │  ✓   │   ✓    │    ✓     │
BOQ           │   ✓   │  ✓   │  -  │  ✓   │  ✓   │   ✓    │    ✓     │
Quality       │   ✓   │  ✓   │  ✓  │  -   │  ✓   │   ✓    │    ✓     │
Commercial    │   ✓   │  ✓   │  ✓  │  ✓   │  -   │   ✓    │    ✓     │
Claims/EOT    │   ✓   │  ✓   │  ✓  │  ✓   │  ✓   │   -    │    ✓     │
Contract      │   ✓   │  ✓   │  ✓  │  ✓   │  ✓   │   ✓    │    -     │
```

### **Key Integration Workflows:**

#### **1. Daily Diary → Programme:**
```
User creates diary entry
    ↓
Selects activities worked on (from Programme)
    ↓
Updates activity % complete
    ↓
Programme recalculates forecasts
```

**Database Linkage:**
```sql
work_diaries.work_progress (JSON) 
    references programme_items.id
```

#### **2. Daily Diary → BOQ:**
```
User records work done
    ↓
Links to BOQ items
    ↓
Quantities completed recorded
    ↓
Progress claim can reference diary evidence
```

**Database Linkage:**
```sql
work_diaries.work_progress (JSON) 
    references boq_items.id
```

#### **3. Programme → BOQ:**
```
Programme activities 
    ↓
Linked to BOQ line items
    ↓
Cost loaded schedule
    ↓
Progress measurement
```

**Database Linkage:**
```sql
programme_items.linked_boq_item_id 
    → boq_items.id
```

#### **4. Quality → Diary:**
```
Diary entry mentions inspection needed
    ↓
Triggers RFI creation
    ↓
Inspection scheduled
    ↓
Results recorded
    ↓
If fail → NCR linked to diary date
```

**Database Linkage:**
```sql
inspections.linked_diary_id 
    → work_diaries.id

ncr.linked_diary_id 
    → work_diaries.id
```

#### **5. Claims → Diary + Programme + BOQ:**
```
EOT Claim preparation
    ↓
Gather diary entries (delay evidence)
    ↓
Programme analysis (critical path impact)
    ↓
BOQ linkage (cost substantiation)
    ↓
Bundle into claim submission
```

**Database Linkage:**
```sql
eot_claims.linked_delay_event_ids (JSON array)
delay_events.linked_diary_ids (JSON array)
delay_events.linked_programme_items (JSON array)
```

---

## 📝 SESSION 15 DELIVERABLES CHECKLIST

### **Phase 1: Documentation & Planning (2 hours)**
- [ ] Review Masterplan Sections 6 & 8
- [ ] Map all pending routes
- [ ] Define feature flag structure
- [ ] Design "Coming Soon" components
- [ ] Create Programme Module wireframes

### **Phase 2: Feature Flags Implementation (2 hours)**
- [ ] Create `featureFlags.js` configuration
- [ ] Implement `FeatureFlag` wrapper component
- [ ] Implement `ComingSoon` component (card + page variants)
- [ ] Update all tab navigation to use feature flags
- [ ] Test feature toggle behavior

### **Phase 3: Programme Module Foundation (3 hours)**
- [ ] Create Programme module routes
- [ ] Implement Programme overview page (with "Coming Soon" content)
- [ ] Create activity list component structure
- [ ] Design Gantt chart wireframe (static first)
- [ ] Implement Programme-Diary integration points

### **Phase 4: BOQ CSV Import (2 hours)**
- [ ] Design CSV import UI
- [ ] Implement file upload component
- [ ] Create CSV parser utility
- [ ] Implement preview and validation
- [ ] Test import with sample data

### **Phase 5: Documentation & Testing (1 hour)**
- [ ] Update navigation documentation
- [ ] Document all new routes
- [ ] Test all feature flags
- [ ] Verify "Coming Soon" displays correctly
- [ ] Create Session 16 preparation document

---

## 🎯 SESSION 15 SUCCESS CRITERIA

### **Technical:**
- [ ] All routes defined and documented
- [ ] Feature flags operational
- [ ] "Coming Soon" components render correctly
- [ ] Programme module structure in place
- [ ] BOQ CSV import functional

### **UX/UI:**
- [ ] Navigation is intuitive and consistent
- [ ] "Coming Soon" messaging is clear and professional
- [ ] Tab structure reflects complete platform vision
- [ ] Users understand what's available vs. coming soon

### **Documentation:**
- [ ] Complete route mapping documented
- [ ] Feature flag usage guide created
- [ ] Programme Module technical specification written
- [ ] Integration points clearly defined
- [ ] Session 16 preparation ready

---

## 📚 REFERENCE MATERIALS

### **Masterplan Sections to Review:**
1. **Section 3:** Design Principles (especially 3.1-3.6)
2. **Section 6:** Core Modules & Responsibilities (all subsections)
3. **Section 7:** Data Model & Linkages
4. **Section 8:** UI/UX Master Layout & Navigation Flow
5. **Section 11:** Phased Development Roadmap
6. **Appendix A:** Database Schema, Entity Relationships

### **Technical Appendices:**
1. Platform Positioning & Operating Model
2. Data Visibility Rules per Chain Level
3. Contract Coverage Framework

### **Existing Code to Review:**
1. Current tab navigation implementation
2. Contracts module (as reference for CRUD patterns)
3. BOQ module (for list/detail patterns)
4. Diary module (for form patterns)

---

## 🚀 BEYOND SESSION 15

### **Session 16: Programme Module Implementation**
- Gantt chart visualization (using library like react-gantt-chart)
- Activity CRUD operations
- Progress update from diaries
- Critical path calculation

### **Session 17-18: Quality Module**
- Inspections (RFI, Hold Point, Witness Point)
- Test records
- NCR/CAR workflow
- Photo management

### **Session 19-20: Commercial VO Module**
- Variation Order management
- Site Instructions
- Impact assessment (time + cost)

### **Session 21-22: Claims & EOT Module**
- Delay event registration
- EOT claim preparation
- Evidence bundling
- Loss & Expense claims

---

**Session 15 Status:** 📋 **READY TO START**  
**Estimated Duration:** 8-10 hours  
**Dependencies:** All Session 14 work must be committed and deployed  
**Blockers:** None  

---

*Prepared by: Technical Team*  
*Date: 15 January 2026*  
*Version: 1.0*  
*Status: Ready for Session 15*
