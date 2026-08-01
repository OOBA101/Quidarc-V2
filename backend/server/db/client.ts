import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://quidarc:quidarc_dev@localhost:5432/quidarc_dev';

export const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
