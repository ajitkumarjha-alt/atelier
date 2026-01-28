import { query } from '../src/api/db.js';
import 'dotenv/config';

const createTableSQL = `
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

const createIndexSQL = `
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;

const createFunctionSQL = `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;`;

const createTriggerSQL = `
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();`;

async function initDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Create table
    console.log('Creating users table...');
    await query(createTableSQL);
    
    // Create index
    console.log('Creating email index...');
    await query(createIndexSQL);
    
    // Create trigger function
    console.log('Creating update timestamp function...');
    await query(createFunctionSQL);
    
    // Create trigger
    console.log('Creating update timestamp trigger...');
    await query(createTriggerSQL);
    
    console.log('Database schema initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  }
}

initDatabase();