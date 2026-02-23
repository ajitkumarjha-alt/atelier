-- Migration: MEP Calculation Tables
-- Created: 2026-02-20
-- Description: Tables for all MEP calculation modules (HVAC, Fire, Cable, Lighting, etc.)
-- Pattern: Follow electrical_load_calculations with simplified JSONB storage

-- ============================================================================
-- Generic MEP Calculations Table (shared by all new calculator types)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mep_calculations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    calculation_type VARCHAR(100) NOT NULL,  -- 'hvac_load', 'fire_pump', 'cable_selection', etc.
    calculation_name VARCHAR(500) NOT NULL,
    
    -- Input/Output (JSONB for flexibility across all calculator types)
    input_parameters JSONB NOT NULL,         -- All user inputs
    results JSONB NOT NULL,                  -- Full calculation results
    
    -- Optional references
    selected_buildings JSONB,                -- Array of building IDs if applicable
    building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
    
    -- Summary values for quick queries/dashboard
    summary JSONB,                           -- Key result values (kW, kVA, m³, etc.)
    
    -- Metadata
    status VARCHAR(50) DEFAULT 'Draft',       -- Draft, Calculated, Verified, Approved
    calculated_by VARCHAR(255) NOT NULL,
    verified_by VARCHAR(255),
    approved_by VARCHAR(255),
    remarks TEXT,
    version INTEGER DEFAULT 1,
    
    -- Audit
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mep_calc_project ON mep_calculations(project_id);
CREATE INDEX IF NOT EXISTS idx_mep_calc_type ON mep_calculations(calculation_type);
CREATE INDEX IF NOT EXISTS idx_mep_calc_project_type ON mep_calculations(project_id, calculation_type);
CREATE INDEX IF NOT EXISTS idx_mep_calc_status ON mep_calculations(status);
CREATE INDEX IF NOT EXISTS idx_mep_calc_created_at ON mep_calculations(created_at DESC);

-- Comments
COMMENT ON TABLE mep_calculations IS 'Unified table for all MEP calculation modules';
COMMENT ON COLUMN mep_calculations.calculation_type IS 'Calculator type: hvac_load, fire_pump, cable_selection, lighting_design, earthing_lightning, phe_pump, plumbing_fixture, ventilation, duct_sizing, panel_schedule, rising_main, fire_fighting, water_demand';
COMMENT ON COLUMN mep_calculations.input_parameters IS 'All user inputs specific to the calculator type';
COMMENT ON COLUMN mep_calculations.results IS 'Full calculation output JSON from the service';
COMMENT ON COLUMN mep_calculations.summary IS 'Key metrics for dashboard display (e.g., totalKW, pumpHP, cableSize)';
