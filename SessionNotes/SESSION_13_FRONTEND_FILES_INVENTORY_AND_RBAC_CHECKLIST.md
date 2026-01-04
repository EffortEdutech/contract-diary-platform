# SESSION 13: FRONTEND FILES INVENTORY & RBAC MIGRATION CHECKLIST

**Date:** 03 January 2026  
**Purpose:** Complete file inventory and systematic checklist for RBAC schema changes  
**Changes:** Delete `user_profiles.user_role`, Expand `contract_members.member_role`, Keep `user_profiles.role`

---

## 📁 COMPLETE FRONTEND FILE INVENTORY (96+ FILES)

### **🔐 AUTHENTICATION & CORE (11 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 1 | `frontend/.env` | Supabase config | ❌ No | ❌ No |
| 2 | `frontend/src/index.js` | React entry | ❌ No | ❌ No |
| 3 | `frontend/src/index.css` | Tailwind CSS | ❌ No | ❌ No |
| 4 | `frontend/src/App.js` | Router config | ❌ No | ❌ No |
| 5 | `frontend/src/lib/supabase.js` | Supabase client | ❌ No | ❌ No |
| 6 | `frontend/src/contexts/AuthContext.js` | Auth provider | ⚠️ Maybe | ✅ CHECK |
| 7 | `frontend/src/components/ProtectedRoute.js` | Route guard | ❌ No | ❌ No |
| 8 | `frontend/src/components/Layout.js` | Page layout | ⚠️ Maybe | ✅ CHECK |
| 9 | `frontend/src/pages/Login.js` | Login page | ❌ No | ❌ No |
| 10 | `frontend/src/pages/Signup.js` | Signup page | ⚠️ Creates profile | ✅ UPDATE |
| 11 | `frontend/src/pages/Dashboard.js` | Main dashboard | ⚠️ Maybe | ✅ CHECK |

---

### **📋 CONTRACT MANAGEMENT (5 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 12 | `frontend/src/pages/contracts/Contracts.js` | Contract list | ❌ No | ❌ No |
| 13 | `frontend/src/pages/contracts/ContractForm.js` | Create/edit contract | ⚠️ Creates member | ✅ CHECK |
| 14 | `frontend/src/pages/contracts/ContractDetail.js` | Contract details | ❌ No | ❌ No |
| 15 | `frontend/src/components/contracts/ContractCard.js` | List card | ❌ No | ❌ No |
| 16 | `frontend/src/components/contracts/ContractStats.js` | Statistics | ❌ No | ❌ No |

---

### **📊 BOQ MANAGEMENT (12 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 17 | `frontend/src/services/boqService.js` | BOQ API service | ❌ No | ❌ No |
| 18 | `frontend/src/pages/boq/BOQList.js` | BOQ list | ❌ No | ❌ No |
| 19 | `frontend/src/pages/boq/CreateBOQ.js` | Create BOQ | ❌ No | ❌ No |
| 20 | `frontend/src/pages/boq/BOQDetail.js` | BOQ detail | ⚠️ Role checks | ✅ CHECK |
| 21 | `frontend/src/components/boq/AddBOQItemModal.js` | Add item modal | ❌ No | ❌ No |
| 22 | `frontend/src/components/boq/EditBOQItemModal.js` | Edit item modal | ❌ No | ❌ No |
| 23 | `frontend/src/components/boq/BOQSectionManager.js` | Section manager | ❌ No | ❌ No |
| 24 | `frontend/src/components/boq/BOQItemList.js` | Item list | ❌ No | ❌ No |
| 25 | `frontend/src/components/boq/BOQSummary.js` | Summary | ❌ No | ❌ No |
| 26 | `frontend/src/components/boq/BOQExport.js` | Export | ❌ No | ❌ No |
| 27 | `frontend/src/components/boq/BOQImport.js` | Import | ❌ No | ❌ No |
| 28 | `frontend/src/components/boq/BOQFilters.js` | Filters | ❌ No | ❌ No |

---

