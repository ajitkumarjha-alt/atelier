-- Migration: Add Regulatory Compliance Columns to Electrical Load Calculations
-- Created: 2026-02-09
-- Description: Adds MSEDCL regulatory framework compliance tracking columns

-- Add regulatory framework columns
ALTER TABLE electrical_load_calculations
ADD COLUMN IF NOT EXISTS framework_ids INTEGER[],
ADD COLUMN IF NOT EXISTS area_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS total_carpet_area DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS sanctioned_load_kw DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS sanctioned_load_kva DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS msedcl_minimum_kw DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS load_method_applied VARCHAR(100),
ADD COLUMN IF NOT EXISTS load_after_df_kw DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS load_after_df_kva DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS dtc_needed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dtc_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS dtc_capacity_kva INTEGER,
ADD COLUMN IF NOT EXISTS dtc_count INTEGER,
ADD COLUMN IF NOT EXISTS dtc_land_sqm DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS substation_needed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS substation_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS substation_land_sqm DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS exceeds_single_consumer_limit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS exceeds_cumulative_limit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS validation_warnings TEXT[],
ADD COLUMN IF NOT EXISTS calculation_metadata JSONB;

-- Add indexes for regulatory queries
CREATE INDEX IF NOT EXISTS idx_elec_calc_framework ON electrical_load_calculations USING GIN(framework_ids);
CREATE INDEX IF NOT EXISTS idx_elec_calc_area_type ON electrical_load_calculations(area_type);
CREATE INDEX IF NOT EXISTS idx_elec_calc_dtc_needed ON electrical_load_calculations(dtc_needed);
CREATE INDEX IF NOT EXISTS idx_elec_calc_substation_needed ON electrical_load_calculations(substation_needed);

-- Add comments
COMMENT ON COLUMN electrical_load_calculations.framework_ids IS 'Array of regulatory framework IDs applied to this calculation';
COMMENT ON COLUMN electrical_load_calculations.area_type IS 'MSEDCL area type: RURAL, URBAN, METRO, MAJOR_CITIES';
COMMENT ON COLUMN electrical_load_calculations.sanctioned_load_kw IS 'Total Connected Load (for billing)';
COMMENT ON COLUMN electrical_load_calculations.sanctioned_load_kva IS 'Sanctioned Load in kVA at 0.8 PF (for billing)';
COMMENT ON COLUMN electrical_load_calculations.load_after_df_kw IS 'Load After Diversity Factor (for DTC sizing)';
COMMENT ON COLUMN electrical_load_calculations.load_after_df_kva IS 'Load After DF in kVA at 0.9 PF (for DTC sizing)';
COMMENT ON COLUMN electrical_load_calculations.calculation_metadata IS 'Full regulatory compliance object with all details';
