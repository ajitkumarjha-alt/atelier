-- Electrical Load Factors Table
CREATE TABLE IF NOT EXISTS electrical_load_factors (
    id SERIAL PRIMARY KEY,
    area_type VARCHAR(64) NOT NULL,
    watt_per_sqmt FLOAT NOT NULL,
    diversity FLOAT NOT NULL,
    guideline VARCHAR(64) NOT NULL,
    description TEXT
);

-- Example insert for MSEDCL guideline
INSERT INTO electrical_load_factors (area_type, watt_per_sqmt, diversity, guideline, description)
VALUES
    ('Flat', 75, 0.6, 'MSEDCL', 'Residential flat as per MSEDCL 2016'),
    ('Floor Lobby', 20, 0.8, 'MSEDCL', 'Typical floor lobby'),
    ('Main Entrance Lobby', 30, 0.8, 'MSEDCL', 'Ground floor entrance lobby'),
    ('Terrace', 10, 0.7, 'MSEDCL', 'Terrace area'),
    ('Parking Area', 15, 0.7, 'MSEDCL', 'Parking area'),
    ('Landscape', 10, 0.7, 'MSEDCL', 'Landscape area'),
    ('Club House', 50, 0.7, 'MSEDCL', 'Club house');

-- Add more rows for other guidelines as needed