### **📝 DAILY DIARY (10 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 29 | `frontend/src/services/diaryService.js` | Diary API | ⚠️ Role checks | ✅ CHECK |
| 30 | `frontend/src/pages/diaries/DiaryList.js` | Diary list | ❌ No | ❌ No |
| 31 | `frontend/src/pages/diaries/DiaryForm.js` | Create/edit diary | ❌ No | ❌ No |
| 32 | `frontend/src/pages/diaries/DiaryDetail.js` | Diary detail | ⚠️ Role checks | ✅ CHECK |
| 33 | `frontend/src/components/diaries/DiaryCard.js` | List card | ❌ No | ❌ No |
| 34 | `frontend/src/components/diaries/DiaryStats.js` | Statistics | ❌ No | ❌ No |
| 35 | `frontend/src/components/diaries/ManpowerSection.js` | Manpower input | ❌ No | ❌ No |
| 36 | `frontend/src/components/diaries/EquipmentSection.js` | Equipment input | ❌ No | ❌ No |
| 37 | `frontend/src/components/diaries/MaterialsSection.js` | Materials input | ❌ No | ❌ No |
| 38 | `frontend/src/components/diaries/WeatherPicker.js` | Weather picker | ❌ No | ❌ No |

---

### **📸 PHOTO MANAGEMENT (11 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 39 | `frontend/src/services/diaryPhotoService.js` | Photo API | ❌ No | ❌ No |
| 40 | `frontend/src/components/photos/PhotoUpload.js` | Upload component | ❌ No | ❌ No |
| 41 | `frontend/src/components/photos/PhotoGallery.js` | Gallery view | ❌ No | ❌ No |
| 42 | `frontend/src/components/photos/PhotoLightbox.js` | Lightbox viewer | ❌ No | ❌ No |
| 43 | `frontend/src/components/photos/PhotoThumbnail.js` | Thumbnail | ❌ No | ❌ No |
| 44 | `frontend/src/components/photos/PhotoGrid.js` | Grid layout | ❌ No | ❌ No |
| 45 | `frontend/src/components/photos/PhotoCaption.js` | Caption input | ❌ No | ❌ No |
| 46 | `frontend/src/components/photos/PhotoDelete.js` | Delete button | ❌ No | ❌ No |
| 47 | `frontend/src/components/photos/PhotoUploadProgress.js` | Progress bar | ❌ No | ❌ No |
| 48 | `frontend/src/components/photos/PhotoFilters.js` | Photo filters | ❌ No | ❌ No |
| 49 | `frontend/src/utils/imageCompression.js` | Image utils | ❌ No | ❌ No |

---

### **💰 PROGRESS CLAIMS (12 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 50 | `frontend/src/services/claimService.js` | Claims API | ⚠️ Role checks | ✅ CHECK |
| 51 | `frontend/src/pages/claims/ClaimList.js` | Claims list | ❌ No | ❌ No |
| 52 | `frontend/src/pages/claims/CreateClaim.js` | Create claim | ❌ No | ❌ No |
| 53 | `frontend/src/pages/claims/ClaimDetail.js` | Claim detail | ⚠️ Role checks | ✅ CHECK |
| 54 | `frontend/src/components/claims/ClaimCard.js` | List card | ❌ No | ❌ No |
| 55 | `frontend/src/components/claims/ClaimStats.js` | Statistics | ❌ No | ❌ No |
| 56 | `frontend/src/components/claims/ClaimItemsTable.js` | Items table | ❌ No | ❌ No |
| 57 | `frontend/src/components/claims/AddClaimItemModal.js` | Add item | ❌ No | ❌ No |
| 58 | `frontend/src/components/claims/ClaimSummary.js` | Summary | ❌ No | ❌ No |
| 59 | `frontend/src/components/claims/ClaimWorkflow.js` | Workflow status | ❌ No | ❌ No |
| 60 | `frontend/src/components/claims/ClaimApproval.js` | Approval UI | ⚠️ Role checks | ✅ CHECK |
| 61 | `frontend/src/components/claims/ClaimExport.js` | Export | ❌ No | ❌ No |

---

