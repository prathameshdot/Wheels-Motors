-- Update database schema for enhanced features

-- Add new fields to company_details table
ALTER TABLE company_details 
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS dynamic_fields JSONB DEFAULT '{}';

-- Update vehicle_buyers table to include more buyer details
ALTER TABLE vehicle_buyers 
ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS buyer_address TEXT,
ADD COLUMN IF NOT EXISTS dynamic_fields JSONB DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_buyers_vehicle_id ON vehicle_buyers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_company_details_user_id ON company_details(user_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Update storage bucket policies if needed
-- These would be run in Supabase dashboard SQL editor

-- Create company-assets bucket if it doesn't exist
-- INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Set up RLS policies for company-assets bucket
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');
-- CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');

-- Sample data for testing (optional)
-- INSERT INTO company_details (user_id, company_name, admin_name, phone, email, website, industry, description, address) 
-- VALUES 
-- ((SELECT id FROM users LIMIT 1), 'Sample Auto Sales', 'John Doe', '+1234567890', 'john@sampleauto.com', 'https://sampleauto.com', 'Automotive', 'Leading auto sales company', '123 Main St, City, State');

-- Update existing vehicle status values to match new system
UPDATE vehicles SET status = 'sold' WHERE status = 'out';

-- Ensure all users have proper status
UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';
