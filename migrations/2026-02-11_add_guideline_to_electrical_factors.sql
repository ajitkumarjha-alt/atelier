-- Add guideline field to electrical_load_factors table
-- This allows L0 users to define different standards (MSEDCL, NBC, EcoNiwas, etc.)

ALTER TABLE electrical_load_factors 
ADD COLUMN IF NOT EXISTS guideline VARCHAR(100) DEFAULT 'MSEDCL 2016';

-- Update existing records to have MSEDCL guideline
UPDATE electrical_load_factors 
SET guideline = 'MSEDCL 2016'
WHERE guideline IS NULL;

-- Add index for guideline filtering
CREATE INDEX IF NOT EXISTS idx_electrical_load_factors_guideline 
ON electrical_load_factors(guideline);

-- Create a view for easier querying by guideline
CREATE OR REPLACE VIEW v_electrical_load_factors_by_guideline AS
SELECT 
  id,
  category,
  sub_category,
  description,
  watt_per_sqm,
  mdf as diversity_mdf,
  edf as diversity_edf,
  fdf as diversity_fdf,
  guideline,
  notes,
  is_active,
  updated_by,
  created_at,
  updated_at
FROM electrical_load_factors
WHERE is_active = TRUE
ORDER BY guideline, category, sub_category, description;

COMMENT ON COLUMN electrical_load_factors.guideline IS 'Reference guideline (MSEDCL 2016, NBC 2016, EcoNiwas Samhita, etc.)';
COMMENT ON VIEW v_electrical_load_factors_by_guideline IS 'Electrical load factors grouped by guideline for easy selection';
