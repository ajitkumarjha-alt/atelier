-- Migration: Add flat loads and building breakdowns columns
-- Created: 2026-02-09
-- Description: Add columns for residential flat loads and per-building breakdowns

ALTER TABLE electrical_load_calculations 
ADD COLUMN IF NOT EXISTS flat_loads JSONB,
ADD COLUMN IF NOT EXISTS building_breakdowns JSONB;

COMMENT ON COLUMN electrical_load_calculations.flat_loads IS 'Residential flat electrical loads breakdown';
COMMENT ON COLUMN electrical_load_calculations.building_breakdowns IS 'Per-building load breakdowns including CA and flat loads';
