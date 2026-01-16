-- ============================================
-- MASTERPLAN 10 JAN 2026 - COMPLETE DATABASE SCHEMA
-- Contract Diary Platform - Production V1
-- ============================================
-- 
-- Purpose: Complete database schema for full contract lifecycle management
-- Aligned with: Masterplan Appendices A, B, C
-- Date: 11 January 2026
-- Session: 14
-- 
-- IMPORTANT: This script is ADDITIVE - it only creates NEW tables
-- Existing tables from Sessions 1-13 are NOT modified
-- 
-- Total Tables: ~40 tables
-- Modules: Programme, Quality, Delay/EOT, Contract Admin, Audit, Alerts, Reports
-- 
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EXISTING TABLES (Session 1-13) - DO NOT MODIFY
-- ============================================
-- ✅ user_profiles
-- ✅ organizations
-- ✅ contracts
-- ✅ contract_members
-- ✅ invitations
-- ✅ member_activity_log
-- ✅ boq
-- ✅ boq_sections
-- ✅ boq_items
-- ✅ boq_item_breakdown
-- ✅ work_diaries
-- ✅ diary_photos
-- ✅ progress_claims
-- ✅ claim_items

-- ============================================
-- MODULE 1: PROGRAMME MANAGEMENT (Masterplan A5)
-- ============================================
-- Purpose: Schedule management, planned vs actual tracking, delay analysis
-- Phase: 2 (30-50%)

-- 1.1 Programme Items (Activities)
CREATE TABLE IF NOT EXISTS programme_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- WBS Structure
  wbs_code TEXT NOT NULL, -- e.g., "1.2.3"
  description TEXT NOT NULL,
  activity_type TEXT DEFAULT 'Task' CHECK (activity_type IN ('Task', 'Milestone', 'Summary')),
  
  -- Time Planning
  planned_start DATE NOT NULL,
  planned_finish DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  
  -- Actual Progress
  actual_start DATE,
  actual_finish DATE,
  actual_duration_days INTEGER,
  percent_complete NUMERIC(5,2) DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  
  -- Hierarchy
  parent_id UUID REFERENCES programme_items(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  sort_order INTEGER DEFAULT 0,
  
  -- Calendar & Resources
  calendar_id UUID, -- References programme_calendars
  resource_name TEXT,
  
  -- Linkage to BOQ
  linked_boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  
  -- Versioning
  programme_version INTEGER NOT NULL DEFAULT 1,
  is_baseline BOOLEAN DEFAULT FALSE,
  is_current BOOLEAN DEFAULT TRUE,
  
  -- Status
  status TEXT DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold')),
  
  -- Critical Path
  is_critical BOOLEAN DEFAULT FALSE,
  total_float_days INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(contract_id, wbs_code, programme_version)
);

-- 1.2 Programme Links (Predecessors/Successors)
CREATE TABLE IF NOT EXISTS programme_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link Relationship
  predecessor_id UUID NOT NULL REFERENCES programme_items(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES programme_items(id) ON DELETE CASCADE,
  
  -- Link Type
  link_type TEXT NOT NULL DEFAULT 'FS' CHECK (link_type IN ('FS', 'SS', 'FF', 'SF')),
  -- FS = Finish-to-Start, SS = Start-to-Start, FF = Finish-to-Finish, SF = Start-to-Finish
  
  -- Lag/Lead
  lag_days INTEGER DEFAULT 0, -- Positive = lag, Negative = lead
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent self-linking
  CHECK (predecessor_id != successor_id),
  
  -- Unique constraint
  UNIQUE(predecessor_id, successor_id, link_type)
);

-- 1.3 Programme Versions (Baseline Management)
CREATE TABLE IF NOT EXISTS programme_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  version_number INTEGER NOT NULL,
  version_name TEXT NOT NULL, -- e.g., "Baseline", "Rev 1", "As-Built"
  version_type TEXT NOT NULL CHECK (version_type IN ('Baseline', 'Revision', 'As-Built', 'Claim Support')),
  
  -- Status
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Import Details
  imported_from TEXT, -- e.g., "MS Project", "Primavera", "Manual Entry"
  import_file_name TEXT,
  
  -- Metadata
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, version_number)
);

-- 1.4 Programme Calendars (Working Days Definition)
CREATE TABLE IF NOT EXISTS programme_calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  calendar_name TEXT NOT NULL,
  
  -- Working Days (JSON)
  working_days JSONB DEFAULT '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}'::jsonb,
  
  -- Working Hours
  work_hours_per_day NUMERIC(4,2) DEFAULT 8.00,
  
  -- Holidays (JSON Array of dates)
  holidays JSONB DEFAULT '[]'::jsonb, -- e.g., ["2026-05-01", "2026-08-31"]
  
  -- Metadata
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, calendar_name)
);

-- Indexes for Programme Module
CREATE INDEX idx_programme_items_contract ON programme_items(contract_id);
CREATE INDEX idx_programme_items_parent ON programme_items(parent_id);
CREATE INDEX idx_programme_items_version ON programme_items(programme_version);
CREATE INDEX idx_programme_items_boq_link ON programme_items(linked_boq_item_id);
CREATE INDEX idx_programme_links_predecessor ON programme_links(predecessor_id);
CREATE INDEX idx_programme_links_successor ON programme_links(successor_id);

