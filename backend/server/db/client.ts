import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { env } from '../config/env.js';

const { Pool } = pg;

// Railway's *internal* Postgres host (*.railway.internal) does not use TLS,
// while public/proxy hosts and most managed providers require it. Enable SSL in
// production for any non-internal host. Local development never uses SSL.
const isInternalHost = env.DATABASE_URL.includes('.railway.internal');
const useSsl = env.NODE_ENV === 'production' && !isInternalHost;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
