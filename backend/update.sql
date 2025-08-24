-- Update existing tables and create new ones for the enhanced admin panel

-- Update users table to include password and access control
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_days integer DEFAULT 30;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;

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
ALTER TABLE company_details ALTER COLUMN signature_url DROP NOT NULL;

-- Drop existing vehicles table and recreate with new structure
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS vehicles1 CASCADE;

-- Create vehicles table with enhanced fields
CREATE TABLE vehicles (
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
  status text DEFAULT 'in', -- in, out
  images jsonb, -- array of image URLs
  dynamic_fields jsonb, -- for additional dynamic fields
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create vehicle_buyers table for sell transactions
CREATE TABLE IF NOT EXISTS vehicle_buyers (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  phone text NOT NULL,
  id_proof_url text,
  sell_price numeric NOT NULL,
  balance_amount numeric DEFAULT 0,
  sell_date date DEFAULT CURRENT_DATE,
  dynamic_fields jsonb, -- for additional buyer details
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create user_sessions table for tracking logins
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  login_time timestamp DEFAULT now(),
  logout_time timestamp,
  ip_address text,
  device_info text
);

-- Create notifications table for email notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  type text, -- 'welcome', 'access_expiry', 'blocked', etc.
  title text,
  message text,
  sent_at timestamp DEFAULT now(),
  email_sent boolean DEFAULT false
);

-- Function to set access expiry when access_days is updated (simplified to avoid recursion)
CREATE OR REPLACE FUNCTION update_access_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update expiry if access_days changed and avoid infinite loops
  IF NEW.access_days IS NOT NULL AND (OLD.access_days IS NULL OR NEW.access_days != OLD.access_days) THEN
    NEW.access_expires_at = NOW() + INTERVAL '1 day' * NEW.access_days;
  END IF;
  
  -- Only update timestamp if it's not already being updated
  IF NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for access expiry update (simplified)
DROP TRIGGER IF EXISTS update_user_access_expiry ON users;
CREATE TRIGGER update_user_access_expiry
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_access_expiry();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_buyers_vehicle_id ON vehicle_buyers(vehicle_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can do everything on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can do everything on vehicles" ON vehicles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can do everything on vehicle_buyers" ON vehicle_buyers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin can do everything on company_details" ON company_details
  FOR ALL USING (true) WITH CHECK (true);
