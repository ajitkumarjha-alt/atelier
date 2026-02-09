import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  try {
    console.log('Starting regulatory compliance columns migration...');
    
    // Read the migration file
    const migrationPath = join(__dirname, '../migrations/0023_add_regulatory_compliance_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    console.log('✓ Migration completed successfully');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'electrical_load_calculations'
      AND column_name IN (
        'framework_ids', 'area_type', 'sanctioned_load_kw', 
        'load_after_df_kw', 'dtc_needed', 'substation_needed',
        'calculation_metadata'
      )
      ORDER BY column_name
    `);
    
    console.log('\nVerification:');
    console.log(`Regulatory columns added: ${result.rows.length}`);
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
