-- Create site_areas table for managing landscape and external infrastructure
-- This table stores all non-building areas that require MEP services

CREATE TABLE IF NOT EXISTS site_areas (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    area_type VARCHAR(100) NOT NULL, -- 'landscape', 'amenity', 'parking', 'infrastructure', 'other'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    area_sqm DECIMAL(10, 2), -- Area in square meters
    water_volume_cum DECIMAL(10, 2), -- Water volume in cubic meters
    softscape_area_sqm DECIMAL(10, 2), -- Green/soft landscape area
    
    -- MEP Requirements
    requires_water BOOLEAN DEFAULT FALSE,
    water_connection_points INTEGER DEFAULT 0,
    estimated_water_demand DECIMAL(10, 2), -- Liters per day
    
    requires_electrical BOOLEAN DEFAULT FALSE,
    electrical_load_kw DECIMAL(10, 2),
    lighting_points INTEGER DEFAULT 0,
    power_points INTEGER DEFAULT 0,
    has_ev_charging BOOLEAN DEFAULT FALSE,
    ev_charging_points INTEGER DEFAULT 0,
    
    requires_drainage BOOLEAN DEFAULT FALSE,
    drainage_type VARCHAR(50), -- 'sewage', 'storm', 'both'
    
    requires_hvac BOOLEAN DEFAULT FALSE,
    hvac_capacity_tr DECIMAL(10, 2), -- Tonnage of refrigeration
    
    requires_fire_fighting BOOLEAN DEFAULT FALSE,
    fire_hydrant_points INTEGER DEFAULT 0,
    sprinkler_required BOOLEAN DEFAULT FALSE,
    
    -- Specific attributes for different area types
    -- Landscape specific
    irrigation_type VARCHAR(50), -- 'drip', 'sprinkler', 'manual'
    landscape_category VARCHAR(50), -- 'soft_landscape', 'hard_landscape', 'mixed'
    
    -- Amenity specific
    amenity_type VARCHAR(100), -- 'swimming_pool', 'gym', 'clubhouse', 'sports_court', etc.
    capacity_persons INTEGER,
    operational_hours VARCHAR(50),
    
    -- Parking specific
    parking_type VARCHAR(50), -- 'basement', 'stilt', 'surface', 'mlcp'
    car_spaces INTEGER DEFAULT 0,
    bike_spaces INTEGER DEFAULT 0,
    
    -- Infrastructure specific
    infrastructure_type VARCHAR(100), -- 'pump_room', 'electrical_substation', 'stp', 'wtp', 'transformer', etc.
    equipment_details TEXT,
    capacity_rating VARCHAR(100),
    
    -- Common fields
    location_description TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_site_areas_project_id ON site_areas(project_id);
CREATE INDEX IF NOT EXISTS idx_site_areas_area_type ON site_areas(area_type);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_site_areas_updated_at ON site_areas;
CREATE TRIGGER update_site_areas_updated_at
    BEFORE UPDATE ON site_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some helpful comments
COMMENT ON TABLE site_areas IS 'Stores landscape, amenities, parking, and external infrastructure areas requiring MEP services';
COMMENT ON COLUMN site_areas.area_type IS 'Type: landscape, amenity, parking, infrastructure, other';
COMMENT ON COLUMN site_areas.estimated_water_demand IS 'Daily water demand in liters';
COMMENT ON COLUMN site_areas.electrical_load_kw IS 'Electrical load in kilowatts';
COMMENT ON COLUMN site_areas.hvac_capacity_tr IS 'HVAC capacity in tonnage of refrigeration';
