-- Add indexes for performance optimization
-- These indexes speed up the project detail page loading

-- Index for fetching floors by building (used in project detail)
CREATE INDEX IF NOT EXISTS idx_floors_building_id_floor_number 
ON floors(building_id, floor_number);

-- Index for fetching flats by floor (used in project detail)
CREATE INDEX IF NOT EXISTS idx_flats_floor_id 
ON flats(floor_id);

-- Index for fetching buildings by project (already might exist, but ensure)
CREATE INDEX IF NOT EXISTS idx_buildings_project_id 
ON buildings(project_id);

-- Composite index for societies lookup
CREATE INDEX IF NOT EXISTS idx_societies_project_id 
ON societies(project_id);

-- Index for project team lookups
CREATE INDEX IF NOT EXISTS idx_project_team_project_id 
ON project_team(project_id);

-- Index for user lookups by email (frequently used in auth)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Comment
COMMENT ON INDEX idx_floors_building_id_floor_number IS 'Speeds up floor fetching in project detail page';
COMMENT ON INDEX idx_flats_floor_id IS 'Speeds up flat fetching in project detail page';
