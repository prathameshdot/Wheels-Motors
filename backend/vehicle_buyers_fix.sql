-- ==================================================================================
-- VEHICLE BUYERS TABLE FIX
-- ==================================================================================
-- This script specifically fixes the vehicle_buyers table issue

-- Drop and recreate vehicle_buyers table to ensure it has all columns
DROP TABLE IF EXISTS vehicle_buyers CASCADE;

-- Create vehicle_buyers table with all required columns
CREATE TABLE vehicle_buyers (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_phone text,
  sell_price numeric,
  balance_amount numeric DEFAULT 0,
  sell_date date,
  id_proof_url text,
  dynamic_fields jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_vehicle_buyers_updated_at ON vehicle_buyers;
CREATE TRIGGER update_vehicle_buyers_updated_at
    BEFORE UPDATE ON vehicle_buyers
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_buyers_vehicle_id ON vehicle_buyers(vehicle_id);

-- Test the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'vehicle_buyers' 
ORDER BY ordinal_position;
