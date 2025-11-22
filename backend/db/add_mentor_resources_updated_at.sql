-- Migration: Add updated_at column to mentor_resources table
-- Run this script to add the updated_at column if it doesn't exist

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'mentor_resources' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE mentor_resources 
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        
        -- Update existing rows to set updated_at = created_at if created_at exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'mentor_resources' 
            AND column_name = 'created_at'
        ) THEN
            UPDATE mentor_resources 
            SET updated_at = created_at 
            WHERE updated_at IS NULL;
        END IF;
        
        RAISE NOTICE 'Column updated_at added to mentor_resources table';
    ELSE
        RAISE NOTICE 'Column updated_at already exists in mentor_resources table';
    END IF;
END $$;

