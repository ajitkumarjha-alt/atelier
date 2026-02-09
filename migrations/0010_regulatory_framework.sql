-- Migration: Regulatory Framework System for Electrical Load Calculations
-- Allows multiple utility regulations to be stored and selected for calculations
-- Supports document-driven configuration where regulations can be added without code changes

-- ============================================================================
-- 1. CORE REGULATION REGISTRY
-- ============================================================================
CREATE TABLE electrical_regulation_frameworks (
  id SERIAL PRIMARY KEY,
  framework_code VARCHAR(50) UNIQUE NOT NULL,
  framework_name VARCHAR(200) NOT NULL,
  issuing_authority VARCHAR(200),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  circular_number VARCHAR(100),
  issue_date DATE,
  effective_date DATE,
  superseded_date DATE,
  document_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ,
  updated_by VARCHAR(255),
  notes TEXT
);

CREATE INDEX idx_regulation_frameworks_active ON electrical_regulation_frameworks(is_active);
CREATE INDEX idx_regulation_frameworks_default ON electrical_regulation_frameworks(is_default);

-- ============================================================================
-- 2. AREA TYPE DEFINITIONS
-- ============================================================================
CREATE TABLE regulation_area_types (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  area_type_code VARCHAR(50) NOT NULL,
  area_type_name VARCHAR(100) NOT NULL,
  description TEXT,
  specific_locations TEXT[],
  is_active BOOLEAN DEFAULT true,
  UNIQUE(framework_id, area_type_code)
);

CREATE INDEX idx_regulation_area_types_framework ON regulation_area_types(framework_id);

