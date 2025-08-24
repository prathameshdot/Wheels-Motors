-- Set superadmin role for the main admin account
-- Run this after running the main update script

-- Update the existing admin account to have superadmin role
UPDATE admin_details 
SET role = 'superadmin' 
WHERE email = '963sohamraut@gmail.com';

-- If you want to also add the admin to auth.users (if not already there)
-- You'll need to manually create the auth user through Supabase dashboard or signup

-- Update any existing users to have 'user' role if not set
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- Optional: Create a function to automatically assign roles based on table
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    -- Check if user is in admin_details (superadmin)
    SELECT role INTO user_role
    FROM admin_details
    WHERE id = user_id;
    
    IF user_role IS NOT NULL THEN
        RETURN user_role;
    END IF;
    
    -- Check if user is in users table (regular user)
    SELECT role INTO user_role
    FROM users
    WHERE id = user_id;
    
    -- Return role or default to 'user'
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
