import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'atelier',
});

async function migrateToPolicy25() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting Policy 25 alignment migration...\n');

    // Start transaction
    await client.query('BEGIN');

    // 1. Update residential types to match Policy 25
    console.log('1️⃣  Updating residential types...');
    
    // Delete old residential types
    await client.query(`
      DELETE FROM project_standards 
      WHERE category = 'residential_type' 
      AND value IN ('Aspi', 'Premium', 'Villa')
    `);
    
    // Insert new residential types
    await client.query(`
      INSERT INTO project_standards (category, value, description) VALUES
      ('residential_type', 'Luxury', 'Luxury residential category'),
      ('residential_type', 'Hi-end', 'Hi-end residential category'),
      ('residential_type', 'Aspirational', 'Aspirational residential category')
      ON CONFLICT (category, value) DO UPDATE
      SET description = EXCLUDED.description
    `);
    
    // Casa should already exist from schema.sql
    await client.query(`
      INSERT INTO project_standards (category, value, description) VALUES
      ('residential_type', 'Casa', 'Casa residential category')
      ON CONFLICT (category, value) DO UPDATE
      SET description = EXCLUDED.description
    `);
    
    console.log('   ✅ Residential types updated: Luxury, Hi-end, Aspirational, Casa');

    // 2. Add new flat types (1.5BHK and 2.5BHK)
    console.log('\n2️⃣  Adding new flat types...');
    
    await client.query(`
      INSERT INTO project_standards (category, value, description) VALUES
      ('flat_type', '1.5BHK', 'One and Half Bedroom Hall Kitchen'),
      ('flat_type', '2.5BHK', 'Two and Half Bedroom Hall Kitchen')
      ON CONFLICT (category, value) DO NOTHING
    `);
    
    console.log('   ✅ Added flat types: 1.5BHK, 2.5BHK');

    // 3. Display current flat types
    console.log('\n3️⃣  Current flat types in database:');
    const flatTypes = await client.query(`
      SELECT value, description 
      FROM project_standards 
      WHERE category = 'flat_type' 
      ORDER BY value
    `);
    flatTypes.rows.forEach(row => {
      console.log(`   - ${row.value}: ${row.description}`);
    });

    // 4. Display current residential types
    console.log('\n4️⃣  Current residential types in database:');
    const resTypes = await client.query(`
      SELECT value, description 
      FROM project_standards 
      WHERE category = 'residential_type' 
      ORDER BY value
    `);
    resTypes.rows.forEach(row => {
      console.log(`   - ${row.value}: ${row.description}`);
    });

    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   - Removed: Aspi, Premium, Villa');
    console.log('   - Added: Luxury, Hi-end, Aspirational (Casa already existed)');
    console.log('   - Added flat types: 1.5BHK, 2.5BHK');
    console.log('   - All categories now align with Policy 25 Occupancy Factor Norms');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateToPolicy25().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
