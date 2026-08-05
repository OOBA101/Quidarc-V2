import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Applies the SQL schema to the connected database.
 *
 * Idempotent — the migration file uses `CREATE TABLE/INDEX IF NOT EXISTS`,
 * so it is safe to run on every deploy/boot. Does NOT close the shared pool:
 * when called in-process at server startup the pool must stay open for the
 * running server. The standalone CLI block below is responsible for closing it.
 */
export async function runMigrations() {
  console.log('🔄 Running PostgreSQL database migrations...');

  const migrationPath = path.join(__dirname, 'migrations', '0000_init.sql');
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found at ${migrationPath}`);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query(sqlContent);
    console.log('✅ PostgreSQL database migrations applied successfully!');
  } finally {
    client.release();
  }
}

// Execute standalone when run directly via CLI (npm run db:migrate).
// Matches both the tsx source path (server/db/migrate.ts) and the compiled
// path (dist/server/db/migrate.js).
if (process.argv[1] && process.argv[1].includes('migrate')) {
  runMigrations()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('❌ Database migration error:', error);
      await pool.end();
      process.exit(1);
    });
}
