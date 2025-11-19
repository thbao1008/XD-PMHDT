-- Add translation column to speaking_practice_rounds
ALTER TABLE speaking_practice_rounds 
ADD COLUMN IF NOT EXISTS translation TEXT;

