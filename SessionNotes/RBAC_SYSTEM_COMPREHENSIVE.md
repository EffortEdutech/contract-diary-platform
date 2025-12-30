# 🔐 ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM

**Phase 3A Enhancement: Proper User Roles & Permissions**

**Malaysian Construction Context: Main Contractor (MC) vs Subcontractor (SC)**

---

## 📊 PERMISSION MATRIX

### **Main Contractor (MC) - Full Control**
- ✅ Creates and owns contracts/projects
- ✅ Creates and manages BOQ
- ✅ Invites Subcontractors to projects
- ✅ Views all diaries from all parties
- ✅ **Acknowledges** SC diaries (CIPAA requirement)
- ✅ Approves progress claims
- ✅ Submits consolidated claims to client
- ✅ Locks periods for finalization

### **Subcontractor (SC) - Limited Control**
- ✅ Creates own daily diaries
- ✅ Views own diaries only
- ✅ Submits diaries for MC acknowledgment
- ✅ Views BOQ (read-only)
- ✅ Submits progress claims
- ✅ Views own claims only
- ❌ Cannot acknowledge diaries (MC only)
- ❌ Cannot edit/delete after submission
- ❌ Cannot access other SC's data

---

## 🗄️ DATABASE SCHEMA

### **1. User Profiles Table**

```sql
-- ============================================
-- USER PROFILES TABLE
-- ============================================
-- Extends auth.users with role and organization info

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role information
  role TEXT NOT NULL CHECK (role IN ('main_contractor', 'subcontractor', 'consultant', 'supplier')),
  
  -- Organization info
  organization_id UUID REFERENCES organizations(id),
  organization_name TEXT,
  
  -- Contact details
  phone TEXT,
  position TEXT, -- e.g., "Site Manager", "Quantity Surveyor"
  
  -- Malaysian-specific
  cidb_registration TEXT, -- CIDB registration number
  ssm_registration TEXT,  -- SSM company registration
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure role exists
  CONSTRAINT valid_role CHECK (role IN ('main_contractor', 'subcontractor', 'consultant', 'supplier'))
);

-- Index for fast role lookups
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_org ON user_profiles(organization_id);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles (for collaboration)
CREATE POLICY "Users can view all profiles"
ON user_profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (id = auth.uid());
```

---

### **2. Organizations Table**

```sql
-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
-- Companies: MC companies, SC companies

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Company details
  name TEXT NOT NULL,
  registration_number TEXT, -- SSM registration
  cidb_registration TEXT,
  cidb_grade TEXT CHECK (cidb_grade IN ('G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7')),
  
  -- Type
  organization_type TEXT NOT NULL CHECK (organization_type IN ('main_contractor', 'subcontractor', 'consultant', 'supplier')),
  
  -- Contact
  address TEXT,
  phone TEXT,
  email TEXT,
  
  -- Admin
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_organizations_type ON organizations(organization_type);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Anyone can view organizations (for invites)
CREATE POLICY "Users can view organizations"
ON organizations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can create organizations
CREATE POLICY "Users can create organizations"
ON organizations FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Users can update own organization
CREATE POLICY "Users can update own organization"
ON organizations FOR UPDATE
USING (created_by = auth.uid());
```

---

### **3. Contract Members Table**

```sql
-- ============================================
-- CONTRACT MEMBERS TABLE
-- ============================================
-- Who is invited to which contract (MC invites SC)

CREATE TABLE IF NOT EXISTS contract_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  
  -- Role on this contract
  member_role TEXT NOT NULL CHECK (member_role IN ('owner', 'member', 'viewer')),
  
  -- Invitation details
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invitation_status TEXT DEFAULT 'active' CHECK (invitation_status IN ('pending', 'active', 'removed')),
  
  -- Trade/scope for SC
  trade_scope TEXT, -- e.g., "Piling Works", "M&E Works"
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(contract_id, user_id)
);

-- Indexes
CREATE INDEX idx_contract_members_contract ON contract_members(contract_id);
CREATE INDEX idx_contract_members_user ON contract_members(user_id);
CREATE INDEX idx_contract_members_role ON contract_members(member_role);

-- RLS
ALTER TABLE contract_members ENABLE ROW LEVEL SECURITY;

-- Users can view memberships for contracts they're part of
CREATE POLICY "Users can view contract memberships"
ON contract_members FOR SELECT
USING (
  user_id = auth.uid()
  OR contract_id IN (
    SELECT contract_id FROM contract_members WHERE user_id = auth.uid()
  )
);

-- Contract owners (MC) can invite members
CREATE POLICY "Contract owners can invite members"
ON contract_members FOR INSERT
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM contract_members
    WHERE contract_id = contract_members.contract_id
    AND user_id = auth.uid()
    AND member_role = 'owner'
  )
);

-- Contract owners can update memberships
CREATE POLICY "Contract owners can update memberships"
ON contract_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contract_members cm
    WHERE cm.contract_id = contract_members.contract_id
    AND cm.user_id = auth.uid()
    AND cm.member_role = 'owner'
  )
);

-- Contract owners can remove members
CREATE POLICY "Contract owners can remove members"
ON contract_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM contract_members cm
    WHERE cm.contract_id = contract_members.contract_id
    AND cm.user_id = auth.uid()
    AND cm.member_role = 'owner'
  )
);
```

