# MASTERPLAN DATABASE SCHEMA - DEPLOYMENT GUIDE
## Session 14: Complete Schema Implementation

**Date:** 11 January 2026  
**Session:** 14  
**Purpose:** Deploy complete Masterplan-aligned database schema  
**Total New Tables:** 26 tables (40 tables total with existing)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before running the schema, ensure:

- [x] GitHub backup branch created: `backup-session-13-before-masterplan`
- [x] Git tag created: `v0.1-mvp-session-13`
- [ ] New Supabase project created: `contract-diary-prod-v1`
- [ ] `.env` file updated with new Supabase credentials
- [ ] Supabase SQL Editor open and ready

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Open Supabase SQL Editor**

1. Go to https://supabase.com/dashboard
2. Select project: `contract-diary-prod-v1`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**

---

### **Step 2: Copy Complete Schema**

1. Open file: `MASTERPLAN_DATABASE_SCHEMA_COMPLETE.sql`
2. **Copy ALL** content (Ctrl+A, Ctrl+C)
3. **Paste** into Supabase SQL Editor

---

### **Step 3: Execute Schema**

1. Click **Run** button (or press F5)
2. Wait for execution (should take 10-30 seconds)
3. Check for success message

**Expected Result:**
```
Success. No rows returned
```

---

### **Step 4: Verify Tables Created**

Run this query to see all new tables:

```sql
SELECT 
  table_schema,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name 
   AND table_schema = t.table_schema) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected Output:** Should show ~40 tables total

---

### **Step 5: Verify RLS Policies**

Run this query to see all RLS policies:

```sql
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

### **Step 6: Test Table Access**

Run a simple SELECT to verify permissions:

```sql
-- Should work (you're authenticated)
SELECT * FROM programme_items LIMIT 1;
SELECT * FROM inspections LIMIT 1;
SELECT * FROM delay_events LIMIT 1;
```

**Expected:** Empty result set (no data yet, but no errors)

---

## 📊 NEW TABLES SUMMARY

### **Programme Module (4 tables)**
- ✅ `programme_items` - Activities with WBS structure
- ✅ `programme_links` - Predecessor/successor relationships
- ✅ `programme_versions` - Baseline management
- ✅ `programme_calendars` - Working days definition

### **Quality Module (4 tables)**
- ✅ `inspections` - RFI workflow & approvals
- ✅ `test_records` - Cube, soil, rebar tests
- ✅ `ncr` - Non-Conformance Reports
- ✅ `car` - Corrective Action Requests

### **Delay & Claims Module (4 tables)**
- ✅ `delay_events` - Delay recording for EOT
- ✅ `eot_claims` - Extension of Time claims
- ✅ `variation_orders` - VO tracking
- ✅ `site_instructions` - SI/AI tracking

### **Contract Administration (3 tables)**
- ✅ `performance_bonds` - Bond tracking
- ✅ `insurance_policies` - Policy tracking
- ✅ `contract_milestones` - CPC, WC, DLP

### **Audit & Events (3 tables)**
- ✅ `event_log` - System events
- ✅ `audit_log` - Accountability trail
- ✅ `ai_outputs` - AI-generated content

### **Alerts & Notifications (3 tables)**
- ✅ `alert_definitions` - Alert rules
- ✅ `alert_instances` - Active alerts
- ✅ `alert_history` - Alert actions

### **Reporting (2 tables)**
- ✅ `report_snapshots` - Immutable reports
- ✅ `report_versions` - Report versioning

### **Safety (3 tables)**
- ✅ `safety_observations` - Hazards & observations
- ✅ `incidents` - Accidents & injuries
- ✅ `toolbox_meetings` - Safety meetings

**TOTAL:** 26 new tables + 14 existing tables = **40 tables**

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

- [ ] All 40 tables exist in `public` schema
- [ ] RLS policies created (check `pg_policies`)
- [ ] No SQL errors in execution
- [ ] Can query tables without errors
- [ ] Triggers created for `updated_at` columns
- [ ] Foreign key relationships intact

---

## 🔍 TROUBLESHOOTING

### **Error: "relation already exists"**

**Cause:** Table already created in previous run  
**Solution:** This is safe to ignore. The `CREATE TABLE IF NOT EXISTS` clause prevents duplicates.

---

### **Error: "permission denied"**

