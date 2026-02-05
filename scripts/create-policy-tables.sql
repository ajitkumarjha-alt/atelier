-- Policy Management System Schema
-- This schema enables dynamic policy management with version control

-- 1. Policy Versions Table (Master table for policy documents)
CREATE TABLE IF NOT EXISTS policy_versions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,           -- e.g., "MEP-21 Water Policy Rev 4"
  policy_number VARCHAR(50),             -- e.g., "MEP-21"
  revision_number VARCHAR(20),           -- e.g., "4"
  effective_date DATE NOT NULL,
  document_url TEXT,                     -- Stored policy PDF/document
  status VARCHAR(50) DEFAULT 'draft',    -- draft, active, archived
  is_default BOOLEAN DEFAULT false,      -- Default policy for new calculations
  description TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  archived_at TIMESTAMP,
  metadata JSONB                         -- Additional metadata
);

CREATE INDEX IF NOT EXISTS idx_policy_status ON policy_versions(status);
CREATE INDEX IF NOT EXISTS idx_policy_default ON policy_versions(is_default) WHERE is_default = true;

-- 2. Water Consumption Rates (replaces hardcoded WATER_RATES)
CREATE TABLE IF NOT EXISTS water_consumption_rates (
  id SERIAL PRIMARY KEY,
  policy_version_id INTEGER NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  project_type VARCHAR(100) NOT NULL,    -- residential, office, retail, multiplex, school
  sub_type VARCHAR(100),                 -- luxury, hiEnd, aspirational, casa, excelus, etc.
  usage_category VARCHAR(100) NOT NULL,  -- drinking, flushValves, flushTanks, flushing, perSeat, etc.
  rate_value DECIMAL(10,2) NOT NULL,     -- liters per occupant per day
  unit VARCHAR(50) DEFAULT 'L/occupant/day',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(policy_version_id, project_type, sub_type, usage_category)
);

CREATE INDEX IF NOT EXISTS idx_water_rates_policy ON water_consumption_rates(policy_version_id);
CREATE INDEX IF NOT EXISTS idx_water_rates_type ON water_consumption_rates(project_type, sub_type);

-- 3. Occupancy Factors (replaces hardcoded OCCUPANCY_FACTORS)
CREATE TABLE IF NOT EXISTS occupancy_factors (
  id SERIAL PRIMARY KEY,
  policy_version_id INTEGER NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  project_type VARCHAR(100) NOT NULL,    -- residential, office, retail
  sub_type VARCHAR(100),                 -- luxury, excelus, boulevard, etc.
  unit_type VARCHAR(100),                -- 1BHK, 2BHK, 3BHK, etc. (NULL for sqm-based)
  factor_value DECIMAL(10,4) NOT NULL,   -- occupants per unit OR sqm per occupant
  factor_type VARCHAR(50) NOT NULL,      -- 'occupants_per_unit', 'sqm_per_person', 'visitor_sqm', 'peak_factor'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(policy_version_id, project_type, sub_type, unit_type, factor_type)
);

CREATE INDEX IF NOT EXISTS idx_occupancy_policy ON occupancy_factors(policy_version_id);
CREATE INDEX IF NOT EXISTS idx_occupancy_type ON occupancy_factors(project_type, sub_type);

-- 4. Calculation Parameters (evaporation rates, buffer percentages, etc.)
CREATE TABLE IF NOT EXISTS calculation_parameters (
  id SERIAL PRIMARY KEY,
  policy_version_id INTEGER NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  parameter_name VARCHAR(255) NOT NULL,  -- 'pool_evaporation_rate', 'landscape_water_rate', etc.
  parameter_value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(50),                      -- 'L/sqm/day', 'percentage', 'L/hr/TR', etc.
  category VARCHAR(100),                 -- 'water', 'cooling', 'storage', etc.
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(policy_version_id, parameter_name)
);

CREATE INDEX IF NOT EXISTS idx_calc_params_policy ON calculation_parameters(policy_version_id);

-- 5. Policy Change Log (audit trail)
CREATE TABLE IF NOT EXISTS policy_change_log (
  id SERIAL PRIMARY KEY,
  policy_version_id INTEGER REFERENCES policy_versions(id) ON DELETE CASCADE,
  table_name VARCHAR(100),               -- which table was changed
  record_id INTEGER,                     -- ID of the changed record
  action VARCHAR(50),                    -- insert, update, delete, activate, archive
  old_values JSONB,                      -- Previous values
  new_values JSONB,                      -- New values
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_change_log_policy ON policy_change_log(policy_version_id);
CREATE INDEX IF NOT EXISTS idx_change_log_date ON policy_change_log(changed_at);

-- 6. AI Extraction Sessions (track AI policy extraction attempts)
CREATE TABLE IF NOT EXISTS ai_extraction_sessions (
  id SERIAL PRIMARY KEY,
  policy_version_id INTEGER REFERENCES policy_versions(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  extraction_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  extracted_data JSONB,                  -- Raw extracted data from AI
  confidence_scores JSONB,               -- Confidence scores for extracted values
  user_corrections JSONB,                -- User-made corrections
  processed_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_extraction_status ON ai_extraction_sessions(extraction_status);

-- Add policy_version_id to existing calculation tables
ALTER TABLE water_demand_calculations 
ADD COLUMN IF NOT EXISTS policy_version_id INTEGER REFERENCES policy_versions(id);

ALTER TABLE design_calculations 
ADD COLUMN IF NOT EXISTS policy_version_id INTEGER REFERENCES policy_versions(id);

CREATE INDEX IF NOT EXISTS idx_water_demand_policy ON water_demand_calculations(policy_version_id);
CREATE INDEX IF NOT EXISTS idx_design_calc_policy ON design_calculations(policy_version_id);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER water_rates_updated_at BEFORE UPDATE ON water_consumption_rates
  FOR EACH ROW EXECUTE FUNCTION update_policy_updated_at();

CREATE TRIGGER occupancy_updated_at BEFORE UPDATE ON occupancy_factors
  FOR EACH ROW EXECUTE FUNCTION update_policy_updated_at();

CREATE TRIGGER calc_params_updated_at BEFORE UPDATE ON calculation_parameters
  FOR EACH ROW EXECUTE FUNCTION update_policy_updated_at();

-- Comments for documentation
COMMENT ON TABLE policy_versions IS 'Master table for policy document versions with approval workflow';
COMMENT ON TABLE water_consumption_rates IS 'Water consumption rates by project type and usage category';
COMMENT ON TABLE occupancy_factors IS 'Occupancy calculation factors for different building types';
COMMENT ON TABLE calculation_parameters IS 'Miscellaneous calculation parameters (evaporation, buffers, etc.)';
COMMENT ON TABLE policy_change_log IS 'Audit trail for all policy-related changes';
COMMENT ON TABLE ai_extraction_sessions IS 'Tracking AI-powered policy document extraction';
