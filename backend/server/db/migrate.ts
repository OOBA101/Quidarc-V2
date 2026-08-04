import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('🔄 Running PostgreSQL database migrations...');
  
  const migrationPath = path.join(__dirname, 'migrations', '0000_init.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found at ${migrationPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  try {
    const client = await pool.connect();
    try {
      await client.query(sqlContent);
      console.log('✅ PostgreSQL database migrations applied successfully!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Database migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Execute standalone when run directly via CLI (npm run db:migrate)
if (process.argv[1] && process.argv[1].includes('migrate')) {
  runMigrations();
}
