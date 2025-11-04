-- Database Migration: Weighted Visibility System with Brand Consolidation
-- This migration adds support for:
-- 1. Canonical brand tracking for campus/branch consolidation
-- 2. Ensures location column exists in analyses table
-- Run this SQL in Supabase SQL Editor

-- ============================================================================
-- 1. Add canonical_brand column to queries table
-- ============================================================================

-- Add the canonical_brand column to track parent brands
ALTER TABLE queries
ADD COLUMN IF NOT EXISTS canonical_brand TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN queries.canonical_brand IS 'Canonical/parent brand name for campus variants (e.g., "Sage University" for "Sage University Indore" and "Sage University Bhopal"). Used for brand consolidation in metrics.';

-- Add index for better query performance when aggregating by canonical brand
CREATE INDEX IF NOT EXISTS idx_queries_canonical_brand ON queries(canonical_brand);

-- ============================================================================
-- 2. Ensure location column exists in analyses table
-- ============================================================================

-- Add location column if it doesn't exist (used for region-based web search)
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN analyses.location IS 'Institution location from Prompt #1 output (format: "City, State/Region, Country"). Used for regional web search in Prompt #2.';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_analyses_location ON analyses(location);

-- ============================================================================
-- 3. Verify the migration
-- ============================================================================

-- Check canonical_brand column in queries table
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'queries'
  AND column_name = 'canonical_brand';

-- Check location column in analyses table
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'analyses'
  AND column_name = 'location';

-- ============================================================================
-- 4. Optional: Update existing data (if needed)
-- ============================================================================

-- If you have existing analyses without locations, you can manually update them:
-- UPDATE analyses SET location = 'Unknown' WHERE location IS NULL;

-- If you want to backfill canonical_brand for existing queries, run:
-- UPDATE queries SET canonical_brand = focused_brand WHERE canonical_brand IS NULL;

-- ============================================================================
-- Notes
-- ============================================================================

-- Weighted Ranking System:
-- Rank 1 = 100% visibility
-- Rank 2-3 = 50% visibility
-- Rank 4-5 = 25% visibility
-- Rank 6+ = 10% visibility

-- Brand Consolidation Examples:
-- "Sage University Indore" + "Sage University Bhopal" → canonical: "Sage University"
-- "Harvard Business School" + "Harvard Medical School" → canonical: "Harvard University"
-- "IIT Delhi" + "IIT Bombay" → canonical: "Indian Institute of Technology (IIT)"

-- Location Format Examples:
-- "Indore, Madhya Pradesh, India"
-- "Boston, Massachusetts, USA"
-- "London, England, United Kingdom"
