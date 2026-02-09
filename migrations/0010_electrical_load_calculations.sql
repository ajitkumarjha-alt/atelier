-- Migration: Electrical Load Calculations
-- Created: 2026-02-06
-- Description: Tables for electrical load calculation feature

-- Main calculation table
CREATE TABLE IF NOT EXISTS electrical_load_calculations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    calculation_name VARCHAR(500) NOT NULL,
    
    -- Input Configuration
    selected_buildings JSONB NOT NULL, -- Array of building IDs
    input_parameters JSONB NOT NULL,   -- All ~100 input values
    
    -- Calculation Results
    building_ca_loads JSONB NOT NULL,  -- Building common area loads breakdown
    society_ca_loads JSONB NOT NULL,   -- Society-level loads breakdown
    total_loads JSONB NOT NULL,        -- Aggregated totals
    
    -- Summary Values (for quick queries)
    total_connected_load_kw DECIMAL(12, 2),
    maximum_demand_kw DECIMAL(12, 2),
    essential_demand_kw DECIMAL(12, 2),
    fire_demand_kw DECIMAL(12, 2),
    transformer_size_kva INTEGER,
    
    -- Metadata
    status VARCHAR(50) DEFAULT 'Draft',
    calculated_by VARCHAR(255) NOT NULL,
    verified_by VARCHAR(255),
    remarks TEXT,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_elec_calc_project ON electrical_load_calculations(project_id);
CREATE INDEX IF NOT EXISTS idx_elec_calc_status ON electrical_load_calculations(status);
CREATE INDEX IF NOT EXISTS idx_elec_calc_created_at ON electrical_load_calculations(created_at DESC);

-- Lookup tables for equipment sizing (VLOOKUP equivalents)
CREATE TABLE IF NOT EXISTS electrical_load_lookup_tables (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- 'lift_power', 'pump_power', 'ac_sizing', etc.
    lookup_key VARCHAR(100) NOT NULL,   -- e.g. 'building_height', 'flow_lpm'
    lookup_value VARCHAR(100) NOT NULL, -- e.g. '90', '300'
    result_value DECIMAL(10, 2) NOT NULL, -- e.g. 15.0, 2.2
    unit VARCHAR(50),                     -- 'kW', 'TR', etc.
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, lookup_key, lookup_value)
);

CREATE INDEX IF NOT EXISTS idx_elec_lookup_category ON electrical_load_lookup_tables(category);

-- Comments for documentation
COMMENT ON TABLE electrical_load_calculations IS 'Stores electrical load calculations for MSEDCL submissions';
COMMENT ON TABLE electrical_load_lookup_tables IS 'Equipment sizing lookup tables from Excel Data sheet';
