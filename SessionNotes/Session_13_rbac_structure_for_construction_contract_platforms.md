# SESSION 13 PREPARATION
## RBAC Structure for Construction Contract Platforms

**Session Date:** TBD (Post Session 12B)  
**Session Focus:** Role-Based Access Control (RBAC) Structure Refinement  
**Duration Estimate:** 3-4 hours  
**Complexity:** HIGH (System-wide permission architecture)

---

## 🎯 SESSION OBJECTIVES

### Primary Goals:
1. Design comprehensive RBAC permission matrix for construction workflows
2. Implement granular access controls for different user roles
3. Define workflow-based permissions (submit, approve, view, edit)
4. Create permission checking system for UI and API layers
5. Document construction-specific access control requirements

### Secondary Goals:
1. Refine existing RLS policies for workflow permissions
2. Implement role-based UI component visibility
3. Create permission audit system
4. Establish permission testing framework
5. Document permission scenarios and edge cases

---

## 📋 PRE-SESSION CHECKLIST

### User Preparation Required:
- [ ] Complete Session 12B fixes implementation
  - [ ] Replace acceptInvitation function
  - [ ] Replace getMemberStats function
  - [ ] Run FIX_PENDING_INVITATION.sql
  - [ ] Test invitation flow works
  - [ ] Verify all stats display correctly

- [ ] Review current platform roles and permissions
  - [ ] List all user types in system (MC, SC, Consultant, Supplier)
  - [ ] List all contract roles (owner, member, viewer)
  - [ ] List all permission levels (owner, admin, editor, submitter, etc.)
  - [ ] Identify permission pain points or confusion

- [ ] Prepare RBAC requirements
  - [ ] Document who should do what in construction workflows
  - [ ] Identify specific scenarios requiring access control
  - [ ] List any current permission issues or concerns
  - [ ] Prepare example permission matrices if available

- [ ] Git commit all Session 12B changes
  - [ ] Use provided GIT_COMMIT_MESSAGE.txt
  - [ ] Push to repository
  - [ ] Tag as "session-12b-complete"

### Files to Have Ready:
1. ✅ Database Schema (Reference)
2. ✅ Current RLS policies (from Session 12B)
3. ✅ User_profiles table structure
4. ✅ Contract_members table structure
5. 📝 Permission requirements document (user to create)
6. 📝 Construction workflow scenarios (user to document)

---

## 🔍 CURRENT STATE ANALYSIS

### Existing Permission Layers:

#### Layer 1: Company Type (user_profiles.role)
```
- main_contractor (G4-G7 contractors)
- subcontractor (specialized trades)
- consultant (architects, engineers)
- supplier (materials, equipment)
```

**Current Usage:** Company Type Distribution stats, user categorization

#### Layer 2: System Permission Level (user_profiles.user_role)
```
- owner (Super admin - full control)
- admin (Administrative access)
- editor (Create/edit content)
- submitter (Submit only)
- reviewer (Review submissions)
- approver (Approve/reject)
- auditor (Read + export)
- readonly (View only)
```

**Current Usage:** Not fully utilized in application logic

#### Layer 3: Contract Access Level (contract_members.member_role)
```
- owner (Contract creator - full control)
- member (Active participant - can work)
- viewer (Read-only access)
```

**Current Usage:** Member listing, basic access control

### Permission Gaps Identified:

1. **No Workflow Permissions:**
   - Who can submit diaries?
   - Who can approve claims?
   - Who can edit BOQ?
   - Who can generate reports?

2. **No Module-Level Access:**
   - Should all members access all modules?
   - Do viewers need BOQ access?
   - Can subcontractors create claims?

3. **No Action-Level Control:**
   - Create vs Edit vs Delete permissions unclear
   - Submission vs Approval rights undefined
   - Export/Print permissions not implemented

4. **No Hierarchical Permissions:**
   - MC owner vs SC member permissions
   - Main contractor vs subcontractor rights
   - Contract owner vs organization owner confusion

---

## 🏗️ CONSTRUCTION INDUSTRY CONTEXT

### Typical Construction Workflow Roles:

