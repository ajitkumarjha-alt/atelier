-- Add state column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS state VARCHAR(100);

-- Project-specific standards selections
CREATE TABLE IF NOT EXISTS project_standard_selections (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  standard_key VARCHAR(100) NOT NULL,
  standard_value VARCHAR(255),
  standard_ref_id INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, standard_key)
);

CREATE INDEX IF NOT EXISTS idx_project_standard_selections_project_id
  ON project_standard_selections(project_id);