-- ============================================
-- MODULE 2: QUALITY MANAGEMENT (QA/QC) (Masterplan A8)
-- ============================================
-- Purpose: Inspections, tests, NCR/CAR lifecycle, compliance tracking
-- Phase: 4 (70-90%)

-- 2.1 Inspections & RFI
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Inspection Details
  inspection_number TEXT NOT NULL, -- Auto-generated: "INS-001"
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('RFI', 'Hold Point', 'Witness Point', 'Routine', 'Final')),
  inspection_category TEXT, -- e.g., "Concrete", "Rebar", "Formwork", "MEP"
  
  -- Location & Description
  location TEXT NOT NULL,
  work_description TEXT NOT NULL,
  specifications_reference TEXT, -- e.g., "BS EN 12390-3"
  
  -- Linkages
  linked_diary_id UUID REFERENCES work_diaries(id) ON DELETE SET NULL,
  linked_programme_item_id UUID REFERENCES programme_items(id) ON DELETE SET NULL,
  linked_boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  
  -- Request
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  requested_inspection_date DATE,
  
  -- Inspection Conducted
  inspected_by TEXT, -- Inspector name (can be external)
  inspected_by_user_id UUID REFERENCES auth.users(id),
  inspection_date TIMESTAMP WITH TIME ZONE,
  
  -- Result
  status TEXT DEFAULT 'Requested' CHECK (status IN ('Requested', 'Scheduled', 'Conducted', 'Approved', 'Rejected', 'Conditional Approval', 'Cancelled')),
  result TEXT CHECK (result IN ('Pass', 'Fail', 'Conditional', 'N/A')),
  comments TEXT,
  defects_noted TEXT,
  
  -- Approval
  approved_by TEXT, -- Approver name (e.g., Engineer, SO)
  approved_by_user_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Attachments
  photos_count INTEGER DEFAULT 0,
  documents_attached JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, inspection_number)
);

-- 2.2 Test Records (Cube, Soil, Rebar, etc.)
CREATE TABLE IF NOT EXISTS test_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Test Details
  test_number TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('Concrete Cube', 'Soil Compaction', 'Rebar', 'Concrete Slump', 'Steel', 'Other')),
  test_standard TEXT, -- e.g., "BS EN 12390-3", "MS 30"
  
  -- Sample Details
  sample_location TEXT NOT NULL,
  sample_date DATE NOT NULL,
  sample_id TEXT,
  
  -- Test Execution
  tested_by TEXT, -- Lab name or tester name
  test_date DATE,
  
  -- Results
  test_result TEXT,
  result_value NUMERIC(10,2), -- e.g., 35.5 N/mm² for cube strength
  result_unit TEXT, -- e.g., "N/mm²", "%", "kN"
  
  pass_fail TEXT CHECK (pass_fail IN ('Pass', 'Fail', 'Pending', 'N/A')),
  required_value NUMERIC(10,2), -- e.g., 30 N/mm² for C30 concrete
  
  -- Linkages
  linked_diary_id UUID REFERENCES work_diaries(id) ON DELETE SET NULL,
  linked_inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  linked_programme_item_id UUID REFERENCES programme_items(id) ON DELETE SET NULL,
  
  -- Certificate
  certificate_number TEXT,
  certificate_file_url TEXT,
  
  -- Metadata
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, test_number)
);

-- 2.3 NCR (Non-Conformance Reports)
CREATE TABLE IF NOT EXISTS ncr (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- NCR Details
  ncr_number TEXT NOT NULL, -- Auto-generated: "NCR-001"
  ncr_title TEXT NOT NULL,
  
  -- Issue Description
  non_conformance_description TEXT NOT NULL,
  location TEXT NOT NULL,
  discovered_date DATE NOT NULL,
  
  -- Severity
  severity TEXT NOT NULL DEFAULT 'Minor' CHECK (severity IN ('Critical', 'Major', 'Minor')),
  
  -- Linkages
  linked_diary_id UUID REFERENCES work_diaries(id) ON DELETE SET NULL,
  linked_inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  linked_programme_item_id UUID REFERENCES programme_items(id) ON DELETE SET NULL,
  
  -- Responsible Party
  raised_by UUID NOT NULL REFERENCES auth.users(id),
  raised_against TEXT, -- e.g., "Subcontractor A", "Main Contractor"
  responsible_party UUID REFERENCES contract_members(id),
  
  -- Status Workflow: Issued → CAR Assigned → Under Rectification → Verified → Closed
  status TEXT DEFAULT 'Issued' CHECK (status IN ('Issued', 'CAR Assigned', 'Under Rectification', 'Pending Verification', 'Verified', 'Closed', 'Rejected')),
  
  -- Closure
  rectification_deadline DATE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMP WITH TIME ZONE,
  closure_remarks TEXT,
  
  -- Photos
  photos_count INTEGER DEFAULT 0,
  before_photos JSONB DEFAULT '[]'::jsonb,
  after_photos JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, ncr_number)
);