#### Main Contractor (MC):
**Responsibilities:**
- Overall project management
- Coordination of all trades
- Progress tracking and reporting
- Payment processing and claims
- Contract compliance

**Required Permissions:**
- Create/manage contracts
- Invite and manage all team members
- View all work diaries (all trades)
- Create and approve progress claims
- Generate all reports
- Edit BOQ (variations)

#### Subcontractor (SC):
**Responsibilities:**
- Execute specific trade work
- Daily work documentation
- Progress claims submission
- Material and manpower tracking

**Required Permissions:**
- View assigned contracts
- Create work diaries (own trade)
- View BOQ (own items)
- Submit progress claims (own work)
- View own reports
- CANNOT: Approve claims, edit others' work, access other trades

#### Consultant (Architect/Engineer):
**Responsibilities:**
- Design review and approval
- Technical inspection
- Progress verification
- Certification of work

**Required Permissions:**
- View contracts (assigned)
- View all work diaries (read-only)
- View all BOQ items
- Review progress claims (comment/verify)
- Generate inspection reports
- CANNOT: Edit BOQ, approve payments, create diaries

#### Supplier:
**Responsibilities:**
- Material delivery tracking
- Delivery documentation
- Invoice submission

**Required Permissions:**
- View contracts (delivery-related)
- Create delivery logs
- Submit invoices
- View delivery reports
- CANNOT: Access BOQ, create diaries, submit claims

### CIPAA 2012 Compliance Requirements:

**Critical Access Control Needs:**
1. **Contemporaneous Evidence:**
   - Daily diaries must be created by actual workers
   - Timestamp and author tracking essential
   - Cannot be backdated or edited post-submission

2. **Payment Claims:**
   - Claimant creates and submits
   - Payer reviews and approves/disputes
   - Clear audit trail required
   - Cannot alter submitted claims

3. **Documentation Trail:**
   - Who created what, when
   - Approval chains visible
   - Dispute evidence preserved
   - Export for adjudication

---

## 📊 PROPOSED RBAC ARCHITECTURE

### Permission Matrix Framework:

```
PERMISSION = Company Type × System Role × Contract Role × Module × Action

Example:
Main Contractor (company) + Editor (system) + Owner (contract) + BOQ (module) + Edit (action) = ALLOWED

Subcontractor (company) + Editor (system) + Member (contract) + Diary (module) + Create (action) = ALLOWED

Consultant (company) + Reviewer (system) + Viewer (contract) + Claims (module) + Approve (action) = DENIED
```

### Module-Level Permissions:

#### 1. Contract Management Module
| User Type | Contract Role | Create | View | Edit | Delete | Invite |
|-----------|--------------|--------|------|------|--------|--------|
| MC Owner | Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| MC Member | Member | ❌ | ✅ | ❌ | ❌ | ❌ |
| SC Member | Member | ❌ | ✅ | ❌ | ❌ | ❌ |
| Consultant | Viewer | ❌ | ✅ | ❌ | ❌ | ❌ |

#### 2. BOQ Management Module
| User Type | Contract Role | Create | View | Edit | Import | Export |
|-----------|--------------|--------|------|------|--------|--------|
| MC Owner | Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| MC Member | Member | ❌ | ✅ | ⚠️* | ❌ | ✅ |
| SC Member | Member | ❌ | ⚠️** | ❌ | ❌ | ⚠️** |
| Consultant | Viewer | ❌ | ✅ | ❌ | ❌ | ✅ |

*Can edit if assigned editor role  
**Only items in their trade scope

#### 3. Work Diary Module
| User Type | Contract Role | Create | View Own | View All | Edit Own | Delete Own |
|-----------|--------------|--------|----------|----------|----------|------------|
| MC Owner | Owner | ✅ | ✅ | ✅ | ⚠️*** | ⚠️*** |
| MC Member | Member | ✅ | ✅ | ✅ | ⚠️*** | ⚠️*** |
| SC Member | Member | ✅ | ✅ | ❌ | ⚠️*** | ⚠️*** |
| Consultant | Viewer | ❌ | ❌ | ✅ | ❌ | ❌ |

***Only if status = 'draft', cannot edit 'submitted'