**Cause:** RLS policy blocking access  
**Solution:** Ensure you're logged in as authenticated user. Check RLS policies are permissive.

---

### **Error: "foreign key constraint violation"**

**Cause:** Referenced table doesn't exist  
**Solution:** Ensure you ran the COMPLETE schema, not partial. Existing tables from Sessions 1-13 must be present.

---

### **Error: "function does not exist"**

**Cause:** Missing extension or function  
**Solution:** Ensure `uuid-ossp` extension is enabled (script does this automatically).

---

## 📋 POST-DEPLOYMENT TASKS

### **Immediate (Today):**
1. ✅ Schema deployed successfully
2. ✅ Verify all tables exist
3. ✅ Commit schema file to GitHub
4. ✅ Update `DATABASE_SCHEMA.md` documentation

### **Next Session (15):**
1. Generate mock data for testing
2. Test database relationships
3. Verify foreign keys work correctly

### **Future Sessions:**
1. Enable GUI navigation for new modules
2. Add "Coming Soon" notifications
3. Progressive feature enablement

---

## 📝 MAINTENANCE NOTES

### **Adding New Columns:**

If you need to add columns to existing tables later:

```sql
-- Example: Add new column to inspections
ALTER TABLE inspections 
ADD COLUMN new_field TEXT;

-- Don't forget to update documentation!
```

### **Modifying RLS Policies:**

If you need to update RLS policies:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- Create new policy
CREATE POLICY "new_policy_name" ON table_name
FOR SELECT TO authenticated
USING (your_new_condition);
```

### **Adding Indexes:**

If queries become slow, add indexes:

```sql
-- Example: Add index for faster queries
CREATE INDEX idx_table_column ON table_name(column_name);
```

---

## 🎯 SUCCESS CRITERIA

**Schema deployment is successful if:**

✅ SQL script executes without errors  
✅ All 40 tables visible in Supabase dashboard  
✅ RLS policies enabled on all new tables  
✅ Can query tables without permission errors  
✅ Foreign key relationships work correctly  
✅ Triggers fire on UPDATE operations  

---

## 📊 SCHEMA STATISTICS

**Database Size:** ~250 KB (empty tables + indexes)  
**Estimated Size with Mock Data:** ~10 MB  
**Estimated Size with Production Data (50 contracts):** ~500 MB  

**Still within FREE TIER!** ✅

---

## 🚀 NEXT STEPS

### **Immediate:**
1. Run this schema in Supabase SQL Editor
2. Verify deployment successful
3. Take screenshot of successful execution
4. Commit to GitHub

### **Session 15:**
1. Generate comprehensive mock data
2. Test all table relationships
3. Populate with realistic test data

### **Session 16:**
1. Build complete GUI navigation
2. Implement feature flags
3. Add "Coming Soon" system

---

## 💡 IMPORTANT REMINDERS

### **Data Preservation:**
- This schema is ADDITIVE - existing data is safe
- All existing tables from Sessions 1-13 remain unchanged
- New tables are empty and ready for mock data

### **RLS Policies:**
- Policies are intentionally PERMISSIVE initially
- Will be tightened as modules are enabled
- All contract members can access their contract data

### **Versioning:**
- Schema version: 1.0 (Masterplan Complete)
- Previous version: 0.1 (MVP Sessions 1-13)
- Next version: 1.1 (Mock Data + GUI)

---

## 📞 SUPPORT

**If you encounter issues:**

1. Check this troubleshooting guide first
2. Review Supabase SQL Editor error messages
3. Verify you're running the COMPLETE schema file
4. Check that existing tables are present
5. Contact: (Reference Session 14 documents)

---

## 🎊 CONGRATULATIONS!

If you've successfully deployed this schema, you now have:

✅ **Complete Masterplan-aligned database**  
✅ **40 tables covering full contract lifecycle**  
✅ **Enterprise-grade security with RLS**  
✅ **Audit trail for CIPAA compliance**  
✅ **Foundation for all future features**  

**This is a MAJOR milestone!** 🚀

---

**Prepared by:** Claude (AI Assistant)  
**For:** Brother Eff (Contract Diary Platform)  
**Date:** 11 January 2026  
**Session:** 14  
**Status:** Ready for Deployment  

**Bismillah - May this database serve the Malaysian construction industry with integrity and excellence! 🤲**
