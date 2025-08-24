-- Update existing tables and create new ones for the enhanced admin panel
-- This version handles existing policies and constraints gracefully

-- Update users table to include password and access control
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_days integer DEFAULT 30;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'superadmin'));

-- Create admin_details table for super admin
CREATE TABLE IF NOT EXISTS admin_details (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  full_name text,
  phone text,
  role text DEFAULT 'superadmin' CHECK (role IN ('user', 'superadmin')),
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
            -- Column might not have NOT NULL constraint, ignore error
            NULL;
    END;
END $$;

-- Create vehicles table with enhanced fields (only if it doesn't exist)
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

-- Function to update access expiry and updated_at (combined to avoid conflicts)
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

-- Function to automatically update updated_at column for other tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_access_expiry ON users;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS trigger_update_user_timestamps ON users;

-- Create single combined trigger for users table
CREATE TRIGGER trigger_update_user_timestamps
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_timestamps();

-- Create triggers for updated_at on other tables
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicle_buyers_updated_at ON vehicle_buyers;
CREATE TRIGGER update_vehicle_buyers_updated_at
    BEFORE UPDATE ON vehicle_buyers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
