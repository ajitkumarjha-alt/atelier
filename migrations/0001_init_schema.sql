-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    user_level VARCHAR(20) NOT NULL DEFAULT 'L4',
    organization VARCHAR(255) DEFAULT 'lodhagroup',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Concept',
    lifecycle_stage VARCHAR(50) NOT NULL DEFAULT 'Concept',
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    floors_completed INTEGER NOT NULL DEFAULT 0,
    total_floors INTEGER NOT NULL DEFAULT 0,
    mep_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    material_stock_percentage INTEGER NOT NULL DEFAULT 0,
    assigned_lead_id INTEGER REFERENCES users(id),
    start_date DATE NOT NULL,
    target_completion_date DATE NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Material Approval Sheets table
CREATE TABLE IF NOT EXISTS material_approval_sheets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    material_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Requests for Information table
CREATE TABLE IF NOT EXISTS requests_for_information (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    raised_by_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on project status for filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Create project_standards table for managing options (super admin)
CREATE TABLE IF NOT EXISTS project_standards (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, value)
);

-- Create project_standards_documents table for PDF reference documents
CREATE TABLE IF NOT EXISTS project_standards_documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    uploaded_by_id INTEGER REFERENCES users(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    application_type VARCHAR(100) NOT NULL,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    residential_type VARCHAR(100),
    villa_type VARCHAR(100),
    villa_count INTEGER,
    twin_of_building_id INTEGER REFERENCES buildings(id),
    is_twin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create floors table
CREATE TABLE IF NOT EXISTS floors (
    id SERIAL PRIMARY KEY,
    building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    floor_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create flats table
CREATE TABLE IF NOT EXISTS flats (
    id SERIAL PRIMARY KEY,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    flat_type VARCHAR(100) NOT NULL,
    area_sqft DECIMAL(10, 2),
    number_of_flats INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create site_areas table for landscape and external infrastructure
CREATE TABLE IF NOT EXISTS site_areas (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    area_type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    area_sqm DECIMAL(10, 2),
    water_volume_cum DECIMAL(10, 2),
    softscape_area_sqm DECIMAL(10, 2),
    requires_water BOOLEAN DEFAULT FALSE,
    water_connection_points INTEGER DEFAULT 0,
    estimated_water_demand DECIMAL(10, 2),
    requires_electrical BOOLEAN DEFAULT FALSE,
    electrical_load_kw DECIMAL(10, 2),
    lighting_points INTEGER DEFAULT 0,
    power_points INTEGER DEFAULT 0,
    has_ev_charging BOOLEAN DEFAULT FALSE,
    ev_charging_points INTEGER DEFAULT 0,
    requires_drainage BOOLEAN DEFAULT FALSE,
    drainage_type VARCHAR(50),
    requires_hvac BOOLEAN DEFAULT FALSE,
    hvac_capacity_tr DECIMAL(10, 2),
    requires_fire_fighting BOOLEAN DEFAULT FALSE,
    fire_hydrant_points INTEGER DEFAULT 0,
    sprinkler_required BOOLEAN DEFAULT FALSE,
    irrigation_type VARCHAR(50),
    landscape_category VARCHAR(50),
    amenity_type VARCHAR(100),
    capacity_persons INTEGER,
    operational_hours VARCHAR(50),
    parking_type VARCHAR(50),
    car_spaces INTEGER DEFAULT 0,
    bike_spaces INTEGER DEFAULT 0,
    infrastructure_type VARCHAR(100),
    equipment_details TEXT,
    capacity_rating VARCHAR(100),
    location_description TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for site_areas
CREATE INDEX IF NOT EXISTS idx_site_areas_project_id ON site_areas(project_id);
CREATE INDEX IF NOT EXISTS idx_site_areas_area_type ON site_areas(area_type);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $update_timestamp$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$update_timestamp$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;
CREATE TRIGGER update_buildings_updated_at
    BEFORE UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_floors_updated_at ON floors;
CREATE TRIGGER update_floors_updated_at
    BEFORE UPDATE ON floors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flats_updated_at ON flats;
CREATE TRIGGER update_flats_updated_at
    BEFORE UPDATE ON flats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_areas_updated_at ON site_areas;
CREATE TRIGGER update_site_areas_updated_at
    BEFORE UPDATE ON site_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_standards_updated_at ON project_standards;
CREATE TRIGGER update_project_standards_updated_at
    BEFORE UPDATE ON project_standards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create project_team table for managing project team members
CREATE TABLE IF NOT EXISTS project_team (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- Create index for faster team member lookups
CREATE INDEX IF NOT EXISTS idx_project_team_project ON project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user ON project_team(user_id);

-- Create consultants table for MEP consultants
CREATE TABLE IF NOT EXISTS consultants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contact_number VARCHAR(50),
    company_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create project_consultants junction table
CREATE TABLE IF NOT EXISTS project_consultants (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    consultant_id INTEGER NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    assigned_by_id INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, consultant_id)
);

-- Create consultant_otp table for OTP-based authentication
CREATE TABLE IF NOT EXISTS consultant_otp (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add consultant reference fields to MAS table
ALTER TABLE material_approval_sheets 
ADD COLUMN IF NOT EXISTS referred_to_consultant_id INTEGER REFERENCES consultants(id),
ADD COLUMN IF NOT EXISTS consultant_reply TEXT,
ADD COLUMN IF NOT EXISTS consultant_replied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consultant_reply_status VARCHAR(50);

-- Add consultant reference fields to RFI table
ALTER TABLE requests_for_information 
ADD COLUMN IF NOT EXISTS referred_to_consultant_id INTEGER REFERENCES consultants(id),
ADD COLUMN IF NOT EXISTS consultant_reply TEXT,
ADD COLUMN IF NOT EXISTS consultant_replied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consultant_reply_status VARCHAR(50);

-- Create indexes for faster consultant lookups
CREATE INDEX IF NOT EXISTS idx_consultants_email ON consultants(email);
CREATE INDEX IF NOT EXISTS idx_project_consultants_project ON project_consultants(project_id);
CREATE INDEX IF NOT EXISTS idx_project_consultants_consultant ON project_consultants(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_otp_email ON consultant_otp(email);
CREATE INDEX IF NOT EXISTS idx_mas_consultant ON material_approval_sheets(referred_to_consultant_id);
CREATE INDEX IF NOT EXISTS idx_rfi_consultant ON requests_for_information(referred_to_consultant_id);

-- Create triggers for consultants table
DROP TRIGGER IF EXISTS update_consultants_updated_at ON consultants;
CREATE TRIGGER update_consultants_updated_at
    BEFORE UPDATE ON consultants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create vendors table for material suppliers/contractors
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contact_number VARCHAR(50),
    company_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create project_vendors junction table
CREATE TABLE IF NOT EXISTS project_vendors (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    assigned_by_id INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, vendor_id)
);

-- Create vendor_otp table for OTP-based authentication
CREATE TABLE IF NOT EXISTS vendor_otp (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster vendor lookups
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_project_vendors_project ON project_vendors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_vendors_vendor ON project_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_otp_email ON vendor_otp(email);

-- Create user_documents table for uploaded knowledge base
CREATE TABLE IF NOT EXISTS user_documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    file_url TEXT NOT NULL,
    file_size INTEGER,
    content_text TEXT,
    metadata JSONB,
    is_indexed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_chat_history table for conversation tracking
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create design_sheets table for AI-generated design sheets
CREATE TABLE IF NOT EXISTS design_sheets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    sheet_name VARCHAR(255) NOT NULL,
    sheet_type VARCHAR(100),
    content JSONB NOT NULL,
    pdf_url TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_preferences table for personalized AI settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    ai_enabled BOOLEAN DEFAULT TRUE,
    preferred_response_style VARCHAR(50) DEFAULT 'professional',
    notification_preferences JSONB,
    dashboard_layout JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_project ON user_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_session ON ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_design_sheets_project ON design_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_design_sheets_created_by ON design_sheets(created_by_id);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization);

-- Create triggers for vendors table
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default project standards
INSERT INTO project_standards (category, value, description) VALUES
-- Building Application Types
('application_type', 'Residential', 'Residential buildings'),
('application_type', 'Clubhouse', 'Club and community spaces'),
('application_type', 'MLCP', 'Multi-Level Car Parking'),
('application_type', 'Commercial', 'Commercial spaces'),
('application_type', 'Institute', 'Educational institutions'),
('application_type', 'Industrial', 'Industrial facilities'),
('application_type', 'Hospital', 'Hospital facilities'),
('application_type', 'Hospitality', 'Hotels and hospitality'),
('application_type', 'Data center', 'Data center facilities'),
-- Residential Types (aligned with Policy 25 Occupancy Norms)
('residential_type', 'Luxury', 'Luxury residential category'),
('residential_type', 'Hi-end', 'Hi-end residential category'),
('residential_type', 'Aspirational', 'Aspirational residential category'),
('residential_type', 'Casa', 'Casa residential category'),
-- Flat Types (aligned with Policy 25)
('flat_type', '1BHK', 'One Bedroom Hall Kitchen'),
('flat_type', '1.5BHK', 'One and Half Bedroom Hall Kitchen'),
('flat_type', '2BHK', 'Two Bedroom Hall Kitchen'),
('flat_type', '2.5BHK', 'Two and Half Bedroom Hall Kitchen'),
('flat_type', '3BHK', 'Three Bedroom Hall Kitchen'),
('flat_type', '4BHK', 'Four Bedroom Hall Kitchen'),
('flat_type', 'Studio', 'Studio apartment')
ON CONFLICT DO NOTHING;

-- Insert sample project data
INSERT INTO projects (
    name, description, status, completion_percentage,
    floors_completed, total_floors, mep_status,
    material_stock_percentage, start_date, target_completion_date
) VALUES 
    ('Atelier Wing A', 'North-facing residential wing', 'on_track', 75, 15, 20, 'in_progress', 85, '2023-01-01', '2024-12-31'),
    ('Atelier Wing B', 'South-facing residential wing', 'delayed', 45, 9, 20, 'pending', 60, '2023-03-01', '2024-12-31'),
    ('Atelier Central Tower', 'Main tower with amenities', 'on_track', 90, 28, 30, 'completed', 95, '2022-06-01', '2024-06-30'),
    ('Atelier Garden Plaza', 'Ground level retail and gardens', 'on_track', 60, 2, 3, 'in_progress', 75, '2023-06-01', '2024-09-30')
ON CONFLICT DO NOTHING;
