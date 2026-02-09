import { getClient } from '../server/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedLookupTables() {
  const client = await getClient();

  try {
    console.log('Seeding electrical load lookup tables...');

    const sql = await fs.readFile(
      path.join(__dirname, 'seed-electrical-lookup-tables.sql'),
      'utf-8'
    );

    await client.query(sql);

    console.log('✓ Lookup tables seeded successfully!');

    // Verify
    const result = await client.query(
      'SELECT category, COUNT(*) as count FROM electrical_load_lookup_tables GROUP BY category'
    );

    console.log('\nSeeded lookup data:');
    result.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} entries`);
    });

  } catch (error) {
    console.error('Error seeding lookup tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seedLookupTables();
