import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: 5432,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration to expand user_level column...');
    
    // Alter the user_level column to support longer values
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN user_level TYPE VARCHAR(20);
    `);
    
    console.log('✅ Successfully expanded user_level column to VARCHAR(20)');
    console.log('✅ Can now support values like: L0, L1, L2, L3, L4, VENDOR, CM, SUPER_ADMIN');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