### **📊 REPORTS MODULE (15 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 62 | `frontend/src/services/reportService.js` | Reports API | ❌ No | ❌ No |
| 63 | `frontend/src/pages/reports/Reports.js` | Reports main | ❌ No | ❌ No |
| 64 | `frontend/src/pages/reports/StatisticsOverview.js` | Stats dashboard | ❌ No | ❌ No |
| 65 | `frontend/src/pages/reports/ProgressReport.js` | Progress report | ❌ No | ❌ No |
| 66 | `frontend/src/pages/reports/FinancialReport.js` | Financial report | ❌ No | ❌ No |
| 67 | `frontend/src/pages/reports/DiaryReport.js` | Diary report | ❌ No | ❌ No |
| 68 | `frontend/src/pages/reports/BOQReport.js` | BOQ report | ❌ No | ❌ No |
| 69 | `frontend/src/pages/reports/ClaimsReport.js` | Claims report | ❌ No | ❌ No |
| 70 | `frontend/src/components/reports/StatsWidget.js` | Widget component | ❌ No | ❌ No |
| 71 | `frontend/src/components/reports/DateRangeFilter.js` | Date filter | ❌ No | ❌ No |
| 72 | `frontend/src/components/reports/ReportChart.js` | Chart wrapper | ❌ No | ❌ No |
| 73 | `frontend/src/components/reports/ExportButtons.js` | Export buttons | ❌ No | ❌ No |
| 74 | `frontend/src/utils/pdfGenerator.js` | PDF generation | ❌ No | ❌ No |
| 75 | `frontend/src/utils/excelExport.js` | Excel export | ❌ No | ❌ No |
| 76 | `frontend/src/utils/chartConfig.js` | Chart configs | ❌ No | ❌ No |

---

### **⚙️ SETTINGS & MEMBERS (15 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 77 | `frontend/src/services/settingsService.js` | Settings API | ⚠️ User profile | ✅ CHECK |
| 78 | `frontend/src/services/memberService.js` | Members API | ⚠️ Role checks | ✅ UPDATE |
| 79 | `frontend/src/services/invitationService.js` | Invitations API | ⚠️ Creates profiles | ✅ UPDATE |
| 80 | `frontend/src/pages/Settings.js` | Settings main | ⚠️ Profile display | ✅ CHECK |
| 81 | `frontend/src/pages/contracts/ContractMembers.js` | Members page | ⚠️ Role display | ✅ CHECK |
| 82 | `frontend/src/components/settings/ProfileSettings.js` | Profile edit | ⚠️ user_role field | ✅ UPDATE |
| 83 | `frontend/src/components/settings/OrganizationSettings.js` | Org settings | ❌ No | ❌ No |
| 84 | `frontend/src/components/members/MembersList.js` | Members list | ⚠️ Role display | ✅ CHECK |
| 85 | `frontend/src/components/members/MemberCard.js` | Member card | ⚠️ Role display | ✅ CHECK |
| 86 | `frontend/src/components/members/AddMemberModal.js` | Add member | ⚠️ Role selection | ✅ UPDATE |
| 87 | `frontend/src/components/members/InviteMemberModal.js` | Invite modal | ⚠️ Role selection | ✅ UPDATE |
| 88 | `frontend/src/components/members/MemberStats.js` | Member stats | ⚠️ Role counts | ✅ CHECK |
| 89 | `frontend/src/components/members/EditMemberModal.js` | Edit member | ⚠️ Role update | ✅ UPDATE |
| 90 | `frontend/src/components/members/RemoveMemberModal.js` | Remove member | ❌ No | ❌ No |
| 91 | `frontend/src/components/members/MemberFilters.js` | Filter members | ⚠️ Role filter | ✅ CHECK |

---

### **🔧 UTILITIES & HELPERS (5 files)**

| # | File Path | Purpose | Uses user_role? | Needs Update? |
|---|-----------|---------|-----------------|---------------|
| 92 | `frontend/src/utils/formatters.js` | Format helpers | ❌ No | ❌ No |
| 93 | `frontend/src/utils/validators.js` | Validation | ❌ No | ❌ No |
| 94 | `frontend/src/utils/constants.js` | Constants | ⚠️ Role constants | ✅ UPDATE |
| 95 | `frontend/src/utils/permissions.js` | Permission helpers | ⚠️ Role checks | ✅ UPDATE |
| 96 | `frontend/src/utils/dateHelpers.js` | Date helpers | ❌ No | ❌ No |

