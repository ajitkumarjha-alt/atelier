import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkBuildingData() {
  try {
    console.log('\n=== Checking Building Data for Project 9 ===\n');
    
    // Check buildings table
    const buildingsResult = await pool.query(`
      SELECT 
        b.id, 
        b.name, 
        b.height, 
        b.floors,
        b.is_twin,
        b.twin_of_building_id,
        b.society_id,
        s.name as society_name
      FROM buildings b
      LEFT JOIN societies s ON s.id = b.society_id
      WHERE b.project_id = 9
      ORDER BY b.name
    `);
    
    console.log('Buildings in database:');
    console.table(buildingsResult.rows);
    
    // Check floors for each building
    for (const building of buildingsResult.rows) {
      const floorsResult = await pool.query(`
        SELECT 
          id,
          floor_number,
          floor_height,
          typical_lobby_area,
          twin_of_floor_id
        FROM floors
        WHERE building_id = $1
        ORDER BY floor_number
      `, [building.id]);
      
      console.log(`\n${building.name} - Floors in database (${floorsResult.rows.length} total):`);
      if (floorsResult.rows.length > 0) {
        console.table(floorsResult.rows.slice(0, 5)); // Show first 5
        if (floorsResult.rows.length > 5) {
          console.log(`... and ${floorsResult.rows.length - 5} more floors`);
        }
      } else {
        console.log('No floors found in database');
      }
    }
    
    // Check what the API endpoint would return
    const apiResult = await pool.query(`
      SELECT 
        b.id,
        b.name,
        b.height,
        b.floors,
        b.is_twin,
        b.twin_of_building_id,
        tb.name as twin_of_building_name,
        b.gf_entrance_lobby as gf_lobby,
        s.id as society_id,
        s.name as society_name,
        COUNT(DISTINCT f.id) as floor_count,
        COALESCE(SUM(f.floor_height), 0) as total_height_m,
        COALESCE(AVG(f.typical_lobby_area), 0) as avg_typical_lobby_area
      FROM buildings b
      LEFT JOIN societies s ON b.society_id = s.id
      LEFT JOIN floors f ON f.building_id = b.id
      LEFT JOIN buildings tb ON b.twin_of_building_id = tb.id
      WHERE b.project_id = 9
      GROUP BY b.id, b.name, b.height, b.floors, b.is_twin, b.twin_of_building_id, 
               tb.name, b.gf_entrance_lobby, s.id, s.name
      ORDER BY b.name
    `);
    
    console.log('\n=== Data from Buildings API Endpoint ===');
    console.table(apiResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkBuildingData();
