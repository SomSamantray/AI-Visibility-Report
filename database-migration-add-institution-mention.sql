-- Database Migration: Add include_institution_mention column to queries table
-- Run this SQL in Supabase SQL Editor

-- Add the new column with default value false
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS include_institution_mention BOOLEAN DEFAULT false;

-- Add a comment to document the column
COMMENT ON COLUMN queries.include_institution_mention IS 'Flag indicating whether this query should include institution mention instruction in the user prompt (randomly selected, ~35% of queries)';

-- Verify the migration
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'queries' AND column_name = 'include_institution_mention';
