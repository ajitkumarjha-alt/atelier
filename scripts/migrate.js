import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClient } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '../migrations');

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map(row => row.filename));
};

const readMigrations = async () => {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
    .map(entry => entry.name)
    .sort();
};

const runMigrations = async () => {
  const client = await getClient();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const migrations = await readMigrations();

    if (migrations.length === 0) {
      console.log('No migrations found.');
      return;
    }

    for (const migration of migrations) {
      if (applied.has(migration)) {
        continue;
      }

      const migrationPath = path.join(migrationsDir, migration);
      const sql = await fs.readFile(migrationPath, 'utf8');

      if (!sql.trim()) {
        throw new Error(`Migration ${migration} is empty.`);
      }

      console.log(`Applying migration ${migration}...`);

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [migration]
        );
        await client.query('COMMIT');
        console.log(`Applied migration ${migration}.`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('Migrations completed.');
  } finally {
    client.release();
  }
};

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