-- 2.4 CAR (Corrective Action Requests)
CREATE TABLE IF NOT EXISTS car (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ncr_id UUID NOT NULL REFERENCES ncr(id) ON DELETE CASCADE,
  
  -- CAR Details
  car_number TEXT NOT NULL,
  corrective_action_required TEXT NOT NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES contract_members(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Target Completion
  target_completion_date DATE NOT NULL,
  actual_completion_date DATE,
  
  -- Implementation
  implementation_description TEXT,
  implementation_status TEXT DEFAULT 'Pending' CHECK (implementation_status IN ('Pending', 'In Progress', 'Completed', 'Overdue')),
  
  -- Verification
  verification_required BOOLEAN DEFAULT TRUE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_remarks TEXT,
  
  -- Photos
  implementation_photos JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(ncr_id, car_number)
);

-- Indexes for Quality Module
CREATE INDEX idx_inspections_contract ON inspections(contract_id);
CREATE INDEX idx_inspections_diary ON inspections(linked_diary_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_test_records_contract ON test_records(contract_id);
CREATE INDEX idx_ncr_contract ON ncr(contract_id);
CREATE INDEX idx_ncr_status ON ncr(status);
CREATE INDEX idx_car_ncr ON car(ncr_id);

-- ============================================
-- MODULE 3: DELAY EVENTS & CLAIMS (Masterplan A9)
-- ============================================
-- Purpose: Delay tracking, EOT claims, evidence bundling
-- Phase: 4 (70-90%)

-- 3.1 Delay Events
CREATE TABLE IF NOT EXISTS delay_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Event Details
  event_number TEXT NOT NULL, -- Auto-generated: "DE-001"
  event_title TEXT NOT NULL,
  event_description TEXT NOT NULL,
  
  -- Cause Classification
  cause_category TEXT NOT NULL CHECK (cause_category IN ('Weather', 'Variation Order', 'Late Instruction', 'Material Delay', 'Labour Issue', 'Access Issue', 'Design Issue', 'Client Delay', 'Force Majeure', 'Other')),
  cause_detail TEXT,
  
  -- Time Impact
  event_start_date DATE NOT NULL,
  event_end_date DATE,
  total_days_affected INTEGER,
  
  -- Programme Impact
  linked_programme_items JSONB DEFAULT '[]'::jsonb, -- Array of programme_item IDs
  critical_path_impact BOOLEAN DEFAULT FALSE,
  estimated_delay_days INTEGER,
  
  -- Evidence Linkage
  linked_diary_ids JSONB DEFAULT '[]'::jsonb, -- Array of work_diary IDs
  linked_site_instruction_id UUID, -- References site_instructions
  linked_variation_order_id UUID, -- References variation_orders
  weather_evidence JSONB DEFAULT '[]'::jsonb, -- Array of dates with weather data
  
  -- Notification
  contractor_notified TEXT, -- e.g., "Verbal", "Letter", "Email"
  notification_date DATE,
  notification_reference TEXT,
  
  -- EOT Claim Status
  eot_claimed BOOLEAN DEFAULT FALSE,
  linked_eot_claim_id UUID, -- References eot_claims
  
  -- Status
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Accepted', 'Rejected', 'Closed')),
  
  -- Responsibility
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comments TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, event_number)
);

-- 3.2 EOT Claims (Extension of Time)
CREATE TABLE IF NOT EXISTS eot_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Claim Details
  eot_claim_number TEXT NOT NULL, -- e.g., "EOT-001"
  claim_title TEXT NOT NULL,
  claim_description TEXT,
  
  -- Period
  claim_period_start DATE NOT NULL,
  claim_period_end DATE NOT NULL,
  
  -- EOT Requested
  extension_days_requested INTEGER NOT NULL,
  justification TEXT NOT NULL,
  
  -- Delay Events Bundled
  linked_delay_event_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of delay_event IDs
  
  -- Programme Analysis
  programme_analysis_summary TEXT,
  critical_path_analysis TEXT,
  baseline_programme_version INTEGER,
  revised_programme_version INTEGER,
  
  -- Submission
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submission_method TEXT, -- e.g., "Email", "Letter", "Platform"
  submission_reference TEXT,
  
  -- Consultant/Engineer Review
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Under Review', 'Additional Info Required', 'Approved', 'Partially Approved', 'Rejected')),
  
  reviewed_by TEXT, -- Engineer/SO name
  reviewed_by_user_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comments TEXT,
  
  -- Approval
  extension_days_approved INTEGER,
  approval_conditions TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- New Completion Date
  original_completion_date DATE,
  revised_completion_date DATE,
  
  -- Supporting Documents
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, eot_claim_number)
);

