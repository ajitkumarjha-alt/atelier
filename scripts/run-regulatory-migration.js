import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
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

  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/0010_regulatory_framework.sql'),
      'utf8'
    );

    console.log('Running migration...');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('Regulatory framework tables created and MSEDCL 2016 data populated.');
    
    // Verify the data
    const result = await pool.query('SELECT COUNT(*) as count FROM electrical_regulation_frameworks');
    console.log(`\nFrameworks loaded: ${result.rows[0].count}`);
    
    const areaTypes = await pool.query('SELECT COUNT(*) as count FROM regulation_area_types');
    console.log(`Area types defined: ${areaTypes.rows[0].count}`);
    
    const loadStandards = await pool.query('SELECT COUNT(*) as count FROM regulation_load_standards');
    console.log(`Load standards defined: ${loadStandards.rows[0].count}`);
    
    const dtcThresholds = await pool.query('SELECT COUNT(*) as count FROM regulation_dtc_thresholds');
    console.log(`DTC thresholds defined: ${dtcThresholds.rows[0].count}`);
    
    console.log('\n✨ Regulatory framework system is ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
