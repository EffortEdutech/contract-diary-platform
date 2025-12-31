# 📋 SESSION 9 PREPARATION
# PROGRESS CLAIMS MODULE (PHASE 4A)

**Session Focus:** Progress Claims & Payment Tracking  
**Estimated Duration:** 3-4 hours  
**Complexity:** High (Most Complex Module Yet)  
**Expected Progress:** 85% → 95%

---

## 🎯 SESSION OBJECTIVES

### **Primary Goals:**
1. ✅ Create progress claims database schema
2. ✅ Build claim creation functionality
3. ✅ Implement BOQ-based claim generation
4. ✅ Add cumulative progress tracking
5. ✅ Create payment certificate generation

### **Secondary Goals:**
- Claim approval workflow (MC approval)
- Retention management (5% or 10%)
- CIPAA payment timeline tracking
- Claim status tracking
- Basic reporting

---

## 📊 WHAT WE'RE BUILDING

### **Progress Claims System:**
A system for tracking payment claims based on completed work

**Key Features:**
- Link claims to BOQ items
- Track cumulative progress (not just current period)
- Generate payment certificates
- Calculate retention amounts
- Enforce CIPAA payment timelines
- MC approval workflow
- Status tracking (draft/submitted/approved/paid)

---

## 🗄️ DATABASE SCHEMA (Phase 4A)

### **Tables to Create:**