-- 3.3 Variation Orders
CREATE TABLE IF NOT EXISTS variation_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- VO Details
  vo_number TEXT NOT NULL, -- e.g., "VO-001"
  vo_title TEXT NOT NULL,
  vo_description TEXT NOT NULL,
  
  -- Instruction
  instructed_by TEXT NOT NULL, -- e.g., "Architect", "Engineer", "Client"
  instruction_date DATE NOT NULL,
  instruction_reference TEXT, -- e.g., "AI-025"
  
  -- Scope Change
  scope_change_description TEXT NOT NULL,
  reason_for_variation TEXT,
  
  -- Programme Impact
  programme_impact TEXT CHECK (programme_impact IN ('None', 'Minor', 'Significant', 'Critical')),
  estimated_delay_days INTEGER DEFAULT 0,
  linked_programme_items JSONB DEFAULT '[]'::jsonb,
  
  -- Financial Impact
  vo_type TEXT CHECK (vo_type IN ('Addition', 'Omission', 'Substitution', 'Daywork')),
  estimated_value NUMERIC(15,2),
  currency TEXT DEFAULT 'MYR',
  
  -- BOQ Linkage
  affected_boq_items JSONB DEFAULT '[]'::jsonb, -- Array of boq_item IDs
  new_boq_items_created JSONB DEFAULT '[]'::jsonb,
  
  -- Valuation
  valuation_status TEXT DEFAULT 'Pending' CHECK (valuation_status IN ('Pending', 'Quoted', 'Under Review', 'Agreed', 'Disputed')),
  contractor_quoted_value NUMERIC(15,2),
  engineer_valued_amount NUMERIC(15,2),
  agreed_value NUMERIC(15,2),
  
  -- Approval
  status TEXT DEFAULT 'Instructed' CHECK (status IN ('Draft', 'Instructed', 'Quoted', 'Approved', 'Work In Progress', 'Completed', 'Valued', 'Certified', 'Disputed')),
  
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment
  included_in_claim_id UUID REFERENCES progress_claims(id),
  payment_status TEXT CHECK (payment_status IN ('Pending', 'Included in Claim', 'Certified', 'Paid')),
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, vo_number)
);

-- 3.4 Site Instructions
CREATE TABLE IF NOT EXISTS site_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Instruction Details
  instruction_number TEXT NOT NULL, -- e.g., "SI-001", "AI-025"
  instruction_type TEXT NOT NULL CHECK (instruction_type IN ('Site Instruction', 'Architect Instruction', 'Engineer Instruction', 'Clarification', 'Direction')),
  
  subject TEXT NOT NULL,
  instruction_detail TEXT NOT NULL,
  
  -- Issuer
  issued_by TEXT NOT NULL, -- e.g., "Architect", "Engineer", "SO"
  issued_by_user_id UUID REFERENCES auth.users(id),
  issue_date DATE NOT NULL,
  
  -- Recipient
  directed_to TEXT NOT NULL, -- e.g., "Main Contractor", "All Subcontractors"
  
  -- Programme & Cost Impact
  potential_time_impact BOOLEAN DEFAULT FALSE,
  potential_cost_impact BOOLEAN DEFAULT FALSE,
  
  -- Linkages
  linked_variation_order_id UUID REFERENCES variation_orders(id),
  linked_delay_event_id UUID REFERENCES delay_events(id),
  linked_programme_items JSONB DEFAULT '[]'::jsonb,
  
  -- Response Required
  response_required BOOLEAN DEFAULT FALSE,
  response_deadline DATE,
  contractor_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'Issued' CHECK (status IN ('Draft', 'Issued', 'Acknowledged', 'Under Action', 'Completed', 'Closed')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  -- Attachments
  attachment_urls JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, instruction_number)
);

-- Indexes for Delay & Claims Module
CREATE INDEX idx_delay_events_contract ON delay_events(contract_id);
CREATE INDEX idx_delay_events_dates ON delay_events(event_start_date, event_end_date);
CREATE INDEX idx_eot_claims_contract ON eot_claims(contract_id);
CREATE INDEX idx_eot_claims_status ON eot_claims(status);
CREATE INDEX idx_variation_orders_contract ON variation_orders(contract_id);
CREATE INDEX idx_site_instructions_contract ON site_instructions(contract_id);

-- ============================================
-- MODULE 4: CONTRACT ADMINISTRATION
-- ============================================
-- Purpose: Bonds, insurance, milestones, close-out
-- Phase: 4 (70-90%)

-- 4.1 Performance Bonds
CREATE TABLE IF NOT EXISTS performance_bonds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Bond Details
  bond_type TEXT NOT NULL CHECK (bond_type IN ('Performance Bond', 'Advance Payment Bond', 'Retention Bond', 'Maintenance Bond')),
  bond_number TEXT NOT NULL,
  bond_amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'MYR',
  
  -- Issuer
  issuer_name TEXT NOT NULL, -- Bank or insurance company
  issuer_contact TEXT,
  
  -- Validity
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Documents
  bond_document_url TEXT,
  
  -- Renewal/Release
  renewed_bond_id UUID REFERENCES performance_bonds(id),
  released_date DATE,
  release_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.2 Insurance Policies
CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Policy Details
  policy_type TEXT NOT NULL CHECK (policy_type IN ('CAR', 'EAR', 'Public Liability', 'Professional Indemnity', 'Workmen Compensation', 'Other')),
  -- CAR = Contractors All Risk, EAR = Erection All Risk
  
  policy_number TEXT NOT NULL,
  insurer_name TEXT NOT NULL,
  coverage_amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'MYR',
  
  -- Validity
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Premium
  premium_amount NUMERIC(15,2),
  
  -- Documents
  policy_document_url TEXT,
  
  -- Renewal
  renewed_policy_id UUID REFERENCES insurance_policies(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.3 Contract Milestones (CPC, WC, DLP)
CREATE TABLE IF NOT EXISTS contract_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Milestone Type
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('CPC', 'WC', 'DLP_Start', 'DLP_End', 'Final_Account', 'Custom')),
  -- CPC = Certificate of Practical Completion, WC = Works Completion, DLP = Defects Liability Period
  
  milestone_name TEXT NOT NULL,
  description TEXT,
  
  -- Dates
  planned_date DATE,
  actual_date DATE,
  certified_date DATE,
  
  -- Certification
  certificate_number TEXT,
  certified_by TEXT, -- e.g., "Architect", "SO"
  certified_by_user_id UUID REFERENCES auth.users(id),
  
  -- Status
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Submitted', 'Certified', 'Completed')),
  
  -- Documents
  certificate_url TEXT,
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Defects (for CPC/DLP)
  outstanding_defects_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Contract Administration
CREATE INDEX idx_performance_bonds_contract ON performance_bonds(contract_id);
CREATE INDEX idx_insurance_policies_contract ON insurance_policies(contract_id);
CREATE INDEX idx_contract_milestones_contract ON contract_milestones(contract_id);

-- ============================================
-- MODULE 5: AUDIT & EVENT LOGGING (Masterplan Appendix B)
-- ============================================
-- Purpose: Immutable audit trail, event tracking, compliance evidence
-- Phase: All phases (foundational)

-- 5.1 Event Log (System & Workflow Events)
CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event Classification
  event_category TEXT NOT NULL CHECK (event_category IN ('User Action', 'System Action', 'Workflow Transition', 'Integration', 'Security', 'Performance')),
  event_type TEXT NOT NULL, -- e.g., "diary_submitted", "claim_approved", "user_login"
  
  -- Entity Reference
  entity_type TEXT, -- e.g., "work_diary", "progress_claim", "contract"
  entity_id UUID,
  
  -- Actor
  actor_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  actor_role TEXT,
  
  -- Details
  event_description TEXT,
  event_data JSONB DEFAULT '{}'::jsonb, -- Flexible storage for event-specific data
  
  -- Context
  contract_id UUID REFERENCES contracts(id),
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp (immutable)
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Never update or delete - append-only
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.2 Audit Log (Accountability & Legal Trail)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What Changed
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SUBMIT', 'ACKNOWLEDGE', 'CERTIFY', 'LOCK')),
  
  -- Who Made the Change
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_by_name TEXT NOT NULL,
  performed_by_role TEXT,
  
  -- What Was the Change
  old_data JSONB, -- Previous state
  new_data JSONB, -- New state
  changed_fields TEXT[], -- Array of field names that changed
  
  -- Why (if provided)
  change_reason TEXT,
  
  -- Context
  contract_id UUID REFERENCES contracts(id),
  ip_address TEXT,
  user_agent TEXT,
  
  -- Hash for Integrity (Masterplan Section B6)
  record_hash TEXT, -- SHA-256 hash of critical fields for tamper detection
  
  -- Timestamp (immutable)
  audit_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.3 AI Outputs (Separate from Truth Tables)
