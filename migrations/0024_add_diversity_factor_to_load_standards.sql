-- Migration: Add diversity_factor to regulation_load_standards

ALTER TABLE regulation_load_standards ADD COLUMN IF NOT EXISTS diversity_factor DECIMAL(10,2);

-- Update MSEDCL values
UPDATE regulation_load_standards
SET diversity_factor = CASE
  WHEN premise_type = 'RESIDENTIAL' AND area_measurement_type = 'CARPET_AREA' AND framework_id IN (
    SELECT id FROM electrical_regulation_frameworks WHERE framework_code = 'MSEDCL_2016'
  ) THEN 2
  WHEN premise_type = 'COMMERCIAL_AC' AND area_measurement_type = 'CARPET_AREA' AND framework_id IN (
    SELECT id FROM electrical_regulation_frameworks WHERE framework_code = 'MSEDCL_2016'
  ) THEN 2
  WHEN premise_type = 'COMMERCIAL_NO_AC' AND area_measurement_type = 'CARPET_AREA' AND framework_id IN (
    SELECT id FROM electrical_regulation_frameworks WHERE framework_code = 'MSEDCL_2016'
  ) THEN 2
  ELSE diversity_factor
END
WHERE framework_id IN (
  SELECT id FROM electrical_regulation_frameworks WHERE framework_code = 'MSEDCL_2016'
);

-- For other than Metro/Major Cities, set to 2.5 (if area_type_code is not METRO or MAJOR_CITIES)
UPDATE regulation_load_standards
SET diversity_factor = 2.5
WHERE framework_id IN (
  SELECT id FROM electrical_regulation_frameworks WHERE framework_code = 'MSEDCL_2016'
)
AND (premise_type = 'RESIDENTIAL' OR premise_type = 'COMMERCIAL_AC' OR premise_type = 'COMMERCIAL_NO_AC')
AND area_measurement_type = 'CARPET_AREA'
AND diversity_factor IS NULL;