---

## 🔒 UPDATED RLS POLICIES

### **1. Contracts Table**

```sql
-- ============================================
-- CONTRACTS TABLE - UPDATED RLS
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view all contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON contracts;

-- New role-based policies

-- 1. Users can view contracts they're members of
CREATE POLICY "Users can view member contracts"
ON contracts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contract_members
    WHERE contract_members.contract_id = contracts.id
    AND contract_members.user_id = auth.uid()
    AND contract_members.invitation_status = 'active'
  )
);

-- 2. Only MC can create contracts
CREATE POLICY "Main Contractors can create contracts"
ON contracts FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'main_contractor'
  )
);

-- 3. Only contract owners can update
CREATE POLICY "Contract owners can update"
ON contracts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contract_members
    WHERE contract_members.contract_id = contracts.id
    AND contract_members.user_id = auth.uid()
    AND contract_members.member_role = 'owner'
  )
);

-- 4. Only contract owners can delete
CREATE POLICY "Contract owners can delete"
ON contracts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM contract_members
    WHERE contract_members.contract_id = contracts.id
    AND contract_members.user_id = auth.uid()
    AND contract_members.member_role = 'owner'
  )
);
```

---

### **2. Work Diaries Table**

```sql
-- ============================================
-- WORK DIARIES TABLE - UPDATED RLS
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view all diaries" ON work_diaries;
DROP POLICY IF EXISTS "Users can update own draft diaries" ON work_diaries;
DROP POLICY IF EXISTS "Acknowledge submitted diaries" ON work_diaries;

-- New role-based policies

-- 1. MC can view all diaries, SC can view own diaries only
CREATE POLICY "View diaries based on role"
ON work_diaries FOR SELECT
USING (
  -- Main Contractor sees all diaries for their contracts
  EXISTS (
    SELECT 1 FROM contract_members cm
    JOIN user_profiles up ON up.id = cm.user_id
    WHERE cm.contract_id = work_diaries.contract_id
    AND cm.user_id = auth.uid()
    AND up.role = 'main_contractor'
    AND cm.member_role = 'owner'
  )
  OR
  -- Subcontractor sees only own diaries
  (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'subcontractor'
    )
  )
  OR
  -- Creator always sees own diary
  created_by = auth.uid()
);

-- 2. Both MC and SC can create diaries (for their contracts)
CREATE POLICY "Members can create diaries"
ON work_diaries FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM contract_members
    WHERE contract_members.contract_id = work_diaries.contract_id
    AND contract_members.user_id = auth.uid()
    AND contract_members.invitation_status = 'active'
  )
);

-- 3. Users can update own draft diaries only
CREATE POLICY "Users can update own draft diaries"
ON work_diaries FOR UPDATE
USING (
  created_by = auth.uid()
  AND status = 'draft'
);

-- 4. Only MC can acknowledge submitted diaries
CREATE POLICY "Main Contractors can acknowledge diaries"
ON work_diaries FOR UPDATE
USING (
  status = 'submitted'
  AND EXISTS (
    SELECT 1 FROM contract_members cm
    JOIN user_profiles up ON up.id = cm.user_id
    WHERE cm.contract_id = work_diaries.contract_id
    AND cm.user_id = auth.uid()
    AND up.role = 'main_contractor'
    AND cm.member_role = 'owner'
  )
);

-- 5. Users can delete own draft diaries
CREATE POLICY "Users can delete own draft diaries"
ON work_diaries FOR DELETE
USING (
  created_by = auth.uid()
  AND status = 'draft'
);
```

---

### **3. BOQ Tables**

