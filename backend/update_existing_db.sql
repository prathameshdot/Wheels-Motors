-- Update script for existing database with proper error handling
-- This script safely updates existing tables and handles conflicts

BEGIN;

-- Safely add columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add password_hash column
    BEGIN
        ALTER TABLE users ADD COLUMN password_hash text;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column password_hash already exists in users table';
    END;

    -- Add access_days column
    BEGIN
        ALTER TABLE users ADD COLUMN access_days integer DEFAULT 30;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column access_days already exists in users table';
    END;

    -- Add access_expires_at column
    BEGIN
        ALTER TABLE users ADD COLUMN access_expires_at timestamp;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column access_expires_at already exists in users table';
    END;

    -- Add last_login column
    BEGIN
        ALTER TABLE users ADD COLUMN last_login timestamp;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column last_login already exists in users table';
    END;

    -- Add is_approved column
    BEGIN
        ALTER TABLE users ADD COLUMN is_approved boolean DEFAULT true;
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column is_approved already exists in users table';
    END;

    -- Add updated_at column
    BEGIN
        ALTER TABLE users ADD COLUMN updated_at timestamp DEFAULT now();
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column updated_at already exists in users table';
    END;

    -- Add role column with constraint
    BEGIN
        ALTER TABLE users ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'superadmin'));
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column role already exists in users table';
        WHEN check_violation THEN
            RAISE NOTICE 'Role constraint already exists or conflicts';
    END;
END $$;

-- Safely add columns to company_details table
DO $$ 
BEGIN
    -- Add user_id column
    BEGIN
        ALTER TABLE company_details ADD COLUMN user_id uuid REFERENCES users(id);
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column user_id already exists in company_details table';
    END;

    -- Add admin_id column
    BEGIN
        ALTER TABLE company_details ADD COLUMN admin_id uuid REFERENCES admin_details(id);
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column admin_id already exists in company_details table';
        WHEN undefined_table THEN
            RAISE NOTICE 'admin_details table does not exist yet';
    END;
END $$;

