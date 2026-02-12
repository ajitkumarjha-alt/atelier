-- ============================================================================
-- MEP Design Suite - Complete Database Migration
-- Version: 2.0
-- Date: 2026-02-12
-- Description: Adds societies, MLCP details, staircases, lifts, amenities,
--              DDS, tasks, RFC, standards, activity log, and more
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE USERS TABLE
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_contacts_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_contacts_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_view_preference VARCHAR(10) DEFAULT 'card' CHECK (dashboard_view_preference IN ('card', 'list'));

-- ============================================================================
-- 2. ENHANCE PROJECTS TABLE
-- ============================================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id);

-- ============================================================================
-- 3. SOCIETIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS societies (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_societies_project ON societies(project_id);

-- Add society reference to buildings
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS society_id INTEGER REFERENCES societies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_buildings_society ON buildings(society_id);

-- ============================================================================
-- 4. ENHANCE BUILDINGS TABLE
-- ============================================================================
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS twin_buildings TEXT; -- comma-separated names
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Concept' CHECK (status IN ('Concept', 'CD', 'DD', 'Tender', 'VFC'));

-- ============================================================================
-- 5. ENHANCE FLOORS TABLE
-- ============================================================================
ALTER TABLE floors ADD COLUMN IF NOT EXISTS floor_height DECIMAL(6, 2);
ALTER TABLE floors ADD COLUMN IF NOT EXISTS twin_floors TEXT; -- comma-separated names
ALTER TABLE floors ADD COLUMN IF NOT EXISTS area_sqm DECIMAL(10, 2);
ALTER TABLE floors ADD COLUMN IF NOT EXISTS floor_type VARCHAR(50) DEFAULT 'standard'; -- standard, parking, lobby, etc.

-- ============================================================================
-- 6. ENHANCE FLATS TABLE
-- ============================================================================
ALTER TABLE flats ADD COLUMN IF NOT EXISTS area_sqm DECIMAL(10, 2);

-- ============================================================================
-- 7. MLCP PARKING DETAILS
-- ============================================================================
CREATE TABLE IF NOT EXISTS parking_details (
    id SERIAL PRIMARY KEY,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    two_wheeler_count INTEGER DEFAULT 0,
    four_wheeler_count INTEGER DEFAULT 0,
    ev_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parking_details_floor ON parking_details(floor_id);

-- ============================================================================
-- 8. SHOPS (MLCP / Commercial)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shops (
    id SERIAL PRIMARY KEY,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    area_sqm DECIMAL(10, 2),
    identical_shops TEXT, -- comma-separated names
    is_fnb BOOLEAN DEFAULT FALSE, -- F&B or Non-F&B
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shops_floor ON shops(floor_id);

-- ============================================================================
-- 9. LOBBIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS lobbies (
    id SERIAL PRIMARY KEY,
    floor_id INTEGER REFERENCES floors(id) ON DELETE CASCADE,
    building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
    lobby_type VARCHAR(50) NOT NULL CHECK (lobby_type IN ('floor', 'entrance')),
    name VARCHAR(255),
    area_sqm DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lobbies_floor ON lobbies(floor_id);
CREATE INDEX IF NOT EXISTS idx_lobbies_building ON lobbies(building_id);

-- ============================================================================
-- 10. STAIRCASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS staircases (
    id SERIAL PRIMARY KEY,
    building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staircases_building ON staircases(building_id);

-- Staircase windows per floor
CREATE TABLE IF NOT EXISTS staircase_windows (
    id SERIAL PRIMARY KEY,
    staircase_id INTEGER NOT NULL REFERENCES staircases(id) ON DELETE CASCADE,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    width_mm DECIMAL(8, 2),
    height_mm DECIMAL(8, 2),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staircase_windows_staircase ON staircase_windows(staircase_id);

-- Staircase doors per floor
CREATE TABLE IF NOT EXISTS staircase_doors (
    id SERIAL PRIMARY KEY,
    staircase_id INTEGER NOT NULL REFERENCES staircases(id) ON DELETE CASCADE,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    width_mm DECIMAL(8, 2),
    height_mm DECIMAL(8, 2),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staircase_doors_staircase ON staircase_doors(staircase_id);

-- ============================================================================
-- 11. LIFTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS lifts (
    id SERIAL PRIMARY KEY,
    building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_floor_id INTEGER REFERENCES floors(id),
    last_floor_id INTEGER REFERENCES floors(id),
    door_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (door_type IN ('single', 'double')),
    door_width_mm DECIMAL(8, 2),
    door_height_mm DECIMAL(8, 2),
    capacity_kg INTEGER,
    speed_mps DECIMAL(4, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lifts_building ON lifts(building_id);

-- ============================================================================
-- 12. SWIMMING POOLS (project or society level)
-- ============================================================================
CREATE TABLE IF NOT EXISTS swimming_pools (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    society_id INTEGER REFERENCES societies(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    volume_cum DECIMAL(12, 2),
    depth_m DECIMAL(6, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_swimming_pools_project ON swimming_pools(project_id);

-- ============================================================================
-- 13. LANDSCAPE (project or society level)
-- ============================================================================
CREATE TABLE IF NOT EXISTS landscapes (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    society_id INTEGER REFERENCES societies(id) ON DELETE SET NULL,
    name VARCHAR(255),
    total_area_sqm DECIMAL(12, 2),
    softscape_area_sqm DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landscapes_project ON landscapes(project_id);

-- ============================================================================
-- 14. SURFACE PARKING (project or society level)
-- ============================================================================
CREATE TABLE IF NOT EXISTS surface_parking (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    society_id INTEGER REFERENCES societies(id) ON DELETE SET NULL,
    name VARCHAR(255),
    two_wheeler_count INTEGER DEFAULT 0,
    four_wheeler_count INTEGER DEFAULT 0,
    ev_charging_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_surface_parking_project ON surface_parking(project_id);

-- ============================================================================
-- 15. INFRASTRUCTURE (STP, Substation, UG Tank, GSR) - project or society
-- ============================================================================
CREATE TABLE IF NOT EXISTS infrastructure (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    society_id INTEGER REFERENCES societies(id) ON DELETE SET NULL,
    infra_type VARCHAR(50) NOT NULL CHECK (infra_type IN ('STP', 'Substation', 'UG_Water_Tank', 'Ground_Storage_Reservoir')),
    name VARCHAR(255),
    capacity VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_infrastructure_project ON infrastructure(project_id);

-- ============================================================================
-- 16. DESIGN DELIVERY SCHEDULE (DDS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dds (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    dds_type VARCHAR(20) DEFAULT 'internal' CHECK (dds_type IN ('internal', 'consultant')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dds_project ON dds(project_id);
CREATE INDEX IF NOT EXISTS idx_dds_type ON dds(dds_type);

-- DDS Items
CREATE TABLE IF NOT EXISTS dds_items (
    id SERIAL PRIMARY KEY,
    dds_id INTEGER NOT NULL REFERENCES dds(id) ON DELETE CASCADE,
    building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
    floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL,
    item_category VARCHAR(100), -- Electrical, PHE, Fire, HVAC, Security
    item_name VARCHAR(500) NOT NULL,
    description TEXT,
    discipline VARCHAR(50), -- MEP discipline
    expected_start_date DATE,
    expected_completion_date DATE,
    architect_input_date DATE,
    structure_input_date DATE,
    architect_input_received BOOLEAN DEFAULT FALSE,
    architect_input_received_date DATE,
    structure_input_received BOOLEAN DEFAULT FALSE,
    structure_input_received_date DATE,
    actual_completion_date DATE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'revised')),
    revision VARCHAR(10) DEFAULT 'R0',
    revision_count INTEGER DEFAULT 0,
    assigned_to_id INTEGER REFERENCES users(id),
    completed_by_id INTEGER REFERENCES users(id),
    sort_order INTEGER DEFAULT 0,
    is_external_area BOOLEAN DEFAULT FALSE,
    external_area_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dds_items_dds ON dds_items(dds_id);
CREATE INDEX IF NOT EXISTS idx_dds_items_building ON dds_items(building_id);
CREATE INDEX IF NOT EXISTS idx_dds_items_status ON dds_items(status);
CREATE INDEX IF NOT EXISTS idx_dds_items_assigned ON dds_items(assigned_to_id);

-- DDS Item Revisions
CREATE TABLE IF NOT EXISTS dds_item_revisions (
    id SERIAL PRIMARY KEY,
    dds_item_id INTEGER NOT NULL REFERENCES dds_items(id) ON DELETE CASCADE,
    revision VARCHAR(10) NOT NULL,
    revised_by_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT,
    previous_completion_date DATE,
    new_completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dds_revisions_item ON dds_item_revisions(dds_item_id);

-- DDS Update History
CREATE TABLE IF NOT EXISTS dds_history (
    id SERIAL PRIMARY KEY,
    dds_id INTEGER NOT NULL REFERENCES dds(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    changed_by_id INTEGER NOT NULL REFERENCES users(id),
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dds_history_dds ON dds_history(dds_id);

-- ============================================================================
-- 17. TASK MANAGEMENT (L2 assigns to L3/L4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    dds_item_id INTEGER REFERENCES dds_items(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) DEFAULT 'drawing', -- drawing, design, review
    assigned_by_id INTEGER NOT NULL REFERENCES users(id),
    assigned_to_id INTEGER NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- ============================================================================
-- 18. REQUEST FOR CHANGE (RFC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS requests_for_change (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    building_id INTEGER REFERENCES buildings(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    change_reason TEXT,
    impact_assessment TEXT,
    raised_by_id INTEGER NOT NULL REFERENCES users(id),
    assigned_to_id INTEGER REFERENCES users(id),
    l2_review_status VARCHAR(30) DEFAULT 'pending',
    l2_reviewed_by_id INTEGER REFERENCES users(id),
    l2_review_comment TEXT,
    l2_reviewed_at TIMESTAMP WITH TIME ZONE,
    l1_review_status VARCHAR(30) DEFAULT 'pending',
    l1_reviewed_by_id INTEGER REFERENCES users(id),
    l1_review_comment TEXT,
    l1_reviewed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'implemented')),
    priority VARCHAR(20) DEFAULT 'normal',
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rfc_project ON requests_for_change(project_id);
CREATE INDEX IF NOT EXISTS idx_rfc_status ON requests_for_change(status);
CREATE INDEX IF NOT EXISTS idx_rfc_raised_by ON requests_for_change(raised_by_id);

-- ============================================================================
-- 19. ACTIVITY LOG (Project Story)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    user_email VARCHAR(255),
    entity_type VARCHAR(50) NOT NULL, -- project, building, floor, flat, dds, mas, rfi, rfc, task
    entity_id INTEGER,
    action VARCHAR(50) NOT NULL, -- create, update, delete, assign, approve, reject, complete
    changes JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- ============================================================================
-- 20. TEMPORARY USER ACCESS (L1 to L1 sharing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS temporary_access (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    granted_by_id INTEGER NOT NULL REFERENCES users(id),
    granted_to_id INTEGER NOT NULL REFERENCES users(id),
    access_type VARCHAR(20) DEFAULT 'view' CHECK (access_type IN ('view', 'edit')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_temp_access_project ON temporary_access(project_id);
CREATE INDEX IF NOT EXISTS idx_temp_access_granted_to ON temporary_access(granted_to_id);

-- ============================================================================
-- 21. CALCULATION STANDARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculation_standards (
    id SERIAL PRIMARY KEY,
    discipline VARCHAR(50) NOT NULL, -- Electrical, PHE, Fire, HVAC, Security
    category VARCHAR(100) NOT NULL, -- e.g. watt_per_sqm, diversity_factor, lpd
    building_type VARCHAR(100),
    project_type VARCHAR(100),
    flat_type VARCHAR(100),
    area_type VARCHAR(100), -- lobby, entrance, landscape, etc.
    parameter_name VARCHAR(255) NOT NULL,
    parameter_value DECIMAL(12, 4),
    unit VARCHAR(50),
    state VARCHAR(100),
    city VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calc_standards_discipline ON calculation_standards(discipline);
CREATE INDEX IF NOT EXISTS idx_calc_standards_category ON calculation_standards(category);

-- ============================================================================
-- 22. TRANSFORMER RATINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transformer_ratings (
    id SERIAL PRIMARY KEY,
    project_type VARCHAR(100) NOT NULL,
    rating_kva DECIMAL(10, 2) NOT NULL,
    state VARCHAR(100),
    city VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 23. PHE STANDARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS phe_standards (
    id SERIAL PRIMARY KEY,
    project_type VARCHAR(100) NOT NULL,
    use_type VARCHAR(50) NOT NULL, -- domestic, drinking, flushing
    per_capita_demand_lpd DECIMAL(10, 2), -- litres per day
    storage_days_ugr INTEGER,
    storage_days_oht INTEGER,
    storage_days_rainwater INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 24. FIRE FIGHTING STANDARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS fire_standards (
    id SERIAL PRIMARY KEY,
    building_height_range VARCHAR(100),
    num_buildings_range VARCHAR(100),
    application VARCHAR(100),
    ugr_storage_litres DECIMAL(12, 2),
    oht_storage_litres DECIMAL(12, 2),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 25. DDS POLICY
-- ============================================================================
CREATE TABLE IF NOT EXISTS dds_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_data JSONB NOT NULL, -- template rules for generating DDS
    building_type VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 26. POPULATION STANDARDS (per flat type per building type)
-- ============================================================================
CREATE TABLE IF NOT EXISTS population_standards (
    id SERIAL PRIMARY KEY,
    building_type VARCHAR(100) NOT NULL,
    flat_type VARCHAR(100) NOT NULL,
    population_per_flat INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_type, flat_type)
);

-- ============================================================================
-- 27. EV PERCENTAGE STANDARDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ev_standards (
    id SERIAL PRIMARY KEY,
    building_type VARCHAR(100) NOT NULL,
    ev_car_percentage DECIMAL(5, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_type)
);

-- ============================================================================
-- 28. REFERENCE DOCUMENTS (with LLM processing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reference_documents (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- Electrical, PHE, Fire, HVAC, Security
    subcategory VARCHAR(100),
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    version INTEGER DEFAULT 1,
    is_processed BOOLEAN DEFAULT FALSE,
    llm_extracted_data JSONB, -- factors/facts extracted by LLM
    llm_processed_at TIMESTAMP WITH TIME ZONE,
    uploaded_by_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ref_docs_category ON reference_documents(category);

-- ============================================================================
-- 29. ENHANCE MAS TABLE
-- ============================================================================
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS vendor_id INTEGER REFERENCES vendors(id);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS submitted_by_vendor BOOLEAN DEFAULT FALSE;
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS material_description TEXT;
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS make VARCHAR(255);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS model VARCHAR(255);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS rate DECIMAL(12, 2);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS supporting_documents JSONB;
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l2_review_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l2_reviewed_by_id INTEGER REFERENCES users(id);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l2_review_comment TEXT;
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l2_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l1_review_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l1_reviewed_by_id INTEGER REFERENCES users(id);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l1_review_comment TEXT;
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS l1_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS approval_type VARCHAR(50);
ALTER TABLE material_approval_sheets ADD COLUMN IF NOT EXISTS revision VARCHAR(10) DEFAULT 'R0';

-- ============================================================================
-- 30. ENHANCE RFI TABLE
-- ============================================================================
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS building_id INTEGER REFERENCES buildings(id);
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS floor_id INTEGER REFERENCES floors(id);
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS component VARCHAR(100);
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS discipline VARCHAR(50); -- structure, MEP, finishing
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES users(id);
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS cm_raised BOOLEAN DEFAULT FALSE;
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS l2_review_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS l2_reviewed_by_id INTEGER REFERENCES users(id);
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS l2_review_comment TEXT;
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS l2_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS l1_review_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS l1_reviewed_by_id INTEGER REFERENCES users(id);
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS l1_review_comment TEXT;
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS l1_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE requests_for_information ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

-- ============================================================================
-- 31. CM BUILDING COMPONENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cm_building_components (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    floor_id INTEGER REFERENCES floors(id) ON DELETE CASCADE,
    component_name VARCHAR(255),
    structure_status VARCHAR(50),
    mep_status VARCHAR(50),
    finishing_status VARCHAR(50),
    remark TEXT,
    updated_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cm_components_project ON cm_building_components(project_id);

-- ============================================================================
-- 32. NOTIFICATIONS / TODO MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    notification_type VARCHAR(50) DEFAULT 'info', -- info, warning, critical, todo
    entity_type VARCHAR(50),
    entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- 33. CONSULTANT DDS SUBMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultant_dds_submissions (
    id SERIAL PRIMARY KEY,
    dds_item_id INTEGER NOT NULL REFERENCES dds_items(id) ON DELETE CASCADE,
    consultant_id INTEGER NOT NULL REFERENCES consultants(id),
    status VARCHAR(30) DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultant_dds_item ON consultant_dds_submissions(dds_item_id);
CREATE INDEX IF NOT EXISTS idx_consultant_dds_consultant ON consultant_dds_submissions(consultant_id);

-- ============================================================================
-- 34. ADD ADDITIONAL PROJECT STANDARD CATEGORIES
-- ============================================================================
INSERT INTO project_standards (category, value, description) VALUES
('application_type', 'Residential Apartment', 'Residential apartment buildings'),
('application_type', 'MLCP', 'Multi-Level Car Parking'),
('application_type', 'Shop', 'Retail shops'),
('application_type', 'Villa', 'Villa residential'),
('application_type', 'Datacenter', 'Data center facilities'),
('flat_type', '5BHK', 'Five Bedroom Hall Kitchen'),
('flat_type', '6BHK', 'Six Bedroom Hall Kitchen'),
('flat_type', 'Duplex', 'Duplex apartment'),
('flat_type', 'Penthouse', 'Penthouse apartment'),
('building_status', 'CD', 'Concept Design'),
('building_status', 'DD', 'Design Development'),
('building_status', 'Tender', 'Tender Stage'),
('building_status', 'VFC', 'Valid for Construction')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 35. ADD TRIGGERS FOR ALL NEW TABLES
-- ============================================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'societies', 'parking_details', 'shops', 'lobbies', 'staircases',
        'staircase_windows', 'staircase_doors', 'lifts', 'swimming_pools',
        'landscapes', 'surface_parking', 'infrastructure', 'dds', 'dds_items',
        'tasks', 'requests_for_change', 'calculation_standards',
        'transformer_ratings', 'phe_standards', 'fire_standards',
        'dds_policies', 'population_standards', 'ev_standards',
        'reference_documents', 'cm_building_components',
        'consultant_dds_submissions'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

-- ============================================================================
-- 36. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Project summary view
CREATE OR REPLACE VIEW v_project_summary AS
SELECT
    p.id,
    p.name,
    p.status,
    p.address,
    p.completion_percentage,
    p.created_at,
    COUNT(DISTINCT b.id) AS building_count,
    COUNT(DISTINCT s.id) AS society_count,
    COUNT(DISTINCT f.id) AS floor_count,
    COUNT(DISTINCT fl.id) AS flat_count,
    COUNT(DISTINCT pt.user_id) AS team_count
FROM projects p
LEFT JOIN buildings b ON b.project_id = p.id
LEFT JOIN societies s ON s.project_id = p.id
LEFT JOIN floors f ON f.building_id = b.id
LEFT JOIN flats fl ON fl.floor_id = f.id
LEFT JOIN project_team pt ON pt.project_id = p.id
GROUP BY p.id;

-- DDS progress view
CREATE OR REPLACE VIEW v_dds_progress AS
SELECT
    d.id AS dds_id,
    d.project_id,
    d.dds_type,
    COUNT(di.id) AS total_items,
    COUNT(CASE WHEN di.status = 'completed' THEN 1 END) AS completed_items,
    COUNT(CASE WHEN di.status = 'overdue' THEN 1 END) AS overdue_items,
    ROUND(
        CASE WHEN COUNT(di.id) > 0 
        THEN COUNT(CASE WHEN di.status = 'completed' THEN 1 END) * 100.0 / COUNT(di.id) 
        ELSE 0 END, 2
    ) AS completion_percentage
FROM dds d
LEFT JOIN dds_items di ON di.dds_id = d.id
GROUP BY d.id;
