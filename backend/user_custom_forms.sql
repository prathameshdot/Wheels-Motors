-- ==================================================================================
-- USER CUSTOM FORMS TABLE
-- ==================================================================================
-- This script creates a table to store custom form configurations for users

-- Create user_custom_forms table
CREATE TABLE IF NOT EXISTS user_custom_forms (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  form_type text NOT NULL, -- 'add_vehicle' or 'sell_vehicle'
  fields jsonb NOT NULL, -- Array of field definitions
  created_at timestamp default now(),
  updated_at timestamp default now(),
  
  -- Ensure one form per user per type
  UNIQUE(user_id, form_type)
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_custom_forms_updated_at ON user_custom_forms;
CREATE TRIGGER update_user_custom_forms_updated_at
    BEFORE UPDATE ON user_custom_forms
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_custom_forms_user_id ON user_custom_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_forms_form_type ON user_custom_forms(form_type);

-- Sample form configuration for testing
INSERT INTO user_custom_forms (user_id, form_type, fields) VALUES
(
  (SELECT id FROM users LIMIT 1),
  'add_vehicle',
  '[
    {"id": 1, "label": "Vehicle Color", "type": "varchar", "required": true},
    {"id": 2, "label": "Special Features", "type": "textarea", "required": false},
    {"id": 3, "label": "Warranty Expiry", "type": "date", "required": false}
  ]'::jsonb
) ON CONFLICT (user_id, form_type) DO NOTHING;

-- Test query
SELECT * FROM user_custom_forms;