-- Create admin_details table safely
CREATE TABLE IF NOT EXISTS admin_details (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  full_name text,
  phone text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Safely add role column to admin_details table
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE admin_details ADD COLUMN role text DEFAULT 'superadmin' CHECK (role IN ('user', 'superadmin'));
    EXCEPTION 
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column role already exists in admin_details table';
        WHEN check_violation THEN
            RAISE NOTICE 'Role constraint already exists or conflicts in admin_details';
    END;
END $$;

-- Insert super admin safely
INSERT INTO admin_details (email, password_hash, full_name, phone) 
VALUES ('963sohamraut@gmail.com', 'KiranM2345', 'Super Admin', '+918554044682')
ON CONFLICT (email) DO NOTHING;

-- Create company_details table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_details (
  id uuid primary key default uuid_generate_v4(),
  company_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  website text,
  gst_number text,
  pan_number text,
  business_type text,
  registration_date date,
  logo_url text,
  signature_url text,
  dynamic_fields jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Safely drop NOT NULL constraint on signature_url
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE company_details ALTER COLUMN signature_url DROP NOT NULL;
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not drop NOT NULL constraint on signature_url: %', SQLERRM;
    END;
END $$;

-- Create vehicles table safely
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid REFERENCES admin_details(id),
  user_id uuid REFERENCES users(id),
  vehicle_no text,
  model text,
  brand text,
  price numeric,
  fuel_type text,
  purchase_date date,
  insurance_expiry date,
  rc_available boolean DEFAULT false,
  insurance_done boolean DEFAULT false,
  loan_cleared boolean DEFAULT false,
  loan_amount numeric,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create vehicle_buyers table safely
CREATE TABLE IF NOT EXISTS vehicle_buyers (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  purchase_price numeric,
  down_payment numeric,
  loan_amount numeric,
  emi_amount numeric,
  emi_months integer,
  sale_date date,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Drop all existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_update_access_expiry ON users;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS trigger_update_user_timestamps ON users;
DROP TRIGGER IF EXISTS check_user_access ON users;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
DROP TRIGGER IF EXISTS update_vehicle_buyers_updated_at ON vehicle_buyers;

-- Drop old trigger functions
DROP FUNCTION IF EXISTS update_access_expiry() CASCADE;
DROP FUNCTION IF EXISTS check_user_access() CASCADE;

-- Create new trigger functions
CREATE OR REPLACE FUNCTION update_user_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if access_days changed and is not null
  IF NEW.access_days IS DISTINCT FROM OLD.access_days AND NEW.access_days IS NOT NULL THEN
    NEW.access_expires_at = NOW() + (NEW.access_days || ' days')::INTERVAL;
  END IF;
  
  -- Always update the updated_at timestamp
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for other tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new triggers
CREATE TRIGGER trigger_update_user_timestamps
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_timestamps();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_buyers_updated_at
    BEFORE UPDATE ON vehicle_buyers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS safely
DO $$
BEGIN
    BEGIN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'RLS already enabled on users or error: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'RLS already enabled on vehicles or error: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE vehicle_buyers ENABLE ROW LEVEL SECURITY;
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'RLS already enabled on vehicle_buyers or error: %', SQLERRM;
    END;

    BEGIN
        ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'RLS already enabled on company_details or error: %', SQLERRM;
    END;
END $$;

-- Drop and recreate policies safely
DO $$ 
BEGIN
    -- Users policies
    BEGIN
        DROP POLICY IF EXISTS "Admin can do everything on users" ON users;
        CREATE POLICY "Admin can do everything on users" ON users
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not recreate users policy: %', SQLERRM;
    END;

    -- Vehicles policies
    BEGIN
        DROP POLICY IF EXISTS "Admin can do everything on vehicles" ON vehicles;
        CREATE POLICY "Admin can do everything on vehicles" ON vehicles
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not recreate vehicles policy: %', SQLERRM;
    END;

    -- Vehicle buyers policies
    BEGIN
        DROP POLICY IF EXISTS "Admin can do everything on vehicle_buyers" ON vehicle_buyers;
        CREATE POLICY "Admin can do everything on vehicle_buyers" ON vehicle_buyers
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not recreate vehicle_buyers policy: %', SQLERRM;
    END;

    -- Company details policies
    BEGIN
        DROP POLICY IF EXISTS "Admin can do everything on company_details" ON company_details;
        CREATE POLICY "Admin can do everything on company_details" ON company_details
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not recreate company_details policy: %', SQLERRM;
    END;
END $$;

-- Create indexes safely
DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Index idx_users_email already exists or error: %', SQLERRM;
    END;

    BEGIN
        CREATE INDEX IF NOT EXISTS idx_users_access_expires ON users(access_expires_at);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Index idx_users_access_expires already exists or error: %', SQLERRM;
    END;

    BEGIN
        CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Index idx_vehicles_user_id already exists or error: %', SQLERRM;
    END;

    BEGIN
        CREATE INDEX IF NOT EXISTS idx_vehicles_admin_id ON vehicles(admin_id);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Index idx_vehicles_admin_id already exists or error: %', SQLERRM;
    END;

    BEGIN
        CREATE INDEX IF NOT EXISTS idx_vehicle_buyers_vehicle_id ON vehicle_buyers(vehicle_id);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Index idx_vehicle_buyers_vehicle_id already exists or error: %', SQLERRM;
    END;
END $$;

-- Update existing users to have role if not set
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Set superadmin role for admin (safely)
DO $$
BEGIN
    -- Check if role column exists in admin_details before updating
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'admin_details' AND column_name = 'role') THEN
        UPDATE admin_details SET role = 'superadmin' WHERE email = '963sohamraut@gmail.com';
        RAISE NOTICE 'Updated admin role to superadmin';
    ELSE
        RAISE NOTICE 'Role column does not exist in admin_details table';
    END IF;
END $$;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database update completed successfully!';
END $$;
