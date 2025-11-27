-- Migration: Fix users table to allow 'admin' role and add missing columns
-- This fixes the CHECK constraint that was preventing admin creation

-- Drop the old constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint that includes 'admin'
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('learner', 'mentor', 'admin'));

-- Add missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update existing rows to set updated_at if it's null
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;