CREATE TABLE IF NOT EXISTS ai_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id),
  
  -- Source Entity
  related_entity_type TEXT, -- e.g., "work_diary", "progress_claim"
  related_entity_id UUID,
  
  -- AI Output Type
  output_type TEXT NOT NULL CHECK (output_type IN ('Draft', 'Suggestion', 'Insight', 'Alert', 'Summary', 'Risk Flag')),
  output_category TEXT, -- e.g., "Report Summary", "Claim Narrative", "Delay Analysis"
  
  -- Content
  content TEXT NOT NULL,
  structured_data JSONB DEFAULT '{}'::jsonb,
  
  -- AI Model Info
  model_name TEXT,
  model_version TEXT,
  prompt_template TEXT,
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  
  -- Human Review
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Acceptance
  accepted BOOLEAN DEFAULT FALSE,
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Usage
  used_in_entity_type TEXT,
  used_in_entity_id UUID,
  
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Audit Module
CREATE INDEX idx_event_log_timestamp ON event_log(event_timestamp DESC);
CREATE INDEX idx_event_log_entity ON event_log(entity_type, entity_id);
CREATE INDEX idx_event_log_contract ON event_log(contract_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(audit_timestamp DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_performed_by ON audit_log(performed_by);
CREATE INDEX idx_ai_outputs_contract ON ai_outputs(contract_id);

-- ============================================
-- MODULE 6: ALERTS & NOTIFICATIONS (Masterplan Appendix C)
-- ============================================
-- Purpose: Proactive alerts, deadline tracking, escalation
-- Phase: 3 onwards

-- 6.1 Alert Definitions (Rule Templates)
CREATE TABLE IF NOT EXISTS alert_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Alert Configuration
  alert_name TEXT NOT NULL UNIQUE,
  alert_category TEXT NOT NULL CHECK (alert_category IN ('Deadline', 'Approval Pending', 'Quality Issue', 'Payment', 'Programme Delay', 'Contract Event', 'System')),
  
  description TEXT,
  
  -- Trigger Conditions (JSON)
  trigger_conditions JSONB NOT NULL, 
  -- Example: {"days_before_deadline": 7, "status": "pending"}
  
  -- Severity
  severity TEXT NOT NULL DEFAULT 'Low' CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Info')),
  
  -- Notification Channels
  notify_email BOOLEAN DEFAULT TRUE,
  notify_in_app BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,
  
  -- Recipients (Roles or Users)
  recipient_roles TEXT[], -- e.g., ['owner', 'admin']
  recipient_users UUID[], -- Specific user IDs
  
  -- Escalation
  escalation_enabled BOOLEAN DEFAULT FALSE,
  escalation_after_hours INTEGER, -- Escalate if not acknowledged after X hours
  escalate_to_roles TEXT[],
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6.2 Alert Instances (Active Alerts)
CREATE TABLE IF NOT EXISTS alert_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_definition_id UUID NOT NULL REFERENCES alert_definitions(id),
  
  -- Context
  contract_id UUID REFERENCES contracts(id),
  entity_type TEXT,
  entity_id UUID,
  
  -- Alert Content
  alert_title TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  severity TEXT NOT NULL,
  
  -- Recipients
  assigned_to_user_id UUID REFERENCES auth.users(id),
  assigned_to_role TEXT,
  
  -- Status
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Acknowledged', 'Resolved', 'Dismissed', 'Escalated')),
  
  -- Lifecycle
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  
  -- Escalation
  escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalated_to_user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6.3 Alert History (Archive)
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_instance_id UUID NOT NULL,
  
  -- Action
  action TEXT NOT NULL CHECK (action IN ('Created', 'Acknowledged', 'Resolved', 'Dismissed', 'Escalated', 'Reopened')),
  performed_by UUID REFERENCES auth.users(id),
  action_note TEXT,
  
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Alerts Module
CREATE INDEX idx_alert_instances_status ON alert_instances(status);
CREATE INDEX idx_alert_instances_contract ON alert_instances(contract_id);
CREATE INDEX idx_alert_instances_assigned ON alert_instances(assigned_to_user_id);
CREATE INDEX idx_alert_instances_triggered ON alert_instances(triggered_at DESC);

-- ============================================
-- MODULE 7: REPORTING & SNAPSHOTS
-- ============================================
-- Purpose: Immutable report versions, snapshot preservation
-- Phase: 3 onwards

-- 7.1 Report Snapshots
CREATE TABLE IF NOT EXISTS report_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Report Details
  report_type TEXT NOT NULL CHECK (report_type IN ('Daily', 'Weekly', 'Monthly', 'Custom', 'Claim Support', 'Close-Out')),
  report_title TEXT NOT NULL,
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label TEXT, -- e.g., "Week 48 2024", "December 2024"
  
  -- Content (Immutable)
  report_data JSONB NOT NULL, -- Complete report data snapshot
  report_summary TEXT,
  
  -- Generation
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_method TEXT, -- e.g., "Auto", "Manual", "AI-Assisted"
  
  -- Approval Workflow
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Reviewed', 'Approved', 'Issued', 'Archived')),
  
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_comments TEXT,
  
  -- Version Control
  version_number INTEGER DEFAULT 1,
  supersedes_snapshot_id UUID REFERENCES report_snapshots(id),
  
  -- Export Files
  pdf_url TEXT,
  excel_url TEXT,
  
  -- Lock Status (Immutable after issuance)
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7.2 Report Versions (Track Changes)
CREATE TABLE IF NOT EXISTS report_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_snapshot_id UUID NOT NULL REFERENCES report_snapshots(id) ON DELETE CASCADE,
  
  version_number INTEGER NOT NULL,
  
  -- Changes
  changes_description TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Version Data
  version_data JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(report_snapshot_id, version_number)
);

-- Indexes for Reporting Module
CREATE INDEX idx_report_snapshots_contract ON report_snapshots(contract_id);
CREATE INDEX idx_report_snapshots_type ON report_snapshots(report_type);
CREATE INDEX idx_report_snapshots_period ON report_snapshots(period_start, period_end);
CREATE INDEX idx_report_snapshots_status ON report_snapshots(status);

-- ============================================
-- MODULE 8: SAFETY MANAGEMENT
-- ============================================
-- Purpose: Safety observations, incidents, toolbox talks
-- Phase: 4 onwards (optional but valuable)

-- 8.1 Safety Observations
CREATE TABLE IF NOT EXISTS safety_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Observation Details
  observation_number TEXT NOT NULL,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('Hazard', 'Near Miss', 'Unsafe Act', 'Unsafe Condition', 'Good Practice')),
  
  -- Description
  observation_description TEXT NOT NULL,
  location TEXT NOT NULL,
  observed_date DATE NOT NULL,
  
  -- Observer
  observed_by UUID NOT NULL REFERENCES auth.users(id),
  observer_name TEXT,
  
  -- Risk Level
  risk_level TEXT CHECK (risk_level IN ('Critical', 'High', 'Medium', 'Low')),
  
  -- Immediate Action
  immediate_action_taken TEXT,
  
  -- Follow-up
  corrective_action_required BOOLEAN DEFAULT FALSE,
  corrective_action_description TEXT,
  assigned_to UUID REFERENCES contract_members(id),
  target_completion_date DATE,
  actual_completion_date DATE,
  
  -- Status
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Completed', 'Closed')),
  
  -- Photos
  photos JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, observation_number)
);

