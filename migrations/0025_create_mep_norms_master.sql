-- Migration: Create mep_norms_master table and populate with MSEDCL norms
CREATE TABLE IF NOT EXISTS mep_norms_master (
    key VARCHAR(64) PRIMARY KEY,
    value FLOAT NOT NULL,
    unit VARCHAR(16),
    description TEXT
);

INSERT INTO mep_norms_master (key, value, unit, description) VALUES
    ('RESI_LOAD_DENSITY', 75, 'W/sqm', 'Residential load density as per MSEDCL Circular'),
    ('COMM_AC_LOAD_DENSITY', 200, 'W/sqm', 'Commercial AC load density as per MSEDCL Circular'),
    ('OTHER_COMM_LOAD_DENSITY', 150, 'W/sqm', 'Other commercial load density as per MSEDCL Circular'),
    ('METRO_DIVERSITY_FACTOR', 2.0, '', 'Diversity factor for Metro region'),
    ('OTHER_DIVERSITY_FACTOR', 2.5, '', 'Diversity factor for Other region'),
    ('POWER_FACTOR', 0.9, '', 'Standard power factor for calculation');
