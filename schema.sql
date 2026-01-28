-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    user_level VARCHAR(2) NOT NULL DEFAULT 'L4',
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