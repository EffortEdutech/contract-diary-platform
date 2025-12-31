-- ============================================
-- SESSION 9 - SCRIPT 1: CREATE PROGRESS CLAIMS TABLE
-- ============================================
-- Purpose: Create progress_claims table for tracking payment claims
-- Features: Auto-incrementing claim numbers, CIPAA timeline calculations,
--           retention management, status workflow
-- Created: 2026-01-01
-- Session: 9 - Progress Claims Module (Phase 4A)
-- ============================================

-- Drop table if exists (for development only)
-- DROP TABLE IF EXISTS progress_claims CASCADE;

-- ============================================
-- CREATE PROGRESS_CLAIMS TABLE
-- ============================================

CREATE TABLE progress_claims (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    
    -- Claim Identification
    claim_number INTEGER NOT NULL,
    claim_title TEXT,
    
    -- Claim Period
    claim_period_from DATE NOT NULL,
    claim_period_to DATE NOT NULL,
    
    -- Dates
    submission_date DATE DEFAULT CURRENT_DATE,
    payment_due_date DATE, -- Auto-calculated: submission_date + 30 days (CIPAA)
    approved_date DATE,
    payment_date DATE,
    
    -- Financial Amounts
    claim_amount NUMERIC(15,2) DEFAULT 0.00, -- This claim amount
    retention_percentage NUMERIC(5,2) DEFAULT 5.00, -- Usually 5% or 10%
    retention_amount NUMERIC(15,2) DEFAULT 0.00, -- Calculated
    net_claim_amount NUMERIC(15,2) DEFAULT 0.00, -- claim_amount - retention_amount
    cumulative_claimed NUMERIC(15,2) DEFAULT 0.00, -- Running total including this claim
    
    -- Status Workflow
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),
    
    -- Notes & Remarks
    notes TEXT,
    rejection_reason TEXT,
    
    -- Audit Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_claim_period CHECK (claim_period_to >= claim_period_from),
    CONSTRAINT valid_retention_percentage CHECK (retention_percentage >= 0 AND retention_percentage <= 100),
    CONSTRAINT unique_claim_number_per_contract UNIQUE (contract_id, claim_number)
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index on contract_id for faster lookups
CREATE INDEX idx_claims_contract_id ON progress_claims(contract_id);

-- Index on status for filtering
CREATE INDEX idx_claims_status ON progress_claims(status);

-- Index on created_by for user-specific queries
CREATE INDEX idx_claims_created_by ON progress_claims(created_by);

-- Index on submission_date for timeline queries
CREATE INDEX idx_claims_submission_date ON progress_claims(submission_date);

-- Index on payment_due_date for overdue tracking
CREATE INDEX idx_claims_payment_due_date ON progress_claims(payment_due_date);

-- Composite index for contract + claim number (most common query)
CREATE INDEX idx_claims_contract_claim_number ON progress_claims(contract_id, claim_number);

-- ============================================
-- CREATE FUNCTION: Auto-increment Claim Number
-- ============================================