-- ============================================================================
-- 3. LOAD CALCULATION STANDARDS
-- ============================================================================
CREATE TABLE regulation_load_standards (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  premise_type VARCHAR(100) NOT NULL,
  area_measurement_type VARCHAR(50),
  minimum_load_w_per_sqm DECIMAL(10, 2),
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_load_standards_framework ON regulation_load_standards(framework_id);

-- ============================================================================
-- 4. DTC (DISTRIBUTION TRANSFORMER CENTRE) THRESHOLDS
-- ============================================================================
CREATE TABLE regulation_dtc_thresholds (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  area_type_code VARCHAR(50) NOT NULL,
  threshold_kva DECIMAL(10, 2) NOT NULL,
  action_required TEXT,
  distance_from_lt_pole_m INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_dtc_thresholds_framework ON regulation_dtc_thresholds(framework_id);

-- ============================================================================
-- 5. SANCTIONED LOAD LIMITS
-- ============================================================================
CREATE TABLE regulation_sanctioned_load_limits (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  limit_type VARCHAR(100) NOT NULL,
  voltage_system VARCHAR(100),
  max_load_kw DECIMAL(10, 2),
  max_load_kva DECIMAL(10, 2),
  exclusions TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_sanctioned_limits_framework ON regulation_sanctioned_load_limits(framework_id);

-- ============================================================================
-- 6. POWER FACTOR STANDARDS
-- ============================================================================
CREATE TABLE regulation_power_factors (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  load_type VARCHAR(100) NOT NULL,
  power_factor DECIMAL(5, 3) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_power_factors_framework ON regulation_power_factors(framework_id);

-- ============================================================================
-- 7. SUBSTATION REQUIREMENTS
-- ============================================================================
CREATE TABLE regulation_substation_requirements (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  area_type_code VARCHAR(50),
  min_load_after_df_mva DECIMAL(10, 2),
  max_load_after_df_mva DECIMAL(10, 2),
  substation_type VARCHAR(100),
  incoming_feeders_count INTEGER,
  feeder_capacity_mva DECIMAL(10, 2),
  special_requirements TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_substation_reqs_framework ON regulation_substation_requirements(framework_id);

-- ============================================================================
-- 8. LAND REQUIREMENTS
-- ============================================================================
CREATE TABLE regulation_land_requirements (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  infrastructure_type VARCHAR(100) NOT NULL,
  area_type_code VARCHAR(50),
  land_required_sqm DECIMAL(10, 2),
  additional_land_per_unit_sqm DECIMAL(10, 2),
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_land_reqs_framework ON regulation_land_requirements(framework_id);

-- ============================================================================
-- 9. LEASE TERMS
-- ============================================================================
CREATE TABLE regulation_lease_terms (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  lease_duration_years INTEGER,
  annual_rent_amount DECIMAL(10, 2),
  total_upfront_payment DECIMAL(10, 2),
  encumbrance_free_required BOOLEAN DEFAULT true,
  registration_required BOOLEAN DEFAULT true,
  surrender_notice_months INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_lease_terms_framework ON regulation_lease_terms(framework_id);

-- ============================================================================
-- 10. INFRASTRUCTURE SPECIFICATIONS
-- ============================================================================
CREATE TABLE regulation_infrastructure_specs (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  infrastructure_type VARCHAR(100) NOT NULL,
  area_type_code VARCHAR(50),
  specification TEXT NOT NULL,
  mandatory BOOLEAN DEFAULT false,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_infra_specs_framework ON regulation_infrastructure_specs(framework_id);

-- ============================================================================
-- 11. DEFINITIONS/GLOSSARY
-- ============================================================================
CREATE TABLE regulation_definitions (
  id SERIAL PRIMARY KEY,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  term VARCHAR(200) NOT NULL,
  definition TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_regulation_definitions_framework ON regulation_definitions(framework_id);

-- ============================================================================
-- 12. PROJECT REGULATION SELECTION
-- ============================================================================
CREATE TABLE project_regulation_selection (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  framework_id INTEGER REFERENCES electrical_regulation_frameworks(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  selected_by VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(project_id, framework_id)
);

CREATE INDEX idx_project_regulation_project ON project_regulation_selection(project_id);
CREATE INDEX idx_project_regulation_framework ON project_regulation_selection(framework_id);

-- ============================================================================
-- 13. UPDATE EXISTING TABLES TO SUPPORT REGULATIONS
-- ============================================================================

-- Add carpet area and area type to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS area_type VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_carpet_area DECIMAL(10, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS framework_id INTEGER REFERENCES electrical_regulation_frameworks(id);

-- Add carpet area to buildings
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS total_carpet_area DECIMAL(10, 2);

-- Add carpet area to flats
ALTER TABLE flats ADD COLUMN IF NOT EXISTS carpet_area DECIMAL(10, 2);

-- Add regulation tracking to electrical_load_calculations
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS framework_ids INTEGER[];
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS area_type VARCHAR(50);
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS total_carpet_area DECIMAL(10, 2);

-- Sanctioned Load (without Diversity Factor)
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS sanctioned_load_kw DECIMAL(10, 2);
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS sanctioned_load_kva DECIMAL(10, 2);
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS msedcl_minimum_kw DECIMAL(10, 2);
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS load_method_applied VARCHAR(50);

-- Load After DF (with Diversity Factor - for DTC sizing only)
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS load_after_df_kw DECIMAL(10, 2);
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS load_after_df_kva DECIMAL(10, 2);

-- DTC Requirements
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS dtc_needed BOOLEAN;
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS dtc_type VARCHAR(50);
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS dtc_capacity_kva INTEGER;
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS dtc_count INTEGER;
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS dtc_land_sqm DECIMAL(10, 2);

-- Substation Requirements
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS substation_needed BOOLEAN;
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS substation_type VARCHAR(100);
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS substation_land_sqm DECIMAL(10, 2);

-- Validations
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS exceeds_single_consumer_limit BOOLEAN;
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS exceeds_cumulative_limit BOOLEAN;
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS validation_warnings TEXT[];
ALTER TABLE electrical_load_calculations ADD COLUMN IF NOT EXISTS calculation_metadata JSONB;

-- ============================================================================
-- 14. INSERT MSEDCL 2016 REGULATORY FRAMEWORK
-- ============================================================================

-- Framework Registry
INSERT INTO electrical_regulation_frameworks (
  framework_code, framework_name, issuing_authority, state, country,
  circular_number, issue_date, effective_date, is_active, is_default, created_by, notes
) VALUES (
  'MSEDCL_2016',
  'MSEDCL Infrastructure Development Guidelines 2016',
  'Maharashtra State Electricity Distribution Co. Ltd.',
  'Maharashtra',
  'India',
  'Infrastructure development for release of new connections/Enhancement of Load-Guidelines thereof',
  '2016-01-01',
  '2016-01-01',
  true,
  true,
  'system',
  'Official MSEDCL circular for electrical load calculation and infrastructure development'
);

-- Get the framework ID for subsequent inserts
DO $$
DECLARE
  msedcl_framework_id INTEGER;
BEGIN
  SELECT id INTO msedcl_framework_id FROM electrical_regulation_frameworks WHERE framework_code = 'MSEDCL_2016';

  -- ============================================================================
  -- AREA TYPES
  -- ============================================================================
  INSERT INTO regulation_area_types (framework_id, area_type_code, area_type_name, description, specific_locations, is_active) VALUES
    (msedcl_framework_id, 'RURAL', 'Rural Area', 'Areas outside Urban and Metropolitan regions', NULL, true),
    (msedcl_framework_id, 'URBAN', 'Urban Area', 'Urban areas excluding Metropolitan and Major Cities', NULL, true),
    (msedcl_framework_id, 'METRO', 'Metropolitan Area', 'Metropolitan regions as defined by MSEDCL', 
     ARRAY['Greater Mumbai', 'Bhiwandi', 'Kalyan-Dombivli', 'Mira-Bhayandar', 'Navi Mumbai', 'Panvel', 'Thane', 'Ulhasnagar', 'Vasai-Virar', 'Pune', 'Pimpri-Chinchwad'], true),
    (msedcl_framework_id, 'MAJOR_CITIES', 'Major Cities', 'Major Cities in Maharashtra',
     ARRAY['Nashik', 'Chh. Sambhaji Nagar', 'Nagpur'], true);

  -- ============================================================================
  -- LOAD CALCULATION STANDARDS (Page 6 of circular)
  -- ============================================================================
  INSERT INTO regulation_load_standards (framework_id, premise_type, area_measurement_type, minimum_load_w_per_sqm, description, notes, is_active) VALUES
    (msedcl_framework_id, 'RESIDENTIAL', 'CARPET_AREA', 75.00, 
     'Residential premises', 'Minimum 75 W/Sq.m carpet area as per MSEDCL Section C.1', true),
    (msedcl_framework_id, 'COMMERCIAL_AC', 'CARPET_AREA', 200.00,
     'Commercial with air-conditioning', 'Minimum 200 W/Sq.m carpet area', true),
    (msedcl_framework_id, 'COMMERCIAL_NO_AC', 'CARPET_AREA', 150.00,
     'All other commercial establishments', 'Minimum 150 W/Sq.m carpet area', true),
    (msedcl_framework_id, 'EV_CHARGING', 'ACTUAL', NULL,
     'For all other categories including EV Charging', 'Load as mentioned in A1 form (actual)', true);

  -- ============================================================================
  -- DTC THRESHOLDS (Page 9 of circular)
  -- ============================================================================
  INSERT INTO regulation_dtc_thresholds (framework_id, area_type_code, threshold_kva, action_required, distance_from_lt_pole_m, description, is_active) VALUES
    (msedcl_framework_id, 'RURAL', 25.00, 
     'New DTC required if load (after DF) exceeds threshold', 350,
     'Rural areas: 350m from existing LT pole/Feeder Pillar, 25 kVA threshold', true),
    (msedcl_framework_id, 'URBAN', 75.00,
     'New DTC required if load (after DF) exceeds threshold', 350,
     'Urban areas: 350m from existing LT pole/Feeder Pillar, 75 kVA threshold', true),
    (msedcl_framework_id, 'METRO', 250.00,
     'New DTC required if load (after DF) exceeds threshold', 200,
     'Metro and 350m for Rural area from existing LT pole/Feeder Pillar, 250 kVA threshold', true),
    (msedcl_framework_id, 'MAJOR_CITIES', 250.00,
     'New DTC required if load (after DF) exceeds threshold', 200,
     'Major Cities: 200m from existing LT pole/Feeder Pillar, 250 kVA threshold', true);

  -- ============================================================================
  -- SANCTIONED LOAD LIMITS (Page 9 of circular)
  -- ============================================================================
  INSERT INTO regulation_sanctioned_load_limits (framework_id, limit_type, voltage_system, max_load_kw, max_load_kva, exclusions, description, is_active) VALUES
    (msedcl_framework_id, 'SINGLE_CONSUMER', 
     'Four/Three wires, 3-phase, 230/240V phase-neutral or 400/415V phase-phase',
     160.00, 200.00, ARRAY['AG'],
     'Sanctioned Load/Contract Demand should not exceed 160 kW / 200 kVA for single consumer. Load (After DF) is only for deciding DTC capacity and should not be considered for issuing quotation.', true),
    (msedcl_framework_id, 'MULTIPLE_CONSUMERS_CUMULATIVE',
     'Four/Three wires, 3-phase, 230/240V phase-neutral or 400/415V phase-phase',
     480.00, 600.00, ARRAY['AG'],
     'Multiple consumers in same building/premises: cumulative Sanctioned Load/Contract Demand limit 480 kW / 600 kVA', true);

  -- ============================================================================
  -- POWER FACTOR STANDARDS
  -- ============================================================================
  INSERT INTO regulation_power_factors (framework_id, load_type, power_factor, description, is_active) VALUES
    (msedcl_framework_id, 'SANCTIONED_LOAD', 0.800,
     'Power factor for calculating sanctioned load/contract demand in kVA from kW', true),
    (msedcl_framework_id, 'LOAD_AFTER_DF', 0.900,
     'Power factor for calculating load after diversity factor (for DTC sizing)', true),
    (msedcl_framework_id, 'TRANSFORMER_SIZING', 0.900,
     'Power factor for transformer sizing calculations', true);

  -- ============================================================================
  -- SUBSTATION REQUIREMENTS (Pages 10-11 of circular)
  -- ============================================================================
  INSERT INTO regulation_substation_requirements (framework_id, area_type_code, min_load_after_df_mva, max_load_after_df_mva, 
    substation_type, incoming_feeders_count, feeder_capacity_mva, special_requirements, description, is_active) VALUES
    (msedcl_framework_id, 'METRO', 3.5, 20.0,
     '33/11 kV or 22/11 kV Substation', 2, 20.0,
     ARRAY['Ring Main System created for redundancy and quick diversion', 
           'Individual transformers for each building in metropolitan and major city areas',
           'LT Ring main network mandatory'],
     'Metropolitan and Major Cities: 33/11 or 22/11 kV substation if load > 3.5 MVA (up to 20 MVA)', true),
    (msedcl_framework_id, 'MAJOR_CITIES', 3.5, 20.0,
     '33/11 kV or 22/11 kV Substation', 2, 20.0,
     ARRAY['Ring Main System created for redundancy and quick diversion',
           'Individual transformers for each building in metropolitan and major city areas',
           'LT Ring main network mandatory'],
     'Major Cities: 33/11 or 22/11 kV substation if load > 3.5 MVA (up to 20 MVA)', true),
    (msedcl_framework_id, 'URBAN', 3.0, 20.0,
     '33/11 kV or 22/11 kV Substation', 2, 20.0,
     ARRAY['Ring Main System created for redundancy'],
     'Other areas: 33/11 or 22/11 kV substation if load > 3 MVA (up to 20 MVA)', true),
    (msedcl_framework_id, 'RURAL', 3.0, 20.0,
     '33/11 kV or 22/11 kV Substation', 2, 20.0,
     ARRAY['Ring Main System created for redundancy'],
     'Rural areas: 33/11 or 22/11 kV substation if load > 3 MVA (up to 20 MVA)', true),
    (msedcl_framework_id, 'ALL', 20.0, NULL,
     'EHV Substation', 2, NULL,
     ARRAY['Coordination with MSETCL required', 'As per MSETCL norms'],
     'If load > 20 MVA, EHV substation of appropriate capacity required with MSETCL coordination', true);

  -- ============================================================================
  -- LAND REQUIREMENTS (Page 11 of circular)
  -- ============================================================================
  INSERT INTO regulation_land_requirements (framework_id, infrastructure_type, area_type_code, land_required_sqm, 
    additional_land_per_unit_sqm, description, notes, is_active) VALUES
    (msedcl_framework_id, 'DTC_INDOOR', NULL, 30.00, 15.00,
     'Distribution transformer centre (Indoor) - 1 No', 
     '15 sq.m land to be added for each additional transformer in case new transformer is required', true),
    (msedcl_framework_id, 'DTC_OUTDOOR', NULL, 25.00, 15.00,
     'Distribution transformer centre (Outdoor) - 1 No',
     '15 sq.m land to be added for each additional transformer', true),
    (msedcl_framework_id, 'DTC_COMPACT', NULL, 15.00, 15.00,
     'Distribution transformer centre (Compact)',
     '15 sq.m land to be added for each additional transformer', true),
    (msedcl_framework_id, 'SUBSTATION_33/11_OUTDOOR', NULL, 3500.00, NULL,
     '33/11 or 22/11 kV Outdoor Substation', NULL, true),
    (msedcl_framework_id, 'SUBSTATION_33/11_HYBRID', NULL, 2500.00, NULL,
     '33/11 or 22/11 kV (22 or 33 kV input) Indoor/Outdoor Hybrid Substation', NULL, true),
    (msedcl_framework_id, 'SWITCHING_STATION_22KV_OUTDOOR', NULL, 2500.00, NULL,
     '22 kV Outdoor Switching station', NULL, true),
    (msedcl_framework_id, 'SUBSTATION_INDOOR_10MVA', 'METRO', 1000.00, NULL,
     '33/11 or 22/11 kV Indoor Substation (2 x 10 MVA) for Metropolitan and Major cities', NULL, true),
    (msedcl_framework_id, 'SUBSTATION_INDOOR_10MVA', 'MAJOR_CITIES', 1000.00, NULL,
     '33/11 or 22/11 kV Indoor Substation (2 x 10 MVA) for Metropolitan and Major cities', NULL, true),
    (msedcl_framework_id, 'SUBSTATION_GIS_10MVA', 'METRO', 600.00, NULL,
     '33/11 or 22/11 kV GIS Substation (2 x 10 MVA) for Metropolitan & Major cities', NULL, true),
    (msedcl_framework_id, 'SUBSTATION_GIS_10MVA', 'MAJOR_CITIES', 600.00, NULL,
     '33/11 or 22/11 kV GIS Substation (2 x 10 MVA) for Metropolitan & Major cities', NULL, true),
    (msedcl_framework_id, 'SWITCHING_STATION_22KV_INDOOR', 'METRO', 550.00, NULL,
     '22 kV Indoor Switching station for Metropolitan & Major Cities', NULL, true),
    (msedcl_framework_id, 'SWITCHING_STATION_22KV_INDOOR', 'MAJOR_CITIES', 550.00, NULL,
     '22 kV Indoor Switching station for Metropolitan & Major Cities', NULL, true),
    (msedcl_framework_id, 'EHV_SUBSTATION', NULL, NULL, NULL,
     'EHV Substation indoor/Outdoor/GIS',
     'As per requirement of MSETCL', true);

  -- ============================================================================
  -- LEASE TERMS (Pages 18-22 of circular - Annexure A)
  -- ============================================================================
  INSERT INTO regulation_lease_terms (framework_id, lease_duration_years, annual_rent_amount, total_upfront_payment,
    encumbrance_free_required, registration_required, surrender_notice_months, description, is_active) VALUES
    (msedcl_framework_id, 99, 1.00, 99.00, true, true, 12,
     '99-year lease at Rs. 1/- per year (total Rs. 99/- upfront), encumbrance free land required, lease deed registration mandatory, 12 months notice required for surrender', true);

  -- ============================================================================
  -- INFRASTRUCTURE SPECIFICATIONS (Pages 10-11 of circular)
  -- ============================================================================
  INSERT INTO regulation_infrastructure_specs (framework_id, infrastructure_type, area_type_code, specification, mandatory, description, is_active) VALUES
    (msedcl_framework_id, 'HT_CABLE_11KV_22KV', 'METRO', 
     'Size of 11 kV/22 kV HT cable must be 300 Sqmm minimum', true,
     'In Metropolitan region & Major cities, 1 MVA Distribution Transformer may be considered', true),
    (msedcl_framework_id, 'HT_CABLE_11KV_22KV', 'MAJOR_CITIES',
     'Size of 11 kV/22 kV HT cable must be 300 Sqmm minimum', true,
     'In Metropolitan region & Major cities, 1 MVA Distribution Transformer may be considered', true),
    (msedcl_framework_id, 'RMU_CONFIGURATION', NULL,
     'Configuration of Ring Main Unit is to be proposed not more than 2 breakers (i.e. 2 DT on single RMU)', true,
     'For UG cable, RMUs should be proposed instead of HT feeder pillar', true),
    (msedcl_framework_id, 'DEDICATED_CORRIDOR', NULL,
     'Dedicated Right of Way (ROW) in his/her premises for laying electric lines (I/C and O/G) for Ring mains system with adequate RCC ducts with chambers at the interval of 15 meters & provision of alternate entry/exit angles', true,
     'To avoid excavation during fault repairing', true),
    (msedcl_framework_id, 'RING_MAIN_SYSTEM', 'METRO',
     'Ring Mains System is created for redundancy and quick diversion of load in case of breakdown', true,
     'Mandatory for Metropolitan and Major cities', true),
    (msedcl_framework_id, 'RING_MAIN_SYSTEM', 'MAJOR_CITIES',
     'Ring Mains System is created for redundancy and quick diversion of load in case of breakdown', true,
     'Mandatory for Metropolitan and Major cities', true),
    (msedcl_framework_id, 'INDIVIDUAL_TRANSFORMER', 'METRO',
     'Individual transformers should be proposed for each building, along with the establishment of LT Ring main network', true,
     'To ensure redundancy of the electricity supply in metropolitan and major city areas', true),
    (msedcl_framework_id, 'INDIVIDUAL_TRANSFORMER', 'MAJOR_CITIES',
     'Individual transformers should be proposed for each building, along with the establishment of LT Ring main network', true,
     'To ensure redundancy of the electricity supply in metropolitan and major city areas', true);

  -- ============================================================================
  -- DEFINITIONS/GLOSSARY (Pages 16-17 of circular)
  -- ============================================================================
  INSERT INTO regulation_definitions (framework_id, term, definition, is_active) VALUES
    (msedcl_framework_id, 'Consumer',
     'Any person who is supplied with electricity for his own use by a licensee or the Government or by any other person engaged in the business of supplying electricity to the public under this Act or any other law for the time being in force and includes any person whose premises are for the time being connected for the purpose of receiving electricity with the works of a licensee, the Government or such other person, as the case may be.',
     true),
    (msedcl_framework_id, 'Distributing Main',
     'The portion of any main with which a service line is, or is intended to be, immediately connected.',
     true),
    (msedcl_framework_id, 'Main',
     'Any electric supply- line through which electricity is, or is intended to be, supplied.',
     true),
    (msedcl_framework_id, 'Electricity Supply Code',
     'The Electricity Supply Code specified under section 50.',
     true),
    (msedcl_framework_id, 'Licensee',
     'A person who has been granted a licence under section 14 of Electricity Act, 2003.',
     true),
    (msedcl_framework_id, 'Line',
     'Any wire, cable, tube, pipe, insulator, conductor or other similar thing (including its casing or coating) which is designed or adapted for use in carrying electricity and includes any line which surrounds or supports, or is surrounded or supported by or is installed in close proximity to, or is supported, carried or suspended in association with, any such line.',
     true),
    (msedcl_framework_id, 'Premises',
     'Includes any land, building or structure.',
     true),
    (msedcl_framework_id, 'Regulations',
     'Regulations made under the Electricity Act 2003.',
     true),
    (msedcl_framework_id, 'Rules',
     'Rules made under the Electricity Act 2003.',
     true),
    (msedcl_framework_id, 'Sub-station',
     'A station for transforming or converting electricity for the transmission or distribution thereof and includes transformers converters, switch-gears, capacitors, synchronous condensers, structures, cable and other appurtenant equipment and any buildings used for that purpose and the site thereof.',
     true),
    (msedcl_framework_id, 'Supply',
     'In relation to electricity, means the sale of electricity to a licensee or consumer.',
     true),
    (msedcl_framework_id, 'Builder',
     'One that builds; especially: one that contracts to build and supervises building operations.',
     true),
    (msedcl_framework_id, 'Applicant',
     'A person who makes a formal application for supply.',
     true),
    (msedcl_framework_id, 'Power factor',
     'The ratio of the real power flowing to the load to the apparent power in the circuit.',
     true),
    (msedcl_framework_id, 'Diversity factor',
     'The ratio of the sum of the maximum demands of the various part of a system to the coincident maximum demand of the whole system.',
     true),
    (msedcl_framework_id, 'Infrastructure',
     'Shall mean in context to supply of electricity, the line, substations and equipment required to supply.',
     true),
    (msedcl_framework_id, 'Land',
     'An area of ground, especially one that is used for a particular purpose.',
     true),
    (msedcl_framework_id, 'Dedicated Corridor',
     'Shall mean a long, narrow way, typically having walls either side, that allows access between buildings or to different rooms within a building.',
     true),
    (msedcl_framework_id, 'Electricity',
     'Means electrical energy: (a) Generated, transmitted, supplied or traded for any purpose; or (b) used for any purpose except the transmission of a message.',
     true),
    (msedcl_framework_id, 'Encumbrance',
     'Is a right to, interest in, or legal liability on real property that does not prohibit passing title to the property but that diminishes its value.',
     true),
    (msedcl_framework_id, 'Metropolitan Area',
     'Means Greater Mumbai, Bhiwandi, Kalyan-Dombivli, Mira-Bhayandar, Navi Mumbai, Panvel, Thane, Ulhasnagar, Vasai-Virar, Pune and Pimpri-Chinchwad.',
     true),
    (msedcl_framework_id, 'Major Cities',
     'Means Nashik, Chh. Sambhaji Nagar and Nagpur.',
     true);

END $$;

-- ============================================================================
-- 15. CREATE VIEWS FOR EASY QUERYING
-- ============================================================================

CREATE OR REPLACE VIEW v_active_regulations AS
SELECT 
  f.id,
  f.framework_code,
  f.framework_name,
  f.issuing_authority,
  f.state,
  f.effective_date,
  f.is_default,
  COUNT(DISTINCT prs.project_id) as project_count
FROM electrical_regulation_frameworks f
LEFT JOIN project_regulation_selection prs ON f.id = prs.framework_id AND prs.is_active = true
WHERE f.is_active = true
GROUP BY f.id, f.framework_code, f.framework_name, f.issuing_authority, f.state, f.effective_date, f.is_default;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