-- 8.2 Incidents (Accidents/Injuries)
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Incident Details
  incident_number TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('Fatality', 'Lost Time Injury', 'Medical Treatment', 'First Aid', 'Property Damage', 'Near Miss')),
  
  -- When & Where
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  
  -- Description
  incident_description TEXT NOT NULL,
  cause_analysis TEXT,
  
  -- People Involved
  injured_persons JSONB DEFAULT '[]'::jsonb, -- Array of {name, role, injury_type}
  witnesses JSONB DEFAULT '[]'::jsonb,
  
  -- Severity
  severity TEXT NOT NULL CHECK (severity IN ('Fatal', 'Major', 'Minor', 'None')),
  work_days_lost INTEGER DEFAULT 0,
  
  -- Reporting
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reported_to_authorities BOOLEAN DEFAULT FALSE,
  authority_report_reference TEXT,
  
  -- Investigation
  investigation_required BOOLEAN DEFAULT TRUE,
  investigated_by TEXT,
  investigation_report TEXT,
  root_cause TEXT,
  
  -- Corrective Actions
  corrective_actions_taken TEXT,
  preventive_measures TEXT,
  
  -- Status
  status TEXT DEFAULT 'Reported' CHECK (status IN ('Reported', 'Under Investigation', 'Investigation Complete', 'Actions Implemented', 'Closed')),
  
  -- Documents
  photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, incident_number)
);

-- 8.3 Toolbox Meetings
CREATE TABLE IF NOT EXISTS toolbox_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Meeting Details
  meeting_number TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  location TEXT,
  
  -- Topics Discussed
  topics TEXT[] NOT NULL, -- Array of safety topics
  discussion_notes TEXT,
  
  -- Attendees
  attendees JSONB DEFAULT '[]'::jsonb, -- Array of {name, role, signature_url}
  total_attendees INTEGER DEFAULT 0,
  
  -- Conducted By
  conducted_by UUID REFERENCES auth.users(id),
  conductor_name TEXT NOT NULL,
  
  -- Attendance Record
  attendance_sheet_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contract_id, meeting_number)
);

-- Indexes for Safety Module
CREATE INDEX idx_safety_observations_contract ON safety_observations(contract_id);
CREATE INDEX idx_safety_observations_status ON safety_observations(status);
CREATE INDEX idx_incidents_contract ON incidents(contract_id);
CREATE INDEX idx_incidents_date ON incidents(incident_date);
CREATE INDEX idx_toolbox_meetings_contract ON toolbox_meetings(contract_id);

-- ============================================
-- RLS POLICIES - COMPREHENSIVE SECURITY
-- ============================================
-- Note: These policies will be created but some will be permissive initially
-- They will be tightened as modules are enabled

-- Enable RLS on all new tables
ALTER TABLE programme_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncr ENABLE ROW LEVEL SECURITY;
ALTER TABLE car ENABLE ROW LEVEL SECURITY;
ALTER TABLE delay_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE eot_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE variation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_meetings ENABLE ROW LEVEL SECURITY;

-- PERMISSIVE POLICIES (Initial - Will be tightened later)
-- These allow contract members to access data for their contracts

-- Programme Module Policies
CREATE POLICY "Users can view programme items for their contracts"
ON programme_items FOR SELECT
TO authenticated
USING (
  contract_id IN (
    SELECT contract_id FROM contract_members
    WHERE user_id = auth.uid()
    AND invitation_status = 'active'
  )
);

CREATE POLICY "Users can manage programme items for their contracts"
ON programme_items FOR ALL
TO authenticated
USING (
  contract_id IN (
    SELECT contract_id FROM contract_members
    WHERE user_id = auth.uid()
    AND member_role IN ('owner', 'admin', 'editor')
    AND invitation_status = 'active'
  )
);

-- Quality Module Policies
CREATE POLICY "Users can view quality records for their contracts"
ON inspections FOR SELECT
TO authenticated
USING (
  contract_id IN (
    SELECT contract_id FROM contract_members
    WHERE user_id = auth.uid()
    AND invitation_status = 'active'
  )
);

CREATE POLICY "Users can manage quality records for their contracts"
ON inspections FOR ALL
TO authenticated
USING (
  contract_id IN (
    SELECT contract_id FROM contract_members
    WHERE user_id = auth.uid()
    AND member_role IN ('owner', 'admin', 'editor', 'submitter')
    AND invitation_status = 'active'
  )
);

-- Apply similar policies to other quality tables
CREATE POLICY "Users can view test records for their contracts"
ON test_records FOR SELECT TO authenticated
USING (contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND invitation_status = 'active'));

CREATE POLICY "Users can view NCRs for their contracts"
ON ncr FOR SELECT TO authenticated
USING (contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND invitation_status = 'active'));

-- Delay & Claims Policies
CREATE POLICY "Users can view delay events for their contracts"
ON delay_events FOR SELECT TO authenticated
USING (contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND invitation_status = 'active'));