---

## ✅ RBAC MIGRATION CHECKLIST

### **CRITICAL UPDATES (Must Update - 15 files)**

These files DIRECTLY use `user_profiles.user_role` and will BREAK if not updated:

| Priority | File | What Needs Changing | Impact if Skipped |
|----------|------|---------------------|-------------------|
| 🔴 **P0** | `Signup.js` | Remove user_role from INSERT, only insert role (company type) | **Users can't sign up** |
| 🔴 **P0** | `invitationService.js` | Remove user_role from acceptInvitation INSERT | **Invitation acceptance fails** |
| 🔴 **P0** | `memberService.js` | Update getMemberStats to use member_role only | **Member stats broken** |
| 🔴 **P0** | `ProfileSettings.js` | Remove user_role field from edit form | **Profile edit crashes** |
| 🔴 **P0** | `AddMemberModal.js` | Change role dropdown to member_role values | **Can't add members** |
| 🔴 **P0** | `InviteMemberModal.js` | Change invitation to use new member_role | **Can't invite members** |
| 🔴 **P0** | `EditMemberModal.js` | Update role editing to member_role | **Can't edit member roles** |
| 🟡 **P1** | `constants.js` | Update ROLE constants to MEMBER_ROLE constants | **Constants mismatch** |
| 🟡 **P1** | `permissions.js` | Create new permission helper using member_role | **Permission checks fail** |
| 🟡 **P1** | `AuthContext.js` | Check if user_role is fetched (remove if yes) | **Context might break** |
| 🟡 **P1** | `Layout.js` | Check if user_role is displayed (update to member_role) | **UI shows wrong data** |
| 🟡 **P1** | `settingsService.js` | Update getUserProfile to not fetch user_role | **Settings might fail** |
| 🟡 **P1** | `ContractForm.js` | Check member creation uses member_role | **New contracts fail** |
| 🟡 **P1** | `MemberFilters.js` | Update role filter to use member_role | **Filtering broken** |
| 🟡 **P1** | `MemberStats.js` | Update stats counting to use member_role | **Stats wrong** |

---

### **VERIFICATION CHECKS (Should Check - 12 files)**

These files MIGHT reference roles and need verification:

| Priority | File | What to Check | Action Needed |
|----------|------|---------------|---------------|
| 🟢 **P2** | `Dashboard.js` | Check if role is displayed anywhere | Update if found |
| 🟢 **P2** | `BOQDetail.js` | Check edit permission logic | Verify uses member_role |
| 🟢 **P2** | `DiaryService.js` | Check acknowledge permission | Verify uses company role |
| 🟢 **P2** | `DiaryDetail.js` | Check submit/acknowledge buttons | Verify role checks |
| 🟢 **P2** | `ClaimService.js` | Check approval permission | Verify role logic |
| 🟢 **P2** | `ClaimDetail.js` | Check approve button visibility | Verify permission |
| 🟢 **P2** | `ClaimApproval.js` | Check who can approve | Verify logic |
| 🟢 **P2** | `Settings.js` | Check role display in profile | Update if shown |
| 🟢 **P2** | `ContractMembers.js` | Check role column display | Update to member_role |
| 🟢 **P2** | `MembersList.js` | Check role badges/display | Update to member_role |
| 🟢 **P2** | `MemberCard.js` | Check role display in card | Update to member_role |
| 🟢 **P2** | `ContractDetail.js` | Check owner badge logic | Verify uses member_role |

---

### **NO CHANGES NEEDED (Safe - 69 files)**

These files don't use roles or use them correctly already:
- All photo management files (11 files)
- Most BOQ components (8 files)  
- All report files (15 files)
- Utilities and helpers (3 files)
- Core infrastructure (5 files)
- All contract list/card files
- All pure display components

---

## 📝 UPDATE SEQUENCE (Recommended Order)