CREATE OR REPLACE FUNCTION get_next_claim_number(p_contract_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Get the maximum claim number for this contract and add 1
    SELECT COALESCE(MAX(claim_number), 0) + 1
    INTO next_number
    FROM progress_claims
    WHERE contract_id = p_contract_id;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGER: Auto-update Updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_claims_timestamp
    BEFORE UPDATE ON progress_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_claims_updated_at();

-- ============================================
-- CREATE TRIGGER: Auto-calculate Payment Due Date
-- ============================================

CREATE OR REPLACE FUNCTION calculate_payment_due_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate payment_due_date as submission_date + 30 days (CIPAA requirement)
    IF NEW.submission_date IS NOT NULL THEN
        NEW.payment_due_date = NEW.submission_date + INTERVAL '30 days';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_payment_due_date
    BEFORE INSERT OR UPDATE ON progress_claims
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payment_due_date();

-- ============================================
-- CREATE TRIGGER: Auto-calculate Retention & Net Amount
-- ============================================

CREATE OR REPLACE FUNCTION calculate_retention_and_net()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate retention amount
    NEW.retention_amount = NEW.claim_amount * (NEW.retention_percentage / 100);
    
    -- Calculate net claim amount (claim amount - retention)
    NEW.net_claim_amount = NEW.claim_amount - NEW.retention_amount;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_retention_and_net
    BEFORE INSERT OR UPDATE ON progress_claims
    FOR EACH ROW
    EXECUTE FUNCTION calculate_retention_and_net();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE progress_claims IS 'Progress payment claims linked to contracts and BOQ items';
COMMENT ON COLUMN progress_claims.claim_number IS 'Auto-incrementing claim number per contract (Claim 1, Claim 2, etc.)';
COMMENT ON COLUMN progress_claims.claim_amount IS 'Total claim amount before retention';
COMMENT ON COLUMN progress_claims.retention_percentage IS 'Retention percentage (typically 5% or 10%)';
COMMENT ON COLUMN progress_claims.retention_amount IS 'Auto-calculated retention amount';
COMMENT ON COLUMN progress_claims.net_claim_amount IS 'Net amount after retention deduction';
COMMENT ON COLUMN progress_claims.cumulative_claimed IS 'Running total of all claims including this one';
COMMENT ON COLUMN progress_claims.payment_due_date IS 'Auto-calculated as submission_date + 30 days (CIPAA)';
COMMENT ON COLUMN progress_claims.status IS 'Workflow status: draft, submitted, approved, rejected, paid';

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample claim:
-- INSERT INTO progress_claims (
--     contract_id,
--     created_by,
--     claim_number,
--     claim_title,
--     claim_period_from,
--     claim_period_to,
--     claim_amount,
--     retention_percentage
-- ) VALUES (
--     'your-contract-uuid-here',
--     'your-user-uuid-here',
--     1,
--     'Progress Claim #1 - January 2026',
--     '2026-01-01',
--     '2026-01-31',
--     100000.00,
--     5.00
-- );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if table was created successfully:
-- SELECT table_name, table_type 
-- FROM information_schema.tables 
-- WHERE table_name = 'progress_claims';

-- Check indexes:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'progress_claims';

-- Check triggers:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE event_object_table = 'progress_claims';

-- Check functions:
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_name LIKE '%claim%';

-- ============================================
-- DEPLOYMENT NOTES
-- ============================================

-- 1. Run this script in Supabase SQL Editor
-- 2. Verify table created: Should see "Success. No rows returned"
-- 3. Check table in Supabase dashboard under "Table Editor"
-- 4. Verify indexes created (improves query performance)
-- 5. Verify triggers created (auto-calculations)
-- 6. Test with sample INSERT (optional)
-- 7. Move to next script: 002_create_claim_items_table.sql

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If you get "relation already exists" error:
-- DROP TABLE progress_claims CASCADE;

-- If you get "function already exists" error:
-- DROP FUNCTION function_name CASCADE;

-- If you need to reset everything:
-- DROP TABLE progress_claims CASCADE;
-- DROP FUNCTION get_next_claim_number CASCADE;
-- DROP FUNCTION update_claims_updated_at CASCADE;
-- DROP FUNCTION calculate_payment_due_date CASCADE;
-- DROP FUNCTION calculate_retention_and_net CASCADE;
-- Then re-run this entire script

-- ============================================
-- SUCCESS!
-- ============================================

-- If this script ran without errors, you should see:
-- - ✅ progress_claims table created
-- - ✅ 6 indexes created
-- - ✅ 4 functions created
-- - ✅ 3 triggers created
-- - ✅ Ready for Script 2 (claim_items table)

-- Alhamdulillah! Script 1 complete! 🎉
-- Next: Run 002_create_claim_items_table.sql
