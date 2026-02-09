-- Seed data for electrical load lookup tables
-- Source: Electrical Load Calculation - MSEDCL.xlsx (Data sheet)

-- Lift Power by Building Height (kW)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('lift_power', 'building_height', '60', 12.0, 'kW', 'Passenger lift power for 60m building'),
('lift_power', 'building_height', '70', 14.0, 'kW', 'Passenger lift power for 70m building'),
('lift_power', 'building_height', '90', 15.0, 'kW', 'Passenger lift power for 90m building'),
('lift_power', 'building_height', '100', 18.0, 'kW', 'Passenger lift power for 100m building'),
('lift_power', 'building_height', '110', 20.0, 'kW', 'Passenger lift power for 110m building'),
('lift_power', 'building_height', '120', 22.0, 'kW', 'Passenger lift power for 120m building'),
('lift_power', 'building_height', '130', 24.0, 'kW', 'Passenger lift power for 130m building'),
('lift_power', 'building_height', '140', 26.0, 'kW', 'Passenger lift power for 140m building'),
('lift_power', 'building_height', '150', 28.0, 'kW', 'Passenger lift power for 150m building')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- PHE Pump Power by Flow Rate (kW)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('phe_pump', 'flow_lpm', '100', 0.75, 'kW', 'Booster/Transfer pump at 100 LPM'),
('phe_pump', 'flow_lpm', '200', 1.1, 'kW', 'Booster/Transfer pump at 200 LPM'),
('phe_pump', 'flow_lpm', '300', 2.2, 'kW', 'Booster/Transfer pump at 300 LPM'),
('phe_pump', 'flow_lpm', '400', 3.0, 'kW', 'Booster/Transfer pump at 400 LPM'),
('phe_pump', 'flow_lpm', '500', 4.0, 'kW', 'Booster/Transfer pump at 500 LPM'),
('phe_pump', 'flow_lpm', '600', 5.5, 'kW', 'Booster/Transfer pump at 600 LPM'),
('phe_pump', 'flow_lpm', '750', 7.5, 'kW', 'Booster/Transfer pump at 750 LPM'),
('phe_pump', 'flow_lpm', '1000', 11.0, 'kW', 'Booster/Transfer pump at 1000 LPM')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- Fire Fighting Pump Power (Main Hydrant) by Flow Rate (kW)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('ff_main_pump', 'flow_lpm', '2280', 93.25, 'kW', 'Main hydrant pump at 2280 LPM'),
('ff_main_pump', 'flow_lpm', '2850', 112.0, 'kW', 'Main hydrant pump at 2850 LPM'),
('ff_main_pump', 'flow_lpm', '3200', 130.5, 'kW', 'Main hydrant pump at 3200 LPM'),
('ff_main_pump', 'flow_lpm', '3800', 150.0, 'kW', 'Main hydrant pump at 3800 LPM')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- Fire Fighting Jockey Pump (standard size)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('ff_jockey_pump', 'standard', '180', 9.33, 'kW', 'Standard jockey pump at 180 LPM')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- Fire Fighting Sprinkler Pump by Flow Rate (kW)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('ff_sprinkler_pump', 'flow_lpm', '1140', 46.63, 'kW', 'Sprinkler pump at 1140 LPM'),
('ff_sprinkler_pump', 'flow_lpm', '1425', 56.0, 'kW', 'Sprinkler pump at 1425 LPM'),
('ff_sprinkler_pump', 'flow_lpm', '1600', 65.25, 'kW', 'Sprinkler pump at 1600 LPM'),
('ff_sprinkler_pump', 'flow_lpm', '1900', 75.0, 'kW', 'Sprinkler pump at 1900 LPM')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- AC Sizing by Area (TR - Tonnage of Refrigeration)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('ac_sizing', 'area_sqft', '150', 1.0, 'TR', 'AC for 150 sqft area'),
('ac_sizing', 'area_sqft', '200', 1.5, 'TR', 'AC for 200 sqft area'),
('ac_sizing', 'area_sqft', '300', 2.0, 'TR', 'AC for 300 sqft area'),
('ac_sizing', 'area_sqft', '400', 2.5, 'TR', 'AC for 400 sqft area'),
('ac_sizing', 'area_sqft', '500', 3.0, 'TR', 'AC for 500 sqft area')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- AC Power Consumption (kW per TR)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('ac_power', 'tonnage', '1', 1.2, 'kW', '1 TR AC power consumption'),
('ac_power', 'tonnage', '1.5', 1.8, 'kW', '1.5 TR AC power consumption'),
('ac_power', 'tonnage', '2', 2.4, 'kW', '2 TR AC power consumption'),
('ac_power', 'tonnage', '2.5', 3.0, 'kW', '2.5 TR AC power consumption'),
('ac_power', 'tonnage', '3', 3.6, 'kW', '3 TR AC power consumption')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- Ventilation Fan Power by CFM (Cubic Feet per Minute)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('ventilation_fan', 'cfm', '1000', 0.5, 'kW', 'Ventilation fan 1000 CFM'),
('ventilation_fan', 'cfm', '2000', 1.0, 'kW', 'Ventilation fan 2000 CFM'),
('ventilation_fan', 'cfm', '3000', 1.5, 'kW', 'Ventilation fan 3000 CFM'),
('ventilation_fan', 'cfm', '5000', 2.2, 'kW', 'Ventilation fan 5000 CFM'),
('ventilation_fan', 'cfm', '10000', 4.0, 'kW', 'Ventilation fan 10000 CFM')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- Staircase Pressurization Fan Power
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('pressurization_fan', 'staircase', 'standard', 5.5, 'kW', 'Standard staircase pressurization fan'),
('pressurization_fan', 'lobby', 'standard', 7.5, 'kW', 'Standard lobby pressurization fan')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- Sewage Pump Power by Capacity
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('sewage_pump', 'capacity_lpm', '200', 2.2, 'kW', 'Sewage pump 200 LPM'),
('sewage_pump', 'capacity_lpm', '300', 3.0, 'kW', 'Sewage pump 300 LPM'),
('sewage_pump', 'capacity_lpm', '500', 5.5, 'kW', 'Sewage pump 500 LPM'),
('sewage_pump', 'capacity_lpm', '750', 7.5, 'kW', 'Sewage pump 750 LPM')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- Water Treatment Plant (STP/WTP) by Capacity (KLD - KiloLitres per Day)
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('stp_power', 'capacity_kld', '100', 15.0, 'kW', 'STP 100 KLD'),
('stp_power', 'capacity_kld', '200', 22.0, 'kW', 'STP 200 KLD'),
('stp_power', 'capacity_kld', '300', 30.0, 'kW', 'STP 300 KLD'),
('stp_power', 'capacity_kld', '500', 45.0, 'kW', 'STP 500 KLD'),
('stp_power', 'capacity_kld', '750', 60.0, 'kW', 'STP 750 KLD'),
('stp_power', 'capacity_kld', '1000', 75.0, 'kW', 'STP 1000 KLD')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;

-- EV Charging Station Power
INSERT INTO electrical_load_lookup_tables (category, lookup_key, lookup_value, result_value, unit, remarks) VALUES
('ev_charger', 'type', 'slow', 3.3, 'kW', 'Slow charger (3.3 kW)'),
('ev_charger', 'type', 'fast', 7.4, 'kW', 'Fast charger (7.4 kW)'),
('ev_charger', 'type', 'rapid', 22.0, 'kW', 'Rapid charger (22 kW)'),
('ev_charger', 'type', 'ultra_fast', 50.0, 'kW', 'Ultra-fast charger (50 kW)')
ON CONFLICT (category, lookup_key, lookup_value) DO NOTHING;
