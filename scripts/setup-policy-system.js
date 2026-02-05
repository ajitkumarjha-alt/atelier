import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'atelier',
});

async function setupPolicySystem() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up Policy Management System...\n');
    await client.query('BEGIN');

    // 1. Create tables
    console.log('1️⃣  Creating policy management tables...');
    const sqlFile = path.join(__dirname, 'create-policy-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    await client.query(sql);
    console.log('   ✅ Tables created successfully\n');

    // 2. Create initial policy version
    console.log('2️⃣  Creating initial policy version...');
    const policyResult = await client.query(`
      INSERT INTO policy_versions (
        name, policy_number, revision_number, effective_date, 
        status, is_default, description, created_by, approved_by, approved_at
      ) VALUES (
        'MEP-21 Water Policy + Policy 25 Occupancy Norms (Current)',
        'MEP-21 + Policy 25',
        'Current',
        '2022-02-18',
        'active',
        true,
        'Initial policy imported from codebase. Based on MEP-21 revision 4 (dated 22.02.18) and Policy 25 revision 10 (dated 30.08.2022)',
        'system',
        'system',
        NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    
    const policyId = policyResult.rows[0]?.id;
    if (!policyId) {
      throw new Error('Failed to create initial policy version');
    }
    console.log(`   ✅ Created policy version ID: ${policyId}\n`);

    // 3. Insert water consumption rates
    console.log('3️⃣  Inserting water consumption rates...');
    const waterRates = [
      // Residential - Luxury
      [policyId, 'residential', 'luxury', 'drinking', 165, 'L/occupant/day', 'MEP-21 Page 3'],
      [policyId, 'residential', 'luxury', 'flushValves', 75, 'L/occupant/day', 'For toilets with flush valves'],
      [policyId, 'residential', 'luxury', 'flushTanks', 45, 'L/occupant/day', 'For toilets with flush tanks (3-6L capacity)'],
      // Residential - Hi-end (same as luxury)
      [policyId, 'residential', 'hiEnd', 'drinking', 165, 'L/occupant/day', 'Same as luxury per MEP-21'],
      [policyId, 'residential', 'hiEnd', 'flushValves', 75, 'L/occupant/day', 'For toilets with flush valves'],
      [policyId, 'residential', 'hiEnd', 'flushTanks', 45, 'L/occupant/day', 'For toilets with flush tanks (3-6L capacity)'],
      // Residential - Aspirational
      [policyId, 'residential', 'aspirational', 'drinking', 110, 'L/occupant/day', 'MEP-21 Page 3'],
      [policyId, 'residential', 'aspirational', 'flushing', 60, 'L/occupant/day', 'Flush valves only'],
      // Residential - Casa (same as aspirational)
      [policyId, 'residential', 'casa', 'drinking', 110, 'L/occupant/day', 'Same as aspirational per MEP-21'],
      [policyId, 'residential', 'casa', 'flushing', 60, 'L/occupant/day', 'Flush valves only'],
      // Office - Excelus
      [policyId, 'office', 'excelus', 'drinking', 20, 'L/occupant/day', 'MEP-21 Page 3 - including restaurants/canteens'],
      [policyId, 'office', 'excelus', 'flushing', 25, 'L/occupant/day', 'Per occupant per day'],
      // Office - Supremus
      [policyId, 'office', 'supremus', 'drinking', 20, 'L/occupant/day', 'MEP-21 Page 3'],
      [policyId, 'office', 'supremus', 'flushing', 25, 'L/occupant/day', 'Per occupant per day'],
      // Office - iThink
      [policyId, 'office', 'iThink', 'drinking', 20, 'L/occupant/day', 'MEP-21 Page 3'],
      [policyId, 'office', 'iThink', 'flushing', 25, 'L/occupant/day', 'Per occupant per day'],
      // Retail - Experia
      [policyId, 'retail', 'experia', 'drinking', 25, 'L/occupant/day', 'Full-time occupant drinking'],
      [policyId, 'retail', 'experia', 'visitor', 5, 'L/visitor/day', 'Visitor drinking water - 5ltrs per visitor'],
      [policyId, 'retail', 'experia', 'flushing', 20, 'L/occupant/day', 'Full-time occupant flushing'],
      [policyId, 'retail', 'experia', 'visitorFlushing', 10, 'L/visitor/day', 'Visitor flushing water'],
      // Retail - Boulevard
      [policyId, 'retail', 'boulevard', 'drinking', 25, 'L/occupant/day', 'Full-time occupant drinking'],
      [policyId, 'retail', 'boulevard', 'visitor', 5, 'L/visitor/day', 'Visitor drinking water - 5ltrs per visitor'],
      [policyId, 'retail', 'boulevard', 'flushing', 20, 'L/occupant/day', 'Full-time occupant flushing'],
      [policyId, 'retail', 'boulevard', 'visitorFlushing', 10, 'L/visitor/day', 'Visitor flushing water'],
      // Multiplex
      [policyId, 'multiplex', 'standard', 'perSeat', 5, 'L/seat', 'Drinking water per seat - 5ltrs'],
      [policyId, 'multiplex', 'standard', 'flushing', 10, 'L/seat', 'Flushing water per seat - 10ltrs'],
      // School
      [policyId, 'school', 'standard', 'perHead', 25, 'L/head', 'Drinking water - 25ltrs/head'],
      [policyId, 'school', 'standard', 'flushing', 20, 'L/head', 'Flushing water - 20ltrs/head'],
    ];

    for (const rate of waterRates) {
      await client.query(`
        INSERT INTO water_consumption_rates 
        (policy_version_id, project_type, sub_type, usage_category, rate_value, unit, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, rate);
    }
    console.log(`   ✅ Inserted ${waterRates.length} water consumption rates\n`);

    // 4. Insert occupancy factors
    console.log('4️⃣  Inserting occupancy factors...');
    const occupancyFactors = [
      // Residential occupancy by flat type - Policy 25 Page 1
      [policyId, 'residential', 'luxury', '1BHK', 0, 'occupants_per_unit', 'NA converted to 0'],
      [policyId, 'residential', 'luxury', '1.5BHK', 5, 'occupants_per_unit', 'Same as 2BHK'],
      [policyId, 'residential', 'luxury', '2BHK', 5, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'luxury', '2.5BHK', 5, 'occupants_per_unit', 'Same as 3BHK'],
      [policyId, 'residential', 'luxury', '3BHK', 5, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'luxury', '4BHK', 7, 'occupants_per_unit', '7 occupants including domestic help'],
      
      [policyId, 'residential', 'hiEnd', '1BHK', 0, 'occupants_per_unit', 'NA converted to 0'],
      [policyId, 'residential', 'hiEnd', '1.5BHK', 5, 'occupants_per_unit', 'Same as 2BHK'],
      [policyId, 'residential', 'hiEnd', '2BHK', 5, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'hiEnd', '2.5BHK', 5, 'occupants_per_unit', 'Same as 3BHK'],
      [policyId, 'residential', 'hiEnd', '3BHK', 5, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'hiEnd', '4BHK', 7, 'occupants_per_unit', '7 occupants including domestic help'],
      
      [policyId, 'residential', 'aspirational', '1BHK', 4, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'aspirational', '1.5BHK', 4, 'occupants_per_unit', 'Same as 2BHK'],
      [policyId, 'residential', 'aspirational', '2BHK', 4, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'aspirational', '2.5BHK', 5, 'occupants_per_unit', 'Same as 3BHK'],
      [policyId, 'residential', 'aspirational', '3BHK', 5, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'aspirational', '4BHK', 6, 'occupants_per_unit', 'Minimum 4, maximum 7'],
      
      [policyId, 'residential', 'casa', '1BHK', 4, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'casa', '1.5BHK', 4, 'occupants_per_unit', 'Same as 2BHK'],
      [policyId, 'residential', 'casa', '2BHK', 4, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'casa', '2.5BHK', 5, 'occupants_per_unit', 'Same as 3BHK'],
      [policyId, 'residential', 'casa', '3BHK', 5, 'occupants_per_unit', 'Policy 25'],
      [policyId, 'residential', 'casa', '4BHK', 0, 'occupants_per_unit', 'NA for Casa'],
      
      // Office occupancy - sqm per person from Policy 25
      [policyId, 'office', 'excelus', null, 7.0, 'sqm_per_person', '1 person per 7.0 sq.mtrs'],
      [policyId, 'office', 'supremus', null, 6.5, 'sqm_per_person', '1 person per 6.5 sq.mtrs'],
      [policyId, 'office', 'iThink', null, 5.5, 'sqm_per_person', '1 person per 5.5 sq.mtrs'],
      
      // Office peak occupancy factor - Policy 25
      [policyId, 'office', 'excelus', null, 0.9, 'peak_factor', '90% occupation at peak (10% absence)'],
      [policyId, 'office', 'supremus', null, 0.9, 'peak_factor', '90% occupation at peak (10% absence)'],
      [policyId, 'office', 'iThink', null, 0.9, 'peak_factor', '90% occupation at peak (10% absence)'],
      
      // Retail occupancy - Policy 25
      [policyId, 'retail', 'boulevard', null, 10, 'sqm_per_fulltime', '1 full-time person per 10 sq.mtrs'],
      [policyId, 'retail', 'boulevard', null, 7, 'visitor_sqm', '1 visitor per 7 sq.mtrs during peak hour'],
      [policyId, 'retail', 'experia', null, 10, 'sqm_per_fulltime', '1 full-time person per 10 sq.mtrs'],
      [policyId, 'retail', 'experia', null, 5, 'visitor_sqm', '1 visitor per 5 sq.mtrs during peak hour'],
    ];

    for (const factor of occupancyFactors) {
      await client.query(`
        INSERT INTO occupancy_factors 
        (policy_version_id, project_type, sub_type, unit_type, factor_value, factor_type, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, factor);
    }
    console.log(`   ✅ Inserted ${occupancyFactors.length} occupancy factors\n`);

    // 5. Insert calculation parameters
    console.log('5️⃣  Inserting calculation parameters...');
    const calcParams = [
      [policyId, 'pool_evaporation_rate', 8, 'L/sqm/day', 'water', 'Pool evaporation: 8mm depth = 8 liters per sqm per day (MEP-21 Page 3)'],
      [policyId, 'landscape_water_rate', 5, 'L/sqm/day', 'water', 'Landscape irrigation: 5 ltrs per sqm of actual landscape area (MEP-21 Page 3)'],
      [policyId, 'cooling_tower_rate', 10, 'L/hr/TR', 'cooling', 'Central airconditioning makeup water @ 10 ltr/hr/Tr (MEP-21 Page 4)'],
      [policyId, 'storage_buffer_percentage', 20, 'percentage', 'storage', 'Storage capacity = 1 day supply + 20% buffer'],
      [policyId, 'toilet_flush_tank_capacity', 3.6, 'liters', 'flushing', 'Flush tanks: 3-6 ltr capacity (average 4.5L, using 3.6L for calculation)'],
    ];

    for (const param of calcParams) {
      await client.query(`
        INSERT INTO calculation_parameters 
        (policy_version_id, parameter_name, parameter_value, unit, category, description)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, param);
    }
    console.log(`   ✅ Inserted ${calcParams.length} calculation parameters\n`);

    await client.query('COMMIT');
    
    console.log('✅ Policy Management System setup completed!\n');
    console.log('📊 Summary:');
    console.log(`   - Policy Version ID: ${policyId}`);
    console.log(`   - Water Rates: ${waterRates.length} entries`);
    console.log(`   - Occupancy Factors: ${occupancyFactors.length} entries`);
    console.log(`   - Calculation Parameters: ${calcParams.length} entries`);
    console.log('\n🎯 System is ready for dynamic policy management!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run setup
setupPolicySystem().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
