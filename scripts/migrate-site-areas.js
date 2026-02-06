import { Pool } from 'pg';
import 'dotenv/config.js';

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

const createSiteAreasTable = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Creating site_areas table...');
    
    await client.query(`
      -- Create site_areas table for managing landscape and external infrastructure
      CREATE TABLE IF NOT EXISTS site_areas (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          area_type VARCHAR(100) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          area_sqm DECIMAL(10, 2),
          water_volume_cum DECIMAL(10, 2),
          softscape_area_sqm DECIMAL(10, 2),
          
          -- MEP Requirements
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
          
          -- Specific attributes
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
    `);

    await client.query(`
      ALTER TABLE site_areas
      ADD COLUMN IF NOT EXISTS water_volume_cum DECIMAL(10, 2);
    `);

    await client.query(`
      ALTER TABLE site_areas
      ADD COLUMN IF NOT EXISTS softscape_area_sqm DECIMAL(10, 2);
    `);
    
    console.log('✓ site_areas table created');
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_site_areas_project_id ON site_areas(project_id);
      CREATE INDEX IF NOT EXISTS idx_site_areas_area_type ON site_areas(area_type);
    `);
    
    console.log('✓ Indexes created');
    
    // Add trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_site_areas_updated_at ON site_areas;
      CREATE TRIGGER update_site_areas_updated_at
          BEFORE UPDATE ON site_areas
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✓ Triggers added');
    console.log('✅ Site areas table migration completed successfully!');
    
  } catch (error) {
    console.error('Error creating site_areas table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

createSiteAreasTable().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
