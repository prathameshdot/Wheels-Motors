-- Minimal update script to fix database issues
-- This version removes all triggers to avoid recursion problems

-- Update users table to include missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_days integer DEFAULT 30;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Create admin_details table for super admin
CREATE TABLE IF NOT EXISTS admin_details (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  full_name text,
  phone text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Insert super admin (you'll need to hash the password)
INSERT INTO admin_details (email, password_hash, full_name, phone) 
VALUES ('963sohamraut@gmail.com', 'KiranM2345', 'Super Admin', '+918554044682')
ON CONFLICT (email) DO NOTHING;

-- Update company_details table to link with users
ALTER TABLE company_details ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);
ALTER TABLE company_details ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES admin_details(id);

-- Conditionally drop NOT NULL constraint on signature_url if it exists
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE company_details ALTER COLUMN signature_url DROP NOT NULL;
    EXCEPTION 
        WHEN others THEN 
            NULL;
    END;
END $$;

-- Create vehicles table (only if it doesn't exist)
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

-- Create vehicle_buyers table (only if it doesn't exist)
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

-- Remove all existing triggers to avoid recursion
DROP TRIGGER IF EXISTS trigger_update_access_expiry ON users;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS trigger_update_user_timestamps ON users;
DROP TRIGGER IF EXISTS check_user_access ON users;

-- Drop trigger functions to clean up
DROP FUNCTION IF EXISTS update_access_expiry() CASCADE;
DROP FUNCTION IF EXISTS check_user_access() CASCADE;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    -- Drop and recreate users policies
    BEGIN
        DROP POLICY IF EXISTS "Admin can do everything on users" ON users;
        CREATE POLICY "Admin can do everything on users" ON users
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not recreate users policy: %', SQLERRM;
    END;

    -- Drop and recreate vehicles policies
    BEGIN
        DROP POLICY IF EXISTS "Admin can do everything on vehicles" ON vehicles;
        CREATE POLICY "Admin can do everything on vehicles" ON vehicles
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not recreate vehicles policy: %', SQLERRM;
    END;

    -- Drop and recreate vehicle_buyers policies
    BEGIN
        DROP POLICY IF EXISTS "Admin can do everything on vehicle_buyers" ON vehicle_buyers;
        CREATE POLICY "Admin can do everything on vehicle_buyers" ON vehicle_buyers
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not recreate vehicle_buyers policy: %', SQLERRM;
    END;

    -- Drop and recreate company_details policies
    BEGIN
        DROP POLICY IF EXISTS "Admin can do everything on company_details" ON company_details;
        CREATE POLICY "Admin can do everything on company_details" ON company_details
        FOR ALL USING (true) WITH CHECK (true);
    EXCEPTION 
        WHEN others THEN 
            RAISE NOTICE 'Could not recreate company_details policy: %', SQLERRM;
    END;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_access_expires ON users(access_expires_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_admin_id ON vehicles(admin_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_buyers_vehicle_id ON vehicle_buyers(vehicle_id);

COMMIT;