CREATE POLICY "Users can manage delay events for their contracts"
ON delay_events FOR ALL TO authenticated
USING (contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND member_role IN ('owner', 'admin', 'editor') AND invitation_status = 'active'));

-- Audit Logs - READ ONLY for all authenticated users (transparency)
CREATE POLICY "Users can view audit logs for their contracts"
ON audit_log FOR SELECT TO authenticated
USING (contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND invitation_status = 'active'));

-- Event Logs - READ ONLY for all authenticated users
CREATE POLICY "Users can view event logs for their contracts"
ON event_log FOR SELECT TO authenticated
USING (contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND invitation_status = 'active'));

-- Reports - Users can view and create reports for their contracts
CREATE POLICY "Users can view reports for their contracts"
ON report_snapshots FOR SELECT TO authenticated
USING (contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND invitation_status = 'active'));

-- Alerts - Users can view alerts assigned to them or their role
CREATE POLICY "Users can view their alerts"
ON alert_instances FOR SELECT TO authenticated
USING (
  assigned_to_user_id = auth.uid() 
  OR contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND invitation_status = 'active')
);

-- Safety - All contract members can view, editors can manage
CREATE POLICY "Users can view safety records for their contracts"
ON safety_observations FOR SELECT TO authenticated
USING (contract_id IN (SELECT contract_id FROM contract_members WHERE user_id = auth.uid() AND invitation_status = 'active'));

-- Note: Additional granular policies will be added as modules are enabled
-- These are intentionally permissive to allow development and testing

-- ============================================
-- TRIGGERS & FUNCTIONS (Auto-calculations)
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_programme_items_updated_at BEFORE UPDATE ON programme_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_records_updated_at BEFORE UPDATE ON test_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ncr_updated_at BEFORE UPDATE ON ncr FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_car_updated_at BEFORE UPDATE ON car FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_delay_events_updated_at BEFORE UPDATE ON delay_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_eot_claims_updated_at BEFORE UPDATE ON eot_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variation_orders_updated_at BEFORE UPDATE ON variation_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_site_instructions_updated_at BEFORE UPDATE ON site_instructions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_bonds_updated_at BEFORE UPDATE ON performance_bonds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insurance_policies_updated_at BEFORE UPDATE ON insurance_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_milestones_updated_at BEFORE UPDATE ON contract_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_snapshots_updated_at BEFORE UPDATE ON report_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_observations_updated_at BEFORE UPDATE ON safety_observations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_definitions_updated_at BEFORE UPDATE ON alert_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS & DOCUMENTATION
-- ============================================

COMMENT ON TABLE programme_items IS 'Programme/schedule activities with WBS structure, planned vs actual tracking, critical path analysis';
COMMENT ON TABLE programme_links IS 'Predecessor/successor relationships between programme activities (FS, SS, FF, SF)';
COMMENT ON TABLE inspections IS 'Quality inspections, RFI workflow, approval tracking';
COMMENT ON TABLE test_records IS 'Test results for concrete, soil, rebar, etc. with pass/fail tracking';
COMMENT ON TABLE ncr IS 'Non-Conformance Reports - quality issues requiring corrective action';
COMMENT ON TABLE car IS 'Corrective Action Requests - remediation for NCRs';
COMMENT ON TABLE delay_events IS 'Delay event recording for EOT claims with evidence linkage';
COMMENT ON TABLE eot_claims IS 'Extension of Time claims with programme impact analysis';
COMMENT ON TABLE variation_orders IS 'Variation orders with financial and time impact tracking';
COMMENT ON TABLE site_instructions IS 'Site/Architect/Engineer instructions with response tracking';
COMMENT ON TABLE event_log IS 'System-wide event logging for debugging and monitoring';
COMMENT ON TABLE audit_log IS 'Immutable audit trail for compliance and dispute evidence';
COMMENT ON TABLE ai_outputs IS 'AI-generated outputs separate from truth tables, requires human approval';
COMMENT ON TABLE alert_instances IS 'Active alerts for deadlines, approvals, and critical events';
COMMENT ON TABLE report_snapshots IS 'Immutable report versions with approval workflow';

-- ============================================
-- SCHEMA DEPLOYMENT COMPLETE
-- ============================================

-- Summary of new tables created:
-- Programme: 4 tables (programme_items, programme_links, programme_versions, programme_calendars)
-- Quality: 4 tables (inspections, test_records, ncr, car)
-- Delay & Claims: 4 tables (delay_events, eot_claims, variation_orders, site_instructions)
-- Contract Admin: 3 tables (performance_bonds, insurance_policies, contract_milestones)
-- Audit: 3 tables (event_log, audit_log, ai_outputs)
-- Alerts: 3 tables (alert_definitions, alert_instances, alert_history)
-- Reports: 2 tables (report_snapshots, report_versions)
-- Safety: 3 tables (safety_observations, incidents, toolbox_meetings)
--
-- TOTAL NEW TABLES: 26 tables
-- TOTAL TABLES (with existing): ~40 tables
--
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify all tables created successfully
-- 3. Proceed to Session 15: Mock Data Generation
--
-- Bismillah - May this schema serve the Malaysian construction industry well! 🚀
