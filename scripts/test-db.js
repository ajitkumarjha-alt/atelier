import { testConnection } from '../src/api/db.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test database connection
console.log('Testing database connection...');
testConnection()
  .then(() => {
    console.log('Database test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database test failed:', error);
    process.exit(1);
  });