```sql
-- ============================================
-- BOQ TABLES - UPDATED RLS
-- ============================================

-- BOQ Table
DROP POLICY IF EXISTS "Users can view BOQs" ON boq;
DROP POLICY IF EXISTS "Users can create BOQs" ON boq;
DROP POLICY IF EXISTS "Users can update own BOQs" ON boq;

-- 1. Contract members can view BOQs
CREATE POLICY "Contract members can view BOQs"
ON boq FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contract_members
    WHERE contract_members.contract_id = boq.contract_id
    AND contract_members.user_id = auth.uid()
    AND contract_members.invitation_status = 'active'
  )
);

-- 2. Only MC can create BOQs
CREATE POLICY "Main Contractors can create BOQs"
ON boq FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM contract_members cm
    JOIN user_profiles up ON up.id = cm.user_id
    WHERE cm.contract_id = boq.contract_id
    AND cm.user_id = auth.uid()
    AND up.role = 'main_contractor'
    AND cm.member_role = 'owner'
  )
);

-- 3. Only MC can update BOQs
CREATE POLICY "Main Contractors can update BOQs"
ON boq FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM contract_members cm
    JOIN user_profiles up ON up.id = cm.user_id
    WHERE cm.contract_id = boq.contract_id
    AND cm.user_id = auth.uid()
    AND up.role = 'main_contractor'
    AND cm.member_role = 'owner'
  )
);
```

---

## 🔄 MIGRATION STEPS

### **Step 1: Create New Tables**

Run SQL for:
1. user_profiles
2. organizations  
3. contract_members

### **Step 2: Migrate Existing Data**

```sql
-- Migrate existing users to user_profiles
INSERT INTO user_profiles (id, role, organization_name, created_at)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'role', 'main_contractor') as role,
  COALESCE(raw_user_meta_data->>'company', 'Unknown') as organization_name,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create contract owners (existing contract creators)
INSERT INTO contract_members (contract_id, user_id, member_role, invited_by, invitation_status)
SELECT 
  id as contract_id,
  created_by as user_id,
  'owner' as member_role,
  created_by as invited_by,
  'active' as invitation_status
FROM contracts
ON CONFLICT (contract_id, user_id) DO NOTHING;
```

### **Step 3: Update RLS Policies**

Run the updated RLS policies for:
1. contracts
2. work_diaries
3. boq, boq_sections, boq_items

### **Step 4: Test Permissions**

Test each role:
- MC can create contracts ✓
- MC can acknowledge diaries ✓
- SC can only view own diaries ✓
- SC cannot acknowledge ✓

---

## 📝 HELPER FUNCTIONS

### **Check User Role**

```sql
-- Function to check if user is MC
CREATE OR REPLACE FUNCTION is_main_contractor(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_uuid
    AND role = 'main_contractor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is contract owner
CREATE OR REPLACE FUNCTION is_contract_owner(user_uuid UUID, contract_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contract_members
    WHERE user_id = user_uuid
    AND contract_id = contract_uuid
    AND member_role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎯 PERMISSION SUMMARY

| Entity | MC Owner | MC Member | SC Member |
|--------|----------|-----------|-----------|
| **Contracts** |
| View | ✅ | ✅ | ✅ (invited) |
| Create | ✅ | ❌ | ❌ |
| Edit | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Invite | ✅ | ❌ | ❌ |
| **BOQ** |
| View | ✅ | ✅ | ✅ (read-only) |
| Create | ✅ | ❌ | ❌ |
| Edit | ✅ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ |
| **Diaries** |
| View All | ✅ | ✅ | ❌ |
| View Own | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ |
| Edit Draft | ✅ (own) | ✅ (own) | ✅ (own) |
| Submit | ✅ | ✅ | ✅ |
| **Acknowledge** | ✅ | ❌ | ❌ |
| Delete Draft | ✅ (own) | ✅ (own) | ✅ (own) |

---

## 📊 BENEFITS

✅ **CIPAA Compliant** - Clear roles and permissions  
✅ **Secure** - Database-level enforcement  
✅ **Scalable** - Add more roles easily  
✅ **Audit Trail** - Know who did what  
✅ **Multi-tenant** - Multiple projects, multiple parties  
✅ **Invitation System** - MC invites SC properly  

---

## 🚀 NEXT STEPS

1. **Create tables** - Run SQL for user_profiles, organizations, contract_members
2. **Migrate data** - Move existing users to new structure
3. **Update RLS** - Apply new role-based policies
4. **Test thoroughly** - Verify MC/SC permissions
5. **Update UI** - Show/hide features based on role
6. **Add invite feature** - MC can invite SC to contracts

---

**This establishes proper enterprise-grade RBAC!** 🔐
