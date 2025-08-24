-- ==================================================================================
-- QUICK FIX SCRIPT FOR IMMEDIATE ISSUES
-- ==================================================================================
-- This script fixes the current database issues quickly

-- Fix 1: Disable RLS temporarily for users table to resolve 406 errors
-- =====================================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Fix 2: Create vehicle_buyers table if missing
-- =============================================
CREATE TABLE IF NOT EXISTS vehicle_buyers (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid REFERENCES vehicles(id),
  buyer_name text,
  buyer_phone text,
  sell_price numeric,
  balance_amount numeric DEFAULT 0,
  sell_date date,
  id_proof_url text,
  dynamic_fields jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Fix 3: Update company_details table structure to match simplified form
-- =====================================================================
DO $$ 
BEGIN
    -- Remove complex columns that aren't needed
    BEGIN
        ALTER TABLE company_details DROP COLUMN IF EXISTS contact_person;
        ALTER TABLE company_details DROP COLUMN IF EXISTS website;
        ALTER TABLE company_details DROP COLUMN IF EXISTS gst_number;
        ALTER TABLE company_details DROP COLUMN IF EXISTS pan_number;
        ALTER TABLE company_details DROP COLUMN IF EXISTS business_type;
        ALTER TABLE company_details DROP COLUMN IF EXISTS registration_date;
        ALTER TABLE company_details DROP COLUMN IF EXISTS dynamic_fields;
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Some columns may not exist, continuing...';
    END;

    -- Add/ensure essential columns exist
    BEGIN
        ALTER TABLE company_details ADD COLUMN IF NOT EXISTS email text;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column email already exists';
    END;

    -- Ensure admin_name column exists (company form uses this)
    BEGIN
        ALTER TABLE company_details ADD COLUMN IF NOT EXISTS admin_name text;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column admin_name already exists';
    END;

    -- Add signature_url column for signature upload
    BEGIN
        ALTER TABLE company_details ADD COLUMN IF NOT EXISTS signature_url text;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column signature_url already exists';
    END;
END $$;

-- Fix 4: Update vehicles table to match form structure
-- ====================================================
DO $$ 
BEGIN
    -- Add status column
    BEGIN
        ALTER TABLE vehicles ADD COLUMN status text DEFAULT 'in';
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column status already exists';
    END;

    -- Add images column (for photo URLs array)
    BEGIN
        ALTER TABLE vehicles ADD COLUMN images text[];
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column images already exists';
    END;

    -- Add dynamic_fields column
    BEGIN
        ALTER TABLE vehicles ADD COLUMN dynamic_fields jsonb;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column dynamic_fields already exists';
    END;
END $$;

-- Fix 5: Create simple permissive RLS policies
-- ============================================
-- Remove existing restrictive policies
DROP POLICY IF EXISTS "Superadmins can access all users" ON users;
DROP POLICY IF EXISTS "Users can access own records" ON users;

-- Create permissive policy for authenticated users
DO $$ 
BEGIN
    CREATE POLICY "Authenticated users can access users"
      ON users FOR ALL
      USING (auth.role() = 'authenticated');
EXCEPTION 
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Policy already exists';
END $$;

-- Disable RLS on other tables temporarily
ALTER TABLE admin_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;

-- Fix 6: Create storage buckets if missing
-- ========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- NOTE: Storage policies need to be created through Supabase Dashboard
-- ===================================================================
-- Go to Storage > Policies in your Supabase dashboard and create these policies:
-- 
-- For bucket 'company-logos':
-- 1. Policy name: "Public Access" | Operation: SELECT | Policy: (no conditions)
-- 2. Policy name: "Authenticated Upload" | Operation: INSERT | Policy: auth.role() = 'authenticated'
-- 3. Policy name: "Authenticated Update" | Operation: UPDATE | Policy: auth.role() = 'authenticated'
-- 4. Policy name: "Authenticated Delete" | Operation: DELETE | Policy: auth.role() = 'authenticated'
-- 
-- For bucket 'vehicle-photos':
-- 1. Policy name: "Public Access" | Operation: SELECT | Policy: (no conditions)
-- 2. Policy name: "Authenticated Upload" | Operation: INSERT | Policy: auth.role() = 'authenticated'
-- 3. Policy name: "Authenticated Update" | Operation: UPDATE | Policy: auth.role() = 'authenticated'
-- 4. Policy name: "Authenticated Delete" | Operation: DELETE | Policy: auth.role() = 'authenticated'

-- Fix 7: Add triggers for updated_at on new tables
-- ================================================
-- Vehicle buyers trigger
DROP TRIGGER IF EXISTS update_vehicle_buyers_updated_at ON vehicle_buyers;
CREATE TRIGGER update_vehicle_buyers_updated_at
    BEFORE UPDATE ON vehicle_buyers
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ==================================================================================
-- END OF QUICK FIX SCRIPT
-- ==================================================================================
