import { Pool } from 'pg';
import 'dotenv/config';

// PostgreSQL connection pool configuration
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: {
    rejectUnauthorized: false // Required for Google Cloud SQL
  }
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
export const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }
};

// Helper function to execute queries
export const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// User management functions
export const createUser = async (email, fullName) => {
  const text = `
    INSERT INTO users (email, full_name, last_login)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (email) 
    DO UPDATE SET last_login = CURRENT_TIMESTAMP
    RETURNING id, email, full_name, role;
  `;
  const values = [email, fullName];
  
  try {
    const result = await query(text, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
};

// Export the pool for direct access if needed
export default pool;