### **Phase 1: Database Changes First**
```sql
-- Run this FIRST before any code changes
ALTER TABLE user_profiles DROP COLUMN user_role;
-- (Full SQL script to be provided)
```

### **Phase 2: Critical Service Files (30 min)**
1. ✅ `invitationService.js` - Fix acceptInvitation()
2. ✅ `memberService.js` - Fix getMemberStats()
3. ✅ `constants.js` - Update role constants
4. ✅ `permissions.js` - Create new permission helpers

### **Phase 3: Signup & Onboarding (15 min)**
5. ✅ `Signup.js` - Remove user_role from INSERT
6. ✅ `AuthContext.js` - Verify/update if needed

### **Phase 4: Member Management UI (30 min)**
7. ✅ `ProfileSettings.js` - Remove user_role field
8. ✅ `AddMemberModal.js` - Update role dropdown
9. ✅ `InviteMemberModal.js` - Update invitation
10. ✅ `EditMemberModal.js` - Update editing
11. ✅ `MemberStats.js` - Update stats
12. ✅ `MemberFilters.js` - Update filtering

### **Phase 5: Display Components (30 min)**
13. ✅ `ContractMembers.js` - Update role display
14. ✅ `MembersList.js` - Update role badges
15. ✅ `MemberCard.js` - Update role display
16. ✅ `Layout.js` - Verify/update if needed
17. ✅ `Settings.js` - Verify/update if needed

### **Phase 6: Permission Checks (30 min)**
18. ✅ `BOQDetail.js` - Verify edit permissions
19. ✅ `DiaryDetail.js` - Verify submit/acknowledge
20. ✅ `ClaimDetail.js` - Verify approval
21. ✅ `ClaimApproval.js` - Verify approver check

### **Phase 7: Testing (30 min)**
22. ✅ Test signup flow
23. ✅ Test invitation acceptance
24. ✅ Test member management
25. ✅ Test permissions across modules
26. ✅ Verify all role displays
27. ✅ Check stats and filters

**Total Estimated Time:** 3-4 hours

---

## 🎯 SUCCESS CRITERIA

After all updates complete, verify:
- [ ] Users can sign up (role saved correctly)
- [ ] Invitations work (profile created with member_role)
- [ ] Member stats display correctly
- [ ] Can add/edit/remove members
- [ ] Role filters work
- [ ] Permission checks work (BOQ edit, Diary acknowledge, Claim approve)
- [ ] No console errors referencing user_role
- [ ] All role displays show member_role
- [ ] Database queries don't select user_role column

---

## 📊 FILE BREAKDOWN SUMMARY

**Total Files:** 96 files

**By Update Priority:**
- 🔴 **P0 Critical:** 9 files (MUST update or breaks)
- 🟡 **P1 Important:** 6 files (Should update for consistency)
- 🟢 **P2 Verify:** 12 files (Check and update if needed)
- ⚪ **No Change:** 69 files (Safe, no changes needed)

**By Category:**
- Authentication: 11 files (3 need updates)
- Contracts: 5 files (1 needs check)
- BOQ: 12 files (1 needs check)
- Diary: 10 files (2 need checks)
- Photos: 11 files (0 need updates)
- Claims: 12 files (3 need checks)
- Reports: 15 files (0 need updates)
- Settings/Members: 15 files (10 need updates) ⚠️ **Most affected**
- Utils: 5 files (2 need updates)

---

## ⚠️ CRITICAL REMINDERS

1. **BACKUP FIRST:** Git commit before starting
2. **DATABASE FIRST:** Run SQL migration before code changes
3. **TEST FREQUENTLY:** Test after each phase
4. **CHECK CONSOLE:** Watch for user_role errors
5. **VERIFY QUERIES:** Ensure no SELECT user_role statements
6. **UPDATE RLS:** Some RLS policies might reference user_role
7. **CHECK IMPORTS:** Ensure constants.js is imported correctly
8. **PERMISSION LOGIC:** Double-check all permission helper functions

---

**Document Status:** ✅ Complete and Ready for Session 13  
**Next Step:** Review this checklist, then proceed with SQL migration  
**Estimated Session Time:** 3-4 hours for complete migration
