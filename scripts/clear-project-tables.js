import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '/cloudsql/lodha-atelier:asia-south1:lodha-atelier-db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'lodha_atelier',
  port: process.env.DB_PORT || 5432,
});

async function clearProjectTables() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to clear project-related tables...');
    
    // Delete in order to respect foreign key constraints
    // First delete flats (references floors)
    await client.query('DELETE FROM flats');
    console.log('✅ Cleared flats table');
    
    // Then delete floors (references buildings)
    await client.query('DELETE FROM floors');
    console.log('✅ Cleared floors table');
    
    // Then delete buildings (references projects)
    await client.query('DELETE FROM buildings');
    console.log('✅ Cleared buildings table');
    
    // Finally delete projects
    await client.query('DELETE FROM projects');
    console.log('✅ Cleared projects table');
    
    // Also clear related tables
    await client.query('DELETE FROM material_approval_sheets');
    console.log('✅ Cleared material_approval_sheets table');
    
    await client.query('DELETE FROM requests_for_information');
    console.log('✅ Cleared requests_for_information table');
    
    // Reset sequences to start from 1 again
    await client.query('ALTER SEQUENCE projects_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE buildings_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE floors_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE flats_id_seq RESTART WITH 1');
    console.log('✅ Reset all ID sequences');
    
    console.log('\n🎉 All project tables cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearProjectTables()
  .then(() => {
    console.log('\nOperation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nOperation failed:', error);
    process.exit(1);
  });