#### **1. progress_claims**
```sql
- id (UUID, primary key)
- contract_id (UUID, FK to contracts)
- claim_number (INTEGER, auto-increment per contract)
- claim_period_from (DATE)
- claim_period_to (DATE)
- submission_date (DATE, default today)
- claim_amount (NUMERIC, calculated)
- retention_percentage (NUMERIC, default 5%)
- retention_amount (NUMERIC, calculated)
- net_claim_amount (NUMERIC, calculated)
- cumulative_claimed (NUMERIC, running total)
- status (TEXT: draft/submitted/approved/rejected/paid)
- approved_date (DATE, nullable)
- approved_by (UUID, FK to user_profiles)
- payment_due_date (DATE, CIPAA 30 days from submission)
- payment_date (DATE, nullable)
- notes (TEXT, nullable)
- created_by (UUID, FK to user_profiles)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### **2. claim_items**
```sql
- id (UUID, primary key)
- claim_id (UUID, FK to progress_claims)
- boq_item_id (UUID, FK to boq_items)
- quantity_claimed (NUMERIC, this claim)
- cumulative_quantity (NUMERIC, total to date)
- boq_quantity (NUMERIC, from boq_items)
- percentage_complete (NUMERIC, calculated)
- unit_rate (NUMERIC, from boq_items)
- amount (NUMERIC, calculated)
- notes (TEXT, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### **3. payment_certificates**
```sql
- id (UUID, primary key)
- claim_id (UUID, FK to progress_claims)
- certificate_number (TEXT, e.g., "PC-001")
- issue_date (DATE)
- certified_amount (NUMERIC)
- retention_held (NUMERIC)
- net_payment (NUMERIC)
- issued_by (UUID, FK to user_profiles, MC role)
- status (TEXT: issued/paid/disputed)
- pdf_url (TEXT, nullable)
- created_at (TIMESTAMPTZ)
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### **Service Layer:**

**File:** `frontend/src/services/claimService.js`

**Functions to Implement:**
```javascript
// CRUD Operations
- createClaim(contractId, data)
- getClaimsByContract(contractId)
- getClaimById(claimId)
- updateClaim(claimId, data)
- deleteClaim(claimId) // draft only

// Claim Items
- addClaimItem(claimId, boqItemId, quantity)
- updateClaimItem(itemId, quantity)
- removeClaimItem(itemId)
- getClaimItems(claimId)

// Calculations
- calculateClaimAmount(claimId)
- calculateRetention(amount, percentage)
- calculateCumulativeProgress(contractId)
- updateCumulativeTotals(claimId)

// Workflow
- submitClaim(claimId)
- approveClaim(claimId, approvedAmount)
- rejectClaim(claimId, reason)
- markPaid(claimId, paymentDate)

// Payment Certificate
- generateCertificate(claimId)
- getCertificate(claimId)

// Statistics
- getClaimSummary(contractId)
- getPaymentStatus(contractId)
```

---

## 📁 FILES TO CREATE

### **Database Scripts (SQL):**
1. `001_create_progress_claims_table.sql`
2. `002_create_claim_items_table.sql`
3. `003_create_payment_certificates_table.sql`
4. `004_create_claim_triggers.sql`
5. `005_setup_claim_rls_policies.sql`

### **Service Layer:**
6. `frontend/src/services/claimService.js`

### **React Components:**
7. `frontend/src/pages/claims/ClaimList.js`
8. `frontend/src/pages/claims/CreateClaim.js`
9. `frontend/src/pages/claims/ClaimDetail.js`
10. `frontend/src/pages/claims/EditClaim.js`
11. `frontend/src/components/claims/ClaimItemSelector.js`
12. `frontend/src/components/claims/ClaimSummary.js`

### **Documentation:**
13. `SESSION_9_SUMMARY.md`
14. `CLAIMS_MODULE_GUIDE.md`
15. `CIPAA_PAYMENT_TIMELINE.md`

**Total Files:** ~15 files

---

## 📝 KEY CONCEPTS

### **Cumulative Progress Tracking:**

**Example:**
```
BOQ Item: Concrete Works - 100 m³ @ RM 300/m³

Claim 1: 30 m³ (30% complete)
  - This claim: 30 m³ × RM 300 = RM 9,000
  - Cumulative: 30 m³ (30%)

Claim 2: 25 m³ additional work
  - This claim: 25 m³ × RM 300 = RM 7,500
  - Cumulative: 55 m³ (55%)

Claim 3: 20 m³ additional work
  - This claim: 20 m³ × RM 300 = RM 6,000
  - Cumulative: 75 m³ (75%)
```

**Database must track:**
- `quantity_claimed` (this claim only)
- `cumulative_quantity` (total to date)
- `boq_quantity` (total in contract)
- `percentage_complete` (cumulative / BOQ quantity)

### **Retention:**

**Standard Practice:**
- 5% or 10% retention held
- Deducted from each claim
- Released at practical completion
- Some may be released at 50% completion

**Calculation:**
```
Claim Amount: RM 100,000
Retention (5%): RM 5,000
Net Payment: RM 95,000
```

### **CIPAA Payment Timeline:**

**Key Dates:**
1. **Submission Date:** When SC submits claim
2. **Verification Period:** 21 days for MC to verify
3. **Payment Certificate:** MC issues within 21 days
4. **Payment Due:** 30 days from submission
5. **Late Payment Interest:** 10% per annum

**Database must track:**
- `submission_date`
- `payment_due_date` (submission + 30 days)
- `approved_date`
- `payment_date`

---

## 🔐 SECURITY & PERMISSIONS

### **RLS Policies:**

**progress_claims table:**
- SELECT: MC sees all, SC sees own
- INSERT: MC and SC can create
- UPDATE: Creator only, draft status only
- DELETE: Creator only, draft status only

**claim_items table:**
- SELECT: Via claim permissions
- INSERT: Via claim permissions
- UPDATE: Via claim permissions
- DELETE: Via claim permissions

**payment_certificates table:**
- SELECT: MC and SC on their contracts
- INSERT: MC only
- UPDATE: MC only
- DELETE: None (immutable)

---

## 🧪 TESTING CHECKLIST

### **Database:**
- [ ] Tables created successfully
- [ ] Triggers working (auto-calculations)
- [ ] RLS policies enforced
- [ ] Foreign key constraints work

### **Functionality:**
- [ ] Create claim with items
- [ ] Calculate amounts correctly
- [ ] Track cumulative progress
- [ ] Calculate retention
- [ ] Submit claim workflow
- [ ] Approve claim (MC only)
- [ ] Generate payment certificate
- [ ] CIPAA timeline calculations

### **Permissions:**
- [ ] MC can create claims
- [ ] SC can create claims
- [ ] MC sees all contract claims
- [ ] SC sees only own claims
- [ ] Only MC can approve
- [ ] Only draft claims editable

### **UI/UX:**
- [ ] Claim list displays correctly
- [ ] Create claim form works
- [ ] BOQ item selector intuitive
- [ ] Cumulative totals visible
- [ ] Status badges clear
- [ ] Mobile responsive

---

## 💡 MALAYSIAN CONTEXT

### **Common Retention Practices:**
- Government projects: 5% retention
- Private projects: 5-10% retention
- Maximum retention period: Until practical completion
- Some release at 50% completion milestone

### **Payment Terms:**
- Progress payment: Monthly or as per milestones
- Payment due: 30 days (CIPAA requirement)
- Late payment: Subject to adjudication
- Final payment: After defects liability period

### **BOQ Structure:**
Most claims follow BOQ structure:
1. Preliminary items (mobilization, etc.)
2. Main works (by trade/section)
3. Variations (if any)
4. Dayworks (if applicable)
5. Provisional sums

---

## 📈 SUCCESS CRITERIA

### **Session 9 Complete When:**
- ✅ All 3 database tables created
- ✅ Claim service functions working
- ✅ Can create claim with items
- ✅ Cumulative calculations correct
- ✅ Submit/approve workflow functional
- ✅ Payment certificate generates
- ✅ All tests passing
- ✅ Documentation complete

### **Expected Results:**
- Progress: 85% → 95% (+ 10 tasks)
- Budget: Still RM 0
- New features: 7-8 features
- Files created: ~15 files
- Lines of code: ~3,000 lines

---

## 🚀 GETTING STARTED

### **Step 1: Review Documentation**
Read these files before starting:
- Current PROGRESS.md (85% status)
- Session 8 summary (photo module)
- BOQ service code (understand structure)
- Contract schema (for FK references)

### **Step 2: Database Setup**
Run scripts in order:
1. Create progress_claims table
2. Create claim_items table
3. Create payment_certificates table
4. Set up triggers
5. Configure RLS policies

### **Step 3: Service Layer**
Build claimService.js:
- Start with CRUD operations
- Add calculation functions
- Implement workflow functions
- Test each function

### **Step 4: UI Components**
Create pages in order:
1. ClaimList (simplest)
2. CreateClaim (most complex)
3. ClaimDetail (medium)
4. EditClaim (similar to create)

### **Step 5: Testing**
- Test create claim flow
- Test cumulative calculations
- Test workflow (submit/approve)
- Test permissions (MC vs SC)

---

## 📝 FIRST SCRIPT READY

**File:** `001_create_progress_claims_table.sql`

This script is ready in the session outputs folder and will:
- Create progress_claims table
- Add all necessary columns
- Set up constraints
- Create indexes
- Add trigger for updated_at

---

## 🎯 SESSION FLOW

**Recommended Flow:**
```
1. Read SESSION_9_PREP.md (this file)
2. Run first script (progress_claims table)
3. Run second script (claim_items table)
4. Run third script (payment_certificates table)
5. Build service layer (claimService.js)
6. Create ClaimList component
7. Create CreateClaim component
8. Test create claim flow
9. Add submit/approve workflow
10. Generate payment certificate
11. Test everything
12. Update PROGRESS.md and DAILY_LOG.md
```

**Time Allocation:**
- Database setup: 30 minutes
- Service layer: 1.5 hours
- UI components: 1.5 hours
- Testing: 30 minutes
- Documentation: 30 minutes
- **Total: 4 hours**

---

## ⚠️ IMPORTANT NOTES

### **DO:**
- ✅ Track cumulative quantities correctly
- ✅ Validate against BOQ limits (can't claim > 100%)
- ✅ Calculate retention properly
- ✅ Enforce CIPAA timelines
- ✅ Use proper date calculations
- ✅ Lock approved claims (no editing)

### **DON'T:**
- ❌ Allow claims without BOQ items
- ❌ Allow cumulative > 100%
- ❌ Allow SC to approve own claims
- ❌ Allow editing approved claims
- ❌ Forget to track cumulative totals
- ❌ Mix up current vs cumulative amounts

---

## 🎊 MOTIVATION

**Why This Module Matters:**
- Core CIPAA compliance functionality
- Direct impact on payment disputes
- Most complex calculations in platform
- Critical for user adoption
- Demonstrates platform value

**After Session 9:**
- Platform will be 95% complete!
- Only reports module remaining
- Production deployment ready
- Full CIPAA compliance achieved
- Complete payment tracking system

---

**Alhamdulillah! Ready for Session 9!** 🚀  
**Let's build the Progress Claims module!** 💰  
**Bismillah!** 📈