#### 4. Progress Claims Module
| User Type | Contract Role | Create | Submit | Approve | Reject | View All |
|-----------|--------------|--------|--------|---------|--------|----------|
| MC Owner | Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| MC Member | Member | ✅ | ✅ | ❌ | ❌ | ✅ |
| SC Member | Member | ✅ | ✅ | ❌ | ❌ | ⚠️**** |
| Consultant | Viewer | ❌ | ❌ | ❌ | ❌ | ✅ |

****Only own claims

#### 5. Reports Module
| User Type | Contract Role | Generate | Export PDF | Export Excel | Schedule |
|-----------|--------------|----------|------------|--------------|----------|
| MC Owner | Owner | ✅ | ✅ | ✅ | ✅ |
| MC Member | Member | ✅ | ✅ | ✅ | ❌ |
| SC Member | Member | ⚠️***** | ✅ | ✅ | ❌ |
| Consultant | Viewer | ✅ | ✅ | ✅ | ❌ |

*****Only reports on own work/claims

---

## 🎯 SESSION 13 DELIVERABLES

### 1. Permission Matrix Document
**File:** RBAC_PERMISSION_MATRIX.md
**Contents:**
- Complete permission matrix for all modules
- Role definitions and hierarchies
- Permission inheritance rules
- Edge cases and exceptions
- Construction workflow scenarios

### 2. Updated Database Schema
**Changes Required:**
- Possible new permission tracking table
- Enhanced contract_members with module permissions
- Activity log for permission audits
- Permission cache for performance

### 3. RLS Policy Updates
**Files:** 
- RBAC_RLS_POLICIES.sql
- MODULE_LEVEL_PERMISSIONS.sql
- WORKFLOW_PERMISSIONS.sql

**Scope:**
- BOQ access by trade scope
- Diary view restrictions
- Claims approval chain
- Report generation limits

### 4. Permission Checking Middleware
**Files:**
- permissionService.js
- rbacMiddleware.js
- permissionHooks.js (React)

**Functions:**
```javascript
// Core permission checker
canUserPerformAction(userId, contractId, module, action)

// Module-specific checks
canCreateDiary(userId, contractId)
canApproveClaim(userId, contractId, claimId)
canEditBOQ(userId, contractId, boqItemId)
canGenerateReport(userId, contractId, reportType)

// UI helpers
hasPermission(module, action)
isContractOwner(contractId)
isOwnWork(resourceId)
```

### 5. UI Component Updates
**Files:**
- Protected components with permission checks
- Conditional rendering based on permissions
- Permission-based button states
- Access denied pages

**Examples:**
```jsx
{hasPermission('diary', 'create') && (
  <CreateDiaryButton />
)}

{canApproveClaim(claimId) ? (
  <ApproveButton />
) : (
  <ViewOnlyBadge />
)}
```

### 6. Testing Framework
**Files:**
- RBAC_TEST_SCENARIOS.md
- Permission test cases
- Role-based test matrix

**Scenarios:**
- MC owner permissions (full access)
- SC member permissions (limited scope)
- Consultant permissions (read-only)
- Cross-contract permissions
- Permission escalation attempts

### 7. Documentation
**Files:**
- RBAC_IMPLEMENTATION_GUIDE.md
- PERMISSION_DEBUGGING_GUIDE.md
- CONSTRUCTION_WORKFLOWS.md
- CIPAA_COMPLIANCE_CHECKLIST.md

---

## 🔧 TECHNICAL IMPLEMENTATION PLAN

### Phase 1: Permission Architecture Design (1 hour)
1. Finalize permission matrix
2. Define permission checking logic
3. Design database schema changes
4. Plan RLS policy structure

### Phase 2: Database & RLS Updates (1 hour)
1. Create/update database tables
2. Implement RLS policies for modules
3. Add permission audit logging
4. Test database-level permissions

### Phase 3: Service Layer Implementation (1 hour)
1. Create permissionService.js
2. Implement core permission functions
3. Add module-specific checks
4. Create permission caching

### Phase 4: UI Integration (45 minutes)
1. Update components with permission checks
2. Implement conditional rendering
3. Add permission-based routing
4. Create access denied pages

