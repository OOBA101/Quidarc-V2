import { pool } from './client.js';
import { env } from '../config/env.js';

/**
 * Verifies that a live PostgreSQL database matches the schema Quidarc expects.
 * Run against the deployed Railway database after migrations to confirm every
 * table, column, and index exists before wiring the frontend to it.
 *
 *   Local (against a remote DB):  DATABASE_URL="postgres://..." npm run db:verify
 *   On Railway (compiled):        npm run db:verify:prod
 *
 * Exits 0 when the database is fully provisioned, 1 on any missing object.
 */

// Expected columns per table — kept in lockstep with server/db/schema.ts.
const EXPECTED_TABLES: Record<string, string[]> = {
  wallets: ['address', 'chain_id', 'is_agent_wallet', 'circle_wallet_id', 'owner_wallet', 'created_at'],
  permission_cards: [
    'id', 'name', 'owner_wallet', 'agent_wallet_address', 'actions', 'protocol_allowlist',
    'daily_spend_limit', 'spend_window_type', 'expires_at', 'status', 'created_at',
  ],
  spend_records: ['id', 'permission_card_id', 'amount', 'executed_at'],
  audit_log: ['id', 'permission_card_id', 'kind', 'wallet_address', 'amount', 'protocol', 'tx_hash', 'status', 'created_at'],
  waitlist_entries: ['id', 'email', 'joined_at'],
};

const EXPECTED_INDEXES = ['idx_permission_cards_owner_status', 'idx_spend_records_card_time'];

async function verify(): Promise<boolean> {
  const problems: string[] = [];
  const client = await pool.connect();

  try {
    // Connection + SSL status
    const sslRow = await client.query(
      'SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()'
    );
    const usingSsl = sslRow.rows[0]?.ssl === true;
    console.log(`🔌 Connected. TLS: ${usingSsl ? 'enabled' : 'disabled'} (NODE_ENV=${env.NODE_ENV})`);

    // Tables + columns
    const colRes = await client.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'`
    );
    const actual = new Map<string, Set<string>>();
    for (const { table_name, column_name } of colRes.rows) {
      if (!actual.has(table_name)) actual.set(table_name, new Set());
      actual.get(table_name)!.add(column_name);
    }

    for (const [table, columns] of Object.entries(EXPECTED_TABLES)) {
      const present = actual.get(table);
      if (!present) {
        problems.push(`Missing table: ${table}`);
        continue;
      }
      const missing = columns.filter((c) => !present.has(c));
      if (missing.length) {
        problems.push(`Table ${table} missing columns: ${missing.join(', ')}`);
      } else {
        console.log(`✅ ${table} (${columns.length} columns)`);
      }
    }

    // Indexes
    const idxRes = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`
    );
    const idxSet = new Set(idxRes.rows.map((r) => r.indexname));
    for (const idx of EXPECTED_INDEXES) {
      if (idxSet.has(idx)) console.log(`✅ index ${idx}`);
      else problems.push(`Missing index: ${idx}`);
    }
  } finally {
    client.release();
  }

  if (problems.length) {
    console.error('\n❌ Database verification failed:');
    for (const p of problems) console.error(`   - ${p}`);
    return false;
  }
  console.log('\n✅ Database verification passed — schema is fully provisioned.');
  return true;
}

if (process.argv[1] && process.argv[1].includes('verify')) {
  verify()
    .then(async (ok) => {
      await pool.end();
      process.exit(ok ? 0 : 1);
    })
    .catch(async (error) => {
      console.error('❌ Verification error:', error);
      await pool.end();
      process.exit(1);
    });
}