### Phase 5: Testing & Documentation (45 minutes)
1. Test all permission scenarios
2. Document permission system
3. Create troubleshooting guide
4. Prepare deployment checklist

---

## 🚨 KEY QUESTIONS FOR SESSION START

**User to Prepare Answers:**

1. **Permission Strictness:**
   - How strict should permission enforcement be?
   - Should there be "soft" vs "hard" restrictions?
   - Grace period for read-only after editing locked?

2. **Trade Scope Implementation:**
   - How to define trade scope boundaries?
   - Can SC see other trades' BOQ items?
   - Should trade scope be contract-specific?

3. **Approval Chains:**
   - Single approver or multi-level?
   - Who can approve MC claims vs SC claims?
   - Automatic approval for small amounts?

4. **Consultant Access:**
   - Full read access to everything?
   - Limited to assigned sections?
   - Can they comment/annotate?

5. **Special Cases:**
   - Emergency edit permissions?
   - Temporary permission elevation?
   - Owner delegation capabilities?

---

## 📚 REFERENCE MATERIALS

### To Review Before Session:

1. **Database Schema:**
   - user_profiles table (role, user_role)
   - contract_members table (member_role)
   - All module tables (work_diaries, progress_claims, boq, etc.)

2. **Current RLS Policies:**
   - From Session 12B fixes
   - contract_members policies
   - user_profiles policies

3. **Construction Industry Standards:**
   - CIPAA 2012 requirements
   - PWD Form 1 specifications
   - PAM 2018 contract structure

4. **Best Practices:**
   - Construction workflow documentation
   - Industry permission standards
   - Audit trail requirements

---

## 💡 SUCCESS CRITERIA

### Session 13 Considered Successful If:

1. ✅ Comprehensive permission matrix created
2. ✅ Database and RLS updated for RBAC
3. ✅ Permission service implemented and working
4. ✅ UI components respect permissions
5. ✅ All test scenarios pass
6. ✅ Documentation complete
7. ✅ No security vulnerabilities
8. ✅ Performance acceptable
9. ✅ CIPAA compliance maintained
10. ✅ User experience remains smooth

---

## 🎯 POST-SESSION DELIVERABLES

### To Be Created During Session 13:

**Documentation:**
- [ ] RBAC_PERMISSION_MATRIX.md
- [ ] RBAC_IMPLEMENTATION_GUIDE.md
- [ ] PERMISSION_DEBUGGING_GUIDE.md
- [ ] CONSTRUCTION_WORKFLOWS.md
- [ ] CIPAA_COMPLIANCE_CHECKLIST.md

**Code:**
- [ ] permissionService.js
- [ ] rbacMiddleware.js
- [ ] permissionHooks.js
- [ ] Updated UI components with permission checks
- [ ] Access denied/restricted pages

**Database:**
- [ ] RBAC_RLS_POLICIES.sql
- [ ] MODULE_LEVEL_PERMISSIONS.sql
- [ ] Permission audit tables (if needed)
- [ ] Migration scripts

**Testing:**
- [ ] RBAC_TEST_SCENARIOS.md
- [ ] Permission test matrix
- [ ] Manual test checklist
- [ ] Edge case scenarios

---

## 📝 NOTES FOR SESSION START

### Quick Context Recap:
- Platform: Contract Diary Pro (CIPAA-compliant)
- Current Status: 110% Phase 2 complete
- Last Session: Fixed contract access and member management
- Current Users: MC owners, SC members, working perfectly
- Main Goal Session 13: Add granular RBAC for construction workflows

### Immediate Session Start Actions:
1. Confirm Session 12B fixes implemented and tested
2. Review current permission pain points
3. Present permission matrix framework
4. Get user approval on permission structure
5. Begin implementation with database/RLS updates

### Keep In Mind:
- Zero-budget constraint (free-tier services)
- CIPAA 2012 compliance critical
- Construction workflow accuracy essential
- User experience must remain smooth
- Performance cannot degrade
- Security is paramount

---

**Session 13 Prep Complete** ✅  
**Ready to Begin:** Upon user confirmation  
**Estimated Duration:** 3-4 hours  
**Complexity Level:** HIGH  
**Expected Outcome:** Production-grade RBAC system for construction workflows
